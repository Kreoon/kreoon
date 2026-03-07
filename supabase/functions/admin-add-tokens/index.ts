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
    const { organization_id, tokens, action } = await req.json();

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

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'check' or 'add'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
