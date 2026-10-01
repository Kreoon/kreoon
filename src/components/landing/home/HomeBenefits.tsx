import { ArrowUpRight, Camera, Film, NotebookPen } from "lucide-react";
import { HomePicture } from "./HomePicture";

/**
 * «Un espacio para todo lo que sabes crear». Estructura asimétrica a propósito (una pieza grande,
 * una lavanda, una pequeña con acento): tres beneficios con lenguaje condicional, sin prometer
 * trabajos, pagos ni flujos comerciales cerrados. La vista previa es ilustrativa y está rotulada.
 */
export function HomeBenefits() {
  return (
    <section id="tu-espacio" aria-labelledby="tu-espacio-titulo" className="home-anchor bg-card/60 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 id="tu-espacio-titulo" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Un espacio para todo lo que sabes crear
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Kreoon reúne lo que necesitas para mostrar tu trabajo y avanzar a tu ritmo.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-12 lg:gap-6">
          {/* 1 · Pieza grande con vista previa de portafolio */}
          <article className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 sm:p-8 lg:col-span-7 lg:row-span-2">
            <h3 className="text-2xl font-bold tracking-tight">Tu trabajo, bien presentado</h3>
            <p className="mt-2 max-w-md text-muted-foreground">
              Organiza tu portafolio y compártelo cuando estés listo. Tú decides qué se muestra y cuándo, si esta función está habilitada en tu organización.
            </p>

            <div className="mt-6 grid items-end gap-4 sm:grid-cols-[1.2fr_1fr]">
              <div className="rounded-2xl border border-border bg-background p-4" role="img" aria-label="Vista ilustrativa de un portafolio con tres piezas: video, fotografía y texto">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Mi portafolio</span>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">Vista ilustrativa</span>
                </div>
                <div className="grid grid-cols-3 gap-2" aria-hidden>
                  {[
                    { Icon: Film, label: "Video", bg: "bg-accent" },
                    { Icon: Camera, label: "Foto", bg: "bg-[hsl(var(--brand-coral)/0.35)]" },
                    { Icon: NotebookPen, label: "Texto", bg: "bg-[hsl(var(--brand-mint))]" },
                  ].map(({ Icon, label, bg }) => (
                    <div key={label} className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl ${bg}`}>
                      <Icon className="h-5 w-5 text-foreground/70" />
                      <span className="text-[10px] font-medium text-foreground/70">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-[hsl(var(--brand-coral)/0.2)]">
                <HomePicture
                  name="detalle"
                  widths={[480, 800]}
                  ratio={4 / 3}
                  sizes="(min-width: 1024px) 260px, (min-width: 640px) 240px, 90vw"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>
          </article>

          {/* 2 · Lavanda */}
          <article className="rounded-[2rem] bg-accent p-6 text-foreground sm:p-8 lg:col-span-5">
            <h3 className="text-xl font-bold tracking-tight">Personas que hablan tu idioma</h3>
            <p className="mt-2 text-foreground/80">
              Comunidad, aprendizaje y colaboración con otros creadores, según las funciones habilitadas para tu organización.
            </p>
          </article>

          {/* 3 · Pequeña, con acento coral */}
          <article className="rounded-[2rem] border border-[hsl(var(--brand-coral)/0.5)] bg-[hsl(var(--brand-coral)/0.12)] p-6 lg:col-span-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold tracking-tight">Tu próximo paso, más claro</h3>
              <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-foreground/60" aria-hidden />
            </div>
            <p className="mt-2 text-sm text-foreground/80">
              Herramientas para ordenar tus ideas y avanzar en lo que haces, con las oportunidades que haya disponibles en tu organización.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
