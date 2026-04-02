// Layout & estructura principal
export { default as CreatorProfilePage } from './CreatorProfilePage';
export { CreatorProfileSkeleton } from './CreatorProfileSkeleton';
export { CreatorHeader } from './CreatorHeader';

// Secciones de contenido
export { AboutSection } from './AboutSection';
export { ServicesSection } from './ServicesSection';
export { StatsSection } from './StatsSection';
export { ReviewsSection } from './ReviewsSection';
export { SimilarCreators } from './SimilarCreators';

// Portfolio
export { PortfolioGallery } from './PortfolioGallery';
export { PortfolioGrid } from './PortfolioGrid';
export { GalleryLightbox } from './GalleryLightbox';

// Sidebar y precios
export { PricingSidebar } from './PricingSidebar';

// Customización de perfil
export { ProfileCustomizer } from './ProfileCustomizer';
export { ColorPaletteSelector } from './ColorPaletteSelector';
export { PortfolioLayoutSelector } from './PortfolioLayoutSelector';

// Trust & métricas
export { TrustBadges, CreatorMetrics } from './TrustBadges';
export type { CreatorTrustStats } from './TrustBadges';

// Score y optimización (nuevos)
export { ProfileScoreMeter } from './ProfileScoreMeter';
export type { ProfileScoreMeterProps } from './ProfileScoreMeter';
// Re-export ProfileScoreBreakdown desde su fuente canónica
export type { ProfileScoreBreakdown, ProfileScoreStatus } from '@/lib/marketplace/rankingAlgorithm';

export { ProfileOptimizationTips } from './ProfileOptimizationTips';
export type {
  ProfileOptimizationTipsProps,
  OptimizationTip,
  OptimizationTipStatus,
} from './ProfileOptimizationTips';

// Modales y acciones
export { RecruitCreatorDialog } from './RecruitCreatorDialog';
export { OrgInviteModal } from './OrgInviteModal';

// Conexión de redes sociales
export { InstagramConnect } from './InstagramConnect';
export { TikTokConnect } from './TikTokConnect';
