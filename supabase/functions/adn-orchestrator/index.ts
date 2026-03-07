/**
 * ADN Orchestrator - Edge Function
 * Punto de entrada principal para el ADN Recargado v3
 *
 * Este es el endpoint que llama el frontend para iniciar todo el proceso.
 * Orquesta: Intelligence Gathering → Research de 22 pasos
 *
 * Flujo:
 * 1. Verificar JWT + pertenencia a organización
 * 2. Verificar tokens disponibles (mínimo 2400)
 * 3. Verificar que no haya research activo para este producto
 * 4. Crear sesión en adn_research_sessions
 * 5. Reservar tokens atómicamente
 * 6. AWAIT intelligence-gatherer (~2-3 min)
 * 7. FIRE-AND-FORGET adn-research-v3 (22 pasos, ~8 min)
 * 8. Retornar session_id para polling
 */

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders } from "../_shared/ai-providers.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTIMATED_TOKEN_COST = 2400; // Costo estimado de los 22 pasos
const REGEN_TOKEN_COST = 120; // Costo de regenerar una tab

// ─── Types ───────────────────────────────────────────────────────────────────

type OrchestratorAction = "start" | "regenerate_tab" | "get_status";

interface OrchestratorInput {
  action?: OrchestratorAction;
  // For start action
  product_id?: string;
  product_dna_id?: string;
  client_dna_id?: string;
  organization_id: string;
  user_id?: string;
  config?: {
    include_client_dna: boolean;
    include_social_intelligence: boolean;
    include_ad_intelligence: boolean;
    locations?: string[];
  };
  // For regenerate_tab action
  session_id?: string;
  tab_key?: string;
}

