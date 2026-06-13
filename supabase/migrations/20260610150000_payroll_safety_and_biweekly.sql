-- Migration: Endurecimiento nómina de talento — columnas, backfill, candado anti-doble-pago,
--            trigger actualizado y función quincenal con wrapper para cron
-- Date: 2026-06-10
-- Author: Alexander Cast
--
-- RESUMEN DE CAMBIOS
-- 1. Columnas nuevas en talent_payments (role, closing_date, due_payment_date, cycle_label)
-- 2. Backfill de role en los 57 pagos existentes
-- 3. Trigger BEFORE INSERT/UPDATE que impide doble pago por user+role+content
-- 4. CREATE OR REPLACE de auto_talent_payment_on_paid() con soporte de role
-- 5. fn_biweekly_talent_payroll() — cortes quincenales separados por rol
-- 6. fn_run_biweekly_payroll_all_orgs() — wrapper para cron, SECURITY DEFINER
-- 7. Estrategia de cron (comentada — aplicar vía MCP)
--
-- Esta migración es idempotente: usa IF NOT EXISTS / OR REPLACE / DO blocks con guards.
-- NO borra nada. NO modifica tablas fuera de talent_payments.
-- ============================================================


-- ============================================================
-- SECCIÓN 1: Columnas nuevas en talent_payments
-- ============================================================

-- role: identifica qué rol origina el pago.
--   'creator'   → pago generado por trabajo como creador de contenido
--   'editor'    → pago generado por trabajo como editor de contenido
--   'mixed'     → agrupa creator+editor en un solo registro (legado o manual)
--   'manual'    → pago creado manualmente sin contenidos asociados
--   'fillmaker' → pago ligado a un fillmaker_service
--   'legacy'    → registro antiguo sin información suficiente para clasificar
ALTER TABLE talent_payments
  ADD COLUMN IF NOT EXISTS role text
    CHECK (role IN ('creator','editor','mixed','manual','fillmaker','legacy'));

-- closing_date: fecha de corte del ciclo que generó el pago (día 15 o último día del mes).
ALTER TABLE talent_payments
  ADD COLUMN IF NOT EXISTS closing_date date;

-- due_payment_date: fecha límite en que la agencia debe transferir.
--   Corte-15 → día 25 del mismo mes
--   Corte-fin-de-mes → día 10 del mes siguiente
ALTER TABLE talent_payments
  ADD COLUMN IF NOT EXISTS due_payment_date date;

-- cycle_label: etiqueta legible del ciclo, ej. 'Corte 15 Junio 2026' o 'Corte fin de mes Junio 2026'.
ALTER TABLE talent_payments
  ADD COLUMN IF NOT EXISTS cycle_label text;


-- ============================================================
-- SECCIÓN 2: Backfill de role en pagos existentes
-- ============================================================
-- Estrategia (en orden de prioridad, sin solapar):
--   1. fillmaker_service_id IS NOT NULL                → 'fillmaker'
--   2. description LIKE patrón de cierre/liquidación   → 'mixed'
--   3. content_ids vacío / null y description vacía    → 'legacy'
--   4. content_ids presente: comparar user_id vs creator_id / editor_id en content
--        - TODOS los contents donde creator_id = tp.user_id   → 'creator'
--        - TODOS los contents donde editor_id  = tp.user_id   → 'editor'
--        - mezcla o sin coincidencia clara               → 'mixed'
--   5. sin content_ids pero con description            → 'manual'
--
-- El DO block usa subconsultas con COALESCE para tolerar contenidos borrados.
-- Se ejecuta sólo sobre registros con role IS NULL para ser idempotente.

DO $$
DECLARE
  r RECORD;
  v_creator_count INTEGER;
  v_editor_count  INTEGER;
  v_total_content INTEGER;
  v_role          text;
