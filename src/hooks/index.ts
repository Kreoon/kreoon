/**
 * Hooks Index - Re-exports organizados por dominio
 *
 * Esta estructura facilita las importaciones y documenta la organización de hooks.
 *
 * Uso:
 *   import { useAuth } from '@/hooks';
 *   import { useBrand, useBrandMembers } from '@/hooks/brand';
 *   import { useContent } from '@/hooks/content';
 */

// ─── Auth & User ────────────────────────────────────────────────────────────
export { useAuth } from './useAuth';
export { useLegalConsent } from './useLegalConsent';
export { useAccountBlock } from './useAccountBlock';
export { useOrgOwner } from './useOrgOwner';

// ─── UI Utilities ───────────────────────────────────────────────────────────
export { useToast, toast } from './use-toast';
export { useMediaQuery } from './use-media-query';
export { useDebounce } from './useDebounce';
export { useAutoSave } from './useAutoSave';
export { useCurrentDevice } from './useCurrentDevice';
export { useDateRangePreset } from './useDateRangePreset';

// ─── Brand ──────────────────────────────────────────────────────────────────
export { useBrand } from './useBrand';
export { useBrandActivation } from './useBrandActivation';
export { useBrandClient } from './useBrandClient';
export { useBrandMembers } from './useBrandMembers';
export { useBrandSearch } from './useBrandSearch';
export { useInternalBrandClient } from './useInternalBrandClient';

// ─── Content ────────────────────────────────────────────────────────────────
export { useContent } from './useContent';
export { useContentAnalytics } from './useContentAnalytics';
export { useContentReport } from './useContentReport';
export { useContentTrash } from './useContentTrash';
export { useContentStatusWithUP } from './useContentStatusWithUP';
export { useInternalOrgContent } from './useInternalOrgContent';
export { useDraftManager } from './useDraftManager';
export { useHashtags } from './useHashtags';
export { useFeaturedMedia } from './useFeaturedMedia';

// ─── Board ──────────────────────────────────────────────────────────────────
export { useBoardAI } from './useBoardAI';
export { useBoardPersistence } from './useBoardPersistence';
export { useBoardSettings } from './useBoardSettings';
export { useBoardUserPreferences } from './useBoardUserPreferences';

// ─── Creator ────────────────────────────────────────────────────────────────
export { useCreatorAvailability } from './useCreatorAvailability';
export { useCreatorMarketplaceProfile } from './useCreatorMarketplaceProfile';
export { useCreatorMatching } from './useCreatorMatching';
export { useCreatorPlanFeatures } from './useCreatorPlanFeatures';
export { useCreatorProfile } from './useCreatorProfile';
export { useCreatorProfileBlocks } from './useCreatorProfileBlocks';
export { useCreatorPublicProfile } from './useCreatorPublicProfile';
export { useCreatorReviews } from './useCreatorReviews';
export { useCreatorServices } from './useCreatorServices';
export { useCreatorSocialStats } from './useCreatorSocialStats';
export { useCreatorStats } from './useCreatorStats';
export { useFollowersList } from './useFollowersList';

// ─── AI ─────────────────────────────────────────────────────────────────────
export { useAIModules } from './useAIModules';
export { useAITokens } from './useAITokens';
export { useCustomAIApi } from './useCustomAIApi';
export { useInterestExtractor } from './useInterestExtractor';
export { useKaeConfig } from './useKaeConfig';
export { useAdnResearchV3 } from './use-adn-research-v3';
export { useProductDNA } from './use-product-dna';

