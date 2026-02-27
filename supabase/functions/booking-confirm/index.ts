// booking-confirm: Confirmar o cancelar reserva via token
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequest {
  token: string;
  action: "confirm" | "cancel";
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action, reason }: ConfirmRequest = await req.json();

    if (!token || !action) {
      throw new Error("Token y acción son requeridos");
    }

    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Database credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find booking by token
    const tokenColumn = action === "confirm" ? "confirmation_token" : "cancellation_token";

    const { data: booking, error: findError } = await supabase
      .from("bookings")
      .select(`
        *,
        event_type:booking_event_types(*),
        host:profiles!bookings_host_user_id_fkey(full_name, email)
      `)
      .eq(tokenColumn, token)
      .single();

    if (findError || !booking) {
      throw new Error("Reserva no encontrada o token inválido");
    }

    if (action === "confirm") {
      if (booking.status !== "pending") {
        throw new Error("Esta reserva ya fue procesada");
      }

      // Confirm booking
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", booking.id);

      if (updateError) throw updateError;

      // Send confirmation emails
      await resend.emails.send({
        from: "KREOON Booking <noreply@kreoon.com>",
        to: [booking.guest_email],
        subject: `Cita confirmada: ${booking.event_type.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #22c55e;">¡Tu cita ha sido confirmada!</h2>
            <p>Tu cita con <strong>${booking.host.full_name}</strong> está confirmada.</p>
            <p><strong>Evento:</strong> ${booking.event_type.title}</p>
            <p><strong>Fecha:</strong> ${new Date(booking.start_time).toLocaleDateString("es-ES", {
              weekday: "long", year: "numeric", month: "long", day: "numeric"
            })}</p>
            <p><strong>Hora:</strong> ${new Date(booking.start_time).toLocaleTimeString("es-ES", {
              hour: "2-digit", minute: "2-digit"
            })}</p>
          </div>
        `,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Reserva confirmada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cancel") {
      if (!["pending", "confirmed"].includes(booking.status)) {
        throw new Error("Esta reserva no puede ser cancelada");
      }

      // Cancel booking
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: "guest",
          cancellation_reason: reason,
        })
        .eq("id", booking.id);

      if (updateError) throw updateError;

      // Notify host
      await resend.emails.send({
        from: "KREOON Booking <noreply@kreoon.com>",
        to: [booking.host.email],
        subject: `Reserva cancelada: ${booking.guest_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ef4444;">Reserva cancelada</h2>
            <p><strong>${booking.guest_name}</strong> ha cancelado su cita.</p>
            <p><strong>Evento:</strong> ${booking.event_type.title}</p>
            <p><strong>Fecha:</strong> ${new Date(booking.start_time).toLocaleDateString("es-ES", {
              weekday: "long", year: "numeric", month: "long", day: "numeric"
            })}</p>
            ${reason ? `<p><strong>Razón:</strong> ${reason}</p>` : ""}
          </div>
        `,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Reserva cancelada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Acción no válida");
  } catch (error) {
    console.error("Error in booking-confirm:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
