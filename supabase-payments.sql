-- Nope & Hope: payments setup for Supabase
-- Paste all of this into Supabase → SQL Editor → New query, then click Run. Run it once.

-- One row per successful ₹99 payment. Only the server writes here (through the
-- razorpay functions), so there is no insert or update rule for visitors.
create table if not exists public.purchases (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  payment_id  text not null unique,               -- Razorpay payment ID, e.g. pay_ABC123
  order_id    text not null,
  amount      integer not null,                   -- in paise: 9900 = ₹99
  product     text not null default 'full_cv_report',
  used_for    text,                               -- scrambled ID of the CV + job ad it unlocked
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists purchases_user_idx on public.purchases (user_id);

alter table public.purchases enable row level security;
drop policy if exists "read own purchases" on public.purchases;
create policy "read own purchases" on public.purchases
  for select to authenticated using (user_id = auth.uid());

-- Unlocks the full report for one CV + job ad.
-- Returns true if this report was already paid for, or if an unused payment
-- exists (which it then uses up). Returns false if the person needs to pay.
create or replace function public.use_report_credit(report_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare pid bigint;
begin
  if auth.uid() is null or report_key is null or char_length(report_key) <> 64 then
    return false;
  end if;
  perform 1 from purchases where user_id = auth.uid() and used_for = report_key;
  if found then return true; end if;
  select id into pid from purchases
    where user_id = auth.uid() and used_for is null
    order by created_at limit 1
    for update skip locked;
  if pid is null then return false; end if;
  update purchases set used_for = report_key, used_at = now() where id = pid;
  return true;
end;
$$;
revoke all on function public.use_report_credit(text) from public;
grant execute on function public.use_report_credit(text) to authenticated;
