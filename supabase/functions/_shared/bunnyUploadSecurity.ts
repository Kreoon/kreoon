// ============================================================================
// KREOON — Seguridad compartida para las funciones de subida a Bunny
// (bunny-portfolio-upload, bunny-upload, bunny-upload-v2, bunny-raw-upload,
//  bunny-media-upload).
//
// Regla: NINGUNA clave de Bunny (API key de Stream ni contraseña de zona de
// Storage) sale hacia el navegador. En su lugar:
//   - Bunny Stream: firma TUS (sha256(libraryId + apiKey + expiration + videoId)),
//     mismo esquema que academy-video-upload-init. El navegador sube directo a
//     https://video.bunnycdn.com/tusupload sin conocer la API key.
//   - Bunny Storage: no existen URLs prefirmadas. El navegador hace PUT a la
//     propia edge function con un token HMAC de un solo destino (zona + ruta +
//     tamaño máximo + expiración) en la cabecera `AccessKey`; la función valida
//     el token y reenvía el cuerpo a Bunny con la contraseña real.
//     Así los clientes existentes (que hacen PUT a `uploadUrl` con
//     `AccessKey: accessKey`) siguen funcionando sin cambios.
//
// Compatibilidad temporal (BUNNY_UPLOAD_LEGACY_COMPAT):
//   El frontend publicado antes de este cambio llama a bunny-portfolio-upload
//   SIN cabecera Authorization. Mientras ese frontend siga en producción, la
//   compatibilidad queda activa (valor por defecto) y esas llamadas anónimas se
//   aceptan, pero ya sin entregar claves (solo token de proxy). Tras desplegar
//   el frontend nuevo en Vercel: `supabase secrets set BUNNY_UPLOAD_LEGACY_COMPAT=off`.
// ============================================================================

// deno-lint-ignore no-explicit-any
type SupabaseClientLike = any;

export const uploadCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accesskey",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...uploadCorsHeaders, "Content-Type": "application/json" },
  });
}

/** true mientras el frontend antiguo (sin Authorization) siga en producción. */
export function legacyCompatEnabled(): boolean {
  const v = (Deno.env.get("BUNNY_UPLOAD_LEGACY_COMPAT") || "").trim().toLowerCase();
  return !(v === "off" || v === "false" || v === "0");
}

/**
 * Devuelve el usuario autenticado a partir del JWT del header Authorization.
 * El anon key / publishable key NO es un usuario: getUser() falla y se devuelve null.
 */
export async function getRequestUser(
  req: Request,
  admin: SupabaseClientLike,
): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id };
  } catch {
    return null;
  }
}

/** Membresía en la organización (organization_members u organization_member_roles). */
export async function isOrgMember(
  admin: SupabaseClientLike,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  if (!userId || !organizationId) return false;
  const { data: m } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (m) return true;
  const { data: r } = await admin
    .from("organization_member_roles")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return !!r;
}

/**
 * Autoriza escritura sobre un contenido: asignado (editor/creator/strategist)
 * o miembro de la organización del contenido. Mismo criterio que set-final-videos.
 */
export async function canWriteContent(
  admin: SupabaseClientLike,
  userId: string,
  contentId: string,
): Promise<{ ok: boolean; status: number; organizationId?: string }> {
  if (!contentId) return { ok: false, status: 400 };
  const { data: row, error } = await admin
    .from("content")
    .select("organization_id, editor_id, creator_id, strategist_id")
    .eq("id", contentId)
    .maybeSingle();
  if (error || !row) return { ok: false, status: 404 };
  if (row.editor_id === userId || row.creator_id === userId || row.strategist_id === userId) {
    return { ok: true, status: 200, organizationId: row.organization_id };
  }
  if (row.organization_id && (await isOrgMember(admin, userId, row.organization_id))) {
    return { ok: true, status: 200, organizationId: row.organization_id };
  }
  return { ok: false, status: 403 };
}

// ---------------------------------------------------------------------------
// Bunny Stream — firma TUS
// ---------------------------------------------------------------------------

export const TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";
const TUS_TTL_SECONDS = 4 * 60 * 60; // 4h, igual que academy-video-upload-init

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface TusCredentials {
  endpoint: string;
  video_id: string;
  library_id: string;
  expiration: number;
  signature: string;
}

export async function signTusUpload(
  libraryId: string,
  apiKey: string,
  videoId: string,
): Promise<TusCredentials> {
  const expiration = Math.floor(Date.now() / 1000) + TUS_TTL_SECONDS;
  const signature = await sha256Hex(`${libraryId}${apiKey}${expiration}${videoId}`);
  return { endpoint: TUS_ENDPOINT, video_id: videoId, library_id: String(libraryId), expiration, signature };
}

