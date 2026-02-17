import { useState, useMemo } from "react";
import {
  Video,
  CheckCircle,
  BadgeCheck,
  UserPlus,
  Star,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { useCreatorsWithMetrics } from "@/hooks/useCrm";
import { ViewModeToggle, TalentDetailPanel } from "@/components/crm";
import type { ViewMode } from "@/components/crm";
import type { CreatorWithMetrics } from "@/services/crm/platformCrmService";
import {
  TALENT_CATEGORY_LABELS,
  TALENT_CATEGORY_COLORS,
  SPECIFIC_ROLE_LABELS,
  CATEGORY_ROLES,
} from "@/types/crm.types";
import type { TalentCategory, SpecificRole } from "@/types/crm.types";

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

// =====================================================
// MAIN COMPONENT
// =====================================================

const PlatformCRMCreators = () => {
  const { data: creators = [], isLoading } = useCreatorsWithMetrics();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCreator, setSelectedCreator] = useState<CreatorWithMetrics | null>(null);

  // Derive stats
  const stats = useMemo(() => {
    const total = creators.length;
    const active = creators.filter((c) => c.is_active).length;
    const verified = creators.filter((c) => c.is_verified).length;
    const recent = creators.filter(
      (c) => Date.now() - new Date(c.created_at).getTime() < THIRTY_DAYS_MS
    ).length;
    return { total, active, verified, recent };
  }, [creators]);

  // Available roles based on category filter
  const availableRoles = useMemo(() => {
    if (categoryFilter && categoryFilter !== "all") {
      return CATEGORY_ROLES[categoryFilter as TalentCategory] || [];
    }
    return Object.keys(SPECIFIC_ROLE_LABELS) as SpecificRole[];
  }, [categoryFilter]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...creators];

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
  }, [creators, search, categoryFilter, roleFilter, statusFilter]);

  // Reset role filter when category changes
  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val);
    setRoleFilter("all");
  };

  const handleSelect = (creator: CreatorWithMetrics) => {
    setSelectedCreator((prev) => (prev?.id === creator.id ? null : creator));
  };

  return (
    <div className="min-h-screen flex">
      <div
        className={cn(
          "flex-1 p-4 md:p-6 space-y-8 transition-[margin] duration-300",
          selectedCreator && "mr-[440px]"
        )}
      >
        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Talento</h1>
            <p className="text-white/60">Todo el talento del ecosistema Kreoon</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar talento..."
                className="w-64 bg-white/5 border-white/10 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* ========== KPI CARDS ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Talento" value={stats.total} icon={Video} color="pink" />
          <StatCard
            title="Activos"
            value={stats.active}
            subtitle="Perfil activo"
            icon={CheckCircle}
            color="green"
          />
          <StatCard title="Verificados" value={stats.verified} icon={BadgeCheck} color="blue" />
          <StatCard
            title="Nuevos"
            value={stats.recent}
            subtitle={"\u00daltimos 30 d\u00edas"}
            icon={UserPlus}
            color="purple"
          />
        </div>

        {/* ========== FILTERS ========== */}
        <div className="flex flex-wrap gap-3">
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10">
              <SelectValue placeholder={"Categor\u00eda"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{"Todas las categor\u00edas"}</SelectItem>
              {Object.entries(TALENT_CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
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
            {filtered.length} talento
          </div>
        </div>

        {/* ========== LOADING ========== */}
        {isLoading && (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/40">Cargando talento...</p>
          </div>
        )}

        {/* ========== EMPTY STATE ========== */}
        {!isLoading && filtered.length === 0 && (
          <div className="p-12 text-center">
            <Video className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/40">
              {search || categoryFilter !== "all" || roleFilter !== "all" || statusFilter !== "all"
                ? "Sin resultados para los filtros aplicados"
                : "A\u00fan no hay talento registrado"}
            </p>
          </div>
        )}

        {/* ========== CARDS VIEW ========== */}
        {!isLoading && filtered.length > 0 && viewMode === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((creator) => {
              const category = getPrimaryCategory(creator);
              const role = getPrimaryRole(creator);
              return (
                <Card
                  key={creator.id}
                  onClick={() => handleSelect(creator)}
                  className={cn(
                    "p-4 hover:bg-white/10 transition-colors cursor-pointer",
                    selectedCreator?.id === creator.id && "ring-1 ring-[#8b5cf6] bg-white/10"
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative shrink-0">
                      {creator.avatar_url ? (
                        <img
                          src={creator.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
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
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          TALENT_CATEGORY_COLORS[category]
                        )}
                      >
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
                      <span>
                        {creator.rating_avg > 0 ? creator.rating_avg.toFixed(1) : "N/A"}
                      </span>
                    </div>
                    <span className="text-white/50">
                      {creator.completed_projects} proyectos
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-green-400">
                      {formatCurrency(creator.total_earned)}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs",
                        creator.is_active
                          ? "bg-green-500/20 text-green-300"
                          : "bg-white/10 text-white/50"
                      )}
                    >
                      {creator.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ========== TABLE VIEW ========== */}
        {!isLoading && filtered.length > 0 && viewMode === "table" && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">Talento</TableHead>
                  <TableHead className="text-white/70">{"Categor\u00eda"}</TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">Rol</TableHead>
                  <TableHead className="text-white/70">Rating</TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">
                    Proyectos
                  </TableHead>
                  <TableHead className="text-white/70 hidden lg:table-cell">
                    Ganado
                  </TableHead>
                  <TableHead className="text-white/70">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((creator) => {
                  const category = getPrimaryCategory(creator);
                  const role = getPrimaryRole(creator);
                  return (
                    <TableRow
                      key={creator.id}
                      onClick={() => handleSelect(creator)}
                      className={cn(
                        "border-white/10 hover:bg-white/5 cursor-pointer",
                        selectedCreator?.id === creator.id && "bg-[#8b5cf6]/10"
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {creator.avatar_url ? (
                              <img
                                src={creator.avatar_url}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
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
                            <p className="text-white font-medium truncate">
                              {creator.full_name}
                            </p>
                            <p className="text-white/50 text-sm truncate">
                              {creator.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category ? (
                          <span
                            className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              TALENT_CATEGORY_COLORS[category]
                            )}
                          >
                            {TALENT_CATEGORY_LABELS[category]}
                          </span>
                        ) : (
                          <span className="text-white/30 text-xs">{"\u2014"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-white/70 hidden md:table-cell">
                        {role ? SPECIFIC_ROLE_LABELS[role] : "\u2014"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-4 h-4 fill-current" />
                          {creator.rating_avg > 0
                            ? creator.rating_avg.toFixed(1)
                            : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-white hidden md:table-cell">
                        {creator.completed_projects}
                      </TableCell>
                      <TableCell className="text-green-400 hidden lg:table-cell">
                        {formatCurrency(creator.total_earned)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs",
                            creator.is_active
                              ? "bg-green-500/20 text-green-300"
                              : "bg-white/10 text-white/50"
                          )}
                        >
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

        {/* ========== LIST VIEW ========== */}
        {!isLoading && filtered.length > 0 && viewMode === "list" && (
          <div className="space-y-1.5">
            {filtered.map((creator) => {
              const category = getPrimaryCategory(creator);
              return (
                <div
                  key={creator.id}
                  onClick={() => handleSelect(creator)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent",
                    selectedCreator?.id === creator.id && "bg-[#8b5cf6]/10 border-[#8b5cf6]/30"
                  )}
                >
                  <div className="relative shrink-0">
                    {creator.avatar_url ? (
                      <img
                        src={creator.avatar_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
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
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full hidden sm:inline-flex",
                        TALENT_CATEGORY_COLORS[category]
                      )}
                    >
                      {TALENT_CATEGORY_LABELS[category]}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-yellow-400 text-xs">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {creator.rating_avg > 0 ? creator.rating_avg.toFixed(1) : "—"}
                  </div>
                  <span className="text-xs text-white/50 hidden md:inline">
                    {creator.completed_projects} proy.
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px]",
                      creator.is_active
                        ? "bg-green-500/20 text-green-300"
                        : "bg-white/10 text-white/50"
                    )}
                  >
                    {creator.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========== DETAIL PANEL ========== */}
      {selectedCreator && (
        <div className="fixed top-0 right-0 h-full z-40">
          <TalentDetailPanel
            creator={selectedCreator}
            onClose={() => setSelectedCreator(null)}
          />
        </div>
      )}
    </div>
  );
};

export default PlatformCRMCreators;
