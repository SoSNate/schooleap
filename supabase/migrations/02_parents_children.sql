-- ============================================================
--  Migration 02 — Parents & Children (Overwatch)
--  מוסיף teacher_id ו-access_code לטבלת children + RLS למורים.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. עמודות חדשות ל-children
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS teacher_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS children_access_code_unique
  ON public.children (access_code)
  WHERE access_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS children_teacher_id_idx
  ON public.children (teacher_id)
  WHERE teacher_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. RLS — מורה רואה את התלמידים שלו
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Teachers read their students" ON public.children;
CREATE POLICY "Teachers read their students"
  ON public.children FOR SELECT
  USING (teacher_id = auth.uid());

-- אדמין רואה את כל הילדים
DROP POLICY IF EXISTS "Admin reads all children" ON public.children;
CREATE POLICY "Admin reads all children"
  ON public.children FOR SELECT
  USING (public.is_admin_caller());

-- מורה רואה את האירועים של תלמידיו (לפי child_token)
DROP POLICY IF EXISTS "Teachers read students events" ON public.game_events;
CREATE POLICY "Teachers read students events"
  ON public.game_events FOR SELECT
  USING (
    child_token IN (
      SELECT magic_token FROM public.children
      WHERE teacher_id = auth.uid()
    )
  );

-- אדמין רואה את כל האירועים
DROP POLICY IF EXISTS "Admin reads all events" ON public.game_events;
CREATE POLICY "Admin reads all events"
  ON public.game_events FOR SELECT
  USING (public.is_admin_caller());

-- אדמין רואה את כל היעדים
DROP POLICY IF EXISTS "Admin reads all goals" ON public.goals;
CREATE POLICY "Admin reads all goals"
  ON public.goals FOR SELECT
  USING (public.is_admin_caller());

-- ============================================================
-- ✅ Migration 02 הושלם.
-- ============================================================
