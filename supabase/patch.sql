-- ============================================================
--  חשבונאוטיקה — Patch SQL (על DB קיים)
--  מחליף את migrations 01-09. idempotent — בטוח להרצה חוזרת.
--  הרץ ב-Supabase SQL Editor כשמעדכנים DB קיים (לא מוחק נתונים!).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. עמודות חדשות ל-profiles
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role                 TEXT    NOT NULL DEFAULT 'parent',
  ADD COLUMN IF NOT EXISTS is_admin             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_approved          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS classroom_code       TEXT,
  ADD COLUMN IF NOT EXISTS max_children_allowed INT     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS teacher_status       TEXT,
  ADD COLUMN IF NOT EXISTS full_name            TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('parent','teacher','admin'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_classroom_code_unique
  ON public.profiles (classroom_code) WHERE classroom_code IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. עמודות חדשות ל-children
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS teacher_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS children_access_code_unique
  ON public.children (access_code) WHERE access_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS children_teacher_id_idx
  ON public.children (teacher_id) WHERE teacher_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 3. teacher_leads
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_leads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT        NOT NULL,
  school     TEXT,
  phone      TEXT,
  notes      TEXT,
  email      TEXT,
  handled    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.teacher_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can submit lead" ON public.teacher_leads;
CREATE POLICY "anyone can submit lead"
  ON public.teacher_leads FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin reads leads" ON public.teacher_leads;
CREATE POLICY "admin reads leads"
  ON public.teacher_leads FOR SELECT USING (public.is_admin_caller());

DROP POLICY IF EXISTS "admin updates leads" ON public.teacher_leads;
CREATE POLICY "admin updates leads"
  ON public.teacher_leads FOR UPDATE USING (public.is_admin_caller());

-- ────────────────────────────────────────────────────────────
-- 4. assignments
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assignments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_name    TEXT        NOT NULL,
  target_level INT         NOT NULL CHECK (target_level BETWEEN 1 AND 5),
  due_date     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS assignments_teacher_idx
  ON public.assignments (teacher_id, created_at DESC);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher manages own assignments" ON public.assignments;
CREATE POLICY "Teacher manages own assignments"
  ON public.assignments FOR ALL USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admin reads all assignments" ON public.assignments;
CREATE POLICY "Admin reads all assignments"
  ON public.assignments FOR SELECT USING (public.is_admin_caller());

-- ────────────────────────────────────────────────────────────
-- 5. child_assignments_status
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.child_assignments_status (
  child_id      UUID        NOT NULL REFERENCES public.children(id)    ON DELETE CASCADE,
  assignment_id UUID        NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  completed     BOOLEAN     NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_id, assignment_id)
);
CREATE INDEX IF NOT EXISTS cas_completed_idx
  ON public.child_assignments_status (child_id, completed);
