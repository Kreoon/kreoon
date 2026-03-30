import { useState, useMemo } from "react";
import { Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KPIDetailHeader } from "./shared/KPIDetailHeader";
import { KPIDetailFilters } from "./shared/KPIDetailFilters";
import { KPIDetailTable, type TableColumn } from "./shared/KPIDetailTable";
import type { AdminDashboardStats } from "@/types/admin-dashboard.types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_superadmin: boolean;
  onboarding_completed: boolean;
  organization_name: string | null;
  roles: string[];
}

function useUsersDetail() {
  return useQuery<UserRow[]>({
    queryKey: ["admin-kpi-users-detail"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, is_superadmin, onboarding_completed")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      if (!profiles) return [];

      const userIds = profiles.map((p) => p.id);
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id, role, organizations(name)")
        .in("user_id", userIds);

      const memberMap = new Map<string, { roles: string[]; orgName: string | null }>();
      for (const m of members || []) {
        const existing = memberMap.get(m.user_id) || { roles: [], orgName: null };
        existing.roles.push(m.role);
        if ((m as any).organizations?.name) {
          existing.orgName = (m as any).organizations.name;
        }
        memberMap.set(m.user_id, existing);
      }

      return profiles.map((p) => ({
        id: p.id,
        email: p.email || "",
        full_name: p.full_name,
        created_at: p.created_at || "",
        is_superadmin: p.is_superadmin || false,
        onboarding_completed: p.onboarding_completed || false,
        organization_name: memberMap.get(p.id)?.orgName || null,
        roles: memberMap.get(p.id)?.roles || [],
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
}

interface UsersDetailSheetProps {
  stats?: AdminDashboardStats;
}

export function UsersDetailSheet({ stats }: UsersDetailSheetProps) {
  const { data: users = [], isLoading } = useUsersDetail();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    let list = users;

    if (tab === "with_org") list = list.filter((u) => u.organization_name);
    if (tab === "no_org") list = list.filter((u) => !u.organization_name);
    if (tab === "superadmin") list = list.filter((u) => u.is_superadmin);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.organization_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, tab, search]);

  const columns: TableColumn<UserRow>[] = [
    {
      key: "name",
      header: "Usuario",
      render: (u) => (
        <div>
          <p className="font-medium text-white">{u.full_name || "Sin nombre"}</p>
          <p className="text-xs text-white/40">{u.email}</p>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.is_superadmin && (
            <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-400">
              superadmin
            </Badge>
          )}
          {u.roles.map((r) => (
            <Badge key={r} variant="outline" className="text-[10px] border-white/20 text-white/60">
              {r}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "org",
      header: "Organizacion",
      render: (u) => (
        <span className="text-white/60">{u.organization_name || "-"}</span>
      ),
    },
    {
      key: "created",
      header: "Registro",
      render: (u) => (
        <span className="text-white/50 text-xs">
          {new Date(u.created_at).toLocaleDateString("es-CO")}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      <KPIDetailHeader
        icon={Users}
        title="Usuarios"
        subtitle="Detalle de usuarios de la plataforma"
        color="bg-purple-500/20"
        miniStats={
          stats
            ? [
                { label: "Total", value: stats.users.total },
                { label: "Nuevos", value: `+${stats.users.new_period}` },
                { label: "Onboarding OK", value: stats.users.onboarding_completed },
              ]
            : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 w-full justify-start">
          <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="with_org" className="text-xs">Con Org</TabsTrigger>
          <TabsTrigger value="no_org" className="text-xs">Sin Org</TabsTrigger>
          <TabsTrigger value="superadmin" className="text-xs">Superadmin</TabsTrigger>
        </TabsList>
      </Tabs>

      <KPIDetailFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, email u organizacion..."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/30 text-sm">
          Cargando usuarios...
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
