/**
 * ADN Continue - Edge Function
 * Continúa el proceso de ADN Research desde donde se quedó
 * También envía email de notificación al completar
 */

import { createClient } from "npm:@supabase/supabase-js@2.46.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Importar las funciones de AI del research principal
async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  useWebSearch = true
): Promise<{ text: string; tokens: number }> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY no configurada");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: useWebSearch ? "sonar-pro" : "sonar",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    tokens: data.usage?.total_tokens || 0,
  };
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; tokens: number }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 3500 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    tokens: data.usageMetadata?.totalTokenCount || 0,
  };
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  useWebSearch = true
): Promise<{ text: string; tokens: number; provider: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callPerplexity(systemPrompt, userPrompt, useWebSearch);
      return { ...result, provider: "perplexity" };
    } catch (err) {
      console.warn(`Perplexity intento ${attempt + 1}/2 falló: ${(err as Error).message}`);
      if (attempt === 0) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  const result = await callGemini(systemPrompt, userPrompt);
  return { ...result, provider: "gemini" };
}

function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return JSON.parse(clean);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* noop */ }
    }
    return fallback;
  }
}

// Configuración de los pasos faltantes (simplificada)
const PENDING_STEPS = [
  {
    stepId: "step_16_google_ads",
    tabKey: "google_ads",
    name: "Google Ads",
    useWebSearch: true,
    buildPrompt: (ctx: any, prev: any) => ({
      systemPrompt: `Eres un experto en Google Ads y SEM para LATAM. Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown. Usa español LATAM.`,
      userPrompt: `Diseña la estrategia de Google Ads para: ${ctx.productName}. DESCRIPCIÓN: ${ctx.productDescription}. Devuelve JSON con: strategy_overview, keyword_strategy (primary_keywords, negative_keywords), search_ads (headlines, descriptions), display_strategy, youtube_strategy, bidding_strategy, campaign_structure, summary.`
    })
  },
  {
    stepId: "step_17_email_marketing",
    tabKey: "email_marketing",
    name: "Email Marketing",
    useWebSearch: false,
    buildPrompt: (ctx: any, prev: any) => ({
      systemPrompt: `Eres un experto en email marketing y automatización. Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown. Usa español LATAM.`,
      userPrompt: `Diseña la estrategia de email marketing para: ${ctx.productName}. DESCRIPCIÓN: ${ctx.productDescription}. Devuelve JSON con: welcome_sequence (3-5 emails), nurturing_sequence, sales_sequence, abandoned_cart_sequence, post_purchase_sequence, subject_line_formulas, segmentation_strategy, automation_flows, kpis, summary.`
    })
  },
  {
    stepId: "step_18_landing_pages",
    tabKey: "landing_pages",
    name: "Landing Pages",
    useWebSearch: false,
    buildPrompt: (ctx: any, prev: any) => ({
      systemPrompt: `Eres un experto en diseño de landing pages de alta conversión. Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown. Usa español LATAM.`,
      userPrompt: `Diseña 2 landing pages para: ${ctx.productName}. DESCRIPCIÓN: ${ctx.productDescription}. Devuelve JSON con: landing_page_1 (tipo sales, sections, hero, benefits, testimonials, cta, faq), landing_page_2 (tipo lead_capture), conversion_elements, mobile_optimization, a_b_test_ideas, summary.`
    })
  },
  {
    stepId: "step_19_launch_strategy",
    tabKey: "launch_strategy",
    name: "Estrategia de Lanzamiento",
    useWebSearch: false,
    buildPrompt: (ctx: any, prev: any) => ({
      systemPrompt: `Eres un experto en lanzamientos de productos digitales estilo Jeff Walker. Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown. Usa español LATAM.`,
      userPrompt: `Diseña la estrategia de lanzamiento para: ${ctx.productName}. DESCRIPCIÓN: ${ctx.productDescription}. Devuelve JSON con: launch_type, pre_launch_phase (weeks, activities), launch_week, post_launch, content_calendar, email_sequences, social_strategy, paid_ads_strategy, kpis, summary.`
    })
  },
  {
    stepId: "step_20_metrics",
    tabKey: "kpis",
    name: "KPIs y Métricas",
    useWebSearch: false,
    buildPrompt: (ctx: any, prev: any) => ({
      systemPrompt: `Eres un experto en analytics y métricas de marketing. Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown. Usa español LATAM.`,
      userPrompt: `Define los KPIs para: ${ctx.productName}. DESCRIPCIÓN: ${ctx.productDescription}. Devuelve JSON con: north_star_metric, acquisition_kpis, engagement_kpis, revenue_kpis, retention_kpis, dashboards, tracking_setup, reporting_cadence, benchmarks, summary.`
    })
  },
  {
    stepId: "step_21_organic_content",
    tabKey: "organic_content",
    name: "Contenido Orgánico",
    useWebSearch: false,
    buildPrompt: (ctx: any, prev: any) => ({
      systemPrompt: `Eres un experto en content marketing y SEO. Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown. Usa español LATAM.`,
      userPrompt: `Diseña la estrategia de contenido orgánico para: ${ctx.productName}. DESCRIPCIÓN: ${ctx.productDescription}. Devuelve JSON con: content_pillars, blog_topics (10), video_ideas (10), podcast_ideas, seo_keywords, content_calendar_monthly, repurposing_strategy, distribution_channels, summary.`
    })
  },
  {
    stepId: "step_22_executive_summary",
    tabKey: "executive_summary",
    name: "Resumen Ejecutivo",
    useWebSearch: false,
    buildPrompt: (ctx: any, prev: any) => ({
      systemPrompt: `Eres un estratega de marketing senior que sintetiza información compleja. Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown. Usa español LATAM.`,
      userPrompt: `Genera el resumen ejecutivo del ADN Recargado para: ${ctx.productName}. DESCRIPCIÓN: ${ctx.productDescription}. Contexto de tabs previas disponible. Devuelve JSON con: executive_summary (3 párrafos), key_insights (5), quick_wins (5 acciones inmediatas), 30_day_priorities, 90_day_roadmap, budget_allocation_recommendation, risk_factors, success_metrics, next_steps, kiro_insights (3 insights únicos de IA).`
    })
  },
];

