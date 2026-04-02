import { useState, useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPIDetailHeader } from "./shared/KPIDetailHeader";
import { KPIDetailFilters } from "./shared/KPIDetailFilters";
import { KPIDetailTable, type TableColumn } from "./shared/KPIDetailTable";
import type { AdminDashboardStats } from "@/types/admin-dashboard.types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type HealthStatus = "healthy" | "at_risk" | "churning" | "churned";

interface HealthRow {
  id: string;
  full_name: string;
  email: string;
  health_score: number;
  status: HealthStatus;
  last_active_at: string | null;
  days_inactive: number;
}

function useHealthDetail() {
  return useQuery<HealthRow[]>({
    queryKey: ["admin-kpi-health-detail"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .order("created_at", { ascending: true, nullsFirst: true })
        .limit(500);

      if (error) throw error;
      const now = Date.now();

      return (data || []).map((u) => {
        const createdAt = u.created_at ? new Date(u.created_at).getTime() : null;
        const lastLogin = createdAt;
        const daysInactive = lastLogin ? Math.floor((now - lastLogin) / 86400000) : 999;

        let status: HealthStatus = "healthy";
        let health_score = 100;

        if (daysInactive > 60) {
          status = "churned";
          health_score = 0;
        } else if (daysInactive > 30) {
          status = "churning";
          health_score = 20;
        } else if (daysInactive > 14) {
          status = "at_risk";
          health_score = 50;
        } else {
          health_score = Math.max(10, 100 - daysInactive * 3);
        }

        return {
          id: u.id,
          full_name: u.full_name || "Sin nombre",
          email: u.email || "",
          health_score,
          status,
          last_active_at: u.created_at,
          days_inactive: daysInactive === 999 ? -1 : daysInactive,
        };
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}

const STATUS_CONFIG: Record<HealthStatus, { label: string; color: string; icon: typeof Activity }> = {
  healthy: { label: "Saludable", color: "border-green-500/50 text-green-400", icon: CheckCircle2 },
  at_risk: { label: "En riesgo", color: "border-yellow-500/50 text-yellow-400", icon: AlertTriangle },
  churning: { label: "Churning", color: "border-orange-500/50 text-orange-400", icon: AlertTriangle },
  churned: { label: "Churned", color: "border-red-500/50 text-red-400", icon: XCircle },
};

interface HealthDetailSheetProps {
  stats?: AdminDashboardStats;
}

export function HealthDetailSheet({ stats }: HealthDetailSheetProps) {
  const { data: users = [], isLoading } = useHealthDetail();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    let list = users;
    if (tab === "at_risk") list = list.filter((u) => u.status === "at_risk");
    if (tab === "churning") list = list.filter((u) => u.status === "churning" || u.status === "churned");
    if (tab === "healthy") list = list.filter((u) => u.status === "healthy");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, tab, search]);

  const columns: TableColumn<HealthRow>[] = [
    {
      key: "name",
      header: "Usuario",
      render: (u) => (
        <div>
          <p className="font-medium text-white">{u.full_name}</p>
          <p className="text-xs text-white/40">{u.email}</p>
        </div>
      ),
    },
    {
      key: "score",
      header: "Score",
      render: (u) => (
        <div className="flex items-center gap-2">
          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                u.health_score >= 70 ? "bg-green-400" : u.health_score >= 40 ? "bg-yellow-400" : "bg-red-400"
              )}
              style={{ width: `${u.health_score}%` }}
            />
          </div>
          <span className="text-xs text-white/60">{u.health_score}%</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (u) => {
        const cfg = STATUS_CONFIG[u.status];
        return (
          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "inactive",
      header: "Inactividad",
      render: (u) =>
        u.days_inactive < 0 ? (
          <span className="text-white/30 text-xs">Nunca</span>
        ) : (
          <span className={cn("text-xs", u.days_inactive > 30 ? "text-red-400" : u.days_inactive > 14 ? "text-yellow-400" : "text-white/50")}>
            {u.days_inactive}d
          </span>
        ),
    },
    {
      key: "last_active",
      header: "Ultima actividad",
      render: (u) => (
        <span className="text-white/50 text-xs">
          {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString("es-CO") : "Nunca"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      <KPIDetailHeader
        icon={Activity}
        title="Health Score"
        subtitle="Estado de salud de los usuarios"
        color="bg-cyan-500/20"
        miniStats={
          stats
            ? [
                { label: "Score promedio", value: `${stats.health.avg_health_score}%` },
                { label: "Saludables", value: stats.health.healthy },
                { label: "En riesgo", value: stats.health.at_risk },
                { label: "Churning", value: stats.health.churning },
              ]
            : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 w-full justify-start">
          <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="at_risk" className="text-xs">En Riesgo</TabsTrigger>
          <TabsTrigger value="churning" className="text-xs">Churning</TabsTrigger>
          <TabsTrigger value="healthy" className="text-xs">Saludables</TabsTrigger>
        </TabsList>
      </Tabs>

      <KPIDetailFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar usuario..."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/30 text-sm">
          Cargando datos de salud...
        </div>
      ) : (
        <KPIDetailTable
          data={filtered}
          columns={columns}
          getRowKey={(u) => u.id}
          emptyMessage="No se encontraron usuarios"
        />
      )}
    </div>
  );
}
