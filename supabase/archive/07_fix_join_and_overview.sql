-- ============================================================
--  Migration 07 — Fix join_classroom + get_teacher_class_overview
--  תיקונים:
--  1. join_classroom → teacher_id במקום parent_id, ILIKE, is_admin support, מחזיר magic_token
--  2. get_teacher_class_overview → teacher_id במקום parent_id
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. join_classroom — תיקון מלא
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_classroom(
  p_classroom_code TEXT,
  p_child_name     TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_teacher_id    UUID;
  v_max_children  INTEGER;
  v_current_count BIGINT;
  v_child_id      UUID;
  v_access_code   TEXT;
  v_magic_token   TEXT;
  v_name          TEXT;
BEGIN
  -- מחפש מורה/אדמין לפי classroom_code (UPPER שני הצדדים למניעת שגיאות הקלדה)
  SELECT p.id, p.max_children_allowed
  INTO   v_teacher_id, v_max_children
  FROM   public.profiles p
  WHERE  UPPER(TRIM(p.classroom_code)) = UPPER(TRIM(p_classroom_code))
    AND  (p.is_admin = true OR p.role IN ('teacher', 'admin'))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  -- בדיקת מכסת תלמידים (teacher_id, לא parent_id)
  SELECT COUNT(*) INTO v_current_count
  FROM   public.children
  WHERE  teacher_id = v_teacher_id;

  -- ברירת מחדל 100 אם max_children_allowed הוא NULL או 0
  IF v_current_count >= COALESCE(NULLIF(v_max_children, 0), 100) THEN
    RAISE EXCEPTION 'class_full';
  END IF;

  -- הכנסת התלמיד עם teacher_id (לא parent_id)
  INSERT INTO public.children (teacher_id, name)
  VALUES (v_teacher_id, TRIM(p_child_name))
  RETURNING id, access_code, magic_token, name
  INTO v_child_id, v_access_code, v_magic_token, v_name;

  RETURN json_build_object(
    'access_code',  v_access_code,
    'magic_token',  v_magic_token,
    'child_id',     v_child_id,
    'name',         v_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_classroom(TEXT, TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. get_teacher_class_overview — teacher_id במקום parent_id
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_teacher_class_overview()
RETURNS TABLE(
  child_id                UUID,
  name                    TEXT,
  access_code             TEXT,
  magic_token             TEXT,
  last_login              TIMESTAMPTZ,
  games_this_week         BIGINT,
  active_days_this_month  BIGINT,
  total_games             BIGINT,
  success_rate            NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- רק מורה/אדמין רשאי
  IF NOT (
    SELECT (p.role IN ('teacher','admin') OR p.is_admin)
    FROM public.profiles p WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
    SELECT
      c.id,
      c.name,
      c.access_code,
      c.magic_token,
      c.last_login,
      COUNT(ge.id) FILTER (WHERE ge.created_at >= NOW() - INTERVAL '7 days')
        AS games_this_week,
      COUNT(DISTINCT ge.created_at::DATE) FILTER (WHERE ge.created_at >= NOW() - INTERVAL '30 days')
        AS active_days_this_month,
      COUNT(ge.id)
        AS total_games,
      ROUND(
        COUNT(ge.id) FILTER (WHERE ge.success)::NUMERIC
        / NULLIF(COUNT(ge.id), 0) * 100, 1
      ) AS success_rate
    FROM public.children c
    LEFT JOIN public.game_events ge ON ge.child_token = c.magic_token
    -- teacher_id (לא parent_id!) — תלמידים שהצטרפו דרך /join
    WHERE c.teacher_id = auth.uid()
    GROUP BY c.id
    ORDER BY c.last_login DESC NULLS LAST, c.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_class_overview() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. תיקון max_children_allowed — COALESCE(0, 40) = 0 (באג!)
--    כל מורה/אדמין עם ערך 0 או 1 (ברירת מחדל הורה) → 40
-- ────────────────────────────────────────────────────────────
UPDATE public.profiles
SET max_children_allowed = 40
WHERE max_children_allowed <= 1
  AND (role IN ('teacher', 'admin') OR is_admin = true);

-- ============================================================
-- ✅ Migration 07 הושלם — join_classroom + overview + quota תוקנו.
-- ============================================================
