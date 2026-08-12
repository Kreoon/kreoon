// ============================================
// COMPONENTES DE "EL ESTUDIO"
// ============================================

// Créditos y ratings
export { CreditsDisplay, CreditsDisplayCompact } from './CreditsDisplay';
export { RatingStars, RatingStarsInline } from './RatingStars';

// Contenido y producciones
export { ContentStatusBadge, ContentStatusDot } from './ContentStatusBadge';
export { ProductionCard } from './ProductionCard';

// UI compartida
export { QuickActions } from './QuickActions';
export { RecentActivityFeed } from './RecentActivityFeed';

// Re-exportar tipos y constantes útiles del sistema
export {
  // Constantes
  ESTADOS_CONTENIDO,
  VOCABULARIO_ROL,
  ACCIONES_CREDITOS,
  STUDIO_COLORS,
  STUDIO_GRADIENTS,

  // Funciones helper
  getMensajeVacio,
} from '@/lib/studio-system';

// Re-exportar tipos
export type {
  EstadoContenido,
  EstadoInfo,
  RolUsuario,
} from '@/lib/studio-system';