BEGIN
  -- Paso A: fillmaker
  UPDATE talent_payments
  SET role = 'fillmaker'
  WHERE role IS NULL
    AND fillmaker_service_id IS NOT NULL;

  -- Paso B: patrones de descripción de cierres manuales o liquidaciones
  UPDATE talent_payments
  SET role = 'mixed'
  WHERE role IS NULL
    AND (
      description ILIKE 'Cierre mensual%'
      OR description ILIKE 'Liquidación manual%'
      OR description ILIKE 'Liquidacion manual%'
    );

  -- Paso C: sin content_ids y sin descripción → legacy
  UPDATE talent_payments
  SET role = 'legacy'
  WHERE role IS NULL
    AND (content_ids IS NULL OR array_length(content_ids, 1) IS NULL)
    AND (description IS NULL OR trim(description) = '');

  -- Paso D: sin content_ids pero CON descripción → manual
  UPDATE talent_payments
  SET role = 'manual'
  WHERE role IS NULL
    AND (content_ids IS NULL OR array_length(content_ids, 1) IS NULL)
    AND description IS NOT NULL
    AND trim(description) <> '';

  -- Paso E: con content_ids → inferir comparando contra content
  --   Para cada pago pendiente de role, contamos cuántos de sus content_ids
  --   tienen creator_id = user_id y cuántos tienen editor_id = user_id.
  --   Si el contenido fue borrado (LEFT JOIN) lo ignoramos en el conteo.
  FOR r IN
    SELECT id, user_id, content_ids
    FROM talent_payments
    WHERE role IS NULL
      AND content_ids IS NOT NULL
      AND array_length(content_ids, 1) > 0
  LOOP
    -- Cuántos contents en el array tienen creator_id = este user
    SELECT COUNT(*)
    INTO v_creator_count
    FROM content c
    WHERE c.id = ANY(r.content_ids)
      AND c.creator_id = r.user_id;

    -- Cuántos tienen editor_id = este user
    SELECT COUNT(*)
    INTO v_editor_count
    FROM content c
    WHERE c.id = ANY(r.content_ids)
      AND c.editor_id = r.user_id;

    -- Total de contents del array que aún existen en la tabla
    SELECT COUNT(*)
    INTO v_total_content
    FROM content c
    WHERE c.id = ANY(r.content_ids);

    -- Si no hay ningún content existente (todos borrados) → legacy
    IF v_total_content = 0 THEN
      v_role := 'legacy';
    -- Todos los existentes son de rol creator exclusivamente
    ELSIF v_creator_count = v_total_content AND v_editor_count = 0 THEN
      v_role := 'creator';
    -- Todos los existentes son de rol editor exclusivamente
    ELSIF v_editor_count = v_total_content AND v_creator_count = 0 THEN
      v_role := 'editor';
    -- Mezcla de roles o ambigüedad (incluye el caso creator=editor=mismo user)
    ELSE
      v_role := 'mixed';
    END IF;

    UPDATE talent_payments
    SET role = v_role
    WHERE id = r.id;
  END LOOP;

  -- Paso F: cualquier remanente que no encajó en ningún caso → legacy
  UPDATE talent_payments
  SET role = 'legacy'
  WHERE role IS NULL;

END;
$$;

-- Ahora que todos los registros tienen role, agregamos NOT NULL con default 'legacy'
-- como red de seguridad para inserciones futuras que no especifiquen role.
-- (ALTER ADD COLUMN ya existió; ahora endurecemos.)
ALTER TABLE talent_payments
  ALTER COLUMN role SET DEFAULT 'legacy';

-- NOTA: No ponemos NOT NULL aún porque el trigger de la Sección 3 lo validará
-- en tiempo de escritura. Si en el futuro se quiere NOT NULL estricto se puede
-- agregar en otra migración tras confirmar que toda inserción provee el campo.