async function sendCompletionEmail(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  productName: string,
  sessionId: string
) {
  try {
    // Obtener email del usuario
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, first_name")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      console.warn("No se encontró email del usuario");
      return;
    }

    const userName = profile.first_name || profile.full_name || "Usuario";

    // Llamar a la función de envío de email
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        to: profile.email,
        subject: `🧬 Tu ADN Recargado de "${productName}" está listo`,
        template: "adn_complete",
        data: {
          userName,
          productName,
          sessionId,
          dashboardUrl: `https://app.kreoon.com/products?session=${sessionId}`,
        },
      }),
    });

    if (response.ok) {
      console.log(`✉️ Email enviado a ${profile.email}`);
    } else {
      console.warn("Error enviando email:", await response.text());
    }
  } catch (err) {
    console.error("Error en sendCompletionEmail:", err);
  }
}

async function continueResearch(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  productId: string,
  sendEmail: boolean,
  userId?: string
) {
  console.log(`🔄 Continuando ADN Research desde sesión ${sessionId}`);

  try {
    // 1. Obtener el producto y los resultados actuales
    const { data: product } = await supabase
      .from("products")
      .select("id, name, description, full_research_v3")
      .eq("id", productId)
      .single();

    if (!product) throw new Error("Producto no encontrado");

    const existingResearch = (product.full_research_v3 as Record<string, any>) || { tabs: {} };
    const existingTabs = existingResearch.tabs || {};
    const completedTabKeys = Object.keys(existingTabs);

    console.log(`📊 Tabs completadas: ${completedTabKeys.length}`);

    // 2. Filtrar pasos pendientes
    const pendingSteps = PENDING_STEPS.filter(
      (step) => !completedTabKeys.includes(step.tabKey)
    );

    if (pendingSteps.length === 0) {
      console.log("✅ Todas las tabs ya están completadas");
      return { success: true, message: "Ya completado", tabs_added: 0 };
    }

    console.log(`📝 Tabs pendientes: ${pendingSteps.map((s) => s.tabKey).join(", ")}`);

    // 3. Actualizar estado de sesión
    await supabase
      .from("adn_research_sessions")
      .update({
        status: "researching",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // 4. Contexto simplificado
    const ctx = {
      productName: product.name,
      productDescription: product.description || "",
    };

    let totalTokensAdded = 0;
    let tabsCompleted = 0;

    // 5. Ejecutar cada paso pendiente
    for (const step of pendingSteps) {
      console.log(`\n▶ Ejecutando: ${step.name}`);

      try {
        const { systemPrompt, userPrompt } = step.buildPrompt(ctx, existingTabs);

        // Timeout de 50 segundos por paso
        const aiPromise = callAI(systemPrompt, userPrompt, step.useWebSearch);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout 50s")), 50000)
        );

        const { text, tokens, provider } = await Promise.race([aiPromise, timeoutPromise]);
        const parsed = safeParseJSON(text, { _raw: text.slice(0, 500) });

        // Guardar en producto
        existingTabs[step.tabKey] = {
          ...parsed,
          _generated_at: new Date().toISOString(),
          _tokens_used: tokens,
          _provider: provider,
        };

        await supabase
          .from("products")
          .update({
            full_research_v3: {
              ...existingResearch,
              tabs: existingTabs,
              metadata: {
                ...existingResearch.metadata,
                total_tokens: (existingResearch.metadata?.total_tokens || 0) + tokens,
                completed_tabs: Object.keys(existingTabs).length,
                last_updated: new Date().toISOString(),
              },
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId);

        // Actualizar progreso en sesión
        const { data: session } = await supabase
          .from("adn_research_sessions")
          .select("progress, tokens_consumed")
          .eq("id", sessionId)
          .single();

        const progress = (session?.progress as any) || { steps: [] };
        const stepIndex = progress.steps.findIndex((s: any) => s.id === step.stepId);

        const stepUpdate = {
          id: step.stepId,
          name: step.name,
          tab_key: step.tabKey,
          status: "completed",
          tokens_used: tokens,
          completed_at: new Date().toISOString(),
        };

        if (stepIndex >= 0) {
          progress.steps[stepIndex] = stepUpdate;
        } else {
          progress.steps.push(stepUpdate);
        }

        await supabase
          .from("adn_research_sessions")
          .update({
            progress,
            tokens_consumed: (session?.tokens_consumed || 0) + tokens,
            current_step: Object.keys(existingTabs).length + 2,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        totalTokensAdded += tokens;
        tabsCompleted++;
        console.log(`✅ ${step.name} completado (${tokens} tokens, ${provider})`);

        // Pausa entre pasos
        await new Promise((r) => setTimeout(r, 1500));

      } catch (err) {
        console.error(`❌ Error en ${step.name}:`, (err as Error).message);
        // Continuar con el siguiente paso
      }
    }

    // 6. Marcar como completado
    const finalStatus = tabsCompleted === pendingSteps.length ? "completed" : "completed_with_errors";

    await supabase
      .from("adn_research_sessions")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    console.log(`\n🎉 Continuación completada: ${tabsCompleted}/${pendingSteps.length} tabs`);

    // 7. Enviar email si se solicitó
    if (sendEmail && userId) {
      await sendCompletionEmail(supabase, userId, product.name, sessionId);
    }

    return {
      success: true,
      tabs_added: tabsCompleted,
      tokens_used: totalTokensAdded,
      status: finalStatus,
    };

  } catch (err) {
    console.error("❌ Error en continueResearch:", err);

    await supabase
      .from("adn_research_sessions")
      .update({
        status: "error",
        error_message: (err as Error).message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return { success: false, error: (err as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { session_id, product_id, send_email, user_id, run_in_background } = await req.json();

    if (!session_id || !product_id) {
      return new Response(
        JSON.stringify({ error: "session_id y product_id son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Si run_in_background, usar waitUntil y responder inmediatamente
    if (run_in_background) {
      // @ts-ignore
      EdgeRuntime.waitUntil(continueResearch(supabase, session_id, product_id, send_email, user_id));

      return new Response(
        JSON.stringify({
          success: true,
          message: "Proceso continuando en segundo plano. Recibirás un email al completar.",
          session_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ejecución síncrona
    const result = await continueResearch(supabase, session_id, product_id, send_email, user_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
