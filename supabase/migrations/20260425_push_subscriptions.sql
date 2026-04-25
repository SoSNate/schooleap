-- ============================================================
-- Web Push Notifications — push_subscriptions table
-- Phase 1 Migration: Basic table structure
-- ============================================================

-- Main table: one row per device subscription
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  magic_token   TEXT        NOT NULL,
  subscription  JSONB       NOT NULL,  -- Full PushSubscription from browser
  user_agent    TEXT,                  -- Device info for debugging
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookups (Edge Function queries)
CREATE INDEX IF NOT EXISTS push_subscriptions_token_idx
  ON public.push_subscriptions(magic_token);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS push_subscriptions_created_idx
  ON public.push_subscriptions(created_at DESC);

-- ============================================================
-- Phase 1: No RLS or RPC yet
-- Client inserts directly via Supabase JS
-- Upgrade to Phase 2 (patch_push_subscriptions_rpc.sql) for security
-- ============================================================
