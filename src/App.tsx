import { Suspense, lazy } from "react";
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
import { ThemeProvider } from "next-themes";
import { MainLayout } from "./components/layout/MainLayout";
import { MarketplaceLayout } from "./components/layout/MarketplacePublicLayout";

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

// Lazy load all pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ContentBoard = lazy(() => import("./pages/ContentBoard"));
const Auth = lazy(() => import("./pages/Auth"));
const Content = lazy(() => import("./pages/Content"));
const Scripts = lazy(() => import("./pages/Scripts"));
const Settings = lazy(() => import("./pages/Settings"));
const Team = lazy(() => import("./pages/Team"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const EditorDashboard = lazy(() => import("./pages/EditorDashboard"));
const StrategistDashboard = lazy(() => import("./pages/StrategistDashboard"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientContentBoard = lazy(() => import("./pages/ClientContentBoard"));
const VideosPage = lazy(() => import("./pages/portfolio/VideosPage"));
const SavedPage = lazy(() => import("./pages/portfolio/SavedPage"));
const CompanyProfilePage = lazy(() => import("./pages/portfolio/CompanyProfilePage"));
const PublicProfilePage = lazy(() => import("./pages/portfolio/PublicProfilePage"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NoCompany = lazy(() => import("./pages/NoCompany"));
const NoOrganization = lazy(() => import("./pages/NoOrganization"));
const PendingAccess = lazy(() => import("./pages/PendingAccess"));
const WelcomeNewMember = lazy(() => import("./pages/WelcomeNewMember"));
const UPDocumentation = lazy(() => import("./pages/UPDocumentation"));
const OrgAuth = lazy(() => import("./pages/OrgAuth"));
const HomePage = lazy(() => import("./pages/HomePage"));
const Register = lazy(() => import("./pages/Register"));
const OrgRegister = lazy(() => import("./pages/auth/OrgRegister"));
const Live = lazy(() => import("./pages/Live"));
const Marketing = lazy(() => import("./pages/Marketing"));
const ResearchLanding = lazy(() => import("./pages/ResearchLanding"));
const OrgPortfolioPage = lazy(() => import("./pages/OrgPortfolioPage"));
const OrgContentShowcase = lazy(() => import("./pages/OrgContentShowcase"));
const CreatorProfilePage_Marketplace = lazy(() => import("./components/marketplace/profile/CreatorProfilePage"));
const HiringWizardPage = lazy(() => import("./pages/HiringWizardPage"));
const MarketplaceDashboard = lazy(() => import("./pages/MarketplaceDashboard"));
const CampaignsFeedPage = lazy(() => import("./pages/CampaignsFeedPage"));
const CampaignDetailPage = lazy(() => import("./pages/CampaignDetailPage"));
const CampaignWizardPage = lazy(() => import("./pages/CampaignWizardPage"));
const BrandCampaignsPage = lazy(() => import("./pages/BrandCampaignsPage"));
const CreatorCampaignsPage = lazy(() => import("./pages/CreatorCampaignsPage"));
const MarketplaceBrowse = lazy(() => import("./components/marketplace/MarketplacePage"));
const OrgProfilePage_Marketplace = lazy(() => import("./components/marketplace/org-profile/OrgProfilePage"));
const TalentListsPage = lazy(() => import("./pages/marketplace/TalentListsPage"));
const TalentListDetailPage = lazy(() => import("./pages/marketplace/TalentListDetailPage"));
const MarketplaceInvitationsPage = lazy(() => import("./pages/marketplace/MarketplaceInvitationsPage"));
const MarketplaceInquiriesPage = lazy(() => import("./pages/marketplace/MarketplaceInquiriesPage"));
const CampaignPaymentSuccessPage = lazy(() => import("./pages/marketplace/CampaignPaymentSuccess"));
const CampaignPaymentCancelPage = lazy(() => import("./pages/marketplace/CampaignPaymentCancel"));
const CreatorProfileSetup = lazy(() => import("./pages/CreatorProfileSetup"));
const Unete = lazy(() => import("./pages/Unete"));
const UneteTalento = lazy(() => import("./pages/unete/talento"));
const UneteMarcas = lazy(() => import("./pages/unete/marcas"));
const UneteOrganizaciones = lazy(() => import("./pages/unete/organizaciones"));
// CRM Platform
const PlatformCRMDashboard = lazy(() => import("./pages/crm/platform/PlatformCRMDashboard"));
const PlatformCRMLeads = lazy(() => import("./pages/crm/platform/PlatformCRMLeads"));
const PlatformCRMOrganizations = lazy(() => import("./pages/crm/platform/PlatformCRMOrganizations"));
const PlatformCRMCreators = lazy(() => import("./pages/crm/platform/PlatformCRMCreators"));
const PlatformCRMUsers = lazy(() => import("./pages/crm/platform/PlatformCRMUsers"));
const PlatformCRMFinances = lazy(() => import("./pages/crm/platform/PlatformCRMFinances"));
const PlatformCRMEmailMarketing = lazy(() => import("./pages/crm/platform/PlatformCRMEmailMarketing"));
// CRM Org
const OrgCRMDashboard = lazy(() => import("./pages/crm/org/OrgCRMDashboard"));
const OrgCRMPipelines = lazy(() => import("./pages/crm/org/OrgCRMPipelines"));
const OrgCRMFinances = lazy(() => import("./pages/crm/org/OrgCRMFinances"));
// Unified pages (Talent + Clients)
const UnifiedTalentPage = lazy(() => import("./pages/UnifiedTalentPage"));
const UnifiedClientsPage = lazy(() => import("./pages/UnifiedClientsPage"));

// KAE Analytics
const KAEAnalyticsDashboard = lazy(() => import("./components/admin/analytics/KAEDashboard"));

// Subscription pages
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));
const UnlockAccess = lazy(() => import("./pages/UnlockAccess"));
const WelcomeTalent = lazy(() => import("./pages/WelcomeTalent"));
const OnboardingProfile = lazy(() => import("./pages/OnboardingProfile"));
const SubscriptionSuccess = lazy(() => import("./pages/subscription/SubscriptionSuccess"));
const SubscriptionCancel = lazy(() => import("./pages/subscription/SubscriptionCancel"));
const PlanesPage = lazy(() => import("./pages/PlanesPage"));

// Campaign Optimization pages
const UGCPriceCalculator = lazy(() => import("./components/marketplace/calculator/UGCPriceCalculator"));
const CaseStudies = lazy(() => import("./pages/CaseStudies"));
const CaseStudyDetail = lazy(() => import("./pages/CaseStudyDetail"));

// Legal pages
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const DataDeletion = lazy(() => import("./pages/legal/DataDeletion"));

// Wallet Module Pages
const WalletPage = lazy(() => import("./modules/wallet/pages/WalletPage").then(m => ({ default: m.WalletPage })));
const TransactionsPage = lazy(() => import("./modules/wallet/pages/TransactionsPage").then(m => ({ default: m.TransactionsPage })));
const WithdrawalsPage = lazy(() => import("./modules/wallet/pages/WithdrawalsPage").then(m => ({ default: m.WithdrawalsPage })));
const AdminWalletsPage = lazy(() => import("./modules/wallet/pages/AdminWalletsPage").then(m => ({ default: m.AdminWalletsPage })));

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
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'team_leader']}><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/board" element={<ProtectedRoute allowedRoles={['admin', 'team_leader', 'strategist', 'trafficker', 'creator', 'editor']}><MainLayout><ContentBoard /></MainLayout></ProtectedRoute>} />
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
        <Route path="/settings" element={<ProtectedRoute allowNoRoles><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
        <Route path="/planes" element={<ProtectedRoute allowNoRoles><MainLayout><PlanesPage /></MainLayout></ProtectedRoute>} />
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
