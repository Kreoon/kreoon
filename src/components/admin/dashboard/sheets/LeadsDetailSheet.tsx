import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPIDetailHeader } from "./shared/KPIDetailHeader";
import { KPIDetailFilters } from "./shared/KPIDetailFilters";
import { KPIDetailTable, type TableColumn } from "./shared/KPIDetailTable";
import type { AdminDashboardStats } from "@/types/admin-dashboard.types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface LeadRow {
  id: string;
  full_name: string;
  email: string;
  stage: string | null;
  source: string | null;
  score: number | null;
  created_at: string;
  converted: boolean;
}

function useLeadsDetail() {
  return useQuery<LeadRow[]>({
    queryKey: ["admin-kpi-leads-detail"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_leads")
        .select("id, full_name, email, stage, lead_source, lead_score, created_at, converted_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []).map((l) => ({
        id: l.id,
        full_name: l.full_name || "Sin nombre",
        email: l.email || "",
        stage: l.stage,
        source: l.lead_source,
        score: l.lead_score,
        created_at: l.created_at || "",
        converted: !!l.converted_at,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
}

const STAGE_COLORS: Record<string, string> = {
  new: "border-blue-500/50 text-blue-400",
  contacted: "border-cyan-500/50 text-cyan-400",
  qualified: "border-purple-500/50 text-purple-400",
  proposal: "border-orange-500/50 text-orange-400",
  negotiation: "border-yellow-500/50 text-yellow-400",
  won: "border-green-500/50 text-green-400",
  lost: "border-red-500/50 text-red-400",
};

interface LeadsDetailSheetProps {
  stats?: AdminDashboardStats;
}

export function LeadsDetailSheet({ stats }: LeadsDetailSheetProps) {
  const { data: leads = [], isLoading } = useLeadsDetail();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    let list = leads;
    if (tab === "converted") list = list.filter((l) => l.converted);
    if (tab !== "all" && tab !== "converted") list = list.filter((l) => l.stage === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.full_name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.source?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, tab, search]);

  const columns: TableColumn<LeadRow>[] = [
    {
      key: "name",
      header: "Lead",
      render: (l) => (
        <div>
          <p className="font-medium text-white">{l.full_name}</p>
          <p className="text-xs text-white/40">{l.email}</p>
        </div>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      render: (l) => (
        <Badge
          variant="outline"
          className={`text-[10px] capitalize ${STAGE_COLORS[l.stage || "new"] || STAGE_COLORS.new}`}
        >
          {l.stage || "new"}
        </Badge>
      ),
    },
    {
      key: "source",
      header: "Fuente",
      render: (l) => <span className="text-white/60 text-xs">{l.source || "-"}</span>,
    },
    {
      key: "score",
      header: "Score",
      render: (l) =>
        l.score != null ? (
          <span className={l.score >= 70 ? "text-green-400" : l.score >= 40 ? "text-yellow-400" : "text-red-400"}>
            {l.score}
          </span>
        ) : (
          <span className="text-white/30">-</span>
        ),
    },
    {
      key: "created",
      header: "Fecha",
      render: (l) => (
        <span className="text-white/50 text-xs">
          {new Date(l.created_at).toLocaleDateString("es-CO")}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      <KPIDetailHeader
        icon={TrendingUp}
        title="Leads"
        subtitle="Pipeline de leads de la plataforma"
        color="bg-green-500/20"
        miniStats={
          stats
            ? [
                { label: "Total", value: stats.leads.total },
                { label: "Nuevos", value: `+${stats.leads.new_period}` },
                { label: "Convertidos", value: stats.leads.converted_period },
              ]
            : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 w-full justify-start flex-wrap">
          <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="new" className="text-xs">Nuevos</TabsTrigger>
          <TabsTrigger value="qualified" className="text-xs">Calificados</TabsTrigger>
          <TabsTrigger value="converted" className="text-xs">Convertidos</TabsTrigger>
        </TabsList>
      </Tabs>

      <KPIDetailFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar lead..."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/30 text-sm">
          Cargando leads...
        </div>
      ) : (
        <KPIDetailTable
          data={filtered}
          columns={columns}
          getRowKey={(l) => l.id}
          emptyMessage="No se encontraron leads"
        />
      )}
    </div>
  );
}
