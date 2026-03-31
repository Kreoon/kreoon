-- =============================================================================
-- FIX: Marketplace RLS - PARTE 1: Agregar status 'open' al enum campaign_status
-- NOTA: Esta migración se aplicó en dos partes porque PostgreSQL requiere
-- commit del nuevo valor de enum antes de usarlo en otras sentencias.
-- =============================================================================

-- Agregar 'open' al enum campaign_status
-- 'open' representa una campaña publicada y receptiva a aplicaciones.
-- Es el estado previo a 'active' (cuando ya hay creators asignados).
ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'open' AFTER 'draft';
