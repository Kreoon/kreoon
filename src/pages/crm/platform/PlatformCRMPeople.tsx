import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Activity,
  AlertTriangle,
  UserMinus,
  Search,
  ShieldCheck,
  Building2,
  UserX,
  MailX,
  Ban,
  Key,
  KeyRound,
  Unlock,
  Loader2,
  Video,
  CheckCircle,
  BadgeCheck,
  UserPlus,
  Star,
  Briefcase,
  UserCircle,
  Calendar,
  Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  useUsersWithHealth,
  useUsersNeedingAttention,
  useCreatorsWithMetrics,
} from "@/hooks/useCrm";
import {
  HEALTH_STATUS_LABELS,
  HEALTH_STATUS_COLORS,
  TALENT_CATEGORY_LABELS,
  TALENT_CATEGORY_COLORS,
  SPECIFIC_ROLE_LABELS,
  CATEGORY_ROLES,
} from "@/types/crm.types";
import type { HealthStatus, TalentCategory, SpecificRole } from "@/types/crm.types";
import type { UserWithHealth, CreatorWithMetrics } from "@/services/crm/platformCrmService";
import { ViewModeToggle } from "@/components/crm";
import { UserDetailDialog } from "@/components/crm/UserDetailDialog";
import { UnifiedTalentDetailDialog } from "@/components/crm/UnifiedTalentDetailDialog";
import type { ViewMode } from "@/components/crm";

// =====================================================
// TYPES
// =====================================================

type PeopleTab = "sin_rol" | "clientes" | "freelancers" | "en_org";
type OrgRoleSubTab = "all" | "admin" | "client" | "creator" | "editor" | "strategist" | "other";

// =====================================================
// STAT CARD
// =====================================================

type StatColor = "purple" | "pink" | "blue" | "green" | "yellow" | "orange" | "red";

