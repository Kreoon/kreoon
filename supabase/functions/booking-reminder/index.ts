// booking-reminder: Enviar recordatorios de citas (ejecutar via cron)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Database credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

    let sentCount = 0;

    // 24h reminders
    const { data: bookings24h, error: err24h } = await supabase
      .from("bookings")
      .select(`
        *,
        event_type:booking_event_types(title),
        host:profiles!bookings_host_user_id_fkey(full_name, email)
      `)
      .eq("status", "confirmed")
      .eq("reminder_24h_sent", false)
      .gte("start_time", now.toISOString())
      .lte("start_time", in24Hours.toISOString());

    if (err24h) {
      console.error("Error fetching 24h bookings:", err24h);
    } else if (bookings24h && bookings24h.length > 0) {
      for (const booking of bookings24h) {
        try {
          // Send reminder to guest
          await resend.emails.send({
            from: "KREOON Booking <noreply@kreoon.com>",
            to: [booking.guest_email],
            subject: `Recordatorio: Tu cita con ${booking.host.full_name} es mañana`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2>🔔 Recordatorio de cita</h2>
                <p>Hola ${booking.guest_name},</p>
                <p>Te recordamos que tienes una cita programada con <strong>${booking.host.full_name}</strong>.</p>
                <p><strong>Evento:</strong> ${booking.event_type.title}</p>
                <p><strong>Fecha:</strong> ${new Date(booking.start_time).toLocaleDateString("es-ES", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric"
                })}</p>
                <p><strong>Hora:</strong> ${new Date(booking.start_time).toLocaleTimeString("es-ES", {
                  hour: "2-digit", minute: "2-digit"
                })}</p>
                <p>¡Te esperamos!</p>
              </div>
            `,
          });

          // Mark as sent
          await supabase
            .from("bookings")
            .update({ reminder_24h_sent: true })
            .eq("id", booking.id);

          sentCount++;
        } catch (e) {
          console.error(`Error sending 24h reminder for booking ${booking.id}:`, e);
        }
      }
    }

    // 1h reminders
    const { data: bookings1h, error: err1h } = await supabase
      .from("bookings")
      .select(`
        *,
        event_type:booking_event_types(title),
        host:profiles!bookings_host_user_id_fkey(full_name, email)
      `)
      .eq("status", "confirmed")
      .eq("reminder_1h_sent", false)
      .gte("start_time", now.toISOString())
      .lte("start_time", in1Hour.toISOString());

    if (err1h) {
      console.error("Error fetching 1h bookings:", err1h);
    } else if (bookings1h && bookings1h.length > 0) {
      for (const booking of bookings1h) {
        try {
          // Send reminder to guest
          await resend.emails.send({
            from: "KREOON Booking <noreply@kreoon.com>",
            to: [booking.guest_email],
            subject: `Tu cita con ${booking.host.full_name} comienza en 1 hora`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2>⏰ Tu cita comienza pronto</h2>
                <p>Hola ${booking.guest_name},</p>
                <p>Tu cita con <strong>${booking.host.full_name}</strong> comienza en aproximadamente 1 hora.</p>
                <p><strong>Evento:</strong> ${booking.event_type.title}</p>
                <p><strong>Hora:</strong> ${new Date(booking.start_time).toLocaleTimeString("es-ES", {
                  hour: "2-digit", minute: "2-digit"
                })}</p>
                ${booking.meeting_url ? `<p><a href="${booking.meeting_url}" style="display: inline-block; background: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Unirse a la reunión</a></p>` : ""}
              </div>
            `,
          });

          // Send reminder to host
          await resend.emails.send({
            from: "KREOON Booking <noreply@kreoon.com>",
            to: [booking.host.email],
            subject: `Tu cita con ${booking.guest_name} comienza en 1 hora`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2>⏰ Cita próxima</h2>
                <p>Tu cita con <strong>${booking.guest_name}</strong> comienza en aproximadamente 1 hora.</p>
                <p><strong>Evento:</strong> ${booking.event_type.title}</p>
                <p><strong>Hora:</strong> ${new Date(booking.start_time).toLocaleTimeString("es-ES", {
                  hour: "2-digit", minute: "2-digit"
                })}</p>
                <p><a href="${frontendUrl}/booking/calendar" style="display: inline-block; background: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Ver detalles</a></p>
              </div>
            `,
          });

          // Mark as sent
          await supabase
            .from("bookings")
            .update({ reminder_1h_sent: true })
            .eq("id", booking.id);

          sentCount++;
        } catch (e) {
          console.error(`Error sending 1h reminder for booking ${booking.id}:`, e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Enviados ${sentCount} recordatorios`,
        reminders_sent: sentCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in booking-reminder:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
