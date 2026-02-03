import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";
import { getModuleAIConfig } from "../_shared/get-module-ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";

// Clean and normalize prompt for image generation
function cleanPromptForImageGen(rawPrompt: string): string {
  let cleaned = rawPrompt.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  cleaned = cleaned.replace(/═+/g, '');
  cleaned = cleaned.replace(/─+/g, '');
  cleaned = cleaned.replace(/[1-7]️⃣/g, '');
  cleaned = cleaned.replace(/🎯|🧴|🔥|📐|⚠️|🎨|✅|❌|👉|🧠|🏁/g, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  return cleaned.trim();
}

// Parse format string and get dimensions
function parseOutputFormat(format: string): { width: number; height: number; aspectRatio: string } {
  const dimMatch = format.match(/^(\d+)x(\d+)$/);
  if (dimMatch) {
    const width = parseInt(dimMatch[1], 10);
    const height = parseInt(dimMatch[2], 10);
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const aspectRatio = `${width / divisor}:${height / divisor}`;
    return { width, height, aspectRatio };
  }
  
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
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    if (!isPng) return null;
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
  const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
  const resizedW = Math.round(img.width * scale);
  const resizedH = Math.round(img.height * scale);
  const resized = img.resize(resizedW, resizedH);
  const x = Math.max(0, Math.floor((resized.width - targetWidth) / 2));
  const y = Math.max(0, Math.floor((resized.height - targetHeight) / 2));
  const cropped = resized.crop(x, y, targetWidth, targetHeight);
  return await cropped.encode();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { prompt, referenceImage, productImage, contentId, outputFormat, organizationId } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating thumbnail for content:", contentId);

    // Validate module is active
    let aiConfig;
    try {
      aiConfig = await getModuleAIConfig(supabase, organizationId, "thumbnails");
    } catch (error: any) {
      if (error.message?.startsWith("MODULE_INACTIVE:")) {
        return new Response(
          JSON.stringify({ 
            error: "MODULE_INACTIVE",
            module: "thumbnails",
            message: "El módulo de IA 'Generación de Miniaturas' no está habilitado. Actívalo en Configuración → IA & Modelos."
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const format = typeof outputFormat === "string" && outputFormat.trim() ? outputFormat.trim() : "1080x1920";
    const { width, height, aspectRatio } = parseOutputFormat(format);

    console.log("Using AI provider:", aiConfig.provider, "model:", aiConfig.model);

    let cleanedPrompt = cleanPromptForImageGen(prompt);
    
    const isVertical = height > width;
    const isSquare = height === width;
    
    let orientationPrefix = "";
    if (isVertical) {
      orientationPrefix = `CRITICAL FORMAT REQUIREMENT: Generate a VERTICAL image with PORTRAIT orientation (${aspectRatio}, ${width}x${height} pixels).\n\n`;
    } else if (isSquare) {
      orientationPrefix = `CRITICAL FORMAT REQUIREMENT: Generate a SQUARE image with 1:1 aspect ratio (${width}x${height} pixels).\n\n`;
    } else {
      orientationPrefix = `CRITICAL FORMAT REQUIREMENT: Generate a HORIZONTAL image with LANDSCAPE orientation (${aspectRatio}, ${width}x${height} pixels).\n\n`;
    }
    
    cleanedPrompt = orientationPrefix + cleanedPrompt;

    let imageData: string | null = null;

    if (aiConfig.provider === "openai") {
      const openaiSize = `${width}x${height}`;
      
      const requestBody: any = {
        model: aiConfig.model || "gpt-image-1",
        prompt: cleanedPrompt,
        n: 1,
        size: openaiSize,
        quality: "high",
      };

      const openaiResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${aiConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("OpenAI API error:", openaiResponse.status, errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      const b64Image = openaiData.data?.[0]?.b64_json;
      
      if (b64Image) {
        imageData = `data:image/png;base64,${b64Image}`;
      } else {
        const imageUrl = openaiData.data?.[0]?.url;
        if (imageUrl) {
          const imgResp = await fetch(imageUrl);
          const imgBuffer = await imgResp.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
          imageData = `data:image/png;base64,${base64}`;
        }
      }
    } else {
      // Gemini image generation (direct API)
      const contentParts: any[] = [{ type: "text", text: cleanedPrompt }];
      if (referenceImage) {
        contentParts.push({ type: "image_url", image_url: { url: referenceImage } });
      }
      if (productImage) {
        contentParts.push({ type: "image_url", image_url: { url: productImage } });
      }

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiConfig.model === "gemini-2.5-flash-image-preview" ? aiConfig.model : GEMINI_IMAGE_MODEL,
          messages: [{ role: "user", content: contentParts.length > 1 ? contentParts : cleanedPrompt }],
          modalities: ["image", "text"],
          generation_config: {
            image_format: "png",
            aspect_ratio: aspectRatio,
            image_size: { width, height }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    }

    if (!imageData) {
      throw new Error("No image was generated");
    }

    // Check if normalization is needed
    const dims = getPngDimensionsFromDataUrl(imageData);
    let needsNormalization = !dims || dims.width !== width || dims.height !== height;

    let finalBytes: Uint8Array;
    if (needsNormalization) {
      console.log("Normalizing image to", width, "x", height);
      finalBytes = await normalizeToSizePngBytes(imageData, width, height);
    } else {
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

    const { data: urlData } = supabase.storage
      .from("content-thumbnails")
      .getPublicUrl(fileName);

    // Log usage
    try {
      await supabase.from("ai_usage_logs").insert({
        organization_id: organizationId,
        user_id: "system",
        provider: aiConfig.provider,
        model: aiConfig.model,
        module: "thumbnails",
        action: "generate_thumbnail",
        success: true
      });
    } catch (e) {
      console.error("Failed to log AI usage:", e);
    }

    console.log("Thumbnail uploaded successfully:", urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        thumbnail_url: urlData.publicUrl,
        message: "Thumbnail generated successfully",
        dimensions: { width, height },
        ai_provider: aiConfig.provider,
        ai_model: aiConfig.model
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
