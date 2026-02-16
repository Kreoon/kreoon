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
import { AITokensPanelTrigger } from "@/components/ai/AITokensPanel";
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

// Admin navigation organized in sections - KREOON TECH theme
const adminSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Control Center", href: "/dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard", requiresOrg: true },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board", requiresOrg: true },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts", requiresOrg: true },
      { name: "Marketing", href: "/marketing", icon: TrendingUp, tourId: "sidebar-marketing", requiresOrg: true },
      { name: "Ranking", href: "/ranking", icon: Trophy, tourId: "sidebar-up", requiresOrg: true },
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
    label: "CONFIG",
    items: [
      { name: "Settings", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

const strategistSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Control Center", href: "/strategist-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard", requiresOrg: true },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board", requiresOrg: true },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts", requiresOrg: true },
      { name: "Marketing", href: "/marketing", icon: TrendingUp, tourId: "sidebar-marketing", requiresOrg: true },
      { name: "Ranking", href: "/ranking", icon: Trophy, tourId: "sidebar-up", requiresOrg: true },
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
    label: "CONFIG",
    items: [
      { name: "Settings", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

const editorSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Editor Hub", href: "/editor-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
    ]
  },
  {
    label: "CONFIG",
    items: [
      { name: "Settings", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

const creatorSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Creator Hub", href: "/creator-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
    ]
  },
  {
    label: "CONFIG",
    items: [
      { name: "Settings", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

const clientSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Client Portal", href: "/client-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Producciones", href: "/client-board", icon: Kanban, tourId: "sidebar-board" },
    ]
  },
  {
    label: "CONFIG",
    items: [
      { name: "Settings", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
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
  const { signOut, profile, user, activeRole, roles: realRoles, isSuperadmin } = useAuth();
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
        "fixed left-0 top-0 z-40 h-screen",
        "border-r border-[hsl(270,100%,60%,0.08)]",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-gradient-to-b from-[hsl(250,20%,4%)] via-[hsl(250,20%,3%)] to-[hsl(250,20%,2%)]",
        "backdrop-blur-xl",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-[hsl(270,100%,60%,0.06)] rounded-full blur-[120px]" />
        <div className="absolute bottom-20 -right-20 w-60 h-60 bg-[hsl(270,100%,60%,0.04)] rounded-full blur-[100px]" />
      </div>

      <div className="relative flex h-full flex-col z-10">
        {/* Logo with neon glow */}
        <div className={cn(
          "flex h-16 items-center border-b border-[hsl(270,100%,60%,0.08)] px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(270,100%,60%,0.05)] border border-[hsl(270,100%,60%,0.25)] shadow-[0_0_20px_-5px_hsl(270,100%,60%,0.4)]">
                <img src="/favicon.png" alt="KREOON" className="h-8 w-8 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(270,100%,60%,0.1)] to-transparent" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold bg-gradient-to-r from-white to-[hsl(270,100%,80%)] bg-clip-text text-transparent">KREOON</h1>
                {currentOrgName ? (
                  <p className="text-xs text-[hsl(270,100%,70%)] truncate font-medium">{currentOrgName}</p>
                ) : (
                  <p className="text-[10px] uppercase tracking-widest text-[hsl(270,40%,45%)]">AI Content Platform</p>
                )}
              </div>
            </div>
          )}
          {collapsed && (
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(270,100%,60%,0.05)] border border-[hsl(270,100%,60%,0.25)] shadow-[0_0_20px_-5px_hsl(270,100%,60%,0.4)]">
              <img src="/favicon.png" alt="KREOON" className="h-8 w-8 object-cover" />
            </div>
          )}
        </div>

        {/* Root Admin Organization Switcher - show for superadmins or platform root */}
        {(isSuperadmin || isPlatformRoot) && !collapsed && (
          <div className="px-3 py-2 border-b border-[hsl(270,100%,60%,0.08)]">
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
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(270,100%,65%,0.6)]">
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
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                        isActive 
                          ? "bg-gradient-to-r from-[hsl(270,100%,60%,0.15)] to-[hsl(270,100%,60%,0.05)] text-white border border-[hsl(270,100%,60%,0.3)] shadow-[0_0_20px_-5px_hsl(270,100%,60%,0.3)]" 
                          : "text-[hsl(270,30%,65%)] hover:bg-[hsl(270,100%,60%,0.05)] hover:text-white border border-transparent hover:border-[hsl(270,100%,60%,0.1)]",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      {/* Active indicator neon line */}
                      {isActive && (
                        <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-[hsl(270,100%,60%)] rounded-full shadow-[0_0_10px_hsl(270,100%,60%,0.8)]" />
                      )}
                      <item.icon className={cn(
                        "h-5 w-5 shrink-0 transition-all duration-300",
                        isActive ? "text-[hsl(270,100%,70%)]" : "text-[hsl(270,40%,50%)] group-hover:text-[hsl(270,100%,70%)]"
                      )} />
                      {!collapsed && (
                        <span className={cn(
                          "transition-colors duration-300",
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

        {/* AI Tokens - solo si tiene org y no es cliente */}
        {profile?.current_organization_id && !activeIsClient && (
          <div className="border-t border-[hsl(270,100%,60%,0.08)] px-3 py-2">
            <AITokensPanelTrigger
              organizationId={profile.current_organization_id}
              variant={collapsed ? "compact" : "header"}
            />
          </div>
        )}

        {/* Achievements Widget */}
        <div className="border-t border-[hsl(270,100%,60%,0.08)]">
          <SidebarAchievementsWidget collapsed={collapsed} />
        </div>

        {/* User & Actions */}
        <div className="border-t border-[hsl(270,100%,60%,0.08)] p-3 space-y-2 bg-gradient-to-t from-[hsl(250,20%,2%)] to-transparent">
          {!collapsed && profile && (
            <div className="px-3 py-2 text-xs text-[hsl(270,30%,50%)] truncate font-mono">
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
                <div className="px-3 py-1 text-xs text-[hsl(270,30%,55%)] truncate flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-[hsl(270,100%,60%,0.6)]" />
                  {currentClientName}
                  {clientCount > 1 && (
                    <span className="text-[10px] bg-[hsl(270,100%,60%,0.15)] text-[hsl(270,100%,70%)] px-1.5 py-0.5 rounded-full border border-[hsl(270,100%,60%,0.25)]">
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
                    "w-full text-[hsl(270,30%,60%)] hover:bg-[hsl(270,100%,60%,0.1)] hover:text-[hsl(270,100%,70%)] border border-transparent hover:border-[hsl(270,100%,60%,0.2)] rounded-xl transition-all",
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
              "w-full text-[hsl(270,30%,60%)] hover:bg-[hsl(350,80%,50%,0.1)] hover:text-[hsl(350,80%,60%)] border border-transparent hover:border-[hsl(350,80%,50%,0.2)] rounded-xl transition-all",
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
              "w-full text-[hsl(270,30%,45%)] hover:bg-[hsl(270,100%,60%,0.05)] hover:text-[hsl(270,30%,65%)] rounded-xl transition-all",
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
