import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Instagram, Linkedin, Youtube, Video, ChevronDown, Users, Building2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { KreoonButton } from "@/components/ui/kreoon";

export interface LandingLayoutProps {
  children: React.ReactNode;
  onOpenAuth: (tab: "login" | "register") => void;
}

const NAV_LINKS = [
  { label: "Inicio", to: "/" as const },
  { label: "Características", href: "#features" },
  { label: "Cómo funciona", href: "#how-it-works" },
  { label: "Portafolio", to: "/portafolio" as const },
  { label: "Blog", to: "/blog" as const },
  { label: "Precios", href: "#pricing" },
  { label: "Marketplace", to: "/marketplace" as const },
] as const;

const SOLUTIONS_DROPDOWN = [
  { label: "Para Talento", to: "/unete/talento", icon: Users, desc: "Creadores y editores" },
  { label: "Para Marcas", to: "/unete/marcas", icon: Building2, desc: "Empresas y startups" },
  { label: "Para Agencias", to: "/unete/organizaciones", icon: Briefcase, desc: "Agencias y equipos" },
];

const FOOTER_PRODUCT = [
  { label: "Para Marcas", href: "#" },
  { label: "Para Creadores", href: "#" },
  { label: "Para Editores", href: "#" },
  { label: "Live Shopping", href: "#" },
  { label: "Pricing", href: "#pricing" },
];

const FOOTER_RESOURCES = [
  { label: "Blog (próximamente)", href: "#" },
  { label: "Guías", href: "#" },
  { label: "API Docs (próximamente)", href: "#" },
  { label: "Estado del sistema", href: "#" },
];

const FOOTER_COMPANY = [
  { label: "Sobre nosotros", href: "#" },
  { label: "Contacto", href: "#" },
  { label: "Trabaja con nosotros", href: "#" },
  { label: "Términos de servicio", href: "/legal/terms" },
  { label: "Privacidad", href: "/legal/privacy" },
  { label: "Uso aceptable", href: "/legal/acceptable-use" },
  { label: "DMCA", href: "/legal/dmca" },
];

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com/kreoon", icon: Instagram },
  { label: "TikTok", href: "https://tiktok.com/@kreoon", icon: Video },
  { label: "LinkedIn", href: "https://linkedin.com/company/kreoon", icon: Linkedin },
  { label: "YouTube", href: "https://youtube.com/@kreoon", icon: Youtube },
];

function Logo({ className }: { className?: string }) {
  return (
    <a
      href="#hero"
      className={cn("flex items-center gap-3 group", className)}
      onClick={(e) => {
        const el = document.getElementById("hero");
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth" });
        }
      }}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-kreoon-purple-500/30 bg-gradient-to-br from-kreoon-purple-500/30 to-kreoon-purple-500/10 shadow-kreoon-glow-sm transition-all group-hover:shadow-kreoon-glow">
        <img
          src="/favicon.png"
          alt="Kreoon"
          className="h-10 w-10 object-cover"
        />
      </div>
      <div className="flex flex-col">
        <span className="font-bold tracking-tight text-xl text-white">
          KREOON
        </span>
        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-kreoon-purple-400">
          AI Platform
        </span>
      </div>
    </a>
  );
}

