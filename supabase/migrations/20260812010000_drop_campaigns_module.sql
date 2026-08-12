-- =====================================================================
-- DROP MÓDULO: MARKETPLACE DE CAMPAÑAS
-- Fecha: 2026-08-12
-- =====================================================================
--
-- VERIFICADO CONTRA EL CATÁLOGO EN VIVO (proyecto wjkbqcrxwsmvtxmqgiqc):
--
--   * 12 tablas existen. `campaign_roi_metrics` NO EXISTE — no se incluye.
--   * 14 filas en total en las 12 tablas (marketplace_campaigns=8,
--     campaign_templates=6, las otras 10 vacías).
--   * 35 políticas RLS: 33 sobre las tablas del módulo + 2 sobre
--     marketplace_projects (tabla que SE QUEDA) que hacen EXISTS contra
--     marketplace_campaigns. Esas 2 se sueltan PRIMERO y se recrean sin
--     la referencia a campañas — si no, no existe orden válido de DROP.
--   * 5 FKs entrantes desde tablas que se quedan. Verificado: no hay más.
--     Las 5 tienen 0 filas con el valor no nulo.
--   * NINGUNA función devuelve el row-type de una tabla del módulo
--     (verificado vía pg_proc.prorettype + pg_type.typrelid). El bloque
--     "funciones row-type" queda por tanto vacío a propósito.
--   * 21 funciones del módulo se eliminan (16 normales + 5 de trigger).
--     2 funciones que SE QUEDAN tocaban tablas del módulo y se reescriben:
--     sync_user_health() y assign_editor_to_project().
--     admin_delete_user_cascade() ya estaba limpia (solo la menciona en un
--     comentario) — NO se toca.
--     get_campaign_context() usa marketing_campaigns_legacy — NO se toca.
--   * NINGUNA tabla del módulo está en la publicación supabase_realtime
--     (verificado en pg_publication_rel). El bloque de ALTER PUBLICATION
--     queda vacío a propósito.
--   * NINGÚN cron job referencia el módulo (verificado en cron.job).
--   * 1 vista se elimina: campaign_social_summary (agrega scheduled_posts
--     por campaign_id). La vista campaign_context SE QUEDA — usa
--     marketing_campaigns_legacy, no marketplace_campaigns.
--   * 3 enums quedan huérfanos y se eliminan: campaign_status,
--     application_status, publication_verification_status (0 usos fuera
--     del módulo). `ad_campaign_status` SE QUEDA — lo usan 3 columnas de
--     marketing_campaigns (módulo de ads).
--   * Ningún objeto externo (política, función o vista) depende de las
--     funciones que se eliminan — verificado por búsqueda de nombre en
--     pg_policies.qual/with_check, pg_proc.prosrc y pg_get_viewdef().
--
-- NO SE USA CASCADE EN NINGÚN PUNTO.
--
-- SEGUIMIENTO PARA EL FRONTEND (fuera del alcance de esta migración):
--   - src/modules/social/hooks/useCampaignSocialMetrics.ts queda huérfano
--     (llamaba a get_campaign_social_metrics).
--   - src/modules/social/hooks/useScheduledPosts.ts:164 sigue escribiendo
--     scheduled_posts.campaign_id; la columna se conserva (ver más abajo).
--   - src/hooks/useMarketplaceProjects.ts:357-362 filtra proyectos por
--     campaign_id/application_id; ambas columnas se conservan.
--   - Regenerar src/integrations/supabase/types.ts después de aplicar.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. POLÍTICAS RLS — TODAS PRIMERO, ANTES DE TOCAR NINGUNA TABLA
-- =====================================================================

-- 1.a  Políticas sobre marketplace_projects (tabla que SE QUEDA) que
--      referencian marketplace_campaigns. Sin soltarlas aquí no existe
--      ningún orden válido de borrado.
DROP POLICY IF EXISTS "Project participants can view projects" ON public.marketplace_projects;
DROP POLICY IF EXISTS "Campaign owners can create projects" ON public.marketplace_projects;

