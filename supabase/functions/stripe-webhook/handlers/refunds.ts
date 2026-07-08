// ============================================================================
// HANDLERS DE REFUNDS
// Extraido de index.ts sin cambiar logica.
// ============================================================================

import Stripe from "https://esm.sh/stripe@14.14.0";

export async function handleRefund(supabase: any, charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;

  // Buscar transacción original
  const { data: transaction } = await supabase
    .from("unified_transactions")
    .select("id, wallet_id, amount, escrow_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (transaction) {
    // Registrar refund
    await supabase.from("unified_transactions").insert({
      wallet_id: transaction.wallet_id,
      transaction_type: "refunded",
      status: "completed",
      amount: -transaction.amount,
      escrow_id: transaction.escrow_id,
      related_transaction_id: transaction.id,
      stripe_charge_id: charge.id,
      description: "Refund processed",
      processed_at: new Date().toISOString(),
    });

    // Si es escrow, actualizar estado
    if (transaction.escrow_id) {
      await supabase
        .from("escrow_holds")
        .update({ status: "refunded" })
        .eq("id", transaction.escrow_id);
    }
  }
}
