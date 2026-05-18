import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  formatCurrency,
  AGING_BUCKET_LABELS,
  AGING_BUCKET_COLORS,
  AGING_CARD_STYLES,
  BUCKET_ORDER,
  type AgingRow,
  type AgingBucket,
  type PackageCurrency,
} from '@/lib/finance-format';
import { HelpTip } from './FinanceHelp';

interface AgingSummary {
  bucket: AgingBucket;
  total: number;
  count: number;
}

function useReceivablesAging(orgId: string) {
  return useQuery<AgingRow[]>({
    queryKey: ['receivables-aging', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_receivables_aging', { p_organization_id: orgId });
      if (error) throw error;
      return (data ?? []) as AgingRow[];
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

export function AgingSection({ orgId, selectedCurrency }: Props) {
  const { data: agingRows = [], isLoading } = useReceivablesAging(orgId);

  const filteredRows = useMemo(
    () => agingRows.filter(r => r.currency === selectedCurrency),
    [agingRows, selectedCurrency],
  );

  const overdueRows = useMemo(
    () => filteredRows.filter(r => r.aging_bucket !== 'current'),
    [filteredRows],
  );

  const summary = useMemo<AgingSummary[]>(() => {
    return BUCKET_ORDER.map(bucket => ({
      bucket,
      total: filteredRows.filter(r => r.aging_bucket === bucket).reduce((s, r) => s + r.pending_amount, 0),
      count: filteredRows.filter(r => r.aging_bucket === bucket).length,
    }));
  }, [filteredRows]);

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
          Calculando cartera...
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <div className="p-6 pb-4 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ¿Quién te debe y desde cuándo?
            <span className="text-sm font-normal text-white/40">— {selectedCurrency}</span>
            <HelpTip text="Aging = antigüedad de la deuda. Mientras más tiempo pase sin cobrar, más difícil es recuperar el dinero. Una deuda de más de 90 días suele considerarse incobrable." />
          </h3>
          <p className="text-white/40 text-sm">Cada deuda se ubica según cuántos días tiene de retraso. Verde = al día. Rojo = más de 60 días vencido.</p>
        </div>
      </div>

      <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        {summary.map(({ bucket, total, count }) => (
          <div
            key={bucket}
            className={`bg-gradient-to-br ${AGING_CARD_STYLES[bucket]} border rounded-lg p-4`}
          >
            <p className="text-white/50 text-xs mb-1">{AGING_BUCKET_LABELS[bucket]}</p>
            <p className="text-white font-bold text-sm leading-tight">
              {total > 0 ? formatCurrency(total, selectedCurrency) : '—'}
            </p>
            <p className="text-white/40 text-xs mt-1">{count} paquete{count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {overdueRows.length === 0 ? (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-green-300 text-sm font-medium">
              Cartera al corriente — todos los pagos están dentro del plazo
            </p>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-white/70">Cliente</TableHead>
              <TableHead className="text-white/70">Paquete</TableHead>
              <TableHead className="text-white/70 text-right">Pendiente</TableHead>
              <TableHead className="text-white/70">Vencimiento</TableHead>
              <TableHead className="text-white/70 text-center">Días vencido</TableHead>
              <TableHead className="text-white/70">Bucket</TableHead>
              <TableHead className="text-white/70 text-center">Risk score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overdueRows.map(row => (
              <TableRow key={row.package_id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white font-medium">{row.client_name}</TableCell>
                <TableCell className="text-white/70">{row.package_name}</TableCell>
                <TableCell className="text-right text-orange-400 font-semibold">
                  {formatCurrency(row.pending_amount, selectedCurrency)}
                </TableCell>
                <TableCell className="text-white/50 text-sm">
                  {row.due_date
                    ? format(new Date(row.due_date), 'dd MMM yyyy', { locale: es })
                    : <span className="text-white/30">—</span>
                  }
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-sm font-semibold ${row.days_overdue > 60 ? 'text-red-400' : row.days_overdue > 30 ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {row.days_overdue > 0 ? `+${row.days_overdue}d` : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs border ${AGING_BUCKET_COLORS[row.aging_bucket]}`}>
                    {AGING_BUCKET_LABELS[row.aging_bucket]}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-sm font-bold ${row.risk_score >= 80 ? 'text-red-400' : row.risk_score >= 50 ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {row.risk_score ?? '—'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
