
-- Extend allowed categories and resource types
ALTER TABLE public.program_resources DROP CONSTRAINT IF EXISTS program_resources_category_check;
ALTER TABLE public.program_resources ADD CONSTRAINT program_resources_category_check
  CHECK (category = ANY (ARRAY['guias','materiales_educativos','articulos_cientificos']));

ALTER TABLE public.program_resources DROP CONSTRAINT IF EXISTS program_resources_resource_type_check;
ALTER TABLE public.program_resources ADD CONSTRAINT program_resources_resource_type_check
  CHECK (resource_type = ANY (ARRAY['file','image','video','pdf','link']));

-- Allow link-only resources (no file)
ALTER TABLE public.program_resources ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE public.program_resources ALTER COLUMN original_filename DROP NOT NULL;
ALTER TABLE public.program_resources ADD COLUMN IF NOT EXISTS external_url text;

-- Sub-categories inside "Materiales educativos"
CREATE TABLE IF NOT EXISTS public.material_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_categories TO authenticated;
GRANT ALL ON public.material_categories TO service_role;

ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view material categories"
  ON public.material_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert material categories"
  ON public.material_categories FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can update material categories"
  ON public.material_categories FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can delete material categories"
  ON public.material_categories FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER material_categories_set_updated_at
  BEFORE UPDATE ON public.material_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link resources to a material sub-category (optional)
ALTER TABLE public.program_resources
  ADD COLUMN IF NOT EXISTS material_category_id uuid REFERENCES public.material_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS program_resources_material_category_idx
  ON public.program_resources(material_category_id);
