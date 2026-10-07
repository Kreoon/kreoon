import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Descarga de material crudo (project_raw_assets) para el MCP de Kreoon.
//
// El MCP (kreoon-mcp-server) autentica a la organización y emite un token HMAC
// de corta vida: base64url(payload).base64url(firma). Esta función NO acepta
// rutas de storage del cliente: el token solo trae el id del asset y la org, y
// la ruta real se lee de la base de datos. Así un token no puede apuntar a otro
// archivo ni a otra organización.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function contentDispositionFilename(filename: string) {
  const safe = filename.replace(/\r|\n/g, " ").trim() || "download";
  return `attachment; filename="${safe.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { success: false, error: "Método no permitido" });

  try {
    const signingSecret = (Deno.env.get("MCP_ASSET_SIGNING_SECRET") || "").trim();
    const storageZone = (Deno.env.get("BUNNY_STORAGE_ZONE") || "").trim();
    const storageHostname = (Deno.env.get("BUNNY_STORAGE_HOSTNAME") || "storage.bunnycdn.com").trim();
    const storagePassword = (Deno.env.get("BUNNY_STORAGE_PASSWORD") || "").trim();
    if (!signingSecret || !storageZone || !storagePassword) {
      return json(500, { success: false, error: "Configuración incompleta" });
    }

    const token = new URL(req.url).searchParams.get("t") || "";
    const [payloadPart, sigPart, ...rest] = token.split(".");
    if (!payloadPart || !sigPart || rest.length > 0) return json(401, { success: false, error: "Token inválido" });

    // 1) Firma HMAC-SHA256 (verificación en tiempo constante vía subtle.verify)
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(signingSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const validSig = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sigPart),
      new TextEncoder().encode(payloadPart),
    );
    if (!validSig) return json(401, { success: false, error: "Token inválido" });

    // 2) Payload y expiración
    let payload: { a?: unknown; o?: unknown; e?: unknown };
    try {
      payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadPart)));
    } catch {
      return json(401, { success: false, error: "Token inválido" });
    }
    const assetId = typeof payload.a === "string" ? payload.a : "";
    const orgId = typeof payload.o === "string" ? payload.o : "";
    const exp = typeof payload.e === "number" ? payload.e : 0;
    if (!assetId || !orgId || !exp) return json(401, { success: false, error: "Token inválido" });
    if (Math.floor(Date.now() / 1000) > exp) return json(401, { success: false, error: "Token expirado" });

    // 3) La ruta real sale de la base de datos, atada a la org del token
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: asset, error } = await supabase
      .from("project_raw_assets")
      .select("storage_path, custom_filename, original_filename")
      .eq("id", assetId)
      .eq("organization_id", orgId)
      .single();
    if (error || !asset) return json(404, { success: false, error: "Archivo no encontrado" });

    const storagePath = String(asset.storage_path || "").replace(/^\//, "");
    if (
      !storagePath ||
      storagePath.includes("..") ||
      storagePath.includes("\\") ||
      !storagePath.startsWith(`org_${orgId}/`)
    ) {
      return json(400, { success: false, error: "Ruta inválida" });
    }

    const upstream = await fetch(`https://${storageHostname}/${storageZone}/${storagePath}`, {
      headers: { AccessKey: storagePassword },
    });
    if (!upstream.ok) {
      console.error("mcp-asset-download upstream", upstream.status);
      return json(502, { success: false, error: `No se pudo descargar (${upstream.status})` });
    }

    const filename = asset.custom_filename || asset.original_filename || "archivo";
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
        ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
        "Content-Disposition": contentDispositionFilename(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("mcp-asset-download error:", err);
    return json(500, { success: false, error: "Error inesperado" });
  }
});
