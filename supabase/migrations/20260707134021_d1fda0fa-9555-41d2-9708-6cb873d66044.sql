
CREATE POLICY "Patient photos view own or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-photos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Patient photos upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Patient photos update own or admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'patient-photos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Patient photos delete own or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'patient-photos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);
