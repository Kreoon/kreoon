import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreatorHomeProps {
  onLogin: () => void;
}

/**
 * Portada pública de Kreoon (claro de marca, móvil primero).
 * El alta pública es solo de creadores y vive en /registro: aquí solo se invita a entrar.
 */
export function CreatorHome({ onLogin }: CreatorHomeProps) {
  return (
    <div className="brand-surface relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-[3rem] bg-accent/70 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-[hsl(var(--brand-coral)/0.25)] blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Kreoon">
          <img src="/favicon.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
          <span className="text-2xl font-bold tracking-tight">kreoon</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={onLogin} className="rounded-xl">
            Iniciar sesión
          </Button>
        </nav>
      </header>

      <main className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-14">
        <section>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Una nueva etapa para crear
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Tu talento merece ser <span className="underline decoration-[hsl(var(--brand-coral))] decoration-4 underline-offset-8">visto.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Crea tu portafolio, conecta con marcas y crece con otros creadores.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2 text-sm">
            {["Ideas", "Personas", "Oportunidades"].map((t) => (
              <li key={t} className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="crea-cuenta" className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 id="crea-cuenta" className="text-2xl font-bold tracking-tight">
            Crea tu cuenta
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Tu próximo proyecto empieza aquí.</p>
          <div className="mt-6 space-y-3">
            <Button asChild size="lg" className="h-12 w-full rounded-2xl text-base">
              <Link to="/registro">
                Crear mi cuenta <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Con Google o con tu correo. Nada se publica sin tu permiso.
            </p>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <button type="button" onClick={onLogin} className="font-medium text-primary underline-offset-4 hover:underline">
              Inicia sesión
            </button>
          </p>
        </section>
      </main>

      <footer className="relative mx-auto w-full max-w-6xl px-4 pb-8 text-center text-sm font-medium text-muted-foreground sm:px-6 sm:text-right">
        Conecta. Crea. Crece.
      </footer>
    </div>
  );
}
