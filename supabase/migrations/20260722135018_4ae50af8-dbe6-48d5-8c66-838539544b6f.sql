
CREATE TABLE public.measurement_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.measurement_references TO authenticated;
GRANT ALL ON public.measurement_references TO service_role;

ALTER TABLE public.measurement_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read measurement references"
  ON public.measurement_references FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins can insert measurement references"
  ON public.measurement_references FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update measurement references"
  ON public.measurement_references FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete measurement references"
  ON public.measurement_references FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_measurement_references_updated
  BEFORE UPDATE ON public.measurement_references
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage RLS on the measurement-references bucket
CREATE POLICY "authenticated can view measurement reference files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'measurement-references');

CREATE POLICY "admins can upload measurement reference files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'measurement-references' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update measurement reference files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'measurement-references' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'measurement-references' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete measurement reference files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'measurement-references' AND public.has_role(auth.uid(), 'admin'));
