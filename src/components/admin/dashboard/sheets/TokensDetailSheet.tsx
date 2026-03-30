import { useState, useMemo } from "react";
import { Brain } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPIDetailHeader } from "./shared/KPIDetailHeader";
import { KPIDetailFilters } from "./shared/KPIDetailFilters";
import { KPIDetailTable, type TableColumn } from "./shared/KPIDetailTable";
import type { AdminAIStats, AdminAIModuleUsage } from "@/types/admin-dashboard.types";
import { formatLargeNumber, formatCurrency } from "@/hooks/useAdminDashboard";

interface TokensByModuleRow {
  module: string;
  calls: number;
  tokens: number;
  cost_usd: number;
}

interface TokensByProviderRow {
  provider: string;
  model: string;
  calls: number;
  cost_usd: number;
}

interface TokensDetailSheetProps {
  aiStats?: AdminAIStats;
}

export function TokensDetailSheet({ aiStats }: TokensDetailSheetProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("module");

  const moduleData = useMemo(() => {
    if (!aiStats?.by_module) return [];
    let list = [...aiStats.by_module];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.module.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.tokens - a.tokens);
  }, [aiStats, search]);

  const providerData = useMemo(() => {
    if (!aiStats?.by_provider) return [];
    let list = [...aiStats.by_provider];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.provider.toLowerCase().includes(q) || p.model.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.calls - a.calls);
  }, [aiStats, search]);

  const moduleColumns: TableColumn<TokensByModuleRow>[] = [
    {
      key: "module",
      header: "Modulo",
      render: (m) => <span className="font-medium text-white capitalize">{m.module.replace(/-/g, " ")}</span>,
    },
    {
      key: "calls",
      header: "Llamadas",
      render: (m) => <span className="text-white/60">{formatLargeNumber(m.calls)}</span>,
    },
    {
      key: "tokens",
      header: "Tokens",
      render: (m) => <span className="text-white/60">{formatLargeNumber(m.tokens)}</span>,
    },
    {
      key: "cost",
      header: "Costo",
      render: (m) => <span className="text-orange-400">{formatCurrency(m.cost_usd)}</span>,
    },
  ];

  const providerColumns: TableColumn<TokensByProviderRow>[] = [
    {
      key: "provider",
      header: "Proveedor",
      render: (p) => <span className="font-medium text-white capitalize">{p.provider}</span>,
    },
    {
      key: "model",
      header: "Modelo",
      render: (p) => <span className="text-white/60 text-xs">{p.model}</span>,
    },
    {
      key: "calls",
      header: "Llamadas",
      render: (p) => <span className="text-white/60">{formatLargeNumber(p.calls)}</span>,
    },
    {
      key: "cost",
      header: "Costo",
      render: (p) => <span className="text-orange-400">{formatCurrency(p.cost_usd)}</span>,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      <KPIDetailHeader
        icon={Brain}
        title="Tokens IA"
        subtitle="Uso y costos de IA por modulo y proveedor"
        color="bg-orange-500/20"
        miniStats={
          aiStats
            ? [
                { label: "Total Tokens", value: formatLargeNumber(aiStats.tokens.total_combined) },
                { label: "Costo", value: formatCurrency(aiStats.costs.total_usd) },
                { label: "Llamadas", value: formatLargeNumber(aiStats.calls.total) },
                { label: "Tasa exito", value: `${aiStats.calls.success_rate}%` },
              ]
            : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 w-full justify-start">
          <TabsTrigger value="module" className="text-xs">Por Modulo</TabsTrigger>
          <TabsTrigger value="provider" className="text-xs">Por Proveedor</TabsTrigger>
        </TabsList>
      </Tabs>

      <KPIDetailFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={tab === "module" ? "Buscar modulo..." : "Buscar proveedor..."}
      />

      {tab === "module" ? (
        <KPIDetailTable
          data={moduleData}
          columns={moduleColumns}
          getRowKey={(m, i) => `${m.module}-${i}`}
          emptyMessage="Sin datos de modulos"
        />
      ) : (
        <KPIDetailTable
          data={providerData}
          columns={providerColumns}
          getRowKey={(p, i) => `${p.provider}-${p.model}-${i}`}
          emptyMessage="Sin datos de proveedores"
        />
      )}
    </div>
  );
}
