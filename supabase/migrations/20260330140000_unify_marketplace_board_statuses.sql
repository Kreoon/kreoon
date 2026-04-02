-- =============================================================================
-- Migración: Unificar estados del Marketplace con estados del Board de Org
-- Fecha: 30 de marzo de 2026
-- Descripción: Agregar estados faltantes al enum marketplace_project_status
--              para que el marketplace use los mismos estados que el board
-- =============================================================================

-- El enum marketplace_project_status actual tiene:
-- pending, briefing, in_progress, review, revision, approved, completed, cancelled

-- Los estados del board de organización son:
-- draft, script_pending, script_approved, assigned, recording, recorded,
-- editing, delivered, issue, corrected, approved, paid, en_campaa

-- Mapeo: Agregamos los estados de org que faltan en marketplace

-- 1. Agregar estados faltantes al enum (PostgreSQL solo permite ADD, no reorder)
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'script_pending';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'script_approved';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'recording';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'recorded';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'editing';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'issue';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'corrected';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.marketplace_project_status ADD VALUE IF NOT EXISTS 'en_campaa';
