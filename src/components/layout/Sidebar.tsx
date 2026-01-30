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
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-gradient-to-b from-[hsl(240,15%,5%)] via-[hsl(240,15%,4%)] to-[hsl(240,15%,3%)]",
        "backdrop-blur-xl",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Ambient glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative flex h-full flex-col z-10">
        {/* Logo with glow */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border/50 px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/20">
                <img src="/favicon.png" alt="KREOON" className="h-8 w-8 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">KREOON</h1>
                {currentOrgName ? (
                  <p className="text-xs text-primary truncate font-medium">{currentOrgName}</p>
                ) : (
                  <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40">AI Content Platform</p>
                )}
              </div>
            </div>
          )}
          {collapsed && (
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/20">
              <img src="/favicon.png" alt="KREOON" className="h-8 w-8 object-cover" />
            </div>
          )}
        </div>

        {/* Root Admin Organization Switcher */}
        {isPlatformRoot && !collapsed && (
          <div className="px-3 py-2 border-b border-sidebar-border/50">
            <RootOrgSwitcher />
          </div>
        )}

        {/* Navigation with Sections */}
        <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          {filteredSections.map((section, sectionIndex) => (
            <div key={section.label} className={cn(sectionIndex > 0 && "mt-6")}>
              {/* Section Label */}
              {!collapsed && (
                <div className="px-3 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
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
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-gradient-to-r from-primary/20 to-primary/10 text-white border border-primary/30 shadow-lg shadow-primary/10" 
                          : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-white border border-transparent",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      {/* Active indicator glow */}
                      {isActive && (
                        <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full shadow-lg shadow-primary/50" />
                      )}
                      <item.icon className={cn(
                        "h-5 w-5 shrink-0 transition-all duration-200",
                        isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-primary/70"
                      )} />
                      {!collapsed && (
                        <span className={cn(
                          "transition-colors duration-200",
                          isActive && "text-white"
                        )}>{item.name}</span>
                      )}
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
        <div className="border-t border-sidebar-border/50 p-3 space-y-2 bg-gradient-to-t from-black/20 to-transparent">
          {!collapsed && profile && (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/40 truncate font-mono">
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
                <div className="px-3 py-1 text-xs text-sidebar-foreground/50 truncate flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-primary/60" />
                  {currentClientName}
                  {clientCount > 1 && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/30">
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
                    "w-full text-sidebar-foreground/60 hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 rounded-xl transition-all",
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
              "w-full text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 rounded-xl transition-all",
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
              "w-full text-sidebar-foreground/40 hover:bg-white/5 hover:text-sidebar-foreground/70 rounded-xl transition-all",
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
