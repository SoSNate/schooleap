-- ============================================================================
-- Tutor Trial System: 48-hour free trial for private teachers
-- After 48h: teacher dashboard becomes read-only, children see SoftLock
-- ============================================================================

-- Add tutor_trial_started_at column to profiles (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutor_trial_started_at TIMESTAMPTZ;

-- Backfill: set trial start for existing teachers who don't have it
UPDATE public.profiles
SET tutor_trial_started_at = created_at
WHERE role = 'teacher'
  AND tutor_trial_started_at IS NULL;

-- Trigger: auto-set trial start when new teacher is created
CREATE OR REPLACE FUNCTION set_tutor_trial_on_new_teacher()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'teacher' AND NEW.tutor_trial_started_at IS NULL THEN
    NEW.tutor_trial_started_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tutor_trial_trigger ON public.profiles;
CREATE TRIGGER set_tutor_trial_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION set_tutor_trial_on_new_teacher();

-- ============================================================================
-- RPC: get_tutor_trial_status
-- Returns trial state for a private teacher.
-- Returns is_in_trial=false if teacher has a successful payment.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_tutor_trial_status(p_teacher_id UUID)
RETURNS TABLE(
  is_in_trial      BOOLEAN,
  trial_expired    BOOLEAN,
  hours_remaining  NUMERIC,
  trial_started_at TIMESTAMPTZ
) AS $$
DECLARE
  v_started    TIMESTAMPTZ;
  v_role       TEXT;
  v_has_paid   BOOLEAN;
  v_hours_left NUMERIC;
BEGIN
  SELECT p.tutor_trial_started_at, p.role
  INTO v_started, v_role
  FROM public.profiles p
  WHERE p.id = p_teacher_id;

  -- Not a teacher → not in trial
  IF v_role IS DISTINCT FROM 'teacher' THEN
    RETURN QUERY SELECT false, false, 0::NUMERIC, v_started;
    RETURN;
  END IF;

  -- Check for any successful payment (PayPal or Morning)
  SELECT EXISTS (
    SELECT 1 FROM public.subscription_payments sp
    WHERE sp.user_id = p_teacher_id AND sp.status = 'success'
  ) INTO v_has_paid;

  -- Paid teacher → not in trial anymore
  IF v_has_paid THEN
    RETURN QUERY SELECT false, false, 0::NUMERIC, v_started;
    RETURN;
  END IF;

  -- Calculate hours remaining in 48h trial
  v_hours_left := EXTRACT(EPOCH FROM (
    COALESCE(v_started, NOW()) + INTERVAL '48 hours' - NOW()
  )) / 3600.0;

  RETURN QUERY SELECT
    true,                              -- is_in_trial
    v_hours_left <= 0,                 -- trial_expired
    GREATEST(v_hours_left, 0::NUMERIC),-- hours_remaining
    v_started;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_tutor_trial_status(UUID) TO authenticated;

-- ============================================================================
-- RPC: get_child_subscription (REPLACE — adds teacher trial check)
-- If child belongs to a private teacher whose trial expired & no payment
-- → blocked = true so GameApp shows SoftLock
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_child_subscription(p_token TEXT)
RETURNS TABLE(subscription_status TEXT, subscription_expires_at TIMESTAMPTZ, blocked BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_parent_id        UUID;
  v_teacher_id       UUID;
  v_sub_status       TEXT;
  v_sub_expires      TIMESTAMPTZ;
  v_teacher_trial    TIMESTAMPTZ;
  v_teacher_paid     BOOLEAN;
  v_trial_hours_left NUMERIC;
  v_is_blocked       BOOLEAN := false;
BEGIN
  -- Get child's parent_id and teacher_id
  SELECT c.parent_id, c.teacher_id
  INTO v_parent_id, v_teacher_id
  FROM public.children c
  WHERE c.magic_token = p_token
  LIMIT 1;

  IF v_parent_id IS NULL AND v_teacher_id IS NULL THEN
    RETURN QUERY SELECT 'expired'::TEXT, NOW()::TIMESTAMPTZ, true;
    RETURN;
  END IF;

  -- Primary subscription comes from the parent (or teacher if no parent)
  SELECT p.subscription_status, p.subscription_expires_at
  INTO v_sub_status, v_sub_expires
  FROM public.profiles p
  WHERE p.id = COALESCE(v_parent_id, v_teacher_id)
  LIMIT 1;

  -- Determine blocked from parent subscription
  v_is_blocked := (
    v_sub_status IS NULL OR
    v_sub_status = 'expired' OR
    (v_sub_status = 'trial' AND v_sub_expires < NOW())
  );

  -- If child has a teacher (private tutor), also check teacher trial
  IF v_teacher_id IS NOT NULL THEN
    SELECT p.tutor_trial_started_at INTO v_teacher_trial
    FROM public.profiles p WHERE p.id = v_teacher_id;

    SELECT EXISTS (
      SELECT 1 FROM public.subscription_payments sp
      WHERE sp.user_id = v_teacher_id AND sp.status = 'success'
    ) INTO v_teacher_paid;

    IF NOT v_teacher_paid AND v_teacher_trial IS NOT NULL THEN
      v_trial_hours_left := EXTRACT(EPOCH FROM (v_teacher_trial + INTERVAL '48 hours' - NOW())) / 3600.0;
      IF v_trial_hours_left <= 0 THEN
        v_is_blocked := true;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_sub_status, v_sub_expires, v_is_blocked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_child_subscription(TEXT) TO anon, authenticated;
