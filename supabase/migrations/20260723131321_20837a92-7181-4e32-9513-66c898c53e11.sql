
-- Track patient progression through weeks
ALTER TABLE public.training_plans
  ADD COLUMN IF NOT EXISTS current_week INTEGER NOT NULL DEFAULT 1;

-- Session history: snapshot of a completed training day
CREATE TABLE IF NOT EXISTS public.training_session_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  day_id UUID REFERENCES public.training_days(id) ON DELETE SET NULL,
  week_number INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  day_type TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_load NUMERIC NOT NULL DEFAULT 0,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tsh_plan ON public.training_session_history(plan_id, week_number, day_number);
CREATE INDEX IF NOT EXISTS idx_tsh_user ON public.training_session_history(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_session_history TO authenticated;
GRANT ALL ON public.training_session_history TO service_role;

ALTER TABLE public.training_session_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own session history"
  ON public.training_session_history FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients insert own session history"
  ON public.training_session_history FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients delete own session history"
  ON public.training_session_history FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin updates session history"
  ON public.training_session_history FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
