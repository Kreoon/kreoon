-- ============================================================================
-- KREOON — Trazabilidad del gancho en cada pieza de contenido
--
-- Spec: docs/RESEARCH_UNIFICADO.md §6 (PROMPT F1, punto 4) y §10 de
-- docs/MOTOR_INTELIGENCIA.md (R3, punto 3).
--
-- La regla del research unificado es que ningún gancho se inventa: cada ángulo
-- de venta declara de qué hook REAL del nicho desciende. Esa trazabilidad se
-- perdía al crear el contenido, porque `content` no tenía dónde guardarla.
--
-- Con esto, abriendo una pieza del tablero se puede responder: "¿de dónde
-- salió este gancho?" — de un video concreto del nicho, o de un hueco que
-- nadie estaba usando.
--
-- Rollback:
--   ALTER TABLE public.content
--     DROP COLUMN hook_source, DROP COLUMN hook_source_evidence, DROP COLUMN pov_narrativo;
-- ============================================================================

ALTER TABLE public.content
  -- Taxonomía del hook del que desciende ("kill-shot", "anclaje-precio"…) o
  -- "gap" si ataca un ángulo que nadie del nicho usa.
  ADD COLUMN IF NOT EXISTS hook_source text,
  -- La prueba: URL del video o anuncio del que salió, o cuál hueco.
  ADD COLUMN IF NOT EXISTS hook_source_evidence text,
  -- Punto de vista con el que se escribió el guion cuando el creador NO
  -- coincide con el avatar: primera persona | tercero cercano | experto |
  -- reacción. Evita que alguien finja en cámara una vida que no es la suya.
  ADD COLUMN IF NOT EXISTS pov_narrativo text;

COMMENT ON COLUMN public.content.hook_source IS
  'De qué hook real del nicho desciende el gancho de esta pieza (taxonomía del ADN Viral), o "gap" si ataca un ángulo que nadie usa. Se acabaron los hooks imaginados.';
COMMENT ON COLUMN public.content.hook_source_evidence IS
  'La prueba de hook_source: URL del video o anuncio del que salió, o cuál hueco de mercado.';
COMMENT ON COLUMN public.content.pov_narrativo IS
  'Punto de vista narrativo elegido para el guion: primera persona | tercero cercano | experto | reaccion. Se declara cuando el creador no coincide con el avatar.';

CREATE INDEX IF NOT EXISTS idx_content_hook_source
  ON public.content (hook_source)
  WHERE hook_source IS NOT NULL;