-- 1.b  Las 33 políticas de las 12 tablas del módulo.
DROP POLICY IF EXISTS "Creadores pueden crear sus publicaciones" ON public.activation_publications;
DROP POLICY IF EXISTS "Creadores ven sus publicaciones" ON public.activation_publications;
DROP POLICY IF EXISTS "Creadores y marcas pueden actualizar publicaciones" ON public.activation_publications;
DROP POLICY IF EXISTS "activation_pub_insert" ON public.activation_publications;
DROP POLICY IF EXISTS "activation_pub_select" ON public.activation_publications;
DROP POLICY IF EXISTS "activation_pub_update" ON public.activation_publications;

DROP POLICY IF EXISTS "Applicants and brand members can update applications" ON public.campaign_applications;
DROP POLICY IF EXISTS "Applications visible to campaign brand and applicant" ON public.campaign_applications;
DROP POLICY IF EXISTS "Creators can apply to campaigns" ON public.campaign_applications;
DROP POLICY IF EXISTS "Creators can withdraw their applications" ON public.campaign_applications;

DROP POLICY IF EXISTS "case_studies_brand_all" ON public.campaign_case_studies;
DROP POLICY IF EXISTS "case_studies_public_read" ON public.campaign_case_studies;

DROP POLICY IF EXISTS "Creators can submit deliverables" ON public.campaign_deliverables;
DROP POLICY IF EXISTS "Deliverables visible to campaign participants" ON public.campaign_deliverables;
DROP POLICY IF EXISTS "Participants can update deliverables" ON public.campaign_deliverables;

DROP POLICY IF EXISTS "Campaign managers can create invitations" ON public.campaign_invitations;
DROP POLICY IF EXISTS "Campaign managers can delete invitations" ON public.campaign_invitations;
DROP POLICY IF EXISTS "Invitation visible to invited user and campaign org" ON public.campaign_invitations;
DROP POLICY IF EXISTS "Invited users can respond to invitations" ON public.campaign_invitations;

DROP POLICY IF EXISTS "Org members manage campaign media" ON public.campaign_media;

DROP POLICY IF EXISTS "Users manage own campaign notifications" ON public.campaign_notifications;

DROP POLICY IF EXISTS "templates_select" ON public.campaign_templates;

DROP POLICY IF EXISTS "Admins can insert managed_campaign_subscriptions" ON public.managed_campaign_subscriptions;
DROP POLICY IF EXISTS "Admins can update managed_campaign_subscriptions" ON public.managed_campaign_subscriptions;
DROP POLICY IF EXISTS "Admins can view all managed_campaign_subscriptions" ON public.managed_campaign_subscriptions;
DROP POLICY IF EXISTS "Service role full access on managed_campaign_subscriptions" ON public.managed_campaign_subscriptions;
DROP POLICY IF EXISTS "Users can view own managed_campaign_subscriptions" ON public.managed_campaign_subscriptions;

DROP POLICY IF EXISTS "Admins can delete draft campaigns" ON public.marketplace_campaigns;
DROP POLICY IF EXISTS "Anon can view public open campaigns" ON public.marketplace_campaigns;
DROP POLICY IF EXISTS "Brand or org members can create campaigns" ON public.marketplace_campaigns;
DROP POLICY IF EXISTS "Campaign owners can update campaigns" ON public.marketplace_campaigns;
DROP POLICY IF EXISTS "Campaigns visible based on visibility rules" ON public.marketplace_campaigns;

DROP POLICY IF EXISTS "Solo sistema puede ver cola de verificación" ON public.publication_verification_queue;

-- 1.c  Recrear las 2 políticas de marketplace_projects sin la rama de
--      campañas. marketplace_projects tiene RLS activo: sin estas dos,
--      nadie puede ver ni crear proyectos.
CREATE POLICY "Project participants can view projects"
  ON public.marketplace_projects
  FOR SELECT
  USING (
    is_project_participant(id)
    OR client_user_id = auth.uid()
  );

CREATE POLICY "Brand or org members can create projects"
  ON public.marketplace_projects
  FOR INSERT
  WITH CHECK (
    (brand_id IS NOT NULL AND is_brand_member(brand_id))
    OR (organization_id IS NOT NULL AND is_org_member(organization_id))
  );

