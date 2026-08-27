
REVOKE EXECUTE ON FUNCTION public.notify_nutrition_plan()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_training_plan()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_document()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_library_resource() FROM PUBLIC, anon, authenticated;
