// Supabase Edge Function: razorpay-webhook
// Backup: Razorpay calls this after every paid order, so a payment is recorded even if
// the buyer closes the tab before the website confirms it.
// Turn OFF "Verify JWT" for this function (Razorpay can't sign in).
// Needs this secret: RAZORPAY_WEBHOOK_SECRET (the secret you type when creating the webhook in Razorpay).
import { createClient } from 'npm:@supabase/supabase-js@2';

const PRICE_PAISE = 9900;

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  if (!secret) return new Response('not set up', { status: 500 });

  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature') || '';
  if (!sameText(await hmacHex(secret, raw), sig)) return new Response('bad signature', { status: 400 });

  let ev;
  try { ev = JSON.parse(raw); } catch { return new Response('bad body', { status: 400 }); }
  if (ev.event !== 'order.paid') return new Response('ignored', { status: 200 });

  const order = ev.payload?.order?.entity, payment = ev.payload?.payment?.entity;
  const uid = order?.notes?.user_id;
  if (!order || !payment || !uid || order.amount !== PRICE_PAISE) return new Response('ignored', { status: 200 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.from('purchases').upsert(
    { payment_id: payment.id, order_id: order.id, user_id: uid, amount: order.amount, product: 'full_cv_report' },
    { onConflict: 'payment_id', ignoreDuplicates: true },
  );
  if (error) return new Response('save failed', { status: 500 }); // Razorpay retries on errors
  return new Response('ok', { status: 200 });
});
