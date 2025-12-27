import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { IntegratedNotificationHeader } from "@/components/notifications/IntegratedNotificationHeader";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { TourProvider } from "@/components/tour/TourProvider";
import { AmbassadorCelebration } from "@/components/AmbassadorCelebration";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AICopilotBubble } from "@/components/ai/AICopilotBubble";
import { useAICopilot } from "@/contexts/AICopilotContext";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useClientRealtimeNotifications } from "@/hooks/useClientRealtimeNotifications";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Kanban, Settings, LogOut, Building2, Video, Sparkles, Scissors, MessageCircle, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MainLayoutProps {
  children: ReactNode;
}

// Client navigation items
const clientNavigation = [
  { name: "Dashboard", href: "/client-dashboard", icon: LayoutDashboard },
  { name: "Configuración", href: "/settings", icon: Settings },
];

// Editor navigation items for mobile bottom bar
const editorMobileNavigation = [
  { name: "Dashboard", href: "/editor-dashboard", icon: LayoutDashboard },
  { name: "Tablero", href: "/board", icon: Kanban },
  { name: "Contenido", href: "/portfolio", icon: Video },
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
  
  // AI Copilot context
  const { notifications: aiNotifications, dismissNotification, markAsRead } = useAICopilot();

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
              onClick={() => navigate(user?.id ? `/p/${user.id}` : '/portfolio')}
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
              onClick={() => navigate('/portfolio')}
              className="h-9 w-9 rounded-full"
            >
              <Briefcase className="h-4 w-4" />
            </Button>
            <Button
              variant={chatOpen ? "default" : "ghost"}
              size="icon"
              onClick={() => setChatOpen(!chatOpen)}
              className={cn(
                "relative h-9 w-9 rounded-full",
                unreadChatCount > 0 && !chatOpen && "bg-blue-500/20"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white animate-pulse">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
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
        <main className={cn(
          "pb-16 md:pb-0 transition-all duration-300",
          sidebarCollapsed ? "md:ml-20" : "md:ml-64",
          chatOpen ? 'md:mr-96' : '',
          "md:pt-14" // Add padding for the header
        )}>
          <div className="min-h-screen p-4 md:p-6">
            {children}
          </div>
        </main>

        {/* Chat Panel */}
        <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} onActiveConversationChange={setActiveConversationId} />

        {/* AI Copilot Bubble */}
        <AICopilotBubble 
          notifications={aiNotifications}
          onNotificationDismiss={dismissNotification}
          onNotificationAction={markAsRead}
        />

        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }
  
  // For clients, show a simpler sidebar
  if (isClient) {
    return (
      <div className="min-h-screen bg-background">
        {/* Client Desktop Sidebar */}
        <aside className="fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border w-64 hidden md:block">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-sidebar-border px-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-sidebar-foreground">Portal Cliente</h1>
                  <p className="text-xs text-sidebar-foreground/60">Creartor Studio</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3">
              {clientNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary-foreground")} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User & Actions */}
            <div className="border-t border-sidebar-border p-3 space-y-2">
              {profile && (
                <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">
                  {profile.email}
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="w-full text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </aside>
        
        {/* Client Mobile Header */}
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold">Portal Cliente</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(user?.id ? `/p/${user.id}` : '/portfolio')}
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
              onClick={() => navigate('/portfolio')}
              className="h-9 w-9 rounded-full"
            >
              <Briefcase className="h-4 w-4" />
            </Button>
            <Button
              variant={chatOpen ? "default" : "ghost"}
              size="icon"
              onClick={() => setChatOpen(!chatOpen)}
              className={cn(
                "relative h-9 w-9 rounded-full",
                unreadChatCount > 0 && !chatOpen && "bg-blue-500/20"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white animate-pulse">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Client Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
          <div className="flex justify-around py-2">
            {clientNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.name}</span>
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
            sidebarCollapsed={false}
          />
        </div>
        
        {/* Main Content */}
        <main className={cn(
          "md:ml-64 pb-16 md:pb-0",
          chatOpen ? 'md:mr-96' : '',
          "md:pt-14" // Add padding for the header
        )}>
          <div className="min-h-screen p-4 md:p-6">
            {children}
          </div>
        </main>

        {/* Chat Panel */}
        <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} onActiveConversationChange={setActiveConversationId} />

        {/* AI Copilot Bubble */}
        <AICopilotBubble 
          notifications={aiNotifications}
          onNotificationDismiss={dismissNotification}
          onNotificationAction={markAsRead}
        />

        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }
  
  // Default admin/other layout
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
        <MobileNav />
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-sm font-bold">Creartor Studio</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(user?.id ? `/p/${user.id}` : '/portfolio')}
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
            onClick={() => navigate('/portfolio')}
            className="h-9 w-9 rounded-full"
          >
            <Briefcase className="h-4 w-4" />
          </Button>
          <Button
            variant={chatOpen ? "default" : "ghost"}
            size="icon"
            onClick={() => setChatOpen(!chatOpen)}
            className={cn(
              "relative h-9 w-9 rounded-full",
              unreadChatCount > 0 && !chatOpen && "bg-blue-500/20"
            )}
          >
            <MessageCircle className="h-4 w-4" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white animate-pulse">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
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
      <main className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "md:ml-20" : "md:ml-64",
        chatOpen ? 'md:mr-96' : '',
        "md:pt-14" // Add padding for the header
      )}>
        <div className="min-h-screen p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Chat Panel */}
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} onActiveConversationChange={setActiveConversationId} />

      {/* Tour Provider */}
      <TourProvider />

      {/* AI Copilot Bubble */}
      <AICopilotBubble 
        notifications={aiNotifications}
        onNotificationDismiss={dismissNotification}
        onNotificationAction={markAsRead}
      />

      {/* Ambassador Celebration */}
      <AmbassadorCelebration />
    </div>
  );
}
