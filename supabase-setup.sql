-- Nope & Hope: database setup for Supabase
-- Paste all of this into Supabase → SQL Editor → New query, then click Run. Run it once.

-- 1. Scam reports -------------------------------------------------------------
-- Stores a scrambled (SHA-256) form of the reported phone, email, UPI ID or link,
-- never the raw value, plus who reported it. One report per person per sender.
create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  ident_hash  text not null check (char_length(ident_hash) = 64),
  kind        text not null check (kind in ('phone', 'email', 'upi', 'telegram', 'link')),
  scam_type   text not null check (char_length(scam_type) <= 80),
  reporter    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (ident_hash, reporter)
);
create index if not exists reports_ident_hash_idx on public.reports (ident_hash);

alter table public.reports enable row level security;

-- Signed-in users can add reports in their own name. Nobody can read raw rows from the website.
drop policy if exists "signed-in users add their own reports" on public.reports;
create policy "signed-in users add their own reports"
  on public.reports for insert to authenticated
  with check (reporter = auth.uid());

-- The website reads only counts, through this function.
create or replace function public.report_counts(hashes text[])
returns table (ident_hash text, reports bigint, last_reported timestamptz)
language sql
security definer
set search_path = public
as $$
  select r.ident_hash, count(*)::bigint, max(r.created_at)
  from public.reports r
  where cardinality(hashes) <= 20
    and r.ident_hash = any (hashes)
  group by r.ident_hash;
$$;
revoke all on function public.report_counts(text[]) from public;
grant execute on function public.report_counts(text[]) to anon, authenticated;

-- 2. Contact form messages ------------------------------------------------------
-- Anyone can send a message; only you can read them (in the Supabase Table Editor).
create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) <= 100),
  email       text not null check (char_length(email) <= 200),
  topic       text check (char_length(topic) <= 100),
  message     text not null check (char_length(message) <= 4000),
  created_at  timestamptz not null default now()
);
alter table public.messages enable row level security;

drop policy if exists "anyone can send a message" on public.messages;
create policy "anyone can send a message"
  on public.messages for insert to anon, authenticated
  with check (true);

-- 3. Applications tracker -------------------------------------------------------
-- Each person sees and edits only their own applications.
create table if not exists public.applications (
  id              uuid primary key,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company         text not null check (char_length(company) <= 120),
  role            text not null check (char_length(role) <= 120),
  link            text check (char_length(link) <= 500),
  source          text check (char_length(source) <= 40),
  applied_on      date not null default current_date,
  closes_on       date,
  interview_at    timestamptz,
  status          text not null default 'applied'
                  check (status in ('applied','awaiting','interview','offer','rejected','filled','closed','ghosted','withdrawn')),
  followed_up_on  date,
  notes           text check (char_length(notes) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists applications_user_idx on public.applications (user_id, applied_on desc);

alter table public.applications enable row level security;

drop policy if exists "read own applications" on public.applications;
create policy "read own applications" on public.applications for select to authenticated using (user_id = auth.uid());
drop policy if exists "add own applications" on public.applications;
create policy "add own applications" on public.applications for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "edit own applications" on public.applications;
create policy "edit own applications" on public.applications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own applications" on public.applications;
create policy "delete own applications" on public.applications for delete to authenticated using (user_id = auth.uid());