-- =====================================================================
-- 2. PUBLICACIÓN REALTIME
-- =====================================================================
-- Verificado en pg_publication_rel: ninguna de las 12 tablas pertenece a
-- supabase_realtime. No hay nada que sacar.

-- =====================================================================
-- 3. VISTA DEPENDIENTE
-- =====================================================================
-- campaign_social_summary agrega scheduled_posts por campaign_id; es
-- funcionalidad exclusiva del módulo. La consume get_campaign_social_metrics(),
-- que también se elimina más abajo.
DROP VIEW IF EXISTS public.campaign_social_summary;

-- =====================================================================
-- 4. FKs ENTRANTES DESDE TABLAS QUE SE QUEDAN
-- =====================================================================
-- Las 5 tienen 0 filas con el valor no nulo, así que ninguna decisión
-- pierde datos. El criterio para columna vs constraint es si el código
-- vivo la lee.

-- 4.a  DROP CONSTRAINT (se conserva la columna: hay código vivo que la usa)
--
--   marketplace_projects.campaign_id     -> useMarketplaceProjects.ts:362 (.eq)
--   marketplace_projects.application_id  -> useMarketplaceProjects.ts:361 (.select)
--   scheduled_posts.campaign_id          -> useScheduledPosts.ts:164 (insert)
--
-- Quedan como identificadores sueltos sin integridad referencial. Cuando
-- el frontend deje de escribirlas se pueden eliminar en otra migración.
ALTER TABLE public.marketplace_projects DROP CONSTRAINT IF EXISTS marketplace_projects_campaign_id_fkey;
ALTER TABLE public.marketplace_projects DROP CONSTRAINT IF EXISTS marketplace_projects_application_id_fkey;
ALTER TABLE public.scheduled_posts      DROP CONSTRAINT IF EXISTS scheduled_posts_campaign_id_fkey;

-- 4.b  DROP COLUMN (nadie las lee: solo aparecen en el types.ts autogenerado)
--
--   marketplace_media.campaign_id             — la tabla sigue muy viva
--       (media library, bunny-marketplace-upload/status) pero ningún
--       archivo referencia esta columna.
--   brand_credit_transactions.related_campaign_id — useBrandCredits.ts
--       hace select genérico; ningún archivo nombra la columna.
ALTER TABLE public.marketplace_media         DROP COLUMN IF EXISTS campaign_id;
ALTER TABLE public.brand_credit_transactions DROP COLUMN IF EXISTS related_campaign_id;

-- =====================================================================
-- 5. FUNCIONES QUE DEVUELVEN EL ROW-TYPE DE UNA TABLA DEL MÓDULO
-- =====================================================================
-- Verificado: NINGUNA. Ninguna función tiene prorettype apuntando al
-- typrelid de las 12 tablas. Bloque vacío a propósito — si en el futuro
-- se añade una, va exactamente aquí (antes de las tablas).

