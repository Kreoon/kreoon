import { cn } from "@/lib/utils";

interface KreoonLogoProps {
  /** Altura del logo en clases Tailwind (ej: "h-8", "h-16") */
  heightClass?: string;
  className?: string;
  alt?: string;
  /**
   * Sobre qué fondo va:
   * - "auto": letras negras en tema claro y blancas en tema oscuro
   * - "light": siempre sobre fondo claro (letras negras)
   * - "dark": siempre sobre fondo oscuro (letras blancas)
   */
  variant?: "auto" | "light" | "dark";
  /** Carga inmediata (cabeceras visibles al abrir la página) */
  eager?: boolean;
}

const LOGO_ON_LIGHT = "/brand/logo-claro.png";
const LOGO_ON_DARK = "/brand/logo-oscuro.png";

/** Logo completo de Kreoon (símbolo + KREOON + «by UGC Colombia»), marca 2026. */
export function KreoonLogo({
  heightClass = "h-8",
  className,
  alt = "KREOON",
  variant = "auto",
  eager = false,
}: KreoonLogoProps) {
  const common = {
    alt,
    loading: eager ? ("eager" as const) : ("lazy" as const),
    decoding: "async" as const,
  };

  if (variant !== "auto") {
    return (
      <img
        {...common}
        src={variant === "dark" ? LOGO_ON_DARK : LOGO_ON_LIGHT}
        className={cn(heightClass, "w-auto object-contain", className)}
      />
    );
  }

  return (
    <>
      <img {...common} src={LOGO_ON_LIGHT} className={cn(heightClass, "w-auto object-contain dark:hidden", className)} />
      <img {...common} alt="" aria-hidden="true" src={LOGO_ON_DARK} className={cn(heightClass, "hidden w-auto object-contain dark:block", className)} />
    </>
  );
}
