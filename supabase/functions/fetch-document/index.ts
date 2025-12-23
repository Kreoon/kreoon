import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const isGoogleDoc = formattedUrl.includes("docs.google.com") || formattedUrl.includes("drive.google.com");

    // Convert Google Drive/Docs links to export format
    if (isGoogleDoc) {
      // Handle Drive file links
      if (formattedUrl.includes("drive.google.com") && formattedUrl.includes("/file/d/")) {
        const fileIdMatch = formattedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          formattedUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
        }
      }
      
      // Handle Google Docs links
      if (formattedUrl.includes("docs.google.com/document")) {
        const docIdMatch = formattedUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (docIdMatch) {
          const docId = docIdMatch[1];
          formattedUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        }
      }

      console.log("Fetching Google Doc from:", formattedUrl);

      // Direct fetch for Google Docs
      try {
        const directResponse = await fetch(formattedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (directResponse.ok) {
          const text = await directResponse.text();
          // Check if we got actual content (not an HTML error page)
          if (text && text.length > 0 && !text.startsWith("<!DOCTYPE")) {
            console.log("Google Doc fetch successful, content length:", text.length);
            return new Response(
              JSON.stringify({
                success: true,
                content: text,
                source: "google-direct",
                url: formattedUrl,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        console.log("Google Doc fetch failed - document may not be public. Status:", directResponse.status);
      } catch (directError) {
        console.error("Google Doc direct fetch error:", directError);
      }

      // Return success with empty content and warning (don't fail the request)
      return new Response(
        JSON.stringify({
          success: true,
          content: "",
          warning: "No se pudo acceder al documento. Verifica que tenga permisos 'Cualquiera con el enlace'.",
          source: "google-direct",
          url: formattedUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For non-Google URLs, use Firecrawl
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.log("FIRECRAWL_API_KEY not configured, returning empty content");
      return new Response(
        JSON.stringify({ 
          success: true, 
          content: "", 
          warning: "Firecrawl no configurado para URLs externas",
          source: "none",
          url: formattedUrl 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Using Firecrawl for external URL:", formattedUrl);

    try {
      // Use Firecrawl with AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || data.success === false) {
        console.log("Firecrawl returned error:", data.error || "Unknown error");
        return new Response(
          JSON.stringify({
            success: true,
            content: "",
            warning: data.error || "No se pudo obtener el contenido de la URL",
            source: "firecrawl",
            url: formattedUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const content = data.data?.markdown || data.markdown || "";
      const metadata = data.data?.metadata || data.metadata || {};

      console.log("Firecrawl successful, content length:", content.length);

      return new Response(
        JSON.stringify({
          success: true,
          content,
          metadata,
          source: "firecrawl",
          url: formattedUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (firecrawlError) {
      const errorMessage = firecrawlError instanceof Error ? firecrawlError.message : "Error desconocido";
      console.log("Firecrawl error:", errorMessage);
      
      return new Response(
        JSON.stringify({
          success: true,
          content: "",
          warning: `No se pudo obtener el contenido: ${errorMessage}`,
          source: "firecrawl",
          url: formattedUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
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
