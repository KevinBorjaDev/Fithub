
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.nutrition_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_plans TO authenticated;
GRANT ALL ON public.nutrition_plans TO service_role;

ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient or admin can view plans"
  ON public.nutrition_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert plans"
  ON public.nutrition_plans FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update plans"
  ON public.nutrition_plans FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete plans"
  ON public.nutrition_plans FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_nutrition_plans_updated_at
  BEFORE UPDATE ON public.nutrition_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX nutrition_plans_user_id_idx ON public.nutrition_plans(user_id);

CREATE POLICY "Nutrition plan file readable by owner or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'nutrition-plans'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Admin can upload nutrition plan file"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'nutrition-plans'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin can update nutrition plan file"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'nutrition-plans' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'nutrition-plans' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete nutrition plan file"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'nutrition-plans' AND public.has_role(auth.uid(), 'admin'));
