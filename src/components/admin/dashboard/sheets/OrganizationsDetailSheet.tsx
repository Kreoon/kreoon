import { useState, useMemo } from "react";
import { Building2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPIDetailHeader } from "./shared/KPIDetailHeader";
import { KPIDetailFilters } from "./shared/KPIDetailFilters";
import { KPIDetailTable, type TableColumn } from "./shared/KPIDetailTable";
import type { AdminDashboardStats } from "@/types/admin-dashboard.types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface OrgRow {
  id: string;
  name: string;
  tier: string | null;
  member_count: number;
  created_at: string;
}

function useOrgsDetail() {
  return useQuery<OrgRow[]>({
    queryKey: ["admin-kpi-orgs-detail"],
    queryFn: async () => {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("id, name, selected_plan, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      if (!orgs) return [];

      const orgIds = orgs.map((o) => o.id);
      const { data: memberCounts } = await supabase
        .from("organization_members")
        .select("organization_id")
        .in("organization_id", orgIds);

      const countMap = new Map<string, number>();
      for (const m of memberCounts || []) {
        countMap.set(m.organization_id, (countMap.get(m.organization_id) || 0) + 1);
      }

      return orgs.map((o) => ({
        id: o.id,
        name: o.name || "Sin nombre",
        tier: o.selected_plan,
        member_count: countMap.get(o.id) || 0,
        created_at: o.created_at || "",
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
}

const TIER_COLORS: Record<string, string> = {
  free: "border-white/20 text-white/50",
  starter: "border-blue-500/50 text-blue-400",
  pro: "border-purple-500/50 text-purple-400",
  enterprise: "border-yellow-500/50 text-yellow-400",
};

interface OrganizationsDetailSheetProps {
  stats?: AdminDashboardStats;
}

export function OrganizationsDetailSheet({ stats }: OrganizationsDetailSheetProps) {
  const { data: orgs = [], isLoading } = useOrgsDetail();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const tiers = useMemo(() => {
    const set = new Set(orgs.map((o) => o.tier || "free"));
    return Array.from(set).sort();
  }, [orgs]);

  const filtered = useMemo(() => {
    let list = orgs;
    if (tab !== "all") list = list.filter((o) => (o.tier || "free") === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) => o.name.toLowerCase().includes(q));
    }
    return list;
  }, [orgs, tab, search]);

  const columns: TableColumn<OrgRow>[] = [
    {
      key: "name",
      header: "Organizacion",
      render: (o) => <span className="font-medium text-white">{o.name}</span>,
    },
    {
      key: "tier",
      header: "Tier",
      render: (o) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${TIER_COLORS[o.tier || "free"] || TIER_COLORS.free}`}
        >
          {o.tier || "free"}
        </Badge>
      ),
    },
    {
      key: "members",
      header: "Miembros",
      render: (o) => <span className="text-white/60">{o.member_count}</span>,
    },
    {
      key: "created",
      header: "Registro",
      render: (o) => (
        <span className="text-white/50 text-xs">
          {new Date(o.created_at).toLocaleDateString("es-CO")}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      <KPIDetailHeader
        icon={Building2}
        title="Organizaciones"
        subtitle="Detalle de organizaciones en la plataforma"
        color="bg-blue-500/20"
        miniStats={
          stats
            ? [
                { label: "Total", value: stats.organizations.total },
                { label: "Nuevas", value: `+${stats.organizations.new_period}` },
              ]
            : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 w-full justify-start flex-wrap">
          <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
          {tiers.map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <KPIDetailFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar organizacion..."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/30 text-sm">
          Cargando organizaciones...
        </div>
      ) : (
        <KPIDetailTable
          data={filtered}
          columns={columns}
          getRowKey={(o) => o.id}
          emptyMessage="No se encontraron organizaciones"
        />
      )}
    </div>
  );
}
