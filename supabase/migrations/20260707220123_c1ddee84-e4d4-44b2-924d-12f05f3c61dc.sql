
CREATE TABLE public.monthly_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX monthly_surveys_user_id_idx ON public.monthly_surveys(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_surveys TO authenticated;
GRANT ALL ON public.monthly_surveys TO service_role;

ALTER TABLE public.monthly_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own surveys"
  ON public.monthly_surveys
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all surveys"
  ON public.monthly_surveys
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER monthly_surveys_updated_at
  BEFORE UPDATE ON public.monthly_surveys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
