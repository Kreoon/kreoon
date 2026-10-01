import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KreoonButton } from "@/components/ui/kreoon";
import { REGISTRATION_BASE } from "@/lib/registration/paths";

const NAV_LINKS = [
  { label: "Inicio", to: "/" },
  { label: "Para Creadores", to: REGISTRATION_BASE },
  { label: "Portafolio", to: "/portafolio" },
  { label: "Blog", to: "/blog" },
  { label: "Marketplace", to: "/marketplace" },
];

interface PublicHeaderProps {
  onOpenAuth?: (tab: "login" | "register") => void;
  transparent?: boolean;
}

function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-3 group", className)}>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-kreoon-purple-500/30 bg-gradient-to-br from-kreoon-purple-500/30 to-kreoon-purple-500/10 shadow-kreoon-glow-sm transition-all group-hover:shadow-kreoon-glow">
        <img src="/favicon.png" alt="Kreoon" className="h-10 w-10 object-cover" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold tracking-tight text-xl text-foreground">KREOON</span>
        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">
          AI Platform
        </span>
      </div>
    </Link>
  );
}

// Sólida por defecto: transparente sobre los fondos animados oscuros de /portafolio y /blog era ilegible (QA 2026-10-01)
export function PublicHeader({ onOpenAuth, transparent = false }: PublicHeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleAuth = (tab: "login" | "register") => {
    // El alta pública es solo de creadores y vive en la ruta canónica /registro.
    if (tab === "register") {
      navigate(REGISTRATION_BASE);
    } else if (onOpenAuth) {
      onOpenAuth(tab);
    } else {
      navigate("/auth");
    }
  };

  return (
    <>
      <motion.header
        initial={false}
        animate={{
          backgroundColor: scrolled || !transparent
            ? "hsl(var(--background) / 0.95)"
            : "hsl(var(--background) / 0)",
          backdropFilter: scrolled || !transparent ? "blur(16px)" : "blur(0px)",
          borderBottomColor: scrolled || !transparent
            ? "hsl(var(--border))"
            : "hsl(var(--border) / 0)",
        }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 right-0 top-0 z-50 border-b border-transparent"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0 shrink-0">
            <Logo />
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-6 lg:gap-8 lg:flex">
            <Link
              to="/"
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                location.pathname === "/" ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              Inicio
            </Link>
            {NAV_LINKS.slice(1).map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "text-sm transition-colors hover:text-foreground",
                  location.pathname === item.to ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <KreoonButton variant="ghost" size="md" onClick={() => handleAuth("login")}>
              Iniciar sesión
            </KreoonButton>
            <KreoonButton variant="primary" size="md" onClick={() => handleAuth("register")}>
              Crear cuenta de creador
            </KreoonButton>
          </div>

          <button
            type="button"
            aria-label="Abrir menú"
            className="flex h-10 w-10 items-center justify-center rounded-sm text-muted-foreground hover:bg-kreoon-purple-500/10 hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-foreground/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-background border-l border-border shadow-2xl lg:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <Logo />
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  className="flex h-10 w-10 items-center justify-center rounded-sm text-muted-foreground hover:bg-kreoon-purple-500/10 hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-4 overflow-y-auto">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-sm px-4 py-3 text-muted-foreground hover:bg-kreoon-purple-500/10 hover:text-foreground"
                >
                  Inicio
                </Link>

                <div className="border-t border-border/50 pt-2 mt-2">
                  {NAV_LINKS.slice(1).map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-sm px-4 py-3 text-muted-foreground hover:bg-kreoon-purple-500/10 hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                  <KreoonButton
                    variant="ghost"
                    className="w-full justify-center"
                    onClick={() => {
                      handleAuth("login");
                      setMobileOpen(false);
                    }}
                  >
                    Iniciar sesión
                  </KreoonButton>
                  <KreoonButton
                    variant="primary"
                    className="w-full justify-center"
                    onClick={() => {
                      handleAuth("register");
                      setMobileOpen(false);
                    }}
                  >
                    Crear cuenta de creador
                  </KreoonButton>
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
