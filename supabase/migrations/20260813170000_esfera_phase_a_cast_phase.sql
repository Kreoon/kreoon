-- ============================================================================
-- KREOON — `esferaPhase` pasa a llamarse `cast_phase`
--
-- Spec: docs/RESEARCH_UNIFICADO.md §5.
--
-- Contexto: en el research convivían TRES frameworks. El paso de
-- diferenciación usaba CAST y prohibía explícitamente citar ESFERA o Schwartz;
-- los creativos y la parrilla clasificaban por CONVERT… en un campo llamado
-- `esferaPhase`, que era el nombre de un CUARTO framework ya retirado.
--
-- Desde ahora hay uno solo: CAST (Conocer › Atraer › Seducir › Transformar).
-- Esta migración renombra la llave en los datos YA generados y traduce los
-- valores viejos de CONVERT a las cuatro fases de CAST, para que las pantallas
-- no se queden en blanco al abrir un producto histórico.
--
-- SORPRESA AL MIRAR LOS DATOS (2026-08-13): el campo `esferaPhase` no guardaba
-- los valores de CONVERT que declaraba el schema, sino los de ESFERA. Conviven
-- los dos vocabularios, así que la migración cubre ambos:
--
--   ESFERA (~1.900 piezas, el grueso real)     CONVERT (~110 piezas)
--     enganchar   → conocer                      conciencia, origen  → conocer
--     solucion    → atraer                       necesidad           → atraer
--     remarketing → seducir                      valor, engagement   → seducir
--     fidelizar   → transformar                  retencion, traccion → transformar
--
-- El mapeo de ESFERA a CAST es el que ya estaba documentado en el proyecto
-- (engage→C, solution→A, remarketing→S, fidelize→T). Un mapeo solo-CONVERT
-- habría aplastado esas 1.900 piezas a "conocer", borrando la fase real de
-- cada una.
--
-- Rollback: no hay vuelta atrás automática (los valores se colapsan de 7 a 4).
-- Si hiciera falta, restaurar `content_calendar` y `sales_angles_data` desde
-- un backup anterior a esta fecha.
-- ============================================================================

-- ---------------------------------------------------------------------
-- 1. Parrilla de contenido: products.content_calendar -> calendar[]
-- ---------------------------------------------------------------------
UPDATE public.products p
SET content_calendar = jsonb_set(
  p.content_calendar,
  '{calendar}',
  (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN pieza ? 'esferaPhase' THEN
          (pieza - 'esferaPhase') || jsonb_build_object(
            'cast_phase',
            CASE pieza->>'esferaPhase'
              -- Vocabulario ESFERA (el que de verdad tienen los datos: ~1.900 piezas)
              WHEN 'enganchar'   THEN 'conocer'
              WHEN 'solucion'    THEN 'atraer'
              WHEN 'remarketing' THEN 'seducir'
              WHEN 'fidelizar'   THEN 'transformar'
              -- Vocabulario CONVERT (el que declaraba el schema: ~110 piezas)
              WHEN 'conciencia'  THEN 'conocer'
              WHEN 'origen'      THEN 'conocer'
              WHEN 'necesidad'   THEN 'atraer'
              WHEN 'valor'       THEN 'seducir'
              WHEN 'engagement'  THEN 'seducir'
              WHEN 'retencion'   THEN 'transformar'
              WHEN 'traccion'    THEN 'transformar'
              ELSE 'conocer'
            END
          )
        ELSE pieza
      END
    ), '[]'::jsonb)
    FROM jsonb_array_elements(p.content_calendar->'calendar') AS pieza
  )
)
WHERE p.content_calendar ? 'calendar'
  AND jsonb_typeof(p.content_calendar->'calendar') = 'array'
  AND p.content_calendar::text LIKE '%esferaPhase%';

-- ---------------------------------------------------------------------
-- 2. Creativos de video: products.sales_angles_data -> videoCreatives[]
-- ---------------------------------------------------------------------
UPDATE public.products p
SET sales_angles_data = jsonb_set(
  p.sales_angles_data,
  '{videoCreatives}',
  (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN creativo ? 'esferaPhase' THEN
          (creativo - 'esferaPhase') || jsonb_build_object(
            'cast_phase',
            CASE creativo->>'esferaPhase'
              -- Vocabulario ESFERA (el que de verdad tienen los datos: ~1.900 piezas)
              WHEN 'enganchar'   THEN 'conocer'
              WHEN 'solucion'    THEN 'atraer'
              WHEN 'remarketing' THEN 'seducir'
              WHEN 'fidelizar'   THEN 'transformar'
              -- Vocabulario CONVERT (el que declaraba el schema: ~110 piezas)
              WHEN 'conciencia'  THEN 'conocer'
              WHEN 'origen'      THEN 'conocer'
              WHEN 'necesidad'   THEN 'atraer'
              WHEN 'valor'       THEN 'seducir'
              WHEN 'engagement'  THEN 'seducir'
              WHEN 'retencion'   THEN 'transformar'
              WHEN 'traccion'    THEN 'transformar'
              ELSE 'conocer'
            END
          )
        ELSE creativo
      END
    ), '[]'::jsonb)
    FROM jsonb_array_elements(p.sales_angles_data->'videoCreatives') AS creativo
  )
)
WHERE p.sales_angles_data ? 'videoCreatives'
  AND jsonb_typeof(p.sales_angles_data->'videoCreatives') = 'array'
  AND p.sales_angles_data::text LIKE '%esferaPhase%';