// ---------------------------------------------------------------------------
// Token de proxy (HMAC) — sustituye a la clave real en `accessKey`
// ---------------------------------------------------------------------------

export interface ProxyTokenPayload {
  fn: string;                 // función que emitió el token (no reutilizable en otra)
  kind: "stream" | "storage";
  target: string;             // stream: videoId | storage: "<zoneKey>:<path>"
  max: number;                // bytes máximos permitidos
  exp: number;                // epoch segundos
  uid?: string | null;        // usuario que lo pidió (auditoría)
}

const PROXY_TTL_SECONDS = 60 * 60; // 1h

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("BUNNY_UPLOAD_TOKEN_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("upload token secret not configured");
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`bunny-upload-proxy:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createProxyToken(
  payload: Omit<ProxyTokenPayload, "exp">,
  ttlSeconds = PROXY_TTL_SECONDS,
): Promise<string> {
  const full: ProxyTokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = b64url(new TextEncoder().encode(JSON.stringify(full)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(body)));
  return `kbt1.${body}.${b64url(sig)}`;
}

export async function verifyProxyToken(token: string, fn: string): Promise<ProxyTokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "kbt1") return null;
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      b64urlDecode(parts[2]),
      new TextEncoder().encode(parts[1]),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1]))) as ProxyTokenPayload;
    if (payload.fn !== fn) return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** URL pública de la propia función, usada como `uploadUrl` del proxy. */
export function functionUrl(fnName: string): string {
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  return `${base}/functions/v1/${fnName}`;
}

const BUFFER_LIMIT_BYTES = 30 * 1024 * 1024;

/**
 * Reenvía el cuerpo del PUT del navegador a Bunny con la clave real.
 * <=30MB se bufferiza (Content-Length exacto); por encima se transmite en streaming.
 * Límite práctico: el idle timeout de Edge Functions (150s) — por eso los videos
 * grandes van por TUS directo y no por este proxy.
 */
export async function forwardPutToBunny(
  req: Request,
  targetUrl: string,
  accessKey: string,
  maxBytes: number,
  contentType: string,
): Promise<Response> {
  const declared = Number(req.headers.get("content-length") || "0");
  if (declared && declared > maxBytes) {
    return jsonResponse({ success: false, error: "Archivo demasiado grande" }, 413);
  }
  if (!req.body) return jsonResponse({ success: false, error: "Cuerpo vacío" }, 400);

  let upstream: Response;
  if (declared && declared <= BUFFER_LIMIT_BYTES) {
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength > maxBytes) return jsonResponse({ success: false, error: "Archivo demasiado grande" }, 413);
    upstream = await fetch(targetUrl, {
      method: "PUT",
      headers: { AccessKey: accessKey, "Content-Type": contentType },
      body: buf,
    });
  } else {
    let seen = 0;
    const limiter = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > maxBytes) {
          controller.error(new Error("Archivo demasiado grande"));
          return;
        }
        controller.enqueue(chunk);
      },
    });
    upstream = await fetch(targetUrl, {
      method: "PUT",
      headers: { AccessKey: accessKey, "Content-Type": contentType },
      body: req.body.pipeThrough(limiter),
      // @ts-ignore duplex es necesario para cuerpos en streaming en Deno
      duplex: "half",
    });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error("[bunny-upload-proxy] Bunny PUT failed:", upstream.status, text.slice(0, 300));
    return jsonResponse({ success: false, error: `Bunny respondió ${upstream.status}` }, 502);
  }
  await upstream.body?.cancel().catch(() => {});
  return jsonResponse({ success: true }, 200);
}

/** Normaliza una ruta de Storage: sin '..', sin barras iniciales, sin caracteres raros. */
export function sanitizeStoragePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.trim().replace(/^\/+/, "");
  if (!path || path.length > 512) return null;
  if (path.includes("..") || path.includes("\\") || path.includes("//")) return null;
  // Nombres de archivo de usuario pueden traer espacios/tildes (RawAssetsUploader):
  // solo se bloquean caracteres de control y los que alteran la URL.
  // deno-lint-ignore no-control-regex
  if (/[\x00-\x1f\x7f?#]/.test(path)) return null;
  return path;
}

/**
 * Reemplaza el nombre de archivo por uno generado en el servidor (conserva carpeta
 * y extensión). Con esto un token nunca puede sobrescribir un archivo existente.
 */
export function serverFileName(path: string): string {
  const idx = path.lastIndexOf("/");
  const dir = idx >= 0 ? path.slice(0, idx + 1) : "";
  const name = idx >= 0 ? path.slice(idx + 1) : path;
  const m = name.match(/\.([A-Za-z0-9]{1,8})$/);
  const ext = m ? `.${m[1].toLowerCase()}` : "";
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `${dir}${Date.now()}_${rand}${ext}`;
}
