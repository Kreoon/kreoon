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

    const storagePassword = (Deno.env.get("BUNNY_STORAGE_PASSWORD") || "").trim() || undefined;
    if (!storagePassword) {
      return new Response(JSON.stringify({ success: false, error: "Configuración de storage incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, filename } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ success: false, error: "URL requerida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!u.hostname.includes("storage.bunnycdn.com")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "La descarga segura requiere una URL de Bunny Storage (storage.bunnycdn.com)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Downloading raw asset via storage URL:", url);

    const upstream = await fetch(url, {
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
