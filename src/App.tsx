import { Suspense, lazy, ComponentType, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { ErrorBoundary } from "@/components/error";
import { useNewContentNotifications } from "@/hooks/useNewContentNotifications";
import { ProtectedRoute, BlockClientsRoute } from "@/components/ProtectedRoute";
import { TalentGate } from "@/components/TalentGate";
import { RootOnlyRoute } from "@/components/RootOnlyRoute";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";
import { AICopilotProvider } from "@/contexts/AICopilotContext";
import { TrialProvider } from "@/contexts/TrialContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { OnboardingGateProvider } from "@/providers/OnboardingGateProvider";
import { AccessGateProvider } from "@/providers/AccessGateProvider";
import { RoleLegalGateProvider } from "@/providers/RoleLegalGateProvider";
import { StrategistClientProvider } from "@/contexts/StrategistClientContext";
import { KiroProvider } from "@/contexts/KiroContext";
import { GenerationJobProvider } from "@/contexts/GenerationJobContext";
import { CreatorFavoritesProvider } from "@/contexts/CreatorFavoritesContext";
import { FloatingGenerationBadge } from "@/components/ui/FloatingGenerationBadge";
import { AuthStoreBridge } from "@/stores/AuthStoreBridge";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { MarketplaceReadinessPopup } from "@/components/marketplace/MarketplaceReadinessPopup";
import { AcademyLiveToaster } from "@/components/academy/live/AcademyLiveToaster";
import { RequireAcademyAccess } from "@/components/academy/guard/RequireAcademyAccess";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { ThemeProvider } from "next-themes";
import { PageLoader } from "./components/PageLoader";
import { ScrollToTop } from "./components/ScrollToTop";
import { MainLayout } from "./components/layout/MainLayout";
import { MarketplaceLayout } from "./components/layout/MarketplacePublicLayout";
import { AdminOnlyFeature } from "./components/common/AdminOnlyFeature";
import {
  CatchAllRoute,
  LegacyCreatorProfileRoute,
} from "./components/routing/PublicProfileRoutes";
import { getPostAuthDestination } from "@/lib/routing/postAuth";
import {
  attachScopedQueryPersistence,
  removeLegacyQueryCache,
} from "@/lib/storage/queryCachePersistence";
import { purgeAuthenticatedCaches } from "@/lib/storage/scopedStorage";

// Helper: detect chunk/module load failures (stale hashes after deploy)
function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk")
  );
}

// Lazy import wrapper that auto-reloads on stale chunk errors after deploy.
// Prevents users from seeing "Failed to fetch dynamically imported module" errors
// when old JS chunk hashes no longer exist on the server.
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    importFn().catch((error) => {
      if (isChunkLoadError(error)) {
        // Prevent infinite reload loop: only reload once per 10 seconds
        const lastReload = sessionStorage.getItem("last-chunk-reload");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload) > 10000) {
          sessionStorage.setItem("last-chunk-reload", now.toString());
          window.location.reload();
        }
      }
      throw error;
    }),
  );
}

// Loading fallback component - Premium animated loader
const SuspenseLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-kreoon-purple-500/20 blur-xl animate-pulse" />
        <div className="relative animate-spin h-10 w-10 border-2 border-kreoon-purple-500 border-t-transparent rounded-full" />
      </div>
      <span className="text-sm text-kreoon-text-muted tracking-wider">
        Cargando...
      </span>
    </div>
  </div>
);

