import { useMemo } from 'react';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  formatCurrency,
  marginColor,
  marginBadgeClass,
  type ProfitabilityRow,
  type PackageCurrency,
} from '@/lib/finance-format';
import { HelpTip } from './FinanceHelp';

function usePackageProfitability(orgId: string) {
  return useQuery<ProfitabilityRow[]>({
    queryKey: ['package-profitability', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_package_profitability', { p_organization_id: orgId });
      if (error) throw error;
      return (data ?? []) as ProfitabilityRow[];
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

interface Props {
  orgId: string;
  selectedCurrency: PackageCurrency;
}

export function ProfitabilitySection({ orgId, selectedCurrency }: Props) {
  const { data: rows = [], isLoading } = usePackageProfitability(orgId);

  const filteredRows = useMemo(
    () => rows
      .filter(r => r.currency === selectedCurrency)
      .sort((a, b) => b.gross_margin_pct - a.gross_margin_pct),
    [rows, selectedCurrency],
  );

  const withContent = useMemo(() => filteredRows.filter(r => r.content_count > 0), [filteredRows]);
  const withoutContent = useMemo(() => filteredRows.filter(r => r.content_count === 0), [filteredRows]);

  const top3Best  = useMemo(() => withContent.slice(0, 3), [withContent]);
  const top3Worst = useMemo(() => [...withContent].reverse().slice(0, 3), [withContent]);

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
          Calculando rentabilidad...
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <div className="p-6 pb-4 flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-purple-400 shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ¿Qué campañas dejan plata?
            <span className="text-sm font-normal text-white/40">— {selectedCurrency}</span>
            <HelpTip text="Por cada campaña te muestra: cuánto vendiste, cuánto pagaste a creadores y editores, y cuánto te quedó. Verde = ganancia. Rojo = pérdida. Sirve para decidir qué clientes te conviene mantener." />
          </h3>
          <p className="text-white/40 text-sm">
            Margen real = lo que vendiste − lo que pagaste a creadores/editores − otros costos
          </p>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="px-6 pb-6">
          <p className="text-white/30 text-sm">Sin paquetes activos en {selectedCurrency}</p>
        </div>
      ) : (
        <>
          {withoutContent.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-300 text-sm font-medium">
                    {withoutContent.length} paquete{withoutContent.length > 1 ? 's' : ''} sin proyectos vinculados
                  </p>
                  <p className="text-yellow-300/60 text-xs mt-0.5">
                    Asigna el campo "Paquete" en cada proyecto del kanban para ver su rentabilidad real.
                  </p>
                </div>
              </div>
            </div>
          )}

          {withContent.length >= 2 && (
            <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Más rentables</p>
                <div className="space-y-2">
                  {top3Best.map((row, idx) => (
                    <div
                      key={row.package_id}
                      className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-green-400 text-xs font-bold shrink-0">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate flex items-center gap-1.5">
                            <span className="font-medium opacity-50 shrink-0">
                              #{String(row.campaign_number ?? 0).padStart(4, '0')}
                            </span>
                            {row.package_name}
                          </p>
                          <p className="text-white/40 text-xs truncate">{row.client_name}</p>
                        </div>
                      </div>
                      <span className="text-green-300 text-sm font-bold shrink-0 ml-2">
                        {row.gross_margin_pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">Menos rentables</p>
                <div className="space-y-2">
                  {top3Worst.map((row, idx) => (
                    <div
                      key={row.package_id}
                      className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-red-400 text-xs font-bold shrink-0">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate flex items-center gap-1.5">
                            <span className="font-medium opacity-50 shrink-0">
                              #{String(row.campaign_number ?? 0).padStart(4, '0')}
                            </span>
                            {row.package_name}
                          </p>
                          <p className="text-white/40 text-xs truncate">{row.client_name}</p>
                        </div>
                      </div>
                      <span className="text-red-300 text-sm font-bold shrink-0 ml-2">
                        {row.gross_margin_pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/70">Paquete</TableHead>
                <TableHead className="text-white/70">Cliente</TableHead>
                <TableHead className="text-white/70 text-center">Proyectos</TableHead>
                <TableHead className="text-white/70 text-right">Valor paquete</TableHead>
                <TableHead className="text-white/70 text-right">Costo talento</TableHead>
                <TableHead className="text-white/70 text-right">Otros costos</TableHead>
                <TableHead className="text-white/70 text-right">Costos ext.</TableHead>
                <TableHead className="text-white/70 text-right">Margen $</TableHead>
                <TableHead className="text-white/70 text-center">Margen %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map(row => {
                const noContent = row.content_count === 0;
                const external = row.external_costs ?? 0;
                return (
                  <TableRow
                    key={row.package_id}
                    className={`border-white/10 hover:bg-white/5 ${noContent ? 'opacity-50' : ''}`}
                  >
                    <TableCell className="text-white font-medium">
                      <span className="flex items-center gap-2">
                        <span className="font-medium opacity-50 shrink-0">
                          #{String(row.campaign_number ?? 0).padStart(4, '0')}
                        </span>
                        {row.package_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-white/70">{row.client_name}</TableCell>
                    <TableCell className="text-center">
                      {noContent ? (
                        <span className="flex items-center justify-center gap-1 text-yellow-400/70 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          Sin vincular
                        </span>
                      ) : (
                        <span className="text-white/60 text-xs">
                          {row.content_count}/{row.content_quantity}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {formatCurrency(row.total_value, selectedCurrency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.talent_cost > 0
                        ? <span className="text-orange-300">{formatCurrency(row.talent_cost, selectedCurrency)}</span>
                        : <span className="text-white/25">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {row.other_costs > 0
                        ? <span className="text-white/60">{formatCurrency(row.other_costs, selectedCurrency)}</span>
                        : <span className="text-white/25">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {external > 0
                        ? <span className="text-purple-300">{formatCurrency(external, selectedCurrency)}</span>
                        : <span className="text-white/25">—</span>
                      }
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${row.gross_margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {noContent
                        ? <span className="text-white/25">—</span>
                        : formatCurrency(row.gross_margin, selectedCurrency)
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      {noContent ? (
                        <span className="text-white/25 text-xs">—</span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${marginBadgeClass(row.gross_margin_pct)}`}>
                          <span className={marginColor(row.gross_margin_pct)}>
                            {row.gross_margin_pct.toFixed(1)}%
                          </span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </Card>
  );
}
