import { ReactNode, useEffect, useState } from "react";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { getDeviceId } from "@/lib/deviceId";
import { AccessBlockedScreen } from "@/components/AccessBlockedScreen";

type GateState = "checking" | "allowed" | "blocked";

interface GateResponse {
  allowed: boolean;
  reason?: string | null;
}

const CACHE_KEY = "kreoon_access_gate";
const GATE_TIMEOUT_MS = 4000;

/**
 * Gate de acceso a nivel de aplicación. Al arrancar consulta la edge function
 * `access-gate` para verificar si la IP del visitante está bloqueada. Si lo está,
 * renderiza una pantalla de bloqueo total y NO monta el resto de la app (ni el
 * home ni /auth).
 *
 * Diseño:
 * - FAIL-OPEN: ante error o timeout se permite el acceso (el bloqueo de IP es
 *   anti-abuso, no la barrera de auth; el login lo protege Supabase Auth).
 * - Caché en sessionStorage: solo se consulta una vez por pestaña. Los bloqueos
 *   NO se cachean, para permitir recuperación inmediata al recargar tras un
 *   desbaneo.
 * - No incluye userId en el arranque (aún no hay sesión); la expulsión de un
 *   usuario baneado la maneja useAuth.fetchUserData.
 */
export function AccessGateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(CACHE_KEY) === "allowed") {
      setState("allowed");
      return;
    }

    let cancelled = false;

    const timeout = new Promise<GateResponse>((resolve) =>
      setTimeout(() => resolve({ allowed: true }), GATE_TIMEOUT_MS),
    );

    const check = invokeEdgeFunction<GateResponse>("access-gate", {
      body: { mode: "gate", deviceId: getDeviceId() },
    }).then(({ data, error }) => {
      // Fail-open ante error o respuesta vacía
      if (error || !data) return { allowed: true } as GateResponse;
      return data;
    });

    Promise.race([check, timeout])
      .then((result) => {
        if (cancelled) return;
        if (result.allowed === false) {
          setReason(result.reason ?? null);
          setState("blocked"); // no se cachea el bloqueo
        } else {
          sessionStorage.setItem(CACHE_KEY, "allowed");
          setState("allowed");
        }
      })
      .catch(() => {
        if (!cancelled) setState("allowed"); // fail-open
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (state === "blocked") {
    return <AccessBlockedScreen reason={reason} />;
  }

  return <>{children}</>;
}
