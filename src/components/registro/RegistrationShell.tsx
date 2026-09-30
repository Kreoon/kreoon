import * as React from "react";
import { Link } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingContext";
import { cn } from "@/lib/utils";

interface RegistrationShellProps {
  children: React.ReactNode;
  /** Identidad de la organización (logo + nombre). La plataforma queda como respaldo. */
  orgName?: string;
  orgLogoUrl?: string | null;
  className?: string;
}

/**
 * Marco visual único del registro (móvil primero): una columna centrada, tarjeta de 24px,
 * identidad de la organización arriba y la plataforma como respaldo abajo.
 */
export function RegistrationShell({ children, orgName, orgLogoUrl, className }: RegistrationShellProps) {
  const { branding } = useBranding();
  const platformName = branding.platform_name || "Kreoon";
  const platformLogo = branding.logo_url || "/favicon.png";

  return (
    <div className="brand-surface min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-lg">
        <header className="flex items-center gap-3 py-4">
          {orgLogoUrl ? (
            <img src={orgLogoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <img src={platformLogo} alt="" className="h-9 w-9 rounded-xl object-cover" />
          )}
          <span className="text-base font-semibold tracking-tight">{orgName ?? platformName}</span>
        </header>

        <main className={cn("flex flex-1 flex-col justify-center", className)}>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">{children}</div>
        </main>

        <footer className="flex flex-col items-center gap-1 pt-6 text-center text-xs text-muted-foreground">
          <span>
            Con la tecnología de <span className="font-semibold text-foreground">{platformName}</span> · Conecta. Crea. Crece.
          </span>
          <span>
            ¿Ya tienes cuenta?{" "}
            <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
