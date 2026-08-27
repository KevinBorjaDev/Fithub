REVOKE ALL ON FUNCTION public.protect_profile_admin_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_admin_fields() FROM anon;
REVOKE ALL ON FUNCTION public.protect_profile_admin_fields() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profile_admin_fields() TO service_role;