import { cn } from '@/lib/utils';
import type { ResearchAd } from '@/types/research';

/**
 * Los anuncios que de verdad están funcionando: nadie paga un mes de pauta
 * por algo que no vende, así que "lleva X días corriendo" es la prueba.
 * Ordenados por días corriendo, tope de 6, los de 30+ días destacados.
 */

const DIAS_GANADOR = 30;
const MAX_ADS = 6;

function ordenarPorDiasCorriendo(ads: ResearchAd[]): ResearchAd[] {
  return [...ads].sort((a, b) => (b.dias_corriendo ?? 0) - (a.dias_corriendo ?? 0)).slice(0, MAX_ADS);
}

export function WinningAdsList({ ads }: { ads?: ResearchAd[] }) {
  const destacados = ads?.length ? ordenarPorDiasCorriendo(ads) : [];

  if (!destacados.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hemos podido leer los anuncios de tu gremio.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {destacados.map(ad => {
        const dias = ad.dias_corriendo ?? 0;
        const esGanador = dias >= DIAS_GANADOR;
        return (
          <a
            key={ad.id}
            href={ad.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium truncate">{ad.pagina || 'Un anuncio de tu gremio'}</p>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  esGanador
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                Lleva {dias} {dias === 1 ? 'día' : 'días'} corriendo
              </span>
            </div>
            {ad.texto && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {ad.texto}
              </p>
            )}
          </a>
        );
      })}
    </div>
  );
}
