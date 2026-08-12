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
  Megaphone,
  Wallet,
  Store,
  Play,
  Bookmark,
  UserCircle,
  Search,
  UserPlus,
  MessageSquare,
  ListChecks,
  DollarSign,
  Crown,
  Share2,
  ImagePlus,
  Trash2,
  Dna,
  Package,
  CircleUser,
  Blocks,
  Heart,
  Receipt,
  GraduationCap,
  LayoutList,
} from "lucide-react";
import { filterDevModuleItems } from '@/lib/developmentModules';
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionGroup, type PermissionGroup } from "@/lib/permissionGroups";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useOrgMarketplace } from "@/hooks/useOrgMarketplace";
import { ClientSelectorDialog } from "@/components/clients/ClientSelectorDialog";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";

import { supabase } from "@/integrations/supabase/client";
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
  isNew?: boolean; // Muestra badge "NUEVO" al lado del nombre
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// ── Shared section definitions ──

const MARKETING_ITEMS: NavItem[] = [
  { name: "Social Hub", href: "/social-hub", icon: Share2, tourId: "sidebar-social-hub" },
  { name: "Generador de Anuncios", href: "/ad-generator", icon: ImagePlus, tourId: "sidebar-ad-generator" },
];

const CONFIG_ITEMS: NavItem[] = [
  { name: "Mi Perfil", href: "/settings?section=profile", icon: UserCircle, tourId: "sidebar-profile" },
  { name: "Campañas Gestionadas", href: "/campanas-gestionadas", icon: Megaphone, tourId: "sidebar-managed-campaigns" },
  { name: "Mi Plan", href: "/planes", icon: Crown, tourId: "sidebar-plan" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

// Admin navigation organized in sections - KREOON TECH theme
const adminSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Centro de Control", href: "/dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard", requiresOrg: true },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board", requiresOrg: true },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content", requiresOrg: true },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts", requiresOrg: true },
      { name: "Academia", href: "/academia", icon: GraduationCap, tourId: "sidebar-academia", isNew: true },
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
      { name: "Talento & Equipo", href: "/talent", icon: Users, tourId: "sidebar-talent", requiresOrg: true },
      { name: "Clientes", href: "/clientes", icon: Building2, tourId: "sidebar-clients", requiresOrg: true },
      { name: "Finanzas", href: "/org-crm/finanzas", icon: Wallet, tourId: "sidebar-org-finances", requiresOrg: true },
    ]
  },
  {
    label: "CRM PLATAFORMA",
    items: [
      { name: "CRM", href: "/crm", icon: LayoutDashboard, tourId: "sidebar-crm-dashboard" },
      { name: "Comunidades", href: "/crm/comunidades", icon: Users2, tourId: "sidebar-crm-communities" },
      { name: "Revenue Plataforma", href: "/crm/finanzas", icon: DollarSign, tourId: "sidebar-crm-finances" },
      { name: "Email Marketing", href: "/crm/email-marketing", icon: Megaphone, tourId: "sidebar-crm-email" },
      { name: "Pagos Pendientes", href: "/admin/pending-payments", icon: DollarSign, tourId: "sidebar-pending-payments", platformRootOnly: true },
      { name: "Papelera", href: "/admin/papelera", icon: Trash2, tourId: "sidebar-trash", platformRootOnly: true },
      { name: "Módulos en Desarrollo", href: "/admin/dev-modules", icon: Blocks, tourId: "sidebar-dev-modules", platformRootOnly: true },
      { name: "Todas las Páginas (QA)", href: "/admin/qa-paginas", icon: LayoutList, tourId: "sidebar-qa-pages", platformRootOnly: true },
    ]
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const strategistSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Centro de Control", href: "/strategist-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard", requiresOrg: true },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board", requiresOrg: true },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content", requiresOrg: true },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts", requiresOrg: true },
      { name: "Academia", href: "/academia", icon: GraduationCap, tourId: "sidebar-academia", isNew: true },
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
      { name: "Talento & Equipo", href: "/talent", icon: Users, tourId: "sidebar-talent", requiresOrg: true },
      { name: "Clientes", href: "/clientes", icon: Building2, tourId: "sidebar-clients", requiresOrg: true },
      { name: "Finanzas", href: "/org-crm/finanzas", icon: Wallet, tourId: "sidebar-org-finances", requiresOrg: true },
    ]
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const editorSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Centro de Editor", href: "/editor-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content" },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
      { name: "Academia", href: "/academia", icon: GraduationCap, tourId: "sidebar-academia", isNew: true },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS,
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const creatorSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Centro de Creador", href: "/creator-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content" },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
      { name: "Academia", href: "/academia", icon: GraduationCap, tourId: "sidebar-academia", isNew: true },
    ]
  },
  {
    label: "MARKETING & MEDIA",
    items: MARKETING_ITEMS,
  },
  { label: "CONFIG", items: CONFIG_ITEMS }
];

