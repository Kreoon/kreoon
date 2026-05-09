-- =============================================================================
-- MIGRACIÓN: Security RLS Fixes - Fase 3 (Tablas sin políticas)
-- Fecha: 2026-05-08
-- Issue: rls_enabled_no_policy — 74 tablas con RLS activo pero sin políticas
--        (todo acceso bloqueado → funcionalidades rotas en producción)
--
-- Organización por patrón de acceso:
--   P1: user_id directo
--   P2: organization_id (miembro de org)
--   P3: user_id + organization_id combinado
--   P4: JOIN a tabla padre (contratos, propuestas)
--   P5: JOIN a secuencia/campaña (email marketing)
--   P6: Tablas de referencia y casos especiales
--   P7: Particiones tracking_events_* (DO loop)
-- =============================================================================


-- =============================================================================
-- PATRÓN 1: Acceso directo por user_id = auth.uid()
-- =============================================================================

-- marketplace_favorites: usuario marca favoritos
CREATE POLICY "Users manage own favorites"
  ON public.marketplace_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- marketplace_notifications: notificaciones propias
CREATE POLICY "Users manage own marketplace notifications"
  ON public.marketplace_notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- marketplace_verifications: verificaciones de identidad propias
CREATE POLICY "Users manage own verifications"
  ON public.marketplace_verifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- creator_payout_settings: configuración de cobro propia
CREATE POLICY "Users manage own payout settings"
  ON public.creator_payout_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- creator_notification_preferences: preferencias de notificación propias
CREATE POLICY "Users manage own notification preferences"
  ON public.creator_notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- saved_searches: búsquedas guardadas propias
CREATE POLICY "Users manage own saved searches"
  ON public.saved_searches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- social_metrics_snapshots: métricas sociales propias
CREATE POLICY "Users manage own social metrics"
  ON public.social_metrics_snapshots FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- up_quest_progress: progreso en quests propio
CREATE POLICY "Users manage own quest progress"
  ON public.up_quest_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- campaign_notifications: notificaciones de campaña propias
CREATE POLICY "Users manage own campaign notifications"
  ON public.campaign_notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- =============================================================================
-- PATRÓN 2: Acceso por organización (miembro de la org)
-- =============================================================================

-- email_campaigns: campañas de email por org
CREATE POLICY "Org members manage email campaigns"
  ON public.email_campaigns FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- email_templates: plantillas de email por org
CREATE POLICY "Org members manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- email_segments: segmentos de email por org
CREATE POLICY "Org members manage email segments"
  ON public.email_segments FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- email_drip_sequences: secuencias drip por org
CREATE POLICY "Org members manage drip sequences"
  ON public.email_drip_sequences FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- organization_client_payments: pagos de clientes de la org
CREATE POLICY "Org members view client payments"
  ON public.organization_client_payments FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners manage client payments"
  ON public.organization_client_payments FOR INSERT UPDATE DELETE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- organization_payment_gateways: pasarelas de pago de la org
CREATE POLICY "Org members view payment gateways"
  ON public.organization_payment_gateways FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners manage payment gateways"
  ON public.organization_payment_gateways FOR INSERT UPDATE DELETE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- organization_payment_settings: configuración de pagos de la org
CREATE POLICY "Org members view payment settings"
  ON public.organization_payment_settings FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners manage payment settings"
  ON public.organization_payment_settings FOR INSERT UPDATE DELETE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- organization_payout_methods: métodos de pago a equipo de la org
CREATE POLICY "Org members view payout methods"
  ON public.organization_payout_methods FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners manage payout methods"
  ON public.organization_payout_methods FOR INSERT UPDATE DELETE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- campaign_media: media de campañas por org
CREATE POLICY "Org members manage campaign media"
  ON public.campaign_media FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- up_event_types: tipos de eventos de gamificación por org
CREATE POLICY "Org members view up event types"
  ON public.up_event_types FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Platform root manages up event types"
  ON public.up_event_types FOR INSERT UPDATE DELETE TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));

-- up_quests: quests de gamificación por org
CREATE POLICY "Org members view up quests"
  ON public.up_quests FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners manage up quests"
  ON public.up_quests FOR INSERT UPDATE DELETE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- up_permissions: permisos de gamificación por org
