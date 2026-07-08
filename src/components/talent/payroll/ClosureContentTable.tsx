import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useClosureContentDetails } from '@/hooks/useTalentPayments';
import type { ClosureContentDetail } from '@/hooks/useTalentPayments';
import { formatCurrency } from './formatCurrency';

export function ClosureContentTable({ contentIds, userId }: { contentIds: string[]; userId: string }) {
  const { data: items = [], isLoading } = useClosureContentDetails(contentIds, true);

  if (isLoading) {
    return (
      <div className="border-t border-border px-4 py-3 bg-muted/10 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando proyectos…
      </div>
    );
  }

  // Expande cada item en una fila por rol del usuario (evita sumar creator + editor)
  const rows: Array<ClosureContentDetail & { role: 'creator' | 'editor'; roleAmount: number }> = [];
  for (const item of items) {
    const isCreator = item.creator_id === userId;
    const isEditor  = item.editor_id  === userId;
    if (isCreator && (item.creator_payment ?? 0) > 0)
      rows.push({ ...item, role: 'creator', roleAmount: item.creator_payment! });
    if (isEditor && (item.editor_payment ?? 0) > 0)
      rows.push({ ...item, role: 'editor', roleAmount: item.editor_payment! });
    // Fallback: usuario no identificado como creator/editor (pago manual sin content_ids limpios)
    if (!isCreator && !isEditor)
      rows.push({ ...item, role: 'creator', roleAmount: (item.creator_payment ?? 0) + (item.editor_payment ?? 0) });
  }

  return (
    <div className="border-t border-border bg-muted/10">
      {/* Cabecera */}
      <div className="grid grid-cols-[auto_1fr_1.5fr_1fr_auto] gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
        <span>Rol</span>
        <span>Proyecto</span>
        <span>Cliente</span>
        <span>Aprobado</span>
        <span className="text-right">Monto</span>
      </div>
      {rows.map((item, idx) => (
        <div
          key={`${item.id}-${item.role}-${idx}`}
          className="grid grid-cols-[auto_1fr_1.5fr_1fr_auto] gap-2 px-4 py-2 text-xs border-b border-border/30 last:border-0 items-center"
        >
          {/* Rol */}
          <Badge variant="outline" className="text-[10px] shrink-0 w-fit">
            {item.role === 'creator' ? 'Creador' : 'Editor'}
          </Badge>

          {/* Proyecto */}
          <div className="min-w-0">
            {item.sequence_number && (
              <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{item.sequence_number}</span>
            )}
            <span className="truncate">{item.title}</span>
          </div>

          {/* Cliente */}
          <span className="truncate text-muted-foreground">
            {item.client_name ?? <span className="italic opacity-50">Sin cliente</span>}
          </span>

          {/* Fecha aprobado */}
          <span className="text-muted-foreground whitespace-nowrap">
            {item.approved_at
              ? format(new Date(item.approved_at), "d MMM yyyy", { locale: es })
              : <span className="italic opacity-50">—</span>}
          </span>

          {/* Monto — solo la parte del usuario en este rol */}
          <span className="font-semibold text-right whitespace-nowrap">
            {formatCurrency(item.roleAmount)}
          </span>
        </div>
      ))}
    </div>
  );
}