const COLOR_MAP: Record<StatColor, { text: string; iconBg: string }> = {
  purple: { text: "text-purple-400", iconBg: "bg-purple-500/20" },
  pink: { text: "text-pink-400", iconBg: "bg-pink-500/20" },
  blue: { text: "text-blue-400", iconBg: "bg-blue-500/20" },
  green: { text: "text-emerald-400", iconBg: "bg-emerald-500/20" },
  yellow: { text: "text-yellow-400", iconBg: "bg-yellow-500/20" },
  orange: { text: "text-orange-400", iconBg: "bg-orange-500/20" },
  red: { text: "text-red-400", iconBg: "bg-red-500/20" },
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: StatColor;
}) {
  const c = COLOR_MAP[color];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.iconBg)}>
          <Icon className={cn("h-5 w-5", c.text)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/50">{title}</p>
          {subtitle && <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// HELPERS
// =====================================================

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

// Platform user_type labels (registration type)
const getUserTypeLabel = (userType: string | null) => {
  if (!userType) return "Sin definir";
  const labels: Record<string, string> = {
    brand: "Marca/Empresa",
    talent: "Talento",
  };
  return labels[userType] || userType;
};

const getUserTypeColor = (userType: string | null) => {
  if (!userType) return "bg-white/10 text-white/50";
  const colors: Record<string, string> = {
    brand: "bg-emerald-500/20 text-emerald-300",
    talent: "bg-pink-500/20 text-pink-300",
  };
  return colors[userType] || "bg-white/10 text-white/70";
};

// Helper to check if avatar URL is valid (not null, not empty, not whitespace)
const hasValidAvatar = (url: string | null | undefined): url is string => {
  return !!(url && url.trim().length > 0);
};

// Organization role labels (role within an org)
const getOrgRoleLabel = (role: string | null) => {
  if (!role) return null; // Return null so we can conditionally show
  const labels: Record<string, string> = {
    admin: "Admin",
    team_leader: "Team Leader",
    creator: "Creador",
    editor: "Editor",
    strategist: "Estratega",
    developer: "Desarrollador",
    educator: "Educador",
    client: "Cliente",
    brand_manager: "Gerente de Marca",
    marketing_director: "Dir. Marketing",
    trafficker: "Trafficker",
  };
  return labels[role] || role;
};

const getOrgRoleColor = (role: string | null) => {
  if (!role) return null;
  const colors: Record<string, string> = {
    admin: "bg-purple-500/20 text-purple-300",
    team_leader: "bg-green-500/20 text-green-300",
    creator: "bg-pink-500/20 text-pink-300",
    editor: "bg-blue-500/20 text-blue-300",
    strategist: "bg-orange-500/20 text-orange-300",
    developer: "bg-cyan-500/20 text-cyan-300",
    educator: "bg-yellow-500/20 text-yellow-300",
    client: "bg-emerald-500/20 text-emerald-300",
    brand_manager: "bg-emerald-500/20 text-emerald-300",
    marketing_director: "bg-emerald-500/20 text-emerald-300",
    trafficker: "bg-rose-500/20 text-rose-300",
  };
  return colors[role] || "bg-white/10 text-white/70";
};

function getHealthColor(score: number) {
  if (score >= 70) return { bg: "bg-green-500/20", text: "text-green-400", bar: "bg-green-500" };
  if (score >= 40) return { bg: "bg-yellow-500/20", text: "text-yellow-400", bar: "bg-yellow-500" };
  return { bg: "bg-red-500/20", text: "text-red-400", bar: "bg-red-500" };
}

function isActiveRecently(user: UserWithHealth, ms: number) {
  if (!user.last_login_at) return false;
  return Date.now() - new Date(user.last_login_at).getTime() < ms;
}

function getPrimaryCategory(creator: CreatorWithMetrics): TalentCategory | null {
  const cat = creator.categories?.[0];
  if (cat && cat in TALENT_CATEGORY_LABELS) return cat as TalentCategory;
  return null;
}

function getPrimaryRole(creator: CreatorWithMetrics): SpecificRole | null {
  const role = creator.marketplace_roles?.[0];
  if (role && role in SPECIFIC_ROLE_LABELS) return role as SpecificRole;
  return null;
}

// user_type values for platform categorization (NOT organization roles)
// - 'brand' = Client/Brand owner (registered as empresa/marca)
// - 'talent' = Freelancer (registered as talento)
// - null or other = Sin rol definido

// =====================================================
// MAIN COMPONENT
// =====================================================

const PlatformCRMPeople = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: users = [], isLoading: loadingUsers, refetch } = useUsersWithHealth();
  const { data: usersNeedingAttention = [] } = useUsersNeedingAttention();
  const { data: creators = [], isLoading: loadingCreators, refetch: refetchCreators } = useCreatorsWithMetrics();

  // Read initial tab from URL param
  const initialTab = (searchParams.get("tab") as PeopleTab) || "clientes";
  const [activeTab, setActiveTab] = useState<PeopleTab>(
    ["sin_rol", "clientes", "freelancers", "en_org"].includes(initialTab) ? initialTab : "clientes"
  );
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [unlockingUserId, setUnlockingUserId] = useState<string | null>(null);

  // Sub-tab for "en_org" tab (filter by organization role)
  const [orgRoleSubTab, setOrgRoleSubTab] = useState<OrgRoleSubTab>("all");

  // Filters for users (sin_rol and clientes tabs)
  const [healthFilter, setHealthFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");

  // Filter by organization (en_org tab)
  const [orgFilter, setOrgFilter] = useState("all");

  // Filters for freelancers tab
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected items
  const [selectedUser, setSelectedUser] = useState<UserWithHealth | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<CreatorWithMetrics | null>(null);

  // Categorize users by user_type (platform registration type, NOT org role)
  // PRIORITY: user_type takes precedence over creator_profile existence
  const categorizedUsers = useMemo(() => {
    const sinRol: UserWithHealth[] = [];
    const clientes: UserWithHealth[] = [];
    const brandUserIds = new Set<string>(); // Track brand users to exclude from freelancers

    users.forEach(user => {
      const userType = user.user_type;

      if (userType === 'brand') {
        // Brand owners ALWAYS go to Clientes/Marcas tab, regardless of creator_profile
        clientes.push(user);
        brandUserIds.add(user.id);
      } else if (userType === 'talent') {
        // Talents with user_type='talent' go to Freelancers (handled by creators list)
        // But if they don't have a creator_profile yet, they go to Sin Rol
        const hasCreatorProfile = creators.some(c => c.user_id === user.id);
        if (!hasCreatorProfile) {
          sinRol.push(user);
        }
        // If they have a profile, they'll appear in the creators list for Freelancers tab
      } else {
        // Users without user_type or with unknown types
        // Check if they have a creator profile (legacy case)
        const hasCreatorProfile = creators.some(c => c.user_id === user.id);
        if (!hasCreatorProfile) {
          sinRol.push(user);
        }
        // If they have creator_profile but no user_type, they appear in freelancers
      }
    });

    return { sinRol, clientes, brandUserIds };
  }, [users, creators]);

  // Users in organizations - categorized by their org roles (multi-role support)
  // A user can appear in multiple tabs if they have multiple roles
  const usersInOrgs = useMemo(() => {
    const all: UserWithHealth[] = [];
    const userIdsInOrgs = new Set<string>(); // Track users in orgs to exclude from freelancers
    const byRole: Record<OrgRoleSubTab, UserWithHealth[]> = {
      all: [],
      admin: [],
      client: [],
      creator: [],
      editor: [],
      strategist: [],
      other: [],
    };

    users.forEach(user => {
      if (user.organization_id) {
        all.push(user);
        userIdsInOrgs.add(user.id); // Track for filtering freelancers

        // Use all_roles array for multi-role classification
        // User appears in all tabs matching their roles
        const allRoles = (user.all_roles || []).map(r => r.toLowerCase());
        const primaryRole = user.role?.toLowerCase() || '';

        // Combine all_roles with primary role to ensure coverage
        const rolesToCheck = new Set([...allRoles, primaryRole].filter(Boolean));

        let hasKnownRole = false;

        rolesToCheck.forEach(role => {
          if (role === 'admin' || role === 'team_leader') {
            byRole.admin.push(user);
            hasKnownRole = true;
          } else if (role === 'client' || role === 'brand_manager' || role === 'marketing_director') {
            byRole.client.push(user);
            hasKnownRole = true;
          } else if (role === 'creator') {
            byRole.creator.push(user);
            hasKnownRole = true;
          } else if (role === 'editor') {
            byRole.editor.push(user);
            hasKnownRole = true;
          } else if (role === 'strategist' || role === 'trafficker') {
            byRole.strategist.push(user);
            hasKnownRole = true;
          }
          // Note: 'ambassador' is a badge, not a role, so it doesn't create a tab
        });

        // Only put in "other" if they have no known roles
        if (!hasKnownRole && rolesToCheck.size > 0) {
          byRole.other.push(user);
        }
      }
    });

    byRole.all = all;
    return { byRole, userIdsInOrgs };
  }, [users]);

  // Unique organizations for filter dropdown
  const uniqueOrganizations = useMemo(() => {
    const orgs = new Map<string, { id: string; name: string }>();
    usersInOrgs.byRole.all.forEach((user) => {
      if (user.organization_id && user.organization_name) {
        orgs.set(user.organization_id, {
          id: user.organization_id,
          name: user.organization_name,
        });
      }
    });
    return Array.from(orgs.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [usersInOrgs.byRole.all]);

  // Filter creators to exclude brand users AND users in organizations
  // (brand users appear in Clientes, org users appear in En Organizaciones)
  const creatorsExcludingBrandsAndOrgs = useMemo(() => {
    return creators.filter(c =>
      !categorizedUsers.brandUserIds.has(c.user_id) &&
      !usersInOrgs.userIdsInOrgs.has(c.user_id)
    );
  }, [creators, categorizedUsers.brandUserIds, usersInOrgs.userIdsInOrgs]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    sin_rol: categorizedUsers.sinRol.length,
    clientes: categorizedUsers.clientes.length,
    freelancers: creatorsExcludingBrandsAndOrgs.length,
    en_org: usersInOrgs.byRole.all.length,
  }), [categorizedUsers, creatorsExcludingBrandsAndOrgs, usersInOrgs]);

  // Sub-tab counts for en_org
  const orgSubTabCounts = useMemo(() => ({
    all: usersInOrgs.byRole.all.length,
    admin: usersInOrgs.byRole.admin.length,
    client: usersInOrgs.byRole.client.length,
    creator: usersInOrgs.byRole.creator.length,
    editor: usersInOrgs.byRole.editor.length,
    strategist: usersInOrgs.byRole.strategist.length,
    other: usersInOrgs.byRole.other.length,
  }), [usersInOrgs]);

  // Stats based on active tab
  const stats = useMemo(() => {
    if (activeTab === "freelancers") {
      const total = creatorsExcludingBrandsAndOrgs.length;
      const active = creatorsExcludingBrandsAndOrgs.filter((c) => c.is_active).length;
      const verified = creatorsExcludingBrandsAndOrgs.filter((c) => c.is_verified).length;
      const recent = creatorsExcludingBrandsAndOrgs.filter(
        (c) => Date.now() - new Date(c.created_at).getTime() < THIRTY_DAYS_MS
      ).length;
      return { total, active, verified, recent, type: "freelancers" as const };
    } else if (activeTab === "en_org") {
      const list = usersInOrgs.byRole[orgRoleSubTab];
      const total = list.length;
      const active = list.filter((u) => isActiveRecently(u, SEVEN_DAYS_MS)).length;
      const atRisk = list.filter((u) => u.health_score < 50).length;
      const churned = list.filter(
        (u) => !u.last_login_at || Date.now() - new Date(u.last_login_at).getTime() > THIRTY_DAYS_MS
      ).length;
      return { total, active, atRisk, churned, type: "users" as const };
    } else {
      const list = activeTab === "sin_rol" ? categorizedUsers.sinRol : categorizedUsers.clientes;
      const total = list.length;
      const active = list.filter((u) => isActiveRecently(u, SEVEN_DAYS_MS)).length;
      const atRisk = list.filter((u) => u.health_score < 50).length;
      const churned = list.filter(
        (u) => !u.last_login_at || Date.now() - new Date(u.last_login_at).getTime() > THIRTY_DAYS_MS
      ).length;
      return { total, active, atRisk, churned, type: "users" as const };
    }
  }, [activeTab, categorizedUsers, creatorsExcludingBrandsAndOrgs, usersInOrgs, orgRoleSubTab]);

  // Available roles based on category filter (for freelancers)
  const availableRoles = useMemo(() => {
    if (categoryFilter && categoryFilter !== "all") {
      return CATEGORY_ROLES[categoryFilter as TalentCategory] || [];
    }
    return Object.keys(SPECIFIC_ROLE_LABELS) as SpecificRole[];
  }, [categoryFilter]);

  // Filtered users (for sin_rol, clientes, and en_org tabs)
  const filteredUsers = useMemo(() => {
    let list: UserWithHealth[];

    if (activeTab === "en_org") {
      list = [...usersInOrgs.byRole[orgRoleSubTab]];
    } else if (activeTab === "sin_rol") {
      list = [...categorizedUsers.sinRol];
    } else {
      list = [...categorizedUsers.clientes];
    }

    // Filter by organization (only for en_org tab)
    if (activeTab === "en_org" && orgFilter !== "all") {
      list = list.filter((u) => u.organization_id === orgFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.organization_name?.toLowerCase().includes(q)
      );
    }

    if (healthFilter !== "all") {
      switch (healthFilter) {
        case "healthy": list = list.filter((u) => u.health_score >= 70); break;
        case "at_risk": list = list.filter((u) => u.health_score >= 40 && u.health_score < 70); break;
        case "churning": list = list.filter((u) => u.health_score > 0 && u.health_score < 40); break;
        case "churned": list = list.filter((u) => (u.health_status as string) === "churned"); break;
      }
    }

    if (activityFilter !== "all") {
      const now = Date.now();
      switch (activityFilter) {
        case "today": list = list.filter((u) => u.last_login_at && now - new Date(u.last_login_at).getTime() < 24 * 60 * 60 * 1000); break;
        case "week": list = list.filter((u) => isActiveRecently(u, SEVEN_DAYS_MS)); break;
        case "month": list = list.filter((u) => isActiveRecently(u, THIRTY_DAYS_MS)); break;
        case "inactive": list = list.filter((u) => !isActiveRecently(u, THIRTY_DAYS_MS)); break;
      }
    }

    return list;
  }, [activeTab, categorizedUsers, usersInOrgs, orgRoleSubTab, search, healthFilter, activityFilter, orgFilter]);

  // Filtered creators (for freelancers tab) - uses creatorsExcludingBrandsAndOrgs as base
  const filteredCreators = useMemo(() => {
    let list = [...creatorsExcludingBrandsAndOrgs];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.username?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      list = list.filter((c) => c.categories?.includes(categoryFilter));
    }

    if (roleFilter !== "all") {
      list = list.filter((c) => c.marketplace_roles?.includes(roleFilter));
    }

    if (statusFilter === "active") {
      list = list.filter((c) => c.is_active);
    } else if (statusFilter === "inactive") {
      list = list.filter((c) => !c.is_active);
    } else if (statusFilter === "verified") {
      list = list.filter((c) => c.is_verified);
    }

    return list;
  }, [creatorsExcludingBrandsAndOrgs, search, categoryFilter, roleFilter, statusFilter]);

  // Handlers
  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val);
    setRoleFilter("all");
  };

  const handleSelectUser = (user: UserWithHealth) => {
    setSelectedCreator(null);
    setSelectedUser(selectedUser?.id === user.id ? null : user);
  };

  const handleSelectCreator = (creator: CreatorWithMetrics) => {
    setSelectedUser(null);
    setSelectedCreator(selectedCreator?.id === creator.id ? null : creator);
  };

  const handleUnlockUser = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.id) return;

    setUnlockingUserId(userId);
    try {
      const { error } = await (supabase as any).rpc('grant_platform_access', {
        p_admin_id: currentUser.id,
        p_target_user_id: userId,
      });

      if (error) throw error;

      toast.success('Acceso desbloqueado correctamente');
      refetch();
    } catch (err) {
      console.error('Error unlocking user:', err);
      toast.error('Error al desbloquear usuario');
    } finally {
      setUnlockingUserId(null);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as PeopleTab);
    setSearchParams({ tab });
    setSelectedUser(null);
    setSelectedCreator(null);
    setSearch("");
    // Reset filters
    setHealthFilter("all");
    setActivityFilter("all");
    setCategoryFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setOrgRoleSubTab("all");
    setOrgFilter("all");
  };

  const handleOrgRoleSubTabChange = (subTab: OrgRoleSubTab) => {
    setOrgRoleSubTab(subTab);
    setSelectedUser(null);
    setSearch("");
    setHealthFilter("all");
    setActivityFilter("all");
  };

  const isLoading = loadingUsers || loadingCreators;

  return (
    <div className="min-h-screen">
      <div className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
          {/* ========== HEADER ========== */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Personas</h1>
              <p className="text-white/60">Gestiona todos los usuarios de la plataforma</p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Buscar..."
                  className="w-64 bg-white/5 border-white/10 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* ========== TABS ========== */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="bg-white/5 border border-white/10 p-1">
              <TabsTrigger
                value="sin_rol"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white gap-2"
              >
                <UserCircle className="h-4 w-4" />
                Sin Rol
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-xs">
                  {tabCounts.sin_rol}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="clientes"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white gap-2"
              >
                <Building2 className="h-4 w-4" />
                Clientes / Marcas
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-xs">
                  {tabCounts.clientes}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="freelancers"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Freelancers
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-xs">
                  {tabCounts.freelancers}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="en_org"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white gap-2"
              >
                <Users className="h-4 w-4" />
                En Organizaciones
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-xs">
                  {tabCounts.en_org}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* ========== SUB-TABS FOR EN_ORG ========== */}
          {activeTab === "en_org" && (
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all", label: "Todos", icon: Users },
                { key: "admin", label: "Admins", icon: ShieldCheck },
                { key: "client", label: "Clientes", icon: Building2 },
                { key: "creator", label: "Creadores", icon: Video },
                { key: "editor", label: "Editores", icon: Star },
                { key: "strategist", label: "Estrategas", icon: Activity },
                { key: "other", label: "Otros", icon: UserCircle },
              ] as const).map(({ key, label, icon: SubIcon }) => (
                <Button
                  key={key}
                  variant={orgRoleSubTab === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleOrgRoleSubTabChange(key)}
                  className={cn(
                    "gap-1.5",
                    orgRoleSubTab === key
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70"
                  )}
                >
                  <SubIcon className="h-3.5 w-3.5" />
                  {label}
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
                    {orgSubTabCounts[key]}
                  </span>
                </Button>
              ))}
            </div>
          )}

          {/* ========== KPI CARDS ========== */}
          {stats.type === "users" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total" value={stats.total} icon={Users} color="purple" />
              <StatCard title="Activos" value={stats.active} subtitle="Últimos 7 días" icon={Activity} color="green" />
              <StatCard title="En Riesgo" value={stats.atRisk} subtitle="Health < 50" icon={AlertTriangle} color="yellow" />
              <StatCard title="Churned" value={stats.churned} subtitle="Sin actividad 30+ días" icon={UserMinus} color="red" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Freelancers" value={stats.total} icon={Video} color="pink" />
              <StatCard title="Activos" value={stats.active} subtitle="Perfil activo" icon={CheckCircle} color="green" />
              <StatCard title="Verificados" value={stats.verified} icon={BadgeCheck} color="blue" />
              <StatCard title="Nuevos" value={stats.recent} subtitle="Últimos 30 días" icon={UserPlus} color="purple" />
            </div>
          )}

          {/* ========== FILTERS ========== */}
          <div className="flex flex-wrap gap-3">
            {activeTab === "freelancers" ? (
              <>
                <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-48 bg-white/5 border-white/10">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {Object.entries(TALENT_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48 bg-white/5 border-white/10">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">Todos los roles</SelectItem>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {SPECIFIC_ROLE_LABELS[role as SpecificRole] || role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/10">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                    <SelectItem value="verified">Verificados</SelectItem>
                  </SelectContent>
                </Select>

                <div className="ml-auto text-sm text-white/40 self-center">
                  {filteredCreators.length} freelancers
                </div>
              </>
            ) : (
              <>
                {/* Organization filter - only shown in en_org tab */}
                {activeTab === "en_org" && uniqueOrganizations.length > 0 && (
                  <Select value={orgFilter} onValueChange={setOrgFilter}>
                    <SelectTrigger className="w-56 bg-white/5 border-white/10">
                      <Building2 className="w-4 h-4 mr-2 text-white/50" />
                      <SelectValue placeholder="Organización" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">Todas las organizaciones</SelectItem>
                      {uniqueOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={healthFilter} onValueChange={setHealthFilter}>
                  <SelectTrigger className="w-48 bg-white/5 border-white/10">
                    <SelectValue placeholder="Estado de salud" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="healthy">Saludable (70+)</SelectItem>
                    <SelectItem value="at_risk">En riesgo (40-70)</SelectItem>
                    <SelectItem value="churning">Abandonando (&lt; 40)</SelectItem>
                    <SelectItem value="churned">Abandonado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-48 bg-white/5 border-white/10">
                    <SelectValue placeholder="Actividad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                    <SelectItem value="inactive">Inactivos (30+ días)</SelectItem>
                  </SelectContent>
                </Select>

                <div className="ml-auto text-sm text-white/40 self-center">
                  {filteredUsers.length} usuarios
                </div>
              </>
            )}
          </div>

          {/* ========== LOADING ========== */}
          {isLoading && (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/40">Cargando...</p>
            </div>
          )}

          {/* ========== CONTENT - USERS (sin_rol, clientes & en_org) ========== */}
          {!isLoading && activeTab !== "freelancers" && (
            <>
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-10 w-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/40">
                    {search || healthFilter !== "all" || activityFilter !== "all"
                      ? "Sin resultados para los filtros aplicados"
                      : activeTab === "sin_rol"
                        ? "No hay usuarios sin rol asignado"
                        : activeTab === "en_org"
                          ? "No hay usuarios en organizaciones con este rol"
                          : "No hay clientes registrados"}
                  </p>
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredUsers.map((user) => {
                    const hc = getHealthColor(user.health_score);
                    const status = (user.health_status || "healthy") as HealthStatus;
                    return (
                      <Card
                        key={user.id}
                        className={cn(
                          "p-4 cursor-pointer hover:border-[#8b5cf6]/40 transition-all",
                          selectedUser?.id === user.id && "border-[#8b5cf6]/60 bg-[#8b5cf6]/5",
                        )}
                        onClick={() => handleSelectUser(user)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {hasValidAvatar(user.avatar_url) ? (
                            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-medium">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate">{user.full_name || "Sin nombre"}</p>
                            <p className="text-white/40 text-xs truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", getUserTypeColor(user.user_type))}>
                              {getUserTypeLabel(user.user_type)}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", HEALTH_STATUS_COLORS[status])}>
                              {HEALTH_STATUS_LABELS[status]}
                            </span>
                          </div>
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold", hc.bg, hc.text)}>
                            {user.health_score}
                          </div>
                        </div>
                        {user.organization_name && (
                          <p className="text-[10px] text-white/30 mt-2 truncate">{user.organization_name}</p>
                        )}

                        {/* Fechas */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-[10px] text-white/40">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(user.created_at), "d MMM yy", { locale: es })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {user.last_login_at
                              ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true, locale: es })
                              : "Nunca"}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-1">
                  {filteredUsers.map((user) => {
                    const hc = getHealthColor(user.health_score);
                    const status = (user.health_status || "healthy") as HealthStatus;
                    return (
                      <div
                        key={user.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors",
                          selectedUser?.id === user.id && "bg-[#8b5cf6]/10 border border-[#8b5cf6]/30",
                        )}
                        onClick={() => handleSelectUser(user)}
                      >
                        {hasValidAvatar(user.avatar_url) ? (
                          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-medium">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">{user.full_name || "Sin nombre"}</p>
                        </div>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium hidden sm:inline", getUserTypeColor(user.user_type))}>
                          {getUserTypeLabel(user.user_type)}
                        </span>
                        <span className="text-[10px] text-white/30 hidden lg:inline">
                          {user.last_login_at
                            ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true, locale: es })
                            : "Nunca"}
                        </span>
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold", hc.bg, hc.text)}>
                          {user.health_score}
                        </div>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", HEALTH_STATUS_COLORS[status])}>
                          {HEALTH_STATUS_LABELS[status]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/70">Usuario</TableHead>
                        <TableHead className="text-white/70">Tipo</TableHead>
                        <TableHead className="text-white/70 hidden md:table-cell">Organización</TableHead>
                        <TableHead className="text-white/70">Health Score</TableHead>
                        <TableHead className="text-white/70 hidden lg:table-cell">Registro</TableHead>
                        <TableHead className="text-white/70 hidden lg:table-cell">Últ. Login</TableHead>
                        <TableHead className="text-white/70">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const hc = getHealthColor(user.health_score);
                        const status = (user.health_status || "healthy") as HealthStatus;
                        return (
                          <TableRow
                            key={user.id}
                            className={cn(
                              "border-white/10 hover:bg-white/5 cursor-pointer",
                              selectedUser?.id === user.id && "bg-[#8b5cf6]/10",
                            )}
                            onClick={() => handleSelectUser(user)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {hasValidAvatar(user.avatar_url) ? (
                                  <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-medium">
                                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-white font-medium truncate">{user.full_name || "Sin nombre"}</p>
                                  <p className="text-white/40 text-xs truncate">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={cn("px-2 py-1 rounded-full text-xs", getUserTypeColor(user.user_type))}>
                                {getUserTypeLabel(user.user_type)}
                              </span>
                            </TableCell>
                            <TableCell className="text-white/70 hidden md:table-cell">{user.organization_name || "—"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", hc.bg, hc.text)}>
                                  {user.health_score}
                                </div>
                                <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", hc.bar)} style={{ width: `${Math.min(user.health_score, 100)}%` }} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/50 text-sm hidden lg:table-cell">
                              {format(new Date(user.created_at), "d MMM yyyy", { locale: es })}
                            </TableCell>
                            <TableCell className="text-white/50 hidden lg:table-cell">
                              {user.last_login_at
                                ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true, locale: es })
                                : "Nunca"}
                            </TableCell>
                            <TableCell>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px]", HEALTH_STATUS_COLORS[status])}>
                                {HEALTH_STATUS_LABELS[status]}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          )}

          {/* ========== CONTENT - FREELANCERS ========== */}
          {!isLoading && activeTab === "freelancers" && (
            <>
              {filteredCreators.length === 0 ? (
                <div className="p-12 text-center">
                  <Video className="h-10 w-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/40">
                    {search || categoryFilter !== "all" || roleFilter !== "all" || statusFilter !== "all"
                      ? "Sin resultados para los filtros aplicados"
                      : "Aún no hay freelancers registrados"}
                  </p>
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredCreators.map((creator) => {
                    const category = getPrimaryCategory(creator);
                    const role = getPrimaryRole(creator);
                    return (
                      <Card
                        key={creator.id}
                        onClick={() => handleSelectCreator(creator)}
                        className={cn(
                          "p-4 hover:bg-white/10 transition-colors cursor-pointer",
                          selectedCreator?.id === creator.id && "ring-1 ring-[#8b5cf6] bg-white/10"
                        )}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="relative shrink-0">
                            {hasValidAvatar(creator.avatar_url) ? (
                              <img src={creator.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300 text-lg">
                                {creator.full_name?.charAt(0) || "?"}
                              </div>
                            )}
                            {creator.is_verified && (
                              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                                <BadgeCheck className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{creator.full_name}</p>
                            <p className="text-white/50 text-sm truncate">
                              {creator.username ? `@${creator.username}` : creator.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {category && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full", TALENT_CATEGORY_COLORS[category])}>
                              {TALENT_CATEGORY_LABELS[category]}
                            </span>
                          )}
                          {role && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                              {SPECIFIC_ROLE_LABELS[role]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{creator.rating_avg > 0 ? creator.rating_avg.toFixed(1) : "N/A"}</span>
                          </div>
                          <span className="text-white/50">{creator.completed_projects} proyectos</span>
                        </div>

                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-green-400">{formatCurrency(creator.total_earned)}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs",
                            creator.is_active ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"
                          )}>
                            {creator.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        {/* Fecha de registro */}
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5 text-xs text-white/40">
                          <Calendar className="w-3 h-3" />
                          <span>Registro: {format(new Date(creator.created_at), "d MMM yyyy", { locale: es })}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-1.5">
                  {filteredCreators.map((creator) => {
                    const category = getPrimaryCategory(creator);
                    return (
                      <div
                        key={creator.id}
                        onClick={() => handleSelectCreator(creator)}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent",
                          selectedCreator?.id === creator.id && "bg-[#8b5cf6]/10 border-[#8b5cf6]/30"
                        )}
                      >
                        <div className="relative shrink-0">
                          {hasValidAvatar(creator.avatar_url) ? (
                            <img src={creator.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300 text-sm">
                              {creator.full_name?.charAt(0) || "?"}
                            </div>
                          )}
                          {creator.is_verified && (
                            <BadgeCheck className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{creator.full_name}</p>
                          <p className="text-xs text-white/40 truncate">{creator.email}</p>
                        </div>
                        {category && (
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full hidden sm:inline-flex", TALENT_CATEGORY_COLORS[category])}>
                            {TALENT_CATEGORY_LABELS[category]}
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-yellow-400 text-xs">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {creator.rating_avg > 0 ? creator.rating_avg.toFixed(1) : "—"}
                        </div>
                        <span className="text-xs text-white/50 hidden md:inline">{creator.completed_projects} proy.</span>
                        <span className="text-[10px] text-white/30 hidden lg:inline">
                          {format(new Date(creator.created_at), "d MMM yy", { locale: es })}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px]",
                          creator.is_active ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"
                        )}>
                          {creator.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/70">Freelancer</TableHead>
                        <TableHead className="text-white/70">Categoría</TableHead>
                        <TableHead className="text-white/70 hidden md:table-cell">Rol</TableHead>
                        <TableHead className="text-white/70">Rating</TableHead>
                        <TableHead className="text-white/70 hidden md:table-cell">Proyectos</TableHead>
                        <TableHead className="text-white/70 hidden lg:table-cell">Ganado</TableHead>
                        <TableHead className="text-white/70 hidden lg:table-cell">Registro</TableHead>
                        <TableHead className="text-white/70">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCreators.map((creator) => {
                        const category = getPrimaryCategory(creator);
                        const role = getPrimaryRole(creator);
                        return (
                          <TableRow
                            key={creator.id}
                            onClick={() => handleSelectCreator(creator)}
                            className={cn(
                              "border-white/10 hover:bg-white/5 cursor-pointer",
                              selectedCreator?.id === creator.id && "bg-[#8b5cf6]/10"
                            )}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  {hasValidAvatar(creator.avatar_url) ? (
                                    <img src={creator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300">
                                      {creator.full_name?.charAt(0) || "?"}
                                    </div>
                                  )}
                                  {creator.is_verified && (
                                    <BadgeCheck className="absolute -bottom-1 -right-1 w-4 h-4 text-blue-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-medium truncate">{creator.full_name}</p>
                                  <p className="text-white/50 text-sm truncate">{creator.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {category ? (
                                <span className={cn("text-xs px-2 py-1 rounded-full", TALENT_CATEGORY_COLORS[category])}>
                                  {TALENT_CATEGORY_LABELS[category]}
                                </span>
                              ) : (
                                <span className="text-white/30 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-white/70 hidden md:table-cell">
                              {role ? SPECIFIC_ROLE_LABELS[role] : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-yellow-400">
                                <Star className="w-4 h-4 fill-current" />
                                {creator.rating_avg > 0 ? creator.rating_avg.toFixed(1) : "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-white hidden md:table-cell">{creator.completed_projects}</TableCell>
                            <TableCell className="text-green-400 hidden lg:table-cell">{formatCurrency(creator.total_earned)}</TableCell>
                            <TableCell className="text-white/50 text-sm hidden lg:table-cell">
                              {format(new Date(creator.created_at), "d MMM yyyy", { locale: es })}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs",
                                creator.is_active ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"
                              )}>
                                {creator.is_active ? "Activo" : "Inactivo"}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========== DETAIL DIALOGS ========== */}
      {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedUser(null);
          }}
          onUpdate={async () => {
            const result = await refetch();
            if (result.data && selectedUser) {
              const fresh = result.data.find((u: UserWithHealth) => u.id === selectedUser.id);
              if (fresh) setSelectedUser(fresh);
            }
          }}
        />
      )}

      {selectedCreator && (
        <UnifiedTalentDetailDialog
          creator={selectedCreator}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedCreator(null);
          }}
          onUpdate={async () => {
            const result = await refetchCreators();
            if (result.data && selectedCreator) {
              const fresh = result.data.find((c: CreatorWithMetrics) => c.id === selectedCreator.id);
              if (fresh) setSelectedCreator(fresh);
            }
          }}
        />
      )}
    </div>
  );
};

export default PlatformCRMPeople;