CREATE POLICY "Org members view up permissions"
  ON public.up_permissions FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Platform root manages up permissions"
  ON public.up_permissions FOR INSERT UPDATE DELETE TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));

-- up_quality_scores: scores de calidad por org
CREATE POLICY "Org members view quality scores"
  ON public.up_quality_scores FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "System manages quality scores"
  ON public.up_quality_scores FOR INSERT UPDATE DELETE TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));


-- =============================================================================
-- PATRÓN 3: user_id + organization_id combinado
-- =============================================================================

-- ai_match_history: historial de matching IA (propio o de su org)
CREATE POLICY "Users view own ai match history"
  ON public.ai_match_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "System inserts ai match history"
  ON public.ai_match_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- custom_pricing_agreements: acuerdos de precios personalizados
CREATE POLICY "Users view own pricing agreements"
  ON public.custom_pricing_agreements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners manage pricing agreements"
  ON public.custom_pricing_agreements FOR INSERT UPDATE DELETE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- payment_transactions: transacciones de pago (propias o de su org)
CREATE POLICY "Users view own payment transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "System manages payment transactions"
  ON public.payment_transactions FOR INSERT UPDATE TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_org_member(auth.uid(), organization_id));

-- organization_team_payments: pagos a miembros del equipo
CREATE POLICY "Org members view team payments"
  ON public.organization_team_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners manage team payments"
  ON public.organization_team_payments FOR INSERT UPDATE DELETE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- up_currency_conversions: conversiones de moneda del sistema UP
CREATE POLICY "Users view own up currency conversions"
  ON public.up_currency_conversions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "System manages up currency conversions"
  ON public.up_currency_conversions FOR INSERT UPDATE TO authenticated
  WITH CHECK (user_id = auth.uid());

-- up_season_snapshots: snapshots de temporada de gamificación
CREATE POLICY "Users view own season snapshots"
  ON public.up_season_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "System manages season snapshots"
  ON public.up_season_snapshots FOR INSERT UPDATE TO authenticated
  WITH CHECK (is_platform_root(auth.uid()));

-- up_fraud_alerts: alertas de fraude (solo admins ven)
CREATE POLICY "Platform root manages fraud alerts"
  ON public.up_fraud_alerts FOR ALL TO authenticated
  USING (is_platform_root(auth.uid()) OR user_id = auth.uid())
  WITH CHECK (is_platform_root(auth.uid()));


-- =============================================================================
-- PATRÓN 4: JOIN a tabla padre (contratos/propuestas marketplace)
-- =============================================================================

-- marketplace_contracts: contrato entre org (cliente) y creator
CREATE POLICY "Contract parties view contracts"
  ON public.marketplace_contracts FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Org members create contracts"
  ON public.marketplace_contracts FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Contract parties update contracts"
  ON public.marketplace_contracts FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    OR is_org_member(auth.uid(), organization_id)
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR is_org_member(auth.uid(), organization_id)
  );

-- marketplace_contract_deliverables: entregables via contrato
CREATE POLICY "Contract parties view deliverables"
  ON public.marketplace_contract_deliverables FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = marketplace_contract_deliverables.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
  );

CREATE POLICY "Contract parties manage deliverables"
  ON public.marketplace_contract_deliverables FOR INSERT UPDATE DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = marketplace_contract_deliverables.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = marketplace_contract_deliverables.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
  );

-- marketplace_contract_messages: mensajes de contrato
CREATE POLICY "Contract parties view messages"
  ON public.marketplace_contract_messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = marketplace_contract_messages.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
  );

CREATE POLICY "Contract parties send messages"
  ON public.marketplace_contract_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = marketplace_contract_messages.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
  );

-- marketplace_payments: pagos de contratos
CREATE POLICY "Contract parties view payments"
  ON public.marketplace_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = marketplace_payments.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
  );

CREATE POLICY "Org members create payments"
  ON public.marketplace_payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = marketplace_payments.contract_id
      AND is_org_member(auth.uid(), mc.organization_id)
    )
  );

