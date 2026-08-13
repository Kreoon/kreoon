import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Zap } from 'lucide-react';

interface ContentKpi {
  kpi?: string;
  como_medirlo?: string;
  meta?: string;
  trigger?: string;
}

interface ContentKpisTabProps {
  contentKpis?: ContentKpi[] | null;
}

/**
 * KPIs de Contenido — herencia del extinto `kpis_dashboard` (paso de negocio
 * eliminado el 2026-08-13): sobrevive solo el bloque de qué medir en el
 * CONTENIDO, con triggers if/then ejecutables. Vive en
 * `sales_angles_data.contentKpis`, generado junto con los creativos de video.
 */
export function ContentKpisTab({ contentKpis }: ContentKpisTabProps) {
  const kpis = contentKpis || [];

  if (kpis.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación para ver qué medir en tu contenido</p>
        <p className="text-sm mt-2">Se genera junto con los Creativos de Video</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-zinc-100">
          <BarChart3 className="h-4 w-4 text-sky-500" />
          Qué medir en tu contenido
        </h3>
        <p className="text-sm text-zinc-400">
          {kpis.length} métricas de contenido (no de negocio) con reglas if/then ejecutables:
          cuándo rotar un hook, cuándo escalar un formato.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kpis.map((k, idx) => (
          <Card key={idx} className="border-sky-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{k.kpi || `KPI ${idx + 1}`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {k.como_medirlo && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Cómo medirlo:</span> {k.como_medirlo}
                </p>
              )}
              {k.meta && (
                <p className="text-sm">
                  <Badge variant="outline" className="text-xs">Meta: {k.meta}</Badge>
                </p>
              )}
              {k.trigger && (
                <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded flex items-start gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs">{k.trigger}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
