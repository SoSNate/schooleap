-- RPC שמחזיר teacher_leads לאדמין בלבד — עוקף RLS עם SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_teacher_leads()
RETURNS TABLE (
  id          UUID,
  full_name   TEXT,
  school      TEXT,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  handled     BOOLEAN,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- רק אדמין יכול לקרוא
  IF NOT public.is_admin_caller() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    tl.id, tl.full_name, tl.school, tl.phone,
    tl.email, tl.notes, tl.handled, tl.created_at
  FROM public.teacher_leads tl
  ORDER BY tl.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_leads() TO authenticated;
