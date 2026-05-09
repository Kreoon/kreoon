import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Brain, Lightbulb, AlertTriangle, CheckCircle, Sparkles,
  Layers, Trophy, Zap, Calendar, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// METODO CAST (Alexander Cast): C-A-S-T = Conocer, Atraer, Seducir, Transformar
// Vista ejecutable del Playbook generado por el step "differentiation".
// Lee desde content_strategy.castPlaybook (nuevo) con fallback a esferaInsights (viejo).
// ============================================================

interface CastLayer {
  nombre?: string;
  pregunta_clave?: string;
  insight_principal?: string;
  nivel_conciencia_avatar?: string;
  descripcion_nivel?: string;
}

interface CastPlaybook {
  resumen_estrategico?: string;
  recomendacion_final?: string;
  capas_cast?: { C?: CastLayer; A?: CastLayer; S?: CastLayer; T?: CastLayer };
  acciones_inmediatas?: Array<{
    numero?: number;
    titulo?: string;
    capa_cast?: 'C' | 'A' | 'S' | 'T';
    descripcion?: string;
    como_hacerlo?: string;
    resultado_esperado?: string;
    esfuerzo?: string;
    impacto?: string;
    tiempo_implementacion?: string;
  }>;
  quick_wins?: Array<{
    titulo?: string;
    capa_cast?: string;
    esfuerzo?: string;
    impacto?: string;
    descripcion?: string;
  }>;
  riesgos_a_evitar?: Array<{
    riesgo?: string;
    por_que?: string;
    como_evitarlo?: string;
  }>;
  drivers_psicologicos?: Array<{
    driver?: string;
    por_que_funciona?: string;
    como_usarlo?: string;
    capa_cast?: string;
  }>;
  calendario_7_dias?: Array<{
    dia?: string;
    accion_principal?: string;
    capa_cast?: string;
    canal?: string;
    tipo_contenido?: string;
    hook_sugerido?: string;
  }>;
}

interface StrategicPlaybookTabProps {
  contentStrategy?: {
    castPlaybook?: CastPlaybook | null;
    esferaInsights?: any;
    executiveSummary?: any;
  } | null;
  // Props legacy (no usadas, mantenidas por compatibilidad de invocacion)
  avatarProfiles?: any;
  salesAnglesData?: any;
  marketResearch?: any;
}

