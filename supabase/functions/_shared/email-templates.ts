/**
 * Shared Email Templates for KREOON
 *
 * Parameterized HTML templates that accept org branding.
 * Used by auth-email-proxy and other edge functions.
 */

export interface EmailTemplateParams {
  orgName: string;
  logoUrl?: string;
  primaryColor: string;
  actionUrl: string;
  actionLabel: string;
  supportEmail: string;
  /** Main heading text */
  heading: string;
  /** Body paragraphs (HTML strings) */
  bodyHtml: string;
  /** Optional footer note */
  footerNote?: string;
}

/**
 * Build a branded email HTML from parameters.
 * Dark theme consistent with KREOON's design language.
 */
export function buildBrandedEmail(params: EmailTemplateParams): string {
  const {
    orgName,
    logoUrl,
    primaryColor,
    actionUrl,
    actionLabel,
    supportEmail,
    heading,
    bodyHtml,
    footerNote,
  } = params;

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${orgName}" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px" />`
    : `<div style="width:48px;height:48px;border-radius:12px;background:${primaryColor};color:#fff;font-size:24px;font-weight:bold;line-height:48px;text-align:center;margin:0 auto 16px">${orgName.charAt(0).toUpperCase()}</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:40px auto;padding:0 16px">
<div style="background:linear-gradient(180deg,#111113 0%,#0c0c0e 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 32px;text-align:center">
  ${logoHtml}
  <h1 style="color:#f1f5f9;font-size:22px;margin:0 0 8px;font-weight:700">${heading}</h1>
  <p style="color:${primaryColor};font-size:13px;margin:0 0 24px;font-weight:600;letter-spacing:0.05em">${orgName}</p>
  <div style="text-align:left">
    ${bodyHtml}
  </div>
  <div style="text-align:center;margin:28px 0 16px">
    <a href="${actionUrl}" style="display:inline-block;padding:14px 32px;background:${primaryColor};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">${actionLabel}</a>
  </div>
  <p style="color:#64748b;font-size:12px;margin:16px 0 0;word-break:break-all">O copia este enlace:<br><span style="color:#94a3b8">${actionUrl}</span></p>
</div>
<div style="text-align:center;padding:24px 0;color:#475569;font-size:12px">
  ${footerNote ? `<p style="margin:0 0 8px">${footerNote}</p>` : ""}
  <p style="margin:0">${orgName} &bull; <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none">${supportEmail}</a></p>
</div>
</div>
</body>
</html>`;
}

// ─── Pre-built Auth Templates ─────────────────────────

export interface AuthEmailConfig {
  orgName: string;
  logoUrl?: string;
  primaryColor: string;
  supportEmail: string;
}

export function buildConfirmationEmail(config: AuthEmailConfig, actionUrl: string, userName?: string): string {
  return buildBrandedEmail({
    ...config,
    heading: "Confirma tu correo electrónico",
    actionUrl,
    actionLabel: "Confirmar Email",
    bodyHtml: `
      <p style="color:#e2e8f0;font-size:15px;line-height:1.6">Hola${userName ? ` <strong>${userName}</strong>` : ""},</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6">Gracias por registrarte en <strong>${config.orgName}</strong>. Por favor confirma tu correo electrónico haciendo clic en el botón de abajo.</p>
    `,
    footerNote: "Si no creaste una cuenta, puedes ignorar este correo.",
  });
}

export function buildRecoveryEmail(config: AuthEmailConfig, actionUrl: string): string {
  return buildBrandedEmail({
    ...config,
    heading: "Restablecer contraseña",
    actionUrl,
    actionLabel: "Restablecer Contraseña",
    bodyHtml: `
      <p style="color:#e2e8f0;font-size:15px;line-height:1.6">Hola,</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>${config.orgName}</strong>.</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6">Este enlace es válido por 24 horas.</p>
    `,
    footerNote: "Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.",
  });
}

export function buildMagicLinkEmail(config: AuthEmailConfig, actionUrl: string): string {
  return buildBrandedEmail({
    ...config,
    heading: "Tu enlace de acceso",
    actionUrl,
    actionLabel: "Iniciar Sesión",
    bodyHtml: `
      <p style="color:#e2e8f0;font-size:15px;line-height:1.6">Hola,</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6">Usa el siguiente enlace para iniciar sesión en <strong>${config.orgName}</strong>. El enlace es válido por 24 horas y solo puede usarse una vez.</p>
    `,
    footerNote: "Si no solicitaste este enlace, puedes ignorar este correo.",
  });
}

export function buildInviteEmail(config: AuthEmailConfig, actionUrl: string, inviterName?: string): string {
  return buildBrandedEmail({
    ...config,
    heading: "Has sido invitado",
    actionUrl,
    actionLabel: "Aceptar Invitación",
    bodyHtml: `
      <p style="color:#e2e8f0;font-size:15px;line-height:1.6">Hola,</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6">${inviterName ? `<strong>${inviterName}</strong> te ha invitado a unirte a` : "Has sido invitado a unirte a"} <strong>${config.orgName}</strong>.</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6">Haz clic en el botón de abajo para crear tu cuenta y comenzar.</p>
    `,
    footerNote: "Si no esperabas esta invitación, puedes ignorar este correo.",
  });
}
