-- Create classrooms table
CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_code TEXT NOT NULL UNIQUE,
  classroom_name TEXT NOT NULL DEFAULT 'כיתה',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS classrooms_teacher_idx ON public.classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS classrooms_code_idx ON public.classrooms(classroom_code);

-- RPC: Create classroom
CREATE OR REPLACE FUNCTION create_teacher_classroom(
  p_teacher_id UUID,
  p_classroom_code TEXT,
  p_classroom_name TEXT DEFAULT 'כיתה'
)
RETURNS TABLE(id UUID, classroom_code TEXT, classroom_name TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.classrooms (teacher_id, classroom_code, classroom_name)
  VALUES (p_teacher_id, p_classroom_code, p_classroom_name)
  RETURNING classrooms.id, classrooms.classroom_code, classrooms.classroom_name, classrooms.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Get teacher's classrooms
CREATE OR REPLACE FUNCTION get_teacher_classrooms(p_teacher_id UUID)
RETURNS TABLE(id UUID, classroom_code TEXT, classroom_name TEXT, student_count INT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.classroom_code,
    c.classroom_name,
    COUNT(p.id)::INT as student_count,
    c.created_at
  FROM public.classrooms c
  LEFT JOIN public.profiles p ON p.classroom_code = c.classroom_code
  WHERE c.teacher_id = p_teacher_id
  GROUP BY c.id, c.classroom_code, c.classroom_name, c.created_at
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Update classroom name
CREATE OR REPLACE FUNCTION update_classroom_name(
  p_classroom_id UUID,
  p_teacher_id UUID,
  p_new_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.classrooms
  SET classroom_name = p_new_name, updated_at = NOW()
  WHERE id = p_classroom_id AND teacher_id = p_teacher_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Delete classroom (only if no students)
CREATE OR REPLACE FUNCTION delete_classroom(
  p_classroom_id UUID,
  p_teacher_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_student_count INT;
  v_code TEXT;
BEGIN
  SELECT classroom_code INTO v_code FROM public.classrooms
  WHERE id = p_classroom_id AND teacher_id = p_teacher_id;

  IF v_code IS NULL THEN RETURN FALSE; END IF;

  SELECT COUNT(*) INTO v_student_count FROM public.profiles
  WHERE classroom_code = v_code;

  IF v_student_count > 0 THEN RETURN FALSE; END IF;

  DELETE FROM public.classrooms WHERE id = p_classroom_id AND teacher_id = p_teacher_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