function NavLink({
  item,
}: {
  item: (typeof NAV_LINKS)[number];
}) {
  if ("to" in item) {
    return (
      <Link
        to={item.to}
        className="text-sm text-kreoon-text-secondary transition-colors hover:text-white"
      >
        {item.label}
      </Link>
    );
  }
  return (
    <a
      href={item.href}
      className="text-sm text-kreoon-text-secondary transition-colors hover:text-white"
      onClick={(e) => {
        const id = item.href.slice(1);
        const el = document.getElementById(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth" });
        }
      }}
    >
      {item.label}
    </a>
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
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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

export function LandingLayout({ children, onOpenAuth }: LandingLayoutProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative z-10 min-h-screen bg-transparent">
      {/* Navbar */}
      <motion.header
        initial={false}
        animate={{
          backgroundColor: scrolled
            ? "rgba(10, 10, 15, 0.8)"
            : "rgba(10, 10, 15, 0)",
          backdropFilter: scrolled ? "blur(16px)" : "blur(0px)",
          borderBottomColor: scrolled
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

          {/* Desktop nav - centrado */}
          <nav className="hidden flex-1 items-center justify-center gap-6 lg:gap-8 md:flex">
            <NavLink item={NAV_LINKS[0]} />
            <SolutionsDropdown />
            {NAV_LINKS.slice(1).map((item) => (
              <NavLink key={item.label} item={item} />
            ))}
          </nav>

          {/* Desktop buttons - derecha */}
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <KreoonButton
              variant="ghost"
              size="md"
              onClick={() => onOpenAuth("login")}
            >
              Iniciar sesión
            </KreoonButton>
            <KreoonButton
              variant="primary"
              size="md"
              onClick={() => onOpenAuth("register")}
            >
              Comenzar gratis
            </KreoonButton>
          </div>

          {/* Mobile menu button */}
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
              aria-hidden
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
                {/* Inicio */}
                <div onClick={() => setMobileOpen(false)}>
                  <Link
                    to="/"
                    className="block rounded-sm px-4 py-3 text-kreoon-text-secondary hover:bg-kreoon-purple-500/10 hover:text-white"
                  >
                    Inicio
                  </Link>
                </div>

                {/* Soluciones - Expandido en móvil */}
                <div className="border-t border-kreoon-border/50 pt-2 mt-2">
                  <p className="px-4 py-2 text-xs uppercase tracking-wider text-kreoon-text-muted">
                    Soluciones
                  </p>
                  {SOLUTIONS_DROPDOWN.map((item) => (
                    <div key={item.to} onClick={() => setMobileOpen(false)}>
                      <Link
                        to={item.to}
                        className="flex items-center gap-3 rounded-sm px-4 py-3 text-kreoon-text-secondary hover:bg-kreoon-purple-500/10 hover:text-white"
                      >
                        <item.icon className="h-5 w-5 text-kreoon-purple-400" />
                        <div>
                          <p className="text-sm">{item.label}</p>
                          <p className="text-xs text-kreoon-text-muted">{item.desc}</p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Resto de links */}
                <div className="border-t border-kreoon-border/50 pt-2 mt-2">
                {NAV_LINKS.slice(1).map((item) => (
                  <div key={item.label} onClick={() => setMobileOpen(false)}>
                    {"to" in item ? (
                      <Link
                        to={item.to}
                        className="block rounded-sm px-4 py-3 text-kreoon-text-secondary hover:bg-kreoon-purple-500/10 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="block rounded-sm px-4 py-3 text-kreoon-text-secondary hover:bg-kreoon-purple-500/10 hover:text-white"
                        onClick={(e) => {
                          const id = item.href.slice(1);
                          const el = document.getElementById(id);
                          if (el) {
                            e.preventDefault();
                            el.scrollIntoView({ behavior: "smooth" });
                          }
                        }}
                      >
                        {item.label}
                      </a>
                    )}
                  </div>
                ))}
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-kreoon-border pt-4">
                  <KreoonButton
                    variant="ghost"
                    className="w-full justify-center"
                    onClick={() => {
                      onOpenAuth("login");
                      setMobileOpen(false);
                    }}
                  >
                    Iniciar sesión
                  </KreoonButton>
                  <KreoonButton
                    variant="primary"
                    className="w-full justify-center"
                    onClick={() => {
                      onOpenAuth("register");
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

      {/* Main */}
      <main className="scroll-smooth pt-16">{children}</main>

      {/* Footer */}
      <footer className="bg-kreoon-bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Col 1 - Marca */}
            <div className="space-y-4">
              <Logo className="inline-flex" />
              <p className="max-w-[220px] text-sm text-kreoon-text-secondary">
                La plataforma de contenido colaborativo para LATAM
              </p>
              <div className="flex gap-3">
                {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-sm border border-kreoon-border text-kreoon-text-secondary transition-colors hover:border-kreoon-purple-400/50 hover:text-kreoon-purple-400"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2 - Producto */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                Producto
              </h3>
              <ul className="space-y-2">
                {FOOTER_PRODUCT.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm text-kreoon-text-secondary transition-colors hover:text-white"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 - Recursos */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                Recursos
              </h3>
              <ul className="space-y-2">
                {FOOTER_RESOURCES.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm text-kreoon-text-secondary transition-colors hover:text-white"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4 - Empresa */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                Empresa
              </h3>
              <ul className="space-y-2">
                {FOOTER_COMPANY.map(({ label, href }) => (
                  <li key={label}>
                    {href.startsWith("/") ? (
                      <Link
                        to={href}
                        className="text-sm text-kreoon-text-secondary transition-colors hover:text-white"
                      >
                        {label}
                      </Link>
                    ) : (
                      <a
                        href={href}
                        className="text-sm text-kreoon-text-secondary transition-colors hover:text-white"
                      >
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Línea divisoria con gradiente */}
          <div
            className="my-8 h-px w-full rounded-full bg-gradient-to-r from-transparent via-kreoon-purple-500/50 to-transparent"
            aria-hidden
          />

          {/* Bottom bar */}
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-kreoon-text-muted">
              © 2026 SICOMMER INT LLC. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                to="/legal/terms"
                className="text-kreoon-text-muted transition-colors hover:text-kreoon-purple-400"
              >
                Términos
              </Link>
              <Link
                to="/legal/privacy"
                className="text-kreoon-text-muted transition-colors hover:text-kreoon-purple-400"
              >
                Privacidad
              </Link>
              <Link
                to="/legal/cookies"
                className="text-kreoon-text-muted transition-colors hover:text-kreoon-purple-400"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