const CAPA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  C: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/30' },
  A: { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/30' },
  S: { bg: 'bg-pink-500/15', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-500/30' },
  T: { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/30' },
};

function getCapaColors(capa?: string) {
  return CAPA_COLORS[capa || 'C'] || CAPA_COLORS.C;
}

export function StrategicPlaybookTab({ contentStrategy }: StrategicPlaybookTabProps) {
  const playbook = contentStrategy?.castPlaybook;

  // Empty state si aun no hay playbook generado
  if (!playbook || !playbook.resumen_estrategico) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Playbook del Metodo CAST</p>
        <p className="text-sm mt-2">Genera la investigacion para desbloquear tu estrategia ejecutable</p>
        <p className="text-xs mt-4 text-muted-foreground/70">
          C - Conocer | A - Atraer | S - Seducir | T - Transformar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── RESUMEN ESTRATEGICO ───────────────────────────────────────── */}
      <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-semibold">Estrategia Central</h2>
            <Badge variant="outline" className="ml-auto text-[10px] border-violet-500/40">
              Metodo CAST
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {playbook.resumen_estrategico}
          </p>
          {playbook.recomendacion_final && (
            <div className="mt-4 rounded-lg bg-violet-500/10 border border-violet-500/30 p-3">
              <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 mb-1 uppercase tracking-wide">
                Recomendacion principal
              </p>
              <p className="text-sm">{playbook.recomendacion_final}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CAPAS CAST ────────────────────────────────────────────────── */}
      {playbook.capas_cast && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">
              Metodo CAST aplicado a este producto
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['C', 'A', 'S', 'T'] as const).map((letra) => {
              const capa = playbook.capas_cast?.[letra];
              if (!capa) return null;
              const colors = getCapaColors(letra);
              return (
                <Card key={letra} className={cn('border', colors.border)}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                        colors.bg, colors.text,
                      )}>
                        {letra}
                      </span>
                      <span className="font-semibold text-sm">{capa.nombre || letra}</span>
                    </div>
                    {capa.pregunta_clave && (
                      <p className="text-xs text-muted-foreground italic">
                        {capa.pregunta_clave}
                      </p>
                    )}
                    {capa.insight_principal && (
                      <p className="text-xs leading-relaxed">
                        {capa.insight_principal}
                      </p>
                    )}
                    {capa.nivel_conciencia_avatar && (
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          Nivel: {capa.nivel_conciencia_avatar}
                        </Badge>
                        {capa.descripcion_nivel && (
                          <span className="text-[10px] text-muted-foreground">
                            {capa.descripcion_nivel}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ACCIONES INMEDIATAS ───────────────────────────────────────── */}
      {playbook.acciones_inmediatas && playbook.acciones_inmediatas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-green-500" />
            <h2 className="text-base font-semibold">
              Acciones Inmediatas (Proximos 7 dias)
            </h2>
          </div>
          <div className="space-y-3">
            {playbook.acciones_inmediatas.map((accion, idx) => {
              const colors = getCapaColors(accion.capa_cast);
              return (
                <Card key={accion.numero ?? idx} className="border-green-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                        {accion.numero ?? idx + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{accion.titulo}</span>
                          {accion.capa_cast && (
                            <Badge variant="outline" className={cn('text-[10px]', colors.border, colors.text)}>
                              Capa {accion.capa_cast}
                            </Badge>
                          )}
                          {accion.impacto && (
                            <Badge
                              className={cn(
                                'text-[10px]',
                                accion.impacto === 'alto'
                                  ? 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30'
                                  : accion.impacto === 'medio'
                                  ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30'
                                  : 'bg-muted text-muted-foreground'
                              )}
                              variant="outline"
                            >
                              Impacto {accion.impacto}
                            </Badge>
                          )}
                          {accion.esfuerzo && (
                            <Badge variant="outline" className="text-[10px]">
                              Esfuerzo {accion.esfuerzo}
                            </Badge>
                          )}
                          {accion.tiempo_implementacion && (
                            <span className="text-[10px] text-muted-foreground">
                              {accion.tiempo_implementacion}
                            </span>
                          )}
                        </div>
                        {accion.descripcion && (
                          <p className="text-xs text-muted-foreground">
                            {accion.descripcion}
                          </p>
                        )}
                        {accion.como_hacerlo && (
                          <div className="rounded-lg bg-muted/50 p-2.5">
                            <p className="text-[11px] font-semibold mb-1 uppercase tracking-wide text-muted-foreground">
                              Como hacerlo
                            </p>
                            <p className="text-xs">{accion.como_hacerlo}</p>
                          </div>
                        )}
                        {accion.resultado_esperado && (
                          <div className="flex items-start gap-1.5">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-green-700 dark:text-green-400">
                              {accion.resultado_esperado}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── QUICK WINS ─────────────────────────────────────────────────── */}
      {playbook.quick_wins && playbook.quick_wins.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h2 className="text-base font-semibold">
              Quick Wins - Bajo esfuerzo, Alto impacto
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {playbook.quick_wins.map((win, i) => {
              const colors = getCapaColors(win.capa_cast);
              return (
                <Card key={i} className="border-yellow-500/20">
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <Zap className="h-5 w-5 text-yellow-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{win.titulo}</p>
                        {win.descripcion && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {win.descripcion}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          {win.capa_cast && (
                            <Badge variant="outline" className={cn('text-[10px]', colors.border, colors.text)}>
                              Capa {win.capa_cast}
                            </Badge>
                          )}
                          {win.esfuerzo && (
                            <Badge variant="outline" className="text-[10px] bg-green-500/10">
                              Esfuerzo: {win.esfuerzo}
                            </Badge>
                          )}
                          {win.impacto && (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10">
                              Impacto: {win.impacto}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RIESGOS A EVITAR ───────────────────────────────────────────── */}
      {playbook.riesgos_a_evitar && playbook.riesgos_a_evitar.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-base font-semibold">Riesgos a Evitar</h2>
          </div>
          <div className="space-y-2">
            {playbook.riesgos_a_evitar.map((riesgo, i) => (
              <Card key={i} className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-3">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {riesgo.riesgo}
                  </p>
                  {riesgo.por_que && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Por que:</strong> {riesgo.por_que}
                    </p>
                  )}
                  {riesgo.como_evitarlo && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-green-700 dark:text-green-400">
                        {riesgo.como_evitarlo}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── DRIVERS PSICOLOGICOS ───────────────────────────────────────── */}
      {playbook.drivers_psicologicos && playbook.drivers_psicologicos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-purple-500" />
            <h2 className="text-base font-semibold">
              Drivers Psicologicos a Activar
            </h2>
          </div>
          <div className="space-y-3">
            {playbook.drivers_psicologicos.map((driver, i) => {
              const colors = getCapaColors(driver.capa_cast);
              return (
                <Card key={i} className="border-purple-500/20">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-purple-500" />
                      <span className="font-semibold text-sm">{driver.driver}</span>
                      {driver.capa_cast && (
                        <Badge variant="outline" className={cn('text-[10px] ml-auto', colors.border, colors.text)}>
                          Capa {driver.capa_cast}
                        </Badge>
                      )}
                    </div>
                    {driver.por_que_funciona && (
                      <p className="text-xs text-muted-foreground">
                        {driver.por_que_funciona}
                      </p>
                    )}
                    {driver.como_usarlo && (
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-[11px] font-semibold mb-1 uppercase tracking-wide text-muted-foreground">
                          Como usarlo
                        </p>
                        <p className="text-xs">{driver.como_usarlo}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CALENDARIO 7 DIAS ──────────────────────────────────────────── */}
      {playbook.calendario_7_dias && playbook.calendario_7_dias.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-cyan-500" />
            <h2 className="text-base font-semibold">
              Calendario de Accion - 7 Dias
            </h2>
          </div>
          <div className="space-y-2">
            {playbook.calendario_7_dias.map((dia, i) => {
              const colors = getCapaColors(dia.capa_cast);
              return (
                <Card key={i} className="border-cyan-500/20">
                  <CardContent className="p-3">
                    <div className="flex gap-3 items-start">
                      <div className="w-14 shrink-0 text-center">
                        <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{dia.dia}</p>
                        {dia.canal && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{dia.canal}</p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{dia.accion_principal}</p>
                        {dia.tipo_contenido && (
                          <p className="text-xs text-muted-foreground">
                            {dia.tipo_contenido}
                          </p>
                        )}
                        {dia.hook_sugerido && (
                          <p className="text-xs italic text-cyan-700 dark:text-cyan-300 mt-1">
                            "{dia.hook_sugerido}"
                          </p>
                        )}
                      </div>
                      {dia.capa_cast && (
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] shrink-0 self-start', colors.border, colors.text)}
                        >
                          {dia.capa_cast}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