interface OrchestratorResponse {
  success: boolean;
  session_id?: string;
  status?: string;
  error?: string;
  code?: string;
  required_tokens?: number;
  current_balance?: number;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

async function checkTokenBalance(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<{ balance: number; sufficient: boolean }> {
  const { data, error } = await supabase
    .from("ai_token_balances")
    .select("balance")
    .eq("organization_id", organizationId)
    .single();

  const balance = data?.balance || 0;
  return { balance, sufficient: balance >= ESTIMATED_TOKEN_COST };
}

async function checkActiveResearch(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  organizationId: string
): Promise<{ hasActive: boolean; activeSessionId?: string }> {
  const { data } = await supabase
    .from("adn_research_sessions")
    .select("id, status")
    .eq("product_id", productId)
    .eq("organization_id", organizationId)
    .in("status", ["initializing", "gathering_intelligence", "researching"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    hasActive: !!data,
    activeSessionId: data?.id,
  };
}

async function reserveTokens(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  sessionId: string,
  userId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("consume_ai_tokens", {
      p_user_id: userId || null,
      p_org_id: organizationId,
      p_action_type: "adn_research_v3",
      p_tokens: ESTIMATED_TOKEN_COST,
      p_metadata: {
        reference_id: sessionId,
        description: "ADN Recargado v3 - Research de 22 pasos",
      },
    });
    return !error;
  } catch {
    return false;
  }
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

async function handleRegenerateTab(
  supabase: ReturnType<typeof createClient>,
  input: OrchestratorInput,
  organizationId: string
): Promise<Response> {
  const { session_id, tab_key } = input;

  if (!session_id || !tab_key) {
    return new Response(
      JSON.stringify({ success: false, error: "session_id y tab_key son requeridos", code: "MISSING_PARAMS" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[ADN Orchestrator] Regenerando tab ${tab_key} para sesión ${session_id}`);

  // Verificar sesión existe y pertenece a la org
  const { data: session, error: sessionError } = await supabase
    .from("adn_research_sessions")
    .select("*")
    .eq("id", session_id)
    .eq("organization_id", organizationId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ success: false, error: "Sesión no encontrada", code: "SESSION_NOT_FOUND" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verificar tokens para regeneración
  const { balance, sufficient } = await checkTokenBalance(supabase, organizationId);
  if (balance < REGEN_TOKEN_COST) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Tokens insuficientes. Necesitas ${REGEN_TOKEN_COST} tokens, tienes ${balance}.`,
        code: "INSUFFICIENT_TOKENS",
        required_tokens: REGEN_TOKEN_COST,
        current_balance: balance,
      }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Consumir tokens
  await supabase.rpc("consume_ai_tokens", {
    p_user_id: null,
    p_org_id: organizationId,
    p_action_type: "adn_regen_tab",
    p_tokens: REGEN_TOKEN_COST,
    p_metadata: {
      reference_id: session_id,
      description: `Regenerar pestaña: ${tab_key}`,
    },
  });

  // Fire-and-forget: llamar a adn-research-v3 con flag de regeneración
  const inputsConfig = session.inputs_config as Record<string, unknown>;

  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/adn-research-v3`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      session_id,
      product_id: session.product_id,
      product_dna_id: session.product_dna_id,
      client_dna_id: session.client_dna_id,
      organization_id: organizationId,
      include_client_dna: inputsConfig?.include_client_dna ?? false,
      include_social_intelligence: true,
      include_ad_intelligence: true,
      regen_single_tab: tab_key,
    }),
  }).catch(console.error);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Regenerando ${tab_key}...`,
      tokens_used: REGEN_TOKEN_COST,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGetStatus(
  supabase: ReturnType<typeof createClient>,
  input: OrchestratorInput,
  organizationId: string
): Promise<Response> {
  const { session_id } = input;

  if (!session_id) {
    return new Response(
      JSON.stringify({ success: false, error: "session_id es requerido", code: "MISSING_PARAMS" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: session, error } = await supabase
    .from("adn_research_sessions")
    .select(`
      id,
      status,
      current_step,
      total_steps,
      tokens_consumed,
      progress,
      error_message,
      started_at,
      completed_at,
      updated_at
    `)
    .eq("id", session_id)
    .eq("organization_id", organizationId)
    .single();

  if (error || !session) {
    return new Response(
      JSON.stringify({ success: false, error: "Sesión no encontrada", code: "SESSION_NOT_FOUND" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Calcular % de progreso
  const progressPct = session.total_steps > 0
    ? Math.round((session.current_step / session.total_steps) * 100)
    : 0;

  // Calcular tiempo transcurrido
  const startedAt = new Date(session.started_at);
  const elapsedMs = Date.now() - startedAt.getTime();
  const elapsedMinutes = Math.round(elapsedMs / 60000);

  // Nombre del paso actual
  const progressData = session.progress as Record<string, unknown> | null;
  const steps = progressData?.steps as Record<string, unknown>[] | undefined;
  const completedSteps = steps?.filter(s => s?.status === "completed").length || 0;
  const avgMsPerStep = completedSteps > 0 ? elapsedMs / completedSteps : 25000;
  const remainingSteps = session.total_steps - session.current_step;
  const estimatedRemainingMs = remainingSteps * avgMsPerStep;
  const estimatedRemainingMinutes = Math.ceil(estimatedRemainingMs / 60000);

  return new Response(
    JSON.stringify({
      success: true,
      id: session.id,
      status: session.status,
      current_step: session.current_step,
      total_steps: session.total_steps,
      progress_pct: progressPct,
      tokens_consumed: session.tokens_consumed,
      steps_detail: steps || [],
      elapsed_minutes: elapsedMinutes,
      estimated_remaining_minutes: estimatedRemainingMinutes,
      error_message: session.error_message,
      completed_at: session.completed_at,
      is_complete: session.status === "completed" || session.status === "completed_with_errors",
      is_error: session.status === "error",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

    // Crear cliente con el token del usuario para verificar permisos
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

    const input: OrchestratorInput = await req.json();
    const { action = "start", organization_id } = input;
    const user_id = user.id;

    // Verificar pertenencia a organización
    const { data: membership } = await supabaseUser
      .from("organization_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user_id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ success: false, error: "Sin permisos en esta organización", code: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action Router ────────────────────────────────────────────────────────

    // Handle regenerate_tab action
    if (action === "regenerate_tab") {
      return handleRegenerateTab(supabaseAdmin, input, organization_id);
    }

    // Handle get_status action
    if (action === "get_status") {
      return handleGetStatus(supabaseAdmin, input, organization_id);
    }

    // Default: start action
    const { product_id, product_dna_id, client_dna_id, config } = input;

    if (!product_id || !product_dna_id || !config) {
      return new Response(
        JSON.stringify({ success: false, error: "product_id, product_dna_id y config son requeridos", code: "MISSING_PARAMS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ADN Orchestrator] Iniciando para producto ${product_id}`);

    // ─── PASO 2: Verificar tokens disponibles ──────────────────────────────────

    const { balance, sufficient } = await checkTokenBalance(supabaseAdmin, organization_id);
    if (!sufficient) {
      console.warn(`[ADN Orchestrator] Tokens insuficientes: ${balance}/${ESTIMATED_TOKEN_COST}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Tokens insuficientes. Necesitas ${ESTIMATED_TOKEN_COST} tokens, tienes ${balance}.`,
          code: "INSUFFICIENT_TOKENS",
          required_tokens: ESTIMATED_TOKEN_COST,
          current_balance: balance,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── PASO 3: Verificar que no haya research activo ─────────────────────────

    const { hasActive, activeSessionId } = await checkActiveResearch(supabaseAdmin, product_id, organization_id);
    if (hasActive) {
      console.warn(`[ADN Orchestrator] Research activo encontrado: ${activeSessionId}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ya hay un research en progreso para este producto",
          code: "RESEARCH_IN_PROGRESS",
          session_id: activeSessionId,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── PASO 4: Crear sesión de research ──────────────────────────────────────

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("adn_research_sessions")
      .insert({
        product_id,
        product_dna_id,
        client_dna_id: config.include_client_dna ? client_dna_id : null,
        organization_id,
        created_by: user_id,
        inputs_config: {
          include_client_dna: config.include_client_dna,
          include_social_intelligence: config.include_social_intelligence,
          include_ad_intelligence: config.include_ad_intelligence,
          locations: config.locations || [],
        },
        status: "initializing",
        current_step: 0,
        total_steps: 22,
        tokens_consumed: 0,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      throw new Error(`Error creando sesión: ${sessionError?.message}`);
    }

    const sessionId = session.id;
    console.log(`[ADN Orchestrator] Sesión creada: ${sessionId}`);

    // ─── PASO 5: Reservar tokens atómicamente ──────────────────────────────────

    const tokensReserved = await reserveTokens(supabaseAdmin, organization_id, sessionId, user_id);
    if (!tokensReserved) {
      console.error(`[ADN Orchestrator] Error reservando tokens para sesión ${sessionId}`);
      await supabaseAdmin
        .from("adn_research_sessions")
        .update({ status: "error", error_message: "Error reservando tokens" })
        .eq("id", sessionId);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error reservando tokens. Intenta de nuevo.",
          code: "TOKEN_RESERVATION_FAILED",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`[ADN Orchestrator] Tokens reservados: ${ESTIMATED_TOKEN_COST}`);

    // ─── PASO 6: Cargar datos del producto ─────────────────────────────────────

    const { data: productDna, error: pdError } = await supabaseAdmin
      .from("product_dna")
      .select("*")
      .eq("id", product_dna_id)
      .single();

    if (pdError || !productDna) {
      await supabaseAdmin
        .from("adn_research_sessions")
        .update({ status: "error", error_message: "Product DNA no encontrado" })
        .eq("id", sessionId);
      throw new Error(`Product DNA no encontrado: ${pdError?.message}`);
    }

    // Extraer información para intelligence gathering
    const wizardResponses = productDna.wizard_responses || {};
    const productName = wizardResponses.product_name || wizardResponses.name || "Producto";
    const productDescription = wizardResponses.product_description || wizardResponses.description || "";
    const competitorLinks = (productDna.competitor_links || []).map((l: any) => l.url || l).filter(Boolean);
    const locations = config.locations || wizardResponses.locations || [];

    // ─── PASO 7: Intelligence Gathering ──────────────────────────────────────

    if (config.include_social_intelligence || config.include_ad_intelligence) {
      console.log(`[ADN Orchestrator] Iniciando Intelligence Gathering...`);

      // Actualizar estado a gathering_intelligence
      await supabaseAdmin
        .from("adn_research_sessions")
        .update({ status: "gathering_intelligence" })
        .eq("id", sessionId);

      try {
        const intelligenceResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/intelligence-gatherer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              product_dna_id,
              session_id: sessionId,
              product_name: productName,
              product_description: productDescription,
              competitor_links: competitorLinks,
              locations: locations,
              organization_id,
            }),
          }
        );

        if (!intelligenceResponse.ok) {
          const errorText = await intelligenceResponse.text();
          console.warn(`[ADN Orchestrator] Intelligence Gathering falló: ${errorText}`);
          // No fallar todo el proceso por esto, continuar sin intelligence
        } else {
          const intelligenceResult = await intelligenceResponse.json();
          console.log(`[ADN Orchestrator] Intelligence Gathering completado`);
        }
      } catch (igError) {
        console.warn(`[ADN Orchestrator] Error en Intelligence Gathering:`, igError);
        // Continuar sin intelligence
      }
    }

    // ─── PASO 8: Iniciar Research (fire-and-forget) ──────────────────────────

    console.log(`[ADN Orchestrator] Iniciando Research de 22 pasos (async)...`);

    // Actualizar estado de la sesión
    await supabaseAdmin
      .from("adn_research_sessions")
      .update({ status: "researching", current_step: 1 })
      .eq("id", sessionId);

    // Fire-and-forget: llamar a adn-research-v3 sin esperar
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/adn-research-v3`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
        product_id,
        product_dna_id,
        client_dna_id: config.include_client_dna ? client_dna_id : undefined,
        organization_id,
        include_client_dna: config.include_client_dna,
        include_social_intelligence: config.include_social_intelligence,
        include_ad_intelligence: config.include_ad_intelligence,
      }),
    }).catch((err) => {
      console.error(`[ADN Orchestrator] Error iniciando research:`, err);
    });

    // ─── PASO 9: Retornar al frontend ────────────────────────────────────────

    console.log(`[ADN Orchestrator] Retornando sesión ${sessionId} al frontend`);

    const response: OrchestratorResponse = {
      success: true,
      session_id: sessionId,
      status: "researching",
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ADN Orchestrator] Error:", error);

    const response: OrchestratorResponse = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
