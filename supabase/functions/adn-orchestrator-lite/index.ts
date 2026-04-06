/**
 * ADN Orchestrator Lite - Edge Function
 * Versión simplificada que dispara el workflow n8n sin esperar respuesta
 *
 * Flujo:
 * 1. Verificar JWT + pertenencia a organización
 * 2. Leer datos completos: producto, product_dna, client_dna
 * 3. INSERT en adn_research_sessions
 * 4. Disparar n8n webhook con payload completo (fire-and-forget)
 * 5. Retornar session_id inmediatamente
 */

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders } from "../_shared/ai-providers.ts";
import {
  checkRateLimit,
  RATE_LIMIT_PRESETS,
  rateLimitResponse,
} from "../_shared/rate-limiter.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrchestratorLiteConfig {
  include_client_dna?: boolean;
  include_social_intelligence?: boolean;
  include_ad_intelligence?: boolean;
}

interface OrchestratorLiteInput {
  product_id: string;
  organization_id: string;
  config?: OrchestratorLiteConfig;
}

interface OrchestratorLiteResponse {
  success: boolean;
  session_id?: string;
  status?: string;
  error?: string;
  code?: string;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  console.log(`[ADN Orchestrator Lite] SUPABASE_URL: ${supabaseUrl ? 'SET' : 'MISSING'}`);
  console.log(`[ADN Orchestrator Lite] SERVICE_ROLE_KEY: ${serviceRoleKey ? 'SET (length: ' + serviceRoleKey.length + ')' : 'MISSING'}`);

  const supabaseAdmin = createClient(
    supabaseUrl!,
    serviceRoleKey!
  );

