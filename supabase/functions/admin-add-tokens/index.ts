/**
 * Admin Add Tokens - Edge Function temporal
 * Agrega tokens a una organización específica
 */

import { createClient } from "npm:@supabase/supabase-js@2.46.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { organization_id, tokens, action, session_id, product_id } = await req.json();

    // Action: check - verificar balance actual
    if (action === "check") {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", organization_id)
        .single();

      const { data: balance } = await supabase
        .from("ai_token_balances")
        .select("*")
        .eq("organization_id", organization_id)
        .single();

      return new Response(
        JSON.stringify({
          organization: org,
          balance_subscription: balance?.balance_subscription || 0,
          balance_purchased: balance?.balance_purchased || 0,
          balance_bonus: balance?.balance_bonus || 0,
          balance_total: balance?.balance_total || 0,
          updated_at: balance?.updated_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: add - agregar tokens (como bonus)
    if (action === "add" && tokens > 0) {
      // Verificar si existe el registro
      const { data: existing } = await supabase
        .from("ai_token_balances")
        .select("balance_bonus, balance_total")
        .eq("organization_id", organization_id)
        .single();

      if (existing) {
        // Actualizar balance_bonus
        const newBonus = (existing.balance_bonus || 0) + tokens;
        const { error } = await supabase
          .from("ai_token_balances")
          .update({ balance_bonus: newBonus, updated_at: new Date().toISOString() })
          .eq("organization_id", organization_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            previous_total: existing.balance_total,
            previous_bonus: existing.balance_bonus,
            added: tokens,
            new_bonus: newBonus,
            new_total: (existing.balance_total || 0) + tokens,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Insertar nuevo registro con balance_bonus
        const { error } = await supabase
          .from("ai_token_balances")
          .insert({ organization_id, balance_bonus: tokens });

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            previous_total: 0,
            added: tokens,
            new_bonus: tokens,
            new_total: tokens,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Action: cancel_session - cancelar una sesión stuck
    if (action === "cancel_session") {
      if (!session_id) {
        return new Response(
          JSON.stringify({ error: "session_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("adn_research_sessions")
        .update({
          status: "error",
          error_message: "Proceso interrumpido por timeout. Puedes reiniciar.",
          updated_at: new Date().toISOString()
        })
        .eq("id", session_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Session marked as error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: check_sessions - ver sesiones de research
    if (action === "check_sessions") {
      const { data: sessions, error: sessError } = await supabase
        .from("adn_research_sessions")
        .select("id, product_id, status, current_step, total_steps, tokens_consumed, error_message, progress, created_at, updated_at")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (sessError) {
        return new Response(
          JSON.stringify({ error: sessError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ sessions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: check_product - ver resultados parciales del producto
    if (action === "check_product") {
      const { data: product, error: prodError } = await supabase
        .from("products")
        .select("id, name, full_research_v3")
        .eq("id", product_id)
        .single();

      if (prodError) {
        return new Response(
          JSON.stringify({ error: prodError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const research = product?.full_research_v3 as Record<string, unknown> || {};
      const tabs = research.tabs as Record<string, unknown> || {};
      const tabKeys = Object.keys(tabs);

      // Si se pide un tab específico, devolverlo
      const { tab_key } = { tab_key: null } as { tab_key: string | null };

      return new Response(
        JSON.stringify({
          product_id: product?.id,
          product_name: product?.name,
          tabs_completed: tabKeys.length,
          tab_keys: tabKeys,
          metadata: research.metadata,
          // Incluir preview de cada tab
          tabs_preview: Object.fromEntries(
            Object.entries(tabs).map(([key, value]) => [
              key,
              JSON.stringify(value).slice(0, 200) + "..."
            ])
          ),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'check', 'add', 'check_sessions', 'cancel_session', or 'check_product'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
