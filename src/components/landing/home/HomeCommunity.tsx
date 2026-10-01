import { HomePicture } from "./HomePicture";

/** Retratos por actividad: cada persona tiene su propio estilo, entorno y forma de crear. */
const PEOPLE = [
  {
    name: "persona-bienestar",
    label: "Bienestar",
    alt: "Una creadora de bienestar y estilo de vida sostiene una taza en su sala luminosa y mira a la cámara. Imagen ilustrativa.",
    offset: "",
  },
  {
    name: "persona-gastro",
    label: "Gastronomía",
    alt: "Una creadora de gastronomía y viajes fotografía un plato con una cámara compacta en una cocina rústica. Imagen ilustrativa.",
    offset: "sm:translate-y-8",
  },
  {
    name: "persona-foto",
    label: "Foto y video",
    alt: "Un creador sonríe mientras sostiene una cámara y un teléfono en un estudio con luz natural. Imagen ilustrativa.",
    offset: "",
  },
] as const;

/**
 * Franja editorial de comunidad. Las fotografías son ilustrativas (generadas con IA): no son miembros,
 * testimonios ni casos de éxito, y así se rotula. Sin nombres ni testimonios inventados.
 */
export function HomeCommunity() {
  return (
    <section aria-labelledby="comunidad-titulo" className="py-8 sm:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-12 lg:gap-0">
        <figure className="lg:col-span-8 lg:col-start-1 lg:row-start-1">
          <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent via-background to-[hsl(var(--brand-mint)/0.7)]">
            <HomePicture
              name="comunidad"
              widths={[640, 1024, 1600]}
              ratio={16 / 9}
              sizes="(min-width: 1024px) 760px, 92vw"
              alt="Tres personas creadoras colaboran en una producción: una opera la cámara, otra señala la pantalla y otra revisa el guion gráfico. Imagen ilustrativa."
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <figcaption className="mt-2 px-2 text-xs text-muted-foreground">Imagen ilustrativa.</figcaption>
        </figure>

        <div className="relative z-10 rounded-[2rem] border border-border bg-card p-7 shadow-soft sm:p-9 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:mb-[-1.5rem] lg:self-end">
          <h2 id="comunidad-titulo" className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            Aquí hay espacio para tu forma de crear
          </h2>
          <p className="mt-3 text-muted-foreground">
            Cada persona crea distinto. Kreoon está pensado para que encuentres tu manera de mostrarlo y a otros con quienes compartirla.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-14 w-full max-w-6xl px-4 sm:px-6 sm:pb-8">
        <ul className="grid grid-cols-3 gap-3 sm:gap-6" aria-label="Distintas formas de crear">
          {PEOPLE.map((p) => (
            <li key={p.name} className={p.offset}>
              <figure className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-background to-[hsl(var(--brand-coral)/0.2)] shadow-soft sm:rounded-3xl">
                <HomePicture
                  name={p.name}
                  widths={[320, 480]}
                  ratio={3 / 4}
                  sizes="(min-width: 1152px) 360px, 30vw"
                  alt={p.alt}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <figcaption className="absolute bottom-2 left-2 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-medium text-foreground sm:bottom-3 sm:left-3 sm:text-xs">
                  {p.label}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="mt-3 px-1 text-xs text-muted-foreground">Imágenes ilustrativas de distintas formas de crear.</p>
      </div>
    </section>
  );
}
