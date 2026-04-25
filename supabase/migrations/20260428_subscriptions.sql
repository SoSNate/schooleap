-- ============================================================================
-- Subscription Tiers & Payment System
-- Support for multiple subscription tiers with webhook-based payment automation
-- NO auto-renewal, NO recurring charges - Parent has full control
-- ============================================================================

-- 1. SUBSCRIPTION TIERS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_shekel DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  duration_days INTEGER NOT NULL,
  max_children INTEGER,
  display_order INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscription_tiers_active_idx
  ON public.subscription_tiers(is_active)
  WHERE is_active = true;

-- 2. SUBSCRIPTION PAYMENTS TABLE (Webhook-based)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
  amount_shekel DECIMAL(10, 2) NOT NULL,
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('paypal', 'morning')),
  webhook_id TEXT UNIQUE,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending_webhook' CHECK (status IN ('pending_webhook', 'success', 'failed')),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS subscription_payments_user_idx
  ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS subscription_payments_tier_idx
  ON public.subscription_payments(tier_id);
CREATE INDEX IF NOT EXISTS subscription_payments_status_idx
  ON public.subscription_payments(status);
CREATE INDEX IF NOT EXISTS subscription_payments_provider_idx
  ON public.subscription_payments(payment_provider);

-- 3. COUPON CODES TABLE
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  max_uses INTEGER,
  times_used INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_admin_id UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS coupon_codes_active_idx
  ON public.coupon_codes(is_active)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS coupon_codes_code_idx
  ON public.coupon_codes(code);

