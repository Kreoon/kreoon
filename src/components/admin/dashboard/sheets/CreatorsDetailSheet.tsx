import { useState, useMemo } from "react";
import { UserCheck, Star } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPIDetailHeader } from "./shared/KPIDetailHeader";
import { KPIDetailFilters } from "./shared/KPIDetailFilters";
import { KPIDetailTable, type TableColumn } from "./shared/KPIDetailTable";
import type { AdminDashboardStats } from "@/types/admin-dashboard.types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface CreatorRow {
  id: string;
  full_name: string;
  email: string;
  level: string | null;
  is_verified: boolean;
  is_available: boolean;
  rating: number | null;
  created_at: string;
}

function useCreatorsDetail() {
  return useQuery<CreatorRow[]>({
    queryKey: ["admin-kpi-creators-detail"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_profiles")
        .select("id, display_name, level, is_verified, is_available, rating_avg, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const creatorIds = (data || []).map((c) => c.id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", creatorIds);

      const emailMap = new Map<string, string>();
      for (const p of profiles || []) {
        emailMap.set(p.id, p.email || "");
      }

      return (data || []).map((c) => ({
        id: c.id,
        full_name: c.display_name || "Sin nombre",
        email: emailMap.get(c.id) || "",
        level: c.level,
        is_verified: c.is_verified || false,
        is_available: c.is_available || false,
        rating: c.rating_avg,
        created_at: c.created_at || "",
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: "border-white/20 text-white/50",
  intermediate: "border-blue-500/50 text-blue-400",
  advanced: "border-purple-500/50 text-purple-400",
  expert: "border-yellow-500/50 text-yellow-400",
};

interface CreatorsDetailSheetProps {
  stats?: AdminDashboardStats;
}

export function CreatorsDetailSheet({ stats }: CreatorsDetailSheetProps) {
  const { data: creators = [], isLoading } = useCreatorsDetail();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    let list = creators;
    if (tab === "verified") list = list.filter((c) => c.is_verified);
    if (tab === "available") list = list.filter((c) => c.is_available);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [creators, tab, search]);

  const columns: TableColumn<CreatorRow>[] = [
    {
      key: "name",
      header: "Creador",
      render: (c) => (
        <div>
          <p className="font-medium text-white">{c.full_name}</p>
          <p className="text-xs text-white/40">{c.email}</p>
        </div>
      ),
    },
    {
      key: "level",
      header: "Nivel",
      render: (c) => (
        <Badge
          variant="outline"
          className={`text-[10px] capitalize ${LEVEL_COLORS[c.level || "beginner"] || LEVEL_COLORS.beginner}`}
        >
          {c.level || "beginner"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (c) => (
        <div className="flex gap-1">
          {c.is_verified && (
            <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-400">
              Verificado
            </Badge>
          )}
          {c.is_available && (
            <Badge variant="outline" className="text-[10px] border-cyan-500/50 text-cyan-400">
              Disponible
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      render: (c) =>
        c.rating ? (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-white/60">{c.rating.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-white/30">-</span>
        ),
    },
    {
      key: "created",
      header: "Registro",
      render: (c) => (
        <span className="text-white/50 text-xs">
          {new Date(c.created_at).toLocaleDateString("es-CO")}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      <KPIDetailHeader
        icon={UserCheck}
        title="Creadores"
        subtitle="Perfiles de creadores en el marketplace"
        color="bg-pink-500/20"
        miniStats={
          stats
            ? [
                { label: "Total", value: stats.creators.total },
                { label: "Verificados", value: stats.creators.verified || 0 },
                { label: "Disponibles", value: stats.creators.available || 0 },
              ]
            : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 w-full justify-start">
          <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="verified" className="text-xs">Verificados</TabsTrigger>
          <TabsTrigger value="available" className="text-xs">Disponibles</TabsTrigger>
        </TabsList>
      </Tabs>

      <KPIDetailFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar creador..."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/30 text-sm">
          Cargando creadores...
        </div>
      ) : (
        <KPIDetailTable
          data={filtered}
          columns={columns}
          getRowKey={(c) => c.id}
          emptyMessage="No se encontraron creadores"
        />
      )}
    </div>
  );
}