// Lazy load all pages for code splitting (with auto-retry on stale chunks)
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const ContentBoard = lazyWithRetry(() => import("./pages/ContentBoard"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Content = lazyWithRetry(() => import("./pages/Content"));
const Creators = lazyWithRetry(() => import("./pages/Creators"));
const Scripts = lazyWithRetry(() => import("./pages/Scripts"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Team = lazyWithRetry(() => import("./pages/Team"));
const CreatorDashboard = lazyWithRetry(
  () => import("./pages/CreatorDashboard"),
);
const EditorDashboard = lazyWithRetry(() => import("./pages/EditorDashboard"));
const StrategistDashboard = lazyWithRetry(
  () => import("./pages/StrategistDashboard"),
);
const ClientDashboard = lazyWithRetry(() => import("./pages/ClientDashboard"));
const ClientContentBoard = lazyWithRetry(
  () => import("./pages/ClientContentBoard"),
);
const VideosPage = lazyWithRetry(() => import("./pages/portfolio/VideosPage"));
const SavedPage = lazyWithRetry(() => import("./pages/portfolio/SavedPage"));
const CompanyProfilePage = lazyWithRetry(
  () => import("./pages/portfolio/CompanyProfilePage"),
);
const Unauthorized = lazyWithRetry(() => import("./pages/Unauthorized"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const NoCompany = lazyWithRetry(() => import("./pages/NoCompany"));
const NoOrganization = lazyWithRetry(() => import("./pages/NoOrganization"));
const PendingAccess = lazyWithRetry(() => import("./pages/PendingAccess"));
const MCPDocumentation = lazyWithRetry(
  () => import("./pages/MCPDocumentation"),
);
const HomePage = lazyWithRetry(() => import("./pages/HomePage"));
const PortfolioShowcasePage = lazyWithRetry(
  () => import("./pages/PortfolioShowcasePage"),
);
const BlogPage = lazyWithRetry(() => import("./pages/BlogPage"));
const OrganizationRegistrationPage = lazyWithRetry(
  () => import("./pages/registro/OrganizationRegistrationPage"),
);
const CreatorWelcomeRoute = lazyWithRetry(
  () => import("./pages/registro/CreatorWelcomeRoute"),
);
const SignupClosedPage = lazyWithRetry(
  () => import("./pages/registro/SignupClosedPage"),
);
const AuthCallback = lazyWithRetry(() => import("./pages/auth/AuthCallback"));
const ResetPassword = lazyWithRetry(() => import("./pages/auth/ResetPassword"));
const ResearchLanding = lazyWithRetry(() => import("./pages/ResearchLanding"));
const OrgPortfolioPage = lazyWithRetry(
  () => import("./pages/OrgPortfolioPage"),
);
const OrgContentShowcase = lazyWithRetry(
  () => import("./pages/OrgContentShowcase"),
);
const HiringWizardPage = lazyWithRetry(
  () => import("./pages/HiringWizardPage"),
);
const MarketplaceDashboard = lazyWithRetry(
  () => import("./pages/MarketplaceDashboard"),
);
const MarketplaceBrowse = lazyWithRetry(
  () => import("./components/marketplace/MarketplacePage"),
);
const MarketplaceExplorePage = lazyWithRetry(
  () => import("./pages/MarketplaceExplore"),
);
const OrgProfilePage_Marketplace = lazyWithRetry(
  () => import("./components/marketplace/org-profile/OrgProfilePage"),
);
const TalentListsPage = lazyWithRetry(
  () => import("./pages/marketplace/TalentListsPage"),
);
const TalentListDetailPage = lazyWithRetry(
  () => import("./pages/marketplace/TalentListDetailPage"),
);
const MarketplaceInvitationsPage = lazyWithRetry(
  () => import("./pages/marketplace/MarketplaceInvitationsPage"),
);
const MarketplaceInquiriesPage = lazyWithRetry(
  () => import("./pages/marketplace/MarketplaceInquiriesPage"),
);
const FavoritosPage = lazyWithRetry(
  () => import("./pages/marketplace/FavoritosPage"),
);
const CreatorProfileSetup = lazyWithRetry(
  () => import("./pages/CreatorProfileSetup"),
);
import {
  GenericRegistrationRedirect,
  LegacySlugRegistrationRedirect,
} from "./pages/registro/LegacyRedirects";
// CRM Platform
const PlatformAdminDashboard = lazyWithRetry(
  () => import("./pages/crm/platform/PlatformAdminDashboard"),
);
const AdminPayoutsPage = lazyWithRetry(
  () => import("./pages/admin/AdminPayoutsPage"),
);
const PlatformCRMDashboard = lazyWithRetry(
  () => import("./pages/crm/platform/PlatformCRMDashboard"),
);
const PlatformCRMOrganizations = lazyWithRetry(
  () => import("./pages/crm/platform/PlatformCRMOrganizations"),
);
const PlatformCRMPeople = lazyWithRetry(
  () => import("./pages/crm/platform/PlatformCRMPeople"),
);
const PlatformCRMFinances = lazyWithRetry(
  () => import("./pages/crm/platform/PlatformCRMFinances"),
);
const PlatformCRMEmailMarketing = lazyWithRetry(
  () => import("./pages/crm/platform/PlatformCRMEmailMarketing"),
);
const BrandsCRM = lazyWithRetry(() => import("./pages/crm/BrandsCRM"));
const BrandDetail = lazyWithRetry(() => import("./pages/crm/BrandDetail"));
const PlatformCRMCommunities = lazyWithRetry(
  () => import("./pages/crm/platform/PlatformCRMCommunities"),
);
// CRM Org
const OrgCRMFinances = lazyWithRetry(
  () => import("./pages/crm/org/OrgCRMFinances"),
);
// Unified pages (Talent + Clients)
const UnifiedTalentPage = lazyWithRetry(
  () => import("./pages/UnifiedTalentPage"),
);
const UnifiedClientsPage = lazyWithRetry(
  () => import("./pages/UnifiedClientsPage"),
);

// KAE Analytics
const KAEAnalyticsDashboard = lazyWithRetry(
  () => import("./components/admin/analytics/KAEDashboard"),
);

// Admin pages
const PapeleraPage = lazyWithRetry(() => import("./pages/admin/PapeleraPage"));
const DevModulesPage = lazyWithRetry(
  () => import("./pages/admin/DevModulesPage"),
);
const AllPagesQAPage = lazyWithRetry(
  () => import("./pages/admin/AllPagesQAPage"),
);

// Subscription pages
const ReferralLanding = lazyWithRetry(() => import("./pages/ReferralLanding"));
const ClientOnboarding = lazyWithRetry(
  () => import("./pages/ClientOnboarding"),
);
const SubscriptionSuccess = lazyWithRetry(
  () => import("./pages/subscription/SubscriptionSuccess"),
);
const SubscriptionCancel = lazyWithRetry(
  () => import("./pages/subscription/SubscriptionCancel"),
);
const PlanesPage = lazyWithRetry(() => import("./pages/PlanesPage"));
const CreatorPricingPage = lazyWithRetry(
  () => import("./pages/CreatorPricingPage"),
);
const PartnerCommunityLanding = lazyWithRetry(
  () => import("./pages/PartnerCommunityLanding"),
);


const UGCPriceCalculator = lazyWithRetry(
  () => import("./components/marketplace/calculator/UGCPriceCalculator"),
);

// Legal pages
const PrivacyPolicy = lazyWithRetry(
  () => import("./pages/legal/PrivacyPolicy"),
);
const TermsOfService = lazyWithRetry(
  () => import("./pages/legal/TermsOfService"),
);
const DataDeletion = lazyWithRetry(() => import("./pages/legal/DataDeletion"));
const LegalDocumentPage = lazyWithRetry(
  () => import("./pages/legal/LegalDocumentPage"),
);
const ReceiptPage = lazyWithRetry(() => import("./pages/legal/ReceiptPage"));

// Social Hub Module
const SocialHubPage = lazyWithRetry(
  () => import("./modules/social/pages/SocialHubPage"),
);

// Ad Generator Module
const AdGeneratorPage = lazyWithRetry(
  () => import("./modules/ad-generator/pages/AdGeneratorPage"),
);
const ProductBannersPage = lazyWithRetry(
  () => import("./modules/ad-generator/pages/ProductBannersPage"),
);

// Ambassador Module
const AmbassadorPage = lazyWithRetry(() => import("./pages/AmbassadorPage"));

// Profile Builder
const ProfileBuilderPage = lazyWithRetry(
  () => import("./pages/ProfileBuilderPage"),
);
const ProfilePreviewPage = lazyWithRetry(
  () => import("./pages/ProfilePreviewPage"),
);
const PublicCreatorPage = lazyWithRetry(
  () => import("./pages/PublicCreatorPage"),
);
const PublicReviewPage = lazyWithRetry(
  () => import("./pages/PublicReviewPage"),
);

// Template Library
const TemplateLibraryPage = lazyWithRetry(
  () => import("./pages/TemplateLibraryPage"),
);

// Academia (LMS)
const AcademiaHomePage = lazyWithRetry(
  () => import("./pages/academia/AcademiaHomePage"),
);
// AcademiaSpacePage reemplazado por AcademiaSpaceHomePage (home dashboard)
// + AcademiaSpaceClassroomPage (catálogo de cursos)
const AcademiaCoursePage = lazyWithRetry(
  () => import("./pages/academia/AcademiaCoursePage"),
);
const AcademiaPlayerPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaPlayerPage"),
);
const AcademiaCreatePage = lazyWithRetry(
  () => import("./pages/academia/AcademiaCreatePage"),
);
const AcademiaDashboardPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaDashboardPage"),
);
const AcademiaVerifyPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaVerifyPage"),
);
const AcademiaManagePage = lazyWithRetry(
  () => import("./pages/academia/AcademiaManagePage"),
);
const AcademiaCourseEditorPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaCourseEditorPage"),
);

// Academia v2 — Community features
const AcademiaSpaceFeedPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaSpaceFeedPage"),
);
const AcademiaSpaceDMPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaSpaceDMPage"),
);
const AcademiaPublicLandingPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaPublicLandingPage"),
);
const AcademiaMarketplacePage = lazyWithRetry(
  () => import("./pages/academia/AcademiaMarketplacePage"),
);
const AcademiaSpaceAdminPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaSpaceAdminPage"),
);
const AcademiaSpaceCalendarPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaSpaceCalendarPage"),
);
const AcademiaLeaderboardPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaLeaderboardPage"),
);
const AcademiaMapPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaMapPage"),
);