ALTER TABLE public.child_assignments_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher reads own class status" ON public.child_assignments_status;
CREATE POLICY "Teacher reads own class status"
  ON public.child_assignments_status FOR SELECT
  USING (assignment_id IN (
    SELECT id FROM public.assignments WHERE teacher_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admin reads all status" ON public.child_assignments_status;
CREATE POLICY "Admin reads all status"
  ON public.child_assignments_status FOR SELECT USING (public.is_admin_caller());

-- ────────────────────────────────────────────────────────────
-- 6. audit_log
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id             BIGINT      PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  admin_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email    TEXT,
  action         TEXT        NOT NULL,
  target_user_id UUID,
  target_email   TEXT,
  payload        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log (created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads audit" ON public.audit_log;
CREATE POLICY "Admin reads audit"
  ON public.audit_log FOR SELECT USING (public.is_admin_caller());

-- ────────────────────────────────────────────────────────────
-- 7. RLS נוסף — children, game_events, goals, profiles
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Teachers read their students"  ON public.children;
CREATE POLICY "Teachers read their students"
  ON public.children FOR SELECT USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admin reads all children"      ON public.children;
CREATE POLICY "Admin reads all children"
  ON public.children FOR SELECT USING (public.is_admin_caller());

DROP POLICY IF EXISTS "Teachers read students events" ON public.game_events;
CREATE POLICY "Teachers read students events"
  ON public.game_events FOR SELECT
  USING (child_token IN (
    SELECT magic_token FROM public.children WHERE teacher_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admin reads all events"        ON public.game_events;
CREATE POLICY "Admin reads all events"
  ON public.game_events FOR SELECT USING (public.is_admin_caller());

DROP POLICY IF EXISTS "Admin reads all goals"         ON public.goals;
CREATE POLICY "Admin reads all goals"
  ON public.goals FOR SELECT USING (public.is_admin_caller());

DROP POLICY IF EXISTS "Admin reads all profiles"      ON public.profiles;
CREATE POLICY "Admin reads all profiles"
  ON public.profiles FOR SELECT USING (public.is_admin_caller());

-- ============================================================
--  FUNCTIONS
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 8. is_admin_caller()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_caller()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;
GRANT EXECUTE ON FUNCTION public.is_admin_caller() TO authenticated, anon;

-- ────────────────────────────────────────────────────────────
-- 9. handle_new_user (מעודכן — is_admin + role)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, role, is_admin, is_approved,
    subscription_status, subscription_expires_at
  ) VALUES (
    NEW.id, NEW.email, 'parent',
    (LOWER(NEW.email) = '12natanel@gmail.com'),
    true, 'trial', NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (id) DO UPDATE
    SET is_admin = EXCLUDED.is_admin
    WHERE public.profiles.is_admin IS DISTINCT FROM EXCLUDED.is_admin;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 10. join_classroom — RETURNS JSON, ללא pgcrypto
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.join_classroom(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.join_classroom(
  p_classroom_code TEXT,
  p_child_name     TEXT
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_teacher_id    UUID;
  v_max_children  INTEGER;
  v_current_count BIGINT;
  v_child_id      UUID;
  v_access_code   TEXT;
  v_magic_token   TEXT;
  v_name          TEXT;
BEGIN
  SELECT p.id, p.max_children_allowed
  INTO   v_teacher_id, v_max_children
  FROM   public.profiles p
  WHERE  UPPER(TRIM(p.classroom_code)) = UPPER(TRIM(p_classroom_code))
    AND  (p.is_admin = true OR p.role IN ('teacher','admin'))
  LIMIT  1;

  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_code'; END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM   public.children WHERE teacher_id = v_teacher_id;

  IF v_current_count >= COALESCE(NULLIF(v_max_children, 0), 100) THEN
    RAISE EXCEPTION 'class_full';
  END IF;

  INSERT INTO public.children (teacher_id, name)
  VALUES (v_teacher_id, TRIM(p_child_name))
  RETURNING id, access_code, magic_token, name
  INTO v_child_id, v_access_code, v_magic_token, v_name;

  RETURN json_build_object(
    'access_code', v_access_code, 'magic_token', v_magic_token,
    'child_id', v_child_id, 'name', v_name
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_classroom(TEXT, TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 11. get_child_assignments
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_child_assignments(TEXT);
CREATE OR REPLACE FUNCTION public.get_child_assignments(p_token TEXT)
RETURNS TABLE(
  assignment_id UUID, game_name TEXT, target_level INT,
  due_date TIMESTAMPTZ, is_completed BOOLEAN, created_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.game_name, a.target_level, a.due_date, cas.completed, a.created_at
  FROM   public.children c
  JOIN   public.child_assignments_status cas ON cas.child_id = c.id
  JOIN   public.assignments              a   ON a.id = cas.assignment_id
  WHERE  c.magic_token = p_token AND cas.completed = false
  ORDER  BY a.created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_child_assignments(TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 12. get_teacher_class_overview (עם p_teacher_id DEFAULT NULL)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_teacher_class_overview(UUID);
DROP FUNCTION IF EXISTS public.get_teacher_class_overview();

CREATE OR REPLACE FUNCTION public.get_teacher_class_overview(p_teacher_id UUID DEFAULT NULL)
RETURNS TABLE(
  child_id UUID, name TEXT, magic_token TEXT, access_code TEXT, created_at TIMESTAMPTZ,
  total_events BIGINT, success_events BIGINT, last_seen_at TIMESTAMPTZ, open_assignments BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_teacher_id UUID;
BEGIN
  IF p_teacher_id IS NOT NULL AND NOT public.is_admin_caller() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  v_teacher_id := COALESCE(p_teacher_id, auth.uid());
  RETURN QUERY
    SELECT c.id, c.name, c.magic_token, c.access_code, c.created_at,
           COALESCE(ev.total, 0), COALESCE(ev.success, 0),
           ev.last_seen_at, COALESCE(asn.open_count, 0)
    FROM public.children c
    LEFT JOIN LATERAL (
      SELECT COUNT(*)                            AS total,
             COUNT(*) FILTER (WHERE ge.success) AS success,
             MAX(ge.created_at)                 AS last_seen_at
      FROM   public.game_events ge WHERE ge.child_token = c.magic_token
    ) ev ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS open_count FROM public.child_assignments_status cas
      WHERE cas.child_id = c.id AND cas.completed = false
    ) asn ON true
    WHERE c.teacher_id = v_teacher_id ORDER BY c.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_overview(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 13. seed_child_assignments (טריגר)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_child_assignments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.child_assignments_status (child_id, assignment_id, completed)
  SELECT c.id, NEW.id, false FROM public.children c
  WHERE c.teacher_id = NEW.teacher_id ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_assignments_seed ON public.assignments;
CREATE TRIGGER trg_assignments_seed
  AFTER INSERT ON public.assignments FOR EACH ROW
  EXECUTE PROCEDURE public.seed_child_assignments();

-- ────────────────────────────────────────────────────────────
-- 14. complete_assignments_on_event (טריגר)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.complete_assignments_on_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_child_id UUID;
BEGIN
  IF NOT NEW.success THEN RETURN NEW; END IF;
  SELECT id INTO v_child_id FROM public.children
  WHERE magic_token = NEW.child_token LIMIT 1;
  IF v_child_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.child_assignments_status cas
  SET completed = true, completed_at = NOW()
  FROM public.assignments a
  WHERE cas.assignment_id = a.id AND cas.child_id = v_child_id
    AND cas.completed = false AND a.game_name = NEW.game_name
    AND NEW.level >= a.target_level;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_event_completes_assignment ON public.game_events;
CREATE TRIGGER trg_event_completes_assignment
  AFTER INSERT ON public.game_events FOR EACH ROW
  EXECUTE PROCEDURE public.complete_assignments_on_event();

-- ────────────────────────────────────────────────────────────
-- 15. admin_approve_teacher (ללא pgcrypto, ללא ambiguous email)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_approve_teacher(p_email TEXT)
RETURNS TABLE(user_id UUID, classroom_code TEXT, email TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user        public.profiles%ROWTYPE;
  v_code        TEXT;
  v_admin       UUID := auth.uid();
  v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT p.email INTO v_admin_email FROM public.profiles p WHERE p.id = v_admin;
  SELECT * INTO v_user FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(TRIM(p_email)) LIMIT 1;
  IF v_user.id IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;

  LOOP
    v_code := UPPER(LEFT(REPLACE(gen_random_uuid()::TEXT, '-', ''), 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.classroom_code = v_code);
  END LOOP;

  UPDATE public.profiles p
  SET role='teacher', is_approved=true, teacher_status='approved',
      classroom_code=v_code, max_children_allowed=GREATEST(p.max_children_allowed,40),
      subscription_status='active', subscription_expires_at=NOW()+INTERVAL '1 year'
  WHERE p.id = v_user.id;

  UPDATE public.teacher_leads tl SET handled=true
  WHERE LOWER(tl.email)=LOWER(v_user.email) AND tl.handled=false;

  INSERT INTO public.audit_log (admin_id,admin_email,action,target_user_id,target_email,payload)
  VALUES (v_admin,v_admin_email,'approve_teacher',v_user.id,v_user.email,
          jsonb_build_object('classroom_code',v_code));

  user_id:=v_user.id; classroom_code:=v_code; email:=v_user.email;
  RETURN NEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_teacher(TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 16. admin_revoke_teacher
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_revoke_teacher(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID:=auth.uid(); v_admin_email TEXT; v_target_email TEXT;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT p.email INTO v_admin_email  FROM public.profiles p WHERE p.id=v_admin;
  SELECT p.email INTO v_target_email FROM public.profiles p WHERE p.id=p_user_id;
  UPDATE public.profiles p SET role='parent',is_approved=true,teacher_status=NULL,classroom_code=NULL
  WHERE p.id=p_user_id;
  INSERT INTO public.audit_log (admin_id,admin_email,action,target_user_id,target_email)
  VALUES (v_admin,v_admin_email,'revoke_teacher',p_user_id,v_target_email);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_revoke_teacher(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 17. admin_set_subscription
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_subscription(
  p_user_id UUID, p_status TEXT, p_expires_at TIMESTAMPTZ, p_coupon TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID:=auth.uid(); v_admin_email TEXT; v_target_email TEXT; v_action TEXT;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT p.email INTO v_admin_email  FROM public.profiles p WHERE p.id=v_admin;
  SELECT p.email INTO v_target_email FROM public.profiles p WHERE p.id=p_user_id;
  UPDATE public.profiles p
  SET subscription_status=COALESCE(p_status,p.subscription_status),
      subscription_expires_at=COALESCE(p_expires_at,p.subscription_expires_at),
      applied_coupon=COALESCE(p_coupon,p.applied_coupon)
  WHERE p.id=p_user_id;
  v_action:=CASE WHEN p_coupon IS NOT NULL THEN 'manual_coupon_grant' ELSE 'manual_subscription_change' END;
  INSERT INTO public.audit_log (admin_id,admin_email,action,target_user_id,target_email,payload)
  VALUES (v_admin,v_admin_email,v_action,p_user_id,v_target_email,
          jsonb_build_object('status',p_status,'expires_at',p_expires_at,'coupon',p_coupon));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription(UUID,TEXT,TIMESTAMPTZ,TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 18. admin_list_users
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID, email TEXT, role TEXT, is_approved BOOLEAN, is_admin BOOLEAN,
  subscription_status TEXT, subscription_expires_at TIMESTAMPTZ,
  classroom_code TEXT, applied_coupon TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN QUERY
    SELECT p.id,p.email,p.role,p.is_approved,p.is_admin,p.subscription_status,
           p.subscription_expires_at,p.classroom_code,p.applied_coupon,p.created_at
    FROM public.profiles p
    WHERE p_search IS NULL OR p.email ILIKE '%'||p_search||'%'
    ORDER BY p.created_at DESC LIMIT 500;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 19. admin_view_parent_dashboard / admin_view_teacher_dashboard
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_view_parent_dashboard(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile JSONB; v_child JSONB; v_events JSONB; v_goals JSONB;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id=p_user_id;
  SELECT to_jsonb(c) INTO v_child   FROM public.children c WHERE c.parent_id=p_user_id ORDER BY c.created_at LIMIT 1;
  SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]') INTO v_events
  FROM (SELECT * FROM public.game_events WHERE child_token=(
    SELECT magic_token FROM public.children WHERE parent_id=p_user_id ORDER BY created_at LIMIT 1)
    ORDER BY created_at DESC LIMIT 200) e;
  SELECT COALESCE(jsonb_agg(to_jsonb(g) ORDER BY g.created_at),'[]') INTO v_goals
  FROM public.goals g WHERE g.parent_id=p_user_id;
  RETURN jsonb_build_object('profile',v_profile,'child',v_child,'events',v_events,'goals',v_goals);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_view_parent_dashboard(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_view_teacher_dashboard(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile JSONB; v_students JSONB; v_events JSONB; v_assignments JSONB;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id=p_user_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC),'[]') INTO v_students
  FROM public.get_teacher_class_overview(p_user_id) s;
  SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]') INTO v_events
  FROM (SELECT * FROM public.game_events WHERE child_token IN (
    SELECT magic_token FROM public.children WHERE teacher_id=p_user_id)
    ORDER BY created_at DESC LIMIT 500) e;
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC),'[]') INTO v_assignments
  FROM public.assignments a WHERE a.teacher_id=p_user_id;
  RETURN jsonb_build_object('profile',v_profile,'students',v_students,'events',v_events,'assignments',v_assignments);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_view_teacher_dashboard(UUID) TO authenticated;

-- ============================================================
--  תיקוני נתונים (idempotent)
-- ============================================================
UPDATE public.profiles SET is_admin=true
WHERE LOWER(email)='12natanel@gmail.com' AND is_admin=false;

UPDATE public.profiles SET max_children_allowed=40
WHERE max_children_allowed<=1 AND (role IN ('teacher','admin') OR is_admin=true);

-- ============================================================
-- ✅ Patch הושלם — הרץ patch.sql על DB קיים, schema.sql על DB חדש.
-- ============================================================
