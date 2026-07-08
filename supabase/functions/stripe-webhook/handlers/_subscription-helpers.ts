// ============================================================================
// FUNCIONES AUXILIARES DE SUSCRIPCIONES/TOKENS/REFERIDOS
// Extraido de index.ts sin cambiar logica.
// ============================================================================

export function mapStripeStatus(status: string): string {
  const mapping: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
    incomplete: "trialing",
    incomplete_expired: "expired",
    paused: "paused",
  };
  return mapping[status] || "active";
}

export async function getPriceTierMapping(supabase: any, priceId: string) {
  // Real Stripe Price IDs → tier mapping
  const tierMapping: Record<string, string> = {
    // Marcas Starter ($39/mo, $390/yr)
    [Deno.env.get("STRIPE_PRICE_BRAND_STARTER_MONTHLY") || ""]: "brand_starter",
    [Deno.env.get("STRIPE_PRICE_BRAND_STARTER_ANNUAL") || ""]: "brand_starter",
    // Marcas Pro ($129/mo, $1290/yr)
    [Deno.env.get("STRIPE_PRICE_BRAND_PRO_MONTHLY") || ""]: "brand_pro",
    [Deno.env.get("STRIPE_PRICE_BRAND_PRO_ANNUAL") || ""]: "brand_pro",
    // Marcas Business ($349/mo, $3490/yr)
    [Deno.env.get("STRIPE_PRICE_BRAND_BUSINESS_MONTHLY") || ""]: "brand_business",
    [Deno.env.get("STRIPE_PRICE_BRAND_BUSINESS_ANNUAL") || ""]: "brand_business",
    // Creator Pro ($24/mo, $240/yr)
    [Deno.env.get("STRIPE_PRICE_CREATOR_PRO_MONTHLY") || ""]: "creator_pro",
    [Deno.env.get("STRIPE_PRICE_CREATOR_PRO_ANNUAL") || ""]: "creator_pro",
    // Agency Starter ($249/mo, $2490/yr)
    [Deno.env.get("STRIPE_PRICE_ORG_STARTER_MONTHLY") || ""]: "org_starter",
    [Deno.env.get("STRIPE_PRICE_ORG_STARTER_ANNUAL") || ""]: "org_starter",
    // Agency Pro ($599/mo, $5990/yr)
    [Deno.env.get("STRIPE_PRICE_ORG_PRO_MONTHLY") || ""]: "org_pro",
    [Deno.env.get("STRIPE_PRICE_ORG_PRO_ANNUAL") || ""]: "org_pro",
  };

  // Remove empty key from mapping (if env var is missing)
  delete tierMapping[""];

  // Also check subscription metadata as fallback
  if (!tierMapping[priceId]) {
    console.warn(`Unknown price ID: ${priceId}, falling back to brand_free`);
  }

  return { tier: tierMapping[priceId] || "brand_free" };
}

export async function getPlanConfig(supabase: any, tier: string) {
  const { data } = await supabase
    .from("pricing_configuration")
    .select("config_value")
    .in("config_key", ["plans_brand", "plans_creator", "plans_organization"]);

  for (const config of data || []) {
    if (config.config_value[tier]) {
      const plan = config.config_value[tier];
      return {
        price_monthly: plan.price_monthly,
        price_annual: plan.price_annual,
        ai_tokens_monthly: plan.ai_tokens_monthly,
        limits: {
          max_users: plan.max_users,
          max_content_per_month: plan.max_content_per_month,
          ai_tokens_monthly: plan.ai_tokens_monthly,
          storage_gb: plan.storage_gb,
          features: plan.features,
        },
      };
    }
  }

  // Default
  return {
    price_monthly: 0,
    price_annual: 0,
    ai_tokens_monthly: 500,
    limits: { features: [] },
  };
}

export async function updateTokenAllowance(
  supabase: any,
  wallet: any,
  monthlyTokens: number,
  tier: string,
  currentPeriodEnd?: number // Unix timestamp from Stripe subscription
) {
  const query = wallet.user_id
    ? { user_id: wallet.user_id }
    : { organization_id: wallet.organization_id };

  // Usar current_period_end de Stripe como fecha de próximo reset
  // Esto ancla el ciclo de tokens al ciclo de facturación
  const nextReset = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from("ai_token_balances")
    .update({
      subscription_tier: tier,
      monthly_allowance: monthlyTokens,
      balance_subscription: monthlyTokens,
      last_reset_at: new Date().toISOString(),
      next_reset_at: nextReset.toISOString(),
    })
    .match(query);
}

