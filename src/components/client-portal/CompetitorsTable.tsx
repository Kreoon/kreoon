import type { MarketCompetitor } from '@/types/research';

/**
 * Tu competencia, en tarjetas apiladas (no una tabla ancha: en el celular
 * una tabla de verdad se sale de la pantalla). Solo los tres números que un
 * cliente necesita para entender a su competencia de un vistazo.
 */

const formateadorSeguidores = new Intl.NumberFormat('es', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function formatSeguidores(valor: number | null | undefined): string {
  if (typeof valor !== 'number' || valor <= 0) return '—';
  return formateadorSeguidores.format(valor);
}

function formatEngagement(valor: number | null | undefined): string {
  if (typeof valor !== 'number' || valor <= 0) return '—';
  return `${valor.toFixed(1)}%`;
}

export function CompetitorsTable({ competidores }: { competidores?: MarketCompetitor[] }) {
  if (!competidores?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hemos podido leer a tu competencia.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {competidores.map((c, i) => (
        <div key={`${c.handle}-${i}`} className="rounded-lg border bg-background p-3">
          <p className="text-sm font-medium truncate">@{c.handle}</p>
          {c.posicionamiento && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {c.posicionamiento}
            </p>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-sm font-semibold leading-none">{formatSeguidores(c.seguidores)}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">Seguidores</p>
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{c.frecuencia_real || '—'}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">Cada cuánto publica</p>
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{formatEngagement(c.engagement_medio)}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">Interacción</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
