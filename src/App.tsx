import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import ClientDashboard from "./pages/ClientDashboard";
import ClientContentBoard from "./pages/ClientContentBoard";
import Portfolio from "./pages/Portfolio";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/layout/MainLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid "page reload" feeling when switching tabs/minimizing (auto-refetch on focus).
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 30_000,
    },
  },
});

function AppContent() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider delayDuration={0}>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<ProtectedRoute allowedRoles={['admin', 'ambassador']}><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
            <Route path="/board" element={<ProtectedRoute allowedRoles={['admin', 'editor']}><MainLayout><ContentBoard /></MainLayout></ProtectedRoute>} />
            <Route path="/content" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Content /></MainLayout></ProtectedRoute>} />
            <Route path="/creators" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Creators /></MainLayout></ProtectedRoute>} />
            <Route path="/scripts" element={<ProtectedRoute allowedRoles={['admin', 'editor']}><MainLayout><Scripts /></MainLayout></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Clients /></MainLayout></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute allowedRoles={['admin']}><MainLayout><Team /></MainLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
            <Route path="/creator-dashboard" element={<ProtectedRoute allowedRoles={['creator']}><MainLayout><CreatorDashboard /></MainLayout></ProtectedRoute>} />
            <Route path="/editor-dashboard" element={<ProtectedRoute allowedRoles={['editor']}><MainLayout><EditorDashboard /></MainLayout></ProtectedRoute>} />
            <Route path="/client-dashboard" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><ClientDashboard /></MainLayout></ProtectedRoute>} />
            <Route path="/client-board" element={<ProtectedRoute allowedRoles={['client']}><MainLayout><ClientContentBoard /></MainLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
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
