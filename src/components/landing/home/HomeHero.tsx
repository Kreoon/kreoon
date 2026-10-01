import { Link } from "react-router-dom";
import { Camera, Film, NotebookPen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomePicture } from "./HomePicture";

/** Tarjeta flotante de ejemplo: marcada como ilustrativa, sin cifras ni nombres de personas. */
function PortfolioCard({ className }: { className?: string }) {
  return (
    <div
      className={`home-float rounded-2xl border border-border bg-card p-3 shadow-lg ${className ?? ""}`}
      style={{ ["--r" as string]: "-3deg", ["--d" as string]: "0s" }}
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
          <div key={i} className={`flex h-14 w-14 items-center justify-center rounded-xl ${bg}`}>
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
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-24 lg:pt-14">
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
        </div>

        {/* Composición editorial: fotografía ilustrativa + tarjetas flotantes de ejemplo. */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent via-background to-[hsl(var(--brand-coral)/0.25)] lg:aspect-[4/5]">
            <HomePicture
              name="hero"
              widths={[480, 720, 960]}
              ratio={3 / 4}
              sizes="(min-width: 1024px) 480px, (min-width: 640px) 448px, 92vw"
              alt="Una persona creadora de contenido graba un proyecto en su estudio de casa, con luz natural. Imagen ilustrativa."
              priority
              className="absolute inset-0 h-full w-full object-cover"
              objectPosition="60% 30%"
            />
          </div>

          <PortfolioCard className="absolute -bottom-5 left-3 sm:-left-4 lg:-left-10" />

          <div
            className="home-float absolute -top-3 right-3 hidden rounded-2xl border border-border bg-card px-3 py-2 shadow-lg sm:block lg:-right-6"
            style={{ ["--r" as string]: "3deg", ["--d" as string]: "1.2s" }}
            aria-hidden
          >
            <p className="text-xs font-semibold text-foreground">Ideas, guiones y tableros</p>
            <p className="text-[10px] text-muted-foreground">Vista ilustrativa</p>
          </div>

          <p
            className="home-float absolute -right-1 bottom-12 hidden rotate-[-4deg] rounded-xl bg-[hsl(var(--brand-mint))] px-3 py-1.5 text-sm font-medium italic text-[hsl(var(--brand-mint-foreground))] shadow-md sm:block lg:-right-5"
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
