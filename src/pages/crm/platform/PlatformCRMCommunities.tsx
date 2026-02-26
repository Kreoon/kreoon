import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users2,
  Plus,
  CheckCircle,
  AlertTriangle,
  Gift,
  Search,
  Users,
  Calendar,
  Percent,
  Coins,
  ExternalLink,
  Mail,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ViewModeToggle } from "@/components/crm";
import type { ViewMode } from "@/components/crm";

// =====================================================
// TYPES
// =====================================================

interface CommunityWithMetrics {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  free_months: number;
  commission_discount_points: number;
  bonus_ai_tokens: number;
  custom_badge_text: string | null;
  custom_badge_color: string | null;
  target_types: string[];
  max_redemptions: number | null;
  current_redemptions: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  partner_contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  owner_user_id: string | null;
  owner_commission_rate: string | null;
  owner_subscription_rate: string | null;
  // Computed metrics
  member_count: number;
  active_member_count: number;
}

// =====================================================
// STAT CARD
// =====================================================

type StatColor = "purple" | "pink" | "blue" | "green" | "yellow" | "orange" | "amber";

const COLOR_MAP: Record<StatColor, { text: string; iconBg: string }> = {
  purple: { text: "text-purple-400", iconBg: "bg-purple-500/20" },
  pink: { text: "text-pink-400", iconBg: "bg-pink-500/20" },
  blue: { text: "text-blue-400", iconBg: "bg-blue-500/20" },
  green: { text: "text-emerald-400", iconBg: "bg-emerald-500/20" },
  yellow: { text: "text-yellow-400", iconBg: "bg-yellow-500/20" },
  orange: { text: "text-orange-400", iconBg: "bg-orange-500/20" },
  amber: { text: "text-amber-400", iconBg: "bg-amber-500/20" },
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

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  active: { label: "Activa", class: "bg-green-500/20 text-green-300" },
  inactive: { label: "Inactiva", class: "bg-red-500/20 text-red-300" },
  scheduled: { label: "Programada", class: "bg-blue-500/20 text-blue-300" },
  expired: { label: "Expirada", class: "bg-gray-500/20 text-gray-300" },
};

