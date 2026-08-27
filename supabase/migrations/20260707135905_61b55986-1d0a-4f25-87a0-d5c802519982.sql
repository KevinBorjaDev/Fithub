
-- Enum for document categories
CREATE TYPE public.document_category AS ENUM (
  'examenes_laboratorio',
  'examen_bioimpedancia',
  'ficha_nutricional',
  'tratamiento_medico_actual'
);

-- Documents table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.document_category NOT NULL,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  document_date date NOT NULL DEFAULT CURRENT_DATE,
  patient_comment text,
  nutritionist_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Patients see own + admin sees all
CREATE POLICY "documents_select" ON public.documents
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Patients insert own + admin any
CREATE POLICY "documents_insert" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Update rule + trigger to protect nutritionist_comment (only admin can change it)
CREATE POLICY "documents_update" ON public.documents
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "documents_delete" ON public.documents
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Trigger: enforce that only admin can modify nutritionist_comment
CREATE OR REPLACE FUNCTION public.protect_document_nutritionist_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nutritionist_comment IS DISTINCT FROM OLD.nutritionist_comment
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin can modify nutritionist comment';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_document_nutri_comment
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.protect_document_nutritionist_comment();

CREATE INDEX documents_user_category_idx ON public.documents(user_id, category, document_date DESC);

-- Storage policies for patient-documents bucket
CREATE POLICY "patient_docs_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "patient_docs_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "patient_docs_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'patient-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "patient_docs_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'patient-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);
