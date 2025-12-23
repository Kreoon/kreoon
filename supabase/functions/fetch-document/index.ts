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

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Convert Google Drive sharing links to direct view links if needed
    if (formattedUrl.includes("drive.google.com")) {
      // Convert /file/d/ID/view to /file/d/ID/preview or export
      if (formattedUrl.includes("/file/d/")) {
        const fileIdMatch = formattedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          // Try to get the document as HTML for Google Docs
          formattedUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
        }
      }
    }

    // Convert Google Docs links
    if (formattedUrl.includes("docs.google.com/document")) {
      const docIdMatch = formattedUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
      if (docIdMatch) {
        const docId = docIdMatch[1];
        formattedUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      }
    }

    console.log("Fetching document from:", formattedUrl);

    // First try direct fetch for Google export URLs
    if (formattedUrl.includes("/export?format=txt")) {
      try {
        const directResponse = await fetch(formattedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (directResponse.ok) {
          const text = await directResponse.text();
          if (text && text.length > 0 && !text.includes("<!DOCTYPE html>")) {
            console.log("Direct fetch successful, content length:", text.length);
            return new Response(
              JSON.stringify({
                success: true,
                content: text,
                source: "direct",
                url: formattedUrl,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (directError) {
        console.log("Direct fetch failed, trying Firecrawl:", directError);
      }
    }

    // Use Firecrawl for scraping
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url, // Use original URL for Firecrawl
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000, // Wait for dynamic content
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl error:", data);
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error || `Failed to fetch document: ${response.status}`,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        url,
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
