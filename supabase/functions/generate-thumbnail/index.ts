import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

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

// Parse format string and get dimensions
function parseOutputFormat(format: string): { width: number; height: number; aspectRatio: string } {
  // Handle direct dimension formats like "1080x1920", "1024x1536"
  const dimMatch = format.match(/^(\d+)x(\d+)$/);
  if (dimMatch) {
    const width = parseInt(dimMatch[1], 10);
    const height = parseInt(dimMatch[2], 10);
    // Derive aspect ratio
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const aspectRatio = `${width / divisor}:${height / divisor}`;
    return { width, height, aspectRatio };
  }
  
  // Handle ratio formats like "9:16", "1:1", "16:9"
  const ratioFormats: Record<string, { width: number; height: number; aspectRatio: string }> = {
    "9:16": { width: 1080, height: 1920, aspectRatio: "9:16" },
    "1:1": { width: 1080, height: 1080, aspectRatio: "1:1" },
    "16:9": { width: 1920, height: 1080, aspectRatio: "16:9" },
  };
  
  return ratioFormats[format] || { width: 1080, height: 1920, aspectRatio: "9:16" };
}

// Parse PNG dimensions from base64 data URL
function getPngDimensionsFromDataUrl(dataUrl: string): { width: number; height: number } | null {
  try {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // PNG signature (8 bytes) then IHDR chunk:
    // length(4) + type(4) + width(4) + height(4)
    // IHDR starts at byte 12 (8 sig + 4 len)
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    if (!isPng) return null;

    // Find IHDR type at 12..16
    const type = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (type !== "IHDR") return null;

    const dv = new DataView(bytes.buffer);
    const width = dv.getUint32(16, false);
    const height = dv.getUint32(20, false);
    return { width, height };
  } catch {
    return null;
  }
}

