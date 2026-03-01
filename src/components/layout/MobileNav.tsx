import { useState, useEffect, useMemo } from "react";
import { useAuthAnalytics } from "@/analytics";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Building2,
  Settings,
  LogOut,
  Menu,
  Kanban,
  RefreshCw,
  Trophy,
  Store,
  Play,
  Bookmark,
  FileText,
  Megaphone,
  Wallet,
  UserCircle,
  Search,
  UserPlus,
  MessageSquare,
  ListChecks,
  Video,
  TrendingUp,
  BarChart3,
  GitBranch,
  DollarSign,
  Crown,
  Share2,
  ChevronDown,
  Radar,
  ImagePlus,
  Key,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getRoleBadgeInfo } from "@/lib/roles";
import { getPermissionGroup, type PermissionGroup } from "@/lib/permissionGroups";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useOrgMarketplace } from "@/hooks/useOrgMarketplace";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ClientSelectorDialog } from "@/components/clients/ClientSelectorDialog";
import { RootOrgSwitcher } from "@/components/layout/RootOrgSwitcher";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { AITokensPanelTrigger } from "@/components/ai/AITokensPanel";
import { SidebarAchievementsWidget } from "@/components/points/SidebarAchievementsWidget";
import { supabase } from "@/integrations/supabase/client";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useReferralGate } from "@/hooks/useReferralGate";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  platformRootOnly?: boolean;
  requiresOrg?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// ── Navigation sections — MUST mirror Sidebar.tsx exactly ──

const MARKETING_ITEMS: NavItem[] = [
  { name: "Marketing", href: "/marketing", icon: TrendingUp, requiresOrg: true },
  { name: "Social Hub", href: "/social-hub", icon: Share2 },
  { name: "Streaming", href: "/streaming", icon: Video },
  { name: "Marketing Ads", href: "/marketing-ads", icon: BarChart3 },
  { name: "Generador Ads", href: "/ad-generator", icon: ImagePlus },
  { name: "Ad Intelligence", href: "/admin/ad-intelligence", icon: Search },
  { name: "Social Scraper", href: "/admin/social-scraper", icon: Radar },
];

const CONFIG_ITEMS: NavItem[] = [
  { name: "Mi Perfil", href: "/settings?section=profile", icon: UserCircle },
  { name: "Plan", href: "/planes", icon: Crown },
  { name: "Settings", href: "/settings", icon: Settings },
];

const adminSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Control Center", href: "/dashboard", icon: LayoutDashboard, requiresOrg: true },
      { name: "Producciones", href: "/board", icon: Kanban, requiresOrg: true },
      { name: "Portafolio", href: "/content", icon: FileText, requiresOrg: true },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, requiresOrg: true },
      { name: "Ranking", href: "/ranking", icon: Trophy, requiresOrg: true },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS,
  },
  {
    label: "GESTIÓN",
    items: [
      { name: "Talento", href: "/talent", icon: Users, requiresOrg: true },
      { name: "Clientes", href: "/clients-hub", icon: Building2, requiresOrg: true },
      { name: "Pipelines", href: "/org-crm/pipelines", icon: GitBranch, requiresOrg: true },
      { name: "Finanzas", href: "/org-crm/finanzas", icon: Wallet, requiresOrg: true },
    ]
  },
  {
    label: "CRM PLATAFORMA",
    items: [
      { name: "Dashboard", href: "/crm", icon: LayoutDashboard },
      { name: "Leads", href: "/crm/leads", icon: UserPlus },
      { name: "Organizaciones", href: "/crm/organizaciones", icon: Building2 },
      { name: "Personas", href: "/crm/personas", icon: Users },
      { name: "Finanzas", href: "/crm/finanzas", icon: DollarSign },
      { name: "Email Marketing", href: "/crm/email-marketing", icon: Megaphone },
    ]
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const strategistSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Control Center", href: "/strategist-dashboard", icon: LayoutDashboard, requiresOrg: true },
      { name: "Producciones", href: "/board", icon: Kanban, requiresOrg: true },
      { name: "Portafolio", href: "/content", icon: FileText, requiresOrg: true },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, requiresOrg: true },
      { name: "Ranking", href: "/ranking", icon: Trophy, requiresOrg: true },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS,
  },
  {
    label: "GESTIÓN",
    items: [
      { name: "Talento", href: "/talent", icon: Users, requiresOrg: true },
      { name: "Clientes", href: "/clients-hub", icon: Building2, requiresOrg: true },
      { name: "Pipelines", href: "/org-crm/pipelines", icon: GitBranch, requiresOrg: true },
      { name: "Finanzas", href: "/org-crm/finanzas", icon: Wallet, requiresOrg: true },
    ]
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const editorSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Editor Hub", href: "/editor-dashboard", icon: LayoutDashboard },
      { name: "Producciones", href: "/board", icon: Kanban },
      { name: "Portafolio", href: "/content", icon: FileText },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS.filter(i => i.href !== '/marketing'),
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const creatorSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Creator Hub", href: "/creator-dashboard", icon: LayoutDashboard },
      { name: "Producciones", href: "/board", icon: Kanban },
      { name: "Portafolio", href: "/content", icon: FileText },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS.filter(i => i.href !== '/marketing'),
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const clientSections: NavSection[] = [
  {
    label: "MI MARCA",
    items: [
      { name: "Portal", href: "/client-dashboard", icon: LayoutDashboard },
      { name: "Mis Proyectos", href: "/board?view=marketplace", icon: Kanban },
      { name: "Mis Campañas", href: "/marketplace/my-campaigns", icon: Megaphone },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: [
      { name: "Social Hub", href: "/social-hub", icon: Share2 },
      { name: "Streaming", href: "/streaming", icon: Video },
      { name: "Marketing Ads", href: "/marketing-ads", icon: BarChart3 },
      { name: "Generador Ads", href: "/ad-generator", icon: ImagePlus },
    ]
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

// Freelance users (no org) - full talent navigation
const freelanceSections: NavSection[] = [
  {
    label: "MI NEGOCIO",
    items: [
      { name: "Dashboard", href: "/freelancer-dashboard", icon: LayoutDashboard },
      { name: "Mis Proyectos", href: "/board?view=marketplace", icon: Kanban },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: [
      { name: "Social Hub", href: "/social-hub", icon: Share2 },
      // Live module coming soon
    ]
  },
  {
    label: "CONFIG",
    items: [
      { name: "Mi Perfil", href: "/settings?section=profile", icon: UserCircle },
      { name: "Plan", href: "/planes", icon: Crown },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
];

// Locked users (haven't completed referral gate) - only unlock access + profile
const lockedUserSections: NavSection[] = [
  {
    label: "BIENVENIDA",
    items: [
      { name: "Obtener Llaves", href: "/unlock-access", icon: Key },
    ]
  },
  {
    label: "CONFIG",
    items: [
      { name: "Mi Perfil", href: "/settings?section=profile", icon: UserCircle },
    ]
  }
];

// Marketplace sections — mirrors Sidebar.tsx
function getMarketplaceSections(activeGroup: PermissionGroup | null, isFreelance: boolean = false): NavSection[] {
  const items: NavItem[] = [
    { name: "Marketplace", href: "/marketplace", icon: Store },
  ];

  if (activeGroup !== 'editor' && activeGroup !== 'client') {
    items.push({ name: "Campañas", href: "/marketplace/campaigns", icon: Megaphone });
  }
  if (activeGroup === 'admin' || activeGroup === 'strategist' || activeGroup === 'client') {
    items.push({ name: "Mis Campañas", href: "/marketplace/my-campaigns", icon: Megaphone });
  }

  items.push({ name: "Wallet", href: "/wallet", icon: Wallet });

  // Talent management — only for organizations (admin/strategist), NOT for clients or freelancers
  if (activeGroup === 'client' || isFreelance) {
    return [{ label: "KREOON MARKETPLACE", items }];
  }

  const savedItems: NavItem[] = [
    { name: "Guardados", href: "/marketplace/guardados", icon: Bookmark },
    { name: "Listas de Talento", href: "/marketplace/talent-lists", icon: ListChecks },
    { name: "Invitaciones", href: "/marketplace/invitations", icon: UserPlus },
  ];

  if (activeGroup === 'admin' || activeGroup === 'strategist') {
    savedItems.push({ name: "Consultas", href: "/marketplace/inquiries", icon: MessageSquare });
  }

  return [
    { label: "KREOON MARKETPLACE", items },
    { label: "GESTIÓN TALENTO", items: savedItems },
  ];
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [currentClientName, setCurrentClientName] = useState<string | null>(null);
  const [clientCount, setClientCount] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, activeRole, roles, rolesLoaded, isPlatformAdmin } = useAuth();
  const { trackLogout } = useAuthAnalytics();
  const { isPlatformRoot, currentOrgName } = useOrgOwner();
  const { marketplaceEnabled, clientMarketplaceEnabled } = useOrgMarketplace();
  const { effectivePlatformName, effectiveStudioLabel, effectiveMarketplaceLabel, effectiveLogoUrl, isWhiteLabelActive } = useWhiteLabel();
  const { isImpersonating, effectiveRoles, impersonationTarget } = useImpersonation();
  const { isUnlocked, isGateLoading } = useReferralGate();

  // Detect freelance user: has no org and is not a platform admin
  const isFreelanceUser = !profile?.current_organization_id && !isPlatformAdmin && !isPlatformRoot;

  // Resolve permission group — same logic as Sidebar
  const rawActiveGroup: PermissionGroup | null = isImpersonating
    ? (effectiveRoles.length > 0 ? getPermissionGroup(effectiveRoles[0]) : null)
    : (activeRole ? getPermissionGroup(activeRole) : null);

  // Detect client/brand member: by profile flags
  const isBrandMember = !!(profile as any)?.active_brand_id ||
    (profile as any)?.active_role === 'client';

  // For brand members without org roles, treat them as 'client' group
  const activeGroup: PermissionGroup | null = rawActiveGroup || (isBrandMember ? 'client' : null);

  const activeIsAdmin = activeGroup === 'admin';
  const activeIsStrategist = activeGroup === 'strategist';
  const activeIsEditor = activeGroup === 'editor';
  const activeIsCreator = activeGroup === 'creator';
  const activeIsClient = activeGroup === 'client';

  // Fetch current client name and count for client users (with brand fallback)
  useEffect(() => {
    if (isImpersonating && activeIsClient && impersonationTarget.clientId) {
      setCurrentClientName(impersonationTarget.clientName);
      setClientCount(1);
      return;
    }

    if (activeIsClient && user) {
      const fetchCurrentClient = async () => {
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

        if (associations && associations.length > 0) {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', associations[0].client_id)
            .maybeSingle();

          if (client) {
            setCurrentClientName(client.name);
            return;
          }
        }

        if (totalClients === 0) {
          const { data: brandMembers } = await (supabase as any)
            .from('brand_members')
            .select('brand_id')
            .eq('user_id', user.id)
            .eq('status', 'active');

          if (brandMembers && brandMembers.length > 0) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('active_brand_id')
              .eq('id', user.id)
              .maybeSingle();

            const activeBrandId = (profileData as any)?.active_brand_id || brandMembers[0].brand_id;
            const { data: brand } = await (supabase as any)
              .from('brands')
              .select('name')
              .eq('id', activeBrandId)
              .maybeSingle();

            if (brand) {
              setCurrentClientName(brand.name);
              setClientCount(brandMembers.length);
            }
          }
        }
      };

      fetchCurrentClient();
    }
  }, [activeIsClient, user, isImpersonating, impersonationTarget]);

  const handleSignOut = async () => {
    trackLogout();
    setOpen(false);
    await signOut();
    navigate('/auth');
  };

  // Filter navigation sections — same logic as Sidebar
  const filteredSections = useMemo(() => {
    // Users who haven't unlocked via referral gate only see unlock page + profile
    // Skip this check while loading gate status or for users who bypass the gate
    // Clients/brands bypass the gate (they don't need referral keys)
    if (!isGateLoading && !isUnlocked && isFreelanceUser && !activeIsClient) {
      return lockedUserSections;
    }

    // Independent users (no org) - differentiate between clients and freelancers
    if (isFreelanceUser && (isUnlocked || activeIsClient)) {
      const mktSections = getMarketplaceSections(activeGroup, !activeIsClient);

      // Brand members/clients get client sections, talents get freelance sections
      if (activeIsClient) {
        return [
          ...mktSections,
          ...clientSections,
        ];
      }

      // Freelance talents
      return [
        ...mktSections,
        ...freelanceSections,
      ];
    }

    // When roles haven't loaded yet, show minimal nav to avoid flashing admin menu
    const baseSections = activeIsAdmin
      ? adminSections
      : activeIsStrategist
      ? strategistSections
      : activeIsEditor
      ? editorSections
      : activeIsCreator
      ? creatorSections
      : activeIsClient
      ? clientSections
      : (isPlatformAdmin ? adminSections : creatorSections);

    const labelMap: Record<string, string> = {
      'KREOON STUDIO': effectiveStudioLabel,
      'KREOON MARKETPLACE': effectiveMarketplaceLabel,
    };

    const filtered = baseSections
      .filter(section => {
        if (section.label === 'CRM PLATAFORMA' && !isPlatformAdmin) return false;
        return true;
      })
      .map(section => ({
        ...section,
        label: labelMap[section.label] || section.label,
        items: section.items.filter(item => {
          if (!isPlatformRoot && item.platformRootOnly) return false;
          if (isPlatformRoot && !profile?.current_organization_id && item.requiresOrg) return false;
          const effectiveMkt = activeIsClient ? clientMarketplaceEnabled : marketplaceEnabled;
          if (!effectiveMkt && item.href === '/marketplace') return false;
          return true;
        })
      })).filter(section => section.items.length > 0);

    // For clients, marketplace visibility depends on org's client_marketplace_enabled flag
    const effectiveMktEnabled = activeIsClient ? clientMarketplaceEnabled : marketplaceEnabled;

    const mktSections = effectiveMktEnabled
      ? getMarketplaceSections(activeGroup, isFreelanceUser).map(s => ({ ...s, label: labelMap[s.label] || s.label }))
      : [];

    const recruitSection: NavSection = {
      label: "RECLUTAMIENTO",
      items: [{ name: "Buscar Talento", href: "/marketplace", icon: Search }],
    };

    const configSection = filtered.find(s => s.label === 'CONFIG');
    const nonConfigSections = filtered.filter(s => s.label !== 'CONFIG');

    return [
      ...nonConfigSections,
      ...mktSections,
      ...(!effectiveMktEnabled && !activeIsClient ? [recruitSection] : []),
      ...(configSection ? [configSection] : [{ label: "CONFIG", items: [{ name: "Settings", href: "/settings", icon: Settings }] }]),
    ];
  }, [activeIsAdmin, activeIsStrategist, activeIsEditor, activeIsCreator, activeIsClient, isPlatformRoot, isPlatformAdmin, rolesLoaded, profile?.current_organization_id, marketplaceEnabled, clientMarketplaceEnabled, effectiveStudioLabel, effectiveMarketplaceLabel, activeGroup, isUnlocked, isGateLoading, isFreelanceUser]);

  // Auto-expand section with active route
  const pathname = location.pathname;
  useEffect(() => {
    for (const section of filteredSections) {
      const hasActiveItem = section.items.some(item => {
        const hrefPath = item.href.split('?')[0];
        if (item.href === '/marketplace') return pathname === '/marketplace';
        if (hrefPath.startsWith('/marketplace/') || item.href === '/wallet') return pathname.startsWith(hrefPath);
        return pathname === hrefPath;
      });
      if (hasActiveItem) {
        setCollapsedSections(prev =>
          prev[section.label] === false ? prev : { ...prev, [section.label]: false }
        );
      }
    }
  }, [pathname, filteredSections]);

  const toggleSection = (label: string) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const roleBadge = getRoleBadgeInfo(roles);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-primary/10 border border-primary/20 shadow-sm">
                <img src={effectiveLogoUrl} alt={effectivePlatformName} className="h-8 w-8 object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-sidebar-foreground">{effectivePlatformName}</h1>
                {currentOrgName && !isWhiteLabelActive ? (
                  <p className="text-xs text-primary/80 truncate font-medium">{currentOrgName}</p>
                ) : isWhiteLabelActive ? null : (
                  <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">AI Content Platform</p>
                )}
              </div>
            </div>
          </div>

          {/* Root Admin Organization Switcher */}
          {isPlatformRoot && (
            <div className="px-3 py-2 border-b border-sidebar-border">
              <RootOrgSwitcher />
            </div>
          )}

          {/* User Info */}
          {profile && (
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {profile.email}
                  </p>
                </div>
              </div>
              {roleBadge && (
                <Badge className={cn("mt-2", roleBadge.color, "text-white")}>
                  {roleBadge.label}
                </Badge>
              )}
            </div>
          )}

          {/* Navigation with Collapsible Sections */}
          <nav className="flex-1 overflow-y-auto p-3">
            {filteredSections.map((section, sectionIndex) => {
              const isSectionCollapsed = !!collapsedSections[section.label];
              return (
                <div key={section.label} className={cn(sectionIndex > 0 && "mt-4")}>
                  {/* Section Label — clickable to toggle */}
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center justify-between px-3 mb-1.5 group/section cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40 group-hover/section:text-sidebar-foreground/70 transition-colors">
                      {section.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-sidebar-foreground/40 group-hover/section:text-sidebar-foreground/70 transition-all duration-200",
                      isSectionCollapsed && "-rotate-90"
                    )} />
                  </button>

                  {/* Section Items — collapsible */}
                  <div className={cn(
                    "space-y-1 overflow-hidden transition-all duration-200",
                    isSectionCollapsed && "max-h-0 opacity-0",
                    !isSectionCollapsed && "max-h-[500px] opacity-100"
                  )}>
                    {section.items.map((item) => {
                      const itemPath = item.href.split('?')[0];
                      const itemSearch = item.href.includes('?') ? item.href.slice(item.href.indexOf('?')) : '';
                      const siblingHasFullMatch = !itemSearch && location.search && section.items.some(sib => {
                        if (sib === item) return false;
                        const sibPath = sib.href.split('?')[0];
                        const sibSearch = sib.href.includes('?') ? sib.href.slice(sib.href.indexOf('?')) : '';
                        return sibSearch && location.pathname === sibPath && location.search === sibSearch;
                      });
                      const isActive = item.href === '/marketplace'
                        ? location.pathname === '/marketplace'
                        : (itemPath.startsWith('/marketplace/') || item.href === '/wallet')
                        ? location.pathname.startsWith(itemPath)
                        : itemSearch
                        ? location.pathname === itemPath && location.search === itemSearch
                        : location.pathname === item.href && !siblingHasFullMatch;
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-sidebar-foreground border border-primary/25 shadow-sm"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
                          )}
                        >
                          {isActive && (
                            <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full shadow-sm" />
                          )}
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-primary"
                          )} />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* AI Tokens — only if has org and not client */}
          {profile?.current_organization_id && !activeIsClient && (
            <div className="border-t border-sidebar-border px-3 py-2">
              <AITokensPanelTrigger
                organizationId={profile.current_organization_id}
                variant="header"
              />
            </div>
          )}

          {/* Achievements Widget - hide for freelancers */}
          {!isFreelanceUser && (
            <div className="border-t border-sidebar-border">
              <SidebarAchievementsWidget collapsed={false} />
            </div>
          )}

          {/* User & Actions */}
          <div className="border-t border-sidebar-border p-3 space-y-2 bg-gradient-to-t from-muted/50 to-transparent">
            {/* Role Switcher - hide for freelancers with single role */}
            {!isImpersonating && !isFreelanceUser && (
              <RoleSwitcher collapsed={false} />
            )}

            {/* Client company switcher */}
            {activeIsClient && (
              <div className="space-y-1">
                {currentClientName && (
                  <div className="px-3 py-1 text-xs text-sidebar-foreground/60 truncate flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-primary/60" />
                    {currentClientName}
                    {clientCount > 1 && (
                      <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full border border-primary/25">
                        +{clientCount - 1}
                      </span>
                    )}
                  </div>
                )}
                {!isImpersonating && clientCount > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      setShowClientSelector(true);
                    }}
                    className="w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground justify-start rounded-xl"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cambiar Empresa
                  </Button>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive justify-start rounded-xl"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* Client Selector Dialog */}
      <ClientSelectorDialog
        open={showClientSelector}
        onOpenChange={setShowClientSelector}
        onSelectClient={(clientId) => {
          localStorage.setItem('selectedClientId', clientId);
          window.dispatchEvent(new CustomEvent('client-selected', { detail: { clientId } }));
          setShowClientSelector(false);
          navigate('/client-dashboard', { replace: true });
        }}
      />
    </Sheet>
  );
}
