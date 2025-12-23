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
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

      // Direct fetch for Google Docs - always use this method for Google URLs
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
          } else {
            console.log("Google Doc returned HTML page instead of text content");
          }
        } else {
          console.log("Google Doc fetch failed with status:", directResponse.status);
        }
      } catch (directError) {
        console.error("Google Doc direct fetch error:", directError);
      }

      // If Google direct fetch failed, return error (don't try Firecrawl for private Google docs)
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se pudo acceder al documento de Google. Verifica que sea público o tenga permisos de 'Cualquiera con el enlace'.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For non-Google URLs, use Firecrawl
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured for external URLs" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Using Firecrawl for external URL:", formattedUrl);

    // Use Firecrawl for scraping non-Google URLs
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
        timeout: 15000, // 15 second timeout
      }),
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      console.error("Firecrawl error:", data);
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error || `Failed to fetch document: ${response.status}`,
        }),
        { status: response.status === 200 ? 400 : response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
  } catch (error) {
    console.error("Error fetching document:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch document";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
