/**
 * Booking Email Templates
 * Templates HTML profesionales para el sistema de booking de Kreoon
 */

// Types are defined locally to avoid circular dependencies
// These match the types from @/modules/booking/types

// =============================================================================
// TYPES
// =============================================================================

interface EmailBranding {
  logo_url?: string | null;
  primary_color: string;
  accent_color?: string | null;
  welcome_text?: string | null;
  footer_text?: string | null;
}

interface EmailBooking {
  id: string;
  guest_name: string;
  guest_email: string;
  start_time: string;
  end_time: string;
  timezone: string;
  location_type: string;
  location_details?: string | null;
  meeting_url?: string | null;
  confirmation_token: string;
  cancellation_token: string;
  event_type?: {
    title: string;
    description?: string | null;
    duration_minutes: number;
  };
  host?: {
    full_name: string;
    avatar_url?: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

const LOCATION_LABELS: Record<string, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  phone: 'Llamada telefonica',
  in_person: 'Presencial',
  custom: 'Enlace personalizado',
};

function formatDate(dateString: string, timezone: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  };
  return date.toLocaleDateString('es-ES', options);
}

function formatTime(dateString: string, timezone: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  };
  return date.toLocaleTimeString('es-ES', options);
}

function formatTimeRange(startTime: string, endTime: string, timezone: string): string {
  return `${formatTime(startTime, timezone)} - ${formatTime(endTime, timezone)}`;
}

