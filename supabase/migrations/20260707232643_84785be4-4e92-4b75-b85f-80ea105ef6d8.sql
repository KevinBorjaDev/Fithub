-- Add active status and next consultation to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS next_consultation_date timestamptz;

-- Auto-set program_end_date = program_start_date + 30 days when start changes and end is null or matches old +30
CREATE OR REPLACE FUNCTION public.auto_program_end_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.program_start_date IS NOT NULL THEN
    IF NEW.program_end_date IS NULL
       OR (TG_OP = 'UPDATE' AND OLD.program_start_date IS DISTINCT FROM NEW.program_start_date
           AND (OLD.program_end_date IS NULL OR NEW.program_end_date = OLD.program_end_date)) THEN
      NEW.program_end_date := NEW.program_start_date + INTERVAL '30 days';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_program_end_date ON public.profiles;
CREATE TRIGGER trg_auto_program_end_date
BEFORE INSERT OR UPDATE OF program_start_date ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_program_end_date();

-- Allow admins to update any profile (needed for is_active toggle and dates)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));