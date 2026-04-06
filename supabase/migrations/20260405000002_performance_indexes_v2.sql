-- Migration: Performance Indexes v2
-- Date: 2026-04-05
-- Author: Alexander Cast
-- Objetivo: Mejorar performance de queries frecuentes en marketplace,
--           reviews, notificaciones y contenido activo.

-- ============================================================
-- Índices para creator_reviews
-- Usados en: marketplace, perfiles de creador, reviews públicas
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_creator_reviews_reviewer_id
  ON creator_reviews(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_creator_reviews_created_at
  ON creator_reviews(created_at DESC);

-- Índice parcial: solo filas con project_id definido
CREATE INDEX IF NOT EXISTS idx_creator_reviews_project_id
  ON creator_reviews(project_id)
  WHERE project_id IS NOT NULL;

-- ============================================================
-- Índices para review_requests
-- Usados en: solicitudes de reseña, expiración automática
-- ============================================================

-- Índice parcial: solo solicitudes pendientes con fecha de expiración
CREATE INDEX IF NOT EXISTS idx_review_requests_expires_at
  ON review_requests(expires_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_review_requests_created_at
  ON review_requests(created_at DESC);

-- ============================================================
-- Índices para marketplace
-- Usados en: búsqueda de proyectos, filtros por estado
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_marketplace_projects_creator_status
  ON marketplace_projects(creator_id, status);

-- Índice parcial: solo ítems de portafolio públicos
CREATE INDEX IF NOT EXISTS idx_portfolio_items_creator_public
  ON portfolio_items(creator_id, is_public)
  WHERE is_public = true;

-- ============================================================
-- Índice para soft deletes en content
-- Optimiza listado de contenido activo por organización
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_content_not_deleted
  ON content(organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================
-- Índice para notificaciones
-- Usados en: panel de notificaciones del usuario
-- ============================================================

-- Índice parcial: solo notificaciones no leídas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- ============================================================
-- Comentarios de auditoría
-- ============================================================
COMMENT ON INDEX idx_creator_reviews_reviewer_id IS 'Performance: búsqueda de reviews por reviewer';
COMMENT ON INDEX idx_marketplace_projects_creator_status IS 'Performance: filtrado de proyectos por creador y estado';
COMMENT ON INDEX idx_content_not_deleted IS 'Performance: listado de contenido activo por org';
COMMENT ON INDEX idx_portfolio_items_creator_public IS 'Performance: listado de portafolios públicos por creador';
COMMENT ON INDEX idx_notifications_user_unread IS 'Performance: panel de notificaciones no leídas por usuario';
