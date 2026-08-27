CREATE OR REPLACE FUNCTION public.protect_program_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.program_start_date IS DISTINCT FROM OLD.program_start_date
      OR NEW.program_end_date IS DISTINCT FROM OLD.program_end_date)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Solo un administrador puede modificar las fechas del programa';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_program_dates_trg ON public.profiles;
CREATE TRIGGER protect_program_dates_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_program_dates();