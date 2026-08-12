import type { Content, ContentStatus } from '@/types/database';

/**
 * Paso 5: solo lectura. Lee los estados reales del board y los traduce a
 * cinco casillas que un cliente entiende. Sin barras inventadas: el número
 * grande es "cuántos videos ya están listos de cuántos hay en total".
 */

const BUCKETS: { id: string; label: string; statuses: ContentStatus[] }[] = [
  { id: 'guion', label: 'En guion', statuses: ['draft', 'script_pending', 'script_approved'] },
  { id: 'grabando', label: 'Grabando', statuses: ['assigned', 'recording', 'recorded'] },
  { id: 'editando', label: 'Editando', statuses: ['editing', 'corrected'] },
  { id: 'revisar', label: 'Para que lo veas', statuses: ['review', 'delivered', 'issue'] },
  { id: 'listo', label: 'Listos', statuses: ['approved', 'paid', 'archived'] },
];

export function ProductionSummary({ content }: { content: Content[] }) {
  const counts = BUCKETS.map(bucket => ({
    ...bucket,
    count: content.filter(c => bucket.statuses.includes(c.status as ContentStatus)).length,
  }));

  const total = counts.reduce((sum, b) => sum + b.count, 0);
  const done = counts.find(b => b.id === 'listo')?.count ?? 0;

  if (total === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-medium mb-3">
        {done} de {total} {total === 1 ? 'video listo' : 'videos listos'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {counts.map(bucket => (
          <div
            key={bucket.id}
            className="rounded-lg border bg-background p-3 text-center"
          >
            <p className="text-xl font-semibold leading-none">{bucket.count}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{bucket.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