// ─── Marketplace ────────────────────────────────────────────────────────────
export { useMarketplaceCampaigns } from './useMarketplaceCampaigns';
export { useMarketplaceCreators } from './useMarketplaceCreators';
export { useMarketplaceEvents } from './useMarketplaceEvents';
export { useMarketplaceExplore } from './useMarketplaceExplore';
export { useMarketplaceFavorites } from './useMarketplaceFavorites';
export { useMarketplaceFilterOptions } from './useMarketplaceFilterOptions';
export { useMarketplaceNotifications } from './useMarketplaceNotifications';
export { useMarketplaceOrgInvitations } from './useMarketplaceOrgInvitations';
export { useMarketplacePayments } from './useMarketplacePayments';
export { useMarketplaceProjects } from './useMarketplaceProjects';
export { useMarketplaceProposals } from './useMarketplaceProposals';
export { useMarketplaceReadiness } from './useMarketplaceReadiness';
export { useMarketplaceRecommendations } from './useMarketplaceRecommendations';
export { useMarketplaceReviews } from './useMarketplaceReviews';
export { useMarketplaceSearch } from './useMarketplaceSearch';
export { useMarketplaceStats } from './useMarketplaceStats';
export { useMarketplaceAISearch } from './useMarketplaceAISearch';
export { useMarketplaceLCPPreload } from './useMarketplaceLCPPreload';

// ─── Campaign ───────────────────────────────────────────────────────────────
export { useCampaignDeliverables } from './useCampaignDeliverables';
export { useCampaignInvitations } from './useCampaignInvitations';
export { useCampaignNotifications } from './useCampaignNotifications';
export { useCampaignROI } from './useCampaignROI';

// ─── CRM ────────────────────────────────────────────────────────────────────
export { useCrm } from './useCrm';
export { useCrmCustomFields } from './useCrmCustomFields';
export { useCompanyProfile } from './useCompanyProfile';
export { useContactReveal } from './useContactReveal';
export { useClientDNA } from './useClientDNA';

// ─── Streaming ──────────────────────────────────────────────────────────────
export { useLiveHosting } from './useLiveHosting';
export { useLiveStream } from './useLiveStream';
export { useLiveViewer } from './useLiveViewer';
export { useHLSPlayer } from './useHLSPlayer';

// ─── Storage & Media ────────────────────────────────────────────────────────
export { useBunnyImageUpload } from './useBunnyImageUpload';
export { useBunnyStorage } from './useBunnyStorage';
export { useMediaLibrary } from './useMediaLibrary';
export { useAudioRecorder } from './useAudioRecorder';
export { useLinkPreview } from './useLinkPreview';

// ─── Portfolio ──────────────────────────────────────────────────────────────
export { usePortfolioItems } from './usePortfolioItems';

// ─── Analytics & Tracking ───────────────────────────────────────────────────
export { useAnalytics } from './useAnalytics';
export { useAdminDashboard } from './useAdminDashboard';
export { useGlobalRanking } from './useGlobalRanking';
export { useGlobalBadges } from './useGlobalBadges';
export { useAchievements } from './useAchievements';
export { useFeedEvents } from './useFeedEvents';

// ─── Client Portal ──────────────────────────────────────────────────────────
export { useClientActivityFeed } from './useClientActivityFeed';
export { useClientPaymentStatus } from './useClientPaymentStatus';
export { useClientPendingReviews } from './useClientPendingReviews';
export { useClientRealtimeContent } from './useClientRealtimeContent';
export { useClientRealtimeNotifications } from './useClientRealtimeNotifications';

// ─── Finance ────────────────────────────────────────────────────────────────
export { useFinance } from './useFinance';
export { useCurrency } from './useCurrency';

// ─── Ambassador ─────────────────────────────────────────────────────────────
export { useAmbassador } from './useAmbassador';
export { useJoinRequests } from './useJoinRequests';

// ─── Other ──────────────────────────────────────────────────────────────────
export { useDigitalSignature } from './useDigitalSignature';
export { useEmailMarketing } from './useEmailMarketing';
export { useLinkedInAds } from './useLinkedInAds';

// ─── Subdirectories ─────────────────────────────────────────────────────────
export * from './marketplace';
export * from './realtime';
export * from './unified';
