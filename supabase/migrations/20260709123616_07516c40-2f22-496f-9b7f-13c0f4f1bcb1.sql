
-- Restrict EXECUTE on SECURITY DEFINER trigger functions (only triggers need to invoke them)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_training_exercise_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_training_set_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_program_dates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_nutritionist_comment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_document_nutritionist_comment() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies; keep it callable by authenticated only, revoke from anon
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- user_roles: add admin-only INSERT/UPDATE/DELETE policies so role management has a controlled path
CREATE POLICY "Admins can insert user roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