const clientSections: NavSection[] = [
  {
    label: "", // Sin título de sección - MVP simplificado
    items: [
      { name: "Inicio", href: "/client-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "ADN de Marca", href: "/client-dashboard?tab=dna", icon: Dna, tourId: "sidebar-dna" },
      { name: "Productos", href: "/client-dashboard?tab=products", icon: Package, tourId: "sidebar-products" },
      { name: "Portafolio", href: "/client-dashboard?tab=portfolio", icon: FileText, tourId: "sidebar-portfolio" },
      { name: "Academia", href: "/academia", icon: GraduationCap, tourId: "sidebar-academia", isNew: true },
      { name: "Facturas", href: "/client-dashboard?tab=facturas", icon: Receipt, tourId: "sidebar-facturas" },
      { name: "Mis Proyectos", href: "/board?view=marketplace", icon: Kanban, tourId: "sidebar-projects" },
      { name: "Campañas Gestionadas", href: "/campanas-gestionadas", icon: Megaphone, tourId: "sidebar-managed-campaigns" },
      { name: "Mi Plan", href: "/planes", icon: Crown, tourId: "sidebar-plan" },
      { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  },
  {
    label: "MARKETPLACE",
    items: [
      { name: "Explorar Talento", href: "/marketplace", icon: Store, tourId: "sidebar-mkt-browse" },
      { name: "Favoritos", href: "/marketplace/favoritos", icon: Heart, tourId: "sidebar-mkt-favoritos" },
      { name: "Mis Campañas", href: "/marketplace/my-campaigns", icon: Megaphone, tourId: "sidebar-mkt-my-campaigns" },
      { name: "Crear Campaña", href: "/marketplace/campaigns/create", icon: ImagePlus, tourId: "sidebar-mkt-create-campaign" },
    ]
  },
];

// Talent users with basic/free plan in an org - Limited access
// Only: Dashboard, Board, Content, Scripts, Social Hub, Marketplace, Campaigns, Wallet, Profile, Plan, Settings
const basicTalentInOrgSections: NavSection[] = [
  {
    label: "KREOON STUDIO",
    items: [
      { name: "Tablero", href: "/creator-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
      { name: "Producciones", href: "/board", icon: Kanban, tourId: "sidebar-board" },
      { name: "Portafolio", href: "/content", icon: FileText, tourId: "sidebar-content" },
      { name: "Kreoon IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
      { name: "Academia", href: "/academia", icon: GraduationCap, tourId: "sidebar-academia", isNew: true },
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
    ]
  },
  {
    label: "CONFIG",
    items: [
      { name: "Mi Perfil", href: "/settings?section=profile", icon: UserCircle, tourId: "sidebar-profile" },
      { name: "Mi Plan", href: "/planes", icon: Crown, tourId: "sidebar-plan" },
      { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
    ]
  }
];

// Freelance users (no org) - Plan Básico Gratis
// Dashboard, Tablero, Marketplace, Campañas, Wallet, Perfil, Social Hub
const freelanceSections: NavSection[] = [
  {
    label: "MI NEGOCIO",
    items: [
      { name: "Dashboard", href: "/creator-dashboard", icon: LayoutDashboard, tourId: "sidebar-freelancer-dash" },
      { name: "Mis Proyectos", href: "/board?view=marketplace", icon: Kanban, tourId: "sidebar-freelancer-board" },
      { name: "Academia", href: "/academia", icon: GraduationCap, tourId: "sidebar-academia", isNew: true },
    ]
  },
  {
    label: "MARKETPLACE",
    items: [
      { name: "Explorar", href: "/marketplace", icon: Store, tourId: "sidebar-mkt-browse" },
      { name: "Campañas", href: "/marketplace/campaigns", icon: Megaphone, tourId: "sidebar-mkt-campaigns" },
      { name: "Billetera", href: "/wallet", icon: Wallet, tourId: "sidebar-mkt-wallet" },
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
      { name: "Mi Plan", href: "/planes", icon: Crown, tourId: "sidebar-plan" },
      { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
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

/**
 * Combina secciones de navegación de múltiples roles eliminando duplicados.
 * Útil para usuarios con múltiples roles (ej: creator + editor)
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
        // Evitar duplicados por href
        const href = typeof item.href === 'function' ? 'dynamic' : item.href;
        if (!existingItems.some(i => (typeof i.href === 'function' ? 'dynamic' : i.href) === href)) {
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

/**
 * Obtiene las secciones específicas para un rol de talento individual.
 * Diferencia entre creator, editor y estrategas dentro del mismo grupo talent.
 */
function getSectionsForTalentRole(role: string): NavSection[] {
  if (role === 'editor' || role === 'video_editor') return editorSections;
  if (
    role === 'digital_strategist' || role === 'creative_strategist' ||
    role === 'community_manager' || role === 'strategist'
  ) return strategistSections;
  return creatorSections;
}

// Marketplace navigation sections — available to ALL users
function getMarketplaceSections(activeGroup: PermissionGroup | null, isFreelance: boolean = false): NavSection[] {
  const items: NavItem[] = [
    { name: "Marketplace", href: "/marketplace", icon: Store, tourId: "sidebar-mkt-browse" },
  ];

  // Campaign items — feed visible for internal roles (not editor/client)
  if (activeGroup !== 'editor' && activeGroup !== 'client') {
    items.push({ name: "Campañas", href: "/marketplace/campaigns", icon: Megaphone, tourId: "sidebar-mkt-campaigns" });
  }
  // "Mis Campañas" for admin/talent/client
  if (activeGroup === 'admin' || activeGroup === 'talent' || activeGroup === 'client') {
    items.push({ name: "Mis Campañas", href: "/marketplace/my-campaigns", icon: Megaphone, tourId: "sidebar-mkt-my-campaigns" });
  }

  items.push({ name: "Favoritos", href: "/marketplace/favoritos", icon: Heart, tourId: "sidebar-mkt-favoritos" });

  // Talent management — only for org roles (admin/talent), NOT for clients or freelancers
  if (activeGroup === 'client' || isFreelance) {
    return [{ label: "KREOON MARKETPLACE", items }];
  }

  const savedItems: NavItem[] = [
    { name: "Guardados", href: "/marketplace/guardados", icon: Bookmark, tourId: "sidebar-mkt-saved" },
    { name: "Listas de Talento", href: "/marketplace/talent-lists", icon: ListChecks, tourId: "sidebar-mkt-talent-lists" },
    { name: "Invitaciones", href: "/marketplace/invitations", icon: UserPlus, tourId: "sidebar-mkt-invitations" },
  ];

  // Inquiries only for admin/talent with permissions
  if (activeGroup === 'admin' || activeGroup === 'talent') {
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

  // Detect client/brand member: by permission group, profile flags, OR having 'client' role
  const hasClientRole = (isImpersonating ? effectiveRoles : realRoles)?.includes('client');
  const isBrandMember = !!(profile as any)?.active_brand_id ||
    (profile as any)?.active_role === 'client' ||
    hasClientRole;

  // For brand members without org roles, treat them as 'client' group
  const activeGroup: PermissionGroup | null = rawActiveGroup || (isBrandMember ? 'client' : null);

  // Get ALL unique permission groups for the user (for multi-role support)
  const allUserGroups = useMemo(() => {
    const roles = isImpersonating ? effectiveRoles : realRoles;
    if (!roles || roles.length === 0) return [];

    const groups = new Set<PermissionGroup>();
    for (const role of roles) {
      const group = getPermissionGroup(role);
      if (group) groups.add(group);
    }
    return Array.from(groups);
  }, [isImpersonating, effectiveRoles, realRoles]);

  // User has multiple distinct permission groups (e.g., talent + client)
  const isMultiRoleUser = allUserGroups.length > 1;

  // Detect multi-talent: multiple roles within the SAME talent group (e.g. creator + editor)
  // These don't trigger isMultiRoleUser (same group) but need combined nav sections
  const talentSubRoles = useMemo(() => {
    const roles = isImpersonating ? effectiveRoles : realRoles;
    return roles.filter(r => getPermissionGroup(r) === 'talent' && r !== 'ambassador');
  }, [isImpersonating, effectiveRoles, realRoles]);

  // True when user has talent sub-roles that map to DIFFERENT section arrays
  const hasMultipleTalentRoles = useMemo(() => {
    if (talentSubRoles.length <= 1) return false;
    const uniqueSections = new Set(talentSubRoles.map(getSectionsForTalentRole));
    return uniqueSections.size > 1;
  }, [talentSubRoles]);

  // For multi-role: get the "highest" role for certain checks
  // Use activeRole directly since PermissionGroup only has 3 values
  const highestRole = useMemo(() => {
    const priority = ['admin', 'digital_strategist', 'creative_strategist', 'community_manager', 'content_creator', 'editor', 'client'];
    for (const r of priority) {
      if (realRoles.includes(r as any)) return r;
    }
    return activeRole;
  }, [realRoles, activeRole]);

  // IMPORTANT: Use ONLY activeRole to determine which panel to show
  // DO NOT use realRoles.includes() as fallback - it causes multi-role users to see wrong panel
  // Example: user with ['creator', 'editor'] and activeRole='creator' should see creator panel, not editor
  const activeIsAdmin = activeRole === 'admin';
  const activeIsStrategist = activeRole === 'digital_strategist' || activeRole === 'creative_strategist' || activeRole === 'community_manager';
  const activeIsEditor = activeRole === 'editor';
  // Client detection: only if activeRole is client or activeGroup is client
  const activeIsClient = activeRole === 'client' || activeGroup === 'client';
  // Creator: check for both 'creator' (legacy) and 'content_creator' (new)
  const activeIsCreator = !activeIsClient && (activeRole === 'creator' || activeRole === 'content_creator');

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

  // Filter navigation sections based on role
  const filteredSections = useMemo(() => {
    // Talent in org with basic/free personal plan - limited menu
    // BUT clients always get their own sections regardless of plan
    if (shouldUseReducedMenu && !isPlatformAdmin && !isPlatformRoot && !activeIsClient) {
      return basicTalentInOrgSections;
    }

    // When roles haven't loaded yet, show minimal nav to avoid flashing admin menu
    // For multi-role users, combine sections from all their permission groups
    let baseSections: NavSection[];

    if (isMultiRoleUser && !activeIsClient) {
      // Combine navigation sections from all user's permission groups
      const sectionArrays = allUserGroups
        .filter(g => g !== 'client') // Don't mix client sections with other roles
        .map(g => getSectionsForGroup(g));
      baseSections = combineNavSections(sectionArrays);
    } else if (hasMultipleTalentRoles && !activeIsClient) {
      // Combine role-specific sections for multi-talent users (e.g. creator + editor)
      // Uses role-level sections instead of group-level to get proper nav per sub-role
      const uniqueSectionArrays = Array.from(new Set(talentSubRoles.map(getSectionsForTalentRole)));
      baseSections = combineNavSections(uniqueSectionArrays);
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

    // White-label label replacement map
    const labelMap: Record<string, string> = {
      'KREOON STUDIO': effectiveStudioLabel,
      'KREOON MARKETPLACE': effectiveMarketplaceLabel,
    };

    // Filter items within sections and apply white-label labels
    const filtered = baseSections
      .filter(section => {
        // Solo admins (org o plataforma) ven CRM PLATAFORMA
        if (section.label === 'CRM PLATAFORMA' && !activeIsAdmin && !isPlatformAdmin) return false;
        return true;
      })
      .map(section => {
        // Primero aplicar filtros existentes
        let filteredItems = section.items.filter(item => {
          if (!isPlatformRoot && item.platformRootOnly) return false;
          if (isPlatformRoot && !profile?.current_organization_id && item.requiresOrg) return false;
          // Hide adminOnly items for non-admins - feature en construcción
          if (item.adminOnly && !activeIsAdmin && !isPlatformAdmin) return false;
          // Hide marketplace link from role sections when org has it disabled
          const effectiveMkt = activeIsClient ? clientMarketplaceEnabled : marketplaceEnabled;
          if (!effectiveMkt && item.href === '/marketplace') return false;
          return true;
        });

        // Luego filtrar módulos en desarrollo para no-root users
        filteredItems = filterDevModuleItems(filteredItems, user?.email);

        return {
          ...section,
          label: labelMap[section.label] || section.label,
          items: filteredItems
        };
      }).filter(section => section.items.length > 0);

    // For clients, marketplace visibility depends on org's client_marketplace_enabled flag
    const effectiveMktEnabled = activeIsClient ? clientMarketplaceEnabled : marketplaceEnabled;

    // Use permission group for marketplace sections (apply label map)
    const mktSections = effectiveMktEnabled
      ? getMarketplaceSections(activeGroup, false).map(s => ({ ...s, label: labelMap[s.label] || s.label }))
      : [];

    // "Buscar Talento" section - ALWAYS visible for recruitment, even when marketplace is disabled (not for clients)
    const recruitSection: NavSection = {
      label: "RECLUTAMIENTO",
      items: [
        { name: "Buscar Talento", href: "/marketplace", icon: Search, tourId: "sidebar-recruit" },
      ],
    };

    // For clients, return sections as-is (already unified with all items including config)
    if (activeIsClient) {
      return filtered;
    }

    // Extract CONFIG section, insert marketplace before it
    const configSection = filtered.find(s => s.label === 'CONFIG');
    const nonConfigSections = filtered.filter(s => s.label !== 'CONFIG');

    return [
      ...nonConfigSections,
      ...mktSections,
      ...(!effectiveMktEnabled ? [recruitSection] : []),
      ...(configSection ? [configSection] : [{ label: "CONFIG", items: [{ name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" }] }]),
    ];
  }, [activeIsAdmin, activeIsStrategist, activeIsEditor, activeIsCreator, activeIsClient, isPlatformRoot, isPlatformAdmin, rolesLoaded, profile?.current_organization_id, marketplaceEnabled, clientMarketplaceEnabled, effectiveStudioLabel, effectiveMarketplaceLabel, activeGroup, shouldUseReducedMenu, isMultiRoleUser, allUserGroups, hasMultipleTalentRoles, talentSubRoles]);

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
        if (hrefPath.startsWith('/marketplace/')) return pathname.startsWith(hrefPath);
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
        "fixed left-4 top-4 bottom-4 z-50 flex flex-col",
        "rounded-2xl border border-white/10",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-white dark:bg-[#0c0c16] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)]",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >

      <div className="h-full flex flex-col">
        {/* Logo - fixed at top */}
        <div className={cn(
          "shrink-0 flex h-16 items-center border-b border-white/5 px-4 bg-transparent",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {/* hasCustomLogo: white-label activo Y hay un logo real (no el favicon por defecto) */}
          {!collapsed && (
            isWhiteLabelActive && effectiveLogoUrl !== '/favicon.png' ? (
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-sm overflow-hidden bg-purple-500/10 dark:bg-purple-500/10 border border-purple-500/20">
                  <img src={effectiveLogoUrl} alt={effectivePlatformName} className="h-8 w-8 object-cover" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-zinc-900 dark:text-white">{effectivePlatformName}</h1>
                </div>
              </div>
            ) : (
              <img src="/logo.png" alt="KREOON" className="h-10 object-contain" />
            )
          )}
          {collapsed && (
            <div className="relative flex h-10 w-10 items-center justify-center rounded-sm overflow-hidden bg-purple-500/10 border border-purple-500/20">
              <img
                src={isWhiteLabelActive && effectiveLogoUrl !== '/favicon.png' ? effectiveLogoUrl : '/favicon.png'}
                alt={effectivePlatformName}
                className="h-8 w-8 object-contain"
              />
            </div>
          )}
        </div>

        {/* Navigation - scrollable area */}
        <nav className="flex-1 overflow-y-auto p-3">
          {filteredSections.map((section, sectionIndex) => {
            const isSectionCollapsed = !!collapsedSections[section.label];
            return (
              <div key={section.label || `section-${sectionIndex}`} className={cn(sectionIndex > 0 && section.label && "mt-4")}>
                {/* Section Label — clickable to toggle (only if label exists) */}
                {!collapsed && section.label && (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center justify-between px-3 mb-1.5 group/section cursor-pointer"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 group-hover/section:text-zinc-700 dark:text-zinc-500 dark:group-hover/section:text-zinc-400 transition-colors">
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
                  "space-y-1 transition-all duration-200",
                  !collapsed && section.label && isSectionCollapsed && "max-h-0 opacity-0 overflow-hidden",
                  (!collapsed && (!section.label || !isSectionCollapsed) || collapsed) && "opacity-100"
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
                      : hrefPath.startsWith('/marketplace/')
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
                          "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                          isActive
                            ? "bg-purple-500/10 text-zinc-900 dark:text-white"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white",
                          collapsed && "justify-center px-2"
                        )}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-purple-500 rounded-full" />
                        )}
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-colors duration-150",
                          isActive ? "text-purple-500" : "text-zinc-500 group-hover:text-purple-500"
                        )} />
                        {!collapsed && (
                          <span className="flex items-center gap-1.5">
                            {item.name}
                            {item.isNew && (
                              <span
                                className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded-full",
                                  "text-[9px] font-bold uppercase tracking-wider",
                                  "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white",
                                  "shadow-sm shadow-purple-500/50",
                                  "animate-pulse"
                                )}
                                aria-label="Nuevo"
                              >
                                NUEVO
                              </span>
                            )}
                          </span>
                        )}
                        {/* Indicador NUEVO en modo collapsed: punto pulsante */}
                        {collapsed && item.isNew && (
                          <span
                            className="absolute top-1 right-1 h-2 w-2 rounded-full bg-fuchsia-500 animate-pulse shadow-sm shadow-fuchsia-500/80"
                            aria-label="Nuevo"
                          />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Tokens IA */}
        {profile && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 py-2">
            <AITokensPanelTrigger
              organizationId={null}
              variant={collapsed ? "compact" : "header"}
              readonly={activeIsClient}
              canSwitchContext={activeIsAdmin && !activeIsClient}
              userOrganizationId={profile.current_organization_id}
            />
          </div>
        )}


        {/* User & Actions - fixed at bottom */}
        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 py-2 px-3 bg-white dark:bg-[#0f0f14] space-y-1">
          {/* Email */}
          {!collapsed && profile && (
            <div className="px-3 py-1 text-xs text-muted-foreground truncate font-mono">
              {profile.email}
            </div>
          )}

          {/* Role Switcher - hide for multi-role users and clients */}
          {!isImpersonating && !isMultiRoleUser && !activeIsClient && (
            <RoleSwitcher collapsed={collapsed} />
          )}

          {/* Client company name and switcher */}
          {activeIsClient && !collapsed && currentClientName && (
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
          {activeIsClient && !isImpersonating && clientCount > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClientSelector(true)}
              className={cn(
                "w-full text-muted-foreground hover:bg-accent hover:text-primary border border-transparent hover:border-primary/20 rounded-sm transition-all text-xs",
                collapsed && "px-2"
              )}
              title={collapsed ? `${currentClientName || 'Cambiar Empresa'}` : undefined}
            >
              <RefreshCw className="h-3 w-3" />
              {!collapsed && <span className="ml-2">Cambiar Empresa</span>}
            </Button>
          )}

          {/* Collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "w-full text-muted-foreground/70 hover:bg-accent hover:text-muted-foreground rounded-sm transition-all text-xs",
              collapsed && "px-2"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Colapsar</span>
              </>
            )}
          </Button>

          {/* Sign out button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              "w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 rounded-sm transition-all text-xs",
              collapsed && "px-2"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Cerrar sesión</span>}
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
