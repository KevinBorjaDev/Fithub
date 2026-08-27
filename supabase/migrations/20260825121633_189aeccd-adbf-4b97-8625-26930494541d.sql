-- Harden base table privileges: no unauthenticated external role can access internal data tables.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Keep authenticated access available only through Row Level Security policies.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anthropometric_measurements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurement_references TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_labels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_surveys TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_reference TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_video_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_session_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Preserve trusted backend maintenance access.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure Row Level Security stays enabled on every app table.
ALTER TABLE public.anthropometric_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Patients may edit normal profile data, but administrative fields remain admin-only.
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.email IS DISTINCT FROM OLD.email
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.program_start_date IS DISTINCT FROM OLD.program_start_date
       OR NEW.program_end_date IS DISTINCT FROM OLD.program_end_date
       OR NEW.next_consultation_date IS DISTINCT FROM OLD.next_consultation_date THEN
      RAISE EXCEPTION 'Solo el administrador puede modificar campos administrativos del perfil';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_profile_admin_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_admin_fields() FROM anon;
GRANT EXECUTE ON FUNCTION public.protect_profile_admin_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profile_admin_fields() TO service_role;

DROP TRIGGER IF EXISTS protect_profile_admin_fields_trg ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_admin_fields();

-- Explicitly prevent anonymous reads from storage objects as a second barrier.
REVOKE ALL PRIVILEGES ON storage.objects FROM anon;

-- Performance indexes for secure owner-scoped reads and training reports.
CREATE INDEX IF NOT EXISTS idx_anthro_user_date ON public.anthropometric_measurements(user_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_date ON public.documents(user_id, document_date DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_surveys_user_created ON public.monthly_surveys(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_created ON public.nutrition_plans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_user_date ON public.photo_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_photos_user_session ON public.photos(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_user_start ON public.training_plans(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_days_plan_week_day ON public.training_days(plan_id, week_number, day_number);
CREATE INDEX IF NOT EXISTS idx_training_exercises_day_order ON public.training_exercises(day_id, order_num);
CREATE INDEX IF NOT EXISTS idx_training_sets_exercise_set ON public.training_sets(exercise_id, set_number);
CREATE INDEX IF NOT EXISTS idx_training_history_user_plan_week_day ON public.training_session_history(user_id, plan_id, week_number, day_number);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);