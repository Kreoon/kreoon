import { Suspense, lazy, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { ErrorBoundary } from "@/components/error";
import { useNewContentNotifications } from "@/hooks/useNewContentNotifications";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TalentGate } from "@/components/TalentGate";
import { AchievementNotificationProvider } from "@/components/points/AchievementNotificationProvider";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";
import { AICopilotProvider } from "@/contexts/AICopilotContext";
import { TrialProvider } from "@/contexts/TrialContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { StrategistClientProvider } from "@/contexts/StrategistClientContext";
import { KiroProvider } from "@/contexts/KiroContext";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { MarketplaceReadinessPopup } from "@/components/marketplace/MarketplaceReadinessPopup";
import { ThemeProvider } from "next-themes";
import { MainLayout } from "./components/layout/MainLayout";
import { MarketplaceLayout } from "./components/layout/MarketplacePublicLayout";

// Helper: detect chunk/module load failures (stale hashes after deploy)
function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk')
  );
}

// Lazy import wrapper that auto-reloads on stale chunk errors after deploy.
// Prevents users from seeing "Failed to fetch dynamically imported module" errors
// when old JS chunk hashes no longer exist on the server.
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(() =>
    importFn().catch((error) => {
      if (isChunkLoadError(error)) {
        // Prevent infinite reload loop: only reload once per 10 seconds
        const lastReload = sessionStorage.getItem('last-chunk-reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload) > 10000) {
          sessionStorage.setItem('last-chunk-reload', now.toString());
          window.location.reload();
        }
      }
      throw error;
    })
  );
}

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

