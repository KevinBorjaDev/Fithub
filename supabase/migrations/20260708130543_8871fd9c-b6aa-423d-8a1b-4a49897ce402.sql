
-- Add patient_comment to exercises
ALTER TABLE public.training_exercises ADD COLUMN IF NOT EXISTS patient_comment text;

-- Change rir to text so it accepts numbers, "F" and "P"
ALTER TABLE public.training_sets ALTER COLUMN rir TYPE text USING rir::text;

-- Protect trigger update for text rir
CREATE OR REPLACE FUNCTION public.protect_training_set_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    IF NEW.rir IS DISTINCT FROM OLD.rir
       OR NEW.set_number IS DISTINCT FROM OLD.set_number
       OR NEW.exercise_id IS DISTINCT FROM OLD.exercise_id THEN
      RAISE EXCEPTION 'Solo el administrador puede modificar RIR o la estructura de la serie';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- Trigger to protect training_exercises fields when non-admin updates
CREATE OR REPLACE FUNCTION public.protect_training_exercise_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    IF NEW.order_num IS DISTINCT FROM OLD.order_num
       OR NEW.muscle_group IS DISTINCT FROM OLD.muscle_group
       OR NEW.exercise_name IS DISTINCT FROM OLD.exercise_name
       OR NEW.comment IS DISTINCT FROM OLD.comment
       OR NEW.video_url IS DISTINCT FROM OLD.video_url
       OR NEW.programmed_sets IS DISTINCT FROM OLD.programmed_sets
       OR NEW.programmed_reps IS DISTINCT FROM OLD.programmed_reps
       OR NEW.warmup_sets IS DISTINCT FROM OLD.warmup_sets
       OR NEW.rest_seconds IS DISTINCT FROM OLD.rest_seconds
       OR NEW.day_id IS DISTINCT FROM OLD.day_id THEN
      RAISE EXCEPTION 'Solo el administrador puede modificar la estructura del ejercicio';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_ex_protect ON public.training_exercises;
CREATE TRIGGER trg_training_ex_protect BEFORE UPDATE ON public.training_exercises
FOR EACH ROW EXECUTE FUNCTION public.protect_training_exercise_fields();

-- Add UPDATE policy so patients can update their own exercise's patient_comment
DROP POLICY IF EXISTS "ex patient update comment" ON public.training_exercises;
CREATE POLICY "ex patient update comment" ON public.training_exercises FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.training_days d
    JOIN public.training_plans p ON p.id = d.plan_id
    WHERE d.id = training_exercises.day_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_days d
    JOIN public.training_plans p ON p.id = d.plan_id
    WHERE d.id = training_exercises.day_id AND p.user_id = auth.uid()
  )
);
