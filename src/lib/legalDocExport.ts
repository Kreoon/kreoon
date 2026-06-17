import { supabase } from "@/integrations/supabase/client";

interface ConsentLike {
  document_type: string;
  document_version: string;
  accepted: boolean;
  accepted_at: string;
  consent_method: string;
  ip_address: string;
  user_agent: string;
}

interface SignatureLike {
  document_type: string;
  document_version: string;
  signer_full_name: string;
  signature_method: string;
  typed_signature: string;
  signature_image_url: string;
  declaration_text: string;
  ip_address: string;
  timestamp_utc: string;
  status: string;
}

interface LegalDocRow {
  document_type: string;
  version: string;
  title: string | null;
  content_html: string | null;
  content_hash: string | null;
}

interface AgeVerification {
  declared_age_18_plus: boolean;
  declared_at: string;
  ip_address: string;
  user_agent: string;
  verification_method: string;
  verification_status: string;
  verified_at: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  terms_of_service: "Términos de Servicio",
  privacy_policy: "Política de Privacidad",
  acceptable_use_policy: "Política de Uso Aceptable",
  cookie_policy: "Política de Cookies",
  age_verification_policy: "Verificación de Edad",
  creator_agreement: "Acuerdo de Creador",
  content_moderation_policy: "Moderación de Contenido",
  dmca_policy: "Política DMCA",
  brand_agreement: "Acuerdo de Marca",
  escrow_payment_terms: "Términos de Escrow/Pagos",
  white_label_agreement: "Acuerdo White Label",
  data_processing_agreement: "Acuerdo de Procesamiento de Datos",
};

const docLabel = (t: string) => DOC_TYPE_LABELS[t] || t;

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmt = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-CO", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return String(d);
  }
};

/**
 * Genera y abre un documento imprimible (Guardar como PDF) con TODO lo legal
 * firmado/aceptado por un usuario: el contenido completo de cada documento legal
 * + los datos probatorios de la firma/consentimiento (firmante, método, fecha,
 * IP, user-agent, hash, declaración). Sin dependencias de PDF: usa la impresión
 * nativa del navegador.
 */
