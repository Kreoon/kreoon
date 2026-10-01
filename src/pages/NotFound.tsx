import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const POPULAR_LINKS = [
  { to: "/", label: "Inicio" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/portafolio", label: "Portafolio" },
  { to: "/pricing/creators", label: "Precios" },
  { to: "/auth", label: "Iniciar sesión" },
];

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center text-foreground">
      <p className="text-7xl font-bold text-primary" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        La página que buscas no existe o fue movida. Revisa la dirección o vuelve al inicio.
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Volver atrás
        </Button>
      </div>

      <nav aria-label="Páginas que podrían interesarte" className="mt-10">
        <p className="mb-3 text-sm text-muted-foreground">Páginas que podrían interesarte</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {POPULAR_LINKS.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
