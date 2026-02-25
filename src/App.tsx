import { Suspense, lazy, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
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
import { MainLayout } from "./components/layout/MainLayout";

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
  <div className="min-h-screen flex items-center justify-center bg-black">
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
const PortfolioShell = lazyWithRetry(() => import("./pages/portfolio/PortfolioShell"));
const ExplorePage = lazyWithRetry(() => import("./pages/portfolio/ExplorePage"));
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

// Wallet Module Pages
const WalletPage = lazyWithRetry(() => import("./modules/wallet/pages/WalletPage").then(m => ({ default: m.WalletPage })));
const TransactionsPage = lazyWithRetry(() => import("./modules/wallet/pages/TransactionsPage").then(m => ({ default: m.TransactionsPage })));
const WithdrawalsPage = lazyWithRetry(() => import("./modules/wallet/pages/WithdrawalsPage").then(m => ({ default: m.WithdrawalsPage })));
const AdminWalletsPage = lazyWithRetry(() => import("./modules/wallet/pages/AdminWalletsPage").then(m => ({ default: m.AdminWalletsPage })));

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

  // Listen for new content notifications (strategists/admins only)
  useNewContentNotifications();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes key={impersonationKey}>
        <Route path="/social" element={<ProtectedRoute allowNoRoles><PortfolioShell /></ProtectedRoute>} />
        <Route path="/social/*" element={<ProtectedRoute allowNoRoles><PortfolioShell /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute allowNoRoles><ExplorePage /></ProtectedRoute>} />
        <Route path="/company/:username" element={<CompanyProfilePage />} />
        <Route path="/profile/:userId" element={<PublicProfilePage />} />
        <Route path="/profile" element={<ProfileRedirect />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/no-company" element={<NoCompany />} />
        <Route path="/no-organization" element={<NoOrganization />} />
        <Route path="/pending-access" element={<PendingAccess />} />
        <Route path="/welcome" element={<WelcomeNewMember />} />
        <Route path="/up-documentation" element={<UPDocumentation />} />
        <Route path="/org/:slug" element={<OrgAuth />} />
        <Route path="/auth/org/:slug" element={<OrgRegister />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/:slug" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'team_leader']}><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/board" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'creator']}><MainLayout><ContentBoard /></MainLayout></ProtectedRoute>} />
        <Route path="/content" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Content /></MainLayout></ProtectedRoute>} />
        <Route path="/creators" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Creators /></MainLayout></ProtectedRoute>} />
        <Route path="/scripts" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'strategist']}><MainLayout><Scripts /></MainLayout></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Clients /></MainLayout></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Team /></MainLayout></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute allowedRoles={['admin', 'strategist']}><MainLayout><Live /></MainLayout></ProtectedRoute>} />
        <Route path="/marketing" element={<ProtectedRoute allowedRoles={['admin', 'strategist']}><MainLayout><Marketing /></MainLayout></ProtectedRoute>} />
        {/* Wallet Module Routes */}
        <Route path="/wallet" element={<ProtectedRoute allowNoRoles><MainLayout><WalletPage /></MainLayout></ProtectedRoute>} />
        <Route path="/wallet/transactions" element={<ProtectedRoute allowNoRoles><MainLayout><TransactionsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/wallet/withdrawals" element={<ProtectedRoute allowNoRoles><MainLayout><WithdrawalsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/wallets" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><AdminWalletsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowNoRoles><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
        <Route path="/creator-dashboard" element={<ProtectedRoute allowedRoles={['creator']}><MainLayout><CreatorDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/editor-dashboard" element={<ProtectedRoute allowedRoles={['editor']}><MainLayout><EditorDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/strategist-dashboard" element={<ProtectedRoute allowedRoles={['strategist']}><MainLayout><StrategistDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/client-dashboard" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><ClientDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/client-board" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><ClientContentBoard /></MainLayout></ProtectedRoute>} />
        <Route path="/ranking" element={<ProtectedRoute allowedRoles={['admin', 'creator', 'editor']}><MainLayout><Ranking /></MainLayout></ProtectedRoute>} />
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
          <TrackingProvider>
            <ImpersonationProvider>
              <TrialProvider>
                <UnsavedChangesProvider>
                  <AchievementNotificationProvider>
                    <StrategistClientProvider>
                      <AICopilotProvider>
                        <TooltipProvider delayDuration={0}>
                          <ImpersonationBanner />
                          <Toaster />
                          <Sonner />
                          <UpdatePrompt />
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
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
