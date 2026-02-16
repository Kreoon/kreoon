import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { cn } from "@/lib/utils";

import {
  useCreatorRelationships,
  useOrgCreatorStats,
} from "@/hooks/useCrm";

import { CreatorRelationshipBadge } from "@/components/crm";

import type { OrgCreatorWithStats } from "@/types/crm.types";

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
      className="rounded-xl p-4"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(139, 92, 246, 0.2)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
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
// CREATORS CONTENT
// =====================================================

function CreatorsContent({ orgId }: { orgId: string }) {
  const [search, setSearch] = useState("");
  const { data: relationships = [], isLoading } = useCreatorRelationships(orgId, {
    search: search || undefined,
  });
  const { data: stats } = useOrgCreatorStats(orgId);

  return (
    <div className="space-y-6">
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          placeholder="Buscar creadores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
      </div>

      {/* Creator Relationships Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : relationships.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Sin relaciones con creadores</p>
          <p className="text-xs text-white/20 mt-1">
            Agrega creadores a favoritos desde el Marketplace
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {relationships.map((rel) => (
            <CreatorRelationshipBadge
              key={rel.id}
              relationship={rel as unknown as OrgCreatorWithStats}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// ORG CRM CREATORS PAGE
// =====================================================

const OrgCRMCreators = () => {
  const { currentOrgId, currentOrgName } = useOrgOwner();

  if (!currentOrgId) {
    return (
      <div className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          <PageHeader icon={Star} title="Creadores" subtitle="Relaciones con creadores" />
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
          title="Creadores"
          subtitle={currentOrgName ? `Relaciones con creadores de ${currentOrgName}` : "Relaciones con creadores"}
        />
        <CreatorsContent orgId={currentOrgId} />
      </div>
    </div>
  );
};

export default OrgCRMCreators;
