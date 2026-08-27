
-- Enum for day type
DO $$ BEGIN
  CREATE TYPE public.training_day_type AS ENUM ('push_day','pull_day','full_leg','full_torso','full_gluteo','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- training_plans
CREATE TABLE public.training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Mesociclo',
  objective text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  weeks_count int NOT NULL DEFAULT 4 CHECK (weeks_count BETWEEN 1 AND 10),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_plans TO authenticated;
GRANT ALL ON public.training_plans TO service_role;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans owner or admin select" ON public.training_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "plans admin insert" ON public.training_plans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "plans admin update" ON public.training_plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "plans admin delete" ON public.training_plans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_training_plans_updated BEFORE UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- training_days
CREATE TABLE public.training_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  week_number int NOT NULL CHECK (week_number BETWEEN 1 AND 10),
  day_number int NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  day_type public.training_day_type NOT NULL DEFAULT 'custom',
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, week_number, day_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_days TO authenticated;
GRANT ALL ON public.training_days TO service_role;
ALTER TABLE public.training_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "days select" ON public.training_days FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_plans p WHERE p.id = plan_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "days admin write" ON public.training_days FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_training_days_updated BEFORE UPDATE ON public.training_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- training_exercises
CREATE TABLE public.training_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES public.training_days(id) ON DELETE CASCADE,
  order_num int NOT NULL DEFAULT 1,
  muscle_group text,
  exercise_name text NOT NULL DEFAULT '',
  comment text,
  video_url text,
  programmed_sets int NOT NULL DEFAULT 3,
  programmed_reps text,
  warmup_sets int NOT NULL DEFAULT 0,
  rest_seconds int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_exercises TO authenticated;
GRANT ALL ON public.training_exercises TO service_role;
ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ex select" ON public.training_exercises FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.training_days d
    JOIN public.training_plans p ON p.id = d.plan_id
    WHERE d.id = day_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));
CREATE POLICY "ex admin write" ON public.training_exercises FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_training_ex_updated BEFORE UPDATE ON public.training_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- training_sets
CREATE TABLE public.training_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.training_exercises(id) ON DELETE CASCADE,
  set_number int NOT NULL CHECK (set_number BETWEEN 1 AND 10),
  weight numeric,
  reps int,
  rir int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(exercise_id, set_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sets TO authenticated;
GRANT ALL ON public.training_sets TO service_role;
ALTER TABLE public.training_sets ENABLE ROW LEVEL SECURITY;

-- SELECT: patient owner or admin
CREATE POLICY "sets select" ON public.training_sets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.training_exercises e
    JOIN public.training_days d ON d.id = e.day_id
    JOIN public.training_plans p ON p.id = d.plan_id
    WHERE e.id = exercise_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));

-- INSERT/DELETE: admin only
CREATE POLICY "sets admin insert" ON public.training_sets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sets admin delete" ON public.training_sets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- UPDATE: admin OR the owning patient (patient can update only weight/reps enforced by trigger)
CREATE POLICY "sets update" ON public.training_sets FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR EXISTS (
      SELECT 1 FROM public.training_exercises e
      JOIN public.training_days d ON d.id = e.day_id
      JOIN public.training_plans p ON p.id = d.plan_id
      WHERE e.id = exercise_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR EXISTS (
      SELECT 1 FROM public.training_exercises e
      JOIN public.training_days d ON d.id = e.day_id
      JOIN public.training_plans p ON p.id = d.plan_id
      WHERE e.id = exercise_id AND p.user_id = auth.uid()
    )
  );

-- Trigger to prevent patient from changing rir / set_number / exercise_id
CREATE OR REPLACE FUNCTION public.protect_training_set_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;
CREATE TRIGGER trg_training_sets_protect BEFORE UPDATE ON public.training_sets
  FOR EACH ROW EXECUTE FUNCTION public.protect_training_set_fields();

CREATE INDEX idx_training_days_plan ON public.training_days(plan_id);
CREATE INDEX idx_training_ex_day ON public.training_exercises(day_id);
CREATE INDEX idx_training_sets_ex ON public.training_sets(exercise_id);
