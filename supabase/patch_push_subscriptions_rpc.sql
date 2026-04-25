-- ============================================================
-- Web Push Notifications — RPC Functions + RLS Policies
-- Phase 2 Security Patch (Run after migration)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Enable RLS on push_subscriptions table
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admin can read all
DROP POLICY IF EXISTS "Admin reads all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admin reads all push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (public.is_admin_caller());

-- ────────────────────────────────────────────────────────────
-- 2. RPC: save_push_subscription
-- Save or replace a subscription identified by magic_token
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.save_push_subscription(TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.save_push_subscription(
  p_token        TEXT,
  p_subscription JSONB,
  p_user_agent   TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if token belongs to a valid child
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE magic_token = p_token) THEN
    RETURN FALSE;
  END IF;

  -- Check if subscription already exists
  SELECT EXISTS(SELECT 1 FROM public.push_subscriptions WHERE magic_token = p_token)
  INTO v_exists;

  IF v_exists THEN
    -- Update existing subscription
    UPDATE public.push_subscriptions
    SET subscription = p_subscription,
        user_agent = COALESCE(p_user_agent, user_agent),
        updated_at = NOW()
    WHERE magic_token = p_token;
  ELSE
    -- Insert new subscription
    INSERT INTO public.push_subscriptions (magic_token, subscription, user_agent, updated_at)
    VALUES (p_token, p_subscription, p_user_agent, NOW());
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_push_subscription(TEXT, JSONB, TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. RPC: disable_push_subscription
-- Disable or delete a subscription by magic_token
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.disable_push_subscription(TEXT);

CREATE OR REPLACE FUNCTION public.disable_push_subscription(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.push_subscriptions WHERE magic_token = p_token;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.disable_push_subscription(TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 4. RPC: get_push_subscriptions_for_child
-- Get all active subscriptions for a child (for Edge Function)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_push_subscriptions_for_child(TEXT);

CREATE OR REPLACE FUNCTION public.get_push_subscriptions_for_child(p_token TEXT)
RETURNS TABLE(
  id UUID,
  subscription JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, subscription, user_agent, created_at
  FROM public.push_subscriptions
  WHERE magic_token = p_token
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_push_subscriptions_for_child(TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. RPC: cleanup_stale_subscriptions
-- Delete subscriptions older than 90 days (admin only)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.cleanup_stale_subscriptions();

CREATE OR REPLACE FUNCTION public.cleanup_stale_subscriptions()
RETURNS TABLE(deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  IF NOT public.is_admin_caller() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  DELETE FROM public.push_subscriptions
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_subscriptions() TO authenticated;

-- ============================================================
-- Phase 2 Complete: RPC functions + RLS enabled
-- Clients now call RPC instead of direct table access
-- ============================================================
