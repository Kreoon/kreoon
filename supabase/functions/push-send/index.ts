import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from "../_shared/cors.ts";

// message solo se muestra para los tipos que lo esperan (contenido controlado por el propio sistema,
// nunca texto libre reenviado desde un caller externo sin validar)
const NOTIFICATION_COPY: Record<string, { title: string; body: (message: string | null) => string }> = {
  follow: { title: "Nuevo seguidor", body: () => "Alguien empezo a seguirte en KREOON" },
  reaction: { title: "Nueva reaccion", body: (m) => m || "Reaccionaron a tu publicacion" },
  comment: { title: "Nuevo comentario", body: (m) => m || "Comentaron tu publicacion" },
  mention: { title: "Te mencionaron", body: (m) => m || "Te mencionaron en KREOON" },
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  try {
    // Este endpoint solo lo invoca el trigger de Postgres (pg_net), nunca el cliente.
    // La anon key en el header Authorization NO autoriza nada por si sola (es publica) —
    // el secreto interno es lo unico que prueba que el caller es nuestro propio trigger.
    const internalSecret = Deno.env.get("PUSH_INTERNAL_SECRET");
    const providedSecret = req.headers.get("X-Internal-Secret") ?? "";
    if (!internalSecret || !timingSafeEqual(providedSecret, internalSecret)) {
      return corsJsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[push-send] VAPID keys not configured");
      return corsJsonResponse(req, { error: "VAPID keys not configured" }, 500);
    }

    webpush.setVapidDetails("mailto:dev@kreoon.com", vapidPublicKey, vapidPrivateKey);

    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || "https://wjkbqcrxwsmvtxmqgiqc.supabase.co";
    const serviceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { user_id, notification_type, message } = await req.json();
    if (!user_id) {
      return corsJsonResponse(req, { error: "user_id required" }, 400);
    }

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", user_id);

    if (subsError) throw subsError;

    if (!subs || subs.length === 0) {
      return corsJsonResponse(req, { success: true, sent: 0, message: "No subscriptions" }, 200);
    }

    // notification_type desconocido -> copy generica fija, NUNCA se renderiza message tal cual
    // (message solo se usa dentro de las plantillas whitelisteadas de arriba)
    const copy = NOTIFICATION_COPY[notification_type];
    const payload = JSON.stringify({
      title: copy?.title ?? "KREOON",
      body: copy ? copy.body(message) : "Tienes una nueva notificacion",
      url: "/feed",
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload,
        );
        sent++;
      } catch (err: any) {
        failed++;
        console.error(`[push-send] Failed for endpoint ${sub.endpoint}:`, err?.statusCode, err?.message);
        // 404/410 = suscripcion muerta (usuario revoco permisos o desinstalo) -> limpiar
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    return corsJsonResponse(req, { success: true, sent, failed }, 200);
  } catch (error: any) {
    console.error("[push-send] Error:", error);
    return corsJsonResponse(req, { error: error.message }, 500);
  }
});
