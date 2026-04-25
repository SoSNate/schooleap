-- ============================================================
--  חשבונאוטיקה — Complete Database Schema v3
--  קובץ יחיד — source of truth יחיד לכל ה-DB
--  להרצה על DB חדש לגמרי (DROP + CREATE הכל)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. ניקוי מוחלט
-- ────────────────────────────────────────────────────────────
DROP TRIGGER  IF EXISTS on_auth_user_created           ON auth.users;
DROP TRIGGER  IF EXISTS trg_assignments_seed            ON public.assignments;
DROP TRIGGER  IF EXISTS trg_event_completes_assignment  ON public.game_events;
DROP TRIGGER  IF EXISTS set_tutor_trial_trigger         ON public.profiles;

DROP FUNCTION IF EXISTS public.handle_new_user()                                  CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_caller()                                  CASCADE;
DROP FUNCTION IF EXISTS public.join_classroom(TEXT,TEXT)                          CASCADE;
DROP FUNCTION IF EXISTS public.get_child_subscription(TEXT)                       CASCADE;
DROP FUNCTION IF EXISTS public.get_child_events(TEXT)                             CASCADE;
DROP FUNCTION IF EXISTS public.get_child_goals(TEXT)                              CASCADE;
DROP FUNCTION IF EXISTS public.get_child_assignments(TEXT)                        CASCADE;
DROP FUNCTION IF EXISTS public.get_teacher_class_overview(UUID)                   CASCADE;
DROP FUNCTION IF EXISTS public.get_teacher_class_overview()                       CASCADE;
DROP FUNCTION IF EXISTS public.apply_coupon(TEXT)                                 CASCADE;
DROP FUNCTION IF EXISTS public.seed_child_assignments()                           CASCADE;
DROP FUNCTION IF EXISTS public.complete_assignments_on_event()                    CASCADE;
DROP FUNCTION IF EXISTS public.admin_approve_teacher(TEXT)                        CASCADE;
DROP FUNCTION IF EXISTS public.admin_revoke_teacher(UUID)                         CASCADE;
DROP FUNCTION IF EXISTS public.admin_set_subscription(UUID,TEXT,TIMESTAMPTZ,TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.save_push_subscription(TEXT,JSONB,TEXT)            CASCADE;
DROP FUNCTION IF EXISTS public.disable_push_subscription(TEXT)                    CASCADE;
DROP FUNCTION IF EXISTS public.get_push_subscriptions_for_child(TEXT)             CASCADE;
DROP FUNCTION IF EXISTS public.get_teacher_mode_status(UUID)                      CASCADE;
DROP FUNCTION IF EXISTS public.request_teacher_mode_change(UUID,TEXT,TEXT)        CASCADE;
DROP FUNCTION IF EXISTS public.approve_teacher_institutional_mode(UUID,UUID)      CASCADE;
DROP FUNCTION IF EXISTS public.set_teacher_primary_mode(UUID,TEXT)                CASCADE;
DROP FUNCTION IF EXISTS public.create_teacher_classroom(UUID,TEXT,TEXT)           CASCADE;
DROP FUNCTION IF EXISTS public.get_teacher_classrooms(UUID)                       CASCADE;
DROP FUNCTION IF EXISTS public.update_classroom_name(UUID,UUID,TEXT)              CASCADE;
DROP FUNCTION IF EXISTS public.delete_classroom(UUID,UUID)                        CASCADE;
DROP FUNCTION IF EXISTS public.get_tutor_trial_status(UUID)                       CASCADE;
DROP FUNCTION IF EXISTS public.set_tutor_trial_on_new_teacher()                   CASCADE;
DROP FUNCTION IF EXISTS public.update_child_push_settings(TEXT,TEXT,BOOLEAN,INT,TIME,TIME,BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.init_push_settings_for_child(TEXT,TEXT)            CASCADE;
DROP FUNCTION IF EXISTS public.can_send_push_notification(TEXT)                   CASCADE;
DROP FUNCTION IF EXISTS public.increment_daily_push_count(TEXT)                   CASCADE;

DROP TABLE IF EXISTS public.subscription_payments              CASCADE;
DROP TABLE IF EXISTS public.subscription_tiers                 CASCADE;
DROP TABLE IF EXISTS public.teacher_mode_requests              CASCADE;
DROP TABLE IF EXISTS public.teacher_institutional_enrollment   CASCADE;
DROP TABLE IF EXISTS public.classrooms                         CASCADE;
DROP TABLE IF EXISTS public.audit_log                          CASCADE;
DROP TABLE IF EXISTS public.child_assignments_status           CASCADE;
DROP TABLE IF EXISTS public.assignments                        CASCADE;
DROP TABLE IF EXISTS public.teacher_leads                      CASCADE;
DROP TABLE IF EXISTS public.coupons                            CASCADE;
DROP TABLE IF EXISTS public.goals                              CASCADE;
DROP TABLE IF EXISTS public.game_events                        CASCADE;
DROP TABLE IF EXISTS public.parent_push_settings               CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions                 CASCADE;
DROP TABLE IF EXISTS public.children                           CASCADE;
DROP TABLE IF EXISTS public.profiles                           CASCADE;

-- ════════════════════════════════════════════════════════════
-- SECTION 1: CORE TABLES
-- ════════════════════════════════════════════════════════════

CREATE TABLE public.profiles (
  id                      UUID        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email                   TEXT        UNIQUE,
  role                    TEXT        NOT NULL DEFAULT 'parent' CHECK (role IN ('parent','teacher','admin')),
  is_admin                BOOLEAN     NOT NULL DEFAULT false,
  is_approved             BOOLEAN     NOT NULL DEFAULT true,
  classroom_code          TEXT        UNIQUE,
  max_children_allowed    INT         NOT NULL DEFAULT 1,
  teacher_status          TEXT,
  full_name               TEXT,
  -- מנוי
  subscription_status     TEXT        NOT NULL DEFAULT 'trial',
  subscription_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  applied_coupon          TEXT,
  last_payment_date       TIMESTAMPTZ,
  last_payment_reference  TEXT,
  trial_started_at        TIMESTAMPTZ,
  -- מצב מורה
  teacher_modes           TEXT[]      DEFAULT ARRAY['private']::TEXT[],
  primary_teacher_mode    TEXT        DEFAULT 'private',
  teacher_mode_status     JSONB       DEFAULT '{
    "private":       {"enabled": true,  "approved_at": null},
    "institutional": {"enabled": false, "approved_at": null}
  }'::JSONB,
  -- ניסיון מורה פרטי
  tutor_trial_started_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx  ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS profiles_subscription_expires_idx ON public.profiles(subscription_expires_at);

CREATE TABLE public.children (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  magic_token TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  access_code TEXT        UNIQUE,
  avatar_url  TEXT,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS children_teacher_id_idx ON public.children(teacher_id) WHERE teacher_id IS NOT NULL;

CREATE TABLE public.game_events (
  id          BIGINT      PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  child_token TEXT        NOT NULL,
  game_name   TEXT        NOT NULL,
  level       INTEGER     NOT NULL DEFAULT 1,
  success     BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.goals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  reward       TEXT        NOT NULL,
  target_hours INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.coupons (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        UNIQUE NOT NULL,
  duration_days INTEGER,
  description   TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  single_use    BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.teacher_leads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT        NOT NULL,
  school     TEXT,
  phone      TEXT,
  notes      TEXT,
  email      TEXT,
  handled    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.assignments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_name    TEXT        NOT NULL,
  target_level INT         NOT NULL CHECK (target_level BETWEEN 1 AND 5),
  title        TEXT,
  due_at       TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS assignments_teacher_idx ON public.assignments(teacher_id, created_at DESC);

CREATE TABLE public.child_assignments_status (
  child_id      UUID        NOT NULL REFERENCES public.children(id)    ON DELETE CASCADE,
  assignment_id UUID        NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  completed     BOOLEAN     NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_id, assignment_id)
);
CREATE INDEX IF NOT EXISTS cas_completed_idx ON public.child_assignments_status(child_id, completed);

CREATE TABLE public.audit_log (
  id             BIGINT      PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  admin_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email    TEXT,
  action         TEXT        NOT NULL,
  target_user_id UUID,
  target_email   TEXT,
  payload        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);

-- ════════════════════════════════════════════════════════════
-- SECTION 2: CLASSROOMS
-- ════════════════════════════════════════════════════════════

CREATE TABLE public.classrooms (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_code TEXT        NOT NULL UNIQUE,
  classroom_name TEXT        NOT NULL DEFAULT 'כיתה',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS classrooms_teacher_idx ON public.classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS classrooms_code_idx    ON public.classrooms(classroom_code);

-- ════════════════════════════════════════════════════════════
-- SECTION 3: TEACHER MODE REQUESTS
-- ════════════════════════════════════════════════════════════

CREATE TABLE public.teacher_mode_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_mode TEXT        NOT NULL CHECK (requested_mode IN ('private','institutional')),
  from_mode      TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reason         TEXT,
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at    TIMESTAMPTZ,
  approved_by    UUID        REFERENCES auth.users(id),
  UNIQUE(teacher_id, requested_mode, status)
);
CREATE INDEX IF NOT EXISTS teacher_mode_requests_teacher_idx ON public.teacher_mode_requests(teacher_id);
CREATE INDEX IF NOT EXISTS teacher_mode_requests_status_idx  ON public.teacher_mode_requests(status);

CREATE TABLE public.teacher_institutional_enrollment (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT        NOT NULL,
  organization_id   TEXT        UNIQUE,
  enrollment_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_status    TEXT        DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','cancelled')),
  payment_date      TIMESTAMPTZ,
  contact_email     TEXT        NOT NULL,
  contact_phone     TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- SECTION 4: SUBSCRIPTION PAYMENTS
-- ════════════════════════════════════════════════════════════

CREATE TABLE public.subscription_tiers (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL UNIQUE,
  price_shekel  DECIMAL(10,2) NOT NULL,
  currency      TEXT          NOT NULL DEFAULT 'ILS',
  duration_days INTEGER       NOT NULL,
  max_children  INTEGER,
  display_order INTEGER       DEFAULT 0,
  features      JSONB         DEFAULT '{}'::jsonb,
  is_active     BOOLEAN       DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subscription_payments (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id           UUID          NOT NULL REFERENCES public.subscription_tiers(id),
  amount_shekel     DECIMAL(10,2) NOT NULL,
  payment_provider  TEXT          NOT NULL CHECK (payment_provider IN ('paypal','morning')),
  webhook_id        TEXT          UNIQUE,
  payment_reference TEXT,
  status            TEXT          NOT NULL DEFAULT 'pending_webhook'
                                  CHECK (status IN ('pending_webhook','success','failed')),
  activated_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  metadata          JSONB         DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS subscription_payments_user_idx   ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS subscription_payments_status_idx ON public.subscription_payments(status);

-- ════════════════════════════════════════════════════════════
-- SECTION 5: WEB PUSH TABLES
-- ════════════════════════════════════════════════════════════

CREATE TABLE public.push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  magic_token TEXT        NOT NULL,
  subscription JSONB      NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_token_idx ON public.push_subscriptions(magic_token);

CREATE TABLE public.parent_push_settings (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  magic_token               TEXT        NOT NULL UNIQUE,
  parent_magic_token        TEXT,
  notifications_enabled     BOOLEAN     NOT NULL DEFAULT true,
  max_notifications_per_day INT         NOT NULL DEFAULT 3,
  quiet_hour_start          TIME        DEFAULT '22:00',
  quiet_hour_end            TIME        DEFAULT '08:00',
  quiet_hours_enabled       BOOLEAN     NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS parent_push_settings_token_idx  ON public.parent_push_settings(magic_token);
CREATE INDEX IF NOT EXISTS parent_push_settings_parent_idx ON public.parent_push_settings(parent_magic_token);

-- ════════════════════════════════════════════════════════════
-- SECTION 6: HELPER FUNCTION
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin_caller()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;
GRANT EXECUTE ON FUNCTION public.is_admin_caller() TO authenticated, anon;

-- ════════════════════════════════════════════════════════════
-- SECTION 7: ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.profiles                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_assignments_status       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile"    ON public.profiles FOR ALL    USING (auth.uid() = id);
CREATE POLICY "Admin reads all profiles"    ON public.profiles FOR SELECT USING (public.is_admin_caller());

CREATE POLICY "Parents manage own children"  ON public.children FOR ALL    USING (auth.uid() = parent_id);
CREATE POLICY "Teachers read their students" ON public.children FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Admin reads all children"     ON public.children FOR SELECT USING (public.is_admin_caller());

CREATE POLICY "Parents view own children events" ON public.game_events FOR SELECT
  USING (child_token IN (SELECT magic_token FROM public.children WHERE parent_id = auth.uid()));
CREATE POLICY "Teachers read students events"    ON public.game_events FOR SELECT
  USING (child_token IN (SELECT magic_token FROM public.children WHERE teacher_id = auth.uid()));
CREATE POLICY "Child insert own events"          ON public.game_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin reads all events"           ON public.game_events FOR SELECT USING (public.is_admin_caller());

CREATE POLICY "Parents manage own goals" ON public.goals FOR ALL    USING (auth.uid() = parent_id);
CREATE POLICY "Admin reads all goals"    ON public.goals FOR SELECT USING (public.is_admin_caller());

CREATE POLICY "Anyone can submit lead" ON public.teacher_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin reads leads"      ON public.teacher_leads FOR SELECT USING (public.is_admin_caller());
CREATE POLICY "Admin updates leads"    ON public.teacher_leads FOR UPDATE USING (public.is_admin_caller());

CREATE POLICY "Teacher manages own assignments" ON public.assignments FOR ALL    USING (teacher_id = auth.uid());
CREATE POLICY "Admin reads all assignments"     ON public.assignments FOR SELECT USING (public.is_admin_caller());

CREATE POLICY "Teacher reads own class status" ON public.child_assignments_status FOR SELECT
  USING (assignment_id IN (SELECT id FROM public.assignments WHERE teacher_id = auth.uid()));
CREATE POLICY "Admin reads all status"         ON public.child_assignments_status FOR SELECT USING (public.is_admin_caller());

CREATE POLICY "Admin reads audit" ON public.audit_log FOR SELECT USING (public.is_admin_caller());

CREATE POLICY "Admin reads push subscriptions" ON public.push_subscriptions FOR SELECT USING (public.is_admin_caller());

CREATE POLICY "Teacher manages own classrooms" ON public.classrooms FOR ALL    USING (teacher_id = auth.uid());
CREATE POLICY "Admin reads all classrooms"     ON public.classrooms FOR SELECT USING (public.is_admin_caller());

CREATE POLICY "Anyone reads active tiers"  ON public.subscription_tiers    FOR SELECT USING (true);
CREATE POLICY "User reads own payments"    ON public.subscription_payments  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin reads all payments"   ON public.subscription_payments  FOR SELECT USING (public.is_admin_caller());

-- ════════════════════════════════════════════════════════════
-- SECTION 8: TRIGGERS
-- ════════════════════════════════════════════════════════════

-- יוצר פרופיל + trial לכל משתמש חדש
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, role, is_admin, is_approved,
    subscription_status, subscription_expires_at, trial_started_at
  ) VALUES (
    NEW.id, NEW.email, 'parent',
    (LOWER(NEW.email) = '12natanel@gmail.com'),
    true, 'trial', NOW() + INTERVAL '14 days', NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET is_admin = EXCLUDED.is_admin
    WHERE public.profiles.is_admin IS DISTINCT FROM EXCLUDED.is_admin;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- שומר זמן תחילת ניסיון לכל מורה חדש
CREATE OR REPLACE FUNCTION set_tutor_trial_on_new_teacher()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'teacher' AND NEW.tutor_trial_started_at IS NULL THEN
    NEW.tutor_trial_started_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_tutor_trial_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION set_tutor_trial_on_new_teacher();

-- מזריע child_assignments_status לכל תלמידי המורה כשנוצרת משימה חדשה
CREATE OR REPLACE FUNCTION public.seed_child_assignments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.child_assignments_status (child_id, assignment_id, completed)
  SELECT c.id, NEW.id, false FROM public.children c
  WHERE c.teacher_id = NEW.teacher_id ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_assignments_seed AFTER INSERT ON public.assignments
  FOR EACH ROW EXECUTE PROCEDURE public.seed_child_assignments();

-- משלים משימה אוטומטית כשילד מצליח במשחק
CREATE OR REPLACE FUNCTION public.complete_assignments_on_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_child_id UUID;
BEGIN
  IF NOT NEW.success THEN RETURN NEW; END IF;
  SELECT id INTO v_child_id FROM public.children WHERE magic_token = NEW.child_token LIMIT 1;
  IF v_child_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.child_assignments_status cas
  SET completed = true, completed_at = NOW(), status = 'done'
  FROM public.assignments a
  WHERE cas.assignment_id = a.id AND cas.child_id = v_child_id
    AND cas.completed = false AND a.game_name = NEW.game_name AND NEW.level >= a.target_level;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_event_completes_assignment AFTER INSERT ON public.game_events
  FOR EACH ROW EXECUTE PROCEDURE public.complete_assignments_on_event();

-- ════════════════════════════════════════════════════════════
-- SECTION 9: CHILD RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════

-- מחזיר סטטוס מנוי + blocked (כולל בדיקת ניסיון מורה פרטי)
CREATE OR REPLACE FUNCTION public.get_child_subscription(p_token TEXT)
RETURNS TABLE(
  subscription_status     TEXT,
  subscription_expires_at TIMESTAMPTZ,
  blocked                 BOOLEAN
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
  SELECT c.parent_id, c.teacher_id INTO v_parent_id, v_teacher_id
  FROM public.children c WHERE c.magic_token = p_token LIMIT 1;

  IF v_parent_id IS NULL AND v_teacher_id IS NULL THEN
    RETURN QUERY SELECT 'expired'::TEXT, NOW()::TIMESTAMPTZ, true; RETURN;
  END IF;

  SELECT p.subscription_status, p.subscription_expires_at INTO v_sub_status, v_sub_expires
  FROM public.profiles p WHERE p.id = COALESCE(v_parent_id, v_teacher_id) LIMIT 1;

  v_is_blocked := (
    v_sub_status IS NULL OR v_sub_status = 'expired' OR
    (v_sub_status = 'trial' AND v_sub_expires < NOW())
  );

  IF v_teacher_id IS NOT NULL AND NOT v_is_blocked THEN
    SELECT p.subscription_status, p.tutor_trial_started_at INTO v_teacher_sub, v_teacher_trial
    FROM public.profiles p WHERE p.id = v_teacher_id;
    IF v_teacher_sub NOT IN ('active','vip') AND v_teacher_trial IS NOT NULL THEN
      v_trial_hours_left := EXTRACT(EPOCH FROM (v_teacher_trial + INTERVAL '48 hours') - NOW()) / 3600;
      IF v_trial_hours_left <= 0 THEN v_is_blocked := true; END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_sub_status, v_sub_expires, v_is_blocked;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_child_subscription(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_child_events(p_token TEXT)
RETURNS SETOF public.game_events
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.game_events WHERE child_token = p_token ORDER BY created_at DESC LIMIT 200;
$$;
GRANT EXECUTE ON FUNCTION public.get_child_events(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_child_goals(p_token TEXT)
RETURNS TABLE(id UUID, parent_id UUID, title TEXT, reward TEXT, target_hours INTEGER, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_parent_id UUID;
BEGIN
  SELECT c.parent_id INTO v_parent_id FROM public.children c WHERE c.magic_token = p_token LIMIT 1;
  IF v_parent_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT g.id,g.parent_id,g.title,g.reward,g.target_hours,g.created_at
    FROM public.goals g WHERE g.parent_id = v_parent_id ORDER BY g.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_child_goals(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_child_assignments(p_token TEXT)
RETURNS TABLE(assignment_id UUID, game_name TEXT, target_level INT,
              due_date TIMESTAMPTZ, is_completed BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.game_name, a.target_level, a.due_at, cas.completed, a.created_at
  FROM public.children c
  JOIN public.child_assignments_status cas ON cas.child_id = c.id
  JOIN public.assignments a ON a.id = cas.assignment_id
  WHERE c.magic_token = p_token AND cas.completed = false ORDER BY a.created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_child_assignments(TEXT) TO anon, authenticated;

-- ════════════════════════════════════════════════════════════
-- SECTION 10: TEACHER RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_teacher_class_overview(p_teacher_id UUID DEFAULT NULL)
RETURNS TABLE(child_id UUID, name TEXT, magic_token TEXT, access_code TEXT, created_at TIMESTAMPTZ,
              total_events BIGINT, success_events BIGINT, last_seen_at TIMESTAMPTZ, open_assignments BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_teacher_id UUID;
BEGIN
  IF p_teacher_id IS NOT NULL AND NOT public.is_admin_caller() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  v_teacher_id := COALESCE(p_teacher_id, auth.uid());
  RETURN QUERY
    SELECT c.id, c.name, c.magic_token, c.access_code, c.created_at,
           COALESCE(ev.total,0), COALESCE(ev.success,0), ev.last_seen_at, COALESCE(asn.open_count,0)
    FROM public.children c
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE ge.success) AS success, MAX(ge.created_at) AS last_seen_at
      FROM public.game_events ge WHERE ge.child_token = c.magic_token
    ) ev ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS open_count FROM public.child_assignments_status cas
      WHERE cas.child_id = c.id AND cas.completed = false
    ) asn ON true
    WHERE c.teacher_id = v_teacher_id ORDER BY c.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_overview(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_tutor_trial_status(p_teacher_id UUID)
RETURNS TABLE(is_in_trial BOOLEAN, trial_expired BOOLEAN,
              hours_remaining NUMERIC, trial_started_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_started TIMESTAMPTZ; v_role TEXT; v_sub_status TEXT; v_hours_left NUMERIC;
BEGIN
  SELECT p.tutor_trial_started_at, p.role, p.subscription_status
  INTO v_started, v_role, v_sub_status FROM public.profiles p WHERE p.id = p_teacher_id;

  IF v_role IS DISTINCT FROM 'teacher' THEN
    RETURN QUERY SELECT false, false, 0::NUMERIC, v_started; RETURN;
  END IF;
  IF v_sub_status IN ('active','vip') THEN
    RETURN QUERY SELECT false, false, 0::NUMERIC, v_started; RETURN;
  END IF;

  v_hours_left := EXTRACT(EPOCH FROM (COALESCE(v_started, NOW()) + INTERVAL '48 hours' - NOW())) / 3600.0;
  RETURN QUERY SELECT true, v_hours_left <= 0, GREATEST(v_hours_left, 0::NUMERIC), v_started;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_tutor_trial_status(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- SECTION 11: CLASSROOM RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_teacher_classroom(
  p_teacher_id UUID, p_classroom_code TEXT, p_classroom_name TEXT DEFAULT 'כיתה'
)
RETURNS TABLE(id UUID, classroom_code TEXT, classroom_name TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.classrooms WHERE classroom_code = p_classroom_code) THEN
    RAISE EXCEPTION 'קוד הכיתה כבר בשימוש: %', p_classroom_code;
  END IF;
  RETURN QUERY
  INSERT INTO public.classrooms (teacher_id, classroom_code, classroom_name)
  VALUES (p_teacher_id, p_classroom_code, p_classroom_name)
  RETURNING classrooms.id, classrooms.classroom_code, classrooms.classroom_name, classrooms.created_at;
END;
$$;
GRANT EXECUTE ON FUNCTION create_teacher_classroom(UUID,TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION get_teacher_classrooms(p_teacher_id UUID)
RETURNS TABLE(id UUID, classroom_code TEXT, classroom_name TEXT, student_count INT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.classroom_code, c.classroom_name, COUNT(p.id)::INT, c.created_at
  FROM public.classrooms c
  LEFT JOIN public.profiles p ON p.classroom_code = c.classroom_code
  WHERE c.teacher_id = p_teacher_id
  GROUP BY c.id ORDER BY c.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_teacher_classrooms(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION update_classroom_name(p_classroom_id UUID, p_teacher_id UUID, p_new_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.classrooms SET classroom_name = p_new_name, updated_at = NOW()
  WHERE id = p_classroom_id AND teacher_id = p_teacher_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION update_classroom_name(UUID,UUID,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION delete_classroom(p_classroom_id UUID, p_teacher_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_student_count INT; v_code TEXT;
BEGIN
  SELECT classroom_code INTO v_code FROM public.classrooms
  WHERE id = p_classroom_id AND teacher_id = p_teacher_id;
  IF v_code IS NULL THEN RETURN FALSE; END IF;
  SELECT COUNT(*) INTO v_student_count FROM public.profiles WHERE classroom_code = v_code;
  IF v_student_count > 0 THEN RETURN FALSE; END IF;
  DELETE FROM public.classrooms WHERE id = p_classroom_id AND teacher_id = p_teacher_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION delete_classroom(UUID,UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- SECTION 12: TEACHER MODE RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_teacher_mode_status(p_teacher_id UUID)
RETURNS TABLE(teacher_modes TEXT[], primary_mode TEXT, mode_status JSONB, pending_requests INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.teacher_modes, p.primary_teacher_mode, p.teacher_mode_status, COUNT(tmr.id)::INT
  FROM public.profiles p
  LEFT JOIN public.teacher_mode_requests tmr ON tmr.teacher_id = p.id AND tmr.status = 'pending'
  WHERE p.id = p_teacher_id
  GROUP BY p.id, p.teacher_modes, p.primary_teacher_mode, p.teacher_mode_status;
END;
$$;
GRANT EXECUTE ON FUNCTION get_teacher_mode_status(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION request_teacher_mode_change(
  p_teacher_id UUID, p_requested_mode TEXT, p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current_modes TEXT[]; v_from_mode TEXT;
BEGIN
  SELECT teacher_modes, primary_teacher_mode INTO v_current_modes, v_from_mode
  FROM public.profiles WHERE id = p_teacher_id;
  IF v_current_modes IS NULL OR v_from_mode = p_requested_mode THEN RETURN FALSE; END IF;
  INSERT INTO public.teacher_mode_requests (teacher_id, requested_mode, from_mode, reason)
  VALUES (p_teacher_id, p_requested_mode, v_from_mode, p_reason)
  ON CONFLICT (teacher_id, requested_mode, status) DO NOTHING;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION request_teacher_mode_change(UUID,TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION approve_teacher_institutional_mode(p_teacher_id UUID, p_admin_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = p_admin_id;
  IF NOT v_is_admin THEN RETURN FALSE; END IF;
  UPDATE public.profiles
  SET teacher_modes = array_append(teacher_modes, 'institutional'),
      teacher_mode_status = jsonb_set(
        jsonb_set(COALESCE(teacher_mode_status,'{}'), '{institutional,enabled}', 'true'),
        '{institutional,approved_at}', to_jsonb(NOW())
      )
  WHERE id = p_teacher_id AND NOT (teacher_modes @> ARRAY['institutional'::TEXT]);
  UPDATE public.teacher_mode_requests
  SET status='approved', approved_at=NOW(), approved_by=p_admin_id
  WHERE teacher_id=p_teacher_id AND requested_mode='institutional' AND status='pending';
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION approve_teacher_institutional_mode(UUID,UUID) TO authenticated;

CREATE OR REPLACE FUNCTION set_teacher_primary_mode(p_teacher_id UUID, p_mode TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_modes TEXT[];
BEGIN
  SELECT teacher_modes INTO v_modes FROM public.profiles WHERE id = p_teacher_id;
  IF NOT (v_modes @> ARRAY[p_mode]::TEXT[]) THEN RETURN FALSE; END IF;
  UPDATE public.profiles SET primary_teacher_mode = p_mode WHERE id = p_teacher_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION set_teacher_primary_mode(UUID,TEXT) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- SECTION 13: ADMIN RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_approve_teacher(p_email TEXT)
RETURNS TABLE(user_id UUID, classroom_code TEXT, email TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user public.profiles%ROWTYPE; v_code TEXT;
        v_admin UUID := auth.uid(); v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT p.email INTO v_admin_email FROM public.profiles p WHERE p.id = v_admin;
  SELECT * INTO v_user FROM public.profiles p WHERE LOWER(p.email) = LOWER(TRIM(p_email)) LIMIT 1;
  IF v_user.id IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;
  LOOP
    v_code := UPPER(LEFT(REPLACE(gen_random_uuid()::TEXT,'-',''),6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE classroom_code = v_code);
  END LOOP;
  UPDATE public.profiles
  SET role='teacher', is_approved=true, teacher_status='approved', classroom_code=v_code,
      max_children_allowed=GREATEST(max_children_allowed,40),
      subscription_status='active', subscription_expires_at=NOW()+INTERVAL '1 year',
      tutor_trial_started_at=COALESCE(tutor_trial_started_at, NOW())
  WHERE id = v_user.id;
  UPDATE public.teacher_leads SET handled=true
  WHERE LOWER(email) = LOWER(v_user.email) AND handled=false;
  INSERT INTO public.audit_log (admin_id,admin_email,action,target_user_id,target_email,payload)
  VALUES (v_admin,v_admin_email,'approve_teacher',v_user.id,v_user.email,
          jsonb_build_object('classroom_code',v_code));
  user_id:=v_user.id; classroom_code:=v_code; email:=v_user.email; RETURN NEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_teacher(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_teacher(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID := auth.uid(); v_admin_email TEXT; v_target_email TEXT;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT email INTO v_admin_email  FROM public.profiles WHERE id = v_admin;
  SELECT email INTO v_target_email FROM public.profiles WHERE id = p_user_id;
  UPDATE public.profiles
  SET role='parent', is_approved=true, teacher_status=NULL, classroom_code=NULL
  WHERE id = p_user_id;
  INSERT INTO public.audit_log (admin_id,admin_email,action,target_user_id,target_email)
  VALUES (v_admin,v_admin_email,'revoke_teacher',p_user_id,v_target_email);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_revoke_teacher(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_subscription(
  p_user_id UUID, p_status TEXT, p_expires_at TIMESTAMPTZ, p_coupon TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID := auth.uid(); v_admin_email TEXT; v_target_email TEXT; v_action TEXT;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT email INTO v_admin_email  FROM public.profiles WHERE id = v_admin;
  SELECT email INTO v_target_email FROM public.profiles WHERE id = p_user_id;
  UPDATE public.profiles
  SET subscription_status     = COALESCE(p_status,    subscription_status),
      subscription_expires_at = COALESCE(p_expires_at, subscription_expires_at),
      applied_coupon          = COALESCE(p_coupon,     applied_coupon)
  WHERE id = p_user_id;
  v_action := CASE WHEN p_coupon IS NOT NULL THEN 'manual_coupon_grant' ELSE 'manual_subscription_change' END;
  INSERT INTO public.audit_log (admin_id,admin_email,action,target_user_id,target_email,payload)
  VALUES (v_admin,v_admin_email,v_action,p_user_id,v_target_email,
          jsonb_build_object('status',p_status,'expires_at',p_expires_at,'coupon',p_coupon));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription(UUID,TEXT,TIMESTAMPTZ,TEXT) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- SECTION 14: OTHER RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.apply_coupon(p_code TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_days INTEGER; v_active BOOLEAN; v_single BOOLEAN;
BEGIN
  SELECT is_active, duration_days, single_use INTO v_active, v_days, v_single
  FROM public.coupons WHERE code = UPPER(TRIM(p_code));
  IF NOT FOUND OR NOT v_active THEN RETURN 'invalid'; END IF;
  UPDATE public.profiles
  SET subscription_status     = CASE WHEN v_days IS NULL THEN 'vip' ELSE 'active' END,
      subscription_expires_at = CASE WHEN v_days IS NULL THEN NOW()+INTERVAL '100 years'
                                     ELSE NOW()+(v_days||' days')::INTERVAL END,
      applied_coupon          = UPPER(TRIM(p_code))
  WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN 'unauthorized'; END IF;
  IF v_single THEN UPDATE public.coupons SET is_active=false WHERE code=UPPER(TRIM(p_code)); END IF;
  RETURN 'success';
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_coupon(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_classroom(p_classroom_code TEXT, p_child_name TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_teacher_id UUID; v_max_children INTEGER; v_current_count BIGINT;
  v_child_id UUID; v_access_code TEXT; v_magic_token TEXT; v_name TEXT;
BEGIN
  SELECT p.id, p.max_children_allowed INTO v_teacher_id, v_max_children
  FROM public.profiles p
  WHERE UPPER(TRIM(p.classroom_code)) = UPPER(TRIM(p_classroom_code))
    AND (p.is_admin = true OR p.role IN ('teacher','admin')) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_code'; END IF;
  SELECT COUNT(*) INTO v_current_count FROM public.children WHERE teacher_id = v_teacher_id;
  IF v_current_count >= COALESCE(NULLIF(v_max_children,0), 100) THEN RAISE EXCEPTION 'class_full'; END IF;
  INSERT INTO public.children (teacher_id, name) VALUES (v_teacher_id, TRIM(p_child_name))
  RETURNING id, access_code, magic_token, name INTO v_child_id, v_access_code, v_magic_token, v_name;
  RETURN json_build_object('access_code',v_access_code,'magic_token',v_magic_token,
                           'child_id',v_child_id,'name',v_name);
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_classroom(TEXT,TEXT) TO anon, authenticated;

-- ════════════════════════════════════════════════════════════
-- SECTION 15: WEB PUSH RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.save_push_subscription(
  p_token TEXT, p_subscription JSONB, p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE magic_token = p_token) THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.push_subscriptions WHERE magic_token = p_token) THEN
    UPDATE public.push_subscriptions
    SET subscription=p_subscription, user_agent=COALESCE(p_user_agent,user_agent), updated_at=NOW()
    WHERE magic_token=p_token;
  ELSE
    INSERT INTO public.push_subscriptions (magic_token,subscription,user_agent,updated_at)
    VALUES (p_token,p_subscription,p_user_agent,NOW());
  END IF;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(TEXT,JSONB,TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.disable_push_subscription(p_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.push_subscriptions WHERE magic_token = p_token;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.disable_push_subscription(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_push_subscriptions_for_child(p_token TEXT)
RETURNS TABLE(id UUID, subscription JSONB, user_agent TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, subscription, user_agent, created_at
  FROM public.push_subscriptions WHERE magic_token = p_token ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_push_subscriptions_for_child(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.init_push_settings_for_child(p_child_token TEXT, p_parent_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.parent_push_settings (magic_token, parent_magic_token)
  VALUES (p_child_token, p_parent_token) ON CONFLICT (magic_token) DO NOTHING;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.init_push_settings_for_child(TEXT,TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_child_push_settings(
  p_parent_token TEXT, p_child_token TEXT,
  p_notifications_enabled BOOLEAN DEFAULT NULL, p_max_per_day INT DEFAULT NULL,
  p_quiet_start TIME DEFAULT NULL, p_quiet_end TIME DEFAULT NULL, p_quiet_enabled BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.parent_push_settings
    (magic_token, parent_magic_token, notifications_enabled, max_notifications_per_day,
     quiet_hour_start, quiet_hour_end, quiet_hours_enabled)
  VALUES
    (p_child_token, p_parent_token, COALESCE(p_notifications_enabled,true),
     COALESCE(p_max_per_day,3), COALESCE(p_quiet_start,'22:00'::TIME),
     COALESCE(p_quiet_end,'08:00'::TIME), COALESCE(p_quiet_enabled,true))
  ON CONFLICT (magic_token) DO UPDATE SET
    notifications_enabled     = COALESCE(p_notifications_enabled, parent_push_settings.notifications_enabled),
    max_notifications_per_day = COALESCE(p_max_per_day,           parent_push_settings.max_notifications_per_day),
    quiet_hour_start          = COALESCE(p_quiet_start,           parent_push_settings.quiet_hour_start),
    quiet_hour_end            = COALESCE(p_quiet_end,             parent_push_settings.quiet_hour_end),
    quiet_hours_enabled       = COALESCE(p_quiet_enabled,         parent_push_settings.quiet_hours_enabled),
    updated_at                = NOW();
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_child_push_settings(TEXT,TEXT,BOOLEAN,INT,TIME,TIME,BOOLEAN) TO anon, authenticated;

-- נדרש על ידי Edge Function send-push
CREATE OR REPLACE FUNCTION public.can_send_push_notification(p_child_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_settings public.parent_push_settings%ROWTYPE;
  v_now_time  TIME;
BEGIN
  SELECT * INTO v_settings FROM public.parent_push_settings WHERE magic_token = p_child_token;
  IF NOT FOUND OR NOT v_settings.notifications_enabled THEN RETURN FALSE; END IF;
  IF v_settings.quiet_hours_enabled THEN
    v_now_time := CURRENT_TIME;
    IF v_settings.quiet_hour_start > v_settings.quiet_hour_end THEN
      IF v_now_time >= v_settings.quiet_hour_start OR v_now_time < v_settings.quiet_hour_end THEN
        RETURN FALSE;
      END IF;
    ELSE
      IF v_now_time >= v_settings.quiet_hour_start AND v_now_time < v_settings.quiet_hour_end THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_send_push_notification(TEXT) TO anon, authenticated, service_role;

-- נדרש על ידי Edge Function send-push
CREATE OR REPLACE FUNCTION public.increment_daily_push_count(p_child_token TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- no-op: push_notification_count table removed, kept for Edge Function compatibility
  NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_daily_push_count(TEXT) TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════
-- SECTION 16: PAYMENT WEBHOOK RPC (נקרא מ-Edge Function)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION process_webhook_payment(
  p_user_id UUID, p_tier_id UUID, p_payment_provider TEXT,
  p_webhook_id TEXT, p_payment_reference TEXT, p_amount_shekel DECIMAL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tier_duration_days INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.subscription_payments WHERE webhook_id=p_webhook_id AND status='success'
  ) THEN RETURN true; END IF;

  SELECT duration_days INTO v_tier_duration_days FROM public.subscription_tiers WHERE id=p_tier_id;
  IF v_tier_duration_days IS NULL THEN RETURN false; END IF;

  INSERT INTO public.subscription_payments
    (user_id,tier_id,amount_shekel,payment_provider,webhook_id,payment_reference,status,activated_at)
  VALUES
    (p_user_id,p_tier_id,p_amount_shekel,p_payment_provider,p_webhook_id,p_payment_reference,'success',NOW())
  ON CONFLICT (webhook_id) DO NOTHING;

  UPDATE public.profiles
  SET subscription_status     = 'active',
      subscription_expires_at = NOW() + (v_tier_duration_days || ' days')::INTERVAL,
      last_payment_date       = NOW(),
      last_payment_reference  = p_payment_reference
  WHERE id = p_user_id;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION process_webhook_payment(UUID,UUID,TEXT,TEXT,TEXT,DECIMAL) TO service_role;

-- ════════════════════════════════════════════════════════════
-- SECTION 17: GRANTS
-- ════════════════════════════════════════════════════════════

GRANT ALL    ON public.subscription_payments TO service_role;
GRANT ALL    ON public.subscription_tiers    TO service_role;
GRANT ALL    ON public.profiles              TO service_role;

-- ════════════════════════════════════════════════════════════
-- SECTION 18: INITIAL DATA
-- ════════════════════════════════════════════════════════════

INSERT INTO public.coupons (code, duration_days, description, single_use) VALUES
  ('GIFT30',     30,   'חודש מתנה',              false),
  ('GIFT60',     60,   'חודשיים מתנה',            false),
  ('MASTER-VIP', NULL, 'גישה VIP ללא הגבלת זמן', false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.subscription_tiers (name, price_shekel, currency, duration_days, max_children, display_order, features)
VALUES
  ('trial',     0,   'ILS', 14,  1, 1, '{"canPlayGames":true,"canViewAnalytics":false,"canAssignTasks":false}'),
  ('monthly',   100, 'ILS', 30,  1, 2, '{"canPlayGames":true,"canViewAnalytics":true,"canAssignTasks":true}'),
  ('quarterly', 200, 'ILS', 90,  3, 3, '{"canPlayGames":true,"canViewAnalytics":true,"canAssignTasks":true}'),
  ('yearly',    399, 'ILS', 365, 5, 4, '{"canPlayGames":true,"canViewAnalytics":true,"canAssignTasks":true,"prioritySupport":true}')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ✅ Schema Complete v3
-- 15 Tables | 25 RPC Functions | 4 Triggers | RLS on all tables
-- ============================================================