-- =====================================================================
-- 6. FUNCIONES DEL MÓDULO (no-trigger)
-- =====================================================================
DROP FUNCTION IF EXISTS public.activate_campaign(uuid, text);
DROP FUNCTION IF EXISTS public.apply_first_campaign_promo(uuid, uuid);
DROP FUNCTION IF EXISTS public.approve_campaign_application(uuid, numeric);
DROP FUNCTION IF EXISTS public.calculate_engagement_bonus(uuid);
DROP FUNCTION IF EXISTS public.can_manage_campaign(uuid);
DROP FUNCTION IF EXISTS public.can_see_campaign(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_view_campaign(uuid);
DROP FUNCTION IF EXISTS public.check_campaign_invitation(uuid, uuid);
DROP FUNCTION IF EXISTS public.complete_campaign_delivery(uuid, integer);
DROP FUNCTION IF EXISTS public.create_project_from_application(uuid, uuid);
DROP FUNCTION IF EXISTS public.creator_meets_activation_requirements(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_campaign_social_metrics(uuid);
DROP FUNCTION IF EXISTS public.get_eligible_activation_campaigns(uuid);
DROP FUNCTION IF EXISTS public.is_campaign_invitee(uuid);
DROP FUNCTION IF EXISTS public.smart_match_creators(uuid);
DROP FUNCTION IF EXISTS public.verify_campaign_post(uuid, boolean, boolean, boolean, text[], uuid);

-- =====================================================================
-- 7. FUNCIONES QUE SE QUEDAN PERO TOCAN TABLAS DEL MÓDULO
-- =====================================================================
-- Se reescriben ANTES de borrar las tablas. Son plpgsql, así que el
-- cuerpo no se valida hasta ejecutarse: si no se reescriben, no fallan
-- ahora, fallan en producción la primera vez que alguien las invoque.

-- 7.a  sync_user_health(): contaba campaign_applications del creador.
--      Sin marketplace de campañas ya no hay postulaciones que contar.
CREATE OR REPLACE FUNCTION public.sync_user_health(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_sign_in TIMESTAMPTZ;
  v_created_at TIMESTAMPTZ;
  v_days_inactive INTEGER;
  v_completed_projects INTEGER;
  v_total_applications INTEGER;
BEGIN
  -- Obtener datos del usuario de auth.users
  SELECT
    last_sign_in_at,
    created_at
  INTO v_last_sign_in, v_created_at
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular días de inactividad
  IF v_last_sign_in IS NOT NULL THEN
    v_days_inactive := EXTRACT(DAY FROM (NOW() - v_last_sign_in));
  ELSE
    v_days_inactive := EXTRACT(DAY FROM (NOW() - v_created_at));
  END IF;

  -- Obtener proyectos completados del creator_profile si existe
  SELECT COALESCE(cp.completed_projects, 0)
  INTO v_completed_projects
  FROM creator_profiles cp
  WHERE cp.user_id = p_user_id;

  IF NOT FOUND THEN
    v_completed_projects := 0;
  END IF;

  -- [DROP MÓDULO CAMPAÑAS] eliminado: conteo sobre campaign_applications.
  -- Ya no existen postulaciones a campañas; la columna se conserva en
  -- platform_user_health por compatibilidad y queda siempre en 0.
  v_total_applications := 0;

  -- Insertar o actualizar platform_user_health
  INSERT INTO platform_user_health (
    user_id,
    last_login_at,
    total_logins,
    days_since_last_activity,
    total_completed_projects,
    total_applications,
    health_score,
    health_status,
    needs_attention,
    updated_at
  ) VALUES (
    p_user_id,
    v_last_sign_in,
    1,
    v_days_inactive,
    v_completed_projects,
    COALESCE(v_total_applications, 0),
    CASE
      WHEN v_days_inactive <= 7 THEN 70
      WHEN v_days_inactive <= 14 THEN 50
      WHEN v_days_inactive <= 30 THEN 30
      ELSE 10
    END,
    CASE
      WHEN v_days_inactive <= 7 THEN 'healthy'
      WHEN v_days_inactive <= 14 THEN 'at_risk'
      WHEN v_days_inactive <= 30 THEN 'churning'
      ELSE 'churned'
    END,
    v_days_inactive > 14,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_login_at = COALESCE(EXCLUDED.last_login_at, platform_user_health.last_login_at),
    total_logins = platform_user_health.total_logins + 1,
    days_since_last_activity = EXCLUDED.days_since_last_activity,
    total_completed_projects = EXCLUDED.total_completed_projects,
    total_applications = EXCLUDED.total_applications,
    health_score = EXCLUDED.health_score,
    health_status = EXCLUDED.health_status,
    needs_attention = EXCLUDED.needs_attention,
    updated_at = NOW();
END;
$function$;

-- 7.b  assign_editor_to_project(): derivaba los tipos de contenido desde
--      marketplace_campaigns.content_requirements para el auto-match de
--      editor. Sin campañas, se pasa NULL a los selectores de editor
--      (ambos aceptan NULL y devuelven cualquier editor disponible).
--      El camino con p_editor_profile_id explícito no cambia.
CREATE OR REPLACE FUNCTION public.assign_editor_to_project(p_project_id uuid, p_editor_profile_id uuid DEFAULT NULL::uuid, p_assigned_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project RECORD;
  v_editor_id UUID;
  v_content_types TEXT[];
  v_payment_split RECORD;
BEGIN
  -- Obtener proyecto
  SELECT * INTO v_project FROM marketplace_projects WHERE id = p_project_id;

  IF v_project IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proyecto no encontrado');
  END IF;

  IF NOT v_project.requires_editor THEN
    RETURN jsonb_build_object('success', false, 'error', 'El proyecto no requiere editor');
  END IF;

  IF v_project.editor_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'El proyecto ya tiene editor asignado');
  END IF;

  -- Si se especificó un editor, usarlo
  IF p_editor_profile_id IS NOT NULL THEN
    v_editor_id := p_editor_profile_id;
  ELSE
    -- [DROP MÓDULO CAMPAÑAS] eliminado: los tipos de contenido se leían de
    -- marketplace_campaigns.content_requirements. Sin campañas no hay de
    -- dónde derivarlos, así que se busca entre todos los editores libres.
    v_content_types := NULL;

    -- Intentar asignar editor de la organización primero
    IF v_project.organization_id IS NOT NULL THEN
      v_editor_id := get_available_org_editor(v_project.organization_id, v_content_types);
    END IF;

    -- Si no hay editor de org, buscar en Kreoon
    IF v_editor_id IS NULL THEN
      v_editor_id := get_available_kreoon_editor(v_content_types);
    END IF;
  END IF;

  IF v_editor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay editores disponibles');
  END IF;

  -- Calcular división de pago
  SELECT * INTO v_payment_split
  FROM calculate_payment_split(v_project.total_price, true);

  -- Actualizar proyecto
  UPDATE marketplace_projects
  SET
    editor_id = v_editor_id,
    editor_assigned_at = NOW(),
    editor_assigned_by = p_assigned_by,
    creator_payout = v_payment_split.creator_payout,
    editor_payout = v_payment_split.editor_payout,
    platform_fee = v_payment_split.platform_fee
  WHERE id = p_project_id;

  -- Actualizar contador de proyectos del editor
  UPDATE kreoon_editors
  SET current_projects_count = current_projects_count + 1,
      last_assigned_at = NOW()
  WHERE creator_profile_id = v_editor_id;

  UPDATE organization_editors
  SET current_projects_count = current_projects_count + 1
  WHERE creator_profile_id = v_editor_id
    AND organization_id = v_project.organization_id;

  RETURN jsonb_build_object(
    'success', true,
    'editor_id', v_editor_id,
    'creator_payout', v_payment_split.creator_payout,
    'editor_payout', v_payment_split.editor_payout
  );
END;
$function$;

-- =====================================================================
-- 8. TABLAS — ORDEN TOPOLÓGICO (hojas primero), SIN CASCADE
-- =====================================================================
-- Dependencias internas verificadas en pg_constraint:
--   publication_verification_queue -> activation_publications
--   activation_publications        -> marketplace_campaigns, campaign_applications, campaign_deliverables
--   campaign_deliverables          -> marketplace_campaigns, campaign_applications
--   campaign_applications          -> marketplace_campaigns
--   campaign_case_studies          -> marketplace_campaigns
--   campaign_invitations           -> marketplace_campaigns
--   campaign_media                 -> marketplace_campaigns
--   campaign_notifications         -> marketplace_campaigns
--   marketplace_campaigns          -> campaign_templates
--   campaign_metrics               -> campaign_mappings (SE QUEDA, referidos)
--   managed_campaign_subscriptions -> ninguna del módulo
--
-- Los triggers y los índices de cada tabla caen con ella.

DROP TABLE IF EXISTS public.publication_verification_queue;
DROP TABLE IF EXISTS public.activation_publications;
DROP TABLE IF EXISTS public.campaign_deliverables;
DROP TABLE IF EXISTS public.campaign_case_studies;
DROP TABLE IF EXISTS public.campaign_invitations;
DROP TABLE IF EXISTS public.campaign_media;
DROP TABLE IF EXISTS public.campaign_notifications;
DROP TABLE IF EXISTS public.campaign_metrics;
DROP TABLE IF EXISTS public.managed_campaign_subscriptions;
DROP TABLE IF EXISTS public.campaign_applications;
DROP TABLE IF EXISTS public.marketplace_campaigns;
DROP TABLE IF EXISTS public.campaign_templates;

-- =====================================================================
-- 9. FUNCIONES DE TRIGGER — DESPUÉS DE LAS TABLAS
-- =====================================================================
-- Sus triggers ya cayeron con las tablas del paso 8.
--   auto_campaign_slug                    -> marketplace_campaigns
--   auto_set_campaign_commission          -> marketplace_campaigns
--   auto_generate_case_study              -> marketplace_campaigns
--   update_campaign_application_count     -> campaign_applications
--   trg_guard_campaign_application_update -> campaign_applications
--
-- NO se tocan handle_updated_at(), update_updated_at_column() ni
-- update_updated_at(): son compartidas por decenas de tablas vivas.
DROP FUNCTION IF EXISTS public.auto_campaign_slug();
DROP FUNCTION IF EXISTS public.auto_set_campaign_commission();
DROP FUNCTION IF EXISTS public.auto_generate_case_study();
DROP FUNCTION IF EXISTS public.update_campaign_application_count();
DROP FUNCTION IF EXISTS public.trg_guard_campaign_application_update();

-- =====================================================================
-- 10. ENUMS HUÉRFANOS
-- =====================================================================
-- Verificado: 0 columnas fuera del módulo usaban estos 3 tipos.
-- NO se toca ad_campaign_status — lo usan 3 columnas de marketing_campaigns.
DROP TYPE IF EXISTS public.campaign_status;
DROP TYPE IF EXISTS public.application_status;
DROP TYPE IF EXISTS public.publication_verification_status;

COMMIT;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
--
-- Esta migración no tiene un `down` automático. Para revertirla:
--
-- 1. ESTRUCTURA — reconstruir en este orden desde el respaldo de schema
--    en backups/pre-simplificacion/schema/:
--      01_tables.sql       -> las 12 tablas del módulo
--      02_constraints.sql  -> PKs, FKs internas y las 5 FKs entrantes
--                             (incluye las columnas marketplace_media.campaign_id
--                              y brand_credit_transactions.related_campaign_id
--                              eliminadas en el paso 4.b, que hay que volver
--                              a añadir con ALTER TABLE ... ADD COLUMN antes
--                              de recrear su constraint)
--      03_indexes.sql      -> índices
--      04_policies.sql     -> las 33 políticas del módulo Y las 2 versiones
--                             originales de marketplace_projects (hay que
--                             soltar antes las 2 recreadas en el paso 1.c)
--      05_triggers.sql     -> los 11 triggers
--    Los 3 enums (campaign_status, application_status,
--    publication_verification_status) se recrean dentro de 01_tables.sql.
--
--    NOTA: el respaldo NO incluye un functions.sql. Las 21 funciones
--    eliminadas y las 2 reescritas hay que recuperarlas del historial de
--    git (`git log -p supabase/migrations/`) o del propio commit que
--    introduce esta migración, que conserva el cuerpo original de
--    sync_user_health() y assign_editor_to_project() en su diff.
--    backups/pre-simplificacion/schema/06_dependencias.md documenta el
--    grafo de dependencias.
--
-- 2. DATOS — restaurar los 14 registros desde
--    backups/pre-simplificacion/marketplace-campanas/
--    (marketplace_campaigns.json = 8 filas, campaign_templates.json = 6
--     filas; los otros 10 archivos están vacíos). Cargar campaign_templates
--    ANTES que marketplace_campaigns por la FK template_id.
--    Los archivos campaign_mappings.*, campaign_redemptions.* y
--    promotional_campaigns.* de esa carpeta son del sistema de REFERIDOS:
--    esas tablas nunca se tocaron, no restaurarlas.
--
-- 3. Regenerar src/integrations/supabase/types.ts.
-- =====================================================================