// Academia v3 — Members + Google Calendar callbacks
const AcademiaSpaceMembersPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaSpaceMembersPage"),
);
const AcademiaCalendarCallbackPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaCalendarCallbackPage"),
);
const AcademiaMemberCalendarCallbackPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaMemberCalendarCallbackPage"),
);

// Academia — Home dashboard + Classroom (catálogo de cursos)
const AcademiaSpaceHomePage = lazyWithRetry(
  () => import("./pages/academia/AcademiaSpaceHomePage"),
);
const AcademiaSpaceClassroomPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaSpaceClassroomPage"),
);
const AcademiaChallengesPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaChallengesPage"),
);
const AcademiaChallengeDetailPage = lazyWithRetry(
  () => import("./pages/academia/AcademiaChallengeDetailPage"),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 15 * 60 * 1000, // 15 min – data stays "fresh" longer, fewer background refetches
      gcTime: 60 * 60 * 1000, // 60 min – keep unused cache in memory for 1 hour
    },
  },
});

// ── Caché persistida de React Query: SOLO catálogo no sensible y con ámbito usuario+organización ──
// (ver src/lib/storage/queryCachePersistence.ts). La clave global heredada `kreoon-rq-v1` se borra
// al arrancar, igual que las cachés del service worker antiguo que guardaban respuestas autenticadas.
removeLegacyQueryCache();
void purgeAuthenticatedCaches();

