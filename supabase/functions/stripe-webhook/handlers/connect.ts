// ============================================================================
// HANDLERS DE STRIPE CONNECT
// Extraido de index.ts sin cambiar logica.
// ============================================================================

import Stripe from "https://esm.sh/stripe@14.14.0";

export async function handleConnectAccountUpdated(supabase: any, account: Stripe.Account) {
  const status = account.charges_enabled && account.payouts_enabled
    ? "active"
    : account.details_submitted
      ? "pending"
      : "restricted";

  await supabase
    .from("unified_wallets")
    .update({
      stripe_connect_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_connect_account_id", account.id);
}

export async function handlePayoutCompleted(supabase: any, payout: Stripe.Payout) {
  await supabase
    .from("withdrawal_requests")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
    })
    .eq("stripe_payout_id", payout.id);
}

export async function handlePayoutFailed(supabase: any, payout: Stripe.Payout) {
  const failureMessage = payout.failure_message || "Payout failed";

  await supabase
    .from("withdrawal_requests")
    .update({
      status: "failed",
      rejection_reason: failureMessage,
      processed_at: new Date().toISOString(),
    })
    .eq("stripe_payout_id", payout.id);
}

/**
 * Owner desautoriza su Connect: limpiamos el mapping para que las
 * próximas suscripciones caigan a modo central (KREOON cobra y debe
 * al owner). Las existentes siguen activas hasta que Stripe las cancele
 * por fallos de transfer.
 */
export async function handleConnectAccountDeauthorized(supabase: any, account: Stripe.Account) {
  const accountId = account.id;
  const { error } = await supabase
    .from('stripe_connected_accounts')
    .delete()
    .eq('stripe_account_id', accountId);
  if (error) {
    console.error('[connect_deauth] delete failed', error);
  } else {
    console.log(`[connect_deauth] Removed mapping for ${accountId}`);
  }
}
