-- ════════════════════════════════════════════════════════════
-- Teacher Self-Serve: tier + auto-approve on payment
-- ════════════════════════════════════════════════════════════

-- 1. Tier למורה פרטי (חודשי)
INSERT INTO public.subscription_tiers (name, price_shekel, currency, duration_days, max_children, display_order, features)
VALUES ('teacher_monthly', 99, 'ILS', 30, 30, 10,
  '{"canPlayGames":true,"canViewAnalytics":true,"canAssignTasks":true,"isTeacherTier":true}')
ON CONFLICT (name) DO NOTHING;

-- 2. עמודה לזיהוי tier סוג מורה ב-profiles (אם לא קיים)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_registered_at TIMESTAMPTZ;

-- 3. עדכון process_webhook_payment — כשה-tier הוא teacher_monthly, מגדיר role+teacher
CREATE OR REPLACE FUNCTION process_webhook_payment(
  p_user_id UUID, p_tier_id UUID, p_payment_provider TEXT,
  p_webhook_id TEXT, p_payment_reference TEXT, p_amount_shekel DECIMAL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tier_duration_days INTEGER;
  v_tier_name          TEXT;
  v_classroom_code     TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.subscription_payments WHERE webhook_id=p_webhook_id AND status='success'
  ) THEN RETURN true; END IF;

  SELECT duration_days, name INTO v_tier_duration_days, v_tier_name
  FROM public.subscription_tiers WHERE id=p_tier_id;
  IF v_tier_duration_days IS NULL THEN RETURN false; END IF;

  INSERT INTO public.subscription_payments
    (user_id,tier_id,amount_shekel,payment_provider,webhook_id,payment_reference,status,activated_at)
  VALUES
    (p_user_id,p_tier_id,p_amount_shekel,p_payment_provider,p_webhook_id,p_payment_reference,'success',NOW())
  ON CONFLICT (webhook_id) DO NOTHING;

  -- Teacher tier — אפשר גישה מיידית + הגדר כמורה
  IF v_tier_name = 'teacher_monthly' THEN
    -- צור classroom_code אם אין
    SELECT classroom_code INTO v_classroom_code FROM public.profiles WHERE id = p_user_id;
    IF v_classroom_code IS NULL THEN
      v_classroom_code := 'T-' || UPPER(SUBSTRING(MD5(p_user_id::TEXT), 1, 5));
    END IF;

    UPDATE public.profiles
    SET subscription_status     = 'active',
        subscription_expires_at = NOW() + (v_tier_duration_days || ' days')::INTERVAL,
        last_payment_date       = NOW(),
        last_payment_reference  = p_payment_reference,
        role                    = 'teacher',
        teacher_status          = 'approved',
        classroom_code          = COALESCE(classroom_code, v_classroom_code),
        teacher_registered_at   = NOW()
    WHERE id = p_user_id;

    -- רשום ב-teacher_leads כעדכון לאדמין
    INSERT INTO public.teacher_leads (full_name, email, notes, handled)
    SELECT
      COALESCE(p.full_name, p.email, 'מורה חדש'),
      p.email,
      'נרשם אוטומטית דרך תשלום — ' || p_payment_provider || ' — ' || p_payment_reference,
      false
    FROM public.profiles p WHERE p.id = p_user_id
    ON CONFLICT DO NOTHING;

  ELSE
    -- תשלום רגיל (הורה)
    UPDATE public.profiles
    SET subscription_status     = 'active',
        subscription_expires_at = NOW() + (v_tier_duration_days || ' days')::INTERVAL,
        last_payment_date       = NOW(),
        last_payment_reference  = p_payment_reference
    WHERE id = p_user_id;
  END IF;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION process_webhook_payment(UUID,UUID,TEXT,TEXT,TEXT,DECIMAL) TO service_role;
