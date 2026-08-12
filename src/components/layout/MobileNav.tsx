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
  Store,
  Bookmark,
  FileText,
  Megaphone,
  Wallet,
  UserCircle,
  Search,
  UserPlus,
  MessageSquare,
  ListChecks,
  DollarSign,
  Crown,
  Share2,
  ChevronDown,
  ImagePlus,
  Key,
  Dna,
  Package,
  Receipt,
  Heart,
  Users2,
  Trash2,
  Blocks,
  LayoutList,
  GraduationCap,
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
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { AITokensPanelTrigger } from "@/components/ai/AITokensPanel";
import { supabase } from "@/integrations/supabase/client";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useReferralGate } from "@/hooks/useReferralGate";
import { useUserPlanContext } from "@/hooks/useUserPlanContext";

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

// ── Navegación simplificada 2026 — DEBE ser idéntica a Sidebar.tsx (contenido y orden) ──
// Máximo 6 entradas principales por rol en una sección sin label; lo secundario vive en "MÁS".

const SETTINGS_ITEM: NavItem = { name: "Configuración", href: "/settings", icon: Settings };
const ACADEMIA_ITEM: NavItem = { name: "Academia", href: "/academia", icon: GraduationCap };
const PLAN_ITEM: NavItem = { name: "Mi Plan", href: "/planes", icon: Crown };
const SOCIAL_HUB_ITEM: NavItem = { name: "Social Hub", href: "/social-hub", icon: Share2 };
const AD_GENERATOR_ITEM: NavItem = { name: "Generador de Anuncios", href: "/ad-generator", icon: ImagePlus };

// Secundarios que comparten admin y estratega (mismo alcance de gestión)
const ORG_MORE_ITEMS: NavItem[] = [
  ACADEMIA_ITEM,
  { name: "Portafolio", href: "/content", icon: FileText, requiresOrg: true },
  { name: "Finanzas", href: "/org-crm/finanzas", icon: Wallet, requiresOrg: true },
  SOCIAL_HUB_ITEM,
  AD_GENERATOR_ITEM,
  PLAN_ITEM,
];

// Secundarios de creador y editor (no gestionan clientes, finanzas ni talento)
const TALENT_MORE_ITEMS: NavItem[] = [
  { name: "Portafolio", href: "/content", icon: FileText },
  SOCIAL_HUB_ITEM,
  AD_GENERATOR_ITEM,
  PLAN_ITEM,
];

const adminSections: NavSection[] = [
  {
    label: "",
    items: [
      { name: "Inicio", href: "/dashboard", icon: LayoutDashboard, requiresOrg: true },
      { name: "Proyectos", href: "/board", icon: Kanban, requiresOrg: true },
      { name: "Clientes", href: "/clientes", icon: Building2, requiresOrg: true },
      { name: "Creadores", href: "/talent", icon: Users, requiresOrg: true },
      { name: "Guiones", href: "/scripts", icon: Sparkles, requiresOrg: true },
      SETTINGS_ITEM,
    ]
  },
  { label: "MÁS", items: ORG_MORE_ITEMS },
  {
    // CRM de plataforma: fuera de las 6 principales, pero no se pierde.
    label: "PLATAFORMA",
    items: [
      { name: "CRM", href: "/crm", icon: LayoutDashboard },
      { name: "Organizaciones", href: "/crm/organizaciones", icon: Building2 },
      { name: "Personas", href: "/crm/personas", icon: Users },
      { name: "Comunidades", href: "/crm/comunidades", icon: Users2 },
      { name: "Revenue Plataforma", href: "/crm/finanzas", icon: DollarSign },
      { name: "Email Marketing", href: "/crm/email-marketing", icon: Megaphone },
      { name: "Papelera", href: "/admin/papelera", icon: Trash2, platformRootOnly: true },
      { name: "Módulos en Desarrollo", href: "/admin/dev-modules", icon: Blocks, platformRootOnly: true },
      { name: "Todas las Páginas (QA)", href: "/admin/qa-paginas", icon: LayoutList, platformRootOnly: true },
    ]
  },
];

