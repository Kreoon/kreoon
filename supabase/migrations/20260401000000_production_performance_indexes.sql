-- Migration: Production performance indexes
-- Date: 2026-04-01
-- Author: Alexander Cast
--
-- Objetivo: Agregar índices críticos para mejorar el rendimiento en producción.
-- Se usa CREATE INDEX CONCURRENTLY para no bloquear lecturas/escrituras
-- durante la creación del índice en una base de datos activa.
--
-- IMPORTANTE: CONCURRENTLY no puede ejecutarse dentro de una transacción.
-- Aplicar con: psql -c "..." o desde el dashboard de Supabase (SQL Editor).

-- ============================================================
-- 1. campaign_invitations — RLS de marketplace
-- ============================================================

-- Índice compuesto para las políticas RLS que filtran por campaign_id
-- y invited_profile_id simultáneamente. La condición parcial (WHERE status IN ...)
-- reduce el tamaño del índice al excluir invitaciones rechazadas/expiradas.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_invitations_composite
  ON public.campaign_invitations(campaign_id, invited_profile_id)
  WHERE status IN ('pending', 'accepted');

-- Índice simple para lookups directos por perfil invitado (ej: "mis invitaciones").
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_invitations_invited
  ON public.campaign_invitations(invited_profile_id);

-- ============================================================
-- 2. chat_participants / chat_messages — RLS de chat
-- ============================================================

-- Índice compuesto para la política RLS que valida si un usuario
-- pertenece a una conversación antes de leer mensajes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_participants_user_conversation
  ON public.chat_participants(user_id, conversation_id);

-- Índice para cargar mensajes de una conversación ordenados por fecha
-- descendente (historial de chat). El orden DESC en el índice evita un
-- sort en memoria para las queries más comunes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_conversation_created
  ON public.chat_messages(conversation_id, created_at DESC);

-- ============================================================
-- 3. content — Filtros frecuentes en el Content Board
-- ============================================================

-- Filtro por estado del contenido (draft, in_review, approved, published, etc.).
-- Muy usado en el board y en dashboards de KPIs.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_status
  ON public.content(status);

-- Filtro por creador asignado al contenido.
-- Usado en vistas "mis contenidos" y métricas por creator.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_creator_id
  ON public.content(creator_id);

-- Filtro por editor asignado al contenido.
-- Usado en vistas "mis ediciones" y carga de trabajo por editor.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_editor_id
  ON public.content(editor_id);

-- Ordenamiento por fecha de creación descendente para listados paginados.
-- Evita full-scan + sort en la query más común del board.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_created_desc
  ON public.content(created_at DESC);

-- ============================================================
-- 4. user_specializations — Búsqueda de creadores por especialidad
-- ============================================================

-- Lookup de todas las especializaciones de un usuario específico.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_specializations_user
  ON public.user_specializations(user_id);

-- Búsqueda de todos los usuarios con una especialización dada
-- (ej: filtro "mostrar solo videógrafos" en el directorio de creadores).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_specializations_spec
  ON public.user_specializations(specialization);

-- ============================================================
-- 5. creator_profiles — Marketplace público
-- ============================================================

-- Índice parcial para el marketplace: solo indexa perfiles activos
-- y publicados. Reduce drásticamente el tamaño del índice vs. indexar
-- todos los perfiles, acelerando las búsquedas de la vitrina pública.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_creator_profiles_active_published
  ON public.creator_profiles(user_id)
  WHERE is_active = true AND is_published = true;

-- ============================================================
-- 6. profiles — Auth y lookups por email
-- ============================================================

-- Lookup por email en flujos de autenticación, invitaciones y
-- búsqueda de usuarios por parte de administradores.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email
  ON public.profiles(email);
