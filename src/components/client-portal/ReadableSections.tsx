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
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
