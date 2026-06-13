import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowed hostnames for SSRF prevention — only Google Docs/Drive
const ALLOWED_HOSTNAMES = ["docs.google.com", "drive.google.com"];

function isAllowedHostname(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return ALLOWED_HOSTNAMES.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required", content: "" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // SSRF prevention: only allow Google Docs/Drive hostnames
    if (!isAllowedHostname(formattedUrl)) {
      console.warn("[fetch-document] Rejected non-allowed hostname:", formattedUrl);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Solo se permiten URLs de docs.google.com o drive.google.com.",
          content: "",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isGoogleUrl = true; // hostname already validated above

    // Handle Google Drive/Docs links
    if (isGoogleUrl) {
      let fileId = "";
      let isNativeGoogleDoc = false;

      // Extract file ID from various Google URL formats
      if (formattedUrl.includes("/file/d/")) {
        const match = formattedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      } else if (formattedUrl.includes("/document/d/")) {
        const match = formattedUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          fileId = match[1];
          isNativeGoogleDoc = true;
        }
      } else if (formattedUrl.includes("id=")) {
        const match = formattedUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      }

      if (!fileId) {
        console.log("Could not extract file ID from Google URL:", formattedUrl);
        return new Response(
          JSON.stringify({
            success: true,
            content: "",
            warning: "No se pudo extraer el ID del documento de Google.",
            source: "google-direct",
            url: formattedUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Extracted file ID:", fileId, "isNativeGoogleDoc:", isNativeGoogleDoc);

      // For native Google Docs, use export as text
      if (isNativeGoogleDoc) {
        const exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
        console.log("Fetching native Google Doc from:", exportUrl);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const response = await fetch(exportUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const text = await response.text();
            if (text && text.length > 0 && !text.startsWith("<!DOCTYPE")) {
              console.log("Google Doc fetch successful, content length:", text.length);
              return new Response(
                JSON.stringify({
                  success: true,
                  content: text,
                  source: "google-doc",
                  url: formattedUrl,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
          console.log("Google Doc export failed, status:", response.status);
        } catch (error) {
          console.error("Google Doc fetch error:", error);
        }
      }

      // For Drive files (PDFs, DOCs, etc.), try direct download link
      const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      console.log("Trying direct download for Drive file:", directDownloadUrl);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(directDownloadUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          console.log("Content-Type:", contentType);

          // If it's HTML, it might be a confirmation page or error
          if (contentType.includes("text/html")) {
            const html = await response.text();

            // Check if it's a virus scan warning page (large files)
            if (html.includes("confirm=") || html.includes("download_warning")) {
              console.log("Detected download confirmation page, file may be too large");
              return new Response(
                JSON.stringify({
                  success: true,
                  content: "",
                  warning: "El archivo es muy grande para descarga directa. Por favor usa un Google Doc nativo o copia el contenido manualmente.",
                  source: "google-drive",
                  url: formattedUrl,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // If it starts with doctype, it's probably an error page
            if (html.startsWith("<!DOCTYPE") || html.includes("ServiceLogin")) {
              console.log("Received error/login page instead of file content");
              return new Response(
                JSON.stringify({
                  success: true,
                  content: "",
                  warning: "No se pudo acceder al archivo. Verifica que tenga permisos 'Cualquiera con el enlace'.",
                  source: "google-drive",
                  url: formattedUrl,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // It might be actual text content
            console.log("Received HTML/text content, length:", html.length);
            return new Response(
              JSON.stringify({
                success: true,
                content: html,
                source: "google-drive",
                url: formattedUrl,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // For PDFs and binary files, we can't extract text directly
          if (contentType.includes("application/pdf") ||
              contentType.includes("application/msword") ||
              contentType.includes("application/vnd.openxmlformats")) {
            console.log("Binary file detected:", contentType);
            return new Response(
              JSON.stringify({
                success: true,
                content: "",
                warning: `Archivo ${contentType.includes("pdf") ? "PDF" : "Word"} detectado. Para mejor compatibilidad, convierte a Google Doc nativo o copia el contenido en un Google Doc.`,
                source: "google-drive",
                url: formattedUrl,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // For text-based files
          const text = await response.text();
          if (text && text.length > 0) {
            console.log("Drive file content fetched, length:", text.length);
            return new Response(
              JSON.stringify({
                success: true,
                content: text,
                source: "google-drive",
                url: formattedUrl,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (error) {
        console.error("Drive direct download error:", error);
      }

      return new Response(
        JSON.stringify({
          success: true,
          content: "",
          warning: "No se pudo acceder al documento. Para PDFs/DOCs, conviértelos a Google Docs nativos o copia el contenido.",
          source: "google-drive",
          url: formattedUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unreachable — all non-Google URLs are rejected above.
    // Kept as safety net.
    return new Response(
      JSON.stringify({ success: false, error: "URL no permitida.", content: "" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fetch-document:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({
        success: true,
        content: "",
        warning: errorMessage,
        source: "error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