-- payment_disputes: disputas via contrato o transacción
CREATE POLICY "Users view own payment disputes"
  ON public.payment_disputes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = payment_disputes.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
    OR EXISTS (
      SELECT 1 FROM public.payment_transactions pt
      WHERE pt.id = payment_disputes.transaction_id
      AND (pt.user_id = auth.uid() OR is_org_member(auth.uid(), pt.organization_id))
    )
  );

CREATE POLICY "Users create payment disputes"
  ON public.payment_disputes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = payment_disputes.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
  );

-- marketplace_proposals: propuestas entre org y creator
CREATE POLICY "Proposal parties view proposals"
  ON public.marketplace_proposals FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Org members create proposals"
  ON public.marketplace_proposals FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Proposal parties update proposals"
  ON public.marketplace_proposals FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    OR is_org_member(auth.uid(), organization_id)
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR is_org_member(auth.uid(), organization_id)
  );

-- marketplace_proposal_messages: mensajes de propuesta
CREATE POLICY "Proposal parties view proposal messages"
  ON public.marketplace_proposal_messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_proposals mp
      WHERE mp.id = marketplace_proposal_messages.proposal_id
      AND (mp.creator_id = auth.uid() OR is_org_member(auth.uid(), mp.organization_id))
    )
  );

CREATE POLICY "Proposal parties send proposal messages"
  ON public.marketplace_proposal_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.marketplace_proposals mp
      WHERE mp.id = marketplace_proposal_messages.proposal_id
      AND (mp.creator_id = auth.uid() OR is_org_member(auth.uid(), mp.organization_id))
    )
  );

-- marketplace_reviews: reseñas via contrato
CREATE POLICY "Users view marketplace reviews"
  ON public.marketplace_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = marketplace_reviews.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
  );

CREATE POLICY "Contract parties write reviews"
  ON public.marketplace_reviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_contracts mc
      WHERE mc.id = marketplace_reviews.contract_id
      AND (mc.creator_id = auth.uid() OR is_org_member(auth.uid(), mc.organization_id))
    )
  );


-- =============================================================================
-- PATRÓN 5: JOIN a secuencia/campaña (email marketing)
-- =============================================================================

-- email_drip_steps: pasos de secuencia drip via sequence_id
CREATE POLICY "Org members manage drip steps"
  ON public.email_drip_steps FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_drip_sequences eds
      WHERE eds.id = email_drip_steps.sequence_id
      AND is_org_member(auth.uid(), eds.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_drip_sequences eds
      WHERE eds.id = email_drip_steps.sequence_id
      AND is_org_member(auth.uid(), eds.organization_id)
    )
  );

-- email_drip_enrollments: inscripciones a secuencias drip
CREATE POLICY "Org members view drip enrollments"
  ON public.email_drip_enrollments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_drip_sequences eds
      WHERE eds.id = email_drip_enrollments.sequence_id
      AND is_org_member(auth.uid(), eds.organization_id)
    )
  );

CREATE POLICY "System manages drip enrollments"
  ON public.email_drip_enrollments FOR INSERT UPDATE DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_drip_sequences eds
      WHERE eds.id = email_drip_enrollments.sequence_id
      AND is_org_member(auth.uid(), eds.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_drip_sequences eds
      WHERE eds.id = email_drip_enrollments.sequence_id
      AND is_org_member(auth.uid(), eds.organization_id)
    )
  );

-- email_events: eventos de email via campaña
CREATE POLICY "Org members view email events"
  ON public.email_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_campaigns ec
      WHERE ec.id = email_events.campaign_id
      AND is_org_member(auth.uid(), ec.organization_id)
    )
  );

CREATE POLICY "System inserts email events"
  ON public.email_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_campaigns ec
      WHERE ec.id = email_events.campaign_id
      AND is_org_member(auth.uid(), ec.organization_id)
    )
  );


-- =============================================================================
-- PATRÓN 6: Tablas de referencia y casos especiales
-- =============================================================================

-- currency_conversions: tasas de cambio (referencia global, sin owner)
CREATE POLICY "Authenticated can read currency conversions"
  ON public.currency_conversions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System manages currency conversions"
  ON public.currency_conversions FOR INSERT UPDATE DELETE TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));

