-- ============================================================================
-- Step 2: RPC get_tutor_trial_status
-- Returns: is_in_trial, trial_expired, hours_remaining, trial_started_at
-- Teacher is considered "paid" if their subscription_status = 'active' or 'vip'.
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
  v_sub_status TEXT;
  v_hours_left NUMERIC;
BEGIN
  SELECT p.tutor_trial_started_at, p.role, p.subscription_status
  INTO v_started, v_role, v_sub_status
  FROM public.profiles p
  WHERE p.id = p_teacher_id;

  -- Not a teacher → not in trial
  IF v_role IS DISTINCT FROM 'teacher' THEN
    RETURN QUERY SELECT false, false, 0::NUMERIC, v_started;
    RETURN;
  END IF;

  -- Paid (active or VIP) → trial over, no lock
  IF v_sub_status IN ('active', 'vip') THEN
    RETURN QUERY SELECT false, false, 0::NUMERIC, v_started;
    RETURN;
  END IF;

  -- Calculate hours remaining in 48h trial
  v_hours_left := EXTRACT(EPOCH FROM (
    COALESCE(v_started, NOW()) + INTERVAL '48 hours' - NOW()
  )) / 3600.0;

  RETURN QUERY SELECT
    true,
    v_hours_left <= 0,
    GREATEST(v_hours_left, 0::NUMERIC),
    v_started;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_tutor_trial_status(UUID) TO authenticated;
