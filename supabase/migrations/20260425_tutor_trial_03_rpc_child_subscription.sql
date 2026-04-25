-- ============================================================================
-- Step 3: Update get_child_subscription
-- Adds: blocked column + teacher trial check
-- Teacher is considered "paid" if subscription_status = 'active' or 'vip'.
-- If child's teacher trial expired → blocked = true
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_child_subscription(p_token TEXT)
RETURNS TABLE(
  subscription_status    TEXT,
  subscription_expires_at TIMESTAMPTZ,
  blocked                BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_parent_id        UUID;
  v_teacher_id       UUID;
  v_sub_status       TEXT;
  v_sub_expires      TIMESTAMPTZ;
  v_teacher_sub      TEXT;
  v_teacher_trial    TIMESTAMPTZ;
  v_trial_hours_left NUMERIC;
  v_is_blocked       BOOLEAN := false;
BEGIN
  SELECT c.parent_id, c.teacher_id
  INTO v_parent_id, v_teacher_id
  FROM public.children c
  WHERE c.magic_token = p_token
  LIMIT 1;

  IF v_parent_id IS NULL AND v_teacher_id IS NULL THEN
    RETURN QUERY SELECT 'expired'::TEXT, NOW()::TIMESTAMPTZ, true;
    RETURN;
  END IF;

  -- Get subscription from whoever owns this child (parent or teacher)
  SELECT p.subscription_status, p.subscription_expires_at
  INTO v_sub_status, v_sub_expires
  FROM public.profiles p
  WHERE p.id = COALESCE(v_parent_id, v_teacher_id)
  LIMIT 1;

  -- Check parent subscription block
  v_is_blocked := (
    v_sub_status IS NULL OR
    v_sub_status = 'expired' OR
    (v_sub_status = 'trial' AND v_sub_expires < NOW())
  );

  -- Check teacher trial block (only if child has a private tutor)
  IF v_teacher_id IS NOT NULL AND NOT v_is_blocked THEN
    SELECT p.subscription_status, p.tutor_trial_started_at
    INTO v_teacher_sub, v_teacher_trial
    FROM public.profiles p WHERE p.id = v_teacher_id;

    -- If teacher is active/vip → no lock
    IF v_teacher_sub NOT IN ('active', 'vip') AND v_teacher_trial IS NOT NULL THEN
      v_trial_hours_left := EXTRACT(EPOCH FROM (
        v_teacher_trial + INTERVAL '48 hours' - NOW()
      )) / 3600.0;
      IF v_trial_hours_left <= 0 THEN
        v_is_blocked := true;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_sub_status, v_sub_expires, v_is_blocked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_child_subscription(TEXT) TO anon, authenticated;