-- marketplace_industries: catálogo de industrias (referencia)
CREATE POLICY "Authenticated can read marketplace industries"
  ON public.marketplace_industries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Platform root manages industries"
  ON public.marketplace_industries FOR INSERT UPDATE DELETE TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));

-- data_deletion_requests: solicitudes de eliminación GDPR (anon INSERT)
CREATE POLICY "Anyone can request data deletion"
  ON public.data_deletion_requests FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Platform root views deletion requests"
  ON public.data_deletion_requests FOR SELECT TO authenticated
  USING (is_platform_root(auth.uid()) OR user_id = auth.uid());

-- content_reports: reportes de contenido
CREATE POLICY "Authenticated can report content"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Platform root views content reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (is_platform_root(auth.uid()) OR reporter_id = auth.uid());

-- profile_views: vistas de perfiles (sistemas de analytics)
CREATE POLICY "Profile owner views their profile views"
  ON public.profile_views FOR SELECT TO authenticated
  USING (profile_user_id = auth.uid() OR viewer_id = auth.uid());

CREATE POLICY "System inserts profile views"
  ON public.profile_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- up_settings: configuración global de gamificación (sin owner)
CREATE POLICY "Authenticated can read up settings"
  ON public.up_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Platform root manages up settings"
  ON public.up_settings FOR INSERT UPDATE DELETE TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));

-- video_hashes: hashes de video (deduplicación), acceso por quien creó
CREATE POLICY "Users view own video hashes"
  ON public.video_hashes FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_platform_root(auth.uid()));

CREATE POLICY "Users insert video hashes"
  ON public.video_hashes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- prompt_test_cases: casos de prueba de prompts (solo platform root)
CREATE POLICY "Platform root manages prompt test cases"
  ON public.prompt_test_cases FOR ALL TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));


-- =============================================================================
-- PATRÓN 7: Particiones tracking_events_* (DO loop)
-- Estructura: organization_id, user_id, is_sensitive
-- Política: org members ven eventos de su org (no sensibles)
--           users ven sus propios eventos
--           platform_root ve todo
-- =============================================================================

DO $$
DECLARE
  partition_name text;
  partitions text[] := ARRAY[
    'tracking_events_2024_12',
    'tracking_events_2025_01', 'tracking_events_2025_02', 'tracking_events_2025_03',
    'tracking_events_2025_04', 'tracking_events_2025_05', 'tracking_events_2025_06',
    'tracking_events_2025_07', 'tracking_events_2025_08', 'tracking_events_2025_09',
    'tracking_events_2025_10', 'tracking_events_2025_11', 'tracking_events_2025_12',
    'tracking_events_2026_01', 'tracking_events_2026_02', 'tracking_events_2026_03',
    'tracking_events_2026_04', 'tracking_events_2026_05', 'tracking_events_2026_06',
    'tracking_events_2026_07', 'tracking_events_2026_08', 'tracking_events_2026_09',
    'tracking_events_2026_10', 'tracking_events_2026_11', 'tracking_events_2026_12'
  ];
BEGIN
  FOREACH partition_name IN ARRAY partitions LOOP
    -- Solo crear políticas si la tabla existe
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = partition_name
    ) THEN
      -- Usuarios ven sus propios eventos o los de su org (no sensibles)
      EXECUTE format(
        'CREATE POLICY "Org members view tracking events" ON public.%I FOR SELECT TO authenticated
         USING (
           user_id = auth.uid()
           OR (is_org_member(auth.uid(), organization_id) AND (is_sensitive IS NULL OR is_sensitive = false))
           OR is_platform_root(auth.uid())
         )',
        partition_name
      );
      -- Solo sistema inserta eventos de tracking
      EXECUTE format(
        'CREATE POLICY "System inserts tracking events" ON public.%I FOR INSERT TO authenticated
         WITH CHECK (user_id = auth.uid() OR is_platform_root(auth.uid()))',
        partition_name
      );
    END IF;
  END LOOP;
END$$;


-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN:
-- =============================================================================
-- SELECT relname, relrowsecurity,
--        (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public') AS num_politicas
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relrowsecurity = true
-- AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public')
-- ORDER BY relname;
-- Esperado: 0 filas (todas las tablas con RLS deben tener al menos 1 política)
