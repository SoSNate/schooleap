-- ============================================================
--  Migration 03 — Teachers & Assignments (LMS)
--  teacher_leads + assignments + child_assignments_status + triggers.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. teacher_leads — פניות מורים מדף המכירה
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_leads (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT        NOT NULL,
  school      TEXT,
  phone       TEXT,
  notes       TEXT,
  email       TEXT,
  handled     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.teacher_leads ENABLE ROW LEVEL SECURITY;

-- כל אחד יכול ליצור ליד (anon + authenticated)
DROP POLICY IF EXISTS "anyone can submit lead" ON public.teacher_leads;
CREATE POLICY "anyone can submit lead"
  ON public.teacher_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- רק אדמין קורא/מעדכן לידים
DROP POLICY IF EXISTS "admin reads leads" ON public.teacher_leads;
CREATE POLICY "admin reads leads"
  ON public.teacher_leads FOR SELECT
  USING (public.is_admin_caller());

DROP POLICY IF EXISTS "admin updates leads" ON public.teacher_leads;
CREATE POLICY "admin updates leads"
  ON public.teacher_leads FOR UPDATE
  USING (public.is_admin_caller());

-- ────────────────────────────────────────────────────────────
-- 2. assignments — משימות מורה לכיתה
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assignments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_name    TEXT        NOT NULL,
  target_level INT         NOT NULL CHECK (target_level BETWEEN 1 AND 5),
  title        TEXT,
  due_at       TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assignments_teacher_idx ON public.assignments (teacher_id, created_at DESC);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher manages own assignments" ON public.assignments;
CREATE POLICY "Teacher manages own assignments"
  ON public.assignments FOR ALL
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admin reads all assignments" ON public.assignments;
CREATE POLICY "Admin reads all assignments"
  ON public.assignments FOR SELECT
  USING (public.is_admin_caller());

-- ────────────────────────────────────────────────────────────
-- 3. child_assignments_status — מצב משימה לכל תלמיד
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.child_assignments_status (
  child_id      UUID        NOT NULL REFERENCES public.children(id)    ON DELETE CASCADE,
  assignment_id UUID        NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_id, assignment_id)
);

CREATE INDEX IF NOT EXISTS cas_status_idx ON public.child_assignments_status (child_id, status);

ALTER TABLE public.child_assignments_status ENABLE ROW LEVEL SECURITY;

-- מורה רואה את הסטטוס של התלמידים שלו
DROP POLICY IF EXISTS "Teacher reads own class status" ON public.child_assignments_status;
CREATE POLICY "Teacher reads own class status"
  ON public.child_assignments_status FOR SELECT
  USING (
    assignment_id IN (SELECT id FROM public.assignments WHERE teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin reads all status" ON public.child_assignments_status;
CREATE POLICY "Admin reads all status"
  ON public.child_assignments_status FOR SELECT
  USING (public.is_admin_caller());

-- ────────────────────────────────────────────────────────────
-- 4. טריגר — יצירת assignment מקצה שורות pending לכל התלמידים
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_child_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.child_assignments_status (child_id, assignment_id, status)
  SELECT c.id, NEW.id, 'pending'
  FROM public.children c
  WHERE c.teacher_id = NEW.teacher_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assignments_seed ON public.assignments;
CREATE TRIGGER trg_assignments_seed
  AFTER INSERT ON public.assignments
  FOR EACH ROW
  EXECUTE PROCEDURE public.seed_child_assignments();

-- ────────────────────────────────────────────────────────────
-- 5. טריגר — game_events INSERT → סגירת משימה אם עמד ביעד
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.complete_assignments_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_id UUID;
BEGIN
  IF NOT NEW.success THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_child_id
  FROM public.children
  WHERE magic_token = NEW.child_token
  LIMIT 1;

  IF v_child_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.child_assignments_status cas
  SET status       = 'done',
      completed_at = NOW()
  FROM public.assignments a
  WHERE cas.assignment_id = a.id
    AND cas.child_id      = v_child_id
    AND cas.status        = 'pending'
    AND a.game_name       = NEW.game_name
    AND NEW.level         >= a.target_level;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_completes_assignment ON public.game_events;
CREATE TRIGGER trg_event_completes_assignment
  AFTER INSERT ON public.game_events
  FOR EACH ROW
  EXECUTE PROCEDURE public.complete_assignments_on_event();

-- ============================================================
-- ✅ Migration 03 הושלם.
-- ============================================================
