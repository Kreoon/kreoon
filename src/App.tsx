import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { KreoonToastProvider } from "@/components/ui/kreoon";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { TrackingProvider } from "@/contexts/TrackingContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { StrategistClientProvider } from "@/contexts/StrategistClientContext";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { ScrollToTopButton } from "@/components/ui/kreoon";
import { HelmetProvider } from "react-helmet-async";
import { SkipLink } from "@/lib/accessibility";
import { ErrorBoundary } from "@/components/error";
import { SystemStatusBanner } from "@/components/ui/kreoon";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import Auth from "./pages/Auth";
import Content from "./pages/Content";
import Creators from "./pages/Creators";
import Clients from "./pages/Clients";
import Team from "./pages/Team";
import PortfolioShell from "./pages/portfolio/PortfolioShell";
import CompanyProfilePage from "./pages/portfolio/CompanyProfilePage";

const ExplorePage = lazy(() => import("./pages/portfolio/ExplorePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ContentBoard = lazy(() => import("./pages/ContentBoard"));
const ClientContentBoard = lazy(() => import("./pages/ClientContentBoard"));
const Settings = lazy(() => import("./pages/Settings"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const EditorDashboard = lazy(() => import("./pages/EditorDashboard"));
const StrategistDashboard = lazy(() => import("./pages/StrategistDashboard"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Scripts = lazy(() => import("./pages/Scripts"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Live = lazy(() => import("./pages/Live"));
import PublicProfilePage from "./pages/portfolio/PublicProfilePage";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import NoCompany from "./pages/NoCompany";
import NoOrganization from "./pages/NoOrganization";
import PendingAccess from "./pages/PendingAccess";
import WelcomeNewMember from "./pages/WelcomeNewMember";
import UPDocumentation from "./pages/UPDocumentation";
import OrgAuth from "./pages/OrgAuth";
import HomePage from "./pages/HomePage";
import Register from "./pages/Register";
import OrgRegister from "./pages/auth/OrgRegister";
import ResetPassword from "./pages/ResetPassword";
import Maintenance from "./pages/Maintenance";
import ComingSoon from "./pages/ComingSoon";
import { MainLayout } from "./components/layout/MainLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Increase stale time to reduce background refetches on tab switch
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
    },
  },
});

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

// Component to redirect /profile to social
function ProfileRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" /></div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <Navigate to="/social#profile" replace />;
}

function AppRoutes() {
  const { impersonationKey } = useImpersonation();
  useScrollToTop();

  // Listen for new content notifications (strategists/admins only)
  useNewContentNotifications();
  
  return (
    <Routes key={impersonationKey}>
      <Route path="/social" element={<ProtectedRoute allowNoRoles><PortfolioShell /></ProtectedRoute>} />
      <Route path="/social/*" element={<ProtectedRoute allowNoRoles><PortfolioShell /></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute allowNoRoles><Suspense fallback={<PageFallback />}><ExplorePage /></Suspense></ProtectedRoute>} />
      <Route path="/company/:username" element={<CompanyProfilePage />} />
      <Route path="/profile/:userId" element={<PublicProfilePage />} />
      <Route path="/profile" element={<ProfileRedirect />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/no-company" element={<NoCompany />} />
      <Route path="/no-organization" element={<NoOrganization />} />
      <Route path="/pending-access" element={<PendingAccess />} />
      <Route path="/welcome" element={<WelcomeNewMember />} />
      <Route path="/up-documentation" element={<UPDocumentation />} />
      {/* Public org registration (official) */}
      <Route path="/org/:slug" element={<OrgRegister />} />

      {/* Backwards-compat: redirect old route to the official one */}
      <Route path="/auth/org/:slug" element={<Navigate to="/org/:slug" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/:slug" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'team_leader']}><MainLayout><Suspense fallback={<PageFallback />}><Dashboard /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/board" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'creator']}><MainLayout><Suspense fallback={<PageFallback />}><ContentBoard /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/content" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Content /></MainLayout></ProtectedRoute>} />
      <Route path="/creators" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Creators /></MainLayout></ProtectedRoute>} />
      <Route path="/scripts" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'strategist']}><MainLayout><Suspense fallback={<PageFallback />}><Scripts /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Clients /></MainLayout></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Team /></MainLayout></ProtectedRoute>} />
      <Route path="/live" element={<ProtectedRoute allowedRoles={['admin', 'strategist']}><MainLayout><Suspense fallback={<PageFallback />}><Live /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/marketing" element={<ProtectedRoute allowedRoles={['admin', 'strategist']}><MainLayout><Suspense fallback={<PageFallback />}><Marketing /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowNoRoles><MainLayout><Suspense fallback={<PageFallback />}><Settings /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/creator-dashboard" element={<ProtectedRoute allowedRoles={['creator']}><MainLayout><Suspense fallback={<PageFallback />}><CreatorDashboard /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/editor-dashboard" element={<ProtectedRoute allowedRoles={['editor']}><MainLayout><Suspense fallback={<PageFallback />}><EditorDashboard /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/strategist-dashboard" element={<ProtectedRoute allowedRoles={['strategist']}><MainLayout><Suspense fallback={<PageFallback />}><StrategistDashboard /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/client-dashboard" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><Suspense fallback={<PageFallback />}><ClientDashboard /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/client-board" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><Suspense fallback={<PageFallback />}><ClientContentBoard /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/ranking" element={<ProtectedRoute allowedRoles={['admin', 'creator', 'editor']}><MainLayout><Suspense fallback={<PageFallback />}><Ranking /></Suspense></MainLayout></ProtectedRoute>} />
      
      {/* Utility pages */}
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/coming-soon" element={<ComingSoon />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppContent() {
  const systemStatus = useSystemStatus();

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <BrandingProvider>
            <AuthProvider>
              <TrackingProvider>
                <ImpersonationProvider>
                  <TrialProvider>
                    <UnsavedChangesProvider>
                      <AchievementNotificationProvider>
                        <StrategistClientProvider>
                          <AICopilotProvider>
                            <TooltipProvider delayDuration={0}>
                              <SkipLink />
                              
                              {/* Banner de estado del sistema */}
                              {systemStatus && systemStatus.status !== "operational" && (
                                <SystemStatusBanner
                                  status={systemStatus.status}
                                  message={systemStatus.message}
                                  link={systemStatus.link}
                                  dismissible
                                />
                              )}
                              
                              <ImpersonationBanner />
                              <Toaster />
                              <KreoonToastProvider />
                              <UpdatePrompt />
                              <ScrollToTopButton />
                              <AppRoutes />
                            </TooltipProvider>
                          </AICopilotProvider>
                        </StrategistClientProvider>
                      </AchievementNotificationProvider>
                    </UnsavedChangesProvider>
                  </TrialProvider>
                </ImpersonationProvider>
              </TrackingProvider>
            </AuthProvider>
          </BrandingProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
