
CREATE TYPE public.photo_angle AS ENUM ('frontal', 'posterior', 'perfil_izquierdo', 'perfil_derecho');

CREATE TABLE public.photo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Lima')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_sessions TO authenticated;
GRANT ALL ON public.photo_sessions TO service_role;
ALTER TABLE public.photo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own sessions" ON public.photo_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients create own sessions" ON public.photo_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients delete own sessions" ON public.photo_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.photo_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  angle public.photo_angle NOT NULL,
  storage_path text NOT NULL,
  patient_comment text,
  nutritionist_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, angle)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own photos or admin" ON public.photos
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients insert own photos" ON public.photos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own photos or admin" ON public.photos
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Delete own photos or admin" ON public.photos
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.protect_nutritionist_comment()
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

REVOKE ALL ON FUNCTION public.protect_nutritionist_comment() FROM PUBLIC;

CREATE TRIGGER protect_photos_nutri_comment
BEFORE UPDATE ON public.photos
FOR EACH ROW EXECUTE FUNCTION public.protect_nutritionist_comment();