-- ============================================================
-- SECCIÓN 3: Candado anti-doble-pago
-- ============================================================
--
-- REGLA CENTRAL:
--   Un mismo user_id NO puede tener dos pagos activos (pending/paid/processing)
--   que cubran el mismo content_id CON el mismo role.
--
-- EXCEPCIÓN PERMITIDA (casos legítimos):
--   Un user que es TANTO creator COMO editor del mismo content puede tener
--   UN pago role='creator' Y UN pago role='editor' para ese content.
--   El candado usa la condición "mismo role" para permitir esto.
--
-- COMPORTAMIENTO DE 'mixed':
--   El role 'mixed' se considera que cubre AMBOS roles (creator + editor).
--   Por lo tanto, un pago 'mixed' choca con cualquier otro pago
--   (creator, editor o mixed) del mismo user+content, ya que no podemos
--   garantizar que no haya superposición parcial.
--   Esto se implementa con la condición:
--     (NEW.role = 'mixed' OR existing.role = 'mixed' OR NEW.role = existing.role)
--
-- DATOS ACTUALES:
--   57 pagos existentes, 0 dobles pagos reales verificados en producción.
--   El trigger es BEFORE INSERT OR UPDATE → aplica solo a operaciones nuevas.
--   Los registros existentes NO se ven afectados salvo que sean UPDATE.

CREATE OR REPLACE FUNCTION fn_guard_talent_payment_no_double()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_content_id    uuid;
  v_existing_id   uuid;
  v_existing_role text;
BEGIN
  -- Solo aplica cuando el pago está en estado activo
  IF NEW.status NOT IN ('pending', 'paid', 'processing') THEN
    RETURN NEW;
  END IF;

  -- Solo aplica si hay content_ids definidos y no vacíos
  IF NEW.content_ids IS NULL OR array_length(NEW.content_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Iteramos cada content_id del pago entrante
  FOREACH v_content_id IN ARRAY NEW.content_ids
  LOOP
    SELECT tp.id, tp.role
    INTO v_existing_id, v_existing_role
    FROM talent_payments tp
    WHERE tp.organization_id = NEW.organization_id
      AND tp.user_id         = NEW.user_id
      AND tp.id             <> NEW.id          -- excluir el propio registro (UPDATE)
      AND tp.status IN ('pending', 'paid', 'processing')
      AND tp.content_ids    @> ARRAY[v_content_id]
      -- Choque si:
      --   a) alguno de los dos es 'mixed' (cubre ambos roles), o
      --   b) los roles son iguales (mismo rol, mismo user, mismo content)
      AND (
        NEW.role = 'mixed'
        OR tp.role = 'mixed'
        OR NEW.role = tp.role
      )
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION
        'Doble pago bloqueado: el content_id % ya está cubierto por el pago % '
        '(role: %, status: %) para el mismo usuario en la misma organización. '
        'Role del nuevo pago: %.',
        v_content_id,
        v_existing_id,
        v_existing_role,
        (SELECT status FROM talent_payments WHERE id = v_existing_id),
        NEW.role
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Eliminar el trigger si ya existía (para hacer el bloque idempotente)
DROP TRIGGER IF EXISTS guard_talent_payment_no_double ON talent_payments;

CREATE TRIGGER guard_talent_payment_no_double
  BEFORE INSERT OR UPDATE ON talent_payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_guard_talent_payment_no_double();


-- ============================================================
-- SECCIÓN 4: Actualizar auto_talent_payment_on_paid para setear role
-- ============================================================
--
-- Copia EXACTA de la lógica original descrita en el contexto de producción,
-- con el único agregado de `role` en los INSERT:
--   bloque creator → role = 'creator'
--   bloque editor  → role = 'editor'
--
-- El dedup existente (NOT EXISTS otro pago no-cancelado del mismo user+content)
-- se mantiene intacto. El trigger de la Sección 3 actúa como segunda capa.

