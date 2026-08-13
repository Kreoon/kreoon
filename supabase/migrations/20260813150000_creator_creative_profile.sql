-- ============================================================================
-- KREOON — Ficha creativa del creador
--
-- Spec: docs/MOTOR_INTELIGENCIA.md §10 (R3, punto 1).
--
-- Para qué: un guion se escribe para la voz de UNA persona. Sin saber cómo
-- habla, dónde puede grabar y qué NO graba, el guion sale genérico y el creador
-- termina fingiendo en cámara una vida que no es la suya. Eso se nota y no
-- vende.
--
-- Por qué tabla aparte y no columnas en `creator_profiles`:
--   1. `creator_profiles` tiene DOS definiciones distintas en el baseline
--      (líneas 18405 y 21603, ambas con IF NOT EXISTS) y decenas de
--      consumidores. Añadir doce columnas ahí es pisar terreno movedizo.
--   2. La ficha la puede llenar el equipo por el creador, con permisos
--      distintos a los del perfil público. Con tabla propia, esa regla es una
--      política de dos líneas en vez de un caso especial.
--
-- La clave es `user_id` (no `creator_profile_id`) porque es lo que guarda
-- `content.creator_id`: así el generador de guiones encuentra la ficha sin un
-- join extra.
--
-- Rollback:
--   DROP TABLE public.creator_creative_profile CASCADE;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creator_creative_profile (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ── Quién es en cámara ──
  rango_edad  text CHECK (rango_edad IN ('18-24','25-34','35-44','45-54','55+')),
  genero      text CHECK (genero IN ('femenino','masculino','no_binario','prefiero_no_decir')),
  ciudad      text,
  -- De qué país es su español. Un guion con voseo argentino en boca de una
  -- paisa suena a doblaje.
  pais_acento text,

  -- ── Cómo habla ──
  estilo_energia text CHECK (estilo_energia IN ('calmado','neutro','alta-energia')),
  registro       text CHECK (registro IN ('coloquial','neutro','formal')),
  -- Sus muletillas REALES, las que dice sin darse cuenta. Son el detalle que
  -- separa un guion suyo de un guion cualquiera.
  muletillas     text[] NOT NULL DEFAULT '{}',
  -- 2–3 frases de ejemplo escritas por él, o por quien lo escuchó hablar.
  frases_ejemplo text[] NOT NULL DEFAULT '{}',

  -- ── Qué puede grabar ──
  escenarios       text[] NOT NULL DEFAULT '{}',  -- casa, cocina, gym, carro, oficina, exterior…
  formatos_fuertes text[] NOT NULL DEFAULT '{}',  -- talking-head, demo, GRWM, storytime, voz-en-off…
  nichos_afines    text[] NOT NULL DEFAULT '{}',

  -- ── Qué NO graba: filtro DURO, no una preferencia ──
  restricciones text[] NOT NULL DEFAULT '{}',

  -- 0–100. Lo calcula el trigger de abajo; no se escribe a mano.
  completitud int NOT NULL DEFAULT 0 CHECK (completitud BETWEEN 0 AND 100),

  -- Quién la llenó: el propio creador o alguien del equipo.
  completada_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_creative_profile_completitud
  ON public.creator_creative_profile (completitud DESC);
CREATE INDEX IF NOT EXISTS idx_creator_creative_profile_nichos
  ON public.creator_creative_profile USING gin (nichos_afines);

-- ---------------------------------------------------------------------
-- Completitud: se calcula, no se declara
--
-- Diez bloques que valen 10 cada uno. Se calcula en un trigger y no en el
-- frontend por el mismo motivo por el que `profile_completeness` de
-- `creator_profiles` lleva desde siempre en 0: lo que nadie calcula, nadie
-- mantiene.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_completitud_ficha_creativa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  puntos int := 0;
BEGIN
  IF NEW.rango_edad     IS NOT NULL THEN puntos := puntos + 10; END IF;
  IF NEW.genero         IS NOT NULL THEN puntos := puntos + 10; END IF;
  IF NEW.ciudad         IS NOT NULL AND length(trim(NEW.ciudad)) > 0 THEN puntos := puntos + 10; END IF;
  IF NEW.pais_acento    IS NOT NULL AND length(trim(NEW.pais_acento)) > 0 THEN puntos := puntos + 10; END IF;
  IF NEW.estilo_energia IS NOT NULL THEN puntos := puntos + 10; END IF;
  IF NEW.registro       IS NOT NULL THEN puntos := puntos + 10; END IF;
  IF array_length(NEW.muletillas, 1)       >= 1 THEN puntos := puntos + 10; END IF;
  IF array_length(NEW.frases_ejemplo, 1)   >= 1 THEN puntos := puntos + 10; END IF;
  IF array_length(NEW.escenarios, 1)       >= 1 THEN puntos := puntos + 10; END IF;
  IF array_length(NEW.formatos_fuertes, 1) >= 1 THEN puntos := puntos + 10; END IF;

  NEW.completitud := puntos;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_completitud_ficha_creativa ON public.creator_creative_profile;
CREATE TRIGGER trg_completitud_ficha_creativa
  BEFORE INSERT OR UPDATE ON public.creator_creative_profile
  FOR EACH ROW EXECUTE FUNCTION public.calcular_completitud_ficha_creativa();

-- ---------------------------------------------------------------------
-- RLS
--   · El creador manda sobre su propia ficha.
--   · El staff puede leerla y llenarla, pero solo la de creadores que estén
--     en su organización — no la de cualquier creador de la plataforma.
-- ---------------------------------------------------------------------
ALTER TABLE public.creator_creative_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator manages own creative profile" ON public.creator_creative_profile;
CREATE POLICY "Creator manages own creative profile"
  ON public.creator_creative_profile FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Org staff manages creative profiles of their members" ON public.creator_creative_profile;
CREATE POLICY "Org staff manages creative profiles of their members"
  ON public.creator_creative_profile FOR ALL TO authenticated
  USING (
    user_id IN (
      SELECT om.user_id FROM public.organization_members om
      WHERE om.organization_id IN (
        SELECT om2.organization_id FROM public.organization_members om2
        WHERE om2.user_id = auth.uid()
          AND om2.role = ANY (ARRAY['admin'::app_role,'team_leader'::app_role,
            'strategist'::app_role,'digital_strategist'::app_role,'creative_strategist'::app_role])
      )
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT om.user_id FROM public.organization_members om
      WHERE om.organization_id IN (
        SELECT om2.organization_id FROM public.organization_members om2
        WHERE om2.user_id = auth.uid()
          AND om2.role = ANY (ARRAY['admin'::app_role,'team_leader'::app_role,
            'strategist'::app_role,'digital_strategist'::app_role,'creative_strategist'::app_role])
      )
    )
  );

GRANT ALL ON public.creator_creative_profile TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_creative_profile TO authenticated;

COMMENT ON TABLE public.creator_creative_profile IS
  'Ficha creativa del creador: cómo habla, dónde puede grabar y qué NO graba. La usa la etapa de selección de creador para proponer una shortlist y el generador de guiones para escribir en su voz. La clave es user_id porque es lo que guarda content.creator_id.';
COMMENT ON COLUMN public.creator_creative_profile.restricciones IS
  'Filtro DURO en el matching y en la generación de guiones: lo que aquí esté escrito no se le pide nunca a este creador.';