export async function downloadUserLegalDocs(opts: {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  consents: ConsentLike[];
  signatures: SignatureLike[];
}): Promise<void> {
  const { userId, consents, signatures } = opts;

  // Datos del usuario (si no se pasaron)
  let userName = opts.userName ?? null;
  let userEmail = opts.userEmail ?? null;
  if (!userName || !userEmail) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    userName = userName || prof?.full_name || null;
    userEmail = userEmail || prof?.email || null;
  }

  // Contenido completo de los documentos legales involucrados
  const types = [
    ...new Set([
      ...consents.map((c) => c.document_type),
      ...signatures.map((s) => s.document_type),
    ]),
  ];
  let docs: LegalDocRow[] = [];
  if (types.length > 0) {
    const { data } = await supabase
      .from("legal_documents")
      .select("document_type, version, title, content_html, content_hash")
      .in("document_type", types);
    docs = (data || []) as LegalDocRow[];
  }
  const findDoc = (type: string, version: string): LegalDocRow | undefined =>
    docs.find((d) => d.document_type === type && d.version === version) ||
    docs.find((d) => d.document_type === type);

  // Verificacion de edad (RPC admin-safe)
  let ageVerifications: AgeVerification[] = [];
  try {
    const { data: ageData } = await (supabase as any).rpc(
      "get_user_age_verification",
      {
        p_user_id: userId,
      },
    );
    ageVerifications = (ageData || []) as AgeVerification[];
  } catch {
    /* sin verificacion de edad */
  }

  const generatedAt = new Date().toLocaleString("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const consentBlocks = consents
    .map((c) => {
      const doc = findDoc(c.document_type, c.document_version);
      return `
      <section class="doc">
        <h2>${esc(doc?.title || docLabel(c.document_type))}</h2>
        <table class="meta">
          <tr><td>Tipo</td><td>${esc(docLabel(c.document_type))}</td></tr>
          <tr><td>Versión</td><td>v${esc(c.document_version)}</td></tr>
          <tr><td>Estado</td><td>${c.accepted ? "Aceptado" : "No aceptado"}</td></tr>
          <tr><td>Fecha de aceptación</td><td>${esc(fmt(c.accepted_at))}</td></tr>
          <tr><td>Método</td><td>${esc(c.consent_method)}</td></tr>
          <tr><td>Dirección IP</td><td>${esc(c.ip_address)}</td></tr>
          <tr><td>Navegador</td><td>${esc(c.user_agent)}</td></tr>
          ${doc?.content_hash ? `<tr><td>Hash (SHA-256)</td><td class="hash">${esc(doc.content_hash)}</td></tr>` : ""}
        </table>
        <div class="content">${doc?.content_html || "<em>Contenido del documento no disponible.</em>"}</div>
      </section>`;
    })
    .join("");

  const signatureBlocks = signatures
    .map((s) => {
      const doc = findDoc(s.document_type, s.document_version);
      const signatureVisual = s.signature_image_url
        ? `<img class="sig-img" src="${esc(s.signature_image_url)}" alt="Firma" />`
        : s.typed_signature
          ? `<p class="sig-typed">${esc(s.typed_signature)}</p>`
          : "";
      return `
      <section class="doc">
        <h2>Firma — ${esc(doc?.title || docLabel(s.document_type))}</h2>
        <table class="meta">
          <tr><td>Firmante</td><td>${esc(s.signer_full_name)}</td></tr>
          <tr><td>Tipo de documento</td><td>${esc(docLabel(s.document_type))} v${esc(s.document_version)}</td></tr>
          <tr><td>Método de firma</td><td>${esc(s.signature_method)}</td></tr>
          <tr><td>Fecha de firma</td><td>${esc(fmt(s.timestamp_utc))}</td></tr>
          <tr><td>Estado</td><td>${esc(s.status)}</td></tr>
          <tr><td>Dirección IP</td><td>${esc(s.ip_address)}</td></tr>
          ${doc?.content_hash ? `<tr><td>Hash (SHA-256)</td><td class="hash">${esc(doc.content_hash)}</td></tr>` : ""}
        </table>
        ${s.declaration_text ? `<p class="declaration">${esc(s.declaration_text)}</p>` : ""}
        ${signatureVisual ? `<div class="sig-box"><span class="sig-label">Firma:</span>${signatureVisual}</div>` : ""}
        <div class="content">${doc?.content_html || "<em>Contenido del documento no disponible.</em>"}</div>
      </section>`;
    })
    .join("");

  const ageBlocks = ageVerifications
    .map(
      (a) => `
      <section class="doc">
        <h2>Verificación de edad</h2>
        <table class="meta">
          <tr><td>Declaró ser mayor de 18</td><td>${a.declared_age_18_plus ? "Sí" : "No"}</td></tr>
          <tr><td>Fecha de declaración</td><td>${esc(fmt(a.declared_at))}</td></tr>
          <tr><td>Método</td><td>${esc(a.verification_method)}</td></tr>
          <tr><td>Estado</td><td>${esc(a.verification_status)}</td></tr>
          <tr><td>Verificado el</td><td>${esc(fmt(a.verified_at))}</td></tr>
          <tr><td>Dirección IP</td><td>${esc(a.ip_address)}</td></tr>
          <tr><td>Navegador</td><td>${esc(a.user_agent)}</td></tr>
        </table>
      </section>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Documentos legales — ${esc(userName || userEmail || userId)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 32px; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; border-bottom: 2px solid #222; padding-bottom: 4px; margin: 0 0 10px; }
  .cover { border: 1px solid #ccc; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .cover p { margin: 2px 0; color: #444; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.meta td { border: 1px solid #e2e2e2; padding: 4px 8px; vertical-align: top; }
  table.meta td:first-child { width: 180px; color: #555; font-weight: 600; background: #fafafa; }
  .hash { font-family: monospace; font-size: 11px; word-break: break-all; }
  .declaration { background: #f6f6f6; border-left: 3px solid #888; padding: 8px 12px; font-style: italic; }
  .sig-box { margin: 8px 0; }
  .sig-label { display: block; font-size: 11px; color: #777; margin-bottom: 4px; }
  .sig-img { max-height: 90px; border: 1px solid #ddd; padding: 4px; }
  .sig-typed { font-family: 'Brush Script MT', cursive; font-size: 26px; margin: 4px 0; }
  .content { border: 1px solid #eee; padding: 12px 16px; margin-top: 8px; border-radius: 6px; }
  section.doc { page-break-after: always; margin-bottom: 28px; }
  section.doc:last-child { page-break-after: auto; }
  @media print { body { padding: 0; } .noprint { display: none; } }
  .noprint { text-align: center; margin-bottom: 16px; }
  .btn { background: #111; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 14px; }
</style>
</head>
<body>
  <div class="noprint">
    <button class="btn" onclick="window.print()">Imprimir / Guardar como PDF</button>
  </div>
  <div class="cover">
    <h1>Expediente legal del usuario</h1>
    <p><strong>Usuario:</strong> ${esc(userName || "—")}</p>
    <p><strong>Email:</strong> ${esc(userEmail || "—")}</p>
    <p><strong>ID:</strong> ${esc(userId)}</p>
    <p><strong>Documentos aceptados:</strong> ${consents.length} · <strong>Firmas digitales:</strong> ${signatures.length} · <strong>Verificación de edad:</strong> ${ageVerifications.length}</p>
    <p><strong>Generado:</strong> ${esc(generatedAt)}</p>
  </div>
  ${consents.length ? `<h1>Consentimientos aceptados</h1>${consentBlocks}` : ""}
  ${signatures.length ? `<h1>Firmas digitales</h1>${signatureBlocks}` : ""}
  ${ageVerifications.length ? `<h1>Verificación de edad</h1>${ageBlocks}` : ""}
  ${!consents.length && !signatures.length && !ageVerifications.length ? "<p>Este usuario no tiene documentos legales registrados.</p>" : ""}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error(
      "El navegador bloqueó la ventana emergente. Permite pop-ups para descargar el PDF.",
    );
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
