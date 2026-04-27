import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, Users, Building2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { KreoonButton } from "@/components/ui/kreoon";

const NAV_LINKS = [
  { label: "Inicio", to: "/" },
  { label: "Portafolio", to: "/portafolio" },
  { label: "Blog", to: "/blog" },
  { label: "Marketplace", to: "/marketplace" },
];

const SOLUTIONS_DROPDOWN = [
  { label: "Para Talento", to: "/unete/talento", icon: Users, desc: "Creadores y editores" },
  { label: "Para Marcas", to: "/unete/marcas", icon: Building2, desc: "Empresas y startups" },
  { label: "Para Agencias", to: "/unete/organizaciones", icon: Briefcase, desc: "Agencias y equipos" },
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
        <span className="font-bold tracking-tight text-xl text-white">KREOON</span>
        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-kreoon-purple-400">
          AI Platform
        </span>
      </div>
    </Link>
  );
}

function SolutionsDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-kreoon-text-secondary transition-colors hover:text-white"
      >
        Soluciones
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2"
          >
            <div className="w-64 rounded-lg border border-white/10 bg-kreoon-bg-secondary/95 p-2 shadow-xl backdrop-blur-xl">
              {SOLUTIONS_DROPDOWN.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-kreoon-purple-500/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-kreoon-purple-500/10 text-kreoon-purple-400">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-kreoon-text-muted">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PublicHeader({ onOpenAuth, transparent = true }: PublicHeaderProps) {
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
    if (onOpenAuth) {
      onOpenAuth(tab);
    } else {
      navigate(tab === "login" ? "/auth" : "/register");
    }
  };

  return (
    <>
      <motion.header
        initial={false}
        animate={{
          backgroundColor: scrolled || !transparent
            ? "rgba(10, 10, 15, 0.95)"
            : "rgba(10, 10, 15, 0)",
          backdropFilter: scrolled || !transparent ? "blur(16px)" : "blur(0px)",
          borderBottomColor: scrolled || !transparent
            ? "rgba(148, 163, 184, 0.1)"
            : "rgba(148, 163, 184, 0)",
        }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 right-0 top-0 z-50 border-b border-transparent"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0 shrink-0">
            <Logo />
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-6 lg:gap-8 md:flex">
            <Link
              to="/"
              className={cn(
                "text-sm transition-colors hover:text-white",
                location.pathname === "/" ? "text-white" : "text-kreoon-text-secondary"
              )}
            >
              Inicio
            </Link>
            <SolutionsDropdown />
            {NAV_LINKS.slice(1).map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "text-sm transition-colors hover:text-white",
                  location.pathname === item.to ? "text-white" : "text-kreoon-text-secondary"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <KreoonButton variant="ghost" size="md" onClick={() => handleAuth("login")}>
              Iniciar sesión
            </KreoonButton>
            <KreoonButton variant="primary" size="md" onClick={() => handleAuth("register")}>
              Comenzar gratis
            </KreoonButton>
          </div>

          <button
            type="button"
            aria-label="Abrir menú"
            className="flex h-10 w-10 items-center justify-center rounded-sm text-kreoon-text-secondary hover:bg-kreoon-purple-500/10 hover:text-white md:hidden"
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
              className="fixed inset-0 z-50 bg-black/60 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-kreoon-bg-secondary border-l border-kreoon-border shadow-2xl md:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-kreoon-border px-4">
                <Logo />
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  className="flex h-10 w-10 items-center justify-center rounded-sm text-kreoon-text-secondary hover:bg-kreoon-purple-500/10 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-4 overflow-y-auto">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-sm px-4 py-3 text-kreoon-text-secondary hover:bg-kreoon-purple-500/10 hover:text-white"
                >
                  Inicio
                </Link>

                <div className="border-t border-kreoon-border/50 pt-2 mt-2">
                  <p className="px-4 py-2 text-xs uppercase tracking-wider text-kreoon-text-muted">
                    Soluciones
                  </p>
                  {SOLUTIONS_DROPDOWN.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-sm px-4 py-3 text-kreoon-text-secondary hover:bg-kreoon-purple-500/10 hover:text-white"
                    >
                      <item.icon className="h-5 w-5 text-kreoon-purple-400" />
                      <div>
                        <p className="text-sm">{item.label}</p>
                        <p className="text-xs text-kreoon-text-muted">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="border-t border-kreoon-border/50 pt-2 mt-2">
                  {NAV_LINKS.slice(1).map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-sm px-4 py-3 text-kreoon-text-secondary hover:bg-kreoon-purple-500/10 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-kreoon-border pt-4">
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
                    Comenzar gratis
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
