import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  FileText, 
  Building2, 
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UsersRound,
  LogOut,
  Kanban,
  User,
  RefreshCw
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ClientSelectorDialog } from "@/components/clients/ClientSelectorDialog";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  name: string;
  href: string | ((userId: string) => string);
  icon: React.ComponentType<{ className?: string }>;
  tourId: string;
  isDynamic?: boolean;
}

const adminNavigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Mi Perfil", href: (id) => `/p/${id}`, icon: User, tourId: "sidebar-profile", isDynamic: true },
  { name: "Tablero", href: "/board", icon: Kanban, tourId: "sidebar-board" },
  { name: "Contenido", href: "/content", icon: FileText, tourId: "sidebar-content" },
  { name: "Portafolio", href: "/portfolio", icon: Video, tourId: "sidebar-portfolio" },
  { name: "Creadores", href: "/creators", icon: Users, tourId: "sidebar-creators" },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
  { name: "Clientes", href: "/clients", icon: Building2, tourId: "sidebar-clients" },
  { name: "Equipo", href: "/team", icon: UsersRound, tourId: "sidebar-team" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const strategistNavigation: NavItem[] = [
  { name: "Dashboard", href: "/strategist-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Mi Perfil", href: (id) => `/p/${id}`, icon: User, tourId: "sidebar-profile", isDynamic: true },
  { name: "Portafolio", href: "/portfolio", icon: Video, tourId: "sidebar-portfolio" },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const editorNavigation: NavItem[] = [
  { name: "Dashboard", href: "/editor-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Mi Perfil", href: (id) => `/p/${id}`, icon: User, tourId: "sidebar-profile", isDynamic: true },
  { name: "Tablero", href: "/board", icon: Kanban, tourId: "sidebar-board" },
  { name: "Portafolio", href: "/portfolio", icon: Video, tourId: "sidebar-portfolio" },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const creatorNavigation: NavItem[] = [
  { name: "Dashboard", href: "/creator-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Mi Perfil", href: (id) => `/p/${id}`, icon: User, tourId: "sidebar-profile", isDynamic: true },
  { name: "Tablero", href: "/board", icon: Kanban, tourId: "sidebar-board" },
  { name: "Portafolio", href: "/portfolio", icon: Video, tourId: "sidebar-portfolio" },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const clientNavigation: NavItem[] = [
  { name: "Dashboard", href: "/client-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Mi Perfil", href: (id) => `/p/${id}`, icon: User, tourId: "sidebar-profile", isDynamic: true },
  { name: "Tablero", href: "/client-board", icon: Kanban, tourId: "sidebar-board" },
  { name: "Portafolio", href: "/portfolio", icon: Video, tourId: "sidebar-portfolio" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, isAdmin, isEditor, isCreator, isStrategist, isClient } = useAuth();
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [currentClientName, setCurrentClientName] = useState<string | null>(null);

  // Fetch current client name for client users
  useEffect(() => {
    if (isClient && user) {
      const fetchCurrentClient = async () => {
        const savedClientId = localStorage.getItem('selectedClientId');
        
        if (savedClientId) {
          const { data } = await supabase
            .from('clients')
            .select('name')
            .eq('id', savedClientId)
            .maybeSingle();
          
          if (data) {
            setCurrentClientName(data.name);
            return;
          }
        }

        // Get first client from user's associations
        const { data: associations } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', user.id)
          .limit(1);

        if (associations && associations.length > 0) {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', associations[0].client_id)
            .maybeSingle();

          if (client) {
            setCurrentClientName(client.name);
          }
        }
      };

      fetchCurrentClient();
    }
  }, [isClient, user]);

  // Determinar navegación según rol (prioridad: admin > strategist > editor > creator > client)
  const navigation = isAdmin 
    ? adminNavigation 
    : isStrategist 
    ? strategistNavigation 
    : isEditor 
    ? editorNavigation 
    : isCreator 
    ? creatorNavigation 
    : isClient 
    ? clientNavigation 
    : adminNavigation;

  const userId = user?.id || '';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">U</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-sidebar-foreground">UGC Colombia</h1>
                <p className="text-xs text-sidebar-foreground/60">Content Agency</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">U</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const href = item.isDynamic && typeof item.href === 'function' 
              ? item.href(userId) 
              : item.href as string;
            const isActive = location.pathname === href;
            return (
              <NavLink
                key={item.name}
                to={href}
                data-tour={item.tourId}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary-foreground")} />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User & Actions */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {!collapsed && profile && (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">
              {profile.email}
            </div>
          )}

          {/* Client company switcher */}
          {isClient && (
            <div className="space-y-1">
              {!collapsed && currentClientName && (
                <div className="px-3 py-1 text-xs text-sidebar-foreground/60 truncate flex items-center gap-2">
                  <Building2 className="h-3 w-3" />
                  {currentClientName}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClientSelector(true)}
                className={cn(
                  "w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "px-2"
                )}
                title={collapsed ? `${currentClientName || 'Cambiar Empresa'}` : undefined}
              >
                <RefreshCw className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Cambiar Empresa</span>}
              </Button>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive",
              collapsed && "px-2"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Cerrar sesión</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "px-2"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Client Selector Dialog */}
      <ClientSelectorDialog
        open={showClientSelector}
        onOpenChange={setShowClientSelector}
        onSelectClient={(clientId) => {
          // Store selected client and refresh
          localStorage.setItem('selectedClientId', clientId);
          window.location.reload();
        }}
      />
    </aside>
  );
}
