-- ============================================================
--  Migration 09 — Fix classroom_code generation
--  gen_random_bytes דורש pgcrypto שלא מופעל.
--  החלפה ב-gen_random_uuid() שקיים תמיד ב-Supabase.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_approve_teacher(p_email TEXT)
RETURNS TABLE(user_id UUID, classroom_code TEXT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user        public.profiles%ROWTYPE;
  v_code        TEXT;
  v_admin       UUID := auth.uid();
  v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin_caller() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT p.email INTO v_admin_email
  FROM public.profiles p
  WHERE p.id = v_admin;

  SELECT * INTO v_user
  FROM   public.profiles p
  WHERE  LOWER(p.email) = LOWER(TRIM(p_email))
  LIMIT  1;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  -- classroom_code ייחודי (6 תווים hex) — ללא pgcrypto
  LOOP
    v_code := UPPER(LEFT(REPLACE(gen_random_uuid()::TEXT, '-', ''), 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.classroom_code = v_code
    );
  END LOOP;

  UPDATE public.profiles p
  SET    role                    = 'teacher',
         is_approved             = true,
         teacher_status          = 'approved',
         classroom_code          = v_code,
         max_children_allowed    = GREATEST(p.max_children_allowed, 40),
         subscription_status     = 'active',
         subscription_expires_at = NOW() + INTERVAL '1 year'
  WHERE  p.id = v_user.id;

  UPDATE public.teacher_leads tl
  SET    handled = true
  WHERE  LOWER(tl.email) = LOWER(v_user.email)
    AND  tl.handled = false;

  INSERT INTO public.audit_log
    (admin_id, admin_email, action, target_user_id, target_email, payload)
  VALUES
    (v_admin, v_admin_email, 'approve_teacher', v_user.id, v_user.email,
     jsonb_build_object('classroom_code', v_code));

  user_id        := v_user.id;
  classroom_code := v_code;
  email          := v_user.email;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_teacher(TEXT) TO authenticated;

-- ============================================================
-- ✅ Migration 09 הושלם — classroom_code ללא pgcrypto.
-- ============================================================