// Lazy load all pages for code splitting (with auto-retry on stale chunks)
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const ContentBoard = lazyWithRetry(() => import("./pages/ContentBoard"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Content = lazyWithRetry(() => import("./pages/Content"));
const Creators = lazyWithRetry(() => import("./pages/Creators"));
const Scripts = lazyWithRetry(() => import("./pages/Scripts"));
const Clients = lazyWithRetry(() => import("./pages/Clients"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Team = lazyWithRetry(() => import("./pages/Team"));
const CreatorDashboard = lazyWithRetry(() => import("./pages/CreatorDashboard"));
const EditorDashboard = lazyWithRetry(() => import("./pages/EditorDashboard"));
const StrategistDashboard = lazyWithRetry(() => import("./pages/StrategistDashboard"));
const ClientDashboard = lazyWithRetry(() => import("./pages/ClientDashboard"));
const ClientContentBoard = lazyWithRetry(() => import("./pages/ClientContentBoard"));
const VideosPage = lazyWithRetry(() => import("./pages/portfolio/VideosPage"));
const SavedPage = lazyWithRetry(() => import("./pages/portfolio/SavedPage"));
const CompanyProfilePage = lazyWithRetry(() => import("./pages/portfolio/CompanyProfilePage"));
const PublicProfilePage = lazyWithRetry(() => import("./pages/portfolio/PublicProfilePage"));
const Ranking = lazyWithRetry(() => import("./pages/Ranking"));
const Unauthorized = lazyWithRetry(() => import("./pages/Unauthorized"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const NoCompany = lazyWithRetry(() => import("./pages/NoCompany"));
const NoOrganization = lazyWithRetry(() => import("./pages/NoOrganization"));
const PendingAccess = lazyWithRetry(() => import("./pages/PendingAccess"));
const WelcomeNewMember = lazyWithRetry(() => import("./pages/WelcomeNewMember"));
const UPDocumentation = lazyWithRetry(() => import("./pages/UPDocumentation"));
const OrgAuth = lazyWithRetry(() => import("./pages/OrgAuth"));
const HomePage = lazyWithRetry(() => import("./pages/HomePage"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const OrgRegister = lazyWithRetry(() => import("./pages/auth/OrgRegister"));
const Live = lazyWithRetry(() => import("./pages/Live"));
const Marketing = lazyWithRetry(() => import("./pages/Marketing"));
const ResearchLanding = lazyWithRetry(() => import("./pages/ResearchLanding"));
const OrgPortfolioPage = lazyWithRetry(() => import("./pages/OrgPortfolioPage"));
const OrgContentShowcase = lazyWithRetry(() => import("./pages/OrgContentShowcase"));
const CreatorProfilePage_Marketplace = lazyWithRetry(() => import("./components/marketplace/profile/CreatorProfilePage"));
const HiringWizardPage = lazyWithRetry(() => import("./pages/HiringWizardPage"));
const MarketplaceDashboard = lazyWithRetry(() => import("./pages/MarketplaceDashboard"));
const CampaignsFeedPage = lazyWithRetry(() => import("./pages/CampaignsFeedPage"));
const CampaignDetailPage = lazyWithRetry(() => import("./pages/CampaignDetailPage"));
const CampaignWizardPage = lazyWithRetry(() => import("./pages/CampaignWizardPage"));
const BrandCampaignsPage = lazyWithRetry(() => import("./pages/BrandCampaignsPage"));
const CreatorCampaignsPage = lazyWithRetry(() => import("./pages/CreatorCampaignsPage"));
const MarketplaceBrowse = lazyWithRetry(() => import("./components/marketplace/MarketplacePage"));
const OrgProfilePage_Marketplace = lazyWithRetry(() => import("./components/marketplace/org-profile/OrgProfilePage"));
const TalentListsPage = lazyWithRetry(() => import("./pages/marketplace/TalentListsPage"));
const TalentListDetailPage = lazyWithRetry(() => import("./pages/marketplace/TalentListDetailPage"));
const MarketplaceInvitationsPage = lazyWithRetry(() => import("./pages/marketplace/MarketplaceInvitationsPage"));
const MarketplaceInquiriesPage = lazyWithRetry(() => import("./pages/marketplace/MarketplaceInquiriesPage"));
const CampaignPaymentSuccessPage = lazyWithRetry(() => import("./pages/marketplace/CampaignPaymentSuccess"));
const CampaignPaymentCancelPage = lazyWithRetry(() => import("./pages/marketplace/CampaignPaymentCancel"));
const CreatorProfileSetup = lazyWithRetry(() => import("./pages/CreatorProfileSetup"));
const Unete = lazyWithRetry(() => import("./pages/Unete"));
const UneteTalento = lazyWithRetry(() => import("./pages/unete/talento"));
const UneteMarcas = lazyWithRetry(() => import("./pages/unete/marcas"));
const UneteOrganizaciones = lazyWithRetry(() => import("./pages/unete/organizaciones"));
// CRM Platform
const PlatformCRMDashboard = lazyWithRetry(() => import("./pages/crm/platform/PlatformCRMDashboard"));
const PlatformCRMLeads = lazyWithRetry(() => import("./pages/crm/platform/PlatformCRMLeads"));
const PlatformCRMOrganizations = lazyWithRetry(() => import("./pages/crm/platform/PlatformCRMOrganizations"));
const PlatformCRMCreators = lazyWithRetry(() => import("./pages/crm/platform/PlatformCRMCreators"));
const PlatformCRMUsers = lazyWithRetry(() => import("./pages/crm/platform/PlatformCRMUsers"));
const PlatformCRMFinances = lazyWithRetry(() => import("./pages/crm/platform/PlatformCRMFinances"));
const PlatformCRMEmailMarketing = lazyWithRetry(() => import("./pages/crm/platform/PlatformCRMEmailMarketing"));
const BrandsCRM = lazyWithRetry(() => import("./pages/crm/BrandsCRM"));
const BrandDetail = lazyWithRetry(() => import("./pages/crm/BrandDetail"));
const PlatformCRMCommunities = lazyWithRetry(() => import("./pages/crm/platform/PlatformCRMCommunities"));
// CRM Org
const OrgCRMDashboard = lazyWithRetry(() => import("./pages/crm/org/OrgCRMDashboard"));
const OrgCRMPipelines = lazyWithRetry(() => import("./pages/crm/org/OrgCRMPipelines"));
const OrgCRMFinances = lazyWithRetry(() => import("./pages/crm/org/OrgCRMFinances"));
// Unified pages (Talent + Clients)
const UnifiedTalentPage = lazyWithRetry(() => import("./pages/UnifiedTalentPage"));
const UnifiedClientsPage = lazyWithRetry(() => import("./pages/UnifiedClientsPage"));

// KAE Analytics
const KAEAnalyticsDashboard = lazyWithRetry(() => import("./components/admin/analytics/KAEDashboard"));

// Subscription pages
const ReferralLanding = lazyWithRetry(() => import("./pages/ReferralLanding"));
const UnlockAccess = lazyWithRetry(() => import("./pages/UnlockAccess"));
const WelcomeTalent = lazyWithRetry(() => import("./pages/WelcomeTalent"));
const OnboardingProfile = lazyWithRetry(() => import("./pages/OnboardingProfile"));
const SubscriptionSuccess = lazyWithRetry(() => import("./pages/subscription/SubscriptionSuccess"));
const SubscriptionCancel = lazyWithRetry(() => import("./pages/subscription/SubscriptionCancel"));
const PlanesPage = lazyWithRetry(() => import("./pages/PlanesPage"));
const FreelancerDashboard = lazyWithRetry(() => import("./pages/FreelancerDashboard"));
const PartnerCommunityLanding = lazyWithRetry(() => import("./pages/PartnerCommunityLanding"));

// Campaign Optimization pages
const UGCPriceCalculator = lazyWithRetry(() => import("./components/marketplace/calculator/UGCPriceCalculator"));
const CaseStudies = lazyWithRetry(() => import("./pages/CaseStudies"));
const CaseStudyDetail = lazyWithRetry(() => import("./pages/CaseStudyDetail"));

// Legal pages
const PrivacyPolicy = lazyWithRetry(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/legal/TermsOfService"));
const DataDeletion = lazyWithRetry(() => import("./pages/legal/DataDeletion"));

// Wallet Module Pages
const WalletPage = lazyWithRetry(() => import("./modules/wallet/pages/WalletPage").then(m => ({ default: m.WalletPage })));
const TransactionsPage = lazyWithRetry(() => import("./modules/wallet/pages/TransactionsPage").then(m => ({ default: m.TransactionsPage })));
const WithdrawalsPage = lazyWithRetry(() => import("./modules/wallet/pages/WithdrawalsPage").then(m => ({ default: m.WithdrawalsPage })));
const AdminWalletsPage = lazyWithRetry(() => import("./modules/wallet/pages/AdminWalletsPage").then(m => ({ default: m.AdminWalletsPage })));

// Social Hub Module
const SocialHubPage = lazy(() => import("./modules/social/pages/SocialHubPage"));
const MarketingAdsPage = lazy(() => import("./modules/marketing/pages/MarketingPage"));

// Ad Intelligence Module
const AdIntelligencePage = lazy(() => import("./modules/ad-intelligence/pages/AdIntelligencePage"));

// Social Scraper Module
const SocialScraperPage = lazy(() => import("./modules/social-scraper/pages/SocialScraperPage"));

// Ad Generator Module
const AdGeneratorPage = lazy(() => import("./modules/ad-generator/pages/AdGeneratorPage"));
const ProductBannersPage = lazy(() => import("./modules/ad-generator/pages/ProductBannersPage"));

// Booking Module
const BookingSettingsPage = lazy(() => import("./modules/booking/pages/BookingSettingsPage").then(m => ({ default: m.BookingSettingsPage })));
const BookingCalendarPage = lazy(() => import("./modules/booking/pages/BookingCalendarPage").then(m => ({ default: m.BookingCalendarPage })));
const PublicBookingPage = lazy(() => import("./modules/booking/components/Public/PublicBookingPage").then(m => ({ default: m.PublicBookingPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 15 * 60 * 1000, // 15 min – data stays "fresh" longer, fewer background refetches
      gcTime: 60 * 60 * 1000,    // 60 min – keep unused cache in memory for 1 hour
    },
  },
});

// ── localStorage persistence: cache survives page refresh / tab close ──
const RQ_CACHE_KEY = 'kreoon-rq-v1';
const RQ_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour – matches gcTime

// Restore on startup
try {
  const raw = localStorage.getItem(RQ_CACHE_KEY);
  if (raw) {
    const { ts, state } = JSON.parse(raw);
    if (Date.now() - ts < RQ_CACHE_MAX_AGE) {
      hydrate(queryClient, state);
    } else {
      localStorage.removeItem(RQ_CACHE_KEY);
    }
  }
} catch { localStorage.removeItem(RQ_CACHE_KEY); }

// Persist on changes (debounced 3s to avoid thrashing)
let _rqPersistTimer: ReturnType<typeof setTimeout> | null = null;
queryClient.getQueryCache().subscribe(() => {
  if (_rqPersistTimer) clearTimeout(_rqPersistTimer);
  _rqPersistTimer = setTimeout(() => {
    try {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: (q) => {
          if (q.state.status !== 'success') return false;
          // Skip large datasets (content lists 240+ items) to keep cache small
          const d = q.state.data;
          if (Array.isArray(d) && d.length > 100) return false;
          return true;
        },
      });
      const payload = JSON.stringify({ ts: Date.now(), state });
      // Safety: don't exceed 4 MB in localStorage
      if (payload.length < 4 * 1024 * 1024) {
        localStorage.setItem(RQ_CACHE_KEY, payload);
      }
    } catch { /* localStorage full – silently ignore */ }
  }, 3000);
});

// Component to redirect /profile to settings profile
function ProfileRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" /></div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Navigate to="/settings?section=profile" replace />;
}

// Brand referral handler: capture ref param and redirect to register
function BrandReferralRedirect() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref') || '';
  if (ref) {
    try { localStorage.setItem('kreoon_brand_referral', ref); } catch {}
  }
  return <Navigate to={`/register?intent=brand&ref=${encodeURIComponent(ref)}`} replace />;
}

// Talent referral redirect: /unete-talento?ref=XXX -> /unete/talento?ref=XXX
function TalentReferralRedirect() {
  const search = window.location.search;
  // Save referral code to localStorage so it persists through redirects
  const params = new URLSearchParams(search);
  const ref = params.get('ref');
  if (ref) {
    try { localStorage.setItem('kreoon_referral_code', ref); } catch {}
  }
  return <Navigate to={`/unete/talento${search}`} replace />;
}

function AppRoutes() {
  const { impersonationKey } = useImpersonation();

  // Listen for new content notifications (strategists/admins only)
  useNewContentNotifications();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes key={impersonationKey}>
        {/* Campaign optimization: public pages */}
        <Route path="/calculadora-ugc" element={<UGCPriceCalculator />} />
        <Route path="/casos-de-exito" element={<CaseStudies />} />
        <Route path="/casos-de-exito/:slug" element={<CaseStudyDetail />} />
        <Route path="/marca-referida" element={<BrandReferralRedirect />} />
        {/* Legal pages (public, required for Meta app review) */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        {/* Redirect old /social routes to /marketplace */}
        <Route path="/social" element={<Navigate to="/marketplace" replace />} />
        <Route path="/social/*" element={<Navigate to="/marketplace" replace />} />
        {/* Marketplace routes — PUBLIC browse/view, PROTECTED actions */}
        {/* Public routes wrapped with TalentGate: blocks talents without keys */}
        <Route path="/marketplace" element={<TalentGate><MarketplaceLayout><MarketplaceBrowse /></MarketplaceLayout></TalentGate>} />
        <Route path="/marketplace/creator/:id" element={<TalentGate><CreatorProfilePage_Marketplace /></TalentGate>} />
        <Route path="/marketplace/org/:slug" element={<TalentGate><OrgProfilePage_Marketplace /></TalentGate>} />
        <Route path="/marketplace/campaigns" element={<TalentGate><MarketplaceLayout><CampaignsFeedPage /></MarketplaceLayout></TalentGate>} />
        <Route path="/marketplace/campaigns/:id" element={<TalentGate><MarketplaceLayout><CampaignDetailPage /></MarketplaceLayout></TalentGate>} />
        {/* Protected: actions that require login */}
        <Route path="/marketplace/videos" element={<ProtectedRoute allowNoRoles><MainLayout><VideosPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/guardados" element={<ProtectedRoute allowNoRoles><MainLayout><SavedPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/hire/:creatorId" element={<ProtectedRoute allowNoRoles><HiringWizardPage /></ProtectedRoute>} />
        <Route path="/marketplace/profile/setup" element={<ProtectedRoute allowNoRoles><CreatorProfileSetup /></ProtectedRoute>} />
        <Route path="/marketplace/dashboard" element={<ProtectedRoute allowNoRoles><MainLayout><MarketplaceDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/projects" element={<Navigate to="/board?view=marketplace" replace />} />
        <Route path="/marketplace/content" element={<Navigate to="/content?view=marketplace" replace />} />
        <Route path="/marketplace/campaigns/create" element={<ProtectedRoute allowNoRoles><MainLayout><CampaignWizardPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/campaigns/:id/edit" element={<ProtectedRoute allowNoRoles><MainLayout><CampaignWizardPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/my-campaigns" element={<ProtectedRoute allowNoRoles><MainLayout><BrandCampaignsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/creator-campaigns" element={<ProtectedRoute allowNoRoles><MainLayout><CreatorCampaignsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/talent-lists" element={<ProtectedRoute allowNoRoles><MainLayout><TalentListsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/talent-lists/:id" element={<ProtectedRoute allowNoRoles><MainLayout><TalentListDetailPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/invitations" element={<ProtectedRoute allowNoRoles><MainLayout><MarketplaceInvitationsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/inquiries" element={<ProtectedRoute allowNoRoles><MainLayout><MarketplaceInquiriesPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/campaign-payment/success" element={<ProtectedRoute allowNoRoles><CampaignPaymentSuccessPage /></ProtectedRoute>} />
        <Route path="/marketplace/campaign-payment/cancel" element={<ProtectedRoute allowNoRoles><CampaignPaymentCancelPage /></ProtectedRoute>} />
        <Route path="/company/:username" element={<CompanyProfilePage />} />
        <Route path="/profile/:userId" element={<PublicProfilePage />} />
        <Route path="/profile" element={<ProfileRedirect />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/no-company" element={<NoCompany />} />
        <Route path="/no-organization" element={<NoOrganization />} />
        <Route path="/pending-access" element={<PendingAccess />} />
        <Route path="/unlock-access" element={<UnlockAccess />} />
        <Route path="/welcome-talent" element={<WelcomeTalent />} />
        <Route path="/onboarding/profile" element={<OnboardingProfile />} />
        <Route path="/welcome" element={<WelcomeNewMember />} />
        <Route path="/up-documentation" element={<UPDocumentation />} />
        <Route path="/org/:slug/talento" element={<OrgPortfolioPage />} />
        <Route path="/org/:slug/contenido" element={<OrgContentShowcase />} />
        <Route path="/org/:slug" element={<OrgAuth />} />
        <Route path="/auth/org/:slug" element={<OrgRegister />} />
        <Route path="/r/:code" element={<ReferralLanding />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/:slug" element={<Register />} />
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
        <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/unete" element={<Unete />} />
        <Route path="/unete/talento" element={<UneteTalento />} />
        <Route path="/unete-talento" element={<TalentReferralRedirect />} />
        <Route path="/unete/marcas" element={<UneteMarcas />} />
        <Route path="/unete/organizaciones" element={<UneteOrganizaciones />} />
        {/* Partner Communities */}
        <Route path="/comunidad/:slug" element={<PartnerCommunityLanding />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'team_leader']}><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/board" element={<ProtectedRoute allowedRoles={['admin', 'team_leader', 'strategist', 'trafficker', 'creator', 'editor', 'client']}><MainLayout><ContentBoard /></MainLayout></ProtectedRoute>} />
        <Route path="/content" element={<ProtectedRoute allowedRoles={['admin', 'team_leader', 'strategist', 'trafficker', 'creator', 'editor']}><MainLayout><Content /></MainLayout></ProtectedRoute>} />
        <Route path="/talent" element={<ProtectedRoute allowedRoles={['admin', 'team_leader', 'strategist']}><MainLayout><UnifiedTalentPage /></MainLayout></ProtectedRoute>} />
        <Route path="/clients-hub" element={<ProtectedRoute allowedRoles={['admin', 'team_leader', 'strategist']}><MainLayout><UnifiedClientsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/creators" element={<Navigate to="/talent" replace />} />
        <Route path="/clients" element={<Navigate to="/clients-hub" replace />} />
        <Route path="/scripts" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'strategist']}><MainLayout><Scripts /></MainLayout></ProtectedRoute>} />
        <Route path="/team" element={<Navigate to="/talent" replace />} />
        <Route path="/live" element={<ProtectedRoute allowNoRoles><MainLayout><Live /></MainLayout></ProtectedRoute>} />
        <Route path="/marketing" element={<ProtectedRoute allowedRoles={['admin', 'strategist']}><MainLayout><Marketing /></MainLayout></ProtectedRoute>} />
        {/* CRM Plataforma */}
        <Route path="/crm" element={<ProtectedRoute requirePlatformAdmin><MainLayout><PlatformCRMDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/crm/leads" element={<ProtectedRoute requirePlatformAdmin><MainLayout><PlatformCRMLeads /></MainLayout></ProtectedRoute>} />
        <Route path="/crm/organizaciones" element={<ProtectedRoute requirePlatformAdmin><MainLayout><PlatformCRMOrganizations /></MainLayout></ProtectedRoute>} />
        <Route path="/crm/marcas" element={<ProtectedRoute requirePlatformAdmin><MainLayout><BrandsCRM /></MainLayout></ProtectedRoute>} />
        <Route path="/crm/marcas/:brandId" element={<ProtectedRoute requirePlatformAdmin><MainLayout><BrandDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/crm/comunidades" element={<ProtectedRoute requirePlatformAdmin><MainLayout><PlatformCRMCommunities /></MainLayout></ProtectedRoute>} />
        <Route path="/crm/creadores" element={<ProtectedRoute requirePlatformAdmin><MainLayout><PlatformCRMCreators /></MainLayout></ProtectedRoute>} />
        <Route path="/crm/usuarios" element={<ProtectedRoute requirePlatformAdmin><MainLayout><PlatformCRMUsers /></MainLayout></ProtectedRoute>} />
        <Route path="/crm/finanzas" element={<ProtectedRoute requirePlatformAdmin><MainLayout><PlatformCRMFinances /></MainLayout></ProtectedRoute>} />
        <Route path="/crm/email-marketing" element={<ProtectedRoute requirePlatformAdmin><MainLayout><PlatformCRMEmailMarketing /></MainLayout></ProtectedRoute>} />
        {/* CRM Organización */}
        <Route path="/org-crm" element={<Navigate to="/talent" replace />} />
        <Route path="/org-crm/contactos" element={<Navigate to="/clients-hub?tab=contactos" replace />} />
        <Route path="/org-crm/creadores" element={<Navigate to="/talent?tab=externo" replace />} />
        <Route path="/org-crm/pipelines" element={<ProtectedRoute allowedRoles={['admin', 'team_leader', 'strategist']}><MainLayout><OrgCRMPipelines /></MainLayout></ProtectedRoute>} />
        <Route path="/org-crm/finanzas" element={<ProtectedRoute allowedRoles={['admin', 'team_leader', 'strategist']}><MainLayout><OrgCRMFinances /></MainLayout></ProtectedRoute>} />
        {/* Social Hub Module */}
        <Route path="/social-hub" element={<ProtectedRoute allowNoRoles><MainLayout><SocialHubPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketing-ads" element={<ProtectedRoute allowNoRoles><MainLayout><MarketingAdsPage /></MainLayout></ProtectedRoute>} />
        {/* Wallet Module Routes */}
        <Route path="/wallet" element={<ProtectedRoute allowNoRoles><MainLayout><WalletPage /></MainLayout></ProtectedRoute>} />
        <Route path="/wallet/transactions" element={<ProtectedRoute allowNoRoles><MainLayout><TransactionsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/wallet/withdrawals" element={<ProtectedRoute allowNoRoles><MainLayout><WithdrawalsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/wallet/payment-methods" element={<Navigate to="/wallet?tab=payment-methods" replace />} />
        <Route path="/wallet/settings" element={<Navigate to="/wallet" replace />} />
        <Route path="/admin/wallets" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><AdminWalletsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><KAEAnalyticsDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/ad-intelligence" element={<ProtectedRoute allowNoRoles><MainLayout><AdIntelligencePage /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/social-scraper" element={<ProtectedRoute allowNoRoles><MainLayout><SocialScraperPage /></MainLayout></ProtectedRoute>} />
        {/* Ad Generator Module */}
        <Route path="/ad-generator" element={<ProtectedRoute allowNoRoles><MainLayout><AdGeneratorPage /></MainLayout></ProtectedRoute>} />
        <Route path="/ad-generator/:productId" element={<ProtectedRoute allowNoRoles><MainLayout><ProductBannersPage /></MainLayout></ProtectedRoute>} />
        {/* Booking Module */}
        <Route path="/booking/settings" element={<ProtectedRoute allowNoRoles><MainLayout><BookingSettingsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/booking/calendar" element={<ProtectedRoute allowNoRoles><MainLayout><BookingCalendarPage /></MainLayout></ProtectedRoute>} />
        <Route path="/book/:username" element={<PublicBookingPage />} />
        <Route path="/book/:username/:eventSlug" element={<PublicBookingPage />} />
        <Route path="/settings" element={<ProtectedRoute allowNoRoles><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
        <Route path="/planes" element={<ProtectedRoute allowNoRoles><MainLayout><PlanesPage /></MainLayout></ProtectedRoute>} />
        <Route path="/freelancer-dashboard" element={<ProtectedRoute allowNoRoles><MainLayout><FreelancerDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/creator-dashboard" element={<ProtectedRoute allowedRoles={['creator']}><MainLayout><CreatorDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/editor-dashboard" element={<ProtectedRoute allowedRoles={['editor']}><MainLayout><EditorDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/strategist-dashboard" element={<ProtectedRoute allowedRoles={['strategist']}><MainLayout><StrategistDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/client-dashboard" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><ClientDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/client-board" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><ClientContentBoard /></MainLayout></ProtectedRoute>} />
        <Route path="/ranking" element={<ProtectedRoute allowedRoles={['admin', 'creator', 'editor']}><MainLayout><Ranking /></MainLayout></ProtectedRoute>} />
        <Route path="/research/:productId" element={<ProtectedRoute allowNoRoles><ResearchLanding /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <BrandingProvider>
        <AuthProvider>
          <CurrencyProvider>
            <AnalyticsProvider>
              <ImpersonationProvider>
                <TrialProvider>
                  <UnsavedChangesProvider>
                    <AchievementNotificationProvider>
                      <StrategistClientProvider>
                        <AICopilotProvider>
                          <KiroProvider>
                            <TooltipProvider delayDuration={0}>
                              <ImpersonationBanner />
                              <Toaster />
                              <Sonner />
                              <UpdatePrompt />
                              <MarketplaceReadinessPopup />
                              <ErrorBoundary>
                                <AppRoutes />
                              </ErrorBoundary>
                            </TooltipProvider>
                          </KiroProvider>
                        </AICopilotProvider>
                      </StrategistClientProvider>
                    </AchievementNotificationProvider>
                  </UnsavedChangesProvider>
                </TrialProvider>
              </ImpersonationProvider>
            </AnalyticsProvider>
          </CurrencyProvider>
        </AuthProvider>
      </BrandingProvider>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="kreoon-theme">
      <AppContent />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
