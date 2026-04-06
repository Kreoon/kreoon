import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { TrialBanner } from "./TrialBanner";
import { IntegratedNotificationHeader } from "@/components/notifications/IntegratedNotificationHeader";
import { TourProvider } from "@/components/tour/TourProvider";
import { AmbassadorCelebration } from "@/components/AmbassadorCelebration";
import { KiroWidget } from "@/components/kiro/KiroWidget";
import { useAuth } from "@/hooks/useAuth";
import { useOrgMarketplace } from "@/hooks/useOrgMarketplace";
import { usePresence } from "@/hooks/usePresence";
import { useClientRealtimeNotifications } from "@/hooks/useClientRealtimeNotifications";
import { useClientPendingReviews } from "@/hooks/useClientPendingReviews";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Kanban, Settings, LogOut, Sparkles, Scissors, Briefcase, Eye, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Page transition variants for smooth animations
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 }
  },
};

interface MainLayoutProps {
  children: ReactNode;
}

// Editor navigation items for mobile bottom bar - Kreoon Tech theme
const editorMobileNavigation = [
  { name: "Edición", href: "/editor-dashboard", icon: LayoutDashboard },
  { name: "Producciones", href: "/board", icon: Kanban },
  { name: "Market", href: "/marketplace", icon: Briefcase },
  { name: "Kreoon IA", href: "/scripts", icon: Sparkles },
  { name: "Config", href: "/settings", icon: Settings },
];

// Creator navigation items for mobile bottom bar
const creatorMobileNavigation = [
  { name: "Hub", href: "/creator-dashboard", icon: LayoutDashboard },
  { name: "Producciones", href: "/board", icon: Kanban },
  { name: "Market", href: "/marketplace", icon: Briefcase },
  { name: "Kreoon IA", href: "/scripts", icon: Sparkles },
  { name: "Config", href: "/settings", icon: Settings },
];