const strategistSections: NavSection[] = [
  {
    label: "",
    items: [
      { name: "Inicio", href: "/strategist-dashboard", icon: LayoutDashboard, requiresOrg: true },
      { name: "Proyectos", href: "/board", icon: Kanban, requiresOrg: true },
      { name: "Clientes", href: "/clientes", icon: Building2, requiresOrg: true },
      { name: "Creadores", href: "/talent", icon: Users, requiresOrg: true },
      { name: "Guiones", href: "/scripts", icon: Sparkles, requiresOrg: true },
      SETTINGS_ITEM,
    ]
  },
  { label: "MÁS", items: ORG_MORE_ITEMS },
];

const editorSections: NavSection[] = [
  {
    label: "",
    items: [
      { name: "Inicio", href: "/editor-dashboard", icon: LayoutDashboard },
      { name: "Proyectos", href: "/board", icon: Kanban },
      { name: "Guiones", href: "/scripts", icon: Sparkles },
      ACADEMIA_ITEM,
      SETTINGS_ITEM,
    ]
  },
  { label: "MÁS", items: TALENT_MORE_ITEMS },
];

const creatorSections: NavSection[] = [
  {
    label: "",
    items: [
      { name: "Inicio", href: "/creator-dashboard", icon: LayoutDashboard },
      { name: "Proyectos", href: "/board", icon: Kanban },
      { name: "Guiones", href: "/scripts", icon: Sparkles },
      ACADEMIA_ITEM,
      SETTINGS_ITEM,
    ]
  },
  { label: "MÁS", items: TALENT_MORE_ITEMS },
];

const clientSections: NavSection[] = [
  {
    label: "",
    items: [
      { name: "Inicio", href: "/client-dashboard", icon: LayoutDashboard },
      { name: "Mis videos", href: "/board?view=marketplace", icon: Kanban },
      { name: "Mi marca", href: "/client-dashboard?tab=dna", icon: Dna },
      { name: "Buscar talento", href: "/marketplace", icon: Store },
      { name: "Facturas", href: "/client-dashboard?tab=facturas", icon: Receipt },
      SETTINGS_ITEM,
    ]
  },
  {
    label: "MÁS",
    items: [
      { name: "Productos", href: "/client-dashboard?tab=products", icon: Package },
      { name: "Portafolio", href: "/client-dashboard?tab=portfolio", icon: FileText },
      { name: "Favoritos", href: "/marketplace/favoritos", icon: Heart },
      ACADEMIA_ITEM,
      PLAN_ITEM,
    ]
  },
];

