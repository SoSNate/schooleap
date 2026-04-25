import { createClient } from 'supabase';

/**
 * payment-webhook — Edge Function
 *
 * Receives POST from PayPal / Morning (חשבונית ירוקה) after a successful payment.
 * Verifies a shared secret, then calls process_webhook_payment() to:
 *   1. Insert a subscription_payments row (idempotent via webhook_id UNIQUE)
 *   2. Update profiles: subscription_status = 'active', new expiry date
 *
 * Supabase Realtime then fires → ParentDashboard / GameApp remove paywall instantly.
 *
 * Environment variables (set in Supabase Secrets):
 *   SUPABASE_URL                — auto-injected by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY   — auto-injected by Supabase
 *   PAYPAL_WEBHOOK_SECRET       — from PayPal developer console
 *   MORNING_WEBHOOK_SECRET      — from Morning (חשבונית ירוקה) settings
 *
 * Expected POST body (JSON):
 * {
 *   provider:           'paypal' | 'morning'
 *   webhook_id:         string   // unique event ID from provider
 *   user_id:            string   // Supabase auth.users UUID (passed as metadata by client)
 *   tier_id:            string   // UUID from subscription_tiers table
 *   amount:             number   // amount paid (ILS)
 *   payment_reference:  string   // receipt / transaction ID from provider
 *   secret:             string   // shared secret to verify request authenticity
 * }
 */

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAYPAL_WEBHOOK_SECRET    = Deno.env.get('PAYPAL_WEBHOOK_SECRET') ?? '';
const MORNING_WEBHOOK_SECRET   = Deno.env.get('MORNING_WEBHOOK_SECRET') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const {
    provider,
    webhook_id,
    user_id,
    tier_id,
    amount,
    payment_reference,
    secret,
  } = body as {
    provider:          string;
    webhook_id:        string;
    user_id:           string;
    tier_id:           string;
    amount:            number;
    payment_reference: string;
    secret:            string;
  };

  // ── 1. Validate required fields ──────────────────────────────────────────
  if (!provider || !webhook_id || !user_id || !tier_id || !amount || !secret) {
    return json({ error: 'Missing required fields' }, 400);
  }

  if (!['paypal', 'morning'].includes(provider)) {
    return json({ error: 'Unknown provider' }, 400);
  }

  // ── 2. Verify shared secret ───────────────────────────────────────────────
  const expectedSecret = provider === 'paypal' ? PAYPAL_WEBHOOK_SECRET : MORNING_WEBHOOK_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    console.error('[payment-webhook] Secret mismatch for provider:', provider);
    return json({ error: 'Unauthorized' }, 401);
  }

  // ── 3. Log incoming webhook (audit trail) ─────────────────────────────────
  console.log('[payment-webhook] Received:', { provider, webhook_id, user_id, tier_id, amount });

  // ── 4. Call process_webhook_payment RPC (idempotent) ─────────────────────
  const { data, error: rpcError } = await supabase.rpc('process_webhook_payment', {
    p_user_id:           user_id,
    p_tier_id:           tier_id,
    p_payment_provider:  provider,
    p_webhook_id:        webhook_id,
    p_payment_reference: payment_reference ?? webhook_id,
    p_amount_shekel:     amount,
  });

  if (rpcError) {
    console.error('[payment-webhook] RPC error:', rpcError);
    return json({ error: 'Payment processing failed', detail: rpcError.message }, 500);
  }

  if (!data) {
    // Already processed — return 200 so provider doesn't retry
    console.log('[payment-webhook] Already processed:', webhook_id);
    return json({ status: 'already_processed' });
  }

  console.log('[payment-webhook] Success:', { webhook_id, user_id });

  // Return 200 so PayPal / Morning marks webhook as delivered
  return json({ status: 'success', webhook_id });
});