export async function resetMonthlyTokens(supabase: any, walletId: string, nextResetDate?: Date) {
  const { data: wallet } = await supabase
    .from("unified_wallets")
    .select("user_id, organization_id")
    .eq("id", walletId)
    .single();

  if (!wallet) return;

  const query = wallet.user_id
    ? { user_id: wallet.user_id }
    : { organization_id: wallet.organization_id };

  const { data: balance } = await supabase
    .from("ai_token_balances")
    .select("id, monthly_allowance, balance_subscription")
    .match(query)
    .single();

  if (balance) {
    // CORREGIDO: Resetear a monthly_allowance, NO acumular
    // Los tokens del plan se renuevan cada mes, no se acumulan
    const nextReset = nextResetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await supabase
      .from("ai_token_balances")
      .update({
        balance_subscription: balance.monthly_allowance, // Solo el allowance mensual (NO acumulativo)
        last_reset_at: new Date().toISOString(),
        next_reset_at: nextReset.toISOString(),
      })
      .eq("id", balance.id);

    // Registrar reset con el nuevo balance (reseteado, no acumulado)
    await supabase.from("ai_token_transactions").insert({
      balance_id: balance.id,
      transaction_type: "reset",
      tokens: balance.monthly_allowance,
      balance_after: balance.monthly_allowance,
    });
  }
}

export async function processReferralSubscriptionCommission(supabase: any, wallet: any, subscription: any) {
  const referredId = wallet.user_id || wallet.organization_id;
  if (!referredId) return;

  const { data: referral } = await supabase
    .from("referral_relationships")
    .select("id, referrer_id, referrer_wallet_id, subscription_rate, status")
    .eq("referred_id", referredId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!referral) return;

  // Deduplicación: clave única por periodo de facturación (mes/año)
  const now = new Date();
  const periodKey = `${subscription.stripe_subscription_id}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: existingEarning } = await supabase
    .from("referral_earnings")
    .select("id")
    .eq("relationship_id", referral.id)
    .eq("source_type", "subscription")
    .eq("source_id", periodKey)
    .limit(1)
    .maybeSingle();

  if (existingEarning) {
    console.log(`Referral commission already exists for period ${periodKey}, skipping`);
    return;
  }

  // Use tier-based subscription_rate (kept in sync by DB trigger update_user_referral_tier)
  const rate = referral.subscription_rate || 0.20;
  const commissionAmount = subscription.current_price * rate;
  if (commissionAmount <= 0) return;

  // Registrar ganancia con source_id que incluye periodo
  await supabase
    .from("referral_earnings")
    .insert({
      relationship_id: referral.id,
      referrer_id: referral.referrer_id,
      referrer_wallet_id: referral.referrer_wallet_id,
      source_type: "subscription",
      source_id: periodKey,
      gross_amount: subscription.current_price,
      commission_rate: referral.subscription_rate,
      commission_amount: commissionAmount,
      status: "credited",
      credited_at: now.toISOString(),
    });

  // Acreditar al wallet del referidor
  if (referral.referrer_wallet_id) {
    await supabase.rpc("update_wallet_balance", {
      p_wallet_id: referral.referrer_wallet_id,
      p_available_delta: commissionAmount,
      p_earned_delta: commissionAmount,
    });

    // Registrar transacción en wallet del referidor
    await supabase.from("unified_transactions").insert({
      wallet_id: referral.referrer_wallet_id,
      transaction_type: "referral_commission",
      status: "completed",
      amount: commissionAmount,
      referral_id: referral.id,
      description: `Comisión referido: suscripción ${subscription.tier}`,
      processed_at: now.toISOString(),
    });

    // Registrar débito en wallet de plataforma
    const { data: platformWallet } = await supabase
      .from("unified_wallets")
      .select("id")
      .eq("wallet_type", "platform")
      .limit(1)
      .maybeSingle();

    if (platformWallet) {
      await supabase.from("unified_transactions").insert({
        wallet_id: platformWallet.id,
        transaction_type: "referral_commission",
        status: "completed",
        amount: -commissionAmount,
        referral_id: referral.id,
        description: `Pago comisión referido: suscripción ${subscription.tier}`,
        processed_at: now.toISOString(),
      });
    }
  }

  // Actualizar totales atómicamente
  await supabase.rpc("increment_column", {
    p_table: "referral_relationships",
    p_column: "total_subscription_earned",
    p_amount: commissionAmount,
    p_id: referral.id,
  });

  console.log(`Referral commission $${commissionAmount} credited to ${referral.referrer_id} for period ${periodKey}`);
}
