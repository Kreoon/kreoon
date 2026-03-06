import { useState, useEffect, useMemo } from "react";
import { useAuthAnalytics } from "@/analytics";
import {
  LayoutDashboard,
  Users,
  Users2,
  FileText,
  Building2,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UsersRound,
  LogOut,
  Kanban,
  RefreshCw,
  Trophy,
  Video,
  TrendingUp,
  Megaphone,
  BarChart3,
  Wallet,
  Store,
  Play,
  Bookmark,
  UserCircle,
  Search,
  UserPlus,
  MessageSquare,
  ListChecks,
  GitBranch,
  DollarSign,
  Crown,
  Share2,
  Radar,
  ImagePlus,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionGroup, type PermissionGroup } from "@/lib/permissionGroups";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useOrgMarketplace } from "@/hooks/useOrgMarketplace";
import { ClientSelectorDialog } from "@/components/clients/ClientSelectorDialog";
import { RootOrgSwitcher } from "@/components/layout/RootOrgSwitcher";
import { UserOrgSwitcher } from "@/components/layout/UserOrgSwitcher";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";

import { supabase } from "@/integrations/supabase/client";
import { SidebarAchievementsWidget } from "@/components/points/SidebarAchievementsWidget";
import { AITokensPanelTrigger } from "@/components/ai/AITokensPanel";
import { Badge } from "@/components/ui/badge";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { useReferralGate } from "@/hooks/useReferralGate";
import { useUserPlanContext } from "@/hooks/useUserPlanContext";
import { Key } from "lucide-react";

