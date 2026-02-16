import { useState, useMemo } from "react";
import {
  Users,
  Activity,
  AlertTriangle,
  UserMinus,
  MoreHorizontal,
  Search,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useUsersWithHealth,
  useUsersNeedingAttention,
  useRecalculateHealthScore,
} from "@/hooks/useCrm";
import {
  HEALTH_STATUS_LABELS,
  HEALTH_STATUS_COLORS,
} from "@/types/crm.types";
import type { HealthStatus } from "@/types/crm.types";
import type { UserWithHealth } from "@/services/crm/platformCrmService";

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
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            c.iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", c.text)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/50">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>
          )}
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
    creator: "Creador",
    brand: "Marca",
    team_leader: "Team Leader",
    strategist: "Estratega",
    editor: "Editor",
    client: "Cliente",
    trafficker: "Trafficker",
  };
  return labels[role] || role;
};

const getRoleColor = (role: string | null) => {
  if (!role) return "bg-white/10 text-white/50";
  const colors: Record<string, string> = {
    admin: "bg-purple-500/20 text-purple-300",
    creator: "bg-pink-500/20 text-pink-300",
    brand: "bg-blue-500/20 text-blue-300",
    team_leader: "bg-green-500/20 text-green-300",
    strategist: "bg-yellow-500/20 text-yellow-300",
    editor: "bg-orange-500/20 text-orange-300",
    client: "bg-cyan-500/20 text-cyan-300",
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
  const { data: users = [], isLoading } = useUsersWithHealth();
  const { data: usersNeedingAttention = [] } = useUsersNeedingAttention();
  const recalcMutation = useRecalculateHealthScore();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");

  // Derive stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => isActiveRecently(u, SEVEN_DAYS_MS)).length;
    const atRisk = users.filter((u) => u.health_score < 50).length;
    const churned = users.filter(
      (u) =>
        !u.last_login_at ||
        Date.now() - new Date(u.last_login_at).getTime() > THIRTY_DAYS_MS
    ).length;
    return { total, active, atRisk, churned };
  }, [users]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...users];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.organization_name?.toLowerCase().includes(q)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }

    // Health filter
    if (healthFilter !== "all") {
      switch (healthFilter) {
        case "healthy":
          list = list.filter((u) => u.health_score >= 70);
          break;
        case "at_risk":
          list = list.filter((u) => u.health_score >= 40 && u.health_score < 70);
          break;
        case "churning":
          list = list.filter((u) => u.health_score > 0 && u.health_score < 40);
          break;
        case "churned":
          list = list.filter((u) => (u.health_status as string) === "churned");
          break;
      }
    }

    // Activity filter
    if (activityFilter !== "all") {
      const now = Date.now();
      switch (activityFilter) {
        case "today":
          list = list.filter(
            (u) =>
              u.last_login_at &&
              now - new Date(u.last_login_at).getTime() < 24 * 60 * 60 * 1000
          );
          break;
        case "week":
          list = list.filter((u) => isActiveRecently(u, SEVEN_DAYS_MS));
          break;
        case "month":
          list = list.filter((u) => isActiveRecently(u, THIRTY_DAYS_MS));
          break;
        case "inactive":
          list = list.filter((u) => !isActiveRecently(u, THIRTY_DAYS_MS));
          break;
      }
    }

    return list;
  }, [users, search, roleFilter, healthFilter, activityFilter]);

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-8">
        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Usuarios</h1>
            <p className="text-white/60">
              Todos los usuarios registrados en la plataforma
            </p>
          </div>
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

        {/* ========== KPI CARDS ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Usuarios"
            value={stats.total}
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Activos"
            value={stats.active}
            subtitle="Actividad últimos 7 días"
            icon={Activity}
            color="green"
          />
          <StatCard
            title="En Riesgo"
            value={stats.atRisk}
            subtitle="Health score < 50"
            icon={AlertTriangle}
            color="yellow"
          />
          <StatCard
            title="Churned"
            value={stats.churned}
            subtitle="Sin actividad 30+ días"
            icon={UserMinus}
            color="red"
          />
        </div>

        {/* ========== ATTENTION PANEL ========== */}
        {usersNeedingAttention.length > 0 && (
          <Card className="!bg-red-500/5 !border-red-500/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-semibold">
                Requieren Atención Inmediata
              </h3>
            </div>
            <div className="space-y-2">
              {usersNeedingAttention.slice(0, 5).map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold">
                      {user.health_score}
                    </div>
                    <div>
                      <p className="text-white text-sm">
                        {user.full_name || "Sin nombre"}
                      </p>
                      <p className="text-white/40 text-xs">
                        {user.days_since_last_activity != null
                          ? `${user.days_since_last_activity} días inactivo`
                          : "Sin actividad registrada"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    disabled
                  >
                    Contactar
                  </Button>
                </div>
              ))}
              {usersNeedingAttention.length > 5 && (
                <p className="text-xs text-white/30 text-center pt-1">
                  +{usersNeedingAttention.length - 5} más
                </p>
              )}
            </div>
          </Card>
        )}

        {/* ========== FILTERS ========== */}
        <div className="flex flex-wrap gap-3">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10">
              <SelectValue placeholder="Rol en plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="creator">Creador</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="client">Cliente</SelectItem>
              <SelectItem value="team_leader">Team Leader</SelectItem>
              <SelectItem value="strategist">Estratega</SelectItem>
              <SelectItem value="trafficker">Trafficker</SelectItem>
            </SelectContent>
          </Select>

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
            {filtered.length} usuarios
          </div>
        </div>

        {/* ========== TABLE ========== */}
        <Card>
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">Usuario</TableHead>
                  <TableHead className="text-white/70">Rol</TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">
                    Organización
                  </TableHead>
                  <TableHead className="text-white/70">Health Score</TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">
                    Logins
                  </TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">
                    Acciones
                  </TableHead>
                  <TableHead className="text-white/70 hidden lg:table-cell">
                    Últ. Login
                  </TableHead>
                  <TableHead className="text-white/70">Estado</TableHead>
                  <TableHead className="text-white/70 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const hc = getHealthColor(user.health_score);
                  const status = (user.health_status || "healthy") as HealthStatus;
                  return (
                    <TableRow
                      key={user.id}
                      className="border-white/10 hover:bg-white/5"
                    >
                      {/* User */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-medium">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">
                              {user.full_name || "Sin nombre"}
                            </p>
                            <p className="text-white/40 text-xs truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs",
                            getRoleColor(user.role)
                          )}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </TableCell>

                      {/* Organization */}
                      <TableCell className="text-white/70 hidden md:table-cell">
                        {user.organization_name || "\u2014"}
                      </TableCell>

                      {/* Health Score */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                              hc.bg,
                              hc.text
                            )}
                          >
                            {user.health_score}
                          </div>
                          <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", hc.bar)}
                              style={{
                                width: `${Math.min(user.health_score, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Logins */}
                      <TableCell className="text-white hidden md:table-cell">
                        {user.total_logins}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-white hidden md:table-cell">
                        {user.total_actions}
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="text-white/50 hidden lg:table-cell">
                        {user.last_login_at
                          ? formatDistanceToNow(
                              new Date(user.last_login_at),
                              { addSuffix: true, locale: es }
                            )
                          : "Nunca"}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs",
                            HEALTH_STATUS_COLORS[status] ||
                              "bg-white/10 text-white/50"
                          )}
                        >
                          {HEALTH_STATUS_LABELS[status] || status}
                        </span>
                      </TableCell>

                      {/* Actions menu */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>
                              Ver perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              Ver actividad
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              Enviar mensaje
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                recalcMutation.mutate(user.id)
                              }
                            >
                              Recalcular health
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PlatformCRMUsers;
