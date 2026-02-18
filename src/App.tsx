import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNewContentNotifications } from "@/hooks/useNewContentNotifications";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AchievementNotificationProvider } from "@/components/points/AchievementNotificationProvider";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";
import { AICopilotProvider } from "@/contexts/AICopilotContext";
import { TrialProvider } from "@/contexts/TrialContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { StrategistClientProvider } from "@/contexts/StrategistClientContext";
import { KiroProvider } from "@/contexts/KiroContext";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { MainLayout } from "./components/layout/MainLayout";
import { MarketplaceLayout } from "./components/layout/MarketplacePublicLayout";

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
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
const SubscriptionSuccess = lazy(() => import("./pages/subscription/SubscriptionSuccess"));
const SubscriptionCancel = lazy(() => import("./pages/subscription/SubscriptionCancel"));
const PlanesPage = lazy(() => import("./pages/PlanesPage"));

// Wallet Module Pages
const WalletPage = lazy(() => import("./modules/wallet/pages/WalletPage").then(m => ({ default: m.WalletPage })));
const TransactionsPage = lazy(() => import("./modules/wallet/pages/TransactionsPage").then(m => ({ default: m.TransactionsPage })));
const WithdrawalsPage = lazy(() => import("./modules/wallet/pages/WithdrawalsPage").then(m => ({ default: m.WithdrawalsPage })));
const AdminWalletsPage = lazy(() => import("./modules/wallet/pages/AdminWalletsPage").then(m => ({ default: m.AdminWalletsPage })));

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

// Component to redirect /profile to social
function ProfileRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" /></div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <Navigate to="/settings?section=marketplace" replace />;
}

function AppRoutes() {
  const { impersonationKey } = useImpersonation();

  // Listen for new content notifications (strategists/admins only)
  useNewContentNotifications();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes key={impersonationKey}>
        {/* Redirect old /social routes to /marketplace */}
        <Route path="/social" element={<Navigate to="/marketplace" replace />} />
        <Route path="/social/*" element={<Navigate to="/marketplace" replace />} />
        {/* Marketplace routes — PUBLIC browse/view, PROTECTED actions */}
        {/* Public: browse, creator profiles, org profiles, campaigns feed/detail */}
        <Route path="/marketplace" element={<MarketplaceLayout><MarketplaceBrowse /></MarketplaceLayout>} />
        <Route path="/marketplace/creator/:id" element={<CreatorProfilePage_Marketplace />} />
        <Route path="/marketplace/org/:slug" element={<OrgProfilePage_Marketplace />} />
        <Route path="/marketplace/campaigns" element={<MarketplaceLayout><CampaignsFeedPage /></MarketplaceLayout>} />
        <Route path="/marketplace/campaigns/:id" element={<MarketplaceLayout><CampaignDetailPage /></MarketplaceLayout>} />
        {/* Protected: actions that require login */}
        <Route path="/marketplace/videos" element={<ProtectedRoute allowNoRoles><MainLayout><VideosPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/guardados" element={<ProtectedRoute allowNoRoles><MainLayout><SavedPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/hire/:creatorId" element={<ProtectedRoute allowNoRoles><HiringWizardPage /></ProtectedRoute>} />
        <Route path="/marketplace/profile/setup" element={<ProtectedRoute allowNoRoles><CreatorProfileSetup /></ProtectedRoute>} />
        <Route path="/marketplace/dashboard" element={<ProtectedRoute allowNoRoles><MainLayout><MarketplaceDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/projects" element={<Navigate to="/board?view=marketplace" replace />} />
        <Route path="/marketplace/content" element={<Navigate to="/content?view=marketplace" replace />} />
        <Route path="/marketplace/campaigns/create" element={<ProtectedRoute allowNoRoles><MainLayout><CampaignWizardPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/my-campaigns" element={<ProtectedRoute allowNoRoles><MainLayout><BrandCampaignsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/creator-campaigns" element={<ProtectedRoute allowNoRoles><MainLayout><CreatorCampaignsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/talent-lists" element={<ProtectedRoute allowNoRoles><MainLayout><TalentListsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/talent-lists/:id" element={<ProtectedRoute allowNoRoles><MainLayout><TalentListDetailPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/invitations" element={<ProtectedRoute allowNoRoles><MainLayout><MarketplaceInvitationsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketplace/inquiries" element={<ProtectedRoute allowNoRoles><MainLayout><MarketplaceInquiriesPage /></MainLayout></ProtectedRoute>} />
        <Route path="/company/:username" element={<CompanyProfilePage />} />
        <Route path="/profile/:userId" element={<PublicProfilePage />} />
        <Route path="/profile" element={<ProfileRedirect />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/no-company" element={<NoCompany />} />
        <Route path="/no-organization" element={<NoOrganization />} />
        <Route path="/pending-access" element={<PendingAccess />} />
        <Route path="/welcome" element={<WelcomeNewMember />} />
        <Route path="/up-documentation" element={<UPDocumentation />} />
        <Route path="/org/:slug/talento" element={<OrgPortfolioPage />} />
        <Route path="/org/:slug" element={<OrgAuth />} />
        <Route path="/auth/org/:slug" element={<OrgRegister />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/:slug" element={<Register />} />
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
        <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/unete" element={<Unete />} />
        <Route path="/unete/talento" element={<UneteTalento />} />
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
        <Route path="/live" element={<ProtectedRoute allowedRoles={['admin', 'strategist']}><MainLayout><Live /></MainLayout></ProtectedRoute>} />
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
        {/* Wallet Module Routes */}
        <Route path="/wallet" element={<ProtectedRoute allowNoRoles><MainLayout><WalletPage /></MainLayout></ProtectedRoute>} />
        <Route path="/wallet/transactions" element={<ProtectedRoute allowNoRoles><MainLayout><TransactionsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/wallet/withdrawals" element={<ProtectedRoute allowNoRoles><MainLayout><WithdrawalsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/wallets" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><AdminWalletsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><KAEAnalyticsDashboard /></MainLayout></ProtectedRoute>} />
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
    <BrowserRouter>
      <BrandingProvider>
        <AuthProvider>
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
                            <AppRoutes />
                          </TooltipProvider>
                        </KiroProvider>
                      </AICopilotProvider>
                    </StrategistClientProvider>
                  </AchievementNotificationProvider>
                </UnsavedChangesProvider>
              </TrialProvider>
            </ImpersonationProvider>
          </AnalyticsProvider>
        </AuthProvider>
      </BrandingProvider>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
