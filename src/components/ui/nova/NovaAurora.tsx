import { cn } from "@/lib/utils";

interface NovaAuroraProps {
  intensity?: "subtle" | "normal" | "intense";
  className?: string;
}

/**
 * NovaAurora - Efecto de aurora boreal para fondos
 *
 * Usa solo CSS para animaciones, sin JavaScript.
 * Las 3 capas crean un efecto de aurora suave y premium.
 *
 * @example
 * <div className="relative min-h-screen">
 *   <NovaAurora intensity="normal" />
 *   <div className="relative z-10">Content here</div>
 * </div>
 */
export function NovaAurora({ intensity = "normal", className }: NovaAuroraProps) {
  return (
    <div
      className={cn(
        "nova-aurora",
        intensity === "subtle" && "nova-aurora--subtle",
        intensity === "intense" && "nova-aurora--intense",
        className
      )}
      aria-hidden="true"
    >
      <div className="nova-aurora-layer-1" />
      <div className="nova-aurora-layer-2" />
      <div className="nova-aurora-layer-3" />
    </div>
  );
}

/**
 * NovaMeshBg - Fondo con gradientes mesh estáticos
 *
 * Más liviano que aurora, ideal para secciones secundarias.
 */
export function NovaMeshBg({ className }: { className?: string }) {
  return (
    <div
      className={cn("nova-mesh-bg", className)}
      aria-hidden="true"
    />
  );
}

/**
 * NovaPageWrapper - Wrapper de página con fondo Nova
 *
 * Incluye aurora y mesh background automáticamente.
 */
interface NovaPageWrapperProps {
  children: React.ReactNode;
  showAurora?: boolean;
  auroraIntensity?: "subtle" | "normal" | "intense";
  className?: string;
}

export function NovaPageWrapper({
  children,
  showAurora = true,
  auroraIntensity = "normal",
  className,
}: NovaPageWrapperProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen nova-bg-void",
        className
      )}
    >
      {showAurora && <NovaAurora intensity={auroraIntensity} />}
      <NovaMeshBg />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default NovaAurora;
