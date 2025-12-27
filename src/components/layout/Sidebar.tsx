import { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
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
  RefreshCw,
  Trophy,
  Eye
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { ClientSelectorDialog } from "@/components/clients/ClientSelectorDialog";
import { RootOrgSwitcher } from "@/components/layout/RootOrgSwitcher";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { SidebarAchievementsWidget } from "@/components/points/SidebarAchievementsWidget";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  name: string;
  href: string | ((userId: string) => string);
  icon: React.ComponentType<{ className?: string }>;
  tourId: string;
  isDynamic?: boolean;
  platformRootOnly?: boolean; // Only show for platform root admin
  requiresOrg?: boolean; // Requires an organization to be selected
}

// Full admin navigation - organization level modules
const adminNavigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, tourId: "sidebar-dashboard", requiresOrg: true },
  { name: "Tablero", href: "/board", icon: Kanban, tourId: "sidebar-board", requiresOrg: true },
  { name: "Contenido", href: "/content", icon: FileText, tourId: "sidebar-content", requiresOrg: true },
  { name: "Creadores", href: "/creators", icon: Users, tourId: "sidebar-creators", requiresOrg: true },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts", requiresOrg: true },
  { name: "Clientes", href: "/clients", icon: Building2, tourId: "sidebar-clients", requiresOrg: true },
  { name: "Equipo", href: "/team", icon: UsersRound, tourId: "sidebar-team", requiresOrg: true },
  { name: "Sistema UP", href: "/ranking", icon: Trophy, tourId: "sidebar-up", requiresOrg: true },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const strategistNavigation: NavItem[] = [
  { name: "Dashboard", href: "/strategist-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const editorNavigation: NavItem[] = [
  { name: "Dashboard", href: "/editor-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Tablero", href: "/board", icon: Kanban, tourId: "sidebar-board" },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const creatorNavigation: NavItem[] = [
  { name: "Dashboard", href: "/creator-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Tablero", href: "/board", icon: Kanban, tourId: "sidebar-board" },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const clientNavigation: NavItem[] = [
  { name: "Dashboard", href: "/client-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, activeRole, roles: realRoles } = useAuth();
  const { isImpersonating, effectiveRoles, isRootAdmin, impersonationTarget } = useImpersonation();
  const { isPlatformRoot, currentOrgName } = useOrgOwner();
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [currentClientName, setCurrentClientName] = useState<string | null>(null);

  // Use effective roles when impersonating, otherwise use activeRole for UI
  const activeIsAdmin = isImpersonating ? effectiveRoles.includes('admin') : activeRole === 'admin';
  const activeIsStrategist = isImpersonating ? effectiveRoles.includes('strategist') : activeRole === 'strategist';
  const activeIsEditor = isImpersonating ? effectiveRoles.includes('editor') : activeRole === 'editor';
  const activeIsCreator = isImpersonating ? effectiveRoles.includes('creator') : activeRole === 'creator';
  const activeIsClient = isImpersonating ? effectiveRoles.includes('client') : activeRole === 'client';

  // Fetch current client name for client users
  useEffect(() => {
    // When impersonating a client, use impersonation target
    if (isImpersonating && activeIsClient && impersonationTarget.clientId) {
      setCurrentClientName(impersonationTarget.clientName);
      return;
    }
    
    if (activeIsClient && user) {
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
  }, [activeIsClient, user, isImpersonating, impersonationTarget]);

  // Filter navigation based on platform root vs org owner and org selection
  const filteredNavigation = useMemo(() => {
    let baseNav = activeIsAdmin 
      ? adminNavigation 
      : activeIsStrategist 
      ? strategistNavigation 
      : activeIsEditor 
      ? editorNavigation 
      : activeIsCreator 
      ? creatorNavigation 
      : activeIsClient 
      ? clientNavigation 
      : adminNavigation;

    // For org owners (not platform root), filter out platformRootOnly items
    if (!isPlatformRoot) {
      baseNav = baseNav.filter(item => !item.platformRootOnly);
    }

    // For platform root without org selected, hide org-specific modules
    if (isPlatformRoot && !profile?.current_organization_id) {
      baseNav = baseNav.filter(item => !item.requiresOrg);
    }

    return baseNav;
  }, [activeIsAdmin, activeIsStrategist, activeIsEditor, activeIsCreator, activeIsClient, isPlatformRoot, profile?.current_organization_id]);

  const navigation = filteredNavigation;

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
                <span className="text-lg font-bold text-primary-foreground">C</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-sidebar-foreground">Creartor Studio</h1>
                {currentOrgName ? (
                  <p className="text-xs text-primary/80 truncate font-medium">{currentOrgName}</p>
                ) : (
                  <p className="text-xs text-sidebar-foreground/60">Content Agency</p>
                )}
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">C</span>
            </div>
          )}
        </div>

        {/* Root Admin Organization Switcher */}
        {isPlatformRoot && !collapsed && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            <RootOrgSwitcher />
          </div>
        )}

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

        {/* Achievements Widget */}
        <div className="border-t border-sidebar-border">
          <SidebarAchievementsWidget collapsed={collapsed} />
        </div>

        {/* User & Actions */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {!collapsed && profile && (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">
              {profile.email}
            </div>
          )}

          {/* Role Switcher - only show if user has multiple roles */}
          {realRoles.length > 1 && !isImpersonating && (
            <RoleSwitcher collapsed={collapsed} />
          )}

          {/* Client company switcher */}
          {activeIsClient && (
            <div className="space-y-1">
              {!collapsed && currentClientName && (
                <div className="px-3 py-1 text-xs text-sidebar-foreground/60 truncate flex items-center gap-2">
                  <Building2 className="h-3 w-3" />
                  {currentClientName}
                </div>
              )}
              {!isImpersonating && (
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
              )}
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
          // Store selection and notify current session (no full reload)
          localStorage.setItem('selectedClientId', clientId);
          window.dispatchEvent(new CustomEvent('client-selected', { detail: { clientId } }));
          setShowClientSelector(false);
          navigate('/client-dashboard', { replace: true });
        }}
      />
    </aside>
  );
}
