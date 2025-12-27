import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AchievementNotificationProvider } from "@/components/points/AchievementNotificationProvider";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";
import { AICopilotProvider } from "@/contexts/AICopilotContext";
import Dashboard from "./pages/Dashboard";
import ContentBoard from "./pages/ContentBoard";
import Auth from "./pages/Auth";
import Content from "./pages/Content";
import Creators from "./pages/Creators";
import Scripts from "./pages/Scripts";
import Clients from "./pages/Clients";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import CreatorDashboard from "./pages/CreatorDashboard";
import EditorDashboard from "./pages/EditorDashboard";
import StrategistDashboard from "./pages/StrategistDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import ClientContentBoard from "./pages/ClientContentBoard";
import Portfolio from "./pages/Portfolio";
import PortfolioShell from "./pages/portfolio/PortfolioShell";
import ClientPortfolio from "./pages/ClientPortfolio";
import UserPortfolio from "./pages/UserPortfolio";
import Ranking from "./pages/Ranking";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import NoCompany from "./pages/NoCompany";
import NoOrganization from "./pages/NoOrganization";
import CompanyPortfolio from "./pages/CompanyPortfolio";
import PendingAccess from "./pages/PendingAccess";
import UPDocumentation from "./pages/UPDocumentation";
import OrgAuth from "./pages/OrgAuth";
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

// Component to redirect /profile to user's own portfolio
function ProfileRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" /></div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <Navigate to={`/p/${user.id}`} replace />;
}

function AppRoutes() {
  const { impersonationKey } = useImpersonation();
  
  return (
    <Routes key={impersonationKey}>
      <Route path="/portfolio" element={<Portfolio />} />
      <Route path="/portfolio/:clientId" element={<ClientPortfolio />} />
      <Route path="/p/:id" element={<UserPortfolio />} />
      <Route path="/@:id" element={<UserPortfolio />} />
      <Route path="/empresa/:id" element={<CompanyPortfolio />} />
      <Route path="/empresa/@:id" element={<CompanyPortfolio />} />
      <Route path="/social" element={<ProtectedRoute><PortfolioShell /></ProtectedRoute>} />
      <Route path="/social/*" element={<ProtectedRoute><PortfolioShell /></ProtectedRoute>} />
      <Route path="/profile" element={<ProfileRedirect />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/no-company" element={<NoCompany />} />
      <Route path="/no-organization" element={<NoOrganization />} />
      <Route path="/pending-access" element={<PendingAccess />} />
      <Route path="/up-documentation" element={<UPDocumentation />} />
      <Route path="/org/:slug" element={<OrgAuth />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/" element={<ProtectedRoute allowedRoles={['admin', 'ambassador']}><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/board" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'creator']}><MainLayout><ContentBoard /></MainLayout></ProtectedRoute>} />
      <Route path="/content" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Content /></MainLayout></ProtectedRoute>} />
      <Route path="/creators" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Creators /></MainLayout></ProtectedRoute>} />
      <Route path="/scripts" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'strategist']}><MainLayout><Scripts /></MainLayout></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Clients /></MainLayout></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Team /></MainLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
      <Route path="/creator-dashboard" element={<ProtectedRoute allowedRoles={['creator']}><MainLayout><CreatorDashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/editor-dashboard" element={<ProtectedRoute allowedRoles={['editor']}><MainLayout><EditorDashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/strategist-dashboard" element={<ProtectedRoute allowedRoles={['strategist']}><MainLayout><StrategistDashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/client-dashboard" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><ClientDashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/client-board" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><ClientContentBoard /></MainLayout></ProtectedRoute>} />
      <Route path="/ranking" element={<ProtectedRoute allowedRoles={['admin', 'creator', 'editor', 'ambassador']}><MainLayout><Ranking /></MainLayout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ImpersonationProvider>
          <UnsavedChangesProvider>
            <AchievementNotificationProvider>
              <AICopilotProvider>
                <TooltipProvider delayDuration={0}>
                  <ImpersonationBanner />
                  <Toaster />
                  <Sonner />
                  <AppRoutes />
                </TooltipProvider>
              </AICopilotProvider>
            </AchievementNotificationProvider>
          </UnsavedChangesProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
