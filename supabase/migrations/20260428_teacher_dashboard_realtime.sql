-- ============================================================
--  Teacher Dashboard Fix — 2026-04-28
--  מטרה: לוודא שמערכת המורים פועלת ב-prod אחרי תיקוני ה-Realtime API.
--  Idempotent — בטוח להריץ אפילו אם רץ schema_complete.sql.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Realtime publication
-- ────────────────────────────────────────────────────────────
-- הוקים useTeacherModes / useTeacherClassrooms מאזינים לשינויים על
-- profiles + classrooms דרך postgres_changes. בלי הוספה לפרסום
-- supabase_realtime השרת לא ישדר שום אירוע ללקוח.
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- profiles → לטריגר עדכוני teacher_modes / primary_teacher_mode
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;

  -- classrooms → לטריגר INSERT/UPDATE/DELETE על כיתות המורה
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename = 'classrooms'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.classrooms';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. Replica identity FULL (לקבלת old-row ב-DELETE/UPDATE)
-- ────────────────────────────────────────────────────────────
-- בלי זה, payload.old.id לא מגיע באירועי DELETE — והמסך לא יעדכן
-- כשמוחקים כיתה.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles   REPLICA IDENTITY FULL;
ALTER TABLE public.classrooms REPLICA IDENTITY FULL;

-- ────────────────────────────────────────────────────────────
-- 3. ודא קיום עמודות teacher_modes על profiles
--    (idempotent — דילוג אם כבר קיים)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_modes TEXT[] DEFAULT ARRAY['private']::TEXT[],
  ADD COLUMN IF NOT EXISTS primary_teacher_mode TEXT DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS teacher_mode_status JSONB DEFAULT '{
    "private":       {"enabled": true,  "approved_at": null},
    "institutional": {"enabled": false, "approved_at": null}
  }'::JSONB;

-- ────────────────────────────────────────────────────────────
-- 4. ודא קיום teacher_mode_requests
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_mode_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_mode       TEXT NOT NULL,
  requested_mode  TEXT NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS teacher_mode_requests_teacher_idx ON public.teacher_mode_requests(teacher_id);
CREATE INDEX IF NOT EXISTS teacher_mode_requests_status_idx  ON public.teacher_mode_requests(status);

-- ────────────────────────────────────────────────────────────
-- 5. ודא קיום teacher_institutional_enrollment
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_institutional_enrollment (
  teacher_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_name TEXT,
  organization_id   TEXT,
  contact_email     TEXT,
  contact_phone     TEXT,
  notes             TEXT,
  submitted_at      TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 6. RLS על הטבלאות החדשות
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.teacher_mode_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_institutional_enrollment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher reads own requests" ON public.teacher_mode_requests;
CREATE POLICY "teacher reads own requests"
  ON public.teacher_mode_requests FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher reads own enrollment" ON public.teacher_institutional_enrollment;
CREATE POLICY "teacher reads own enrollment"
  ON public.teacher_institutional_enrollment FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher upserts own enrollment" ON public.teacher_institutional_enrollment;
CREATE POLICY "teacher upserts own enrollment"
  ON public.teacher_institutional_enrollment FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher updates own enrollment" ON public.teacher_institutional_enrollment;
CREATE POLICY "teacher updates own enrollment"
  ON public.teacher_institutional_enrollment FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 7. RPCs — get_teacher_mode_status / request_teacher_mode_change
--    / set_teacher_primary_mode (CREATE OR REPLACE — בטוח)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_teacher_mode_status(p_teacher_id UUID)
RETURNS TABLE(
  teacher_modes    TEXT[],
  primary_mode     TEXT,
  mode_status      JSONB,
  pending_requests INT
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT p.teacher_modes,
         p.primary_teacher_mode,
         p.teacher_mode_status,
         COUNT(tmr.id)::INT
  FROM   public.profiles p
  LEFT   JOIN public.teacher_mode_requests tmr
         ON tmr.teacher_id = p.id AND tmr.status = 'pending'
  WHERE  p.id = p_teacher_id
  GROUP  BY p.id, p.teacher_modes, p.primary_teacher_mode, p.teacher_mode_status;
$$;
GRANT EXECUTE ON FUNCTION public.get_teacher_mode_status(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_teacher_mode_change(
  p_teacher_id     UUID,
  p_requested_mode TEXT,
  p_reason         TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_mode TEXT;
BEGIN
  IF p_teacher_id <> auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT primary_teacher_mode INTO v_from_mode
  FROM   public.profiles WHERE id = p_teacher_id;

  INSERT INTO public.teacher_mode_requests
         (teacher_id, from_mode, requested_mode, reason)
  VALUES (p_teacher_id, v_from_mode, p_requested_mode, p_reason);
END $$;
GRANT EXECUTE ON FUNCTION public.request_teacher_mode_change(UUID,TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_teacher_primary_mode(
  p_teacher_id UUID,
  p_mode       TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_modes TEXT[];
BEGIN
  IF p_teacher_id <> auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT teacher_modes INTO v_modes FROM public.profiles WHERE id = p_teacher_id;

  IF NOT (v_modes @> ARRAY[p_mode]) THEN
    RAISE EXCEPTION 'Mode % is not enabled for this teacher', p_mode;
  END IF;

  UPDATE public.profiles SET primary_teacher_mode = p_mode WHERE id = p_teacher_id;
END $$;
GRANT EXECUTE ON FUNCTION public.set_teacher_primary_mode(UUID,TEXT) TO authenticated;

-- ============================================================
--  סיום — בדוק עם:
--    SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime';
--    SELECT * FROM public.get_teacher_mode_status(auth.uid());
-- ============================================================
