
CREATE TABLE public.module_labels (
  module_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_labels TO authenticated;
GRANT ALL ON public.module_labels TO service_role;

ALTER TABLE public.module_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read module labels"
  ON public.module_labels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert module labels"
  ON public.module_labels FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update module labels"
  ON public.module_labels FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete module labels"
  ON public.module_labels FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER module_labels_set_updated_at
  BEFORE UPDATE ON public.module_labels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
