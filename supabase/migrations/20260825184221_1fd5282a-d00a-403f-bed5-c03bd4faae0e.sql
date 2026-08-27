CREATE POLICY "nutri_profile_files_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'nutri-profile');
CREATE POLICY "nutri_profile_files_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nutri-profile' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nutri_profile_files_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'nutri-profile' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nutri_profile_files_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'nutri-profile' AND public.has_role(auth.uid(), 'admin'));