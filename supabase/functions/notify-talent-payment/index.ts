import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * notify-talent-payment — Procesa la cola talent_payment_notifications
 * y dispara WhatsApp al creator/editor via whatsapp-notify.
 *
 * POST body opcional: { payment_id?: string }
 *   - Si viene payment_id → procesa solo esa notificación pendiente.
 *   - Si no viene        → procesa TODOS los registros con status='pending'.
 *
 * Responde: { processed: N, sent: N, failed: N }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  payment_id?: string;
}

interface NotificationRow {
  id: string;
  payment_id: string;
  user_id: string;
  organization_id: string;
  status: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  payment_date: string | null;
  user_id: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: RequestBody = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    // body vacío o inválido → procesar todos los pending
  }

  const { payment_id } = body;

  // ── 1. Obtener notificaciones pending ────────────────────────────────────────
  let query = supabase
    .from("talent_payment_notifications")
    .select("id, payment_id, user_id, organization_id, status")
    .eq("status", "pending");

  if (payment_id) {
    query = query.eq("payment_id", payment_id);
  }

  const { data: notifications, error: notifError } = await query;

  if (notifError) {
    console.error("[notify-talent-payment] Error leyendo notificaciones:", notifError);
    return new Response(
      JSON.stringify({ error: notifError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rows = (notifications ?? []) as NotificationRow[];

  if (rows.length === 0) {
    console.log("[notify-talent-payment] Sin notificaciones pendientes");
    return new Response(
      JSON.stringify({ processed: 0, sent: 0, failed: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[notify-talent-payment] Procesando ${rows.length} notificaciones`);

  let sent = 0;
  let failed = 0;

  for (const notif of rows) {
    try {
      // ── 2. Obtener datos del payment ───────────────────────────────────────
      const { data: payment, error: payError } = await supabase
        .from("talent_payments")
        .select("id, amount, currency, description, payment_date, user_id")
        .eq("id", notif.payment_id)
        .single<PaymentRow>();

      if (payError || !payment) {
        console.error(`[notify-talent-payment] Payment ${notif.payment_id} no encontrado:`, payError);
        await markFailed(supabase, notif.id, "Payment no encontrado");
        failed++;
        continue;
      }

      // ── 3. Obtener perfil del talent ───────────────────────────────────────
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, whatsapp_phone")
        .eq("id", notif.user_id)
        .single<ProfileRow>();

      if (profileError || !profile) {
        console.warn(`[notify-talent-payment] Perfil ${notif.user_id} no encontrado`);
        await markFailed(supabase, notif.id, "Perfil no encontrado");
        failed++;
        continue;
      }

      // Prioridad de teléfono: whatsapp_phone > phone
      const phone = profile.whatsapp_phone || profile.phone;

      if (!phone) {
        console.warn(`[notify-talent-payment] User ${notif.user_id} sin teléfono registrado`);
        await markFailed(supabase, notif.id, "Sin teléfono registrado");
        failed++;
        continue;
      }

      // ── 4. Formatear datos del mensaje ─────────────────────────────────────
      const fullName = profile.full_name || "Creador";
      const amount = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: payment.currency || "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(payment.amount));

      const paymentDate = payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "America/Bogota",
          })
        : new Date().toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "America/Bogota",
          });

      const description = payment.description || "Liquidación de contenido";

      // Variables para el template talent_payment:
      //   {{1}} = nombre del talent
      //   {{2}} = monto formateado (ej: $850.000 COP)
      //   {{3}} = fecha de pago
      //   {{4}} = descripción / concepto
      const variables = [fullName, amount, paymentDate, description];

      // ── 5. Llamar whatsapp-notify ──────────────────────────────────────────
      const waRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          phone,
          event_type: "talent_payment",
          variables,
          user_id: notif.user_id,
          entity_id: notif.payment_id,
        }),
      });

      let waData: Record<string, unknown> = {};
      try {
        waData = await waRes.json();
      } catch {
        waData = {};
      }

      const waSuccess = waRes.ok && waData?.success === true;

      if (waSuccess) {
        // ── 6a. Marcar como enviada ──────────────────────────────────────────
        const { error: updateError } = await supabase
          .from("talent_payment_notifications")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", notif.id);

        if (updateError) {
          console.error(`[notify-talent-payment] Error marcando sent ${notif.id}:`, updateError);
        } else {
          console.log(`[notify-talent-payment] Notificacion ${notif.id} enviada a ${phone}`);
          sent++;
        }
      } else {
        // ── 6b. Marcar como fallida ──────────────────────────────────────────
        const reason = (waData?.reason as string) || `HTTP ${waRes.status}`;
        console.warn(`[notify-talent-payment] WhatsApp no enviado para notif ${notif.id}: ${reason}`);
        await markFailed(supabase, notif.id, `whatsapp-notify: ${reason}`);
        failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[notify-talent-payment] Excepcion en notif ${notif.id}:`, msg);
      await markFailed(supabase, notif.id, msg);
      failed++;
    }
  }

  const result = { processed: rows.length, sent, failed };
  console.log("[notify-talent-payment] Resultado:", result);

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

// ── Helper: marcar notificación como fallida ─────────────────────────────────
async function markFailed(
  supabase: ReturnType<typeof createClient>,
  notifId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from("talent_payment_notifications")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", notifId);

  if (error) {
    console.error(`[notify-talent-payment] Error marcando failed ${notifId}:`, error);
  }
}
