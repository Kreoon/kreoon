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
  Eye,
  Globe,
  Video,
  TrendingUp
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
  platformRootOnly?: boolean;
  requiresOrg?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Admin navigation organized in sections
const adminSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Board", href: "/dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard", requiresOrg: true },
      { name: "Projects", href: "/board", icon: Kanban, tourId: "sidebar-board", requiresOrg: true },
      { name: "IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts", requiresOrg: true },
      { name: "Marketing", href: "/marketing", icon: TrendingUp, tourId: "sidebar-marketing", requiresOrg: true },
      { name: "UP", href: "/ranking", icon: Trophy, tourId: "sidebar-up", requiresOrg: true },
      { name: "Network", href: "/social", icon: Globe, tourId: "sidebar-social", requiresOrg: true },
      { name: "Live", href: "/live", icon: Video, tourId: "sidebar-live", requiresOrg: true },
    ]
  },
  {
    label: "GESTIÓN",
    items: [
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content", requiresOrg: true },
      { name: "Creadores", href: "/creators", icon: Users, tourId: "sidebar-creators", requiresOrg: true },
      { name: "Clientes", href: "/clients", icon: Building2, tourId: "sidebar-clients", requiresOrg: true },
      { name: "Equipo", href: "/team", icon: UsersRound, tourId: "sidebar-team", requiresOrg: true },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

const strategistSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Board", href: "/strategist-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard", requiresOrg: true },
      { name: "Projects", href: "/board", icon: Kanban, tourId: "sidebar-board", requiresOrg: true },
      { name: "IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts", requiresOrg: true },
      { name: "Marketing", href: "/marketing", icon: TrendingUp, tourId: "sidebar-marketing", requiresOrg: true },
      { name: "UP", href: "/ranking", icon: Trophy, tourId: "sidebar-up", requiresOrg: true },
      { name: "Network", href: "/social", icon: Globe, tourId: "sidebar-social", requiresOrg: true },
      { name: "Live", href: "/live", icon: Video, tourId: "sidebar-live", requiresOrg: true },
    ]
  },
  {
    label: "GESTIÓN",
    items: [
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content", requiresOrg: true },
      { name: "Creadores", href: "/creators", icon: Users, tourId: "sidebar-creators", requiresOrg: true },
      { name: "Clientes", href: "/clients", icon: Building2, tourId: "sidebar-clients", requiresOrg: true },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

const editorSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Board", href: "/editor-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Projects", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
      { name: "Network", href: "/social", icon: Globe, tourId: "sidebar-social" },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

const creatorSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Board", href: "/creator-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Projects", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
      { name: "Network", href: "/social", icon: Globe, tourId: "sidebar-social" },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

const clientSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Dashboard", href: "/client-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Board", href: "/client-board", icon: Kanban, tourId: "sidebar-board" },
      { name: "Network", href: "/social", icon: Globe, tourId: "sidebar-social" },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
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
  const [clientCount, setClientCount] = useState(0);

  // Use effective roles when impersonating, otherwise use activeRole for UI
  const activeIsAdmin = isImpersonating ? effectiveRoles.includes('admin') : activeRole === 'admin';
  const activeIsStrategist = isImpersonating ? effectiveRoles.includes('strategist') : activeRole === 'strategist';
  const activeIsEditor = isImpersonating ? effectiveRoles.includes('editor') : activeRole === 'editor';
  const activeIsCreator = isImpersonating ? effectiveRoles.includes('creator') : activeRole === 'creator';
  const activeIsClient = isImpersonating ? effectiveRoles.includes('client') : activeRole === 'client';

  // Fetch current client name and count for client users
  useEffect(() => {
    // When impersonating a client, use impersonation target
    if (isImpersonating && activeIsClient && impersonationTarget.clientId) {
      setCurrentClientName(impersonationTarget.clientName);
      setClientCount(1);
      return;
    }
    
    if (activeIsClient && user) {
      const fetchCurrentClient = async () => {
        // Get all client associations to determine count
        const { data: associations } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', user.id);

        const totalClients = associations?.length || 0;
        setClientCount(totalClients);

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

        // Get first client from associations
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

  // Filter navigation sections based on platform root vs org owner and org selection
  const filteredSections = useMemo(() => {
    let baseSections = activeIsAdmin 
      ? adminSections 
      : activeIsStrategist 
      ? strategistSections 
      : activeIsEditor 
      ? editorSections 
      : activeIsCreator 
      ? creatorSections 
      : activeIsClient 
      ? clientSections 
      : adminSections;

    // Filter items within sections
    return baseSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // For org owners (not platform root), filter out platformRootOnly items
        if (!isPlatformRoot && item.platformRootOnly) return false;
        
        // For platform root without org selected, hide org-specific modules
        if (isPlatformRoot && !profile?.current_organization_id && item.requiresOrg) return false;
        
        return true;
      })
    })).filter(section => section.items.length > 0); // Remove empty sections
  }, [activeIsAdmin, activeIsStrategist, activeIsEditor, activeIsCreator, activeIsClient, isPlatformRoot, profile?.current_organization_id]);

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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
                <img src="/favicon.png" alt="KREOON" className="h-9 w-9 object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-sidebar-foreground">KREOON</h1>
                {currentOrgName ? (
                  <p className="text-xs text-primary/80 truncate font-medium">{currentOrgName}</p>
                ) : (
                  <p className="text-xs text-sidebar-foreground/60">Content Platform</p>
                )}
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
              <img src="/favicon.png" alt="KREOON" className="h-9 w-9 object-cover" />
            </div>
          )}
        </div>

        {/* Root Admin Organization Switcher */}
        {isPlatformRoot && !collapsed && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            <RootOrgSwitcher />
          </div>
        )}


        {/* Navigation with Sections */}
        <nav className="flex-1 overflow-y-auto p-3">
          {filteredSections.map((section, sectionIndex) => (
            <div key={section.label} className={cn(sectionIndex > 0 && "mt-6")}>
              {/* Section Label */}
              {!collapsed && (
                <div className="px-3 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {section.label}
                  </span>
                </div>
              )}
              
              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
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
              </div>
            </div>
          ))}
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

          {/* Role Switcher */}
          {!isImpersonating && (
            <RoleSwitcher collapsed={collapsed} />
          )}

          {/* Client company switcher - only show if user has multiple brands */}
          {activeIsClient && (
            <div className="space-y-1">
              {!collapsed && currentClientName && (
                <div className="px-3 py-1 text-xs text-sidebar-foreground/60 truncate flex items-center gap-2">
                  <Building2 className="h-3 w-3" />
                  {currentClientName}
                  {clientCount > 1 && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                      +{clientCount - 1}
                    </span>
                  )}
                </div>
              )}
              {!isImpersonating && clientCount > 1 && (
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