  try {
    // ─── PASO 1: Verificar autenticación ───────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido", code: "INVALID_TOKEN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Rate limiting por user_id ─────────────────────────────────────────────
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      user.id,
      RATE_LIMIT_PRESETS.ai,
    );
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(req, rateLimitResult, RATE_LIMIT_PRESETS.ai.limit);
    }
    // ────────────────────────────────────────────────────────────────────────

    const input: OrchestratorLiteInput = await req.json();
    const { product_id, organization_id, config } = input;

    // Config con defaults
    const researchConfig: OrchestratorLiteConfig = {
      include_client_dna: config?.include_client_dna ?? false,
      include_social_intelligence: config?.include_social_intelligence ?? true,
      include_ad_intelligence: config?.include_ad_intelligence ?? true,
    };

    if (!product_id || !organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "product_id y organization_id son requeridos", code: "MISSING_PARAMS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar pertenencia a organización
    const { data: membership } = await supabaseUser
      .from("organization_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ success: false, error: "Sin permisos en esta organización", code: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ADN Orchestrator Lite] Iniciando para producto ${product_id}, org ${organization_id}`);

    // ─── PASO 2: Leer TODOS los datos necesarios ─────────────────────────────────

    // 2.1 Producto básico (SELECT * para evitar errores de columnas)
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    console.log(`[ADN Orchestrator Lite] Query producto: ${product?.name || 'NO ENCONTRADO'}, error: ${productError?.message || 'ninguno'}`);

    if (productError || !product) {
      console.error(`[ADN Orchestrator Lite] Producto no encontrado: ${productError?.message}, code: ${productError?.code}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Producto no encontrado",
          code: "PRODUCT_NOT_FOUND",
          details: productError?.message,
          product_id_received: product_id
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2.2 ADN de Producto completo
    // NOTA: product_dna usa client_id, NO product_id (el ADN está asociado a la marca/cliente)
    const productClientId = product.client_id;
    console.log(`[ADN Orchestrator Lite] Buscando product_dna para client_id: ${productClientId}`);

    let productDna = null;
    if (productClientId) {
      const { data: productDnaData, error: dnaError } = await supabaseAdmin
        .from("product_dna")
        .select("*")
        .eq("client_id", productClientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dnaError) {
        console.error(`[ADN Orchestrator Lite] Error obteniendo product_dna: ${dnaError.message}`);
      }

      if (productDnaData) {
        productDna = productDnaData;
        console.log(`[ADN Orchestrator Lite] Product DNA encontrado: Sí, id: ${productDna.id}`);
      } else {
        console.log(`[ADN Orchestrator Lite] Product DNA encontrado: No`);
      }
    } else {
      console.log(`[ADN Orchestrator Lite] El producto no tiene client_id, no se puede buscar product_dna`);
    }

    // 2.3 ADN de Marca/Cliente (buscar por client_id del producto)
    let clientDna = null;
    let clientDnaAvailable = false;

    // productClientId ya está definido arriba (línea 142)
    console.log(`[ADN Orchestrator Lite] Buscando client_dna para client_id: ${productClientId}`);

    if (productClientId) {
      const { data: clientDnaData, error: clientDnaError } = await supabaseAdmin
        .from("client_dna")
        .select("*")
        .eq("client_id", productClientId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (clientDnaError) {
        console.error(`[ADN Orchestrator Lite] Error obteniendo client_dna: ${clientDnaError.message}`);
      }

      if (clientDnaData) {
        clientDna = clientDnaData;
        clientDnaAvailable = true;
        console.log(`[ADN Orchestrator Lite] Client DNA encontrado: ${clientDna.brand_name || 'Sin nombre'}`);
      } else {
        console.log(`[ADN Orchestrator Lite] No se encontró client_dna activo para client_id: ${productClientId}`);
      }
    } else {
      console.log(`[ADN Orchestrator Lite] El producto no tiene client_id asociado`);
    }

    // ─── PASO 3: Crear sesión de research ──────────────────────────────────────

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("adn_research_sessions")
      .insert({
        product_id,
        product_dna_id: productDna?.id || null,
        client_dna_id: researchConfig.include_client_dna && clientDna ? clientDna.id : null,
        organization_id,
        created_by: user.id,
        status: "initializing",
        current_step: 0,
        total_steps: 22,
        tokens_consumed: 0,
        inputs_config: {
          ...researchConfig,
          client_dna_available: clientDnaAvailable,
          product_dna_available: !!productDna,
        },
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error(`[ADN Orchestrator Lite] Error creando sesión: ${sessionError?.message}`);
      return new Response(
        JSON.stringify({ success: false, error: `Error creando sesión: ${sessionError?.message}`, code: "SESSION_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionId = session.id;
    console.log(`[ADN Orchestrator Lite] Sesión creada: ${sessionId}`);

    // ─── PASO 4: Disparar n8n webhook (fire-and-forget) ─────────────────────────

    const n8nUrl = Deno.env.get("N8N_ADN_WEBHOOK_URL");
    if (!n8nUrl) {
      console.error("[ADN Orchestrator Lite] N8N_ADN_WEBHOOK_URL no configurado");
      await supabaseAdmin
        .from("adn_research_sessions")
        .update({ status: "error", error_message: "N8N_ADN_WEBHOOK_URL no configurado" })
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({ success: false, error: "Webhook no configurado", code: "WEBHOOK_NOT_CONFIGURED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extraer datos del brief y wizard_responses
    const briefData = product.brief_data || {};
    const wizardResponses = productDna?.wizard_responses || {};

    // ─── Construir payload completo para n8n ─────────────────────────────────────
    const webhookPayload = {
      // ═══ METADATA DE LA SESIÓN ═══
      session_id: sessionId,
      product_id,
      organization_id,
      timestamp: new Date().toISOString(),

      // ═══ CONFIGURACIÓN ═══
      config: {
        include_client_dna_in_result: researchConfig.include_client_dna,
        include_social_intelligence: researchConfig.include_social_intelligence,
        include_ad_intelligence: researchConfig.include_ad_intelligence,
        client_dna_available: clientDnaAvailable,
        product_dna_available: !!productDna,
      },

      // ═══ PRODUCTO BÁSICO ═══
      product: {
        id: product.id,
        name: product.name || "",
        description: product.description || "",
      },

      // ═══ ADN DE PRODUCTO COMPLETO (9 pestañas) ═══
      product_dna: productDna ? {
        id: productDna.id,
        // Categorización
        service_group: productDna.service_group || null,
        service_types: productDna.service_types || [],
        // Respuestas del wizard (input del usuario)
        wizard_responses: wizardResponses,
        // Transcripción de audio del cliente
        transcription: productDna.transcription || null,
        audio_url: productDna.audio_url || null,
        audio_duration_seconds: productDna.audio_duration_seconds || null,
        // Links de referencia
        reference_links: productDna.reference_links || [],
        competitor_links: productDna.competitor_links || [],
        inspiration_links: productDna.inspiration_links || [],
        // ═══ ANÁLISIS DE IA (9 PESTAÑAS) ═══
        market_research: productDna.market_research || null,
        competitor_analysis: productDna.competitor_analysis || null,
        strategy_recommendations: productDna.strategy_recommendations || null,
        content_brief: productDna.content_brief || null,
        // Intelligence previa (si existe)
        social_intelligence: productDna.social_intelligence || null,
        ad_intelligence: productDna.ad_intelligence || null,
        // Metadata
        ai_confidence_score: productDna.ai_confidence_score || null,
        estimated_complexity: productDna.estimated_complexity || null,
        recommended_creators: productDna.recommended_creators || null,
        status: productDna.status || null,
        version: productDna.version || 1,
      } : null,

      // ═══ BRIEF DATA (acceso directo a campos comunes) ═══
      brief: {
        target_market: briefData.target_market || wizardResponses.target_market || "",
        target_country: briefData.target_country || wizardResponses.target_country || "Colombia",
        target_audience: briefData.target_audience || wizardResponses.target_audience || "",
        price_range: briefData.price_range || wizardResponses.price_range || "",
        unique_value: briefData.unique_value || wizardResponses.unique_value_proposition || "",
        competitors: briefData.competitors || wizardResponses.competitors || [],
        pain_points: briefData.pain_points || wizardResponses.pain_points || [],
        benefits: briefData.benefits || wizardResponses.benefits || [],
        tone_of_voice: briefData.tone_of_voice || wizardResponses.tone_of_voice || "",
        brand_values: briefData.brand_values || wizardResponses.brand_values || [],
      },

      // ═══ ADN DE MARCA (CLIENT DNA) COMPLETO ═══
      client_dna: clientDna ? {
        id: clientDna.id,
        brand_name: clientDna.brand_name || "",
        is_complete: clientDna.is_complete || false,
        // Todos los datos del ADN de marca
        dna_data: clientDna.dna_data || {},
      } : null,

      // ═══ FLAGS DE CONTROL ═══
      flags: {
        // Si el usuario quiere que el ADN de Marca se incluya en los resultados
        should_include_client_dna: researchConfig.include_client_dna && clientDnaAvailable,
        // Si hay ADN de marca disponible (aunque no se use)
        has_client_dna: clientDnaAvailable,
        // Si hay ADN de producto disponible
        has_product_dna: !!productDna,
        // Si hay transcripción de audio
        has_audio_transcription: !!(productDna?.transcription),
        // Si hay wizard_responses (respuestas del usuario)
        has_wizard_responses: !!(productDna?.wizard_responses && Object.keys(productDna.wizard_responses).length > 0),
        // Si hay links de referencia
        has_reference_links: !!(productDna?.reference_links && productDna.reference_links.length > 0),
        has_competitor_links: !!(productDna?.competitor_links && productDna.competitor_links.length > 0),
        has_inspiration_links: !!(productDna?.inspiration_links && productDna.inspiration_links.length > 0),
        // Si hay análisis de IA previo (las 9 pestañas)
        has_market_research: !!(productDna?.market_research),
        has_competitor_analysis: !!(productDna?.competitor_analysis),
        has_strategy_recommendations: !!(productDna?.strategy_recommendations),
        has_content_brief: !!(productDna?.content_brief),
        // Si hay intelligence previa
        has_social_intelligence: !!(productDna?.social_intelligence),
        has_ad_intelligence: !!(productDna?.ad_intelligence),
      },
    };

    // Fire-and-forget: disparar n8n sin esperar respuesta
    fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    }).catch((err) => {
      console.error(`[ADN Orchestrator Lite] Error disparando n8n:`, err);
    });

    console.log(`[ADN Orchestrator Lite] Webhook n8n disparado para sesión ${sessionId}`);
    console.log(`[ADN Orchestrator Lite] Payload size: ~${JSON.stringify(webhookPayload).length} bytes`);

    // ─── PASO 5: Retornar al frontend ────────────────────────────────────────────

    const response: OrchestratorLiteResponse = {
      success: true,
      session_id: sessionId,
      status: "started",
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ADN Orchestrator Lite] Error:", error);

    const response: OrchestratorLiteResponse = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
