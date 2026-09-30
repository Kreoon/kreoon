import * as React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Clock, Lock, SearchX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type RegistrationBlockedReason = "not_found" | "closed" | "inactive" | "no_context" | "error";

const COPY: Record<RegistrationBlockedReason, { icon: React.ElementType; title: string; body: (org?: string) => string }> = {
  not_found: {
    icon: SearchX,
    title: "No encontramos esta comunidad",
    body: () => "El enlace de inscripción no corresponde a ninguna organización. Revisa que esté completo o pídele uno nuevo a quien te invitó.",
  },
  closed: {
    icon: Lock,
    title: "Inscripción cerrada por ahora",
    body: (org) => `${org ?? "Esta organización"} no está recibiendo nuevos creadores en este momento. No creamos tu cuenta ni te enviamos a otra organización.`,
  },
  inactive: {
    icon: Clock,
    title: "Esta comunidad no está disponible",
    body: () => "La organización está inactiva temporalmente. Vuelve a intentarlo más adelante o contacta a quien te compartió el enlace.",
  },
  no_context: {
    icon: SearchX,
    title: "No pudimos identificar la organización",
    body: () => "Este dominio no tiene una organización de inscripción asociada. Usa el enlace de registro que te compartieron.",
  },
  error: {
    icon: AlertCircle,
    title: "No pudimos cargar la inscripción",
    body: () => "Hubo un problema de conexión. Tu información no se ha enviado; inténtalo de nuevo.",
  },
};

export function RegistrationStatusCard({
  reason,
  orgName,
  onRetry,
}: {
  reason: RegistrationBlockedReason;
  orgName?: string;
  onRetry?: () => void;
}) {
  const { icon: Icon, title, body } = COPY[reason];
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{body(orgName)}</p>
      <div className="flex w-full flex-col gap-2 pt-2">
        {reason === "error" && onRetry ? (
          <Button onClick={onRetry} className="h-12 w-full rounded-xl">
            Reintentar
          </Button>
        ) : null}
        <Button asChild variant="outline" className="h-12 w-full rounded-xl">
          <Link to="/auth">Ya tengo cuenta · Iniciar sesión</Link>
        </Button>
      </div>
    </div>
  );
}

export function RegistrationLoading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}
