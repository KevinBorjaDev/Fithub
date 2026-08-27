
DROP POLICY IF EXISTS "sets admin insert" ON public.training_sets;
CREATE POLICY "sets insert own or admin" ON public.training_sets
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.training_exercises e
      JOIN public.training_days d ON d.id = e.day_id
      JOIN public.training_plans p ON p.id = d.plan_id
      WHERE e.id = training_sets.exercise_id
        AND p.user_id = auth.uid()
    )
  );
