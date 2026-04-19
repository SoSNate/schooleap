-- ============================================================
--  Migration 01 — Core Profiles (Overwatch)
--  מרחיב את טבלת profiles בעמודות role, is_admin, is_approved,
--  classroom_code, max_children_allowed. בטוח להרצה חוזרת.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. הוספת עמודות חדשות ל-profiles (idempotent)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role                 TEXT    NOT NULL DEFAULT 'parent',
  ADD COLUMN IF NOT EXISTS is_admin             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_approved          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS classroom_code       TEXT,
  ADD COLUMN IF NOT EXISTS max_children_allowed INT     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS teacher_status       TEXT,
  ADD COLUMN IF NOT EXISTS full_name            TEXT;

-- חוקיות ערכי role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('parent','teacher','admin'));
  END IF;
END $$;

-- classroom_code ייחודי (רק כש-NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_classroom_code_unique
  ON public.profiles (classroom_code)
  WHERE classroom_code IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. טריגר חדש: handle_new_user — סימון אדמין + ברירות מחדל
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, role, is_admin, is_approved,
    subscription_status, subscription_expires_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'parent',                                   -- ברירת מחדל; הופכת ל-teacher דרך דף ההרשמה
    (LOWER(NEW.email) = '12natanel@gmail.com'), -- אדמין לפי מייל קשיח (אפשר להוסיף עוד דרך UPDATE ידני)
    true,                                       -- הורה רגיל מאושר אוטומטית
    'trial',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (id) DO UPDATE
    SET is_admin = EXCLUDED.is_admin
    WHERE public.profiles.is_admin IS DISTINCT FROM EXCLUDED.is_admin;

  RETURN NEW;
END;
$$;

-- הטריגר עצמו כבר קיים משכבה קודמת; אם לא — יוצרים
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. סימון אדמין קיים (אם כבר נרשם לפני שהעמודה נוספה)
-- ────────────────────────────────────────────────────────────
UPDATE public.profiles
SET is_admin = true
WHERE LOWER(email) = '12natanel@gmail.com' AND is_admin = false;

-- ────────────────────────────────────────────────────────────
-- 4. Helper function — is_admin_caller()
--    בשימוש ב-RLS policies וב-RPCs של admin
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_caller()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_caller() TO authenticated, anon;

-- ────────────────────────────────────────────────────────────
-- 5. RLS policy — אדמין רואה את כל הפרופילים
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin reads all profiles" ON public.profiles;
CREATE POLICY "Admin reads all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_caller());

-- ============================================================
-- ✅ Migration 01 הושלם.
-- ============================================================
