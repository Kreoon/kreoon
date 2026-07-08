import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertOrgMembership } from "../_shared/assertOrgMembership.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function contentDispositionFilename(filename: string) {
  // RFC5987
  const safe = filename.replace(/\r|\n/g, " ").trim() || "download";
  const encoded = encodeURIComponent(safe);
  return `attachment; filename="${safe.replace(/"/g, "")}"; filename*=UTF-8''${encoded}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Método no permitido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storageZone = (Deno.env.get("BUNNY_STORAGE_ZONE") || "").trim() || undefined;
    const storageHostname = (Deno.env.get("BUNNY_STORAGE_HOSTNAME") || "storage.bunnycdn.com").trim();
    const storagePassword = (Deno.env.get("BUNNY_STORAGE_PASSWORD") || "").trim() || undefined;
    if (!storagePassword || !storageZone) {
      return new Response(JSON.stringify({ success: false, error: "Configuración de storage incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const url: unknown = body?.url;
    const storagePath: unknown = body?.storagePath;
    const filename: unknown = body?.filename;

    const rawInput = (typeof storagePath === "string" && storagePath.trim())
      ? storagePath.trim()
      : (typeof url === "string" && url.trim())
        ? url.trim()
        : "";

    if (!rawInput) {
      return new Response(JSON.stringify({ success: false, error: "URL o storagePath requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject path traversal / userinfo / backslashes before anything else
    // (protocol-relative, "..", encoded traversal, etc.)
    if (
      rawInput.includes("..") ||
      rawInput.includes("\\") ||
      /%2e%2e|%2f%2e%2e|%252e/i.test(rawInput) ||
      /^\/\//.test(rawInput) ||
      /@/.test(rawInput.replace(/^https?:\/\//i, ""))
    ) {
      return new Response(JSON.stringify({ success: false, error: "Ruta inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize to a RELATIVE path inside the storage zone.
    // Accepts:
    // - full storage URL: https://<region>.storage.bunnycdn.com/<zone>/<path>
    // - full CDN URL: https://<cdnHost>/<path>
    // - legacy paths that include a zone prefix: raw-assets/<path>
    let normalizedPath = "";
    let hostForStorage = storageHostname;

    if (/^https?:\/\//i.test(rawInput)) {
      let u: URL;
      try {
        u = new URL(rawInput);
      } catch {
        return new Response(JSON.stringify({ success: false, error: "URL inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (u.hostname.includes("storage.bunnycdn.com")) {
        // Old URLs may have been stored as https://<region>.storage.bunnycdn.com/<folder>/...
        // where <folder> (e.g. "raw-assets") is NOT the zone, but a folder inside the zone.
        // We take the FULL pathname as the path inside our configured storageZone.
        normalizedPath = u.pathname.replace(/^\//, "");
        hostForStorage = u.hostname; // keep region if provided
      } else {
        normalizedPath = u.pathname.replace(/^\//, "");
      }
    } else {
      normalizedPath = rawInput.replace(/^\//, "");
    }

    // Strip configured zone prefix if someone accidentally doubled it
    if (normalizedPath.startsWith(`${storageZone}/`)) {
      normalizedPath = normalizedPath.slice(storageZone.length + 1);
    }

    if (!normalizedPath || normalizedPath.includes("..") || normalizedPath.startsWith("/")) {
      return new Response(JSON.stringify({ success: false, error: "Ruta inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FASE 1: antes solo se validaba que el header Authorization existiera
    // (no que fuera un JWT válido), y storagePath no se comprobaba contra
    // ninguna organización. Los paths se generan siempre como
    // org_<orgId>/client_.../project_.../raw/<file> (ver
    // RawAssetsUploader.tsx) — el org SIEMPRE debe ser el primer segmento
    // del path YA NORMALIZADO (no un match en cualquier parte del string
    // crudo, que podía ser burlado con ../ o un segundo "org_" falso).
    const orgMatch = normalizedPath.match(/^org_([a-zA-Z0-9-]+)\//);
    if (!orgMatch) {
      return new Response(JSON.stringify({ success: false, error: "No se pudo determinar la organización del archivo" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: { user: callerUser } = { user: null } } = await supabase.auth.getUser(authToken);
    const membershipRejection = await assertOrgMembership(req, supabase, callerUser?.id, orgMatch[1]);
    if (membershipRejection) return membershipRejection;

    const finalUrl = `https://${hostForStorage}/${storageZone}/${normalizedPath}`;
    console.log("Downloading raw asset via normalized storage URL:", finalUrl);

    const upstream = await fetch(finalUrl, {
      headers: {
        AccessKey: storagePassword,
      },
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("Upstream download failed:", upstream.status, text);
      return new Response(JSON.stringify({ success: false, error: `No se pudo descargar (${upstream.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const downloadName = (typeof filename === "string" && filename.trim()) ? filename.trim() : "archivo";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": contentDispositionFilename(downloadName),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("bunny-raw-download error:", error);
    return new Response(JSON.stringify({ success: false, error: "Error inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
