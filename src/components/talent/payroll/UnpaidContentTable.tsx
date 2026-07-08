import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useClosureContentDetails } from '@/hooks/useTalentPayments';
import type { PayrollEntry } from '@/hooks/useTalentPayments';
import { formatCurrency } from './formatCurrency';

export function UnpaidContentTable({ items }: { items: PayrollEntry['items'] }) {
  const contentIds = items.map((i) => i.id);
  const { data: details = [], isLoading } = useClosureContentDetails(contentIds, true);

  const detailMap = new Map(details.map((d) => [d.id, d]));

  if (isLoading) {
    return (
      <div className="border-t border-border px-4 py-3 bg-muted/10 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando proyectos…
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-muted/10">
      {/* Cabecera */}
      <div className="grid grid-cols-[auto_1fr_1.2fr_1fr_auto] gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
        <span>Rol</span>
        <span>Proyecto</span>
        <span>Cliente</span>
        <span>Aprobado</span>
        <span className="text-right">Monto</span>
      </div>
      {items.map((item) => {
        const d = detailMap.get(item.id);
        return (
          <div
            key={item.id}
            className="grid grid-cols-[auto_1fr_1.2fr_1fr_auto] gap-2 px-4 py-2 text-xs border-b border-border/30 last:border-0 items-center"
          >
            {/* Rol */}
            <Badge variant="outline" className="text-[10px] shrink-0 w-fit">
              {item.role === 'creator' ? 'Creador' : 'Editor'}
            </Badge>

            {/* Proyecto */}
            <div className="min-w-0 flex items-center gap-1.5">
              {(d?.sequence_number ?? item.sequence_number) && (
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {d?.sequence_number ?? item.sequence_number}
                </span>
              )}
              <span className="truncate">{d?.title ?? item.title}</span>
            </div>

            {/* Cliente */}
            <span className="truncate text-muted-foreground">
              {d?.client_name ?? <span className="italic opacity-50">Sin cliente</span>}
            </span>

            {/* Aprobado */}
            <span className="text-muted-foreground whitespace-nowrap">
              {d?.approved_at
                ? format(new Date(d.approved_at), "d MMM yyyy", { locale: es })
                : <span className="italic opacity-50">—</span>}
            </span>

            {/* Monto */}
            <span className="font-semibold text-green-600 dark:text-green-400 text-right whitespace-nowrap">
              {formatCurrency(item.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
