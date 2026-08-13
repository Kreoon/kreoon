import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Zap, MessageSquare, Clock, Target, Lock } from 'lucide-react';
import type { AdnViral } from '@/types/research';

interface NichoViralTabProps {
  adnViral?: AdnViral | null;
}

/**
 * Nicho Viral — lo que funciona en el nicho del cliente, tal cual lo dejó el
 * motor de investigación real (research-engine). SOLO LECTURA: es evidencia
 * scrapeada, no algo que se edite ni se regenere desde aquí.
 */
export function NichoViralTab({ adnViral }: NichoViralTabProps) {
  const hooks = adnViral?.hooks_dominantes || [];
  const angulos = adnViral?.angulos_de_ads_ganadores || [];
  const gaps = adnViral?.gaps || [];
  const estructura = adnViral?.estructura_ganadora;
  const ctas = adnViral?.ctas;
  const duracion = adnViral?.duracion;

  const hasData = hooks.length > 0 || angulos.length > 0 || gaps.length > 0 || estructura || ctas || duracion;

  if (!hasData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Flame className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Todavía no hay investigación del nicho para este cliente</p>
        <p className="text-sm mt-2">Se genera junto con el ADN de Mercado, antes de la estrategia</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-zinc-100">
          <Lock className="h-3.5 w-3.5 text-zinc-500" />
          Lo que funciona en tu nicho ahora mismo (solo lectura)
        </h3>
        <p className="text-sm text-zinc-400">
          Evidencia real scrapeada por el motor de investigación: hooks dominantes, estructura ganadora
          y ángulos de ads que llevan más tiempo corriendo en tu nicho.
        </p>
      </div>

      {hooks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Hooks dominantes del nicho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hooks.map((h, idx) => (
              <div key={idx} className="p-3 bg-muted/40 rounded border">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium">{h.taxonomia}</p>
                  {typeof h.porcentaje_del_top === 'number' && (
                    <Badge variant="secondary" className="text-xs">{h.porcentaje_del_top}% del top</Badge>
                  )}
                </div>
                {h.por_que_funciona && <p className="text-xs text-muted-foreground mt-1">{h.por_que_funciona}</p>}
                {h.ejemplos && h.ejemplos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {h.ejemplos.slice(0, 3).map((ej, i) => (
                      <p key={i} className="text-xs italic text-zinc-400">
                        "{ej.texto}"{ej.url ? (
                          <a href={ej.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary not-italic hover:underline">
                            ver
                          </a>
                        ) : null}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {estructura && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Estructura ganadora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {estructura.descripcion && <p className="text-sm">{estructura.descripcion}</p>}
            {estructura.re_enganches_literales && estructura.re_enganches_literales.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Re-enganches literales</p>
                <div className="flex flex-wrap gap-1">
                  {estructura.re_enganches_literales.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-xs">"{r}"</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ctas && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">CTAs que usa el nicho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ctas.tipos_usados && ctas.tipos_usados.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ctas.tipos_usados.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
              )}
              {typeof ctas.gating_normalizado === 'boolean' && (
                <p className="text-xs text-muted-foreground">
                  {ctas.gating_normalizado ? 'El gating (comenta/DM para info) está normalizado en el nicho.' : 'El gating no es la norma en este nicho.'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {duracion && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                Duración que funciona
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {duracion.moda_segundos != null && <p>Moda: {duracion.moda_segundos}s</p>}
              {duracion.rango && <p className="text-muted-foreground">Rango: {duracion.rango}</p>}
              {duracion.mezcla_tutorial_vs_emocion && <p className="text-muted-foreground">{duracion.mezcla_tutorial_vs_emocion}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {angulos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Ángulos de ads ganadores
            </CardTitle>
            <CardDescription>Ordenados por evidencia real, no intuición</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {angulos.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-muted/30 rounded">
                <p className="text-sm">{a.angulo}</p>
                <div className="flex items-center gap-2 shrink-0">
                  {typeof a.dias_corriendo === 'number' && (
                    <Badge className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400">{a.dias_corriendo}d</Badge>
                  )}
                  {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">ver</a>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {gaps.length > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gaps de contenido — nadie los usa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {gaps.map((g, idx) => (
              <div key={idx} className="p-2 bg-background rounded border border-emerald-500/20">
                <p className="text-sm font-medium">{g.oportunidad}</p>
                {g.por_que_nadie_lo_usa && <p className="text-xs text-muted-foreground mt-1">{g.por_que_nadie_lo_usa}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