// Animated page wrapper component
function PageWrapper({ children, locationKey }: { children: ReactNode; locationKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={locationKey}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function MainLayout({
  children
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isClient, isAdmin, activeRole, signOut, profile, user } = useAuth();
  const { marketplaceEnabled, clientMarketplaceEnabled } = useOrgMarketplace();
  const location = useLocation();
  const navigate = useNavigate();

  // Track user presence
  usePresence();

  // Client realtime notifications (for new videos, comments)
  useClientRealtimeNotifications();

  // Client pending reviews count (for global banner)
  const pendingReviews = useClientPendingReviews();

  // Detect marketplace routes for dark styling
  const isMarketplaceRoute = location.pathname.startsWith('/marketplace');

  // For content creators, show creator-specific layout with bottom nav on mobile
  if ((activeRole === 'creator' || activeRole === 'content_creator') && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        {/* Creator Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>

        {/* Creator Mobile Header */}
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-3 md:hidden">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-pink-500 flex-shrink-0">
              <Clapperboard className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold truncate">Panel Creador</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(user?.id ? `/p/${user.id}` : '/creator-dashboard')}
              className="h-8 w-8 rounded-full p-0"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
            {marketplaceEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/marketplace')}
                className="h-8 w-8 rounded-full"
              >
                <Briefcase className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Creator Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
          <div className="flex justify-around py-2">
            {creatorMobileNavigation.filter(item => item.href !== '/marketplace' || marketplaceEnabled).map((item) => {
              const isActive = item.href.startsWith('/marketplace')
                ? location.pathname.startsWith(item.href)
                : location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded-sm transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Desktop Integrated Notification Header */}
        <div className="hidden md:block">
          <IntegratedNotificationHeader
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "pb-16 md:pb-0 transition-all duration-300",
            sidebarCollapsed ? "md:ml-[104px]" : "md:ml-[288px]",
            "md:pt-14"
          )}
        >
          <div className={cn("min-h-screen", isMarketplaceRoute ? "bg-background" : "p-4 md:p-6")}>
            <PageWrapper locationKey={location.pathname}>
              {children}
            </PageWrapper>
          </div>
        </main>

        {/* KIRO AI Assistant */}
        <KiroWidget />

        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }

  // For editors, show editor-specific layout with bottom nav on mobile
  // IMPORTANT: Use activeRole instead of isEditor to respect the user's selected role
  // isEditor was true for ALL talent users, causing creators to see "Panel Editor"
  if (activeRole === 'editor' && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        {/* Editor Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>
        
        {/* Editor Mobile Header */}
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-3 md:hidden">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-blue-500 flex-shrink-0">
              <Scissors className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold truncate">Panel Editor</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(user?.id ? `/p/${user.id}` : '/editor-dashboard')}
              className="h-8 w-8 rounded-full p-0"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
            {marketplaceEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/marketplace')}
                className="h-8 w-8 rounded-full"
              >
                <Briefcase className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Editor Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
          <div className="flex justify-around py-2">
            {editorMobileNavigation.filter(item => item.href !== '/marketplace' || marketplaceEnabled).map((item) => {
              const isActive = item.href.startsWith('/marketplace')
                ? location.pathname.startsWith(item.href)
                : location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded-sm transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Desktop Integrated Notification Header */}
        <div className="hidden md:block">
          <IntegratedNotificationHeader
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "pb-16 md:pb-0 transition-all duration-300",
            sidebarCollapsed ? "md:ml-[104px]" : "md:ml-[288px]",
            "md:pt-14"
          )}
        >
          <div className={cn("min-h-screen", isMarketplaceRoute ? "bg-background" : "p-4 md:p-6")}>
            <PageWrapper locationKey={location.pathname}>
              {children}
            </PageWrapper>
          </div>
        </main>

        {/* KIRO AI Assistant */}
        <KiroWidget />

        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }

  // For clients, reuse the main Sidebar so navigation + role switcher stay consistent
  if (isClient) {
    const hasBanner = pendingReviews.total > 0;
    const bannerHeight = 44; // h-11 = 44px

    return (
      <div className="min-h-screen bg-background">
        {/* Client Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>

        {/* Global Review Alert Banner - Fixed at top on desktop, sticky on mobile */}
        {hasBanner && (
          <div className={cn(
            "fixed top-0 right-0 z-[60] h-11",
            "bg-gradient-to-r from-purple-600 via-purple-500 to-white dark:from-purple-600 dark:via-purple-800 dark:to-zinc-950",
            sidebarCollapsed ? "left-0 md:left-[104px]" : "left-0 md:left-[288px]"
          )}>
            <div className="h-full px-4 flex items-center">
              <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-white/30 dark:bg-white/20">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <p className="font-medium text-sm text-white drop-shadow-sm">
                    {pendingReviews.scriptCount > 0 && (
                      <span>{pendingReviews.scriptCount} guión{pendingReviews.scriptCount > 1 ? 'es' : ''}</span>
                    )}
                    {pendingReviews.scriptCount > 0 && pendingReviews.videoCount > 0 && (
                      <span className="mx-1">y</span>
                    )}
                    {pendingReviews.videoCount > 0 && (
                      <span>{pendingReviews.videoCount} video{pendingReviews.videoCount > 1 ? 's' : ''}</span>
                    )}
                    <span className="hidden sm:inline text-white/80 ml-1">
                      por revisar
                    </span>
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/client-dashboard?tab=review')}
                  className="shrink-0 rounded-sm bg-white text-purple-600 hover:bg-purple-50 font-semibold shadow-md h-8"
                >
                  Revisar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Client Mobile Header */}
        <header
          className="sticky z-50 flex h-14 items-center border-b border-border bg-background px-3 md:hidden"
          style={{ top: hasBanner ? bannerHeight : 0 }}
        >
          <MobileNav />
          <div className="flex-1 flex justify-center min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-sm overflow-hidden flex-shrink-0">
                <img src="/favicon.png" alt="KREOON" className="h-7 w-7 object-cover" loading="lazy" />
              </div>
              <span className="text-sm font-bold truncate">Portal Cliente</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(user?.id ? `/p/${user.id}` : '/client-dashboard')}
              className="h-8 w-8 rounded-full p-0"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
            {clientMarketplaceEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/marketplace')}
                className="h-8 w-8 rounded-full"
              >
                <Briefcase className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Desktop Integrated Notification Header */}
        <div className="hidden md:block">
          <IntegratedNotificationHeader
            sidebarCollapsed={sidebarCollapsed}
            topOffset={hasBanner ? bannerHeight : 0}
          />
        </div>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "transition-all duration-300",
            sidebarCollapsed ? "md:ml-[104px]" : "md:ml-[288px]"
          )}
          style={{ paddingTop: hasBanner ? bannerHeight + 56 : 56 }} // 56px = h-14 del header
        >
          <div className={cn("min-h-screen", isMarketplaceRoute ? "bg-background" : "p-4 md:p-6")}>
            <PageWrapper locationKey={location.pathname}>
              {children}
            </PageWrapper>
          </div>
        </main>

        {/* KIRO AI Assistant */}
        <KiroWidget />

        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }

  // Default admin/other layout - El Estudio theme
  return (
    <div className="min-h-screen bg-background relative">
      {/* Tech ambient background effects - hidden on mobile for performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 hidden md:block">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/[0.02] rounded-full blur-[180px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[150px]" />
      </div>
      
      {/* Trial Banner - Shows when billing is enabled and trial is expiring/expired */}
      <TrialBanner 
        organizationId={profile?.current_organization_id || null} 
        onUpgrade={() => navigate('/planes')}
      />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-3 md:hidden">
        <MobileNav />
        <div className="flex-1 flex justify-center min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm overflow-hidden flex-shrink-0">
              <img src="/favicon.png" alt="KREOON" className="h-7 w-7 object-cover" loading="lazy" />
            </div>
            <span className="text-sm font-bold truncate">KREOON</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(user?.id ? `/p/${user.id}` : '/marketplace')}
            className="h-8 w-8 rounded-full p-0"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="h-8 w-8 rounded-full"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Desktop Integrated Notification Header */}
      <div className="hidden md:block">
        <IntegratedNotificationHeader
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>

      {/* Main Content */}
      <main
        id="main-content"
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "md:ml-[104px]" : "md:ml-[288px]",
          "md:pt-14"
        )}
      >
        <div className={cn("min-h-screen", isMarketplaceRoute ? "bg-background" : "p-4 md:p-6")}>
          <PageWrapper locationKey={location.pathname}>
            {children}
          </PageWrapper>
        </div>
      </main>

      {/* KIRO AI Assistant */}
      <KiroWidget />

      {/* Tour Provider */}
      <TourProvider />

      {/* Ambassador Celebration */}
      <AmbassadorCelebration />
    </div>
  );
}
