import { Link } from "react-router-dom";
import { Instagram, Linkedin, Youtube, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const FOOTER_PRODUCT = [
  { label: "Para Marcas", to: "/unete/marcas" },
  { label: "Para Creadores", to: "/unete/talento" },
  { label: "Para Agencias", to: "/unete/organizaciones" },
  { label: "Marketplace", to: "/marketplace" },
  { label: "Precios", to: "/#pricing" },
];

const FOOTER_RESOURCES = [
  { label: "Blog", to: "/blog" },
  { label: "Portafolio", to: "/portafolio" },
  { label: "Calculadora UGC", to: "/calculadora-ugc" },
  { label: "Casos de éxito", to: "/casos-de-exito" },
];

const FOOTER_COMPANY = [
  { label: "Términos de servicio", to: "/legal/terms" },
  { label: "Privacidad", to: "/legal/privacy" },
  { label: "Uso aceptable", to: "/legal/acceptable-use" },
  { label: "DMCA", to: "/legal/dmca" },
  { label: "Cookies", to: "/legal/cookies" },
];

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com/kreoon", icon: Instagram },
  { label: "TikTok", href: "https://tiktok.com/@kreoon", icon: Video },
  { label: "LinkedIn", href: "https://linkedin.com/company/kreoon", icon: Linkedin },
  { label: "YouTube", href: "https://youtube.com/@kreoon", icon: Youtube },
];

function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-3 group", className)}>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-kreoon-purple-500/30 bg-gradient-to-br from-kreoon-purple-500/30 to-kreoon-purple-500/10">
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

interface PublicFooterProps {
  minimal?: boolean;
}

export function PublicFooter({ minimal = false }: PublicFooterProps) {
  if (minimal) {
    return (
      <footer className="border-t border-white/5 bg-kreoon-bg-secondary py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-kreoon-text-muted">
              © 2026 SICOMMER INT LLC. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/legal/terms" className="text-kreoon-text-muted hover:text-kreoon-purple-400">
                Términos
              </Link>
              <Link to="/legal/privacy" className="text-kreoon-text-muted hover:text-kreoon-purple-400">
                Privacidad
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-kreoon-bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
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

          {/* Producto */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Producto
            </h3>
            <ul className="space-y-2">
              {FOOTER_PRODUCT.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-kreoon-text-secondary hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Recursos
            </h3>
            <ul className="space-y-2">
              {FOOTER_RESOURCES.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-kreoon-text-secondary hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Legal
            </h3>
            <ul className="space-y-2">
              {FOOTER_COMPANY.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-kreoon-text-secondary hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="my-8 h-px w-full rounded-full bg-gradient-to-r from-transparent via-kreoon-purple-500/50 to-transparent"
          aria-hidden
        />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-kreoon-text-muted">
            © 2026 SICOMMER INT LLC. Todos los derechos reservados.
          </p>
          <div className="flex gap-6 text-sm">
            <Link to="/legal/terms" className="text-kreoon-text-muted hover:text-kreoon-purple-400">
              Términos
            </Link>
            <Link to="/legal/privacy" className="text-kreoon-text-muted hover:text-kreoon-purple-400">
              Privacidad
            </Link>
            <Link to="/legal/cookies" className="text-kreoon-text-muted hover:text-kreoon-purple-400">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
