import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clean and normalize prompt for image generation
function cleanPromptForImageGen(rawPrompt: string): string {
  // Remove HTML tags
  let cleaned = rawPrompt.replace(/<[^>]*>/g, '');
  
  // Remove markdown-style formatting
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  
  // Remove excessive decorative characters
  cleaned = cleaned.replace(/═+/g, '');
  cleaned = cleaned.replace(/─+/g, '');
  cleaned = cleaned.replace(/[1-7]️⃣/g, '');
  cleaned = cleaned.replace(/🎯|🧴|🔥|📐|⚠️|🎨|✅|❌|👉|🧠|🏁/g, '');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  return cleaned.trim();
}

// Parse aspect ratio and get dimensions
function getDimensionsFromFormat(format: string): { width: number; height: number } {
  const formats: Record<string, { width: number; height: number }> = {
    "9:16": { width: 1080, height: 1920 },
    "1:1": { width: 1080, height: 1080 },
    "16:9": { width: 1920, height: 1080 },
  };
  return formats[format] || formats["9:16"];
}

// Extract aspect ratio from prompt
function extractAspectRatio(prompt: string): string {
  const match = prompt.match(/Aspect ratio:\s*(\d+:\d+)/i);
  return match ? match[1] : "9:16";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { prompt, referenceImage, productImage, contentId, outputFormat } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating thumbnail for content:", contentId);
    console.log("Raw prompt length:", prompt.length);
    console.log("Has reference image:", !!referenceImage);
    console.log("Has product image:", !!productImage);
    console.log("Requested format:", outputFormat);

    // Get dimensions based on format - FORCE width/height properly
    const format = outputFormat || extractAspectRatio(prompt);
    const dimensions = getDimensionsFromFormat(format);
    
    console.log("Using dimensions:", dimensions.width, "x", dimensions.height);
    console.log("Aspect ratio:", format);

    // Clean the prompt for image generation
    const cleanedPrompt = cleanPromptForImageGen(prompt);
    console.log("Cleaned prompt length:", cleanedPrompt.length);

    // Build optimized prompt for Gemini
    const optimizedPrompt = `Create a vertical social media thumbnail.

FORMAT (MANDATORY):
- Aspect ratio: ${format}
- Resolution: ${dimensions.width}x${dimensions.height}
- Orientation: ${dimensions.height > dimensions.width ? 'Vertical' : dimensions.height === dimensions.width ? 'Square' : 'Horizontal'}
- Mobile-first composition

${cleanedPrompt}`;

    // Build messages for the AI
    const messages: any[] = [];
    const contentParts: any[] = [
      {
        type: "text",
        text: optimizedPrompt
      }
    ];

    // Add reference image if provided
    if (referenceImage) {
      contentParts.push({
        type: "image_url",
        image_url: {
          url: referenceImage
        }
      });
    }

    // Add product image if provided
    if (productImage) {
      contentParts.push({
        type: "image_url",
        image_url: {
          url: productImage
        }
      });
    }

    messages.push({
      role: "user",
      content: contentParts.length > 1 ? contentParts : optimizedPrompt
    });

    console.log("Calling Lovable AI Gateway for image generation...");
    console.log("Number of images attached:", (referenceImage ? 1 : 0) + (productImage ? 1 : 0));

    // Call the Lovable AI Gateway with NanoBanana model
    // CRITICAL: Force dimensions in the API call
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages,
        modalities: ["image", "text"],
        // Force the image dimensions in generation config
        generation_config: {
          image_format: "png",
          aspect_ratio: format,
          image_size: {
            width: dimensions.width,
            height: dimensions.height
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the generated image
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("No image was generated");
    }

    console.log("Image generated successfully, uploading to storage...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob and upload to Supabase storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `ai-thumbnail-${contentId}-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("content-thumbnails")
      .upload(fileName, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to upload thumbnail to storage");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("content-thumbnails")
      .getPublicUrl(fileName);

    console.log("Thumbnail uploaded successfully:", urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        thumbnail_url: urlData.publicUrl,
        message: "Thumbnail generated successfully",
        dimensions: dimensions,
        format: format
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-thumbnail:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