function getLocationText(locationType: string, locationDetails?: string | null): string {
  const label = LOCATION_LABELS[locationType] || locationType;
  if (locationDetails) {
    return `${label}: ${locationDetails}`;
  }
  return label;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// =============================================================================
// BASE URL CONFIG
// =============================================================================

const BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://app.kreoon.com';

function getBookingUrl(bookingId: string): string {
  return `${BASE_URL}/booking/view/${bookingId}`;
}

function getCancelUrl(cancellationToken: string): string {
  return `${BASE_URL}/booking/cancel/${cancellationToken}`;
}

function getRescheduleUrl(confirmationToken: string): string {
  return `${BASE_URL}/booking/reschedule/${confirmationToken}`;
}

// =============================================================================
// TEMPLATE WRAPPER
// =============================================================================

function wrapTemplate(
  branding: EmailBranding,
  content: string,
  preheader: string
): string {
  const primaryColor = branding.primary_color || '#8B5CF6';
  const accentColor = branding.accent_color || primaryColor;
  const textColor = getContrastColor(primaryColor);
  const footerText = branding.footer_text || 'Powered by Kreoon';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reserva - Kreoon</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <!-- Preheader (hidden text for email preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); padding: 32px 40px; text-align: center;">
              ${branding.logo_url
                ? `<img src="${branding.logo_url}" alt="Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 16px;" />`
                : ''
              }
              ${branding.welcome_text
                ? `<p style="margin: 0; color: ${textColor}; font-size: 14px; opacity: 0.9;">${branding.welcome_text}</p>`
                : ''
              }
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #71717a; font-size: 12px; line-height: 1.5;">
                ${footerText}
              </p>
              <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 11px;">
                Si tienes problemas con los botones, copia y pega el enlace en tu navegador.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// =============================================================================
// BOOKING DETAILS COMPONENT
// =============================================================================

function renderBookingDetails(
  booking: EmailBooking,
  branding: EmailBranding
): string {
  const primaryColor = branding.primary_color || '#8B5CF6';
  const eventTitle = booking.event_type?.title || 'Reunion';
  const hostName = booking.host?.full_name || 'Anfitrion';
  const duration = booking.event_type?.duration_minutes || 30;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7; margin-bottom: 24px;">
      <tr>
        <td style="padding: 24px;">

          <!-- Event Title -->
          <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e4e4e7;">
            <h2 style="margin: 0 0 4px; color: #18181b; font-size: 20px; font-weight: 600;">
              ${eventTitle}
            </h2>
            <p style="margin: 0; color: #71717a; font-size: 14px;">
              con ${hostName}
            </p>
          </div>

          <!-- Date & Time -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="vertical-align: top; width: 32px;">
                <div style="width: 32px; height: 32px; background-color: ${hexToRgba(primaryColor, 0.1)}; border-radius: 8px; text-align: center; line-height: 32px;">
                  <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/calendar.svg" width="16" height="16" style="vertical-align: middle; filter: invert(35%) sepia(85%) saturate(4000%) hue-rotate(250deg);" alt="" />
                </div>
              </td>
              <td style="padding-left: 12px; vertical-align: top;">
                <p style="margin: 0 0 2px; color: #18181b; font-size: 14px; font-weight: 500;">
                  ${formatDate(booking.start_time, booking.timezone)}
                </p>
                <p style="margin: 0; color: #71717a; font-size: 13px;">
                  ${formatTimeRange(booking.start_time, booking.end_time, booking.timezone)} (${booking.timezone})
                </p>
              </td>
            </tr>
          </table>

          <!-- Duration -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 16px;">
            <tr>
              <td style="vertical-align: top; width: 32px;">
                <div style="width: 32px; height: 32px; background-color: ${hexToRgba(primaryColor, 0.1)}; border-radius: 8px; text-align: center; line-height: 32px;">
                  <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/clock.svg" width="16" height="16" style="vertical-align: middle; filter: invert(35%) sepia(85%) saturate(4000%) hue-rotate(250deg);" alt="" />
                </div>
              </td>
              <td style="padding-left: 12px; vertical-align: middle;">
                <p style="margin: 0; color: #18181b; font-size: 14px;">
                  ${duration} minutos
                </p>
              </td>
            </tr>
          </table>

          <!-- Location -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 16px;">
            <tr>
              <td style="vertical-align: top; width: 32px;">
                <div style="width: 32px; height: 32px; background-color: ${hexToRgba(primaryColor, 0.1)}; border-radius: 8px; text-align: center; line-height: 32px;">
                  <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/map-pin.svg" width="16" height="16" style="vertical-align: middle; filter: invert(35%) sepia(85%) saturate(4000%) hue-rotate(250deg);" alt="" />
                </div>
              </td>
              <td style="padding-left: 12px; vertical-align: middle;">
                <p style="margin: 0; color: #18181b; font-size: 14px;">
                  ${getLocationText(booking.location_type, booking.location_details)}
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  `;
}

// =============================================================================
// BUTTON COMPONENT
// =============================================================================

function renderButton(
  text: string,
  url: string,
  primaryColor: string,
  variant: 'primary' | 'secondary' | 'danger' = 'primary'
): string {
  const textColor = variant === 'primary' ? getContrastColor(primaryColor) : primaryColor;
  const bgColor = variant === 'primary' ? primaryColor : 'transparent';
  const border = variant === 'secondary' ? `2px solid ${primaryColor}` : variant === 'danger' ? '2px solid #ef4444' : 'none';
  const dangerText = variant === 'danger' ? '#ef4444' : textColor;

  return `
    <a href="${url}" target="_blank" style="
      display: inline-block;
      padding: 14px 28px;
      background-color: ${variant === 'danger' ? 'transparent' : bgColor};
      color: ${variant === 'danger' ? dangerText : textColor};
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      border-radius: 10px;
      border: ${variant === 'danger' ? '2px solid #ef4444' : border};
      transition: opacity 0.2s;
    ">${text}</a>
  `;
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Email de confirmacion de reserva
 */
export function confirmationEmail(
  booking: EmailBooking,
  branding: EmailBranding
): string {
  const primaryColor = branding.primary_color || '#8B5CF6';
  const eventTitle = booking.event_type?.title || 'Reunion';

  const content = `
    <!-- Success Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; line-height: 64px;">
        <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/check.svg" width="32" height="32" style="vertical-align: middle; filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%);" alt="" />
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin: 0 0 8px; text-align: center; color: #18181b; font-size: 24px; font-weight: 700;">
      Reserva Confirmada
    </h1>
    <p style="margin: 0 0 32px; text-align: center; color: #71717a; font-size: 16px;">
      Hola ${booking.guest_name}, tu cita ha sido programada exitosamente.
    </p>

    <!-- Booking Details -->
    ${renderBookingDetails(booking, branding)}

    <!-- Meeting Link (if available) -->
    ${booking.meeting_url ? `
      <div style="text-align: center; margin-bottom: 24px;">
        ${renderButton('Unirse a la reunion', booking.meeting_url, primaryColor, 'primary')}
      </div>
    ` : ''}

    <!-- Action Buttons -->
    <div style="text-align: center; margin-top: 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="padding-right: 12px;">
            ${renderButton('Reprogramar', getRescheduleUrl(booking.confirmation_token), primaryColor, 'secondary')}
          </td>
          <td>
            ${renderButton('Cancelar', getCancelUrl(booking.cancellation_token), primaryColor, 'danger')}
          </td>
        </tr>
      </table>
    </div>

    <!-- Calendar Note -->
    <p style="margin: 32px 0 0; text-align: center; color: #a1a1aa; font-size: 12px;">
      Te recomendamos agregar este evento a tu calendario para no olvidarlo.
    </p>
  `;

  return wrapTemplate(
    branding,
    content,
    `Tu reserva de ${eventTitle} ha sido confirmada para ${formatDate(booking.start_time, booking.timezone)}`
  );
}

/**
 * Recordatorio 24 horas antes
 */
export function reminder24hEmail(
  booking: EmailBooking,
  branding: EmailBranding
): string {
  const primaryColor = branding.primary_color || '#8B5CF6';
  const eventTitle = booking.event_type?.title || 'Reunion';

  const content = `
    <!-- Reminder Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: ${hexToRgba(primaryColor, 0.1)}; border-radius: 50%; line-height: 64px;">
        <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/bell.svg" width="32" height="32" style="vertical-align: middle;" alt="" />
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin: 0 0 8px; text-align: center; color: #18181b; font-size: 24px; font-weight: 700;">
      Recordatorio: Tu cita es manana
    </h1>
    <p style="margin: 0 0 32px; text-align: center; color: #71717a; font-size: 16px;">
      Hola ${booking.guest_name}, te recordamos que tienes una cita programada.
    </p>

    <!-- Booking Details -->
    ${renderBookingDetails(booking, branding)}

    <!-- Meeting Link (if available) -->
    ${booking.meeting_url ? `
      <div style="text-align: center; margin-bottom: 24px;">
        ${renderButton('Unirse a la reunion', booking.meeting_url, primaryColor, 'primary')}
        <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 12px;">
          El enlace estara disponible al momento de la reunion
        </p>
      </div>
    ` : ''}

    <!-- Action Buttons -->
    <div style="text-align: center; margin-top: 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="padding-right: 12px;">
            ${renderButton('Reprogramar', getRescheduleUrl(booking.confirmation_token), primaryColor, 'secondary')}
          </td>
          <td>
            ${renderButton('Cancelar cita', getCancelUrl(booking.cancellation_token), primaryColor, 'danger')}
          </td>
        </tr>
      </table>
    </div>

    <!-- Tip -->
    <div style="margin-top: 32px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 13px;">
        <strong>Consejo:</strong> Asegurate de tener una conexion a internet estable y un lugar tranquilo para la reunion.
      </p>
    </div>
  `;

  return wrapTemplate(
    branding,
    content,
    `Recordatorio: Tu cita de ${eventTitle} es manana a las ${formatTime(booking.start_time, booking.timezone)}`
  );
}

/**
 * Recordatorio 1 hora antes
 */
export function reminder1hEmail(
  booking: EmailBooking,
  branding: EmailBranding
): string {
  const primaryColor = branding.primary_color || '#8B5CF6';
  const eventTitle = booking.event_type?.title || 'Reunion';

  const content = `
    <!-- Urgent Reminder Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: #fef3c7; border-radius: 50%; line-height: 64px;">
        <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/clock.svg" width="32" height="32" style="vertical-align: middle; filter: invert(63%) sepia(76%) saturate(1200%) hue-rotate(360deg) brightness(101%) contrast(106%);" alt="" />
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin: 0 0 8px; text-align: center; color: #18181b; font-size: 24px; font-weight: 700;">
      Tu cita comienza en 1 hora
    </h1>
    <p style="margin: 0 0 32px; text-align: center; color: #71717a; font-size: 16px;">
      Hola ${booking.guest_name}, preparate para tu reunion.
    </p>

    <!-- Booking Details -->
    ${renderBookingDetails(booking, branding)}

    <!-- Meeting Link - Prominent -->
    ${booking.meeting_url ? `
      <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, ${primaryColor} 0%, ${branding.accent_color || primaryColor} 100%); border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px; color: ${getContrastColor(primaryColor)}; font-size: 14px; opacity: 0.9;">
          Enlace de la reunion:
        </p>
        <a href="${booking.meeting_url}" target="_blank" style="
          display: inline-block;
          padding: 16px 32px;
          background-color: #ffffff;
          color: ${primaryColor};
          text-decoration: none;
          font-size: 16px;
          font-weight: 700;
          border-radius: 10px;
        ">Unirse ahora</a>
      </div>
    ` : `
      <div style="text-align: center; padding: 24px; background-color: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7; margin-bottom: 24px;">
        <p style="margin: 0; color: #71717a; font-size: 14px;">
          ${getLocationText(booking.location_type, booking.location_details)}
        </p>
      </div>
    `}

    <!-- Quick Actions -->
    <div style="text-align: center;">
      <p style="margin: 0 0 16px; color: #71717a; font-size: 13px;">
        Si no puedes asistir:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="padding-right: 12px;">
            ${renderButton('Reprogramar', getRescheduleUrl(booking.confirmation_token), primaryColor, 'secondary')}
          </td>
          <td>
            ${renderButton('Cancelar', getCancelUrl(booking.cancellation_token), primaryColor, 'danger')}
          </td>
        </tr>
      </table>
    </div>
  `;

  return wrapTemplate(
    branding,
    content,
    `Tu cita de ${eventTitle} comienza en 1 hora - ${formatTime(booking.start_time, booking.timezone)}`
  );
}

/**
 * Email de cancelacion
 */
export function cancellationEmail(
  booking: EmailBooking,
  branding: EmailBranding,
  reason?: string
): string {
  const primaryColor = branding.primary_color || '#8B5CF6';
  const eventTitle = booking.event_type?.title || 'Reunion';
  const hostName = booking.host?.full_name || 'el anfitrion';

  const content = `
    <!-- Cancelled Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: #fee2e2; border-radius: 50%; line-height: 64px;">
        <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/x.svg" width="32" height="32" style="vertical-align: middle; filter: invert(28%) sepia(85%) saturate(5338%) hue-rotate(347deg) brightness(97%) contrast(96%);" alt="" />
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin: 0 0 8px; text-align: center; color: #18181b; font-size: 24px; font-weight: 700;">
      Cita Cancelada
    </h1>
    <p style="margin: 0 0 32px; text-align: center; color: #71717a; font-size: 16px;">
      Hola ${booking.guest_name}, tu cita ha sido cancelada.
    </p>

    <!-- Cancelled Booking Details (with strikethrough effect) -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fecaca; margin-bottom: 24px; opacity: 0.8;">
      <tr>
        <td style="padding: 24px;">

          <!-- Event Title -->
          <div style="margin-bottom: 16px;">
            <h2 style="margin: 0 0 4px; color: #18181b; font-size: 18px; font-weight: 600; text-decoration: line-through;">
              ${eventTitle}
            </h2>
            <p style="margin: 0; color: #71717a; font-size: 14px;">
              con ${hostName}
            </p>
          </div>

          <!-- Original Date & Time -->
          <p style="margin: 0; color: #71717a; font-size: 14px; text-decoration: line-through;">
            ${formatDate(booking.start_time, booking.timezone)} - ${formatTimeRange(booking.start_time, booking.end_time, booking.timezone)}
          </p>

        </td>
      </tr>
    </table>

    <!-- Cancellation Reason -->
    ${reason ? `
      <div style="padding: 16px; background-color: #fafafa; border-radius: 8px; border-left: 4px solid #71717a; margin-bottom: 24px;">
        <p style="margin: 0 0 4px; color: #71717a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          Motivo de cancelacion
        </p>
        <p style="margin: 0; color: #18181b; font-size: 14px;">
          ${reason}
        </p>
      </div>
    ` : ''}

    <!-- Reschedule CTA -->
    <div style="text-align: center; padding: 24px; background-color: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7;">
      <p style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 500;">
        ¿Deseas programar una nueva cita?
      </p>
      ${renderButton('Agendar nueva cita', getBookingUrl(booking.id), primaryColor, 'primary')}
    </div>

    <!-- Apology Message -->
    <p style="margin: 24px 0 0; text-align: center; color: #71717a; font-size: 14px;">
      Lamentamos los inconvenientes. Esperamos poder reunirnos pronto.
    </p>
  `;

  return wrapTemplate(
    branding,
    content,
    `Tu cita de ${eventTitle} del ${formatDate(booking.start_time, booking.timezone)} ha sido cancelada`
  );
}

/**
 * Email de reprogramacion
 */
export function rescheduleEmail(
  booking: EmailBooking,
  branding: EmailBranding,
  newTime: { start_time: string; end_time: string }
): string {
  const primaryColor = branding.primary_color || '#8B5CF6';
  const eventTitle = booking.event_type?.title || 'Reunion';
  const hostName = booking.host?.full_name || 'el anfitrion';

  const content = `
    <!-- Reschedule Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; line-height: 64px;">
        <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/calendar-clock.svg" width="32" height="32" style="vertical-align: middle; filter: invert(37%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(97%) contrast(101%);" alt="" />
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin: 0 0 8px; text-align: center; color: #18181b; font-size: 24px; font-weight: 700;">
      Cita Reprogramada
    </h1>
    <p style="margin: 0 0 32px; text-align: center; color: #71717a; font-size: 16px;">
      Hola ${booking.guest_name}, tu cita ha sido reprogramada a un nuevo horario.
    </p>

    <!-- Time Change Visual -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="width: 45%; vertical-align: top;">
          <!-- Old Time -->
          <div style="padding: 16px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; text-align: center;">
            <p style="margin: 0 0 4px; color: #ef4444; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Horario anterior
            </p>
            <p style="margin: 0; color: #71717a; font-size: 13px; text-decoration: line-through;">
              ${formatDate(booking.start_time, booking.timezone)}
            </p>
            <p style="margin: 4px 0 0; color: #71717a; font-size: 13px; text-decoration: line-through;">
              ${formatTime(booking.start_time, booking.timezone)}
            </p>
          </div>
        </td>
        <td style="width: 10%; vertical-align: middle; text-align: center;">
          <div style="font-size: 24px; color: ${primaryColor};">→</div>
        </td>
        <td style="width: 45%; vertical-align: top;">
          <!-- New Time -->
          <div style="padding: 16px; background-color: #dcfce7; border-radius: 8px; border: 1px solid #86efac; text-align: center;">
            <p style="margin: 0 0 4px; color: #22c55e; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Nuevo horario
            </p>
            <p style="margin: 0; color: #18181b; font-size: 13px; font-weight: 600;">
              ${formatDate(newTime.start_time, booking.timezone)}
            </p>
            <p style="margin: 4px 0 0; color: #18181b; font-size: 13px; font-weight: 600;">
              ${formatTime(newTime.start_time, booking.timezone)}
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Updated Booking Details -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7; margin-bottom: 24px;">
      <tr>
        <td style="padding: 24px;">

          <!-- Event Title -->
          <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e4e4e7;">
            <h2 style="margin: 0 0 4px; color: #18181b; font-size: 20px; font-weight: 600;">
              ${eventTitle}
            </h2>
            <p style="margin: 0; color: #71717a; font-size: 14px;">
              con ${hostName}
            </p>
          </div>

          <!-- New Date & Time -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="vertical-align: top; width: 32px;">
                <div style="width: 32px; height: 32px; background-color: #dcfce7; border-radius: 8px; text-align: center; line-height: 32px;">
                  <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/calendar.svg" width="16" height="16" style="vertical-align: middle; filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%);" alt="" />
                </div>
              </td>
              <td style="padding-left: 12px; vertical-align: top;">
                <p style="margin: 0 0 2px; color: #18181b; font-size: 14px; font-weight: 600;">
                  ${formatDate(newTime.start_time, booking.timezone)}
                </p>
                <p style="margin: 0; color: #71717a; font-size: 13px;">
                  ${formatTimeRange(newTime.start_time, newTime.end_time, booking.timezone)} (${booking.timezone})
                </p>
              </td>
            </tr>
          </table>

          <!-- Location -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 16px;">
            <tr>
              <td style="vertical-align: top; width: 32px;">
                <div style="width: 32px; height: 32px; background-color: ${hexToRgba(primaryColor, 0.1)}; border-radius: 8px; text-align: center; line-height: 32px;">
                  <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/map-pin.svg" width="16" height="16" style="vertical-align: middle;" alt="" />
                </div>
              </td>
              <td style="padding-left: 12px; vertical-align: middle;">
                <p style="margin: 0; color: #18181b; font-size: 14px;">
                  ${getLocationText(booking.location_type, booking.location_details)}
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>

    <!-- Meeting Link (if available) -->
    ${booking.meeting_url ? `
      <div style="text-align: center; margin-bottom: 24px;">
        ${renderButton('Unirse a la reunion', booking.meeting_url, primaryColor, 'primary')}
      </div>
    ` : ''}

    <!-- Action Buttons -->
    <div style="text-align: center;">
      <p style="margin: 0 0 16px; color: #71717a; font-size: 13px;">
        ¿Necesitas hacer otro cambio?
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="padding-right: 12px;">
            ${renderButton('Reprogramar nuevamente', getRescheduleUrl(booking.confirmation_token), primaryColor, 'secondary')}
          </td>
          <td>
            ${renderButton('Cancelar cita', getCancelUrl(booking.cancellation_token), primaryColor, 'danger')}
          </td>
        </tr>
      </table>
    </div>

    <!-- Calendar Note -->
    <p style="margin: 32px 0 0; text-align: center; color: #a1a1aa; font-size: 12px;">
      Recuerda actualizar tu calendario con el nuevo horario.
    </p>
  `;

  return wrapTemplate(
    branding,
    content,
    `Tu cita de ${eventTitle} ha sido reprogramada para ${formatDate(newTime.start_time, booking.timezone)}`
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { EmailBooking, EmailBranding };
