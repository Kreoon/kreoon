// ============================================================================
// KREOON AI TOKENS SERVICE
// Edge Function para gestionar tokens de IA
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid token");
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = req.method === "GET" ? {} : await req.json();

    let result;

    switch (action) {
      case "get-balance":
        result = await getBalance(supabase, user.id, body.organization_id);
        break;
      case "consume":
        result = await consumeTokens(supabase, user.id, body);
        break;
      case "check-can-consume":
        result = await checkCanConsume(supabase, user.id, body);
        break;
      case "purchase":
        result = await purchaseTokens(supabase, user.id, body);
        break;
      case "get-packages":
        result = await getPackages(supabase);
        break;
      case "get-action-costs":
        result = await getActionCosts(supabase);
        break;
      case "get-history":
        result = await getTokenHistory(supabase, user.id, body);
        break;
      case "add-bonus":
        result = await addBonusTokens(supabase, user.id, body);
        break;
      case "admin-credit":
        result = await adminCreditTokens(supabase, user.id, body);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Token error:", error?.message, error?.stack);
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack?.split("\n").slice(0, 3).join(" | ") }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// OBTENER BALANCE
// ============================================================================

async function getBalance(supabase: any, userId: string, organizationId?: string) {
  const query = organizationId 
    ? { organization_id: organizationId }
    : { user_id: userId };

  const { data: balance, error } = await supabase
    .from("ai_token_balances")
    .select("*")
    .match(query)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to get balance: ${error.message}`);
  }

  if (!balance) {
    // Crear balance por defecto si no existe
    const defaultTokens = 800; // creator_free default
    
    const { data: newBalance, error: createError } = await supabase
      .from("ai_token_balances")
      .insert({
        ...query,
        balance_subscription: defaultTokens,
        monthly_allowance: defaultTokens,
        subscription_tier: organizationId ? "org_starter" : "creator_free",
        next_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create balance: ${createError.message}`);
    }

    return {
      success: true,
      balance: newBalance,
    };
  }

  // Calcular días hasta reset
  const daysUntilReset = balance.next_reset_at 
    ? Math.ceil((new Date(balance.next_reset_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 30;

  return {
    success: true,
    balance: {
      ...balance,
      days_until_reset: daysUntilReset,
    },
  };
}

// ============================================================================
// CONSUMIR TOKENS
// ============================================================================

async function consumeTokens(supabase: any, userId: string, body: any) {
  const { organization_id, action_type, metadata = {} } = body;

  // Obtener costo de la acción
  const { data: costsConfig } = await supabase
    .from("pricing_configuration")
    .select("config_value")
    .eq("config_key", "ai_action_costs")
    .single();

  const costs = costsConfig?.config_value || {};
  const tokenCost = costs[action_type] || costs.default || 40;

  // Llamar a la función RPC para consumo atómico
  const { data, error } = await supabase.rpc("consume_ai_tokens", {
    p_user_id: organization_id ? null : userId,
    p_org_id: organization_id || null,
    p_action_type: action_type,
    p_tokens: tokenCost,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error(`Failed to consume tokens: ${error.message}`);
  }

  if (!data.success) {
    return {
      success: false,
      error: data.error,
      required: data.required,
      available: data.available,
    };
  }

  return {
    success: true,
    tokens_consumed: data.tokens_consumed,
    balance_remaining: data.balance_remaining,
    source: data.source,
  };
}

// ============================================================================
// VERIFICAR SI PUEDE CONSUMIR
// ============================================================================

async function checkCanConsume(supabase: any, userId: string, body: any) {
  const { organization_id, action_type } = body;

  // Obtener costo
  const { data: costsConfig } = await supabase
    .from("pricing_configuration")
    .select("config_value")
    .eq("config_key", "ai_action_costs")
    .single();

  const costs = costsConfig?.config_value || {};
  const tokenCost = costs[action_type] || costs.default || 40;

  // Obtener balance
  const query = organization_id 
    ? { organization_id }
    : { user_id: userId };

  const { data: balance } = await supabase
    .from("ai_token_balances")
    .select("balance_total")
    .match(query)
    .single();

  const available = balance?.balance_total || 0;
  const canConsume = available >= tokenCost;

  return {
    success: true,
    can_consume: canConsume,
    action: action_type,
    cost: tokenCost,
    available,
    shortfall: canConsume ? 0 : tokenCost - available,
  };
}

// ============================================================================
// COMPRAR TOKENS
// ============================================================================

async function purchaseTokens(supabase: any, userId: string, body: any) {
  const { package_id, organization_id } = body;

  // Obtener paquetes
  const { data: packagesConfig } = await supabase
    .from("pricing_configuration")
    .select("config_value")
    .eq("config_key", "token_packages")
    .single();

  const packages = packagesConfig?.config_value || {};
  const selectedPackage = packages[package_id];

  if (!selectedPackage) {
    throw new Error(`Invalid package: ${package_id}`);
  }

  // Obtener wallet
  const walletQuery = organization_id 
    ? { organization_id }
    : { user_id: userId };

  const { data: wallet } = await supabase
    .from("unified_wallets")
    .select("id, stripe_customer_id")
    .match(walletQuery)
    .single();

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  let customerId = wallet.stripe_customer_id;

  if (!customerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    const customer = await stripe.customers.create({
      email: profile?.email,
      name: profile?.full_name,
      metadata: { user_id: userId },
    });

    customerId = customer.id;

    await supabase
      .from("unified_wallets")
      .update({ stripe_customer_id: customerId })
      .eq("id", wallet.id);
  }

  const baseUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";

  // Crear Checkout Session (redirect flow, simpler than PaymentIntent + Elements)
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${selectedPackage.tokens} Tokens de IA`,
            description: `Paquete de ${selectedPackage.tokens} tokens para funciones de IA en Kreoon`,
          },
          unit_amount: Math.round(selectedPackage.price * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      metadata: {
        type: "tokens",
        package_id,
        tokens: selectedPackage.tokens.toString(),
        user_id: userId,
        organization_id: organization_id || "",
      },
    },
    success_url: `${baseUrl}/settings?tab=tokens&purchase=success`,
    cancel_url: `${baseUrl}/settings?tab=tokens&purchase=cancelled`,
  });

  return {
    success: true,
    checkout_url: session.url,
    session_id: session.id,
    package: {
      id: package_id,
      tokens: selectedPackage.tokens,
      price: selectedPackage.price,
      discount: selectedPackage.discount,
    },
  };
}

// ============================================================================
// OBTENER PAQUETES DISPONIBLES
// ============================================================================

async function getPackages(supabase: any) {
  const { data: packagesConfig } = await supabase
    .from("pricing_configuration")
    .select("config_value")
    .eq("config_key", "token_packages")
    .single();

  const packages = packagesConfig?.config_value || {};

  // Calcular precio por token para cada paquete
  const packagesWithMeta = Object.entries(packages).map(([id, pkg]: [string, any]) => ({
    id,
    ...pkg,
    price_per_token: (pkg.price / pkg.tokens).toFixed(6),
    savings_percent: Math.round(pkg.discount * 100),
  }));

  // Ordenar por precio
  packagesWithMeta.sort((a, b) => a.price - b.price);

  return {
    success: true,
    packages: packagesWithMeta,
    currency: "USD",
  };
}

// ============================================================================
// OBTENER COSTOS POR ACCIÓN
// ============================================================================

async function getActionCosts(supabase: any) {
  const { data: costsConfig } = await supabase
    .from("pricing_configuration")
    .select("config_value")
    .eq("config_key", "ai_action_costs")
    .single();

  const costs = costsConfig?.config_value || {};

  // Agrupar por categoría
  const grouped = {
    research: [] as any[],
    content: [] as any[],
    analysis: [] as any[],
    other: [] as any[],
  };

  const categoryMap: Record<string, keyof typeof grouped> = {
    "research.full": "research",
    "research.phase": "research",
    "dna.full_analysis": "analysis",
    "scripts.generate": "content",
    "content.generate_script": "content",
    "scripts.improve": "content",
    "portfolio.bio": "content",
    "board.analyze_card": "analysis",
    "board.suggestions": "analysis",
    "script_chat": "content",
    "transcription_per_minute": "other",
  };

  for (const [action, cost] of Object.entries(costs)) {
    if (action === "default") continue;
    
    const category = categoryMap[action] || "other";
    grouped[category].push({
      action,
      tokens: cost,
      estimated_cost: `$${((cost as number) * 0.01).toFixed(2)}`, // Aproximado
    });
  }

  return {
    success: true,
    costs: grouped,
    default_cost: costs.default,
    note: "Los costos en USD son aproximados basados en $0.01 por token",
  };
}

// ============================================================================
// OBTENER HISTORIAL DE TOKENS
// ============================================================================

async function getTokenHistory(supabase: any, userId: string, body: any) {
  const { organization_id, limit = 50, offset = 0, type } = body;

  // Obtener balance ID
  const balanceQuery = organization_id 
    ? { organization_id }
    : { user_id: userId };

  const { data: balance } = await supabase
    .from("ai_token_balances")
    .select("id")
    .match(balanceQuery)
    .single();

  if (!balance) {
    return { success: true, transactions: [], total: 0 };
  }

  // Construir query
  let query = supabase
    .from("ai_token_transactions")
    .select("*", { count: "exact" })
    .eq("balance_id", balance.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq("transaction_type", type);
  }

  const { data: transactions, count, error } = await query;

  if (error) {
    throw new Error(`Failed to get history: ${error.message}`);
  }

  // Calcular estadísticas del período
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const { data: statsData } = await supabase
    .from("ai_token_transactions")
    .select("tokens, transaction_type")
    .eq("balance_id", balance.id)
    .gte("created_at", thirtyDaysAgo.toISOString());

  const stats = {
    consumed_30d: 0,
    purchased_30d: 0,
    bonus_30d: 0,
  };

  for (const tx of statsData || []) {
    if (tx.transaction_type === "consumption") {
      stats.consumed_30d += Math.abs(tx.tokens);
    } else if (tx.transaction_type === "purchase") {
      stats.purchased_30d += tx.tokens;
    } else if (tx.transaction_type === "bonus") {
      stats.bonus_30d += tx.tokens;
    }
  }

  return {
    success: true,
    transactions,
    total: count,
    stats,
    pagination: {
      offset,
      limit,
      has_more: offset + limit < count,
    },
  };
}

// ============================================================================
// AGREGAR TOKENS BONUS (Solo admin)
// ============================================================================

async function addBonusTokens(supabase: any, adminUserId: string, body: any) {
  const { target_user_id, target_org_id, tokens, reason } = body;

  // Verificar que el usuario es admin
  const { data: isAdmin } = await supabase.rpc("is_platform_admin", {
    _user_id: adminUserId,
  });

  if (!isAdmin) {
    throw new Error("Only platform admins can add bonus tokens");
  }

  const query = target_org_id 
    ? { organization_id: target_org_id }
    : { user_id: target_user_id };

  // Obtener balance
  const { data: balance } = await supabase
    .from("ai_token_balances")
    .select("id, balance_bonus")
    .match(query)
    .single();

  if (!balance) {
    throw new Error("Target balance not found");
  }

  // Agregar bonus
  const { error } = await supabase
    .from("ai_token_balances")
    .update({
      balance_bonus: balance.balance_bonus + tokens,
    })
    .eq("id", balance.id);

  if (error) {
    throw new Error(`Failed to add bonus: ${error.message}`);
  }

  // Registrar transacción
  await supabase.from("ai_token_transactions").insert({
    balance_id: balance.id,
    transaction_type: "bonus",
    tokens,
    balance_after: balance.balance_bonus + tokens,
    action_metadata: { reason, added_by: adminUserId },
    executed_by: adminUserId,
  });

  return {
    success: true,
    tokens_added: tokens,
    reason,
    new_bonus_balance: balance.balance_bonus + tokens,
  };
}

// ============================================================================
// ADMIN CREDIT (Crédito manual por admin)
// ============================================================================

async function adminCreditTokens(supabase: any, adminUserId: string, body: any) {
  const { organization_id, tokens, description } = body;

  if (!organization_id || !tokens || tokens <= 0) {
    throw new Error("organization_id and positive tokens amount required");
  }

  // Verificar que el usuario es admin
  const { data: isAdmin } = await supabase.rpc("is_platform_admin", {
    _user_id: adminUserId,
  });

  if (!isAdmin) {
    throw new Error("Only platform admins can credit tokens");
  }

  // Obtener o crear balance
  let { data: balance } = await supabase
    .from("ai_token_balances")
    .select("id, balance_purchased")
    .eq("organization_id", organization_id)
    .single();

  if (!balance) {
    const { data: newBalance, error: createError } = await supabase
      .from("ai_token_balances")
      .insert({
        organization_id,
        balance_subscription: 0,
        balance_purchased: tokens,
        monthly_allowance: 0,
        subscription_tier: "org_starter",
        next_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (createError) throw new Error(`Failed to create balance: ${createError.message}`);
    balance = newBalance;
  } else {
    const { error } = await supabase
      .from("ai_token_balances")
      .update({ balance_purchased: balance.balance_purchased + tokens })
      .eq("id", balance.id);

    if (error) throw new Error(`Failed to credit: ${error.message}`);
  }

  // Registrar transacción
  await supabase.from("ai_token_transactions").insert({
    balance_id: balance.id,
    transaction_type: "purchase",
    tokens,
    balance_after: (balance.balance_purchased || 0) + tokens,
    action_metadata: { description, credited_by: adminUserId },
    executed_by: adminUserId,
  });

  return {
    success: true,
    tokens_credited: tokens,
    description,
  };
}
