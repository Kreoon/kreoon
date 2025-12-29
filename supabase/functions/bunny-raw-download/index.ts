import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
        // /<zone>/<path...>
        const parts = u.pathname.replace(/^\//, "").split("/");
        const zoneFromUrl = parts[0];
        const restPath = parts.slice(1).join("/");

        // If the URL zone is not our configured storageZone, treat it as a folder prefix.
        // This happens when older code stored URLs like:
        //   https://<region>.storage.bunnycdn.com/raw-assets/<path>
        // but the real zone is e.g. "ugc-colombia".
        if (zoneFromUrl && zoneFromUrl !== storageZone) {
          normalizedPath = `${zoneFromUrl}/${restPath}`;
        } else {
          normalizedPath = restPath;
        }

        hostForStorage = u.hostname; // keep region if provided
      } else {
        normalizedPath = u.pathname.replace(/^\//, "");
      }
    } else {
      normalizedPath = rawInput.replace(/^\//, "");
    }

    // Strip accidental zone prefix only if it matches our configured zone.
    // NOTE: Do NOT strip "raw-assets/" here; it may be a real folder in the zone.
    if (normalizedPath.startsWith(`${storageZone}/`)) {
      normalizedPath = normalizedPath.slice(storageZone.length + 1);
    }

    if (!normalizedPath) {
      return new Response(JSON.stringify({ success: false, error: "Ruta inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
