
-- =========================
-- Program resources (Guías + Materiales educativos)
-- =========================
CREATE TABLE public.program_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('guias','materiales_educativos')),
  title TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  resource_type TEXT NOT NULL DEFAULT 'file' CHECK (resource_type IN ('file','image','video','pdf')),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_resources TO authenticated;
GRANT ALL ON public.program_resources TO service_role;

ALTER TABLE public.program_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view program resources"
  ON public.program_resources FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can insert program resources"
  ON public.program_resources FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update program resources"
  ON public.program_resources FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete program resources"
  ON public.program_resources FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER program_resources_updated_at
  BEFORE UPDATE ON public.program_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Social video categories
-- =========================
CREATE TABLE public.social_video_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_video_categories TO authenticated;
GRANT ALL ON public.social_video_categories TO service_role;

ALTER TABLE public.social_video_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view social categories"
  ON public.social_video_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert social categories"
  ON public.social_video_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update social categories"
  ON public.social_video_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete social categories"
  ON public.social_video_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER social_video_categories_updated_at
  BEFORE UPDATE ON public.social_video_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Social videos
-- =========================
CREATE TABLE public.social_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.social_video_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok','instagram','youtube','other')),
  url TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_videos TO authenticated;
GRANT ALL ON public.social_videos TO service_role;

ALTER TABLE public.social_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view social videos"
  ON public.social_videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert social videos"
  ON public.social_videos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update social videos"
  ON public.social_videos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete social videos"
  ON public.social_videos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER social_videos_updated_at
  BEFORE UPDATE ON public.social_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Storage RLS for program-resources bucket
-- =========================
CREATE POLICY "Authenticated can view program-resources"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'program-resources');

CREATE POLICY "Admin can upload program-resources"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'program-resources' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update program-resources"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'program-resources' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete program-resources"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'program-resources' AND public.has_role(auth.uid(), 'admin'));
