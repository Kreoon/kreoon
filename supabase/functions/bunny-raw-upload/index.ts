import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createProxyToken,
  forwardPutToBunny,
  functionUrl,
  getRequestUser,
  isOrgMember,
  jsonResponse,
  sanitizeStoragePath,
  serverFileName,
  uploadCorsHeaders,
  verifyProxyToken,
} from "../_shared/bunnyUploadSecurity.ts";

const FN = "bunny-raw-upload";
// Imágenes, GIF, audio y videos cortos (useBunnyImageUpload: video <= 100MB).
const PROXY_MAX_BYTES = 200 * 1024 * 1024;
const RAW_PATH_RE = /^org_([0-9a-fA-F-]{36})\/client_[^/]+\/project_[^/]+\/raw\/[^/]+$/;

/**
 * bunny-raw-upload
 *
 * 1. GET ?storagePath=... | POST {storagePath}: requiere JWT de usuario.
 *    - Rutas generales (marketplace/, academy/, social/...): devuelve `uploadUrl`
 *      (esta misma función) + `accessKey` = token de un solo destino. El nombre de
 *      archivo lo genera el servidor (no se puede sobrescribir nada existente).
 *      La contraseña de la zona NUNCA sale del servidor.
 *    - Material crudo de proyecto `org_<orgId>/client_*\/project_*\/raw/<archivo>`:
 *      solo miembros de esa organización. Por el tamaño de estos archivos (GB) no
 *      pueden pasar por el proxy (idle timeout 150s), así que se siguen entregando
 *      credenciales directas — RIESGO RESIDUAL documentado en ARCHITECTURE_LEDGER.
 * 2. PUT con `AccessKey: <token>`: proxy que reenvía el archivo a Bunny Storage.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: uploadCorsHeaders });
  }

  try {
    const storageZone = Deno.env.get("BUNNY_STORAGE_ZONE");
    const storagePassword = Deno.env.get("BUNNY_STORAGE_PASSWORD");
    const storageHostname = Deno.env.get("BUNNY_STORAGE_HOSTNAME") || "storage.bunnycdn.com";
    const cdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME");

    if (!storageZone || !storagePassword) {
      console.error("Missing Bunny Storage credentials");
      return jsonResponse({ success: false, error: "Configuración de storage incompleta" }, 500);
    }

    const buildUploadUrl = (p: string) => `https://${storageHostname}/${storageZone}/${p}`;
    const buildCdnUrl = (p: string) =>
      cdnHostname ? `https://${cdnHostname}/${p}` : `https://${storageZone}.b-cdn.net/${p}`;

    // === PUT: proxy con token ===
    if (req.method === "PUT") {
      const token = req.headers.get("AccessKey") || "";
      const payload = await verifyProxyToken(token, FN);
      if (!payload || payload.kind !== "storage" || !payload.target.startsWith("raw:")) {
        return jsonResponse({ success: false, error: "Token de subida inválido o vencido" }, 401);
      }
      const path = payload.target.slice("raw:".length);
      const ct = (req.headers.get("content-type") || "application/octet-stream").slice(0, 120);
      return await forwardPutToBunny(req, buildUploadUrl(path), storagePassword, payload.max, ct);
    }

    // === Solicitud de subida: requiere usuario autenticado ===
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const user = await getRequestUser(req, admin);
    if (!user) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }

    let rawPath: unknown = null;
    if (req.method === "GET") {
      rawPath = new URL(req.url).searchParams.get("storagePath");
    } else if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        return jsonResponse({
          success: false,
          error: "Subida directa no soportada. Usa GET para obtener credenciales.",
          code: "USE_DIRECT_UPLOAD",
        }, 400);
      }
      try {
        const body = await req.json();
        rawPath = body.storagePath;
      } catch {
        return jsonResponse({ success: false, error: "Body JSON inválido" }, 400);
      }
    } else {
      return jsonResponse({ success: false, error: "Método no permitido" }, 405);
    }

    const requested = sanitizeStoragePath(rawPath);
    if (!requested) {
      return jsonResponse({ success: false, error: "storagePath requerido o inválido" }, 400);
    }

    // --- Material crudo de proyecto: membresía obligatoria ---
    if (requested.startsWith("org_")) {
      const m = requested.match(RAW_PATH_RE);
      if (!m) {
        return jsonResponse({ success: false, error: "Ruta de material crudo inválida" }, 400);
      }
      if (!(await isOrgMember(admin, user.id, m[1]))) {
        return jsonResponse({ success: false, error: "No perteneces a esta organización" }, 403);
      }
      console.log(`[bunny-raw-upload] Credenciales de material crudo para org ${m[1]} (user ${user.id})`);
      return jsonResponse({
        success: true,
        uploadUrl: buildUploadUrl(requested),
        cdnUrl: buildCdnUrl(requested),
        accessKey: storagePassword,
        storageZone,
        storagePath: requested,
      });
    }

    // --- Resto: proxy con token y nombre de archivo del servidor ---
    const storagePath = serverFileName(requested);
    const accessKey = await createProxyToken({
      fn: FN,
      kind: "storage",
      target: `raw:${storagePath}`,
      max: PROXY_MAX_BYTES,
      uid: user.id,
    });

    return jsonResponse({
      success: true,
      uploadUrl: functionUrl(FN),
      cdnUrl: buildCdnUrl(storagePath),
      accessKey,
      storageZone,
      storagePath,
    });
  } catch (error: unknown) {
    console.error("[bunny-raw-upload] Error:", error);
    const errMsg = error instanceof Error ? error.message : "Error interno";
    return jsonResponse({ success: false, error: errMsg }, 500);
  }
});
