-- Crea el enum sex_type y la tabla anthropometric_measurements.
--
-- Ninguno de los dos existía en las migraciones: se crearon a mano desde la UI de
-- Lovable, igual que los buckets de Storage. Una migración posterior
-- (20260825121633) hace GRANT y ENABLE ROW LEVEL SECURITY sobre esta tabla, así que
-- un proyecto reconstruido desde cero fallaba ahí con
-- 'relation "public.anthropometric_measurements" does not exist'.
--
-- El esquema se reconstruyó a partir de los tipos generados en
-- src/integrations/supabase/types.ts, que reflejan la tabla que estaba en producción.
--
-- Se omite deliberadamente la columna s_supraileac, que existía en la tabla original
-- junto a s_suprailiac: era un typo corregido agregando la columna nueva sin borrar
-- la vieja. Ningún punto del código la lee (todo usa s_suprailiac), así que no se
-- recrea aquí.

CREATE TYPE public.sex_type AS ENUM ('hombre', 'mujer');

CREATE TABLE public.anthropometric_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Datos generales
  age integer,
  sex public.sex_type,
  height_cm numeric,
  weight_kg numeric,

  -- Perímetros (cm)
  p_shoulders numeric,
  p_chest numeric,
  p_arm_relaxed numeric,
  p_arm_contracted numeric,
  p_waist numeric,
  p_abdominal numeric,
  p_hip numeric,
  p_thigh numeric,
  p_calves numeric,

  -- Pliegues cutáneos (mm)
  s_triceps numeric,
  s_biceps numeric,
  s_subscapular numeric,
  s_suprailiac numeric,
  s_supraspinal numeric,
  s_abdominal numeric,
  s_pectoral numeric,
  s_axillary numeric,
  s_quadriceps numeric,
  s_calves numeric,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anthropometric_measurements TO authenticated;
GRANT ALL ON public.anthropometric_measurements TO service_role;

ALTER TABLE public.anthropometric_measurements ENABLE ROW LEVEL SECURITY;

-- El paciente ve y gestiona sus propias mediciones; el administrador, todas.
CREATE POLICY "anthropometric_measurements_select" ON public.anthropometric_measurements
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anthropometric_measurements_insert" ON public.anthropometric_measurements
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anthropometric_measurements_update" ON public.anthropometric_measurements
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anthropometric_measurements_delete" ON public.anthropometric_measurements
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER anthropometric_measurements_set_updated_at
BEFORE UPDATE ON public.anthropometric_measurements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
