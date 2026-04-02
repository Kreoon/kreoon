import { useState, useMemo } from "react";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/hooks/useCrm";
import {
  HEALTH_STATUS_LABELS,
  HEALTH_STATUS_COLORS,
} from "@/types/crm.types";
import type { HealthStatus } from "@/types/crm.types";
import type { UserWithHealth } from "@/services/crm/platformCrmService";
import { ViewModeToggle, UnifiedTalentDetailDialog } from "@/components/crm";
import type { ViewMode } from "@/components/crm";

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
        <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center", c.iconBg)}>
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

const getRoleLabel = (role: string | null) => {
  if (!role) return "Sin rol";
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

const getRoleColor = (role: string | null) => {
  if (!role) return "bg-white/10 text-white/50";
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

// =====================================================
// MAIN COMPONENT
// =====================================================

const PlatformCRMUsers = () => {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading, refetch } = useUsersWithHealth();
  const { data: usersNeedingAttention = [] } = useUsersNeedingAttention();

  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<'all' | 'admins' | 'no_org' | 'no_profile' | 'unconfirmed' | 'banned' | 'pending_keys'>('all');
  const [unlockingUserId, setUnlockingUserId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedUser, setSelectedUser] = useState<UserWithHealth | null>(null);

  // Quick filter counts
  const quickCounts = useMemo(() => ({
    all: users.length,
    admins: users.filter(u => u.is_platform_admin).length,
    no_org: users.filter(u => !u.organization_id).length,
    no_profile: users.filter(u => !u.has_profile).length,
    unconfirmed: users.filter(u => !u.email_confirmed_at).length,
    banned: users.filter(u => u.is_banned).length,
    pending_keys: users.filter(u => !u.platform_access_unlocked && u.user_type === 'talent').length,
  }), [users]);

  // Derive stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => isActiveRecently(u, SEVEN_DAYS_MS)).length;
    const atRisk = users.filter((u) => u.health_score < 50).length;
    const churned = users.filter(
      (u) => !u.last_login_at || Date.now() - new Date(u.last_login_at).getTime() > THIRTY_DAYS_MS
    ).length;
    return { total, active, atRisk, churned };
  }, [users]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...users];

    // Quick filter
    switch (quickFilter) {
      case 'admins': list = list.filter(u => u.is_platform_admin); break;
      case 'no_org': list = list.filter(u => !u.organization_id); break;
      case 'no_profile': list = list.filter(u => !u.has_profile); break;
      case 'unconfirmed': list = list.filter(u => !u.email_confirmed_at); break;
      case 'banned': list = list.filter(u => u.is_banned); break;
      case 'pending_keys': list = list.filter(u => !u.platform_access_unlocked && u.user_type === 'talent'); break;
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
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
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
  }, [users, quickFilter, search, roleFilter, healthFilter, activityFilter]);

  const handleSelectUser = (user: UserWithHealth) => {
    setSelectedUser(selectedUser?.id === user.id ? null : user);
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

  return (
    <div className="min-h-screen flex">
      <div className="flex-1">
        <div className="p-4 md:p-6 space-y-8">
          {/* ========== HEADER ========== */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Usuarios</h1>
              <p className="text-white/60">Todos los usuarios registrados en la plataforma</p>
            </div>
            <div className="flex gap-3 items-center">
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Buscar usuario..."
                  className="w-64 bg-white/5 border-white/10 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ========== KPI CARDS ========== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Usuarios" value={stats.total} icon={Users} color="purple" />
            <StatCard title="Activos" value={stats.active} subtitle="Actividad últimos 7 días" icon={Activity} color="green" />
            <StatCard title="En Riesgo" value={stats.atRisk} subtitle="Health score < 50" icon={AlertTriangle} color="yellow" />
            <StatCard title="Churned" value={stats.churned} subtitle="Sin actividad 30+ días" icon={UserMinus} color="red" />
          </div>

          {/* ========== ATTENTION PANEL ========== */}
          {usersNeedingAttention.length > 0 && (
            <Card className="!bg-red-500/5 !border-red-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-semibold">Requieren Atención Inmediata</h3>
              </div>
              <div className="space-y-2">
                {usersNeedingAttention.slice(0, 5).map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-2 bg-white/5 rounded-sm cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => {
                      const found = users.find((u) => u.id === user.user_id);
                      if (found) handleSelectUser(found);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold">
                        {user.health_score}
                      </div>
                      <div>
                        <p className="text-white text-sm">{user.full_name || "Sin nombre"}</p>
                        <p className="text-white/40 text-xs">
                          {user.days_since_last_activity != null
                            ? `${user.days_since_last_activity} días inactivo`
                            : "Sin actividad registrada"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {usersNeedingAttention.length > 5 && (
                  <p className="text-xs text-white/30 text-center pt-1">+{usersNeedingAttention.length - 5} más</p>
                )}
              </div>
            </Card>
          )}

          {/* ========== QUICK FILTER TABS ========== */}
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'all' as const, label: 'Todos', icon: Users },
              { key: 'pending_keys' as const, label: 'Pendientes llaves', icon: KeyRound },
              { key: 'admins' as const, label: 'Admins', icon: ShieldCheck },
              { key: 'no_org' as const, label: 'Sin org', icon: Building2 },
              { key: 'no_profile' as const, label: 'Sin perfil', icon: UserX },
              { key: 'unconfirmed' as const, label: 'Sin confirmar', icon: MailX },
              { key: 'banned' as const, label: 'Bloqueados', icon: Ban },
            ]).map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                onClick={() => setQuickFilter(key)}
                className={cn(
                  'h-8 gap-1.5 text-xs rounded-full border transition-all',
                  quickFilter === key
                    ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/50 text-[#c084fc]'
                    : 'border-white/10 text-white/50 hover:text-white/70 hover:border-white/20',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className={cn(
                  'ml-0.5 text-[10px] px-1.5 py-0 rounded-full',
                  quickFilter === key ? 'bg-[#8b5cf6]/30 text-[#c084fc]' : 'bg-white/5 text-white/30',
                )}>
                  {quickCounts[key]}
                </span>
              </Button>
            ))}
          </div>

          {/* ========== FILTERS ========== */}
          <div className="flex flex-wrap gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10"><SelectValue placeholder="Rol en plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="team_leader">Team Leader</SelectItem>
                <SelectItem value="creator">Creador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="strategist">Estratega</SelectItem>
                <SelectItem value="developer">Desarrollador</SelectItem>
                <SelectItem value="educator">Educador</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={healthFilter} onValueChange={setHealthFilter}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10"><SelectValue placeholder="Estado de salud" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="healthy">Saludable (70+)</SelectItem>
                <SelectItem value="at_risk">En riesgo (40-70)</SelectItem>
                <SelectItem value="churning">Abandonando (&lt; 40)</SelectItem>
                <SelectItem value="churned">Abandonado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10"><SelectValue placeholder="Actividad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="inactive">Inactivos (30+ días)</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-white/40 self-center">{filtered.length} usuarios</div>
          </div>

          {/* ========== CONTENT ========== */}
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/40">Cargando usuarios...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/40">
                {search || roleFilter !== "all" || healthFilter !== "all" || activityFilter !== "all"
                  ? "Sin resultados para los filtros aplicados"
                  : "Aún no hay usuarios registrados"}
              </p>
            </div>
          ) : viewMode === "cards" ? (
            /* ---- CARDS VIEW ---- */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((user) => {
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
                      {user.avatar_url ? (
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
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", getRoleColor(user.role))}>
                          {getRoleLabel(user.role)}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", HEALTH_STATUS_COLORS[status])}>
                          {HEALTH_STATUS_LABELS[status]}
                        </span>
                        {/* Key status badge */}
                        {user.user_type === 'talent' && !user.platform_access_unlocked && (
                          <button
                            onClick={(e) => handleUnlockUser(user.id, e)}
                            disabled={unlockingUserId === user.id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {unlockingUserId === user.id ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <Key className="h-2.5 w-2.5" />
                            )}
                            Dar llave
                          </button>
                        )}
                        {user.user_type === 'talent' && user.platform_access_unlocked && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                            <Unlock className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold", hc.bg, hc.text)}>
                        {user.health_score}
                      </div>
                    </div>
                    {user.organization_name && (
                      <p className="text-[10px] text-white/30 mt-2 truncate">{user.organization_name}</p>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : viewMode === "list" ? (
            /* ---- LIST VIEW ---- */
            <div className="space-y-1">
              {filtered.map((user) => {
                const hc = getHealthColor(user.health_score);
                const status = (user.health_status || "healthy") as HealthStatus;
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-sm hover:bg-white/5 cursor-pointer transition-colors",
                      selectedUser?.id === user.id && "bg-[#8b5cf6]/10 border border-[#8b5cf6]/30",
                    )}
                    onClick={() => handleSelectUser(user)}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-medium">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{user.full_name || "Sin nombre"}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium hidden sm:inline", getRoleColor(user.role))}>
                      {getRoleLabel(user.role)}
                    </span>
                    {/* Key status in list view */}
                    {user.user_type === 'talent' && !user.platform_access_unlocked && (
                      <button
                        onClick={(e) => handleUnlockUser(user.id, e)}
                        disabled={unlockingUserId === user.id}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {unlockingUserId === user.id ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Key className="h-2.5 w-2.5" />
                        )}
                        Llave
                      </button>
                    )}
                    {user.user_type === 'talent' && user.platform_access_unlocked && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                        <Unlock className="h-2.5 w-2.5" />
                      </span>
                    )}
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
            /* ---- TABLE VIEW ---- */
            <Card>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/70">Usuario</TableHead>
                    <TableHead className="text-white/70">Rol</TableHead>
                    <TableHead className="text-white/70 hidden md:table-cell">Organización</TableHead>
                    <TableHead className="text-white/70">Health Score</TableHead>
                    <TableHead className="text-white/70 hidden md:table-cell">Logins</TableHead>
                    <TableHead className="text-white/70 hidden md:table-cell">Acciones</TableHead>
                    <TableHead className="text-white/70 hidden lg:table-cell">Últ. Login</TableHead>
                    <TableHead className="text-white/70">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => {
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
                            {user.avatar_url ? (
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
                          <span className={cn("px-2 py-1 rounded-full text-xs", getRoleColor(user.role))}>
                            {getRoleLabel(user.role)}
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
                        <TableCell className="text-white hidden md:table-cell">{user.total_logins}</TableCell>
                        <TableCell className="text-white hidden md:table-cell">{user.total_actions}</TableCell>
                        <TableCell className="text-white/50 hidden lg:table-cell">
                          {user.last_login_at
                            ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true, locale: es })
                            : "Nunca"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", HEALTH_STATUS_COLORS[status] || "bg-white/10 text-white/50")}>
                              {HEALTH_STATUS_LABELS[status] || status}
                            </span>
                            {user.is_platform_admin && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400">Admin</span>
                            )}
                            {user.is_banned && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600/20 text-red-500">Bloqueado</span>
                            )}
                            {!user.has_profile && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400">Sin perfil</span>
                            )}
                            {!user.email_confirmed_at && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400">Sin confirmar</span>
                            )}
                            {/* Referral/key status */}
                            {user.user_type === 'talent' && (
                              user.platform_access_unlocked ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                  <Unlock className="h-2.5 w-2.5" />
                                  Desbloqueado
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => handleUnlockUser(user.id, e)}
                                  disabled={unlockingUserId === user.id}
                                  className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {unlockingUserId === user.id ? (
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  ) : (
                                    <Key className="h-2.5 w-2.5" />
                                  )}
                                  Dar llave
                                </button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      {/* ========== DETAIL DIALOG ========== */}
      <UnifiedTalentDetailDialog
        user={selectedUser ?? undefined}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        onUpdate={async () => {
          const result = await refetch();
          if (result.data && selectedUser) {
            const fresh = result.data.find((u: UserWithHealth) => u.id === selectedUser.id);
            if (fresh) setSelectedUser(fresh);
          }
        }}
      />
    </div>
  );
};

export default PlatformCRMUsers;
