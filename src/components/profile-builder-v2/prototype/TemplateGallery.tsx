import { ArrowRight, Sparkles } from "lucide-react";
import { prepareTemplate } from "./prepareTemplate";
import { TEMPLATES, type PortfolioTemplate } from "./registry";

function TemplateCard({
  template,
  onSelect,
}: {
  template: PortfolioTemplate;
  onSelect: (id: string) => void;
}) {
  const srcDoc = prepareTemplate(template, template.tokens);

  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-violet-400 hover:shadow-xl"
    >
      {/* Mini-preview en vivo (escalado). En producción se usaría un thumbnail estático. */}
      <div className="relative h-56 w-full overflow-hidden bg-black">
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: "1440px",
            height: "1600px",
            transform: "scale(0.236)",
          }}
        >
          <iframe
            title={template.name}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin"
            className="h-[1600px] w-[1440px] border-0"
            scrolling="no"
          />
        </div>
        <span
          className="absolute right-3 top-3 h-5 w-5 rounded-full border-2 border-white/60"
          style={{ backgroundColor: template.accent }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-base font-semibold text-slate-900">
          {template.name}
        </p>
        <p className="text-sm text-slate-500">{template.description}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 opacity-0 transition-opacity group-hover:opacity-100">
          Usar esta plantilla
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

export function TemplateGallery({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center gap-2 text-sm font-medium text-violet-600">
            <Sparkles className="h-4 w-4" />
            Builder v3 · Plantillas
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Elige una plantilla para tu perfil
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Selecciona un diseño y personalízalo 100%: textos, imágenes,
            colores, secciones y elementos.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelect}
            />
          ))}

          {/* Marcador de las próximas plantillas (20+). */}
          <div className="flex h-full min-h-[20rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-400">
            <p className="text-sm font-medium">Próximamente más plantillas</p>
            <p className="mt-1 text-xs">
              Cada HTML que subas aparece aquí automáticamente.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
