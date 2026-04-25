-- ============================================================================
-- Teacher Modes System: Support for both Private and Institutional teaching
-- ============================================================================

-- Add teacher_modes column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS teacher_modes TEXT[] DEFAULT ARRAY['private']::TEXT[],
ADD COLUMN IF NOT EXISTS primary_teacher_mode TEXT DEFAULT 'private',
ADD COLUMN IF NOT EXISTS teacher_mode_status JSONB DEFAULT '{
  "private": {"enabled": true, "approved_at": null, "required_payment": false},
  "institutional": {"enabled": false, "approved_at": null, "required_payment": false}
}'::JSONB;

-- Table to track mode change requests
CREATE TABLE IF NOT EXISTS public.teacher_mode_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_mode TEXT NOT NULL CHECK (requested_mode IN ('private', 'institutional')),
  from_mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  UNIQUE(teacher_id, requested_mode, status)
);

CREATE INDEX IF NOT EXISTS teacher_mode_requests_teacher_idx
  ON public.teacher_mode_requests(teacher_id);
CREATE INDEX IF NOT EXISTS teacher_mode_requests_status_idx
  ON public.teacher_mode_requests(status);

-- Table for institutional mode enrollment (payment tracking)
CREATE TABLE IF NOT EXISTS public.teacher_institutional_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  organization_id TEXT UNIQUE,
  enrollment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'cancelled')),
  payment_date TIMESTAMPTZ,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teacher_institutional_enrollment_teacher_idx
  ON public.teacher_institutional_enrollment(teacher_id);

-- RPC: Get teacher's mode status
CREATE OR REPLACE FUNCTION get_teacher_mode_status(p_teacher_id UUID)
RETURNS TABLE(
  teacher_modes TEXT[],
  primary_mode TEXT,
  mode_status JSONB,
  pending_requests INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.teacher_modes,
    p.primary_teacher_mode,
    p.teacher_mode_status,
    COUNT(tmr.id)::INT
  FROM public.profiles p
  LEFT JOIN public.teacher_mode_requests tmr
    ON tmr.teacher_id = p.id AND tmr.status = 'pending'
  WHERE p.id = p_teacher_id
  GROUP BY p.id, p.teacher_modes, p.primary_teacher_mode, p.teacher_mode_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Request mode change
CREATE OR REPLACE FUNCTION request_teacher_mode_change(
  p_teacher_id UUID,
  p_requested_mode TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_modes TEXT[];
  v_from_mode TEXT;
BEGIN
  -- Get current modes
  SELECT teacher_modes, primary_teacher_mode
  INTO v_current_modes, v_from_mode
  FROM public.profiles
  WHERE id = p_teacher_id;

  IF v_current_modes IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Can't request same mode
  IF v_from_mode = p_requested_mode THEN
    RETURN FALSE;
  END IF;

  -- Insert request
  INSERT INTO public.teacher_mode_requests (
    teacher_id,
    requested_mode,
    from_mode,
    reason
  ) VALUES (
    p_teacher_id,
    p_requested_mode,
    v_from_mode,
    p_reason
  )
  ON CONFLICT (teacher_id, requested_mode, status) DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Enable institutional mode (admin only)
CREATE OR REPLACE FUNCTION approve_teacher_institutional_mode(
  p_teacher_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check admin status
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RETURN FALSE;
  END IF;

  -- Update modes
  UPDATE public.profiles
  SET
    teacher_modes = array_append(teacher_modes, 'institutional'),
    teacher_mode_status = jsonb_set(
      teacher_mode_status,
      '{institutional,enabled}',
      'true'::jsonb
    ) || jsonb_set(
      COALESCE(teacher_mode_status, '{}'::jsonb),
      '{institutional,approved_at}',
      to_jsonb(NOW())
    )
  WHERE id = p_teacher_id
    AND NOT (teacher_modes @> ARRAY['institutional'::TEXT]);

  -- Mark request as approved
  UPDATE public.teacher_mode_requests
  SET
    status = 'approved',
    approved_at = NOW(),
    approved_by = p_admin_id
  WHERE teacher_id = p_teacher_id
    AND requested_mode = 'institutional'
    AND status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Set primary teaching mode (teacher can switch between their enabled modes)
CREATE OR REPLACE FUNCTION set_teacher_primary_mode(
  p_teacher_id UUID,
  p_mode TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_modes TEXT[];
BEGIN
  -- Verify mode is in teacher's enabled modes
  SELECT teacher_modes INTO v_modes
  FROM public.profiles
  WHERE id = p_teacher_id;

  IF NOT (v_modes @> ARRAY[p_mode]::TEXT[]) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET primary_teacher_mode = p_mode
  WHERE id = p_teacher_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Get all students (private mode) vs classrooms (institutional mode)
CREATE OR REPLACE FUNCTION get_teacher_dashboard_data(
  p_teacher_id UUID,
  p_mode TEXT DEFAULT 'private'
)
RETURNS TABLE(
  mode TEXT,
  item_id UUID,
  item_name TEXT,
  student_count INT,
  total_hours_played INT,
  avg_level NUMERIC,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  IF p_mode = 'institutional' THEN
    -- Return classrooms with stats
    RETURN QUERY
    SELECT
      'institutional'::TEXT as mode,
      c.id::UUID,
      c.classroom_name::TEXT,
      COUNT(DISTINCT p.id)::INT as student_count,
      COALESCE(SUM(EXTRACT(EPOCH FROM (ge.created_at))::INT) / 3600, 0)::INT as total_hours,
      COALESCE(AVG(ge.level)::NUMERIC, 0)::NUMERIC as avg_level,
      MAX(ge.created_at)::TIMESTAMPTZ as last_activity
    FROM public.classrooms c
    LEFT JOIN public.profiles p ON p.classroom_code = c.classroom_code
    LEFT JOIN public.game_events ge ON ge.child_token = p.magic_token
    WHERE c.teacher_id = p_teacher_id
    GROUP BY c.id, c.classroom_name
    ORDER BY c.created_at DESC;
  ELSE
    -- Return all students linked to this teacher (private mode)
    RETURN QUERY
    SELECT
      'private'::TEXT as mode,
      p.id::UUID,
      p.full_name::TEXT,
      1::INT as student_count,
      COALESCE(SUM(EXTRACT(EPOCH FROM (ge.created_at))::INT) / 3600, 0)::INT as total_hours,
      COALESCE(AVG(ge.level)::NUMERIC, 0)::NUMERIC as avg_level,
      MAX(ge.created_at)::TIMESTAMPTZ as last_activity
    FROM public.profiles p
    LEFT JOIN public.game_events ge ON ge.child_token = p.magic_token
    WHERE p.teacher_id = p_teacher_id AND p.role = 'child'
    GROUP BY p.id, p.full_name
    ORDER BY MAX(ge.created_at) DESC NULLS LAST;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
