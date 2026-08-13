import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, Megaphone, ExternalLink, Flame, Ban } from 'lucide-react';
import { CompetitionAnalysisTab } from './CompetitionAnalysisTab';
import { DifferentiationTab } from './DifferentiationTab';
import type { ResearchAd, MarketGap, MarketDontCopy } from '@/types/research';

interface CompetitorAnalysis {
  competitors?: unknown[];
  // `unknown` obligaba a castear al renderizar; con Record el JSX ya no protesta
  // y sigue siendo agnóstico de la forma exacta que traiga el research.
  differentiation?: Record<string, unknown> | null;
}

interface MercadoTabProps {
  competitorAnalysis?: CompetitorAnalysis | null;
  /** `research_runs.result` del cliente (evidencia real: ADN Mercado + biblioteca de ads del gremio). */
  researchResult?: {
    adn_mercado?: { huecos_de_mercado?: MarketGap[]; que_no_copiar?: MarketDontCopy[] } | null;
    ads?: ResearchAd[];
  } | null;
}

/**
 * Mercado — fusiona competencia + diferenciación (generadas por producto, con
 * la evidencia scrapeada real como fuente) con los anuncios ganadores del
 * gremio (ADN Mercado, a nivel cliente/nicho — research-engine).
 */
export function MercadoTab({ competitorAnalysis, researchResult }: MercadoTabProps) {
  const competitors = competitorAnalysis?.competitors || [];
  const differentiation = competitorAnalysis?.differentiation;
  const winningAds = [...(researchResult?.ads || [])]
    .sort((a, b) => (b.dias_corriendo || 0) - (a.dias_corriendo || 0))
    .slice(0, 12);
  const gaps = researchResult?.adn_mercado?.huecos_de_mercado || [];
  const dontCopy = researchResult?.adn_mercado?.que_no_copiar || [];

  const hasAnything = competitors.length > 0 || !!differentiation || winningAds.length > 0 || gaps.length > 0;

  if (!hasAnything) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Swords className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver competencia y anuncios ganadores</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(competitors.length > 0 || differentiation) && (
        <div className="space-y-6">
          {competitors.length > 0 && <CompetitionAnalysisTab competitorAnalysis={{ competitors } as any} />}
          {differentiation ? <DifferentiationTab differentiation={differentiation as never} /> : null}
        </div>
      )}

      {gaps.length > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="h-4 w-4 text-emerald-500" />
              Huecos de mercado (nadie los ataca)
            </CardTitle>
            <CardDescription>Del ADN de Mercado — cruzado con lo que se scrapeó del nicho</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {gaps.map((g, idx) => (
              <div key={idx} className="p-3 bg-background rounded border border-emerald-500/20">
                <p className="text-sm font-medium">{g.hueco}</p>
                {g.por_que_esta_libre && <p className="text-xs text-muted-foreground mt-1">Por qué está libre: {g.por_que_esta_libre}</p>}
                {g.como_atacarlo && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Cómo atacarlo: {g.como_atacarlo}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {dontCopy.length > 0 && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              Qué NO copiar del gremio
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {dontCopy.map((d, idx) => (
              <Badge key={idx} variant="outline" className="text-red-600 border-red-300 bg-red-50">
                {d.practica}
                {d.razon ? <span className="ml-2 text-muted-foreground">→ {d.razon}</span> : null}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-zinc-100">
            <Megaphone className="h-4 w-4 text-amber-500" />
            Anuncios ganadores del gremio
          </h3>
          <p className="text-sm text-zinc-400">
            Anuncios reales de la biblioteca de Meta, activos hace más tiempo. Nadie paga un mes de pauta
            por un anuncio que no vende — los días corriendo son la señal reina.
          </p>
        </div>

        {winningAds.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Todavía no hay biblioteca de anuncios del gremio para este cliente.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {winningAds.map((ad) => (
              <Card key={ad.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{ad.pagina}</span>
                    {typeof ad.dias_corriendo === 'number' && (
                      <Badge className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
                        <Flame className="h-3 w-3 mr-1" />
                        {ad.dias_corriendo} días
                      </Badge>
                    )}
                  </div>
                  {ad.titulo && <p className="text-sm font-medium">{ad.titulo}</p>}
                  <p className="text-sm text-muted-foreground line-clamp-3">{ad.texto}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-wrap gap-1">
                      {(ad.plataformas || []).map((p, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{p}</Badge>
                      ))}
                    </div>
                    {ad.url && (
                      <a
                        href={ad.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                      >
                        Ver anuncio <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
