import { Link } from "react-router-dom";
import { Camera, Film, NotebookPen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomePicture } from "./HomePicture";

/** Rostros de la franja junto al CTA: imágenes ilustrativas, no miembros ni testimonios. */
const FACES = ["cara-beauty", "cara-editor", "cara-gaming", "cara-viajes"] as const;

/** Fotografía secundaria flotante (otra persona, otra forma de crear). Se compone en la web, no en la imagen. */
function FloatPhoto({
  name,
  alt,
  rotate,
  delay,
  className,
}: {
  name: string;
  alt: string;
  rotate: string;
  delay: string;
  className: string;
}) {
  return (
    <div
      className={`home-float absolute aspect-[3/4] overflow-hidden rounded-2xl border-4 border-card bg-gradient-to-br from-accent to-[hsl(var(--brand-coral)/0.25)] shadow-raised ${className}`}
      style={{ ["--r" as string]: rotate, ["--d" as string]: delay }}
    >
      <HomePicture
        name={name}
        widths={[320, 480]}
        ratio={3 / 4}
        sizes="(min-width: 1024px) 176px, 144px"
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

/** Tarjeta flotante de ejemplo: marcada como ilustrativa, sin cifras ni nombres de personas. */
function PortfolioCard({ className }: { className?: string }) {
  return (
    <div
      className={`home-float rounded-2xl border border-border bg-card p-3 shadow-raised ${className ?? ""}`}
      style={{ ["--r" as string]: "3deg", ["--d" as string]: "1.2s" }}
      aria-hidden
    >
      <div className="mb-2 flex items-center justify-between gap-6">
        <span className="text-xs font-semibold text-foreground">Mi portafolio</span>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">Vista ilustrativa</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { Icon: Film, bg: "bg-accent" },
          { Icon: Camera, bg: "bg-[hsl(var(--brand-coral)/0.35)]" },
          { Icon: NotebookPen, bg: "bg-[hsl(var(--brand-mint))]" },
        ].map(({ Icon, bg }, i) => (
          <div key={i} className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
            <Icon className="h-5 w-5 text-foreground/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeHero() {
  return (
    <section aria-labelledby="hero-titulo" className="relative">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-24 lg:pt-14">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Un espacio para quienes crean
          </p>
          <h1 id="hero-titulo" className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Tu talento merece ser{" "}
            <span className="underline decoration-[hsl(var(--brand-coral))] decoration-4 underline-offset-8">visto.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Dale un lugar a tus ideas. Crea tu portafolio, conecta con otros creadores y descubre lo que puedes construir.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 rounded-2xl px-7 text-base">
              <Link to="/registro">Crear mi cuenta</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-2xl px-7 text-base">
              <a href="#como-funciona">Así funciona</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Empieza en UGC Colombia.</p>

          {/* Rostros cerca del primer CTA (también en móvil). Imágenes ilustrativas. */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2.5" aria-hidden>
              {FACES.map((face) => (
                <span key={face} className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-background bg-accent">
                  <HomePicture name={face} widths={[80, 160]} ratio={1} sizes="40px" alt="" className="h-full w-full object-cover" />
                </span>
              ))}
            </div>
            <p className="text-sm leading-snug text-muted-foreground">
              Un espacio pensado para creadores de todos los estilos.
              <span className="block text-xs">Imágenes ilustrativas.</span>
            </p>
          </div>
        </div>

        {/* Composición editorial: retrato principal + dos fotografías secundarias + tarjeta de ejemplo. */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent via-background to-[hsl(var(--brand-coral)/0.25)]">
            <HomePicture
              name="hero"
              widths={[480, 720, 960]}
              ratio={3 / 4}
              sizes="(min-width: 1024px) 480px, (min-width: 640px) 448px, 92vw"
              alt="Retrato de una creadora de contenido en su estudio de casa: sonríe con calma a la cámara, con otra cámara en un trípode detrás. Imagen ilustrativa."
              priority
              className="absolute inset-0 h-full w-full object-cover"
              objectPosition="55% 6%"
            />
          </div>

          <FloatPhoto
            name="hero-ugc"
            alt="Una creadora ríe mientras graba un video con su teléfono sobre un trípode. Imagen ilustrativa."
            rotate="-4deg"
            delay="0s"
            className="-bottom-6 -left-2 w-28 sm:-left-8 sm:w-36 lg:-left-14 lg:w-44"
          />
          <FloatPhoto
            name="hero-video"
            alt="Un videógrafo graba con una cámara y un teléfono montados en un soporte. Imagen ilustrativa."
            rotate="4deg"
            delay="1.4s"
            className="-top-4 -right-2 hidden w-28 sm:block sm:-right-6 sm:w-32 lg:-right-8 lg:w-36"
          />
          <PortfolioCard className="absolute -bottom-6 right-2 hidden sm:block lg:-right-6" />
          <p
            className="home-float absolute left-3 top-4 hidden rounded-xl bg-[hsl(var(--brand-mint))] px-3 py-1.5 text-sm font-medium italic text-[hsl(var(--brand-mint-foreground))] shadow-md sm:block"
            style={{ ["--r" as string]: "-4deg", ["--d" as string]: "2.4s" }}
            aria-hidden
          >
            Mis ideas también cuentan
          </p>
        </div>
      </div>
    </section>
  );
}
