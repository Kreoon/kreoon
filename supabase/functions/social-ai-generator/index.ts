import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ─────────────────────────────────────────────────────────────

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function flattenJsonb(obj: unknown): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  try {
    const str = JSON.stringify(obj, null, 0);
    // Strip JSON noise for a more readable prompt
    return str
      .replace(/[{}\[\]"]/g, "")
      .replace(/,/g, ", ")
      .replace(/:/g, ": ")
      .slice(0, 2000);
  } catch {
    return String(obj).slice(0, 2000);
  }
}

// ── Build prompt ────────────────────────────────────────────────────────

function buildPrompt(
  ctx: Record<string, any>,
  targetPlatform: string,
  postType: string,
): string {
  const c = ctx.content || {};
  const client = ctx.client || {};
  const product = ctx.product || {};
  const campaign = ctx.campaign || {};
  const dna = ctx.client_dna || {};

  const sections: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════
  // CONTEXTO 1: ADN de la Empresa/Marca
  // ═══════════════════════════════════════════════════════════════════════

  const brandParts: string[] = [];

  // Client basic info
  if (client.name) {
    brandParts.push(`Nombre: ${client.name}`);
    if (client.category) brandParts.push(`Categoria: ${client.category}`);
    if (client.bio) brandParts.push(`Bio: ${truncate(client.bio, 400)}`);
    if (client.instagram) brandParts.push(`Instagram: @${client.instagram}`);
    if (client.tiktok) brandParts.push(`TikTok: @${client.tiktok}`);
    if (client.facebook) brandParts.push(`Facebook: ${client.facebook}`);
    if (client.linkedin) brandParts.push(`LinkedIn: ${client.linkedin}`);
    if (client.website) brandParts.push(`Web: ${client.website}`);
  }

  // Rich DNA JSONB (from product_dna table)
  if (dna.wizard_responses) {
    brandParts.push(`\nIDENTIDAD DE MARCA (ADN):\n${flattenJsonb(dna.wizard_responses)}`);
  }
  if (dna.content_brief) {
    brandParts.push(`\nBRIEF DE CONTENIDO:\n${flattenJsonb(dna.content_brief)}`);
  }
  if (dna.strategy_recommendations) {
    brandParts.push(`\nRECOMENDACIONES ESTRATEGICAS:\n${flattenJsonb(dna.strategy_recommendations)}`);
  }
  if (dna.market_research) {
    brandParts.push(`\nINVESTIGACION DE MERCADO:\n${flattenJsonb(dna.market_research)}`);
  }
  if (dna.competitor_analysis) {
    brandParts.push(`\nANALISIS COMPETENCIA:\n${flattenJsonb(dna.competitor_analysis)}`);
  }

  if (brandParts.length > 0) {
    sections.push(`=== CONTEXTO 1: ADN DE LA EMPRESA/MARCA ===\n${brandParts.join("\n")}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONTEXTO 2: ADN del Producto
  // ═══════════════════════════════════════════════════════════════════════

  const productParts: string[] = [];

  if (product.name) {
    productParts.push(`Producto: ${product.name}`);
    if (product.description) productParts.push(`Descripcion: ${truncate(product.description, 400)}`);
    if (product.strategy) productParts.push(`Estrategia: ${truncate(product.strategy, 300)}`);
    if (product.ideal_avatar) productParts.push(`Avatar ideal: ${truncate(product.ideal_avatar, 300)}`);
    if (product.sales_angles) productParts.push(`Angulos de venta: ${truncate(product.sales_angles, 300)}`);
    if (product.market_research) productParts.push(`Investigacion: ${truncate(product.market_research, 300)}`);

    // Rich product JSONB
    if (product.brief_data) {
      productParts.push(`\nBRIEF DEL PRODUCTO:\n${flattenJsonb(product.brief_data)}`);
    }
    if (product.content_strategy) {
      productParts.push(`\nESTRATEGIA DE CONTENIDO:\n${flattenJsonb(product.content_strategy)}`);
    }
    if (product.avatar_profiles) {
      productParts.push(`\nPERFILES DE AVATAR:\n${flattenJsonb(product.avatar_profiles)}`);
    }
    if (product.sales_angles_data) {
      productParts.push(`\nANGULOS DE VENTA (detalle):\n${flattenJsonb(product.sales_angles_data)}`);
    }
    if (product.competitor_analysis) {
      productParts.push(`\nANALISIS COMPETENCIA PRODUCTO:\n${flattenJsonb(product.competitor_analysis)}`);
    }
    if (product.launch_strategy) {
      productParts.push(`\nESTRATEGIA DE LANZAMIENTO:\n${flattenJsonb(product.launch_strategy)}`);
    }
    if (product.content_calendar) {
      productParts.push(`\nCALENDARIO DE CONTENIDO:\n${flattenJsonb(product.content_calendar)}`);
    }
  }

  if (productParts.length > 0) {
    sections.push(`=== CONTEXTO 2: ADN DEL PRODUCTO ===\n${productParts.join("\n")}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONTEXTO 3: Info del Proyecto (Roles + Contenido)
  // ═══════════════════════════════════════════════════════════════════════

  const contentParts: string[] = [];

  // Core content
  if (c.title) contentParts.push(`Titulo: ${c.title}`);
  if (c.description) contentParts.push(`Descripcion: ${truncate(c.description, 400)}`);
  if (c.content_type) contentParts.push(`Tipo: ${c.content_type}`);
  if (c.sphere_phase) contentParts.push(`Fase Esfera: ${c.sphere_phase}`);
  if (c.funnel_stage) contentParts.push(`Etapa embudo: ${c.funnel_stage}`);
  if (c.content_objective) contentParts.push(`Objetivo: ${c.content_objective}`);
  if (c.target_country) contentParts.push(`Pais destino: ${c.target_country}`);
  if (c.video_duration) contentParts.push(`Duracion video: ${c.video_duration}`);

  // Creative elements
  if (c.script) contentParts.push(`\nGUIoN/SCRIPT:\n${truncate(c.script, 1200)}`);
  if (c.hook) contentParts.push(`Hook: ${c.hook}`);
  if (c.cta) contentParts.push(`CTA: ${c.cta}`);
  if (c.caption) contentParts.push(`Caption existente: ${truncate(c.caption, 400)}`);
  if (c.sales_angle) contentParts.push(`Angulo de venta: ${c.sales_angle}`);
  if (c.selected_pain) contentParts.push(`Dolor: ${c.selected_pain}`);
  if (c.selected_desire) contentParts.push(`Deseo: ${c.selected_desire}`);
  if (c.selected_objection) contentParts.push(`Objecion: ${c.selected_objection}`);
  if (c.ideal_avatar) contentParts.push(`Avatar ideal: ${truncate(c.ideal_avatar, 300)}`);
  if (c.suggested_hooks) contentParts.push(`Hooks sugeridos: ${truncate(c.suggested_hooks, 300)}`);
  if (c.narrative_structure) contentParts.push(`Estructura narrativa: ${truncate(c.narrative_structure, 300)}`);

  // Role-specific guidelines
  const roleParts: string[] = [];
  if (c.strategist_guidelines) roleParts.push(`ESTRATEGA: ${truncate(c.strategist_guidelines, 400)}`);
  if (c.trafficker_guidelines) roleParts.push(`TRAFFICKER: ${truncate(c.trafficker_guidelines, 400)}`);
  if (c.editor_guidelines) roleParts.push(`EDITOR: ${truncate(c.editor_guidelines, 400)}`);
  if (c.designer_guidelines) roleParts.push(`DISENADOR: ${truncate(c.designer_guidelines, 400)}`);
  if (c.admin_guidelines) roleParts.push(`ADMIN: ${truncate(c.admin_guidelines, 400)}`);

  if (roleParts.length > 0) {
    contentParts.push(`\nDIRECTRICES POR ROL:\n${roleParts.join("\n")}`);
  }

  // AI analysis
  if (c.ai_analysis_data) {
    contentParts.push(`\nANALISIS IA:\n${flattenJsonb(c.ai_analysis_data)}`);
  }

  if (contentParts.length > 0) {
    sections.push(`=== CONTEXTO 3: PROYECTO Y ROLES ===\n${contentParts.join("\n")}`);
  }

  // Campaign
  if (campaign.name) {
    const campParts: string[] = [`Campana: ${campaign.name}`];
    if (campaign.objective) campParts.push(`Objetivo: ${campaign.objective}`);
    if (campaign.performance_goal) campParts.push(`Meta: ${truncate(campaign.performance_goal, 200)}`);
    if (campaign.targeting) campParts.push(`Targeting: ${truncate(campaign.targeting, 200)}`);
    if (campaign.creative) campParts.push(`Creativo: ${truncate(campaign.creative, 200)}`);
    if (campaign.ai_suggestions) campParts.push(`Sugerencias IA: ${flattenJsonb(campaign.ai_suggestions)}`);
    sections.push(`=== CAMPANA DE MARKETING ===\n${campParts.join("\n")}`);
  }

  const context = sections.join("\n\n");

  const platformGuidelines: Record<string, string> = {
    instagram:
      "Instagram: Usa emojis moderadamente, primera linea es el hook (sin hashtags al inicio), hashtags al final. Maximo 2200 caracteres pero lo ideal es 150-300 para feed, hasta 500 para Reels.",
    tiktok:
      "TikTok: Tono casual y energetico, usa emojis, hashtags intercalados, maximo 2200 caracteres. La primera linea debe enganchar inmediatamente.",
    facebook:
      "Facebook: Tono conversacional, puede ser mas largo (hasta 500 palabras), usa saltos de linea para legibilidad, pocos hashtags (3-5).",
    youtube:
      "YouTube: Titulo descriptivo, hashtags en descripcion, puede ser extenso, incluye timestamps si aplica.",
    twitter:
      "Twitter/X: Maximo 280 caracteres, directo, sin hashtags excesivos (1-3), lenguaje conciso.",
    linkedin:
      "LinkedIn: Tono profesional pero humano, usa saltos de linea, storytelling corporativo, 3-5 hashtags relevantes.",
    pinterest:
      "Pinterest: Descriptivo, keywords naturales, 2-5 hashtags, enfocado en inspiracion y utilidad.",
    threads:
      "Threads: Conversacional, similar a Twitter pero puede ser mas largo, sin hashtags.",
  };

  const platformGuide =
    platformGuidelines[targetPlatform] || platformGuidelines.instagram;

  return `Eres un experto en marketing digital y copywriting para redes sociales en Latinoamerica. Genera contenido para publicar en redes sociales basandote en el siguiente contexto.

${context}

---

PLATAFORMA DESTINO: ${targetPlatform}
TIPO DE POST: ${postType}
${platformGuide}

---

INSTRUCCIONES:
Genera exactamente 4 opciones de caption, cada una con un estilo diferente:

1. **storytelling**: Narrativa emocional que conecte con la audiencia. Cuenta una mini-historia que enganche.
2. **question_value**: Empieza con una pregunta poderosa al avatar, luego entrega valor. Termina con CTA.
3. **direct**: Directo al punto. Beneficio principal + CTA claro. Corto y contundente.
4. **social_proof**: Usa prueba social, resultados, testimonios o datos. Genera confianza y urgencia.

Para CADA opcion genera:
- El caption completo (sin hashtags, esos van aparte)
- 8-15 hashtags relevantes (sin #, solo la palabra)
- Un primer comentario estrategico que incentive engagement

IMPORTANTE:
- Adapta el tono y longitud a la plataforma destino
- Si hay un hook definido, usalo o adaptalo creativamente
- Si hay un CTA definido, integralo naturalmente
- Los hashtags deben mezclar: 3-4 de alto volumen + 3-4 de nicho + 2-3 de marca
- El primer comentario debe ser una pregunta o llamado a la accion que genere respuestas
- Escribe en espanol latinoamericano natural, no espanol de Espana
- NO incluyas placeholders como [nombre], genera contenido final listo para publicar

Responde UNICAMENTE con un JSON valido con esta estructura exacta (sin markdown, sin backticks):
{
  "captions": [
    {
      "style": "storytelling",
      "caption": "...",
      "hashtags": ["hashtag1", "hashtag2", "..."],
      "first_comment": "..."
    },
    {
      "style": "question_value",
      "caption": "...",
      "hashtags": ["hashtag1", "hashtag2", "..."],
      "first_comment": "..."
    },
    {
      "style": "direct",
      "caption": "...",
      "hashtags": ["hashtag1", "hashtag2", "..."],
      "first_comment": "..."
    },
    {
      "style": "social_proof",
      "caption": "...",
      "hashtags": ["hashtag1", "hashtag2", "..."],
      "first_comment": "..."
    }
  ]
}`;
}

// ── Call Gemini ──────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<{
  content: string;
  model: string;
  success: boolean;
  error?: string;
}> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) {
    return { content: "", model: "gemini", success: false, error: "GOOGLE_AI_API_KEY not configured" };
  }

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
        }),
      },
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[social-ai-generator] Gemini error:", errorText);
      return { content: "", model: "gemini", success: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content, model: "gemini/gemini-2.5-flash", success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[social-ai-generator] Gemini exception:", err);
    return { content: "", model: "gemini", success: false, error: msg };
  }
}