/** Rehidrata/persiste la caché de catálogo solo para la sesión actual (usuario + organización). */
function ScopedQueryPersistence() {
  const client = useQueryClient();
  const { user, profile, loading } = useAuth();
  const userId = user?.id ?? null;
  const orgId = profile?.current_organization_id ?? null;

  useEffect(() => {
    if (loading || !userId) return;
    return attachScopedQueryPersistence(client, userId, orgId);
  }, [client, loading, userId, orgId]);

  return null;
}

/**
 * Entrada de la app instalada (`start_url: /inicio?source=pwa`): con sesión va al inicio del rol
 * (postAuth.ts); sin sesión, a la pantalla de acceso — nunca a la landing.
 */
function InicioRoute() {
  const { user, loading, rolesLoaded, roles, activeRole } = useAuth();

  if (loading || (user && !rolesLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Cargando">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  // Sin roles, /auth ya resuelve el destino (marca, perfil de talento o completar el alta).
  if (roles.length === 0) return <Navigate to="/auth" replace />;
  return <Navigate to={getPostAuthDestination({ roles, activeRole })} replace />;
}

// Component to redirect /profile to settings profile
function ProfileRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Navigate to="/settings?section=profile" replace />;
}

function AppRoutes() {
  const { impersonationKey } = useImpersonation();

  // Listen for new content notifications (strategists/admins only)
  useNewContentNotifications();

  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes key={impersonationKey}>

        {/* Pricing pages (public) */}
        <Route path="/pricing/creators" element={<CreatorPricingPage />} />
        <Route path="/calculadora-ugc" element={<UGCPriceCalculator />} />
        <Route path="/portafolio" element={<PortfolioShowcasePage />} />
        <Route path="/marca-referida" element={<SignupClosedPage audience="brand" />} />
        {/* Legal pages (public, required for Meta app review) */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/legal/:documentType" element={<LegalDocumentPage />} />
        <Route path="/receipt/:signatureId" element={<ReceiptPage />} />
        {/* Redirect old /social routes to /marketplace */}
        <Route
          path="/social"
          element={<Navigate to="/marketplace" replace />}
        />
        <Route
          path="/social/*"
          element={<Navigate to="/marketplace" replace />}
        />
        {/* Marketplace routes — PUBLIC browse/view, PROTECTED actions */}
        {/* Public routes wrapped with TalentGate: blocks talents without keys */}
        <Route
          path="/marketplace"
          element={
            <TalentGate>
              <MarketplaceLayout>
                <MarketplaceExplorePage />
              </MarketplaceLayout>
            </TalentGate>
          }
        />
        {/* Enlace heredado: redirige a la URL pública única /p/:slug (sin slug, muestra el perfil igual) */}
        <Route path="/marketplace/creator/:id" element={<LegacyCreatorProfileRoute />} />
        <Route
          path="/marketplace/org/:slug"
          element={
            <TalentGate>
              <OrgProfilePage_Marketplace />
            </TalentGate>
          }
        />
        {/* Protected: actions that require login */}
        <Route
          path="/marketplace/videos"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <VideosPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace/guardados"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <SavedPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace/favoritos"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <FavoritosPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace/hire/:creatorId"
          element={
            <ProtectedRoute allowNoRoles>
              <HiringWizardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace/profile/setup"
          element={
            <ProtectedRoute allowNoRoles>
              <CreatorProfileSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace/dashboard"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <MarketplaceDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace/explore"
          element={<Navigate to="/marketplace" replace />}
        />
        <Route
          path="/marketplace/projects"
          element={<Navigate to="/board?view=marketplace" replace />}
        />
        <Route
          path="/marketplace/content"
          element={<Navigate to="/content?view=marketplace" replace />}
        />
        <Route
          path="/marketplace/talent-lists"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <TalentListsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace/talent-lists/:id"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <TalentListDetailPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace/invitations"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <MarketplaceInvitationsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace/inquiries"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <MarketplaceInquiriesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/company/:username" element={<CompanyProfilePage />} />
        <Route path="/profile" element={<ProfileRedirect />} />
        {/* URL pública ÚNICA del perfil de creador. /@slug se redirige desde la ruta comodín */}
        <Route path="/p/:username" element={<PublicCreatorPage />} />
        {/* Entrada de la app instalada (manifest start_url) */}
        <Route path="/inicio" element={<InicioRoute />} />
        <Route path="/review/:token" element={<PublicReviewPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Recuperación: fijar contraseña ANTES de cualquier onboarding; maneja enlaces vencidos (otp_expired) */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/no-company" element={<NoCompany />} />
        <Route path="/no-organization" element={<NoOrganization />} />
        <Route path="/pending-access" element={<PendingAccess />} />
        <Route path="/unlock-access" element={<Navigate to="/" replace />} />
        {/* Bienvenida/onboarding de creadores unificado: un solo asistente (OnboardingGateProvider) y
            un solo destino (/bienvenida). Enlaces anteriores (incluido el del formulario externo) siguen vivos. */}
        <Route path="/welcome-talent" element={<Navigate to="/bienvenida" replace />} />
        <Route path="/welcome/ugc-colombia" element={<Navigate to="/bienvenida" replace />} />
        <Route path="/onboarding/profile" element={<Navigate to="/bienvenida" replace />} />
        {/* Formulario público de onboarding de clientes. Sin ProtectedRoute:
            el enlace llega por WhatsApp y el cliente no tiene cuenta.
            React Router prioriza el segmento estático /onboarding/profile
            sobre este dinámico, así que no hay colisión entre ambas. */}
        <Route path="/onboarding/:token" element={<ClientOnboarding />} />
        <Route path="/welcome" element={<Navigate to="/bienvenida" replace />} />
        <Route path="/mcp-docs" element={<MCPDocumentation />} />
        <Route path="/org/:slug/talento" element={<OrgPortfolioPage />} />
        <Route path="/org/:slug/contenido" element={<OrgContentShowcase />} />
        <Route path="/org/:slug" element={<LegacySlugRegistrationRedirect />} />
        {/* Registro público ÚNICO de creadores, parametrizado por organización */}
        <Route path="/registro" element={<GenericRegistrationRedirect />} />
        <Route
          path="/registro/:organizationSlug"
          element={<OrganizationRegistrationPage mode="register" />}
        />
        <Route
          path="/registro/:organizationSlug/continuar"
          element={<OrganizationRegistrationPage mode="continue" />}
        />
        <Route path="/bienvenida" element={<CreatorWelcomeRoute />} />
        {/* Entradas de alta heredadas → registro canónico (conservan UTM/ref y destino seguro) */}
        <Route path="/auth/org/:slug" element={<LegacySlugRegistrationRedirect />} />
        <Route path="/r/:code" element={<ReferralLanding />} />
        <Route path="/register" element={<GenericRegistrationRedirect />} />
        <Route path="/register/:slug" element={<LegacySlugRegistrationRedirect />} />
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
        <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        {/* Altas públicas: solo creadores. Marcas y organizaciones: estado informativo, sin formulario */}
        <Route path="/unete" element={<GenericRegistrationRedirect />} />
        <Route path="/unete/talento" element={<GenericRegistrationRedirect />} />
        <Route path="/unete-talento" element={<GenericRegistrationRedirect />} />
        <Route path="/unete/marcas" element={<SignupClosedPage audience="brand" />} />
        <Route path="/unete/organizaciones" element={<SignupClosedPage audience="organization" />} />
        {/* Partner Communities */}
        <Route path="/comunidad/:slug" element={<PartnerCommunityLanding />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/board"
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
                "content_creator",
                "editor",
                "digital_strategist",
                "creative_strategist",
                "community_manager",
                "client",
              ]}
            >
              <MainLayout>
                <ContentBoard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/content"
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
                "content_creator",
                "editor",
                "digital_strategist",
                "creative_strategist",
                "community_manager",
              ]}
            >
              <MainLayout>
                <Content />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/talent"
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
                "digital_strategist",
                "creative_strategist",
              ]}
            >
              <MainLayout>
                <UnifiedTalentPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
                "digital_strategist",
                "creative_strategist",
                "community_manager",
              ]}
            >
              <MainLayout>
                <UnifiedClientsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients-hub"
          element={<Navigate to="/clientes" replace />}
        />
        <Route path="/creators" element={<Navigate to="/talent" replace />} />
        <Route path="/clients" element={<Navigate to="/clientes" replace />} />
        <Route
          path="/scripts"
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
                "editor",
                "digital_strategist",
                "creative_strategist",
              ]}
            >
              <MainLayout>
                <Scripts />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={<Navigate to="/talent?tab=sin-asignar" replace />}
        />
        {/* CRM Plataforma */}
        <Route
          path="/crm"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <MainLayout>
                <PlatformAdminDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payouts"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <MainLayout>
                <AdminPayoutsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/overview"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <MainLayout>
                <PlatformCRMDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/crm/leads" element={<Navigate to="/crm" replace />} />
        <Route
          path="/crm/organizaciones"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <MainLayout>
                <PlatformCRMOrganizations />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/marcas"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <MainLayout>
                <BrandsCRM />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/marcas/:brandId"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <MainLayout>
                <BrandDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/comunidades"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <MainLayout>
                <PlatformCRMCommunities />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/personas"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <MainLayout>
                <PlatformCRMPeople />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Redirects from old routes */}
        <Route
          path="/crm/creadores"
          element={<Navigate to="/crm/personas?tab=freelancers" replace />}
        />
        <Route
          path="/crm/usuarios"
          element={<Navigate to="/crm/personas?tab=clientes" replace />}
        />
        <Route
          path="/crm/finanzas"
          element={
            <ProtectedRoute requirePlatformAdmin>
              <MainLayout>
                <PlatformCRMFinances />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/email-marketing"
          element={
            <RootOnlyRoute>
              <ProtectedRoute requirePlatformAdmin>
                <MainLayout>
                  <PlatformCRMEmailMarketing />
                </MainLayout>
              </ProtectedRoute>
            </RootOnlyRoute>
          }
        />
        {/* CRM Organización */}
        <Route
          path="/org-crm/finanzas"
          element={
            <ProtectedRoute allowedRoles={["admin", "digital_strategist"]}>
              <MainLayout>
                <OrgCRMFinances />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Social Hub Module */}
        <Route
          path="/social-hub"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <SocialHubPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MainLayout>
                <KAEAnalyticsDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/papelera"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MainLayout>
                <PapeleraPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dev-modules"
          element={
            <RootOnlyRoute>
              <MainLayout>
                <DevModulesPage />
              </MainLayout>
            </RootOnlyRoute>
          }
        />
        <Route
          path="/admin/qa-paginas"
          element={
            <RootOnlyRoute>
              <MainLayout>
                <AllPagesQAPage />
              </MainLayout>
            </RootOnlyRoute>
          }
        />
        {/* Ad Generator Module */}
        <Route
          path="/ad-generator"
          element={
            <ProtectedRoute allowedRoles={["admin", "client"]}>
              <MainLayout>
                <AdGeneratorPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ad-generator/:productId"
          element={
            <ProtectedRoute allowedRoles={["admin", "client"]}>
              <MainLayout>
                <ProductBannersPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/planes"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <PlanesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/freelancer-dashboard"
          element={<Navigate to="/creator-dashboard" replace />}
        />
        <Route
          path="/creator-dashboard"
          element={
            <ProtectedRoute allowNoRoles>
              <MainLayout>
                <CreatorDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor-dashboard"
          element={
            <ProtectedRoute allowedRoles={["editor"]}>
              <MainLayout>
                <EditorDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategist-dashboard"
          element={
            <ProtectedRoute allowedRoles={["digital_strategist"]}>
              <MainLayout>
                <StrategistDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/client-dashboard"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <MainLayout>
                <ClientDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/client-board"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <MainLayout>
                <ClientContentBoard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ambassador"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MainLayout>
                <AmbassadorPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/research/:productId"
          element={
            <ProtectedRoute allowNoRoles>
              <ResearchLanding />
            </ProtectedRoute>
          }
        />
        {/* Profile Builder */}
        <Route
          path="/profile-builder"
          element={
            <ProtectedRoute allowNoRoles>
              <ProfileBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route path="/preview/:token" element={<ProfilePreviewPage />} />
        {/* Template Library (public) */}
        <Route path="/templates" element={<TemplateLibraryPage />} />
        {/* Academia - LMS Module */}
        <Route path="/cert/:certCode" element={<AcademiaVerifyPage />} />
        <Route path="/a/:spaceSlug" element={<AcademiaPublicLandingPage />} />
        <Route
          path="/academia/explorar"
          element={<BlockClientsRoute><AcademiaMarketplacePage /></BlockClientsRoute>}
        />
        <Route
          path="/academia"
          element={<BlockClientsRoute><AcademiaHomePage /></BlockClientsRoute>}
        />
        <Route
          path="/academia/crear"
          element={
            <ProtectedRoute allowNoRoles>
              <AcademiaCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academia/dashboard"
          element={
            <ProtectedRoute allowNoRoles>
              <AcademiaDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academia/:spaceSlug"
          element={<BlockClientsRoute><MainLayout><AcademiaSpaceHomePage /></MainLayout></BlockClientsRoute>}
        />
        <Route
          path="/academia/:spaceSlug/classroom"
          element={
            <RequireAcademyAccess>
              <MainLayout><AcademiaSpaceClassroomPage /></MainLayout>
            </RequireAcademyAccess>
          }
        />
        <Route
          path="/academia/:spaceSlug/gestionar"
          element={
            <ProtectedRoute allowNoRoles>
              <AcademiaManagePage />
            </ProtectedRoute>
          }
        />
        {/* Academia v2 — Community features */}
        <Route
          path="/academia/:spaceSlug/feed"
          element={
            <RequireAcademyAccess>
              <MainLayout><AcademiaSpaceFeedPage /></MainLayout>
            </RequireAcademyAccess>
          }
        />
        {/* Deep-link a un post (notificaciones): abre el feed y resalta el post */}
        <Route
          path="/academia/:spaceSlug/post/:postId"
          element={
            <RequireAcademyAccess>
              <MainLayout><AcademiaSpaceFeedPage /></MainLayout>
            </RequireAcademyAccess>
          }
        />
        <Route
          path="/academia/:spaceSlug/dm"
          element={
            <RequireAcademyAccess>
              <MainLayout><AcademiaSpaceDMPage /></MainLayout>
            </RequireAcademyAccess>
          }
        />
        <Route
          path="/academia/:spaceSlug/calendar"
          element={
            <RequireAcademyAccess>
              <MainLayout><AcademiaSpaceCalendarPage /></MainLayout>
            </RequireAcademyAccess>
          }
        />
        <Route
          path="/academia/:spaceSlug/leaderboard"
          element={
            <RequireAcademyAccess>
              <AcademiaLeaderboardPage />
            </RequireAcademyAccess>
          }
        />
        <Route
          path="/academia/:spaceSlug/map"
          element={
            <RequireAcademyAccess>
              <AcademiaMapPage />
            </RequireAcademyAccess>
          }
        />
        <Route
          path="/academia/:spaceSlug/admin"
          element={
            <ProtectedRoute allowNoRoles>
              <AcademiaSpaceAdminPage />
            </ProtectedRoute>
          }
        />
        {/* Academia v2 — Challenges */}
        <Route
          path="/academia/:spaceSlug/retos"
          element={
            <RequireAcademyAccess>
              <AcademiaChallengesPage />
            </RequireAcademyAccess>
          }
        />
        <Route
          path="/academia/:spaceSlug/retos/:challengeSlug"
          element={
            <RequireAcademyAccess>
              <AcademiaChallengeDetailPage />
            </RequireAcademyAccess>
          }
        />
        {/* Academia v3 — Members + Calendar OAuth callbacks */}
        <Route
          path="/academia/:spaceSlug/members"
          element={
            <RequireAcademyAccess>
              <MainLayout><AcademiaSpaceMembersPage /></MainLayout>
            </RequireAcademyAccess>
          }
        />
        <Route
          path="/academia/calendar/callback"
          element={
            <ProtectedRoute allowNoRoles>
              <AcademiaCalendarCallbackPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academia/calendar/member-callback"
          element={
            <ProtectedRoute allowNoRoles>
              <AcademiaMemberCalendarCallbackPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academia/:spaceSlug/:courseSlug/edit"
          element={
            <ProtectedRoute allowNoRoles>
              <AcademiaCourseEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academia/:spaceSlug/:courseSlug"
          element={
            <RequireAcademyAccess>
              <AcademiaCoursePage />
            </RequireAcademyAccess>
          }
        />
        <Route
          path="/academia/:spaceSlug/:courseSlug/learn"
          element={
            <RequireAcademyAccess>
              <AcademiaPlayerPage />
            </RequireAcademyAccess>
          }
        />
        {/* Redirects de URLs de módulos eliminados (evitar 404 en links/bookmarks viejos) */}
        <Route path="/marketing" element={<Navigate to="/social-hub" replace />} />
        <Route path="/marketing-ads" element={<Navigate to="/ad-generator" replace />} />
        <Route path="/feed" element={<Navigate to="/marketplace" replace />} />
        <Route path="/demo" element={<Navigate to="/dashboard" replace />} />
        <Route path="/admin/ad-intelligence" element={<Navigate to="/admin/analytics" replace />} />
        <Route path="/admin/social-scraper" element={<Navigate to="/admin/analytics" replace />} />
        <Route path="/org-crm" element={<Navigate to="/clientes" replace />} />
        <Route path="/org-crm/contactos" element={<Navigate to="/clientes" replace />} />
        <Route path="/org-crm/creadores" element={<Navigate to="/clientes" replace />} />
        <Route path="/org-crm/pipelines" element={<Navigate to="/clientes" replace />} />
        <Route path="/wallet" element={<Navigate to="/creator-dashboard" replace />} />
        <Route path="/wallet/*" element={<Navigate to="/creator-dashboard" replace />} />
        <Route path="/admin/wallets" element={<Navigate to="/admin/payouts" replace />} />
        <Route path="*" element={<CatchAllRoute fallback={<NotFound />} />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AccessGateProvider>
        <BrandingProvider>
          <AuthProvider>
            <AuthStoreBridge />
            <ScopedQueryPersistence />
            <OnboardingGateProvider>
              <RoleLegalGateProvider>
                <CurrencyProvider>
                  <AnalyticsProvider>
                    <ImpersonationProvider>
                      <TrialProvider>
                        <UnsavedChangesProvider>
                          <StrategistClientProvider>
                              <AICopilotProvider>
                                <KiroProvider>
                                  <GenerationJobProvider>
                                    <TooltipProvider delayDuration={0}>
                                      <ImpersonationBanner />
                                      <Toaster />
                                      <Sonner />
                                      <AcademyLiveToaster />
                                      <UpdatePrompt />
                                      <PageLoader />
                                      <MarketplaceReadinessPopup />
                                      <CookieConsentBanner />
                                      <ScrollToTop />
                                      <FloatingGenerationBadge />
                                      <ErrorBoundary>
                                        <CreatorFavoritesProvider>
                                          <AppRoutes />
                                        </CreatorFavoritesProvider>
                                      </ErrorBoundary>
                                    </TooltipProvider>
                                  </GenerationJobProvider>
                                </KiroProvider>
                              </AICopilotProvider>
                          </StrategistClientProvider>
                        </UnsavedChangesProvider>
                      </TrialProvider>
                    </ImpersonationProvider>
                  </AnalyticsProvider>
                </CurrencyProvider>
              </RoleLegalGateProvider>
            </OnboardingGateProvider>
          </AuthProvider>
        </BrandingProvider>
      </AccessGateProvider>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="kreoon-theme"
    >
      <AppContent />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