-- 4. ALTER PROFILES TABLE TO ADD SUBSCRIPTION FIELDS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier_id UUID REFERENCES subscription_tiers(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_payment_reference TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_trial_used BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tutor_student_slots_remaining INTEGER DEFAULT 0;

-- Create indexes for subscription lookups
CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx
  ON public.profiles(subscription_status)
  WHERE subscription_status != 'canceled';
CREATE INDEX IF NOT EXISTS profiles_subscription_expires_idx
  ON public.profiles(subscription_expires_at);

-- ============================================================================
-- RPC FUNCTIONS FOR PAYMENT MANAGEMENT
-- ============================================================================

-- 1. RPC: Get user's subscription info
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE(
  subscription_status TEXT,
  subscription_expires_at TIMESTAMPTZ,
  tier_name TEXT,
  tier_price_shekel DECIMAL(10, 2),
  tier_duration_days INTEGER,
  last_payment_date TIMESTAMPTZ,
  last_payment_reference TEXT,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.subscription_status,
    p.subscription_expires_at,
    st.name,
    st.price_shekel,
    st.duration_days,
    p.last_payment_date,
    p.last_payment_reference,
    EXTRACT(DAY FROM (p.subscription_expires_at - NOW()))::INTEGER as days_remaining
  FROM public.profiles p
  LEFT JOIN public.subscription_tiers st ON st.id = p.subscription_tier_id
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. RPC: Process webhook payment (called by Edge Function)
CREATE OR REPLACE FUNCTION process_webhook_payment(
  p_user_id UUID,
  p_tier_id UUID,
  p_payment_provider TEXT,
  p_webhook_id TEXT,
  p_payment_reference TEXT,
  p_amount_shekel DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier_duration_days INTEGER;
BEGIN
  -- Check if webhook already processed (idempotency)
  IF EXISTS (
    SELECT 1 FROM public.subscription_payments
    WHERE webhook_id = p_webhook_id AND status = 'success'
  ) THEN
    RETURN true; -- Already processed, return success
  END IF;

  -- Get tier duration
  SELECT duration_days INTO v_tier_duration_days
  FROM public.subscription_tiers
  WHERE id = p_tier_id;

  IF v_tier_duration_days IS NULL THEN
    RETURN false;
  END IF;

  -- Insert payment record
  INSERT INTO public.subscription_payments (
    user_id,
    tier_id,
    amount_shekel,
    payment_provider,
    webhook_id,
    payment_reference,
    status,
    activated_at
  ) VALUES (
    p_user_id,
    p_tier_id,
    p_amount_shekel,
    p_payment_provider,
    p_webhook_id,
    p_payment_reference,
    'success',
    NOW()
  )
  ON CONFLICT (webhook_id) DO NOTHING;

  -- Update user profile with new subscription
  UPDATE public.profiles
  SET
    subscription_status = 'active',
    subscription_expires_at = NOW() + (v_tier_duration_days || ' days')::INTERVAL,
    subscription_tier_id = p_tier_id,
    last_payment_date = NOW(),
    last_payment_reference = p_payment_reference
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. RPC: Manual admin approval (fallback method, no longer primary)
CREATE OR REPLACE FUNCTION admin_approve_payment_request(
  p_payment_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_user_id UUID;
  v_tier_duration_days INTEGER;
BEGIN
  -- Verify admin status
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RETURN false;
  END IF;

  -- Get payment details
  SELECT sp.user_id, st.duration_days
  INTO v_user_id, v_tier_duration_days
  FROM public.subscription_payments sp
  JOIN public.subscription_tiers st ON st.id = sp.tier_id
  WHERE sp.id = p_payment_id AND sp.status = 'success';

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update user profile
  UPDATE public.profiles
  SET
    subscription_status = 'active',
    subscription_expires_at = NOW() + (v_tier_duration_days || ' days')::INTERVAL,
    last_payment_date = NOW()
  WHERE id = v_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. RPC: Check and set subscription status based on expiry
CREATE OR REPLACE FUNCTION check_and_update_subscription_status(p_user_id UUID)
RETURNS TABLE(status TEXT, is_expired BOOLEAN) AS $$
DECLARE
  v_new_status TEXT;
  v_is_expired BOOLEAN;
BEGIN
  -- Determine subscription status
  SELECT
    CASE
      WHEN subscription_status = 'canceled' THEN 'canceled'
      WHEN subscription_expires_at IS NULL THEN 'trial'
      WHEN subscription_expires_at < NOW() THEN 'expired'
      ELSE subscription_status
    END,
    CASE
      WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at < NOW() THEN true
      ELSE false
    END
  INTO v_new_status, v_is_expired
  FROM public.profiles
  WHERE id = p_user_id;

  -- Update if status changed
  IF v_new_status != 'trial' THEN
    UPDATE public.profiles
    SET subscription_status = v_new_status
    WHERE id = p_user_id AND subscription_status != v_new_status;
  END IF;

  RETURN QUERY SELECT v_new_status, v_is_expired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- DEFAULT SUBSCRIPTION TIERS (Insert if not exists)
-- ============================================================================

INSERT INTO public.subscription_tiers (
  name,
  price_shekel,
  currency,
  duration_days,
  max_children,
  display_order,
  features
) VALUES
  ('trial', 0, 'ILS', 14, 1, 1, '{"canPlayGames": true, "canViewAnalytics": false, "canAssignTasks": false}'::jsonb),
  ('monthly', 49, 'ILS', 30, 1, 2, '{"canPlayGames": true, "canViewAnalytics": true, "canAssignTasks": true}'::jsonb),
  ('quarterly', 129, 'ILS', 90, 3, 3, '{"canPlayGames": true, "canViewAnalytics": true, "canAssignTasks": true}'::jsonb),
  ('yearly', 399, 'ILS', 365, 5, 4, '{"canPlayGames": true, "canViewAnalytics": true, "canAssignTasks": true, "prioritySupport": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TRIGGER: Auto-set trial subscription for new users (if not already set)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_trial_on_new_parent()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for new parents
  IF NEW.role = 'parent' AND NEW.subscription_status IS NULL THEN
    NEW.subscription_status := 'trial';
    NEW.subscription_expires_at := NOW() + INTERVAL '14 days';
    NEW.trial_started_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_trial_on_new_parent_trigger ON public.profiles;

CREATE TRIGGER set_trial_on_new_parent_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION set_trial_on_new_parent();

-- ============================================================================
-- GRANT PERMISSIONS (Supabase Auth users)
-- ============================================================================

-- Allow users to read subscription info
GRANT SELECT ON public.subscription_tiers TO authenticated;
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT SELECT ON public.coupon_codes TO authenticated;

-- Allow Edge Functions (service role) to write
GRANT ALL ON public.subscription_payments TO service_role;
GRANT ALL ON public.subscription_tiers TO service_role;
GRANT ALL ON public.profiles TO service_role;
