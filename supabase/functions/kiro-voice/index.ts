import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/ai-providers.ts";

// ═══════════════════════════════════════════════════════════════════════════
// KIRO VOICE — Text-to-Speech via ElevenLabs
// ═══════════════════════════════════════════════════════════════════════════

/** Emotion presets that adjust ElevenLabs voice settings */
const EMOTION_PRESETS: Record<string, {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}> = {
  neutral: {
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.3,
    use_speaker_boost: true,
  },
  happy: {
    stability: 0.4,
    similarity_boost: 0.8,
    style: 0.6,
    use_speaker_boost: true,
  },
  excited: {
    stability: 0.35,
    similarity_boost: 0.75,
    style: 0.7,
    use_speaker_boost: true,
  },
  thinking: {
    stability: 0.6,
    similarity_boost: 0.85,
    style: 0.2,
    use_speaker_boost: true,
  },
};

const MAX_TEXT_LENGTH = 500;

serve(async (req) => {
  // ─── CORS preflight ───
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Validate method ───
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Parse request body ───
    const { text, emotion = "neutral" } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'text' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Get API credentials from secrets ───
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const voiceId = Deno.env.get("ELEVENLABS_KIRO_VOICE_ID");

    if (!apiKey) {
      console.error("[kiro-voice] ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Voice service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!voiceId) {
      console.error("[kiro-voice] ELEVENLABS_KIRO_VOICE_ID not configured");
      return new Response(
        JSON.stringify({ error: "Voice ID not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Sanitize and truncate text ───
    let cleanText = text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/#{1,6}\s/g, "")
      // Remove URLs
      .replace(/https?:\/\/\S+/g, "")
      // Remove emojis (basic range)
      .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
      .replace(/[\u{2600}-\u{26FF}]/gu, "")
      .replace(/[\u{2700}-\u{27BF}]/gu, "")
      .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, "")
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, "")
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, "")
      .replace(/[\u{200D}]/gu, "")
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim();

    // Skip if text is too short after cleaning
    if (cleanText.length < 3) {
      return new Response(
        JSON.stringify({ error: "Text too short for voice synthesis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Truncate to max length
    if (cleanText.length > MAX_TEXT_LENGTH) {
      // Cut at the last sentence boundary before the limit
      const truncated = cleanText.substring(0, MAX_TEXT_LENGTH);
      const lastSentence = truncated.lastIndexOf(".");
      if (lastSentence > MAX_TEXT_LENGTH * 0.5) {
        cleanText = truncated.substring(0, lastSentence + 1);
      } else {
        cleanText = truncated + "...";
      }
    }

    // ─── Get voice settings for emotion ───
    const voiceSettings = EMOTION_PRESETS[emotion] || EMOTION_PRESETS.neutral;

    // ─── Call ElevenLabs API ───
    console.log(`[kiro-voice] Generating speech: ${cleanText.length} chars, emotion: ${emotion}`);

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: voiceSettings,
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout
      },
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text().catch(() => "Unknown error");
      console.error(`[kiro-voice] ElevenLabs error ${elevenLabsResponse.status}: ${errorText}`);

      // Map specific ElevenLabs errors
      if (elevenLabsResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Voice service authentication failed" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (elevenLabsResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Voice service rate limited, try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: "Voice generation failed" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Stream audio back to client ───
    const audioData = await elevenLabsResponse.arrayBuffer();

    console.log(`[kiro-voice] Audio generated: ${audioData.byteLength} bytes`);

    return new Response(audioData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[kiro-voice] Error:", error);

    if (error instanceof DOMException && error.name === "TimeoutError") {
      return new Response(
        JSON.stringify({ error: "Voice generation timed out" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