function getCommunityStatus(community: CommunityWithMetrics): string {
  if (!community.is_active) return "inactive";

  const now = new Date();
  if (community.start_date && new Date(community.start_date) > now) return "scheduled";
  if (community.end_date && new Date(community.end_date) < now) return "expired";

  return "active";
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// =====================================================
// DETAIL PANEL
// =====================================================

function CommunityDetailPanel({
  community,
  onClose,
}: {
  community: CommunityWithMetrics;
  onClose: () => void;
}) {
  const status = getCommunityStatus(community);
  const cfg = STATUS_CONFIG[status];

  return (
    <SheetContent className="w-full sm:max-w-[440px] overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: community.custom_badge_color || '#8b5cf6' }}
          >
            {community.logo_url ? (
              <img src={community.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <Users2 className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <p className="text-lg font-semibold">{community.name}</p>
            <p className="text-sm text-muted-foreground">/{community.slug}</p>
          </div>
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {/* Status & Badge */}
        <div className="flex items-center gap-2">
          <Badge className={cfg.class}>{cfg.label}</Badge>
          {community.custom_badge_text && (
            <Badge
              style={{
                backgroundColor: community.custom_badge_color || '#8b5cf6',
                color: 'white',
              }}
            >
              {community.custom_badge_text}
            </Badge>
          )}
        </div>

        {/* Description */}
        {community.description && (
          <div>
            <p className="text-sm text-muted-foreground">{community.description}</p>
          </div>
        )}

        <Separator />

        {/* Benefits */}
        <div>
          <h4 className="text-sm font-medium mb-3">Beneficios</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-amber-500/10">
              <Gift className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-amber-500">{community.free_months}</p>
              <p className="text-[10px] text-muted-foreground">Meses gratis</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <Percent className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-500">{community.commission_discount_points}%</p>
              <p className="text-[10px] text-muted-foreground">Descuento</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-500/10">
              <Coins className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-500">{community.bonus_ai_tokens}</p>
              <p className="text-[10px] text-muted-foreground">Tokens</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Metrics */}
        <div>
          <h4 className="text-sm font-medium mb-3">Metricas</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{community.current_redemptions}</p>
              <p className="text-xs text-muted-foreground">Redenciones</p>
              {community.max_redemptions && (
                <p className="text-[10px] text-muted-foreground">
                  de {community.max_redemptions} max
                </p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{community.member_count}</p>
              <p className="text-xs text-muted-foreground">Miembros</p>
              <p className="text-[10px] text-muted-foreground">
                {community.active_member_count} activos
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Dates */}
        <div>
          <h4 className="text-sm font-medium mb-3">Fechas</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creada</span>
              <span>{format(new Date(community.created_at), "d MMM yyyy", { locale: es })}</span>
            </div>
            {community.start_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inicio</span>
                <span>{format(new Date(community.start_date), "d MMM yyyy", { locale: es })}</span>
              </div>
            )}
            {community.end_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fin</span>
                <span>{format(new Date(community.end_date), "d MMM yyyy", { locale: es })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        {community.partner_contact_email && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Contacto</h4>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${community.partner_contact_email}`}
                  className="text-primary hover:underline"
                >
                  {community.partner_contact_email}
                </a>
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        {community.notes && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Notas</h4>
              <p className="text-sm text-muted-foreground">{community.notes}</p>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1" asChild>
            <a href={`/comunidad/${community.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver landing
            </a>
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

const PlatformCRMCommunities = () => {
  // Fetch communities with metrics
  const { data: communities = [], isLoading } = useQuery({
    queryKey: ['crm-communities'],
    queryFn: async () => {
      // Get all communities
      const { data: communitiesData, error } = await supabase
        .from('partner_communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts for each community
      const communityIds = communitiesData?.map(c => c.id) || [];

      const { data: memberships } = await supabase
        .from('partner_community_memberships')
        .select('community_id, status')
        .in('community_id', communityIds);

      // Count members per community
      const memberCounts = new Map<string, { total: number; active: number }>();
      (memberships || []).forEach(m => {
        const counts = memberCounts.get(m.community_id) || { total: 0, active: 0 };
        counts.total++;
        if (m.status === 'active') counts.active++;
        memberCounts.set(m.community_id, counts);
      });

      return (communitiesData || []).map(c => ({
        ...c,
        member_count: memberCounts.get(c.id)?.total || 0,
        active_member_count: memberCounts.get(c.id)?.active || 0,
      })) as CommunityWithMetrics[];
    },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityWithMetrics | null>(null);

  // Derive stats
  const stats = useMemo(() => {
    const total = communities.length;
    const active = communities.filter((c) => getCommunityStatus(c) === "active").length;
    const totalMembers = communities.reduce((sum, c) => sum + c.member_count, 0);
    const totalRedemptions = communities.reduce((sum, c) => sum + c.current_redemptions, 0);
    return { total, active, totalMembers, totalRedemptions };
  }, [communities]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...communities];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.custom_badge_text?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((c) => getCommunityStatus(c) === statusFilter);
    }
    switch (sortBy) {
      case "created_asc":
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "members_desc":
        list.sort((a, b) => b.member_count - a.member_count);
        break;
      case "redemptions_desc":
        list.sort((a, b) => b.current_redemptions - a.current_redemptions);
        break;
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return list;
  }, [communities, search, statusFilter, sortBy]);

  const handleSelectCommunity = (community: CommunityWithMetrics) => {
    setSelectedCommunity(selectedCommunity?.id === community.id ? null : community);
  };

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-8">
        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Comunidades</h1>
            <p className="text-white/60">Gestiona las comunidades de partners de Kreoon</p>
          </div>
          <div className="flex gap-3 items-center">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar comunidad..."
                className="w-64 bg-white/5 border-white/10 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ========== KPI CARDS ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Comunidades" value={stats.total} icon={Users2} color="amber" />
          <StatCard title="Activas" value={stats.active} subtitle="Disponibles ahora" icon={CheckCircle} color="green" />
          <StatCard title="Miembros" value={stats.totalMembers} subtitle="En todas las comunidades" icon={Users} color="blue" />
          <StatCard title="Redenciones" value={stats.totalRedemptions} subtitle="Beneficios aplicados" icon={Gift} color="purple" />
        </div>

        {/* ========== FILTERS ========== */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-white/5 border-white/10"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
              <SelectItem value="scheduled">Programadas</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Mas recientes</SelectItem>
              <SelectItem value="created_asc">Mas antiguas</SelectItem>
              <SelectItem value="members_desc">Mas miembros</SelectItem>
              <SelectItem value="redemptions_desc">Mas redenciones</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-white/40 self-center">{filtered.length} comunidades</div>
        </div>

        {/* ========== CONTENT ========== */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/40">Cargando comunidades...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users2 className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/40">
              {search || statusFilter !== "all" ? "Sin resultados para los filtros aplicados" : "Aun no hay comunidades"}
            </p>
          </div>
        ) : viewMode === "cards" ? (
          /* ---- CARDS VIEW ---- */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((community) => {
              const status = getCommunityStatus(community);
              const cfg = STATUS_CONFIG[status];
              return (
                <Card
                  key={community.id}
                  className={cn(
                    "p-4 cursor-pointer hover:border-amber-500/40 transition-all",
                    selectedCommunity?.id === community.id && "border-amber-500/60 bg-amber-500/5",
                  )}
                  onClick={() => handleSelectCommunity(community)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: community.custom_badge_color || '#f59e0b' }}
                    >
                      {community.logo_url ? (
                        <img src={community.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <Users2 className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{community.name}</p>
                      <p className="text-white/40 text-xs truncate">/{community.slug}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0", cfg.class)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">{community.member_count}</p>
                      <p className="text-[10px] text-white/40">Miembros</p>
                    </div>
                    <div className="text-center">
                      <p className="text-amber-400 font-semibold text-sm">{community.free_months}</p>
                      <p className="text-[10px] text-white/40">Meses</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-400 font-semibold text-sm">{community.commission_discount_points}%</p>
                      <p className="text-[10px] text-white/40">Desc.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-400 font-semibold text-sm">{community.current_redemptions}</p>
                      <p className="text-[10px] text-white/40">Usos</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : viewMode === "list" ? (
          /* ---- LIST VIEW ---- */
          <div className="space-y-1">
            {filtered.map((community) => {
              const status = getCommunityStatus(community);
              const cfg = STATUS_CONFIG[status];
              return (
                <div
                  key={community.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors",
                    selectedCommunity?.id === community.id && "bg-amber-500/10 border border-amber-500/30",
                  )}
                  onClick={() => handleSelectCommunity(community)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: community.custom_badge_color || '#f59e0b' }}
                  >
                    {community.logo_url ? (
                      <img src={community.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white">{getInitials(community.name)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{community.name}</p>
                  </div>
                  <span className="text-xs text-white/50 hidden sm:inline">{community.member_count} miembros</span>
                  <span className="text-xs text-amber-400 hidden md:inline">{community.free_months} meses</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0", cfg.class)}>
                    {cfg.label}
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
                  <TableHead className="text-white/70">Comunidad</TableHead>
                  <TableHead className="text-white/70">Miembros</TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">Meses Gratis</TableHead>
                  <TableHead className="text-white/70 hidden md:table-cell">Descuento</TableHead>
                  <TableHead className="text-white/70 hidden lg:table-cell">Tokens</TableHead>
                  <TableHead className="text-white/70 hidden lg:table-cell">Redenciones</TableHead>
                  <TableHead className="text-white/70">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((community) => {
                  const status = getCommunityStatus(community);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <TableRow
                      key={community.id}
                      className={cn(
                        "border-white/10 hover:bg-white/5 cursor-pointer",
                        selectedCommunity?.id === community.id && "bg-amber-500/10",
                      )}
                      onClick={() => handleSelectCommunity(community)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: community.custom_badge_color || '#f59e0b' }}
                          >
                            {community.logo_url ? (
                              <img src={community.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <Users2 className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{community.name}</p>
                            <p className="text-white/40 text-xs truncate">/{community.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{community.member_count}</TableCell>
                      <TableCell className="text-amber-400 hidden md:table-cell">{community.free_months}</TableCell>
                      <TableCell className="text-green-400 hidden md:table-cell">{community.commission_discount_points}%</TableCell>
                      <TableCell className="text-purple-400 hidden lg:table-cell">{community.bonus_ai_tokens}</TableCell>
                      <TableCell className="text-white hidden lg:table-cell">
                        {community.current_redemptions}
                        {community.max_redemptions && (
                          <span className="text-white/40">/{community.max_redemptions}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-1 rounded-full text-xs", cfg.class)}>{cfg.label}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* ========== DETAIL PANEL ========== */}
      <Sheet open={!!selectedCommunity} onOpenChange={(open) => !open && setSelectedCommunity(null)}>
        {selectedCommunity && (
          <CommunityDetailPanel
            community={selectedCommunity}
            onClose={() => setSelectedCommunity(null)}
          />
        )}
      </Sheet>
    </div>
  );
};

export default PlatformCRMCommunities;
