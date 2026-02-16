import { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  CheckCircle,
  AlertTriangle,
  Crown,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
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
import { useOrganizationsWithMetrics } from "@/hooks/useCrm";
import type { OrganizationWithMetrics } from "@/services/crm/platformCrmService";

// =====================================================
// STAT CARD
// =====================================================

type StatColor = "purple" | "pink" | "blue" | "green" | "yellow" | "orange";

const COLOR_MAP: Record<StatColor, { text: string; iconBg: string }> = {
  purple: { text: "text-purple-400", iconBg: "bg-purple-500/20" },
  pink: { text: "text-pink-400", iconBg: "bg-pink-500/20" },
  blue: { text: "text-blue-400", iconBg: "bg-blue-500/20" },
  green: { text: "text-emerald-400", iconBg: "bg-emerald-500/20" },
  yellow: { text: "text-yellow-400", iconBg: "bg-yellow-500/20" },
  orange: { text: "text-orange-400", iconBg: "bg-orange-500/20" },
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getOrgStatus(org: OrganizationWithMetrics): "active" | "inactive" | "new" {
  if (!org.last_activity_at) return "inactive";
  const diff = Date.now() - new Date(org.last_activity_at).getTime();
  if (diff < THIRTY_DAYS_MS) return "active";
  return "inactive";
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  active: { label: "Activa", class: "bg-green-500/20 text-green-300" },
  inactive: { label: "Inactiva", class: "bg-yellow-500/20 text-yellow-300" },
  new: { label: "Nueva", class: "bg-blue-500/20 text-blue-300" },
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const PlatformCRMOrganizations = () => {
  const { data: organizations = [], isLoading } = useOrganizationsWithMetrics();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");

  // Derive stats
  const stats = useMemo(() => {
    const total = organizations.length;
    const active = organizations.filter(
      (o) => getOrgStatus(o) === "active"
    ).length;
    const atRisk = organizations.filter(
      (o) => getOrgStatus(o) === "inactive"
    ).length;
    const withCreators = organizations.filter(
      (o) => o.creator_count > 0
    ).length;
    return { total, active, atRisk, withCreators };
  }, [organizations]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...organizations];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.slug.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((o) => getOrgStatus(o) === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case "created_asc":
        list.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "members_desc":
        list.sort((a, b) => b.member_count - a.member_count);
        break;
      case "content_desc":
        list.sort((a, b) => b.content_count - a.content_count);
        break;
      case "created_desc":
      default:
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    return list;
  }, [organizations, search, statusFilter, sortBy]);

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-8">
        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Organizaciones</h1>
            <p className="text-white/60">
              Todas las organizaciones del ecosistema Kreoon
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar organizaci\u00f3n..."
                className="w-64 bg-white/5 border-white/10 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700" disabled>
              <Plus className="w-4 h-4 mr-2" /> Nueva Org
            </Button>
          </div>
        </div>

        {/* ========== KPI CARDS ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Organizaciones"
            value={stats.total}
            icon={Building2}
            color="purple"
          />
          <StatCard
            title="Activas"
            value={stats.active}
            subtitle="Con actividad este mes"
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Inactivas"
            value={stats.atRisk}
            subtitle="Sin actividad 30+ d\u00edas"
            icon={AlertTriangle}
            color="yellow"
          />
          <StatCard
            title="Con Creadores"
            value={stats.withCreators}
            subtitle="Relaciones activas"
            icon={Crown}
            color="pink"
          />
        </div>

        {/* ========== FILTERS ========== */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-white/5 border-white/10">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">M\u00e1s recientes</SelectItem>
              <SelectItem value="created_asc">M\u00e1s antiguas</SelectItem>
              <SelectItem value="members_desc">M\u00e1s miembros</SelectItem>
              <SelectItem value="content_desc">M\u00e1s contenidos</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto text-sm text-white/40 self-center">
            {filtered.length} organizaciones
          </div>
        </div>

        {/* ========== TABLE ========== */}
        <Card>
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/40">Cargando organizaciones...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/40">
                {search || statusFilter !== "all"
                  ? "Sin resultados para los filtros aplicados"
                  : "A\u00fan no hay organizaciones"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">
                    Organizaci\u00f3n
                  </TableHead>
                  <TableHead className="text-white/70">Miembros</TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">
                    Creadores
                  </TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">
                    Contenidos
                  </TableHead>
                  <TableHead className="text-white/70 hidden lg:table-cell">
                    Gastado
                  </TableHead>
                  <TableHead className="text-white/70 hidden lg:table-cell">
                    \u00dalt. Actividad
                  </TableHead>
                  <TableHead className="text-white/70">Estado</TableHead>
                  <TableHead className="text-white/70 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((org) => {
                  const status = getOrgStatus(org);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <TableRow
                      key={org.id}
                      className="border-white/10 hover:bg-white/5 cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                            {org.logo_url ? (
                              <img
                                src={org.logo_url}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-purple-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">
                              {org.name}
                            </p>
                            <p className="text-white/40 text-xs truncate">
                              {org.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        {org.member_count}
                      </TableCell>
                      <TableCell className="text-white hidden md:table-cell">
                        {org.creator_count}
                      </TableCell>
                      <TableCell className="text-white hidden md:table-cell">
                        {org.content_count}
                      </TableCell>
                      <TableCell className="text-green-400 hidden lg:table-cell">
                        {formatCurrency(org.total_spent)}
                      </TableCell>
                      <TableCell className="text-white/50 hidden lg:table-cell">
                        {org.last_activity_at
                          ? formatDistanceToNow(new Date(org.last_activity_at), {
                              addSuffix: true,
                              locale: es,
                            })
                          : "\u2014"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs",
                            cfg.class
                          )}
                        >
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/crm/organizaciones/${org.id}`}>
                                Ver detalle
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              Ver miembros
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-400"
                              disabled
                            >
                              Suspender
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

export default PlatformCRMOrganizations;
