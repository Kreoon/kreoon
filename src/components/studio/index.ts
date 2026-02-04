// ============================================
// COMPONENTES DE "EL ESTUDIO" - Sistema de Gamificación
// ============================================

// Gamificación y niveles
export { LevelBadge } from './LevelBadge';
export { CreditsDisplay, CreditsDisplayCompact } from './CreditsDisplay';
export { RatingStars, RatingStarsInline } from './RatingStars';
export { ProgressToNextLevel } from './ProgressToNextLevel';
export { AchievementCard } from './AchievementCard';
export { AchievementToast, AchievementToastProvider, useAchievementToast } from './AchievementToast';

// Rankings y temporadas
export { RankingTable } from './RankingTable';
export { SeasonBanner } from './SeasonBanner';

// Contenido y producciones
export { ContentStatusBadge, ContentStatusDot } from './ContentStatusBadge';
export { ProductionCard } from './ProductionCard';

// UI compartida
export { QuickActions } from './QuickActions';
export { RecentActivityFeed } from './RecentActivityFeed';

// Re-exportar tipos y constantes útiles del sistema
export {
  // Constantes
  NIVELES,
  INSIGNIAS,
  ESTADOS_CONTENIDO,
  VOCABULARIO_ROL,
  ACCIONES_CREDITOS,
  STUDIO_COLORS,
  STUDIO_GRADIENTS,

  // Funciones helper
  getNivelActual,
  getProgresoNivel,
  getTemporadaActual,
  getMensajeVacio,
  getMensajeLogro,
} from '@/lib/studio-system';

// Re-exportar tipos
export type {
  NivelInfo,
  Insignia,
  InsigniaKey,
  EstadoContenido,
  EstadoInfo,
  RolUsuario,
} from '@/lib/studio-system';