// Freelance (sin org) — plan básico gratis. Igual que en Sidebar.tsx.
const freelanceSections: NavSection[] = [
  {
    label: "",
    items: [
      { name: "Inicio", href: "/creator-dashboard", icon: LayoutDashboard },
      { name: "Mis Proyectos", href: "/board?view=marketplace", icon: Kanban },
      { name: "Marketplace", href: "/marketplace", icon: Store },
      { name: "Guiones", href: "/scripts", icon: Sparkles },
      ACADEMIA_ITEM,
      SETTINGS_ITEM,
    ]
  },
  {
    label: "MÁS",
    items: [
      { name: "Favoritos", href: "/marketplace/favoritos", icon: Heart },
      SOCIAL_HUB_ITEM,
      PLAN_ITEM,
    ]
  },
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

// Talento con plan básico/gratis dentro de una org — acceso limitado.
// Devuelto tal cual (sin filtros ni marketplace añadido), por eso lleva su propio /marketplace.
const basicTalentInOrgSections: NavSection[] = [
  {
    label: "",
    items: [
      { name: "Inicio", href: "/creator-dashboard", icon: LayoutDashboard },
      { name: "Proyectos", href: "/board", icon: Kanban },
      { name: "Guiones", href: "/scripts", icon: Sparkles },
      ACADEMIA_ITEM,
      SETTINGS_ITEM,
    ]
  },
  {
    label: "MÁS",
    items: [
      { name: "Portafolio", href: "/content", icon: FileText },
      { name: "Marketplace", href: "/marketplace", icon: Store },
      SOCIAL_HUB_ITEM,
      PLAN_ITEM,
    ]
  },
];

/**
 * Combina secciones de navegación de múltiples roles eliminando duplicados.
 */
function combineNavSections(sectionArrays: NavSection[][]): NavSection[] {
  const sectionMap = new Map<string, NavItem[]>();
  const sectionOrder: string[] = [];

  for (const sections of sectionArrays) {
    for (const section of sections) {
      if (!sectionMap.has(section.label)) {
        sectionMap.set(section.label, []);
        sectionOrder.push(section.label);
      }
      const existingItems = sectionMap.get(section.label)!;
      for (const item of section.items) {
        if (!existingItems.some(i => i.href === item.href)) {
          existingItems.push(item);
        }
      }
    }
  }

  return sectionOrder.map(label => ({
    label,
    items: sectionMap.get(label)!,
  })).filter(s => s.items.length > 0);
}

/**
 * Obtiene las secciones base para un permission group específico
 */
function getSectionsForGroup(group: PermissionGroup): NavSection[] {
  switch (group) {
    case 'admin': return adminSections;
    case 'talent': return creatorSections;
    case 'client': return clientSections;
    default: return creatorSections;
  }
}

// Marketplace ya no es una sección propia: sus entradas se pliegan dentro de "MÁS".
// Espejo de getMarketplaceMoreItems() en Sidebar.tsx.
function getMarketplaceMoreItems(activeGroup: PermissionGroup | null): NavItem[] {
  const items: NavItem[] = [
    { name: "Marketplace", href: "/marketplace", icon: Store },
    { name: "Favoritos", href: "/marketplace/favoritos", icon: Heart },
  ];

  // Gestión de talento — solo roles de org (admin/talent), NO clientes
  if (activeGroup === 'client') return items;

  items.push(
    { name: "Guardados", href: "/marketplace/guardados", icon: Bookmark },
    { name: "Listas de Talento", href: "/marketplace/talent-lists", icon: ListChecks },
    { name: "Invitaciones", href: "/marketplace/invitations", icon: UserPlus },
  );

  if (activeGroup === 'admin' || activeGroup === 'talent') {
    items.push({ name: "Consultas", href: "/marketplace/inquiries", icon: MessageSquare });
  }

  return items;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [currentClientName, setCurrentClientName] = useState<string | null>(null);
  const [clientCount, setClientCount] = useState(0);
  // "MÁS"/"PLATAFORMA" arrancan cerradas (lo principal manda); el efecto de abajo abre
  // la que contenga la ruta activa.
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'MÁS': true,
    'PLATAFORMA': true,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, activeRole, roles, rolesLoaded, isPlatformAdmin } = useAuth();
  const { trackLogout } = useAuthAnalytics();
  const { isPlatformRoot, currentOrgName } = useOrgOwner();
  const { marketplaceEnabled, clientMarketplaceEnabled } = useOrgMarketplace();
  const { effectivePlatformName, effectiveLogoUrl, isWhiteLabelActive } = useWhiteLabel();
  const { isImpersonating, effectiveRoles, impersonationTarget } = useImpersonation();
  const { isUnlocked, isGateLoading } = useReferralGate();
  const { shouldUseReducedMenu, usePersonalCoins } = useUserPlanContext();

  // Detect freelance user: has no org and is not a platform admin
  const isFreelanceUser = !profile?.current_organization_id && !isPlatformAdmin && !isPlatformRoot;

  // Resolve permission group — same logic as Sidebar
  const rawActiveGroup: PermissionGroup | null = isImpersonating
    ? (effectiveRoles.length > 0 ? getPermissionGroup(effectiveRoles[0]) : null)
    : (activeRole ? getPermissionGroup(activeRole) : null);

  // Detect client/brand member: by profile flags OR having 'client' role
  const hasClientRole = (isImpersonating ? effectiveRoles : roles)?.includes('client');
  const isBrandMember = !!(profile as any)?.active_brand_id ||
    (profile as any)?.active_role === 'client' ||
    hasClientRole;

  // For brand members without org roles, treat them as 'client' group
  const activeGroup: PermissionGroup | null = rawActiveGroup || (isBrandMember ? 'client' : null);

  // Get ALL unique permission groups for the user (for multi-role support)
  const allUserGroups = useMemo(() => {
    const userRoles = isImpersonating ? effectiveRoles : roles;
    if (!userRoles || userRoles.length === 0) return [];

    const groups = new Set<PermissionGroup>();
    for (const role of userRoles) {
      const group = getPermissionGroup(role);
      if (group) groups.add(group);
    }
    return Array.from(groups);
  }, [isImpersonating, effectiveRoles, roles]);

  // User has multiple distinct permission groups (e.g., creator + editor)
  const isMultiRoleUser = allUserGroups.length > 1;

  // IMPORTANT: Use ONLY activeRole to determine which panel to show
  // DO NOT use roles.includes() as fallback - it causes multi-role users to see wrong panel
  // Example: user with ['creator', 'editor'] and activeRole='creator' should see creator panel, not editor
  const activeIsAdmin = activeRole === 'admin' || activeRole === 'team_leader';
  const activeIsStrategist = activeRole === 'strategist' || activeRole === 'digital_strategist' || activeRole === 'creative_strategist' || activeRole === 'community_manager';
  const activeIsEditor = activeRole === 'editor';
  // Client detection: only if activeRole is client or activeGroup is client
  const activeIsClient = activeRole === 'client' || activeGroup === 'client';
  // Creator: check for both 'creator' (legacy) and 'content_creator' (new)
  const activeIsCreator = !activeIsClient && (activeRole === 'creator' || activeRole === 'content_creator');

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

    // Talent in org with basic/free personal plan - limited menu
    // BUT clients always get their own sections regardless of plan
    if (shouldUseReducedMenu && !isPlatformAdmin && !isPlatformRoot && !activeIsClient) {
      return basicTalentInOrgSections;
    }

    // Independent users (no org) - differentiate between clients and freelancers
    // Ambas listas ya llevan su entrada de marketplace en la sección principal
    if (isFreelanceUser && (isUnlocked || activeIsClient)) {
      return activeIsClient ? clientSections : freelanceSections;
    }

    // When roles haven't loaded yet, show minimal nav to avoid flashing admin menu
    // For multi-role users, combine sections from all their permission groups
    let baseSections: NavSection[];

    if (isMultiRoleUser && !activeIsClient) {
      // Combine navigation sections from all user's permission groups
      const sectionArrays = allUserGroups
        .filter(g => g !== 'client')
        .map(g => getSectionsForGroup(g));
      baseSections = combineNavSections(sectionArrays);
    } else if (activeIsAdmin) {
      baseSections = adminSections;
    } else if (activeIsStrategist) {
      baseSections = strategistSections;
    } else if (activeIsEditor) {
      baseSections = editorSections;
    } else if (activeIsCreator) {
      baseSections = creatorSections;
    } else if (activeIsClient) {
      baseSections = clientSections;
    } else {
      baseSections = isPlatformAdmin ? adminSections : creatorSections;
    }

    const filtered = baseSections
      .filter(section => {
        // Solo admins (org o plataforma) ven el CRM de plataforma
        if (section.label === 'PLATAFORMA' && !activeIsAdmin && !isPlatformAdmin) return false;
        return true;
      })
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          if (!isPlatformRoot && item.platformRootOnly) return false;
          if (isPlatformRoot && !profile?.current_organization_id && item.requiresOrg) return false;
          const effectiveMkt = activeIsClient ? clientMarketplaceEnabled : marketplaceEnabled;
          if (!effectiveMkt && item.href === '/marketplace') return false;
          return true;
        })
      })).filter(section => section.items.length > 0);

    // Los clientes ya llevan su marketplace ("Buscar talento") en la sección principal
    if (activeIsClient) {
      return filtered;
    }

    // Marketplace se pliega dentro de "MÁS". Si la org lo tiene apagado queda solo
    // "Buscar Talento": el reclutamiento sigue disponible siempre.
    const extraItems: NavItem[] = marketplaceEnabled
      ? getMarketplaceMoreItems(activeGroup)
      : [{ name: "Buscar Talento", href: "/marketplace", icon: Search }];

    if (!filtered.some(s => s.label === 'MÁS')) {
      return [...filtered, { label: "MÁS", items: extraItems }];
    }

    return filtered.map(section =>
      section.label === 'MÁS'
        ? { ...section, items: [...section.items, ...extraItems] }
        : section
    );
  }, [activeIsAdmin, activeIsStrategist, activeIsEditor, activeIsCreator, activeIsClient, isPlatformRoot, isPlatformAdmin, rolesLoaded, profile?.current_organization_id, marketplaceEnabled, clientMarketplaceEnabled, activeGroup, isUnlocked, isGateLoading, isFreelanceUser, shouldUseReducedMenu, isMultiRoleUser, allUserGroups]);

  // Auto-expand section with active route
  const pathname = location.pathname;
  useEffect(() => {
    for (const section of filteredSections) {
      const hasActiveItem = section.items.some(item => {
        const hrefPath = item.href.split('?')[0];
        if (item.href === '/marketplace') return pathname === '/marketplace';
        if (hrefPath.startsWith('/marketplace/')) return pathname.startsWith(hrefPath);
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
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-background border-border">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-sm overflow-hidden bg-purple-500/10 border border-purple-500/20">
                <img src={effectiveLogoUrl} alt={effectivePlatformName} className="h-8 w-8 object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-zinc-900 dark:text-white">{effectivePlatformName}</h1>
                {currentOrgName && !isWhiteLabelActive ? (
                  <p className="text-xs text-purple-600 dark:text-purple-400 truncate font-medium">{currentOrgName}</p>
                ) : isWhiteLabelActive ? null : (
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">AI Content Platform</p>
                )}
              </div>
            </div>
          </div>

          {/* User Info */}
          {profile && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-500/10 text-purple-500">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
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
                <div key={section.label || `section-${sectionIndex}`} className={cn(sectionIndex > 0 && section.label && "mt-4")}>
                  {/* Section Label — clickable to toggle (only if label exists) */}
                  {section.label && (
                    <button
                      onClick={() => toggleSection(section.label)}
                      className="w-full flex items-center justify-between px-3 mb-1.5 group/section cursor-pointer"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 group-hover/section:text-zinc-700 dark:group-hover/section:text-zinc-400 transition-colors">
                        {section.label}
                      </span>
                      <ChevronDown className={cn(
                        "h-3 w-3 text-zinc-400 group-hover/section:text-zinc-600 dark:text-zinc-600 dark:group-hover/section:text-zinc-400 transition-all duration-150",
                        isSectionCollapsed && "-rotate-90"
                      )} />
                    </button>
                  )}

                  {/* Section Items — collapsible only if section has label */}
                  <div className={cn(
                    "space-y-1 overflow-hidden transition-all duration-200",
                    section.label && isSectionCollapsed && "max-h-0 opacity-0",
                    (!section.label || !isSectionCollapsed) && "max-h-[900px] opacity-100"
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
                        : itemPath.startsWith('/marketplace/')
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
                            "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                            isActive
                              ? "bg-purple-500/10 text-zinc-900 dark:text-white"
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                          )}
                        >
                          {isActive && (
                            <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-purple-500 rounded-full" />
                          )}
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-colors duration-150",
                            isActive ? "text-purple-500" : "text-zinc-500 group-hover:text-purple-500"
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

          {/* AI Tokens — only if has org and not client (use personal coins if usePersonalCoins is true) */}
          {profile?.current_organization_id && !activeIsClient && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 py-2">
              <AITokensPanelTrigger
                organizationId={usePersonalCoins ? null : profile.current_organization_id}
                variant="header"
              />
            </div>
          )}

          {/* User & Actions */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
            {/* Role Switcher - hide for freelancers, multi-role users, and clients */}
            {!isImpersonating && !isFreelanceUser && !isMultiRoleUser && !activeIsClient && (
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
                    className="w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground justify-start rounded-sm"
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
              className="w-full text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive justify-start rounded-sm"
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
