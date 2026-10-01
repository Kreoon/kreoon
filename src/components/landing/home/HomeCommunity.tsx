import { HomePicture } from "./HomePicture";

/**
 * Franja editorial de comunidad. La fotografía es ilustrativa (generada con IA): no son miembros,
 * testimonios ni casos de éxito, y así se rotula. Sin testimonios inventados.
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
              alt="Tres personas creadoras colaboran alrededor de una cámara y un guion gráfico en un estudio luminoso. Imagen ilustrativa."
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <figcaption className="mt-2 px-2 text-xs text-muted-foreground">Imagen ilustrativa.</figcaption>
        </figure>

        <div className="relative z-10 rounded-[2rem] border border-border bg-card p-7 shadow-sm sm:p-9 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:self-end lg:mb-[-1.5rem]">
          <h2 id="comunidad-titulo" className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            Aquí hay espacio para tu forma de crear
          </h2>
          <p className="mt-3 text-muted-foreground">
            Cada persona crea distinto. Kreoon está pensado para que encuentres tu manera de mostrarlo y a otros con quienes compartirla.
          </p>
        </div>
      </div>
    </section>
  );
}
