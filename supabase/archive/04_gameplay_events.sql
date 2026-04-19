-- ============================================================
--  Migration 04 — Gameplay RPCs
--  join_classroom, get_child_assignments, get_teacher_class_overview.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. get_child_assignments — משימות פתוחות של תלמיד לפי magic_token
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_child_assignments(p_token TEXT)
RETURNS TABLE(
  assignment_id UUID,
  game_name     TEXT,
  target_level  INT,
  title         TEXT,
  due_at        TIMESTAMPTZ,
  status        TEXT,
  created_at    TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.game_name, a.target_level, a.title, a.due_at, cas.status, a.created_at
  FROM   public.children                c
  JOIN   public.child_assignments_status cas ON cas.child_id = c.id
  JOIN   public.assignments              a   ON a.id         = cas.assignment_id
  WHERE  c.magic_token = p_token
    AND  cas.status    = 'pending'
  ORDER  BY a.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_child_assignments(TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. join_classroom — תלמיד מצטרף לכיתה עם שם בלבד
--    מחזיר {child_id, magic_token, access_code, name}
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_classroom(
  p_classroom_code TEXT,
  p_child_name     TEXT
)
RETURNS TABLE(
  child_id    UUID,
  magic_token TEXT,
  access_code TEXT,
  name        TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_max        INT;
  v_current    INT;
  v_code       TEXT;
  v_child      public.children%ROWTYPE;
BEGIN
  IF p_classroom_code IS NULL OR TRIM(p_classroom_code) = '' THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;
  IF p_child_name IS NULL OR TRIM(p_child_name) = '' THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  SELECT id, COALESCE(max_children_allowed, 40)
  INTO   v_teacher_id, v_max
  FROM   public.profiles
  WHERE  classroom_code = UPPER(TRIM(p_classroom_code))
    AND  role           = 'teacher'
    AND  is_approved    = true
  LIMIT  1;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  SELECT COUNT(*) INTO v_current
  FROM   public.children
  WHERE  teacher_id = v_teacher_id;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'class_full';
  END IF;

  -- קוד גישה ייחודי (6 תווים hex)
  LOOP
    v_code := UPPER(SUBSTRING(ENCODE(gen_random_bytes(3), 'hex') FROM 1 FOR 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.children WHERE access_code = v_code);
  END LOOP;

  INSERT INTO public.children (parent_id, teacher_id, name, access_code)
  VALUES (v_teacher_id, v_teacher_id, TRIM(p_child_name), v_code)
  RETURNING * INTO v_child;

  -- החזר את הרשומה שנוצרה
  child_id    := v_child.id;
  magic_token := v_child.magic_token;
  access_code := v_child.access_code;
  name        := v_child.name;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_classroom(TEXT, TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. get_teacher_class_overview — סקירת כיתה למורה (auth.uid)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_teacher_class_overview(p_teacher_id UUID DEFAULT NULL)
RETURNS TABLE(
  child_id         UUID,
  name             TEXT,
  magic_token      TEXT,
  access_code      TEXT,
  created_at       TIMESTAMPTZ,
  total_events     BIGINT,
  success_events   BIGINT,
  last_seen_at     TIMESTAMPTZ,
  open_assignments BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  -- רק אדמין יכול לבקש בשם teacher אחר
  IF p_teacher_id IS NOT NULL AND NOT public.is_admin_caller() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  v_teacher_id := COALESCE(p_teacher_id, auth.uid());

  RETURN QUERY
    SELECT
      c.id,
      c.name,
      c.magic_token,
      c.access_code,
      c.created_at,
      COALESCE(ev.total,   0)            AS total_events,
      COALESCE(ev.success, 0)            AS success_events,
      ev.last_seen_at,
      COALESCE(asn.open_count, 0)        AS open_assignments
    FROM public.children c
    LEFT JOIN LATERAL (
      SELECT COUNT(*)                                      AS total,
             COUNT(*) FILTER (WHERE success)               AS success,
             MAX(created_at)                               AS last_seen_at
      FROM   public.game_events
      WHERE  child_token = c.magic_token
    ) ev ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS open_count
      FROM   public.child_assignments_status cas
      WHERE  cas.child_id = c.id AND cas.status = 'pending'
    ) asn ON true
    WHERE c.teacher_id = v_teacher_id
    ORDER BY c.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_class_overview(UUID) TO authenticated;

-- ============================================================
-- ✅ Migration 04 הושלם.
-- ============================================================