// ── Call OpenAI (fallback) ──────────────────────────────────────────────

async function callOpenAI(prompt: string): Promise<{
  content: string;
  model: string;
  success: boolean;
  error?: string;
}> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return { content: "", model: "openai", success: false, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[social-ai-generator] OpenAI error:", errorText);
      return { content: "", model: "openai", success: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content, model: "openai/gpt-4o-mini", success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[social-ai-generator] OpenAI exception:", err);
    return { content: "", model: "openai", success: false, error: msg };
  }
}

// ── Parse AI JSON response ──────────────────────────────────────────────

function parseAIResponse(raw: string): Record<string, any> | null {
  // Try direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // noop
  }

  // Strip markdown code fences
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // noop
  }

  // Try to extract JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // noop
    }
  }

  return null;
}

// ── Main handler ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { content_id, target_platform = "instagram", post_type = "reel", organization_id, account_client_id } =
      await req.json();

    if (!content_id) {
      return new Response(
        JSON.stringify({ error: "content_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token invalido o expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[social-ai-generator] User:", user.id, "Content:", content_id);

    // ── Consume AI tokens (60 tokens for social_ai.generate_captions) ──
    const TOKEN_COST = 60;
    const { data: tokenResult, error: tokenError } = await supabaseAdmin.rpc(
      "consume_ai_tokens",
      {
        p_user_id: user.id,
        p_org_id: organization_id || null,
        p_action_type: "social_ai.generate_captions",
        p_tokens: TOKEN_COST,
        p_metadata: { content_id, target_platform, post_type },
      },
    );

    if (tokenError) {
      console.error("[social-ai-generator] Token consumption error:", tokenError);
      return new Response(
        JSON.stringify({ error: `Error al consumir tokens: ${tokenError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!tokenResult?.success) {
      console.log("[social-ai-generator] Insufficient tokens:", tokenResult);
      return new Response(
        JSON.stringify({
          error: "No tienes suficientes Tokens IA para generar captions",
          tokens_required: tokenResult?.required || TOKEN_COST,
          tokens_available: tokenResult?.available || 0,
          code: "INSUFFICIENT_TOKENS",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[social-ai-generator] Tokens consumed:", tokenResult.tokens_consumed, "Remaining:", tokenResult.balance_remaining);

    // Fetch content context via RPC (with optional client_id from social account)
    const { data: context, error: rpcError } = await supabaseAdmin.rpc(
      "get_content_context_for_ai",
      {
        p_content_id: content_id,
        p_account_client_id: account_client_id || null,
      },
    );

    if (rpcError) {
      console.error("[social-ai-generator] RPC error:", rpcError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch content context: ${rpcError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!context || !context.content) {
      return new Response(
        JSON.stringify({ error: "Content not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[social-ai-generator] Context loaded for content:", content_id);

    // Build prompt
    const prompt = buildPrompt(context, target_platform, post_type);

    // Try Gemini first, fallback to OpenAI
    let aiResult = await callGemini(prompt);
    if (!aiResult.success) {
      console.log("[social-ai-generator] Gemini failed, trying OpenAI...");
      aiResult = await callOpenAI(prompt);
    }

    if (!aiResult.success) {
      return new Response(
        JSON.stringify({
          error: "All AI providers failed",
          details: aiResult.error,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse the JSON response
    const parsed = parseAIResponse(aiResult.content);
    if (!parsed || !Array.isArray(parsed.captions)) {
      console.error("[social-ai-generator] Failed to parse AI response:", aiResult.content.slice(0, 500));
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          raw: aiResult.content.slice(0, 2000),
          model_used: aiResult.model,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate and normalize captions
    const VALID_STYLES = ["storytelling", "question_value", "direct", "social_proof"];
    const captions = parsed.captions
      .filter((c: any) => c && typeof c.caption === "string" && VALID_STYLES.includes(c.style))
      .map((c: any) => ({
        style: c.style,
        caption: c.caption,
        hashtags: Array.isArray(c.hashtags)
          ? c.hashtags.map((h: string) => String(h).replace(/^#/, ""))
          : [],
        first_comment: typeof c.first_comment === "string" ? c.first_comment : "",
      }));

    return new Response(
      JSON.stringify({
        captions,
        model_used: aiResult.model,
        content_id,
        target_platform,
        post_type,
        tokens_consumed: tokenResult.tokens_consumed,
        tokens_remaining: tokenResult.balance_remaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[social-ai-generator] Error:", err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
