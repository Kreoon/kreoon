import type { ReadableSection } from './plainLanguage';

/**
 * Pinta las secciones ya traducidas a lenguaje de cliente.
 * Nunca recibe JSON crudo: eso lo resuelve `plainLanguage.ts`.
 */
export function ReadableSections({ sections }: { sections: ReadableSection[] }) {
  if (!sections.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay nada escrito aquí. Te avisamos en cuanto esté listo.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map(section => (
        <section key={section.id}>
          <h4 className="text-base font-semibold mb-2">{section.title}</h4>
          <div className="space-y-3">
            {section.blocks.map((block, i) => (
              <div key={i}>
                {block.label && (
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    {block.label}
                  </p>
                )}
                {block.text && (
                  <p className="text-sm leading-relaxed break-words">{block.text}</p>
                )}
                {block.items && (
                  <ul className="space-y-1">
                    {block.items.map((item, j) => (
                      <li key={j} className="text-sm leading-relaxed flex gap-2 break-words">
                        <span className="text-muted-foreground shrink-0">·</span>
                        <span className="min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Fichas: cada elemento con su título y sus datos separados,
                    en vez de un párrafo corrido con todo dentro. */}
                {block.cards && (
                  <div className="space-y-3">
                    {block.cards.map((card, j) => (
                      <div
                        key={j}
                        className="rounded-lg border bg-muted/30 p-3 space-y-2"
                      >
                        <p className="text-sm font-medium leading-snug break-words">
                          {card.title}
                        </p>
                        {card.fields.length > 0 && (
                          <dl className="grid gap-1.5">
                            {card.fields.map((field, k) => (
                              <div key={k} className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
                                <dt className="text-xs font-medium text-muted-foreground">
                                  {field.label}
                                </dt>
                                <dd className="text-sm leading-relaxed break-words min-w-0">
                                  {field.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    ))}
                    {!!block.hiddenCount && (
                      <p className="text-xs text-muted-foreground">
                        Y {block.hiddenCount} más. Los verás todos cuando pasemos a producción.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