// Force the generated image into the requested dimensions (cover + center crop)
async function normalizeToSizePngBytes(
  dataUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<Uint8Array> {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  const img = await Image.decode(bytes);

  // cover resize
  const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
  const resizedW = Math.round(img.width * scale);
  const resizedH = Math.round(img.height * scale);
  const resized = img.resize(resizedW, resizedH);

  // center crop
  const x = Math.max(0, Math.floor((resized.width - targetWidth) / 2));
  const y = Math.max(0, Math.floor((resized.height - targetHeight) / 2));
  const cropped = resized.crop(x, y, targetWidth, targetHeight);

  return await cropped.encode();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    const { prompt, referenceImage, productImage, contentId, outputFormat, aiProvider, aiModel } = await req.json();

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
    console.log("AI Provider:", aiProvider || "gemini");
    console.log("AI Model:", aiModel || "google/gemini-2.5-flash-image-preview");

    // Parse format from request (accepts "1080x1920" or "9:16" style)
    const format = typeof outputFormat === "string" && outputFormat.trim() ? outputFormat.trim() : "1080x1920";
    const { width, height, aspectRatio } = parseOutputFormat(format);

    console.log("Parsed format:", format, "->", width, "x", height, "aspect:", aspectRatio);

    // Clean the prompt for image generation (remove HTML/noise)
    let cleanedPrompt = cleanPromptForImageGen(prompt);
    
    // FORCE ORIENTATION IN PROMPT - Critical for AI to respect dimensions
    const isVertical = height > width;
    const isSquare = height === width;
    
    // Build strong orientation prefix
    let orientationPrefix = "";
    if (isVertical) {
      orientationPrefix = `CRITICAL FORMAT REQUIREMENT: Generate a VERTICAL image with PORTRAIT orientation (taller than wide). 
The image MUST be in ${aspectRatio} aspect ratio (${width}x${height} pixels).
The HEIGHT must be GREATER than the WIDTH. This is for TikTok/Reels/Shorts format.
DO NOT generate a horizontal or landscape image under any circumstances.

`;
    } else if (isSquare) {
      orientationPrefix = `CRITICAL FORMAT REQUIREMENT: Generate a SQUARE image with 1:1 aspect ratio (${width}x${height} pixels).
Width and height must be equal.

`;
    } else {
      orientationPrefix = `CRITICAL FORMAT REQUIREMENT: Generate a HORIZONTAL image with LANDSCAPE orientation (wider than tall).
The image MUST be in ${aspectRatio} aspect ratio (${width}x${height} pixels).

`;
    }
    
    // Prepend orientation requirements to the prompt
    cleanedPrompt = orientationPrefix + cleanedPrompt;
    
    // Also append a reminder at the end
    if (isVertical) {
      cleanedPrompt += `

REMINDER: This image MUST be VERTICAL/PORTRAIT orientation (${aspectRatio}, ${width}x${height}). Height > Width. NOT horizontal.`;
    }
    
    console.log("Cleaned prompt length:", cleanedPrompt.length);
    console.log("Orientation enforced:", isVertical ? "VERTICAL" : isSquare ? "SQUARE" : "HORIZONTAL");

    let imageData: string | null = null;

    // ============ OPENAI MODELS (gpt-image-1, dall-e-3, dall-e-2) ============
    if (aiProvider === "openai") {
      if (!OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const modelToUse = aiModel || "gpt-image-1";
      console.log("Using OpenAI model:", modelToUse);

      // Determine size based on model
      let openaiSize: string;
      
      if (modelToUse === "dall-e-3") {
        // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
        if (width === 1024 && height === 1792) {
          openaiSize = "1024x1792";
        } else if (width === 1792 && height === 1024) {
          openaiSize = "1792x1024";
        } else {
          openaiSize = "1024x1024";
        }
      } else if (modelToUse === "dall-e-2") {
        // DALL-E 2 supports: 256x256, 512x512, 1024x1024
        openaiSize = "1024x1024";
      } else {
        // gpt-image-1 supports: 1024x1024, 1536x1024, 1024x1536, auto
        if (format === "auto") {
          openaiSize = "auto";
        } else {
          openaiSize = `${width}x${height}`;
        }
      }

      console.log("OpenAI size:", openaiSize);

      // Build request body based on model
      const requestBody: any = {
        model: modelToUse,
        prompt: cleanedPrompt,
        n: 1,
        size: openaiSize,
      };

      // Add quality parameter based on model
      if (modelToUse === "gpt-image-1") {
        requestBody.quality = "high";
      } else if (modelToUse === "dall-e-3") {
        requestBody.quality = "hd";
        requestBody.style = "vivid";
      }

      const openaiResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("OpenAI API error:", openaiResponse.status, errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
      }

      const openaiData = await openaiResponse.json();
      const b64Image = openaiData.data?.[0]?.b64_json;
      
      if (b64Image) {
        imageData = `data:image/png;base64,${b64Image}`;
      } else {
        // URL response (DALL-E models return URLs by default)
        const imageUrl = openaiData.data?.[0]?.url;
        if (imageUrl) {
          console.log("Downloading image from OpenAI URL...");
          const imgResp = await fetch(imageUrl);
          const imgBuffer = await imgResp.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
          imageData = `data:image/png;base64,${base64}`;
        }
      }

      if (!imageData) {
        console.error("No image from OpenAI:", JSON.stringify(openaiData).slice(0, 500));
        throw new Error("No image was generated by OpenAI");
      }

    // ============ GEMINI (Lovable AI Gateway) ============
    } else {
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const modelToUse = aiModel || "google/gemini-2.5-flash-image-preview";
      console.log("Using Lovable AI Gateway with model:", modelToUse);

      // Build messages for the AI
      const messages: any[] = [];
      const contentParts: any[] = [
        {
          type: "text",
          text: cleanedPrompt
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
        content: contentParts.length > 1 ? contentParts : cleanedPrompt
      });

      console.log("Calling Lovable AI Gateway for image generation...");
      console.log("Number of images attached:", (referenceImage ? 1 : 0) + (productImage ? 1 : 0));

      // Call the Lovable AI Gateway
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          modalities: ["image", "text"],
          generation_config: {
            image_format: "png",
            aspect_ratio: aspectRatio,
            image_size: {
              width: width,
              height: height
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

      imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    }

    if (!imageData) {
      console.error("No image in response");
      throw new Error("No image was generated");
    }

    // Post-generation validation: check if AI respected the requested dimensions
    const dims = getPngDimensionsFromDataUrl(imageData);
    let needsNormalization = false;
    
    if (dims) {
      console.log("Generated image dimensions:", dims.width, "x", dims.height);
      console.log("Requested dimensions:", width, "x", height);
      
      const shouldBeVertical = height > width;
      const isVertical = dims.height > dims.width;
      
      if (shouldBeVertical && !isVertical) {
        console.warn("⚠️ AI returned HORIZONTAL image when VERTICAL was requested. Will normalize.");
        needsNormalization = true;
      } else if (!shouldBeVertical && isVertical && height !== width) {
        console.warn("⚠️ AI returned VERTICAL image when HORIZONTAL was requested. Will normalize.");
        needsNormalization = true;
      } else if (dims.width !== width || dims.height !== height) {
        console.log("Image dimensions don't match exactly, will normalize to requested size.");
        needsNormalization = true;
      } else {
        console.log("✅ AI generated image with correct orientation and dimensions!");
      }
    } else {
      console.log("Could not parse image dimensions, will normalize to be safe.");
      needsNormalization = true;
    }

    console.log("Uploading to storage...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only normalize if needed (fallback when AI ignores format instructions)
    let finalBytes: Uint8Array;
    if (needsNormalization) {
      console.log("Normalizing image to", width, "x", height, "...");
      finalBytes = await normalizeToSizePngBytes(imageData, width, height);
    } else {
      // Use original image
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      finalBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    }

    const fileName = `ai-thumbnail-${contentId}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("content-thumbnails")
      .upload(fileName, finalBytes, {
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
        dimensions: { width, height },
        format: format,
        aspectRatio: aspectRatio
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