interface NavItem {
  name: string;
  href: string | ((userId: string) => string);
  icon: React.ComponentType<{ className?: string }>;
  tourId: string;
  isDynamic?: boolean;
  platformRootOnly?: boolean;
  requiresOrg?: boolean;
  adminOnly?: boolean; // Solo visible para admins (feature en construcción para otros)
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// ── Shared section definitions ──

const MARKETING_ITEMS: NavItem[] = [
  { name: "Marketing", href: "/marketing", icon: TrendingUp, tourId: "sidebar-marketing", requiresOrg: true },
  { name: "Social Hub", href: "/social-hub", icon: Share2, tourId: "sidebar-social-hub" },
  { name: "Streaming", href: "/streaming", icon: Video, tourId: "sidebar-live", adminOnly: true },
  { name: "Live Hosting", href: "/streaming/hosting", icon: Users, tourId: "sidebar-live-hosting", adminOnly: true },
  { name: "Marketing Ads", href: "/marketing-ads", icon: BarChart3, tourId: "sidebar-marketing-ads" },
  { name: "Generador Ads", href: "/ad-generator", icon: ImagePlus, tourId: "sidebar-ad-generator" },
  { name: "Ad Intelligence", href: "/admin/ad-intelligence", icon: Search, tourId: "sidebar-ad-intel" },
  { name: "Social Scraper", href: "/admin/social-scraper", icon: Radar, tourId: "sidebar-social-scraper" },
];

const CONFIG_ITEMS: NavItem[] = [
  { name: "Mi Perfil", href: "/settings?section=profile", icon: UserCircle, tourId: "sidebar-profile" },
  { name: "Booking", href: "/booking/calendar", icon: CalendarDays, tourId: "sidebar-booking" },
  { name: "Plan", href: "/planes", icon: Crown, tourId: "sidebar-plan" },
  { name: "Settings", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

// Admin navigation organized in sections - KREOON TECH theme
const adminSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Control Center", href: "/dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard", requiresOrg: true },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board", requiresOrg: true },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content", requiresOrg: true },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts", requiresOrg: true },
      { name: "Ranking", href: "/ranking", icon: Trophy, tourId: "sidebar-up", requiresOrg: true },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS,
  },
  {
    label: "GESTIÓN",
    items: [
      { name: "Talento", href: "/talent", icon: Users, tourId: "sidebar-talent", requiresOrg: true },
      { name: "Clientes", href: "/clients-hub", icon: Building2, tourId: "sidebar-clients", requiresOrg: true },
      { name: "Pipelines", href: "/org-crm/pipelines", icon: GitBranch, tourId: "sidebar-org-pipelines", requiresOrg: true },
      { name: "Finanzas", href: "/org-crm/finanzas", icon: Wallet, tourId: "sidebar-org-finances", requiresOrg: true },
    ]
  },
  {
    label: "CRM PLATAFORMA",
    items: [
      { name: "Dashboard", href: "/crm", icon: LayoutDashboard, tourId: "sidebar-crm-dashboard" },
      { name: "Leads", href: "/crm/leads", icon: UserPlus, tourId: "sidebar-crm-leads" },
      { name: "Organizaciones", href: "/crm/organizaciones", icon: Building2, tourId: "sidebar-crm-orgs" },
      { name: "Marcas", href: "/crm/marcas", icon: Store, tourId: "sidebar-crm-brands" },
      { name: "Comunidades", href: "/crm/comunidades", icon: Users2, tourId: "sidebar-crm-communities" },
      { name: "Personas", href: "/crm/personas", icon: Users, tourId: "sidebar-crm-people" },
      { name: "Finanzas", href: "/crm/finanzas", icon: DollarSign, tourId: "sidebar-crm-finances" },
      { name: "Email Marketing", href: "/crm/email-marketing", icon: Megaphone, tourId: "sidebar-crm-email" },
      { name: "Papelera", href: "/admin/papelera", icon: Trash2, tourId: "sidebar-trash", platformRootOnly: true },
    ]
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const strategistSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Control Center", href: "/strategist-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard", requiresOrg: true },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board", requiresOrg: true },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content", requiresOrg: true },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts", requiresOrg: true },
      { name: "Ranking", href: "/ranking", icon: Trophy, tourId: "sidebar-up", requiresOrg: true },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS,
  },
  {
    label: "GESTIÓN",
    items: [
      { name: "Talento", href: "/talent", icon: Users, tourId: "sidebar-talent", requiresOrg: true },
      { name: "Clientes", href: "/clients-hub", icon: Building2, tourId: "sidebar-clients", requiresOrg: true },
      { name: "Pipelines", href: "/org-crm/pipelines", icon: GitBranch, tourId: "sidebar-org-pipelines", requiresOrg: true },
      { name: "Finanzas", href: "/org-crm/finanzas", icon: Wallet, tourId: "sidebar-org-finances", requiresOrg: true },
    ]
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const editorSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Editor Hub", href: "/editor-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content" },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS.filter(i => i.href !== '/marketing'), // Marketing strategy not for editors
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const creatorSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Creator Hub", href: "/creator-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content" },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS.filter(i => i.href !== '/marketing'), // Marketing strategy not for creators
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const clientSections: NavSection[] = [
  {
    label: "MI MARCA",
    items: [
      { name: "Portal", href: "/client-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Mis Proyectos", href: "/board?view=marketplace", icon: Kanban, tourId: "sidebar-projects" },
      { name: "Mis Campañas", href: "/marketplace/my-campaigns", icon: Megaphone, tourId: "sidebar-my-campaigns" },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: [
      { name: "Social Hub", href: "/social-hub", icon: Share2, tourId: "sidebar-social-hub" },
      // Streaming y Live Hosting solo para admins (en construcción para otros)
      { name: "Marketing Ads", href: "/marketing-ads", icon: BarChart3, tourId: "sidebar-marketing-ads" },
      { name: "Generador Ads", href: "/ad-generator", icon: ImagePlus, tourId: "sidebar-ad-generator" },
    ]
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

// Talent users with basic/free plan in an org - Limited access
// Only: Dashboard, Board, Content, Scripts, Social Hub, Marketplace, Campaigns, Wallet, Profile, Plan, Settings
const basicTalentInOrgSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Dashboard", href: "/creator-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content" },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
    ]
  },
  {
    label: "SOCIAL",
    items: [
      { name: "Social Hub", href: "/social-hub", icon: Share2, tourId: "sidebar-social-hub" },
    ]
  },
  {
    label: "MARKETPLACE",
    items: [
      { name: "Explorar", href: "/marketplace", icon: Store, tourId: "sidebar-mkt-browse" },
      { name: "Campañas", href: "/marketplace/campaigns", icon: Megaphone, tourId: "sidebar-mkt-campaigns" },
      { name: "Wallet", href: "/wallet", icon: Wallet, tourId: "sidebar-mkt-wallet" },
    ]
  },
  {
    label: "CONFIG",
    items: [
      { name: "Mi Perfil", href: "/settings?section=profile", icon: UserCircle, tourId: "sidebar-profile" },
      { name: "Plan", href: "/planes", icon: Crown, tourId: "sidebar-plan" },
      { name: "Settings", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

// Freelance users (no org) - Plan Básico Gratis
// Dashboard, Tablero, Marketplace, Campañas, Wallet, Perfil, Social Hub
const freelanceSections: NavSection[] = [
  {
    label: "MI NEGOCIO",
    items: [
      { name: "Dashboard", href: "/freelancer-dashboard", icon: LayoutDashboard, tourId: "sidebar-freelancer-dash" },
      { name: "Mis Proyectos", href: "/board?view=marketplace", icon: Kanban, tourId: "sidebar-freelancer-board" },
    ]
  },
  {
    label: "MARKETPLACE",
    items: [
      { name: "Explorar", href: "/marketplace", icon: Store, tourId: "sidebar-mkt-browse" },
      { name: "Campañas", href: "/marketplace/campaigns", icon: Megaphone, tourId: "sidebar-mkt-campaigns" },
      { name: "Wallet", href: "/wallet", icon: Wallet, tourId: "sidebar-mkt-wallet" },
    ]
  },
  {
    label: "SOCIAL",
    items: [
      { name: "Social Hub", href: "/social-hub", icon: Share2, tourId: "sidebar-social-hub" },
    ]
  },
  {
    label: "CONFIG",
    items: [
      { name: "Mi Perfil", href: "/settings?section=profile", icon: UserCircle, tourId: "sidebar-profile" },
      { name: "Plan", href: "/planes", icon: Crown, tourId: "sidebar-plan" },
      { name: "Settings", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

// Locked users (haven't completed referral gate) - only unlock access + profile
const lockedUserSections: NavSection[] = [
  {
    label: "BIENVENIDA",
    items: [
      { name: "Obtener Llaves", href: "/unlock-access", icon: Key, tourId: "sidebar-unlock" },
    ]
  },
  {
    label: "CONFIG",
    items: [
      { name: "Mi Perfil", href: "/settings?section=profile", icon: UserCircle, tourId: "sidebar-profile" },
    ]
  }
];

// Marketplace navigation sections — available to ALL users
function getMarketplaceSections(activeGroup: PermissionGroup | null, isFreelance: boolean = false): NavSection[] {
  const items: NavItem[] = [
    { name: "Marketplace", href: "/marketplace", icon: Store, tourId: "sidebar-mkt-browse" },
  ];

  // Campaign items — feed visible for internal roles (not editor/client)
  if (activeGroup !== 'editor' && activeGroup !== 'client') {
    items.push({ name: "Campañas", href: "/marketplace/campaigns", icon: Megaphone, tourId: "sidebar-mkt-campaigns" });
  }
  // "Mis Campañas" for admin/strategist/client (clients create offers here)
  if (activeGroup === 'admin' || activeGroup === 'strategist' || activeGroup === 'client') {
    items.push({ name: "Mis Campañas", href: "/marketplace/my-campaigns", icon: Megaphone, tourId: "sidebar-mkt-my-campaigns" });
  }

  items.push({ name: "Wallet", href: "/wallet", icon: Wallet, tourId: "sidebar-mkt-wallet" });

  // Talent management — only for organizations (admin/strategist), NOT for clients or freelancers
  if (activeGroup === 'client' || isFreelance) {
    return [{ label: "KREOON MARKETPLACE", items }];
  }

  const savedItems: NavItem[] = [
    { name: "Guardados", href: "/marketplace/guardados", icon: Bookmark, tourId: "sidebar-mkt-saved" },
    { name: "Listas de Talento", href: "/marketplace/talent-lists", icon: ListChecks, tourId: "sidebar-mkt-talent-lists" },
    { name: "Invitaciones", href: "/marketplace/invitations", icon: UserPlus, tourId: "sidebar-mkt-invitations" },
  ];

  // Inquiries only for admin/strategist
  if (activeGroup === 'admin' || activeGroup === 'strategist') {
    savedItems.push({ name: "Consultas", href: "/marketplace/inquiries", icon: MessageSquare, tourId: "sidebar-mkt-inquiries" });
  }

  return [
    { label: "KREOON MARKETPLACE", items },
    { label: "GESTIÓN TALENTO", items: savedItems },
  ];
}

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, activeRole, roles: realRoles, rolesLoaded, isPlatformAdmin, isSuperadmin } = useAuth();
  const { trackLogout } = useAuthAnalytics();
  const { isImpersonating, effectiveRoles, isRootAdmin, impersonationTarget } = useImpersonation();
  const { isPlatformRoot, currentOrgName } = useOrgOwner();
  const { marketplaceEnabled, clientMarketplaceEnabled } = useOrgMarketplace();
  const { effectivePlatformName, effectiveStudioLabel, effectiveMarketplaceLabel, effectiveLogoUrl, isWhiteLabelActive } = useWhiteLabel();
  const { isUnlocked, isGateLoading } = useReferralGate();
  const { shouldUseReducedMenu, usePersonalCoins } = useUserPlanContext();
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [currentClientName, setCurrentClientName] = useState<string | null>(null);
  const [clientCount, setClientCount] = useState(0);

  // Resolve permission group for active role (supports all 36+ marketplace roles)
  const rawActiveGroup: PermissionGroup | null = isImpersonating
    ? (effectiveRoles.length > 0 ? getPermissionGroup(effectiveRoles[0]) : null)
    : (activeRole ? getPermissionGroup(activeRole) : null);

  // Detect client/brand member: by permission group OR profile flags
  const isBrandMember = !!(profile as any)?.active_brand_id ||
    (profile as any)?.active_role === 'client';

  // For brand members without org roles, treat them as 'client' group
  const activeGroup: PermissionGroup | null = rawActiveGroup || (isBrandMember ? 'client' : null);

  const activeIsAdmin = activeGroup === 'admin';
  const activeIsStrategist = activeGroup === 'strategist';
  const activeIsEditor = activeGroup === 'editor';
  const activeIsCreator = activeGroup === 'creator';
  const activeIsClient = activeGroup === 'client';

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
            return;
          }
        }

        // Fallback: check brand_members for independent brands
        if (totalClients === 0) {
          const { data: brandMembers } = await (supabase as any)
            .from('brand_members')
            .select('brand_id')
            .eq('user_id', user.id)
            .eq('status', 'active');

          if (brandMembers && brandMembers.length > 0) {
            // Get active brand from profile or first brand
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

  // Detect freelance user: has no org and is not a platform admin
  const isFreelanceUser = !profile?.current_organization_id && !isPlatformAdmin && !isPlatformRoot;

  // Filter navigation sections based on platform root vs org owner and org selection
  const filteredSections = useMemo(() => {
    // Users who haven't unlocked via referral gate only see unlock page + profile
    // Skip this check while loading gate status or for users who bypass the gate
    // Clients/brands bypass the gate (they don't need referral keys)
    if (!isGateLoading && !isUnlocked && isFreelanceUser && !activeIsClient) {
      return lockedUserSections;
    }

    // Talent in org with basic/free personal plan - limited menu
    // This takes priority over role-based sections for these users
    if (shouldUseReducedMenu && !isPlatformAdmin && !isPlatformRoot) {
      return basicTalentInOrgSections;
    }

    // Independent users (no org) - differentiate between clients and freelancers
    if (isFreelanceUser && (isUnlocked || activeIsClient)) {
      // Brand members/clients get marketplace + client sections
      if (activeIsClient) {
        const mktSections = getMarketplaceSections(activeGroup, false);
        return [
          ...mktSections,
          ...clientSections,
        ];
      }

      // Freelance talents - menu already includes marketplace section
      return freelanceSections;
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

    // White-label label replacement map
    const labelMap: Record<string, string> = {
      'KREOON STUDIO': effectiveStudioLabel,
      'KREOON MARKETPLACE': effectiveMarketplaceLabel,
    };

    // Filter items within sections and apply white-label labels
    const filtered = baseSections
      .filter(section => {
        // Only platform admins see CRM PLATAFORMA (not org-level admins)
        if (section.label === 'CRM PLATAFORMA' && !isPlatformAdmin) return false;
        return true;
      })
      .map(section => ({
        ...section,
        label: labelMap[section.label] || section.label,
        items: section.items.filter(item => {
          if (!isPlatformRoot && item.platformRootOnly) return false;
          if (isPlatformRoot && !profile?.current_organization_id && item.requiresOrg) return false;
          // Hide adminOnly items (streaming/live) for non-admins - feature en construcción
          if (item.adminOnly && !activeIsAdmin && !isPlatformAdmin) return false;
          // Hide marketplace link from role sections when org has it disabled
          const effectiveMkt = activeIsClient ? clientMarketplaceEnabled : marketplaceEnabled;
          if (!effectiveMkt && item.href === '/marketplace') return false;
          return true;
        })
      })).filter(section => section.items.length > 0);

    // For clients, marketplace visibility depends on org's client_marketplace_enabled flag
    const effectiveMktEnabled = activeIsClient ? clientMarketplaceEnabled : marketplaceEnabled;

    // Use permission group for marketplace sections (apply label map)
    const mktSections = effectiveMktEnabled
      ? getMarketplaceSections(activeGroup, isFreelanceUser).map(s => ({ ...s, label: labelMap[s.label] || s.label }))
      : [];

    // "Buscar Talento" section - ALWAYS visible for recruitment, even when marketplace is disabled (not for clients)
    const recruitSection: NavSection = {
      label: "RECLUTAMIENTO",
      items: [
        { name: "Buscar Talento", href: "/marketplace", icon: Search, tourId: "sidebar-recruit" },
      ],
    };

    // Extract CONFIG section, insert marketplace before it
    const configSection = filtered.find(s => s.label === 'CONFIG');
    const nonConfigSections = filtered.filter(s => s.label !== 'CONFIG');

    return [
      ...nonConfigSections,
      ...mktSections,
      // Only add recruit section when marketplace is disabled (when enabled, /marketplace is already in mktSections)
      // Clients don't get the fallback recruit section either
      ...(!effectiveMktEnabled && !activeIsClient ? [recruitSection] : []),
      ...(configSection ? [configSection] : [{ label: "CONFIG", items: [{ name: "Settings", href: "/settings", icon: Settings, tourId: "sidebar-settings" }] }]),
    ];
  }, [activeIsAdmin, activeIsStrategist, activeIsEditor, activeIsCreator, activeIsClient, isPlatformRoot, isPlatformAdmin, rolesLoaded, profile?.current_organization_id, marketplaceEnabled, clientMarketplaceEnabled, effectiveStudioLabel, effectiveMarketplaceLabel, isFreelanceUser, activeGroup, isUnlocked, isGateLoading, shouldUseReducedMenu]);

  // Collapsible sections state — auto-expand section containing active route
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Auto-expand the section that contains the current route
  const pathname = location.pathname;
  useEffect(() => {
    for (const section of filteredSections) {
      const hasActiveItem = section.items.some(item => {
        const href = item.isDynamic && typeof item.href === 'function'
          ? item.href(user?.id || '')
          : item.href as string;
        const hrefPath = href.split('?')[0];
        if (href === '/marketplace') return pathname === '/marketplace';
        if (hrefPath.startsWith('/marketplace/') || href === '/wallet') return pathname.startsWith(hrefPath);
        return pathname === hrefPath;
      });
      if (hasActiveItem) {
        setCollapsedSections(prev =>
          prev[section.label] === false ? prev : { ...prev, [section.label]: false }
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSection = (label: string) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const userId = user?.id || '';

  const handleSignOut = async () => {
    trackLogout();
    await signOut();
    navigate('/auth');
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen",
        "border-r border-border",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-gradient-to-b from-background via-background to-background",
        "backdrop-blur-xl",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/[0.06] rounded-full blur-[120px] hidden dark:block" />
        <div className="absolute bottom-20 -right-20 w-60 h-60 bg-primary/[0.04] rounded-full blur-[100px] hidden dark:block" />
      </div>

      <div className="relative flex h-full flex-col z-10">
        {/* Logo with neon glow */}
        <div className={cn(
          "flex h-16 items-center border-b border-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-primary/10 border border-primary/20 shadow-sm">
                <img src={effectiveLogoUrl} alt={effectivePlatformName} className="h-8 w-8 object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-foreground">{effectivePlatformName}</h1>
                {currentOrgName && !isWhiteLabelActive ? (
                  <p className="text-xs text-primary truncate font-medium">{currentOrgName}</p>
                ) : isWhiteLabelActive ? null : (
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Content Platform</p>
                )}
              </div>
            </div>
          )}
          {collapsed && (
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-primary/10 border border-primary/20 shadow-sm">
              <img src={effectiveLogoUrl} alt={effectivePlatformName} className="h-8 w-8 object-cover" />
            </div>
          )}
        </div>

        {/* Root Admin Organization Switcher - show for superadmins or platform root */}
        {(isSuperadmin || isPlatformRoot) && !collapsed && (
          <div className="px-3 py-2 border-b border-border">
            <RootOrgSwitcher />
          </div>
        )}

        {/* Regular User Organization Switcher - for users with multiple orgs (not root) */}
        {!isSuperadmin && !isPlatformRoot && !collapsed && (
          <div className="px-3 py-2 border-b border-border">
            <UserOrgSwitcher />
          </div>
        )}

        {/* Navigation with Collapsible Sections */}
        <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          {filteredSections.map((section, sectionIndex) => {
            const isSectionCollapsed = !!collapsedSections[section.label];
            return (
              <div key={section.label} className={cn(sectionIndex > 0 && "mt-4")}>
                {/* Section Label — clickable to toggle */}
                {!collapsed && (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center justify-between px-3 mb-1.5 group/section cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 group-hover/section:text-muted-foreground transition-colors">
                      {section.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-muted-foreground/40 group-hover/section:text-muted-foreground transition-all duration-200",
                      isSectionCollapsed && "-rotate-90"
                    )} />
                  </button>
                )}

                {/* Section Items — collapsible */}
                <div className={cn(
                  "space-y-1 overflow-hidden transition-all duration-200",
                  !collapsed && isSectionCollapsed && "max-h-0 opacity-0",
                  (!collapsed && !isSectionCollapsed || collapsed) && "max-h-[500px] opacity-100"
                )}>
                  {section.items.map((item) => {
                    const href = item.isDynamic && typeof item.href === 'function'
                      ? item.href(userId)
                      : item.href as string;
                    const hrefPath = href.split('?')[0];
                    const hrefSearch = href.includes('?') ? href.slice(href.indexOf('?')) : '';
                    // When an item has no query string, check if a sibling with a more specific match exists
                    const siblingHasFullMatch = !hrefSearch && location.search && section.items.some(sib => {
                      if (sib === item) return false;
                      const sibHref = sib.isDynamic && typeof sib.href === 'function' ? sib.href(userId) : sib.href as string;
                      const sibPath = sibHref.split('?')[0];
                      const sibSearch = sibHref.includes('?') ? sibHref.slice(sibHref.indexOf('?')) : '';
                      return sibSearch && location.pathname === sibPath && location.search === sibSearch;
                    });
                    const isActive = href === '/marketplace'
                      ? location.pathname === '/marketplace'
                      : (hrefPath.startsWith('/marketplace/') || href === '/wallet')
                      ? location.pathname.startsWith(hrefPath)
                      : hrefSearch
                      ? location.pathname === hrefPath && location.search === hrefSearch
                      : location.pathname === href && !siblingHasFullMatch;
                    return (
                      <NavLink
                        key={item.name}
                        to={href}
                        data-tour={item.tourId}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                          isActive
                            ? "bg-primary/10 text-foreground border border-primary/25 shadow-sm"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-primary/10",
                          collapsed && "justify-center px-2"
                        )}
                      >
                        {/* Active indicator neon line */}
                        {isActive && (
                          <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full shadow-sm" />
                        )}
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-all duration-300",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                        )} />
                        {!collapsed && (
                          <span className={cn(
                            "transition-colors duration-300",
                            isActive && "text-foreground"
                          )}>{item.name}</span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* AI Tokens - for org users and freelancers */}
        {profile?.current_organization_id && !activeIsClient && !isFreelanceUser && (
          <div className="border-t border-border px-3 py-2">
            <AITokensPanelTrigger
              organizationId={profile.current_organization_id}
              variant={collapsed ? "compact" : "header"}
            />
          </div>
        )}

        {/* Freelancer Stats Widget - show for unlocked freelancers */}
        {isFreelanceUser && isUnlocked && (
          <div className="border-t border-border px-3 py-2">
            <AITokensPanelTrigger
              variant={collapsed ? "compact" : "header"}
            />
          </div>
        )}

        {/* Achievements Widget - show for everyone except clients */}
        {!activeIsClient && (
          <div className="border-t border-border">
            <SidebarAchievementsWidget collapsed={collapsed} />
          </div>
        )}

        {/* User & Actions */}
        <div className="border-t border-border p-3 space-y-2 bg-gradient-to-t from-muted/50 to-transparent">
          {!collapsed && profile && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate font-mono">
              {profile.email}
            </div>
          )}

          {/* Role Switcher - hide for freelancers with single role */}
          {!isImpersonating && !isFreelanceUser && (
            <RoleSwitcher collapsed={collapsed} />
          )}

          {/* Client company switcher - only show if user has multiple brands */}
          {activeIsClient && (
            <div className="space-y-1">
              {!collapsed && currentClientName && (
                <div className="px-3 py-1 text-xs text-muted-foreground truncate flex items-center gap-2">
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
                  onClick={() => setShowClientSelector(true)}
                  className={cn(
                    "w-full text-muted-foreground hover:bg-accent hover:text-primary border border-transparent hover:border-primary/20 rounded-xl transition-all",
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
              "w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 rounded-xl transition-all",
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
              "w-full text-muted-foreground/70 hover:bg-accent hover:text-muted-foreground rounded-xl transition-all",
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
