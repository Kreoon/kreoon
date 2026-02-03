import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { TrialBanner } from "./TrialBanner";
import { IntegratedNotificationHeader } from "@/components/notifications/IntegratedNotificationHeader";
import { EnhancedChatDrawer } from "@/components/chat/EnhancedChatDrawer";
import { EnhancedChatButton } from "@/components/chat/EnhancedChatButton";
import { TourProvider } from "@/components/tour/TourProvider";
import { AmbassadorCelebration } from "@/components/AmbassadorCelebration";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useClientRealtimeNotifications } from "@/hooks/useClientRealtimeNotifications";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Kanban, Settings, LogOut, Video, Sparkles, Scissors, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MainLayoutProps {
  children: ReactNode;
}

// Editor navigation items for mobile bottom bar
const editorMobileNavigation = [
  { name: "Dashboard", href: "/editor-dashboard", icon: LayoutDashboard },
  { name: "Tablero", href: "/board", icon: Kanban },
  { name: "Contenido", href: "/social", icon: Video },
  { name: "Guiones", href: "/scripts", icon: Sparkles },
  { name: "Config", href: "/settings", icon: Settings },
];

export function MainLayout({
  children
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { isClient, isEditor, isAdmin, isCreator, signOut, profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Track user presence
  usePresence();
  
  // Client realtime notifications (for new videos, comments)
  useClientRealtimeNotifications();
  
  // Setup chat notifications with sound
  const { unreadCount: unreadChatCount } = useChatNotifications(chatOpen, activeConversationId);

  // For editors, show editor-specific layout with bottom nav on mobile
  if (isEditor && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        {/* Editor Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>
        
        {/* Editor Mobile Header */}
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
              <Scissors className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold">Panel Editor</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(user?.id ? `/p/${user.id}` : '/social')}
              className="h-9 w-9 rounded-full p-0"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/social')}
              className="h-9 w-9 rounded-full"
            >
              <Briefcase className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Editor Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
          <div className="flex justify-around py-2">
            {editorMobileNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors",
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
            onChatClick={() => setChatOpen(!chatOpen)}
            isChatOpen={chatOpen}
            unreadChatCount={unreadChatCount}
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>
        
        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "pb-16 md:pb-0 transition-all duration-300",
            sidebarCollapsed ? "md:ml-20" : "md:ml-64",
            chatOpen ? 'md:mr-96' : '',
            "md:pt-14" // Add padding for the header
          )}
        >
          <div className="min-h-screen p-4 md:p-6">
            {children}
          </div>
        </main>

        {/* Floating Chat Button */}
        <EnhancedChatButton 
          onClick={() => setChatOpen(!chatOpen)} 
          isOpen={chatOpen} 
          unreadCount={unreadChatCount} 
        />

        {/* Chat Panel */}
        <EnhancedChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} onActiveConversationChange={setActiveConversationId} />


        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }
  
  // For clients, reuse the main Sidebar so navigation + role switcher stay consistent
  if (isClient) {
    return (
      <div className="min-h-screen bg-background">
        {/* Client Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>

        {/* Client Mobile Header */}
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
          <MobileNav />
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden">
                <img src="/favicon.png" alt="KREOON" className="h-7 w-7 object-cover" />
              </div>
              <span className="text-sm font-bold">Portal Cliente</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(user?.id ? `/p/${user.id}` : '/social')}
              className="h-9 w-9 rounded-full p-0"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/social')}
              className="h-9 w-9 rounded-full"
            >
              <Briefcase className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Desktop Integrated Notification Header */}
        <div className="hidden md:block">
          <IntegratedNotificationHeader
            onChatClick={() => setChatOpen(!chatOpen)}
            isChatOpen={chatOpen}
            unreadChatCount={unreadChatCount}
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "transition-all duration-300",
            sidebarCollapsed ? "md:ml-20" : "md:ml-64",
            chatOpen ? 'md:mr-96' : '',
            "md:pt-14"
          )}
        >
          <div className="min-h-screen p-4 md:p-6">
            {children}
          </div>
        </main>

        {/* Floating Chat Button */}
        <EnhancedChatButton 
          onClick={() => setChatOpen(!chatOpen)} 
          isOpen={chatOpen} 
          unreadCount={unreadChatCount} 
        />

        {/* Chat Panel */}
        <EnhancedChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} onActiveConversationChange={setActiveConversationId} />

        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }
  
  // Default admin/other layout
  return (
    <div className="min-h-screen bg-background relative">
      {/* Tech ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/[0.02] rounded-full blur-[180px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[150px]" />
      </div>
      
      {/* Trial Banner - Shows when billing is enabled and trial is expiring/expired */}
      <TrialBanner 
        organizationId={profile?.current_organization_id || null} 
        onUpgrade={() => navigate('/settings?section=planes-org')}
      />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
        <MobileNav />
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden">
              <img src="/favicon.png" alt="KREOON" className="h-7 w-7 object-cover" />
            </div>
            <span className="text-sm font-bold">KREOON</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(user?.id ? `/p/${user.id}` : '/social')}
            className="h-9 w-9 rounded-full p-0"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/social')}
            className="h-9 w-9 rounded-full"
          >
            <Briefcase className="h-4 w-4" />
          </Button>
          <NotificationBell />
        </div>
      </header>
      
      {/* Desktop Integrated Notification Header */}
      <div className="hidden md:block">
        <IntegratedNotificationHeader
          onChatClick={() => setChatOpen(!chatOpen)}
          isChatOpen={chatOpen}
          unreadChatCount={unreadChatCount}
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>
      
      {/* Main Content */}
      <main
        id="main-content"
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "md:ml-20" : "md:ml-64",
          chatOpen ? 'md:mr-96' : '',
          "md:pt-14" // Add padding for the header
        )}
      >
        <div className="min-h-screen p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Floating Chat Button */}
      <EnhancedChatButton 
        onClick={() => setChatOpen(!chatOpen)} 
        isOpen={chatOpen} 
        unreadCount={unreadChatCount} 
      />

      {/* Chat Panel */}
      <EnhancedChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} onActiveConversationChange={setActiveConversationId} />

      {/* Tour Provider */}
      <TourProvider />


      {/* Ambassador Celebration */}
      <AmbassadorCelebration />
    </div>
  );
}
