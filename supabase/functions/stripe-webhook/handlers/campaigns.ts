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
    // ── Fixed price: activate campaign ──
    // Create escrow hold
    const { data: escrow, error: escrowErr } = await supabase
      .from("escrow_holds")
      .insert({
        client_wallet_id: walletId,
        total_amount: totalAmount,
        creator_amount: totalCreatorPayment,
        platform_fee: platformFee,
        commission_rate: commissionRate,
        status: "funded",
        funded_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_payment_status: "succeeded",
        project_title: `Campaign payment`,
        hold_type: "marketplace",
      })
      .select("id")
      .single();

    if (escrowErr) {
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
    const { data: escrow, error: escrowErr } = await supabase
      .from("escrow_holds")
      .insert({
        client_wallet_id: walletId,
        total_amount: totalAmount,
        creator_amount: totalCreatorPayment,
        platform_fee: platformFee,
        commission_rate: commissionRate,
        status: "funded",
        funded_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_payment_status: "succeeded",
        project_title: `Campaign bid payment`,
        hold_type: "marketplace",
      })
      .select("id")
      .single();

    if (escrowErr) {
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
