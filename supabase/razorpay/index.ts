// Supabase Edge Function: razorpay
// Creates a ₹99 Razorpay order for the signed-in person, and confirms the payment afterwards.
// Needs these secrets (Supabase → Edge Functions → Secrets): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
import { createClient } from 'npm:@supabase/supabase-js@2';

const PRICE_PAISE = 9900; // ₹99
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
  const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!KEY_ID || !KEY_SECRET) return json({ error: 'payments not set up' }, 500);
  const rzpAuth = 'Basic ' + btoa(KEY_ID + ':' + KEY_SECRET);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json({ error: 'sign in first' }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'bad request' }, 400); }

  if (body.action === 'order') {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: rzpAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: PRICE_PAISE,
        currency: 'INR',
        receipt: 'nh_' + crypto.randomUUID().replaceAll('-', ''),
        notes: { user_id: user.id, product: 'full_cv_report' },
      }),
    });
    const order = await r.json();
    if (!r.ok) return json({ error: 'could not start payment' }, 502);
    return json({ order_id: order.id, amount: order.amount, key_id: KEY_ID });
  }

  if (body.action === 'verify') {
    const oid = body.razorpay_order_id, pid = body.razorpay_payment_id, sig = body.razorpay_signature;
    if (typeof oid !== 'string' || typeof pid !== 'string' || typeof sig !== 'string') return json({ error: 'bad request' }, 400);
    if (!sameText(await hmacHex(KEY_SECRET, oid + '|' + pid), sig)) return json({ error: 'signature' }, 400);
    const r = await fetch('https://api.razorpay.com/v1/orders/' + encodeURIComponent(oid), { headers: { Authorization: rzpAuth } });
    const order = await r.json();
    if (!r.ok || order.notes?.user_id !== user.id || order.amount !== PRICE_PAISE) return json({ error: 'order mismatch' }, 400);
    const { error } = await admin.from('purchases').upsert(
      { payment_id: pid, order_id: oid, user_id: user.id, amount: order.amount, product: 'full_cv_report' },
      { onConflict: 'payment_id', ignoreDuplicates: true },
    );
    if (error) return json({ error: 'could not save payment' }, 500);
    return json({ ok: true });
  }

  return json({ error: 'unknown action' }, 400);
});
