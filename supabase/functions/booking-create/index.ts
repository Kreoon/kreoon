// booking-create: Crear reserva y enviar email de confirmación
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingRequest {
  event_type_id: string;
  host_user_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  guest_notes?: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

const LOCATION_LABELS: Record<string, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  phone: "Llamada telefónica",
  in_person: "Presencial",
  custom: "Enlace personalizado",
};

function formatDate(dateStr: string, timezone: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
}

function formatTime(dateStr: string, timezone: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: BookingRequest = await req.json();

    const {
      event_type_id,
      host_user_id,
      guest_name,
      guest_email,
      guest_phone,
      guest_notes,
      start_time,
      end_time,
      timezone,
    } = body;

    if (!event_type_id || !host_user_id || !guest_name || !guest_email || !start_time || !end_time) {
      throw new Error("Faltan campos requeridos");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Database credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get event type details
    const { data: eventType, error: eventError } = await supabase
      .from("booking_event_types")
      .select("*")
      .eq("id", event_type_id)
      .single();

    if (eventError || !eventType) {
      throw new Error("Tipo de evento no encontrado");
    }

    // Get host profile
    const { data: hostProfile, error: hostError } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url, username")
      .eq("id", host_user_id)
      .single();

    if (hostError || !hostProfile) {
      throw new Error("Host no encontrado");
    }

    // Check slot availability
    const { data: isAvailable } = await supabase.rpc("check_booking_slot_available", {
      _host_user_id: host_user_id,
      _start_time: start_time,
      _end_time: end_time,
    });

    if (!isAvailable) {
      throw new Error("El horario seleccionado ya no está disponible");
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        event_type_id,
        host_user_id,
        guest_name,
        guest_email,
        guest_phone,
        guest_notes,
        start_time,
        end_time,
        timezone,
        location_type: eventType.location_type,
        location_details: eventType.location_details,
        status: "pending",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      throw new Error("Error al crear la reserva");
    }

    const formattedDate = formatDate(start_time, timezone);
    const formattedStartTime = formatTime(start_time, timezone);
    const formattedEndTime = formatTime(end_time, timezone);

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";
    const confirmUrl = `${frontendUrl}/booking/confirm/${booking.confirmation_token}`;
    const cancelUrl = `${frontendUrl}/booking/cancel/${booking.cancellation_token}`;

    // Send confirmation email to guest
    await resend.emails.send({
      from: "KREOON Booking <noreply@kreoon.com>",
      to: [guest_email],
      subject: `Reserva confirmada: ${eventType.title} con ${hostProfile.full_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px; }
            .container { max-width: 560px; margin: 0 auto; background: #111111; border-radius: 12px; padding: 40px; border: 1px solid #222; }
            .logo { font-size: 24px; font-weight: bold; color: #22c55e; margin-bottom: 24px; }
            h1 { font-size: 24px; margin: 0 0 16px 0; color: #ffffff; }
            p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 16px 0; }
            .details { background: #1a1a1a; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #71717a; }
            .detail-value { color: #ffffff; font-weight: 500; }
            .button { display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px 8px 8px 0; }
            .button-outline { background: transparent; border: 1px solid #444; color: #a1a1aa; }
            .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #222; font-size: 14px; color: #71717a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🎬 KREOON</div>
            <h1>¡Tu reserva está confirmada!</h1>
            <p>Hola ${guest_name},</p>
            <p>Tu cita con <strong>${hostProfile.full_name}</strong> ha sido programada exitosamente.</p>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Evento</span>
                <span class="detail-value">${eventType.title}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Hora</span>
                <span class="detail-value">${formattedStartTime} - ${formattedEndTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Zona horaria</span>
                <span class="detail-value">${timezone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Ubicación</span>
                <span class="detail-value">${LOCATION_LABELS[eventType.location_type] || eventType.location_type}</span>
              </div>
            </div>

            <p>¿Necesitas hacer cambios?</p>
            <a href="${cancelUrl}" class="button button-outline">Cancelar reserva</a>

            <div class="footer">
              <p>Este correo fue enviado porque alguien agendó una cita en KREOON.</p>
              <p>© 2026 KREOON. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Send notification email to host
    await resend.emails.send({
      from: "KREOON Booking <noreply@kreoon.com>",
      to: [hostProfile.email],
      subject: `Nueva reserva: ${guest_name} - ${eventType.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px; }
            .container { max-width: 560px; margin: 0 auto; background: #111111; border-radius: 12px; padding: 40px; border: 1px solid #222; }
            .logo { font-size: 24px; font-weight: bold; color: #22c55e; margin-bottom: 24px; }
            h1 { font-size: 24px; margin: 0 0 16px 0; color: #ffffff; }
            p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 16px 0; }
            .details { background: #1a1a1a; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #71717a; }
            .detail-value { color: #ffffff; font-weight: 500; }
            .button { display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px 0; }
            .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #222; font-size: 14px; color: #71717a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🎬 KREOON</div>
            <h1>¡Tienes una nueva reserva!</h1>
            <p><strong>${guest_name}</strong> ha agendado una cita contigo.</p>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Evento</span>
                <span class="detail-value">${eventType.title}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Hora</span>
                <span class="detail-value">${formattedStartTime} - ${formattedEndTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Invitado</span>
                <span class="detail-value">${guest_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email</span>
                <span class="detail-value">${guest_email}</span>
              </div>
              ${guest_phone ? `
              <div class="detail-row">
                <span class="detail-label">Teléfono</span>
                <span class="detail-value">${guest_phone}</span>
              </div>
              ` : ""}
              ${guest_notes ? `
              <div class="detail-row">
                <span class="detail-label">Notas</span>
                <span class="detail-value">${guest_notes}</span>
              </div>
              ` : ""}
            </div>

            <a href="${frontendUrl}/booking/calendar" class="button">Ver en calendario</a>

            <div class="footer">
              <p>© 2026 KREOON. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          status: booking.status,
          start_time: booking.start_time,
          end_time: booking.end_time,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in booking-create:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
