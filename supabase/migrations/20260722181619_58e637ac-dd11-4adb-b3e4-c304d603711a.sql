
-- Extensions for cron reminders
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1) Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx  ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- No INSERT policy: only triggers (SECURITY DEFINER) and service_role may insert.

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2) Trigger: nutrition plan created/updated
CREATE OR REPLACE FUNCTION public.notify_nutrition_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    NEW.user_id,
    'nutrition_plan',
    CASE WHEN TG_OP = 'INSERT' THEN 'Nuevo plan nutricional' ELSE 'Plan nutricional actualizado' END,
    'Tu nutricionista ' || CASE WHEN TG_OP = 'INSERT' THEN 'subió' ELSE 'actualizó' END || ' tu plan. Revísalo ahora.',
    '/plan'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_nutrition_plan
AFTER INSERT OR UPDATE OF storage_path ON public.nutrition_plans
FOR EACH ROW EXECUTE FUNCTION public.notify_nutrition_plan();

-- 3) Trigger: training plan created/updated
CREATE OR REPLACE FUNCTION public.notify_training_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    NEW.user_id,
    'training_plan',
    CASE WHEN TG_OP = 'INSERT' THEN 'Nuevo plan de entrenamiento' ELSE 'Plan de entrenamiento actualizado' END,
    'Revisa tu rutina actualizada.',
    '/training'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_training_plan
AFTER INSERT OR UPDATE OF title, objective, start_date, weeks_count ON public.training_plans
FOR EACH ROW EXECUTE FUNCTION public.notify_training_plan();

-- 4) Trigger: new document in patient folder
CREATE OR REPLACE FUNCTION public.notify_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id = auth.uid() THEN
    -- Patient uploaded their own document; don't notify themselves.
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    NEW.user_id,
    'document',
    'Nuevo documento en tu carpeta',
    COALESCE(NEW.original_filename, 'Tu nutricionista agregó un documento.'),
    '/documents'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_document
AFTER INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.notify_document();

-- 5) Trigger: new library resource → notify all active patients
CREATE OR REPLACE FUNCTION public.notify_library_resource()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link)
  SELECT p.id, 'library',
         'Nuevo recurso en la Biblioteca',
         COALESCE(NEW.title, 'Se agregó un nuevo recurso al programa.'),
         '/program'
  FROM public.profiles p
  WHERE COALESCE(p.is_active, true) = true
    AND public.has_role(p.id, 'patient'::app_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_library_resource
AFTER INSERT ON public.program_resources
FOR EACH ROW EXECUTE FUNCTION public.notify_library_resource();

-- 6) Daily reminders via pg_cron (Peru = UTC-5)
-- Remove any previous schedules with same names (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('daily-reminder-morning','daily-reminder-afternoon');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 07:00 Perú = 12:00 UTC
SELECT cron.schedule(
  'daily-reminder-morning',
  '0 12 * * *',
  $CRON$
  INSERT INTO public.notifications(user_id, type, title, body, link)
  SELECT p.id, 'reminder',
         '☀️ Buenos días — revisa tu plan',
         'Es momento de revisar tu plan nutricional y de entrenamiento de hoy.',
         '/dashboard'
  FROM public.profiles p
  WHERE COALESCE(p.is_active, true) = true
    AND public.has_role(p.id, 'patient'::app_role);
  $CRON$
);

-- 16:00 Perú = 21:00 UTC
SELECT cron.schedule(
  'daily-reminder-afternoon',
  '0 21 * * *',
  $CRON$
  INSERT INTO public.notifications(user_id, type, title, body, link)
  SELECT p.id, 'reminder',
         '💪 Recordatorio de la tarde',
         '¿Ya cumpliste con tu plan de hoy? Revisa tu progreso.',
         '/dashboard'
  FROM public.profiles p
  WHERE COALESCE(p.is_active, true) = true
    AND public.has_role(p.id, 'patient'::app_role);
  $CRON$
);