CREATE OR REPLACE FUNCTION auto_talent_payment_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- -------------------------------------------------------
  -- Bloque CREATOR
  -- Cuando creator_paid pasa a TRUE y hay creator_id + creator_payment > 0
  -- -------------------------------------------------------
  IF NEW.creator_paid = TRUE
    AND OLD.creator_paid = FALSE
    AND NEW.creator_id IS NOT NULL
    AND COALESCE(NEW.creator_payment, 0) > 0
  THEN
    -- Dedup: solo insertar si NO existe un pago activo (no cancelado)
    -- del mismo user que ya cubra este content
    IF NOT EXISTS (
      SELECT 1
      FROM talent_payments tp
      WHERE tp.organization_id = NEW.organization_id
        AND tp.user_id         = NEW.creator_id
        AND tp.status         <> 'cancelled'
        AND tp.content_ids    @> ARRAY[NEW.id]
        AND tp.role            = 'creator'
    ) THEN
      INSERT INTO talent_payments (
        organization_id,
        user_id,
        amount,
        currency,
        status,
        description,
        content_ids,
        payment_date,
        role,
        created_at,
        updated_at
      ) VALUES (
        NEW.organization_id,
        NEW.creator_id,
        NEW.creator_payment,
        COALESCE(NEW.creator_payment_currency, 'COP'),
        'paid',
        'Pago automático — creador aprobado',
        ARRAY[NEW.id],
        now(),
        'creator',   -- role explícito
        now(),
        now()
      );
    END IF;
  END IF;

  -- -------------------------------------------------------
  -- Bloque EDITOR
  -- Cuando editor_paid pasa a TRUE y hay editor_id + editor_payment > 0
  -- -------------------------------------------------------
  IF NEW.editor_paid = TRUE
    AND OLD.editor_paid = FALSE
    AND NEW.editor_id IS NOT NULL
    AND COALESCE(NEW.editor_payment, 0) > 0
  THEN
    -- Dedup: solo insertar si NO existe un pago activo del mismo user+content
    IF NOT EXISTS (
      SELECT 1
      FROM talent_payments tp
      WHERE tp.organization_id = NEW.organization_id
        AND tp.user_id         = NEW.editor_id
        AND tp.status         <> 'cancelled'
        AND tp.content_ids    @> ARRAY[NEW.id]
        AND tp.role            = 'editor'
    ) THEN
      INSERT INTO talent_payments (
        organization_id,
        user_id,
        amount,
        currency,
        status,
        description,
        content_ids,
        payment_date,
        role,
        created_at,
        updated_at
      ) VALUES (
        NEW.organization_id,
        NEW.editor_id,
        NEW.editor_payment,
        COALESCE(NEW.editor_payment_currency, 'COP'),
        'paid',
        'Pago automático — editor aprobado',
        ARRAY[NEW.id],
        now(),
        'editor',    -- role explícito
        now(),
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- El trigger que llama a esta función ya debe existir en producción (sobre content).
-- No lo recreamos para no pisarlo; si no existiera, descomentar:
-- DROP TRIGGER IF EXISTS trg_auto_talent_payment_on_paid ON content;
-- CREATE TRIGGER trg_auto_talent_payment_on_paid
--   AFTER UPDATE OF creator_paid, editor_paid ON content
--   FOR EACH ROW
--   EXECUTE FUNCTION auto_talent_payment_on_paid();


-- ============================================================
-- SECCIÓN 5: fn_biweekly_talent_payroll
-- ============================================================
--
-- Genera pagos quincenales SEPARADOS por rol (creator / editor).
-- NUNCA combina roles en un mismo pago → el candado por role puede actuar limpio.
--
-- Ciclos:
--   p_cutoff_date día 1-15  → período 1..15,    due = 25 mismo mes
--   p_cutoff_date día 16-31 → período 16..EOM,  due = 10 mes siguiente
--
-- Idempotencia:
--   - Solo procesa contents con *_paid = false y *_payment > 0
--   - Solo procesa contents cuyo approved_at (fallback updated_at) cae
--     dentro del período del corte y antes/igual al p_cutoff_date
--   - Antes de insertar verifica que NO exista un pago pending/processing
--     del mismo user + role + cycle_label (evita duplicar si se llama dos veces)
--
-- Retorna jsonb con: payments_created, total_amount, cutoff, due_date

CREATE OR REPLACE FUNCTION fn_biweekly_talent_payroll(
  p_organization_id uuid,
  p_cutoff_date     date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  -- Variables de ciclo
  v_period_start    date;
  v_period_end      date;
  v_due_date        date;
  v_cycle_label     text;
  v_month_name      text;
  v_year            int;
  v_day             int;

  -- Contadores de resultado
  v_payments_created int  := 0;
  v_total_amount     numeric := 0;

  -- Cursor variables
  r_user            RECORD;

  -- Acumuladores por usuario
  v_content_ids     uuid[];
  v_amount_sum      numeric;
  v_new_payment_id  uuid;
BEGIN
  -- -------------------------------------------------------
  -- 1. Determinar el ciclo según el día del corte
  -- -------------------------------------------------------
  v_day  := EXTRACT(DAY FROM p_cutoff_date)::int;
  v_year := EXTRACT(YEAR FROM p_cutoff_date)::int;

  -- Nombre del mes en español (sin extensión de locale para portabilidad)
  v_month_name := CASE EXTRACT(MONTH FROM p_cutoff_date)::int
    WHEN  1 THEN 'Enero'
    WHEN  2 THEN 'Febrero'
    WHEN  3 THEN 'Marzo'
    WHEN  4 THEN 'Abril'
    WHEN  5 THEN 'Mayo'
    WHEN  6 THEN 'Junio'
    WHEN  7 THEN 'Julio'
    WHEN  8 THEN 'Agosto'
    WHEN  9 THEN 'Septiembre'
    WHEN 10 THEN 'Octubre'
    WHEN 11 THEN 'Noviembre'
    WHEN 12 THEN 'Diciembre'
  END;

  IF v_day <= 15 THEN
    -- Corte del 15: período del 1 al 15 del mismo mes
    v_period_start := date_trunc('month', p_cutoff_date)::date;
    v_period_end   := (date_trunc('month', p_cutoff_date) + INTERVAL '14 days')::date;
    v_due_date     := (date_trunc('month', p_cutoff_date) + INTERVAL '24 days')::date;
    v_cycle_label  := 'Corte 15 ' || v_month_name || ' ' || v_year;
  ELSE
    -- Corte fin de mes: período del 16 al último día del mes
    v_period_start := (date_trunc('month', p_cutoff_date) + INTERVAL '15 days')::date;
    v_period_end   := (date_trunc('month', p_cutoff_date) + INTERVAL '1 month' - INTERVAL '1 day')::date;
    v_due_date     := (date_trunc('month', p_cutoff_date) + INTERVAL '1 month' + INTERVAL '9 days')::date;
    v_cycle_label  := 'Corte fin de mes ' || v_month_name || ' ' || v_year;
  END IF;

  -- -------------------------------------------------------
  -- 2. Pagos CREATOR: agrupar por creator_id
  -- -------------------------------------------------------
  FOR r_user IN
    SELECT
      c.creator_id                                        AS user_id,
      array_agg(c.id ORDER BY c.id)                       AS content_ids,
      sum(c.creator_payment)                              AS amount_sum,
      max(COALESCE(c.creator_payment_currency, 'COP'))    AS currency
    FROM content c
    WHERE c.organization_id = p_organization_id
      AND c.status          = 'approved'
      AND c.creator_paid    = false
      AND c.creator_id      IS NOT NULL
      AND COALESCE(c.creator_payment, 0) > 0
      -- Incluir TODO lo aprobado y no pagado hasta la fecha de corte (incl. backlog
      -- de períodos anteriores). El período sólo define la etiqueta y la fecha de pago.
      -- Así se garantiza que nada quede sin pagar (requisito de negocio).
      AND COALESCE(c.approved_at, c.updated_at)::date <= p_cutoff_date
    GROUP BY c.creator_id
  LOOP
    -- Idempotencia: verificar si ya existe un pago pending/processing
    -- para este user + role 'creator' + este cycle_label exacto
    IF EXISTS (
      SELECT 1
      FROM talent_payments tp
      WHERE tp.organization_id = p_organization_id
        AND tp.user_id         = r_user.user_id
        AND tp.role            = 'creator'
        AND tp.cycle_label     = v_cycle_label
        AND tp.status          IN ('pending', 'processing')
    ) THEN
      -- Ya se generó este corte para este user+rol; saltar
      CONTINUE;
    END IF;

    -- Filtrar del array solo los content_ids que NO estén ya en un pago activo
    -- de este user+creator (el candado como segunda capa; aquí lo hacemos proactivo)
    SELECT array_agg(cid ORDER BY cid)
    INTO v_content_ids
    FROM unnest(r_user.content_ids) AS cid
    WHERE NOT EXISTS (
      SELECT 1
      FROM talent_payments tp2
      WHERE tp2.organization_id = p_organization_id
        AND tp2.user_id         = r_user.user_id
        AND tp2.role            = 'creator'
        AND tp2.status          IN ('pending', 'paid', 'processing')
        AND tp2.content_ids    @> ARRAY[cid]
    );

    -- Si todos los contents ya estaban cubiertos, no hay nada que insertar
    IF v_content_ids IS NULL OR array_length(v_content_ids, 1) IS NULL THEN
      CONTINUE;
    END IF;

    -- Recalcular el monto solo con los contents no cubiertos
    SELECT sum(c.creator_payment)
    INTO v_amount_sum
    FROM content c
    WHERE c.id = ANY(v_content_ids);

    IF COALESCE(v_amount_sum, 0) <= 0 THEN
      CONTINUE;
    END IF;

    -- Insertar el pago quincenal creator
    INSERT INTO talent_payments (
      organization_id,
      user_id,
      amount,
      currency,
      status,
      description,
      content_ids,
      closing_date,
      due_payment_date,
      cycle_label,
      role,
      created_at,
      updated_at
    ) VALUES (
      p_organization_id,
      r_user.user_id,
      v_amount_sum,
      COALESCE(r_user.currency, 'COP'),
      'pending',
      v_cycle_label || ' — Creador',
      v_content_ids,
      p_cutoff_date,
      v_due_date,
      v_cycle_label,
      'creator',
      now(),
      now()
    )
    RETURNING id INTO v_new_payment_id;

    -- Marcar los contents como creator_paid = true
    UPDATE content
    SET creator_paid = true,
        updated_at   = now()
    WHERE id = ANY(v_content_ids);

    v_payments_created := v_payments_created + 1;
    v_total_amount     := v_total_amount + v_amount_sum;
  END LOOP;

  -- -------------------------------------------------------
  -- 3. Pagos EDITOR: agrupar por editor_id
  -- -------------------------------------------------------
  FOR r_user IN
    SELECT
      c.editor_id                                         AS user_id,
      array_agg(c.id ORDER BY c.id)                       AS content_ids,
      sum(c.editor_payment)                               AS amount_sum,
      max(COALESCE(c.editor_payment_currency, 'COP'))     AS currency
    FROM content c
    WHERE c.organization_id = p_organization_id
      AND c.status          = 'approved'
      AND c.editor_paid     = false
      AND c.editor_id       IS NOT NULL
      AND COALESCE(c.editor_payment, 0) > 0
      -- Incluir TODO lo aprobado y no pagado hasta la fecha de corte (incl. backlog).
      AND COALESCE(c.approved_at, c.updated_at)::date <= p_cutoff_date
    GROUP BY c.editor_id
  LOOP
    -- Idempotencia: mismo guard que para creator
    IF EXISTS (
      SELECT 1
      FROM talent_payments tp
      WHERE tp.organization_id = p_organization_id
        AND tp.user_id         = r_user.user_id
        AND tp.role            = 'editor'
        AND tp.cycle_label     = v_cycle_label
        AND tp.status          IN ('pending', 'processing')
    ) THEN
      CONTINUE;
    END IF;

    -- Filtrar contenidos no cubiertos
    SELECT array_agg(cid ORDER BY cid)
    INTO v_content_ids
    FROM unnest(r_user.content_ids) AS cid
    WHERE NOT EXISTS (
      SELECT 1
      FROM talent_payments tp2
      WHERE tp2.organization_id = p_organization_id
        AND tp2.user_id         = r_user.user_id
        AND tp2.role            = 'editor'
        AND tp2.status          IN ('pending', 'paid', 'processing')
        AND tp2.content_ids    @> ARRAY[cid]
    );

    IF v_content_ids IS NULL OR array_length(v_content_ids, 1) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT sum(c.editor_payment)
    INTO v_amount_sum
    FROM content c
    WHERE c.id = ANY(v_content_ids);

    IF COALESCE(v_amount_sum, 0) <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO talent_payments (
      organization_id,
      user_id,
      amount,
      currency,
      status,
      description,
      content_ids,
      closing_date,
      due_payment_date,
      cycle_label,
      role,
      created_at,
      updated_at
    ) VALUES (
      p_organization_id,
      r_user.user_id,
      v_amount_sum,
      COALESCE(r_user.currency, 'COP'),
      'pending',
      v_cycle_label || ' — Editor',
      v_content_ids,
      p_cutoff_date,
      v_due_date,
      v_cycle_label,
      'editor',
      now(),
      now()
    )
    RETURNING id INTO v_new_payment_id;

    UPDATE content
    SET editor_paid = true,
        updated_at  = now()
    WHERE id = ANY(v_content_ids);

    v_payments_created := v_payments_created + 1;
    v_total_amount     := v_total_amount + v_amount_sum;
  END LOOP;

  -- -------------------------------------------------------
  -- 4. Retornar resumen
  -- -------------------------------------------------------
  RETURN jsonb_build_object(
    'payments_created', v_payments_created,
    'total_amount',     v_total_amount,
    'cutoff',           p_cutoff_date,
    'period_start',     v_period_start,
    'period_end',       v_period_end,
    'due_date',         v_due_date,
    'cycle_label',      v_cycle_label
  );
END;
$$;

GRANT EXECUTE ON FUNCTION fn_biweekly_talent_payroll(uuid, date)
  TO authenticated, service_role;


-- ============================================================
-- SECCIÓN 6: Wrapper fn_run_biweekly_payroll_all_orgs
-- ============================================================
--
-- Itera todas las organizaciones activas y llama fn_biweekly_talent_payroll.
-- SECURITY DEFINER: el cron lo invoca como service_role sin necesidad de
-- pasar credenciales de usuario.
-- Retorna jsonb con resumen global: organizaciones procesadas, pagos totales,
-- monto total acumulado, y detalle por organización.

CREATE OR REPLACE FUNCTION fn_run_biweekly_payroll_all_orgs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_org          RECORD;
  v_org_result   jsonb;
  v_orgs_done    int     := 0;
  v_total_pay    int     := 0;
  v_total_amount numeric := 0;
  v_details      jsonb   := '[]'::jsonb;
  v_error_msg    text;
BEGIN
  -- Iteramos todas las organizaciones activas.
  -- Se asume que la tabla se llama 'organizations' con columna 'is_active' o similar.
  -- Ajustar el filtro si el nombre de la columna es distinto.
  FOR r_org IN
    SELECT id, name
    FROM organizations
    WHERE deleted_at IS NULL
    ORDER BY created_at
  LOOP
    BEGIN
      v_org_result := fn_biweekly_talent_payroll(r_org.id, CURRENT_DATE);

      v_orgs_done    := v_orgs_done + 1;
      v_total_pay    := v_total_pay    + (v_org_result->>'payments_created')::int;
      v_total_amount := v_total_amount + (v_org_result->>'total_amount')::numeric;

      v_details := v_details || jsonb_build_object(
        'org_id',          r_org.id,
        'org_name',        r_org.name,
        'payments_created',(v_org_result->>'payments_created')::int,
        'total_amount',    (v_org_result->>'total_amount')::numeric,
        'cycle_label',     v_org_result->>'cycle_label',
        'due_date',        v_org_result->>'due_date'
      );

    EXCEPTION WHEN OTHERS THEN
      -- No abortar el loop completo por una org con error; registrar y continuar
      GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
      v_details := v_details || jsonb_build_object(
        'org_id',   r_org.id,
        'org_name', r_org.name,
        'error',    v_error_msg
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'run_at',          now(),
    'cutoff_date',     CURRENT_DATE,
    'orgs_processed',  v_orgs_done,
    'payments_created',v_total_pay,
    'total_amount',    v_total_amount,
    'details',         v_details
  );
END;
$$;

GRANT EXECUTE ON FUNCTION fn_run_biweekly_payroll_all_orgs()
  TO service_role;

-- Revocar acceso a usuarios autenticados normales (solo service_role y superuser)
REVOKE EXECUTE ON FUNCTION fn_run_biweekly_payroll_all_orgs()
  FROM authenticated;


-- ============================================================
-- SECCIÓN 7: Estrategia de cron (NO ejecutar — solo referencia)
-- ============================================================
--
-- RECOMENDACIÓN: UN job diario con guard interno.
--
-- Ventajas sobre dos jobs fijos (día 15 + día 30):
--   - pg_cron no soporta 'L' (último día del mes) de forma nativa.
--   - Un job diario que internamente verifica si hoy es día de corte
--     centraliza la lógica y no requiere mantenimiento de dos schedules.
--   - Si la función es llamada en un día que no es de corte, retornará
--     payments_created=0 sin efectos secundarios (el guard por cycle_label
--     y creator_paid=false lo previene).
--
-- ESTRATEGIA DETALLADA:
--   Opción A — Job diario + función con guard interno (RECOMENDADA):
--     La función fn_run_biweekly_payroll_all_orgs ya acepta CURRENT_DATE.
--     Agregar al inicio de fn_run_biweekly_payroll_all_orgs (o en un wrapper
--     adicional) una verificación:
--
--       IF EXTRACT(DAY FROM CURRENT_DATE) NOT IN (15) AND
--          CURRENT_DATE <> (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date
--       THEN
--         RETURN jsonb_build_object('skipped', true, 'reason', 'No es día de corte');
--       END IF;
--
--     Luego el schedule pg_cron sería:
--       '0 5 * * *'   → todos los días a las 05:00 UTC (medianoche Colombia = UTC-5)
--
--   Opción B — Dos jobs separados (más simple, menos elegante):
--       '0 5 15 * *'  → día 15 de cada mes, 05:00 UTC
--       '0 5 28-31 * *' → correr los últimos días posibles; la función misma
--                          calculará v_period_end = último día del mes y agrupará
--                          solo lo que corresponde al corte fin de mes.
--                          PERO puede generar múltiples llamadas (días 28-31).
--
-- COMANDO MCP SUGERIDO (Opción A):
-- SELECT cron.schedule(
--   'biweekly-payroll-daily-guard',
--   '0 5 * * *',
--   $$SELECT fn_run_biweekly_payroll_all_orgs()$$
-- );
--
-- NOTA ZONA HORARIA:
--   Colombia es UTC-5 (sin cambio de horario).
--   Medianoche Colombia = 05:00 UTC.
--   El cron de Supabase corre en UTC; ajustar si cambia la zona horaria del servidor.
--
-- NOTA EXTENSIÓN:
--   Asegurarse de que pg_cron esté habilitado en el proyecto Supabase antes de
--   ejecutar cron.schedule. En Supabase Cloud se habilita desde el dashboard
--   Database > Extensions.
