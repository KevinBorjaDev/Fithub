
CREATE TABLE public.photo_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  title text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_reference TO authenticated;
GRANT ALL ON public.photo_reference TO service_role;

ALTER TABLE public.photo_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view photo reference"
  ON public.photo_reference FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert photo reference"
  ON public.photo_reference FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update photo reference"
  ON public.photo_reference FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete photo reference"
  ON public.photo_reference FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER photo_reference_set_updated_at
  BEFORE UPDATE ON public.photo_reference
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read photo-reference"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photo-reference');
CREATE POLICY "Admins upload photo-reference"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photo-reference' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update photo-reference"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photo-reference' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete photo-reference"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photo-reference' AND public.has_role(auth.uid(), 'admin'));
