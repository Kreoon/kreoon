import type { AdnViral } from '@/types/research';
import { humanizeHookTaxonomy } from './plainLanguage';

/**
 * Lo que funciona en el nicho del cliente: los ganchos que más se repiten
 * (con el video real de donde salieron), cuánto deben durar los videos, y
 * las oportunidades que nadie está aprovechando todavía.
 */
export function NicheInsightsContent({ adnViral }: { adnViral?: AdnViral | null }) {
  const hooks = adnViral?.hooks_dominantes ?? [];
  const gaps = adnViral?.gaps ?? [];
  const duracion = adnViral?.duracion;
  const hayDuracion = !!(duracion?.moda_segundos || duracion?.rango || duracion?.mezcla_tutorial_vs_emocion);

  if (!hooks.length && !gaps.length && !hayDuracion) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hemos terminado de ver qué está funcionando en tu nicho.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {hooks.length > 0 && (
        <section>
          <h4 className="text-base font-semibold mb-2">Lo que más engancha</h4>
          <div className="space-y-3">
            {hooks.map((hook, i) => (
              <div key={i} className="rounded-lg border bg-background p-3">
                <p className="text-sm font-medium">{humanizeHookTaxonomy(hook.taxonomia)}</p>
                {typeof hook.porcentaje_del_top === 'number' && hook.porcentaje_del_top > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Aparece en el {hook.porcentaje_del_top}% de lo que más funciona
                  </p>
                )}
                {hook.por_que_funciona && (
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {hook.por_que_funciona}
                  </p>
                )}
                {!!hook.ejemplos?.length && (
                  <ul className="mt-2 space-y-1.5">
                    {hook.ejemplos.map((ejemplo, j) => (
                      <li key={j} className="text-sm leading-relaxed">
                        <span className="italic">&ldquo;{ejemplo.texto}&rdquo;</span>
                        {ejemplo.url && (
                          <a
                            href={ejemplo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1.5 text-xs text-primary underline underline-offset-2 whitespace-nowrap"
                          >
                            Verlo
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {hayDuracion && (
        <section>
          <h4 className="text-base font-semibold mb-2">Cuánto deben durar tus videos</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {duracion?.moda_segundos ? `Lo que mejor funciona dura cerca de ${duracion.moda_segundos} segundos. ` : ''}
            {duracion?.rango ? `Rango típico: ${duracion.rango}.` : ''}
          </p>
          {duracion?.mezcla_tutorial_vs_emocion && (
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {duracion.mezcla_tutorial_vs_emocion}
            </p>
          )}
        </section>
      )}

      {gaps.length > 0 && (
        <section>
          <h4 className="text-base font-semibold mb-2">Oportunidades que nadie está aprovechando</h4>
          <ul className="space-y-2">
            {gaps.map((gap, i) => (
              <li key={i} className="text-sm leading-relaxed">
                <span className="font-medium">{gap.oportunidad}</span>
                {gap.por_que_nadie_lo_usa && (
                  <span className="text-muted-foreground"> — {gap.por_que_nadie_lo_usa}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
