import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Subida de videos finales a Bunny Stream para el MCP de Kreoon.
//
// El MCP (tool get_content_video_upload) autentica a la organización y emite un token HMAC
// de 30 min atado a UN contenido: base64url({k:"vu", c, o, e}).firma. Con ese token:
//   action "create"           -> crea el video en Bunny y devuelve credenciales TUS firmadas
//                                (nunca la API key) para subir el archivo directo a Bunny.
//   action "set-final-videos" -> guarda las URLs finales en content.video_urls de ESE contenido.
// Mismo secreto que mcp-asset-download (MCP_ASSET_SIGNING_SECRET); el campo k evita que un
// token de descarga sirva aquí y viceversa.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";
const TUS_TTL_SECONDS = 3600;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Método no permitido" });

  try {
    const secret = (Deno.env.get("MCP_ASSET_SIGNING_SECRET") || "").trim();
    const apiKey = (Deno.env.get("BUNNY_API_KEY") || "").trim();
    const libraryId = (Deno.env.get("BUNNY_LIBRARY_ID") || "").trim();
    const cdnHost = (Deno.env.get("BUNNY_CDN_HOSTNAME") || "").trim();
    if (!secret || !apiKey || !libraryId) return json(500, { success: false, error: "Configuración incompleta" });

    // 1) Token HMAC
    const token = new URL(req.url).searchParams.get("t") || "";
    const [payloadPart, sigPart, ...rest] = token.split(".");
    if (!payloadPart || !sigPart || rest.length) return json(401, { success: false, error: "Token inválido" });
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sigPart), new TextEncoder().encode(payloadPart));
    if (!ok) return json(401, { success: false, error: "Token inválido" });
    let p: { k?: unknown; c?: unknown; o?: unknown; e?: unknown };
    try {
      p = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadPart)));
    } catch {
      return json(401, { success: false, error: "Token inválido" });
    }
    if (p.k !== "vu" || typeof p.c !== "string" || typeof p.o !== "string" || typeof p.e !== "number") {
      return json(401, { success: false, error: "Token inválido" });
    }
    if (Math.floor(Date.now() / 1000) > p.e) return json(401, { success: false, error: "Token expirado" });

    // 2) El contenido debe existir en la organización del token
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: content } = await admin.from("content").select("id")
      .eq("id", p.c).eq("organization_id", p.o).is("deleted_at", null).single();
    if (!content) return json(404, { success: false, error: "Contenido no encontrado" });

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action || "create");

    if (action === "set-final-videos") {
      const urls = Array.isArray(body.urls) ? body.urls : null;
      if (!urls) return json(400, { success: false, error: "urls[] requerido" });
      const allowed = (u: unknown): u is string =>
        typeof u === "string" &&
        (u.startsWith(`https://iframe.mediadelivery.net/embed/${libraryId}/`) || (!!cdnHost && u.startsWith(`https://${cdnHost}/`)));
      const cleaned = urls.filter(allowed).slice(0, 20);
      if (cleaned.length !== urls.length) return json(400, { success: false, error: "Solo se aceptan URLs de la librería de Bunny de Kreoon" });
      const { error } = await admin.from("content").update({ video_urls: cleaned }).eq("id", p.c).eq("organization_id", p.o);
      if (error) return json(500, { success: false, error: error.message });
      return json(200, { success: true, video_urls: cleaned });
    }

    if (action !== "create") return json(400, { success: false, error: "Acción no soportada" });

    const title = String(body.title || `mcp-final-${p.c}-${Date.now()}`).replace(/[^\w .\-áéíóúñÁÉÍÓÚÑ]/g, "").slice(0, 100);
    const created = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: "POST",
      headers: { AccessKey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!created.ok) {
      console.error("mcp-video-upload create", created.status, await created.text().catch(() => ""));
      return json(502, { success: false, error: "No se pudo crear el video en Bunny" });
    }
    const video = await created.json() as { guid: string };
    const expiration = Math.floor(Date.now() / 1000) + TUS_TTL_SECONDS;
    const signature = await sha256Hex(`${libraryId}${apiKey}${expiration}${video.guid}`);
    return json(200, {
      success: true,
      video_id: video.guid,
      embed_url: `https://iframe.mediadelivery.net/embed/${libraryId}/${video.guid}`,
      mp4_url: cdnHost ? `https://${cdnHost}/${video.guid}/play_1080p.mp4` : null,
      thumbnail_url: cdnHost ? `https://${cdnHost}/${video.guid}/thumbnail.jpg` : null,
      tus: { endpoint: TUS_ENDPOINT, video_id: video.guid, library_id: libraryId, expiration, signature },
    });
  } catch (err) {
    console.error("mcp-video-upload error:", err);
    return json(500, { success: false, error: "Error inesperado" });
  }
});
