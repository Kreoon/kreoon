import { formatCurrency } from './formatCurrency';
import { ClosureRow } from './ClosureRow';
import type { MonthlyClosureEntry } from './types';

export function ClosureGroup({
  entries,
  organizationId,
}: {
  entries: MonthlyClosureEntry[];
  organizationId: string;
}) {
  const first = entries[0];
  const total = entries.reduce((s, e) => s + e.payment.amount, 0);
  const hasProcessing = entries.some((e) => e.payment.status === 'processing');
  const initials = first.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`rounded-lg border overflow-hidden ${hasProcessing ? 'border-blue-400/40' : 'border-yellow-400/30'} bg-card`}>
      {/* Cabecera de usuario */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 border-b border-border">
        {first.avatar_url ? (
          <img src={first.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{first.full_name}</p>
          <p className="text-[10px] text-muted-foreground">{entries.length} pagos agrupados</p>
        </div>
        <span className={`text-sm font-bold ${hasProcessing ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
          {formatCurrency(total)}
        </span>
      </div>
      {/* Pagos individuales */}
      {entries.map((entry, i) => (
        <div key={entry.payment.id} className={i > 0 ? 'border-t border-border/50' : ''}>
          <ClosureRow entry={entry} organizationId={organizationId} hideIdentity />
        </div>
      ))}
    </div>
  );
}
