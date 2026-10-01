import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HomePicture } from "./HomePicture";

interface HomeClosingProps {
  onLogin: () => void;
}

/** Cierre lavanda con una pequeña composición flotante, más el footer con enlaces legales reales. */
export function HomeClosing({ onLogin }: HomeClosingProps) {
  return (
    <>
      <section aria-labelledby="cierre-titulo" className="px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 overflow-hidden rounded-[2rem] bg-accent px-6 py-12 text-foreground sm:px-12 sm:py-16 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 id="cierre-titulo" className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Hazle espacio a lo que puedes crear
            </h2>
            <Button asChild size="lg" className="mt-7 h-12 rounded-2xl px-7 text-base">
              <Link to="/registro">Crear mi cuenta</Link>
            </Button>
          </div>

          <div className="relative mx-auto hidden w-full max-w-[16rem] md:block" aria-hidden>
            <div
              className="home-float relative aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br from-background to-[hsl(var(--brand-coral)/0.3)] shadow-raised"
              style={{ ["--r" as string]: "3deg", ["--d" as string]: "0.6s" }}
            >
              <HomePicture
                name="persona-beauty"
                widths={[360, 540]}
                ratio={3 / 4}
                sizes="256px"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div
              className="home-float absolute -bottom-5 -left-10 aspect-[3/4] w-24 overflow-hidden rounded-2xl border-4 border-accent bg-card shadow-raised"
              style={{ ["--r" as string]: "-5deg", ["--d" as string]: "1.8s" }}
            >
              <HomePicture
                name="persona-viajes"
                widths={[240, 360]}
                ratio={3 / 4}
                sizes="96px"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div
              className="home-float absolute -right-6 top-6 rounded-2xl border border-border bg-card px-3 py-2 shadow-md"
              style={{ ["--r" as string]: "4deg", ["--d" as string]: "0.9s" }}
            >
              <p className="text-xs font-semibold">Tu espacio creativo</p>
              <p className="text-[10px] text-muted-foreground">Vista ilustrativa</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="" width={32} height={32} className="h-8 w-8 rounded-xl object-cover" />
            <span className="text-xl font-bold tracking-tight">kreoon</span>
          </div>
          <nav aria-label="Pie de página" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <button type="button" onClick={onLogin} className="min-h-11 font-medium text-primary underline-offset-4 hover:underline">
              Iniciar sesión
            </button>
            <Link to="/legal/terms_of_service" className="flex min-h-11 items-center text-muted-foreground hover:text-foreground">
              Términos
            </Link>
            <Link to="/legal/privacy_policy" className="flex min-h-11 items-center text-muted-foreground hover:text-foreground">
              Privacidad
            </Link>
            <Link to="/legal/cookie_policy" className="flex min-h-11 items-center text-muted-foreground hover:text-foreground">
              Cookies
            </Link>
          </nav>
          <p className="text-sm font-medium text-muted-foreground">Conecta. Crea. Crece.</p>
        </div>
      </footer>
    </>
  );
}
