/**
 * Interruptor global de notificaciones salientes (email y WhatsApp) para hacer pruebas sin escribirle a nadie.
 *
 *   Activar:    supabase secrets set NOTIFICATIONS_PAUSED=true
 *   Desactivar: supabase secrets set NOTIFICATIONS_PAUSED=false   (o unset)
 *
 * Con el interruptor activo, los envíos se omiten y se registran en los logs como «[notifications-paused]».
 * Los correos de acceso (confirmar cuenta, recuperar contraseña) NO se pausan: solo los recibe quien los pide.
 */
import { Resend } from "https://esm.sh/resend@4.0.0";

export function notificationsPaused(): boolean {
  return (Deno.env.get("NOTIFICATIONS_PAUSED") ?? "").trim().toLowerCase() === "true";
}

export function logPaused(channel: "email" | "whatsapp", detail: unknown): void {
  console.log(`[notifications-paused] ${channel} omitido`, JSON.stringify(detail)?.slice(0, 300));
}

function summarize(payload: unknown): unknown {
  const p = payload as { to?: unknown; subject?: unknown } | undefined;
  return { to: p?.to, subject: p?.subject };
}

/** Resend que no envía nada mientras el interruptor esté activo (misma forma de respuesta que el SDK) */
function pausedResend(): Resend {
  const ok = (payload: unknown) => {
    logPaused("email", summarize(payload));
    return Promise.resolve({ data: { id: "paused" }, error: null });
  };
  return {
    emails: { send: ok },
    batch: { send: (items: unknown[]) => { logPaused("email", { batch: items?.length }); return Promise.resolve({ data: { data: [] }, error: null }); } },
  } as unknown as Resend;
}

/** Sustituto de `new Resend(key)` que respeta el interruptor */
export function guardedResend(key: string | undefined, opts: { essential?: boolean } = {}): Resend {
  if (notificationsPaused() && !opts.essential) return pausedResend();
  return new Resend(key);
}
