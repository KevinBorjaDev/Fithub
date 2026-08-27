CREATE TABLE public.nutri_profile (
  id text PRIMARY KEY DEFAULT 'main',
  photo_path text,
  name text NOT NULL DEFAULT 'Lic. Diego Rivera',
  role_title text NOT NULL DEFAULT 'Nutricionista Deportivo',
  panel_title text NOT NULL DEFAULT 'Conoce a tu Nutri',
  cta_label text NOT NULL DEFAULT 'Conocer más sobre mi Nutri',
  who_title text NOT NULL DEFAULT '¿Quién soy?',
  who_body text,
  why_title text NOT NULL DEFAULT '¿Por qué Nutrición Deportiva?',
  why_body text,
  academic_title text NOT NULL DEFAULT 'Logros académicos',
  academic_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  professional_title text NOT NULL DEFAULT 'Logros profesionales',
  professional_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  athletes_title text NOT NULL DEFAULT 'Experiencia con deportistas y pacientes',
  athletes_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  personal_title text NOT NULL DEFAULT 'Logros personales',
  personal_body text,
  personal_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_title text NOT NULL DEFAULT 'Tu objetivo también es posible',
  message_body text,
  section_order jsonb NOT NULL DEFAULT '["who","why","academic","professional","athletes","personal","message"]'::jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nutri_profile TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nutri_profile TO authenticated;
GRANT ALL ON public.nutri_profile TO service_role;
ALTER TABLE public.nutri_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutri_profile_select_auth" ON public.nutri_profile
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "nutri_profile_insert_admin" ON public.nutri_profile
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nutri_profile_update_admin" ON public.nutri_profile
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nutri_profile_delete_admin" ON public.nutri_profile
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER nutri_profile_set_updated_at BEFORE UPDATE ON public.nutri_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.nutri_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  caption text,
  section text NOT NULL DEFAULT 'gallery',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nutri_photos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nutri_photos TO authenticated;
GRANT ALL ON public.nutri_photos TO service_role;
ALTER TABLE public.nutri_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutri_photos_select_auth" ON public.nutri_photos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "nutri_photos_insert_admin" ON public.nutri_photos
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nutri_photos_update_admin" ON public.nutri_photos
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nutri_photos_delete_admin" ON public.nutri_photos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER nutri_photos_set_updated_at BEFORE UPDATE ON public.nutri_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.nutri_profile (
  id, who_body, why_body, academic_items, professional_items, athletes_items, personal_body, personal_items, message_body
) VALUES (
  'main',
  'Soy Diego. Durante mi niñez fui un chico gordito y durante mi adolescencia fui bastante delgado. Desde siempre me gustaron los deportes y fue precisamente a través de ellos donde encontré una gran motivación para mejorar y aprender.

A lo largo de los años practiqué diferentes disciplinas: fútbol Sub-15, skate durante 4 años, calistenia durante 4 años y natación amateur durante 4 años. Actualmente entreno musculación y busco mejorar continuamente mi físico, rendimiento y funcionalidad.

Para mí, la alimentación siempre ha sido una parte fundamental del proceso. Por eso decidí estudiar nutrición: quería comprender cómo utilizar correctamente los alimentos, la suplementación y la planificación nutricional para mejorar el rendimiento y la composición corporal.',
  'La nutrición deportiva fue la especialidad que elegí porque siempre me interesó entender cómo podemos utilizar la alimentación para mejorar el rendimiento físico.

Me interesa especialmente la relación entre alimentación, rendimiento deportivo, composición corporal, recuperación, suplementación, salud y planificación nutricional.

Considero que la nutrición deportiva no es exclusiva de los atletas profesionales. También puede ayudar a cualquier persona que practique deporte y quiera mejorar su rendimiento, físico, salud y calidad de vida.',
  '[{"title":"Lic. Nutrición y Dietética — Pregrado","subtitle":"Universidad Peruana de Ciencias Aplicadas (UPC)"},{"title":"Especialista de Postgrado en Nutrición Deportiva","subtitle":"Universidad Norbert Wiener (UNW) — En curso"},{"title":"Especialización en Macrociclos y Modelos de Planificación","subtitle":""},{"title":"Antropometrista ISAK Internacional","subtitle":""},{"title":"Fisiología de la Mujer, Hipertrofia, Nutrición y Fútbol en Menores y Juveniles","subtitle":"ICEN"},{"title":"Especialización en Culturismo Natural","subtitle":""},{"title":"Diplomado Internacional en Nutrición Deportiva","subtitle":"COP"}]'::jsonb,
  '[{"title":"Docente universitario","subtitle":"Universidad Peruana de Ciencias Aplicadas (UPC)"},{"title":"GORE Callao","subtitle":"Equipo de promoción deportiva"},{"title":"Villa Deportiva del Callao","subtitle":"Experiencia profesional"},{"title":"Ponente nacional","subtitle":"Comité Olímpico Peruano"},{"title":"Coordinador regional — 2 años","subtitle":"Trabajo en el Estado con enfoque deportivo"},{"title":"SERUMS en provincia","subtitle":"Promoción deportiva con equipos de Liga 2 y Copa Perú"}]'::jsonb,
  '[{"title":"Boxeadores federados","subtitle":"Lograron ingresar a la Federación Peruana de Boxeo"},{"title":"Triple campeona nacional de powerlifting","subtitle":"Podio dos años consecutivos en competencias sudamericanas"},{"title":"Mejoras de composición corporal","subtitle":"En pacientes recreativos"},{"title":"Mejoras de rendimiento","subtitle":"Desempeño deportivo optimizado"},{"title":"Comunidad en crecimiento","subtitle":"Deportistas que mejoran su rendimiento con una correcta nutrición"}]'::jsonb,
  'Mi trabajo también comienza conmigo mismo. Creo que parte importante de ser nutricionista deportivo es aplicar en uno mismo los conocimientos que se transmiten a los pacientes, buscando siempre mejorar y aprender continuamente.',
  '["Mejorar mi composición corporal y mi físico","Mejorar mi salud digestiva","Aumentar mi fuerza y rendimiento","Mejorar mi salud y bienestar emocional","Mantener una relación más consciente y responsable con la alimentación y el entrenamiento"]'::jsonb,
  'No importa si estás empezando, si llevas años entrenando o si has intentado conseguir tus objetivos anteriormente. Cada persona tiene un punto de partida diferente.

Mi objetivo como tu nutricionista es acompañarte durante el proceso, ayudarte a entender tu alimentación, ajustar la estrategia de acuerdo con tu evolución y darte las herramientas necesarias para que puedas avanzar de manera progresiva.

Tú también puedes conseguir tus objetivos. Con disciplina, constancia, una estrategia adecuada y el seguimiento correcto, podemos trabajar para mejorar tu composición corporal, rendimiento y salud.

No busques hacerlo perfecto. Busca hacerlo mejor cada día.'
);