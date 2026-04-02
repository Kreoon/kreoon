import { useState, useMemo } from "react";
import {
  Users,
  Heart,
  Ban,
  Handshake,
  Search,
  DollarSign,
  AlertTriangle,
  Star,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { cn } from "@/lib/utils";

import {
  useCreatorRelationships,
  useOrgCreatorStats,
} from "@/hooks/useCrm";

import {
  CreatorRelationshipBadge,
  ViewModeToggle,
  UnifiedTalentDetailDialog,
} from "@/components/crm";
import type { ViewMode } from "@/components/crm";
import type { OrgCreatorWithStats, CreatorRelationshipType } from "@/types/crm.types";
import { CREATOR_RELATIONSHIP_TYPE_LABELS } from "@/types/crm.types";

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div
      className="rounded-sm p-4"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(139, 92, 246, 0.2)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/50">{label}</p>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const RELATIONSHIP_COLORS: Record<CreatorRelationshipType, string> = {
  favorite: "bg-pink-500/20 text-pink-400",
  blocked: "bg-red-500/20 text-red-400",
  team_member: "bg-blue-500/20 text-blue-400",
  contacted: "bg-yellow-500/20 text-yellow-400",
  worked_with: "bg-green-500/20 text-green-400",
};

// =====================================================
// TALENT CONTENT
// =====================================================

export function TalentContent({ orgId }: { orgId: string }) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedCreator, setSelectedCreator] = useState<OrgCreatorWithStats | null>(null);

  const { data: relationships = [], isLoading, refetch } = useCreatorRelationships(orgId, {
    search: search || undefined,
  });
  const { data: stats } = useOrgCreatorStats(orgId);

  const filtered = useMemo(() => {
    return relationships as unknown as OrgCreatorWithStats[];
  }, [relationships]);

  const handleSelect = (rel: OrgCreatorWithStats) => {
    setSelectedCreator((prev) => (prev?.id === rel.id ? null : rel));
  };

  const handleUpdate = () => {
    refetch();
    // Also refresh the selected creator with new data
    if (selectedCreator) {
      const updated = filtered.find((r) => r.id === selectedCreator.id);
      if (updated) setSelectedCreator(updated);
    }
  };

  return (
    <div className="min-h-0">
      <div className="flex-1 space-y-6">
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Favoritos"
              value={stats.total_favorites}
              icon={Heart}
              color="bg-pink-500/15 text-pink-400"
            />
            <StatCard
              label="Colaboradores"
              value={stats.top_collaborators?.length ?? 0}
              icon={Handshake}
              color="bg-green-500/15 text-green-400"
            />
            <StatCard
              label="Bloqueados"
              value={stats.total_blocked}
              icon={Ban}
              color="bg-red-500/15 text-red-400"
            />
            <StatCard
              label="Total invertido"
              value={`$${Math.round((stats.total_spent || 0) / 1000)}k`}
              icon={DollarSign}
              color="bg-emerald-500/15 text-emerald-400"
            />
          </div>
        )}

        {/* Search + View toggle */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Buscar talento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-sm bg-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Sin relaciones con talento</p>
            <p className="text-xs text-white/20 mt-1">
              Agrega talento a favoritos desde el Marketplace
            </p>
          </div>
        ) : (
          <>
            {/* ========== CARDS VIEW ========== */}
            {viewMode === "cards" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((rel) => (
                  <CreatorRelationshipBadge
                    key={rel.id}
                    relationship={rel}
                    onClick={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* ========== TABLE VIEW ========== */}
            {viewMode === "table" && (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70">Talento</TableHead>
                      <TableHead className="text-white/70">Relación</TableHead>
                      <TableHead className="text-white/70 hidden md:table-cell">Colaboraciones</TableHead>
                      <TableHead className="text-white/70 hidden md:table-cell">Pagado</TableHead>
                      <TableHead className="text-white/70 hidden lg:table-cell">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((rel) => (
                      <TableRow
                        key={rel.id}
                        onClick={() => handleSelect(rel)}
                        className={cn(
                          "border-white/10 hover:bg-white/5 cursor-pointer",
                          selectedCreator?.id === rel.id && "bg-[#8b5cf6]/10"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {rel.creator_avatar ? (
                              <img
                                src={rel.creator_avatar}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300 text-sm">
                                {rel.creator_name?.charAt(0) || "?"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm text-white font-medium truncate">{rel.creator_name}</p>
                              <p className="text-xs text-white/40 truncate">{rel.creator_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {rel.relationship_type ? (
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                RELATIONSHIP_COLORS[rel.relationship_type]
                              )}
                            >
                              {CREATOR_RELATIONSHIP_TYPE_LABELS[rel.relationship_type]}
                            </span>
                          ) : (
                            <span className="text-white/30 text-xs">{"\u2014"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-white/70 hidden md:table-cell">
                          {rel.times_worked_together}
                        </TableCell>
                        <TableCell className="text-green-400 hidden md:table-cell">
                          {formatCurrency(rel.total_paid)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {rel.average_rating_given != null ? (
                            <div className="flex items-center gap-1 text-yellow-400 text-xs">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              {rel.average_rating_given.toFixed(1)}
                            </div>
                          ) : (
                            <span className="text-white/30 text-xs">{"\u2014"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* ========== LIST VIEW ========== */}
            {viewMode === "list" && (
              <div className="space-y-1.5">
                {filtered.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => handleSelect(rel)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-sm hover:bg-white/5 cursor-pointer transition-colors border border-transparent",
                      selectedCreator?.id === rel.id && "bg-[#8b5cf6]/10 border-[#8b5cf6]/30"
                    )}
                  >
                    {rel.creator_avatar ? (
                      <img
                        src={rel.creator_avatar}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300 text-sm">
                        {rel.creator_name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{rel.creator_name}</p>
                      <p className="text-xs text-white/40 truncate">{rel.creator_email}</p>
                    </div>
                    {rel.relationship_type && (
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full hidden sm:inline-flex",
                          RELATIONSHIP_COLORS[rel.relationship_type]
                        )}
                      >
                        {CREATOR_RELATIONSHIP_TYPE_LABELS[rel.relationship_type]}
                      </span>
                    )}
                    {rel.times_worked_together > 0 && (
                      <span className="text-xs text-white/50 hidden md:inline">
                        {rel.times_worked_together} colabs
                      </span>
                    )}
                    {rel.total_paid > 0 && (
                      <span className="text-xs text-green-400">
                        {formatCurrency(rel.total_paid)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== DETAIL DIALOG ========== */}
      {selectedCreator && (
        <UnifiedTalentDetailDialog
          orgCreator={selectedCreator}
          organizationId={orgId}
          open={true}
          onOpenChange={(open) => { if (!open) setSelectedCreator(null); }}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

// =====================================================
// ORG CRM TALENT PAGE
// =====================================================

const OrgCRMCreators = () => {
  const { currentOrgId, currentOrgName } = useOrgOwner();

  if (!currentOrgId) {
    return (
      <div className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          <PageHeader icon={Star} title="Talento" subtitle="Relaciones con talento" />
          <div className="text-center py-16">
            <AlertTriangle className="h-8 w-8 text-yellow-400/50 mx-auto mb-2" />
            <p className="text-sm text-white/40">Selecciona una organización para acceder al CRM</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          icon={Star}
          title="Talento"
          subtitle={currentOrgName ? `Relaciones con talento de ${currentOrgName}` : "Relaciones con talento"}
        />
        <TalentContent orgId={currentOrgId} />
      </div>
    </div>
  );
};

export default OrgCRMCreators;
