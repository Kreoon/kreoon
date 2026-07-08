// ============================================================================
// HANDLERS DE CAMPAIGN CHECKOUT
// Extraido de index.ts sin cambiar logica.
// ============================================================================

import Stripe from "https://esm.sh/stripe@14.14.0";

export async function handleCampaignCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const campaignId = metadata.campaign_id;
  const walletId = metadata.wallet_id;
  const userId = metadata.user_id;
  const commissionRate = Number(metadata.commission_rate) || 30;
  const totalCreatorPayment = Number(metadata.total_creator_payment) || 0;
  const platformFee = Number(metadata.platform_fee) || 0;
  const totalAmount = totalCreatorPayment + platformFee;
  const paymentIntentId = session.payment_intent as string;

  if (!campaignId || !walletId) {
    console.error("Missing campaign_id or wallet_id in session metadata");
    return;
  }

  if (metadata.type === "campaign_publish") {
    // FASE checklist seccion 3: reintento de Stripe (timeout, 5xx transitorio)
    // ejecutaba este handler de nuevo sin ningun guard -> escrow_holds y
    // unified_transactions duplicados por el mismo cobro. Chequeo previo +
    // UNIQUE parcial en escrow_holds.stripe_payment_intent_id como backstop
    // de la ventana de carrera (dos entregas del webhook solapadas).
    const { data: existingEscrow } = await supabase
      .from("escrow_holds")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (existingEscrow) {
      console.log(`Campaign ${campaignId}: escrow ya existe para payment_intent ${paymentIntentId}, omitiendo (reintento de Stripe)`);
      return;
    }

    // Create escrow hold
    // FASE checklist seccion 3: las columnas usadas aca (creator_amount,
    // platform_fee, commission_rate, hold_type) NO EXISTEN en escrow_holds
    // -- este insert SIEMPRE fallaba (23503/42703), la campaña nunca se
    // activaba pese a que Stripe ya habia cobrado. Columnas reales
    // confirmadas contra el schema real (ver escrow-service/index.ts, que
    // si inserta correctamente en esta misma tabla): client_id (NOT NULL),
    // project_type (enum financial_project_type), platform_fee_rate
    // (fraccion 0-1, no porcentaje), distributions (jsonb NOT NULL).
    const { data: escrow, error: escrowErr } = await supabase
      .from("escrow_holds")
      .insert({
        project_type: "campaign_managed",
        project_title: `Campaign payment`,
        client_id: userId,
        client_wallet_id: walletId,
        total_amount: totalAmount,
        currency: "USD",
        platform_fee_rate: commissionRate / 100, // platform_fee_amount es columna generada (total_amount * rate)
        distributions: [],
        status: "funded",
        funded_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_payment_status: "succeeded",
      })
      .select("id")
      .single();

    if (escrowErr) {
      if (escrowErr.code === "23505") {
        console.log(`Campaign ${campaignId}: escrow duplicado detectado por UNIQUE constraint (carrera de webhooks), omitiendo`);
        return;
      }
      console.error("Error creating escrow:", escrowErr);
      return;
    }

    // Update campaign: activate
    await supabase
      .from("marketplace_campaigns")
      .update({
        status: "active",
        payment_status: "in_escrow",
        escrow_hold_id: escrow.id,
        stripe_payment_intent_id: paymentIntentId,
        activated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // Record transaction
    await supabase.from("unified_transactions").insert({
      wallet_id: walletId,
      transaction_type: "escrow_hold",
      status: "completed",
      amount: totalAmount,
      escrow_id: escrow.id,
      stripe_payment_intent_id: paymentIntentId,
      description: `Campaign escrow funded (publish)`,
      processed_at: new Date().toISOString(),
    });

    console.log(`Campaign ${campaignId} activated after publish checkout`);

  } else if (metadata.type === "campaign_bid_payment") {
    // ── Auction/Range: move campaign to in_progress ──
    const { data: existingBidEscrow } = await supabase
      .from("escrow_holds")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (existingBidEscrow) {
      console.log(`Campaign ${campaignId}: escrow de bid ya existe para payment_intent ${paymentIntentId}, omitiendo (reintento de Stripe)`);
      return;
    }

    const { data: escrow, error: escrowErr } = await supabase
      .from("escrow_holds")
      .insert({
        project_type: "campaign_managed",
        project_title: `Campaign bid payment`,
        client_id: userId,
        client_wallet_id: walletId,
        total_amount: totalAmount,
        currency: "USD",
        platform_fee_rate: commissionRate / 100, // platform_fee_amount es columna generada (total_amount * rate)
        distributions: [],
        status: "funded",
        funded_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_payment_status: "succeeded",
      })
      .select("id")
      .single();

    if (escrowErr) {
      if (escrowErr.code === "23505") {
        console.log(`Campaign ${campaignId}: escrow de bid duplicado detectado por UNIQUE constraint (carrera de webhooks), omitiendo`);
        return;
      }
      console.error("Error creating escrow:", escrowErr);
      return;
    }

    // Update campaign: in_progress
    await supabase
      .from("marketplace_campaigns")
      .update({
        status: "in_progress",
        payment_status: "in_escrow",
        escrow_hold_id: escrow.id,
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", campaignId);

    // Record transaction
    await supabase.from("unified_transactions").insert({
      wallet_id: walletId,
      transaction_type: "escrow_hold",
      status: "completed",
      amount: totalAmount,
      escrow_id: escrow.id,
      stripe_payment_intent_id: paymentIntentId,
      description: `Campaign escrow funded (bid payment)`,
      processed_at: new Date().toISOString(),
    });

    console.log(`Campaign ${campaignId} moved to in_progress after bid checkout`);
  }
}
