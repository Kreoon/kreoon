import { ShieldX } from "lucide-react";

interface AccessBlockedScreenProps {
  reason?: string | null;
}

const REASON_TEXT: Record<string, string> = {
  ip_blocked: "Tu conexión ha sido bloqueada por nuestro sistema de seguridad.",
  user_banned: "Tu cuenta ha sido suspendida.",
  email_blocked: "Este correo no está autorizado para acceder.",
  device_blocked:
    "Este dispositivo ha sido bloqueado por nuestro sistema de seguridad.",
};

/**
 * Pantalla de bloqueo total. Se renderiza en lugar de la aplicación cuando el
 * access-gate determina que el visitante (IP / cuenta) está bloqueado. No monta
 * router ni navegación: el usuario no puede llegar al home ni a /auth.
 */
export function AccessBlockedScreen({ reason }: AccessBlockedScreenProps) {
  const detail = (reason && REASON_TEXT[reason]) || REASON_TEXT.ip_blocked;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          Acceso bloqueado
        </h1>
        <p className="mb-6 text-muted-foreground">{detail}</p>
        <p className="text-sm text-muted-foreground">
          Si crees que se trata de un error, escríbenos a{" "}
          <a
            href="mailto:soporte@kreoon.com"
            className="font-medium text-primary underline"
          >
            soporte@kreoon.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
