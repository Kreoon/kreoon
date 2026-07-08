-- FASE 2 del aislamiento del marketplace por org: barrido de organization_id
-- en las tablas del dominio marketplace/campaña que representan TRABAJO o
-- INTERACCIÓN dentro de una org y no lo tenían.
--
-- Las 14 tablas tienen 0 filas en producción (el marketplace transaccional
-- nunca se usó), así que NO requieren backfill. Se agrega la columna
-- nullable + FK + índice: deja lista la separación por org para cuando esas
-- features se reactiven, sin romper inserts existentes ni tocar las RLS
-- actuales. El dev que reactive cada feature llenará org_id (idealmente
-- derivándolo del padre: campaign→org, contract→org, project→org).
--
-- EXCLUIDAS a propósito (globales del talento, NO llevan org_id): wallets y
-- transacciones del creador (creator_wallets, creator_wallet_transactions,
-- unified_transactions, live_hour_wallets), perfil/servicios/portafolio/DNA
-- del talento, reputación y verificaciones del talento, y catálogos
-- (campaign_templates, marketplace_industries, marketplace_media).

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'campaign_applications',
    'campaign_deliverables',
    'campaign_invitations',
    'campaign_metrics',
    'campaign_redemptions',
    'campaign_mappings',
    'campaign_notifications',
    'creator_reviews',
    'marketplace_contract_deliverables',
    'marketplace_contract_messages',
    'marketplace_interactions',
    'marketplace_payments',
    'marketplace_proposal_messages',
    'marketplace_reviews'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_org ON public.%I (organization_id)',
      t, t
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
