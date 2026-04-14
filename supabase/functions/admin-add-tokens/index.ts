/**
 * Admin Add Tokens - Edge Function
 * Agrega tokens a una organización específica
 * Con validación Zod para seguridad de tipos en runtime
 */

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { z, validate, validationErrorResponse, formatValidationErrors } from "../_shared/validation.ts";
import { errorResponse, successResponse, corsHeaders } from "../_shared/error-response.ts";

// ─── Validation Schemas ─────────────────────────────────────────────────────

const baseRequestSchema = z.object({
  organization_id: z.string().uuid({ message: "organization_id debe ser un UUID válido" }),
  action: z.enum(["check", "add", "check_sessions", "cancel_session", "check_product"], {
    errorMap: () => ({ message: "Acción inválida. Use 'check', 'add', 'check_sessions', 'cancel_session', o 'check_product'" }),
  }),
});

const addTokensSchema = baseRequestSchema.extend({
  action: z.literal("add"),
  tokens: z.number().int().positive({ message: "Los tokens deben ser un número positivo" }),
});

const cancelSessionSchema = baseRequestSchema.extend({
  action: z.literal("cancel_session"),
  session_id: z.string().uuid({ message: "session_id debe ser un UUID válido" }),
});

const checkProductSchema = baseRequestSchema.extend({
  action: z.literal("check_product"),
  product_id: z.string().uuid({ message: "product_id debe ser un UUID válido" }),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));

    // Validate base request first
    const baseValidation = validate(baseRequestSchema, body);
    if (!baseValidation.success) {
      return validationErrorResponse(baseValidation.errors!);
    }

    const { organization_id, action } = baseValidation.data!;
    const { tokens, session_id, product_id } = body;

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

      return successResponse({
        organization: org,
        balance_subscription: balance?.balance_subscription || 0,
        balance_purchased: balance?.balance_purchased || 0,
        balance_bonus: balance?.balance_bonus || 0,
        balance_total: balance?.balance_total || 0,
        updated_at: balance?.updated_at,
      });
    }

    // Action: add - agregar tokens (como bonus)
    if (action === "add") {
      const addValidation = validate(addTokensSchema, body);
      if (!addValidation.success) {
        return validationErrorResponse(addValidation.errors!);
      }
      const validatedTokens = addValidation.data!.tokens;
      // Verificar si existe el registro
      const { data: existing } = await supabase
        .from("ai_token_balances")
        .select("balance_bonus, balance_total")
        .eq("organization_id", organization_id)
        .single();

      if (existing) {
        // Actualizar balance_bonus
        const newBonus = (existing.balance_bonus || 0) + validatedTokens;
        const { error } = await supabase
          .from("ai_token_balances")
          .update({ balance_bonus: newBonus, updated_at: new Date().toISOString() })
          .eq("organization_id", organization_id);

        if (error) throw error;

        return successResponse({
          success: true,
          previous_total: existing.balance_total,
          previous_bonus: existing.balance_bonus,
          added: validatedTokens,
          new_bonus: newBonus,
          new_total: (existing.balance_total || 0) + validatedTokens,
        });
      } else {
        // Insertar nuevo registro con balance_bonus
        const { error } = await supabase
          .from("ai_token_balances")
          .insert({ organization_id, balance_bonus: validatedTokens });

        if (error) throw error;

        return successResponse({
          success: true,
          previous_total: 0,
          added: validatedTokens,
          new_bonus: validatedTokens,
          new_total: validatedTokens,
        });
      }
    }

    // Action: cancel_session - cancelar una sesión stuck
    if (action === "cancel_session") {
      const cancelValidation = validate(cancelSessionSchema, body);
      if (!cancelValidation.success) {
        return validationErrorResponse(cancelValidation.errors!);
      }
      const validatedSessionId = cancelValidation.data!.session_id;

      const { error: updateError } = await supabase
        .from("adn_research_sessions")
        .update({
          status: "error",
          error_message: "Proceso interrumpido por timeout. Puedes reiniciar.",
          updated_at: new Date().toISOString()
        })
        .eq("id", validatedSessionId);

      if (updateError) {
        return errorResponse(updateError, { action: "cancel_session" });
      }

      return successResponse({ success: true, message: "Session marked as error" });
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
        return errorResponse(sessError, { action: "check_sessions" });
      }

      return successResponse({ sessions });
    }

    // Action: check_product - ver resultados parciales del producto
    if (action === "check_product") {
      const productValidation = validate(checkProductSchema, body);
      if (!productValidation.success) {
        return validationErrorResponse(productValidation.errors!);
      }
      const validatedProductId = productValidation.data!.product_id;

      const { data: product, error: prodError } = await supabase
        .from("products")
        .select("id, name, full_research_v3")
        .eq("id", validatedProductId)
        .single();

      if (prodError) {
        return errorResponse(prodError, { action: "check_product", resourceId: validatedProductId });
      }

      const research = product?.full_research_v3 as Record<string, unknown> || {};
      const tabs = research.tabs as Record<string, unknown> || {};
      const tabKeys = Object.keys(tabs);

      return successResponse({
        product_id: product?.id,
        product_name: product?.name,
        tabs_completed: tabKeys.length,
        tab_keys: tabKeys,
        metadata: research.metadata,
        tabs_preview: Object.fromEntries(
          Object.entries(tabs).map(([key, value]) => [
            key,
            JSON.stringify(value).slice(0, 200) + "..."
          ])
        ),
      });
    }

    // Este punto no debería alcanzarse debido a la validación del schema
    return errorResponse(new Error("Acción no reconocida"), { action: "unknown" });
  } catch (error) {
    return errorResponse(error, { action: "admin-add-tokens" });
  }
});
