import * as React from "react";
import { KreoonLogo } from "@/components/ui/kreoon-logo";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomeHeaderProps {
  onLogin: () => void;
}

const ANCHORS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#tu-espacio", label: "Tu espacio creativo" },
] as const;

/**
 * Header sticky de la home. Escritorio: logo, dos anclas reales, «Iniciar sesión» y CTA.
 * Móvil: solo logo, CTA y un botón de menú (disclosure) con las anclas y el acceso: nada de
 * comprimir varios enlaces en una fila.
 */
export function HomeHeader({ onLogin }: HomeHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const toggleRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-xl" aria-label="Kreoon, inicio">
          <KreoonLogo heightClass="h-9 sm:h-10" alt="Kreoon" eager />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {ANCHORS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {a.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onLogin} className="hidden h-11 rounded-xl px-4 md:inline-flex">
            Iniciar sesión
          </Button>
          <Button asChild className="h-11 rounded-xl px-4 sm:px-5">
            <Link to="/registro">Crear mi cuenta</Link>
          </Button>
          <Button
            ref={toggleRef}
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl md:hidden"
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
      </div>

      <div id="menu-movil" hidden={!open} className="border-t border-border/60 bg-background md:hidden">
        <nav aria-label="Menú" className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
          {ANCHORS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center rounded-xl px-2 text-base font-medium text-foreground"
            >
              {a.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogin();
            }}
            className="flex min-h-12 items-center rounded-xl px-2 text-left text-base font-medium text-primary"
          >
            Iniciar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}
