-- Crea los buckets de Storage que las policies existentes ya asumen.
--
-- Estos buckets se habían creado a mano desde la UI, por lo que no viajaban
-- con las migraciones: un proyecto reconstruido desde cero quedaba con todas
-- las tablas y policies pero sin buckets, y cualquier subida fallaba.
--
-- Todos son privados (public = false): el acceso se resuelve con signed URLs
-- desde el cliente y con las policies sobre storage.objects. No cambiar a
-- public sin revisar eso: aquí viven fotos de pacientes y exámenes médicos.

-- Imágenes: fotos de progreso, referencias y avatares.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('patient-photos',         'patient-photos',         false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']),
  ('photo-reference',        'photo-reference',        false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('measurement-references', 'measurement-references', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('nutri-profile',          'nutri-profile',          false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars',                'avatars',                false,  5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Documentos: exámenes de laboratorio, planes y material del programa.
-- Aceptan imágenes además de PDF/Office porque los estudios suelen subirse
-- como foto o escaneo.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('patient-documents', 'patient-documents', false, 26214400, ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']),
  ('nutrition-plans',   'nutrition-plans',   false, 26214400, ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg','image/png','image/webp']),
  ('program-resources', 'program-resources', false, 52428800, ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;
