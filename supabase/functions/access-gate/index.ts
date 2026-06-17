// ============================================================================
// KREOON Access Gate - Bloqueo de acceso a nivel de plataforma
// ============================================================================
//
// Gate publico que se ejecuta:
//   - mode: 'gate'         -> al arrancar la app (chequea IP, y opcional user_id)
//   - mode: 'signup_check' -> antes del registro (chequea IP + email/dominio)
//
// Debe ser RAPIDO (<100ms): solo consulta estados de bloqueo via RPC indexadas,
// sin llamadas a red externa (a diferencia de security-check).
//
// FAIL-OPEN: ante cualquier error devuelve { allowed: true }. El bloqueo de IP
// es una medida anti-abuso, no la barrera critica de auth (el login lo protege
// Supabase Auth). No queremos dejar a TODOS fuera si la funcion falla.
//
// verify_jwt = false: corre antes de tener sesion (arranque) y en signup anonimo.
// ============================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCorsHeaders,
  handleCorsOptions,
  corsJsonResponse,
} from "../_shared/cors.ts";
import { getClientIp } from "../_shared/rate-limiter.ts";

interface AccessGateRequest {
  mode?: "gate" | "signup_check";
  email?: string | null;
  userId?: string | null;
  deviceId?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  const ip = getClientIp(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit por IP usando la RPC existente (check_rate_limit). Fail-open ante
    // error: tratamos cualquier problema/exceso como permitido para no romper la app.
    if (ip && ip !== "unknown") {
      try {
        const { data: rl } = await admin.rpc("check_rate_limit", {
          _identifier: ip,
          _identifier_type: "ip",
          _action_type: "access_gate",
          _max_attempts: 120,
          _window_minutes: 1,
          _block_minutes: 1,
        });
        if (rl && rl.allowed === false) {
          console.warn("[access-gate] rate limit hit", { ip });
          return corsJsonResponse(req, { allowed: true });
        }
      } catch (_) {
        /* fail-open */
      }
    }

    const {
      mode = "gate",
      email = null,
      userId = null,
      deviceId = null,
    }: AccessGateRequest = await req.json().catch(() => ({}));

    // 1) IP siempre se chequea
    if (ip && ip !== "unknown") {
      const { data: ipBlocked } = await admin.rpc("is_ip_blocked", { _ip: ip });
      if (ipBlocked === true) {
        return corsJsonResponse(req, { allowed: false, reason: "ip_blocked" });
      }
    }

    // 1b) Dispositivo (cookie) siempre se chequea
    if (deviceId) {
      const { data: deviceBlocked } = await admin.rpc("is_device_blocked", {
        _device_id: deviceId,
      });
      if (deviceBlocked === true) {
        return corsJsonResponse(req, {
          allowed: false,
          reason: "device_blocked",
        });
      }
    }

    // 2) signup: chequear email / dominio
    if (mode === "signup_check" && email) {
      const { data: emailBlocked } = await admin.rpc("is_email_blocked", {
        _email: email,
      });
      if (emailBlocked === true) {
        return corsJsonResponse(req, {
          allowed: false,
          reason: "email_blocked",
        });
      }
    }

    // 3) gate autenticado: confirmar metadata de ban + registrar IP/dispositivo
    if (mode === "gate" && userId) {
      const { data: userBanned } = await admin.rpc("is_user_banned", {
        _uid: userId,
      });
      if (userBanned === true) {
        return corsJsonResponse(req, { allowed: false, reason: "user_banned" });
      }

      // Registrar el acceso (IP + dispositivo) para poder bloquearlos luego.
      // No bloqueante: si falla, no afecta el resultado del gate.
      try {
        await admin.rpc("log_user_ip", {
          _user_id: userId,
          _ip: ip,
          _device_id: deviceId ?? "",
          _user_agent: req.headers.get("user-agent") ?? null,
        });
      } catch (_) {
        /* logging best-effort */
      }
    }

    return corsJsonResponse(req, { allowed: true });
  } catch (err) {
    // FAIL-OPEN: nunca bloquear por error interno.
    console.error(
      "[access-gate] error, failing open:",
      err instanceof Error ? err.message : err,
    );
    return new Response(JSON.stringify({ allowed: true }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
