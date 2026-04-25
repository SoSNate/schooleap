-- ============================================================================
-- Step 1: Add tutor_trial_started_at column + trigger
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutor_trial_started_at TIMESTAMPTZ;

-- Backfill existing teachers
UPDATE public.profiles
SET tutor_trial_started_at = created_at
WHERE role = 'teacher'
  AND tutor_trial_started_at IS NULL;

-- Trigger: auto-set for new teachers on INSERT
CREATE OR REPLACE FUNCTION set_tutor_trial_on_new_teacher()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'teacher' AND NEW.tutor_trial_started_at IS NULL THEN
    NEW.tutor_trial_started_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tutor_trial_trigger ON public.profiles;
CREATE TRIGGER set_tutor_trial_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION set_tutor_trial_on_new_teacher();
