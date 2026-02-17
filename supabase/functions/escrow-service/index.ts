// ============================================================================
// KREOON ESCROW SERVICE
// Edge Function para crear y gestionar escrows con Stripe
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

interface CreateEscrowRequest {
  project_type: "marketplace_direct" | "campaign_managed" | "live_shopping" | "professional_service" | "corporate_package";
  project_id?: string;
  project_title: string;
  total_amount: number;
  currency?: string;
  distributions: {
    user_id: string;
    role: "creator" | "editor" | "organization";
    percentage: number;
  }[];
  milestones?: {
    title: string;
    percentage: number;
    due_date?: string;
  }[];
  referral_code?: string;
}

interface ReleaseEscrowRequest {
  escrow_id: string;
  milestone_id?: string; // Para liberación parcial
}

interface RefundEscrowRequest {
  escrow_id: string;
  reason: string;
  partial_amount?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar token del usuario
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid token");
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    let result;

    switch (action) {
      case "create":
        result = await createEscrow(supabase, user.id, body as CreateEscrowRequest);
        break;
      case "fund":
        result = await fundEscrow(supabase, user.id, body.escrow_id);
        break;
      case "approve":
        result = await approveEscrow(supabase, user.id, body.escrow_id);
        break;
      case "release":
        result = await releaseEscrow(supabase, user.id, body as ReleaseEscrowRequest);
        break;
      case "dispute":
        result = await disputeEscrow(supabase, user.id, body.escrow_id, body.reason);
        break;
      case "refund":
        result = await refundEscrow(supabase, user.id, body as RefundEscrowRequest);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Escrow error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// CREAR ESCROW
// ============================================================================

async function createEscrow(supabase: any, userId: string, request: CreateEscrowRequest) {
  // Obtener wallet del cliente
  const { data: clientWallet } = await supabase
    .from("unified_wallets")
    .select("id, stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (!clientWallet) {
    throw new Error("Client wallet not found");
  }

  // Obtener comisión aplicable
  const { data: commissionRate } = await supabase
    .rpc("get_applicable_commission", {
      p_user_id: userId,
      p_org_id: null,
      p_project_type: request.project_type,
    });

  const platformFeeRate = commissionRate || 0.25;
  const platformFeeAmount = request.total_amount * platformFeeRate;
  const amountAfterFee = request.total_amount - platformFeeAmount;

  // Verificar referido
  let referralId = null;
  let referralRate = 0;

  if (request.referral_code) {
    // Buscar relación de referido del cliente
    const { data: referral } = await supabase
      .from("referral_relationships")
      .select("id, transaction_rate, status")
      .eq("referred_id", userId)
      .eq("status", "active")
      .single();

    if (referral) {
      referralId = referral.id;
      referralRate = referral.transaction_rate;
    }
  }

  // Construir distribuciones con montos calculados
  const distributions = await Promise.all(
    request.distributions.map(async (dist) => {
      const { data: wallet } = await supabase
        .from("unified_wallets")
        .select("id")
        .eq("user_id", dist.user_id)
        .single();

      return {
        wallet_id: wallet?.id,
        user_id: dist.user_id,
        role: dist.role,
        percentage: dist.percentage,
        amount: amountAfterFee * dist.percentage,
        released: false,
        released_at: null,
      };
    })
  );

  // Construir milestones si hay
  const milestones = request.milestones?.map((m, index) => ({
    id: crypto.randomUUID(),
    title: m.title,
    percentage: m.percentage,
    amount: amountAfterFee * m.percentage,
    status: "pending",
    due_date: m.due_date,
    completed_at: null,
  })) || [];

  // Crear escrow
  const { data: escrow, error } = await supabase
    .from("escrow_holds")
    .insert({
      project_id: request.project_id,
      project_type: request.project_type,
      project_title: request.project_title,
      client_id: userId,
      client_wallet_id: clientWallet.id,
      total_amount: request.total_amount,
      currency: request.currency || "USD",
      platform_fee_rate: platformFeeRate,
      referral_id: referralId,
      referral_fee_rate: referralRate,
      distributions: distributions,
      milestones: milestones.length > 0 ? milestones : null,
      status: "created",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create escrow: ${error.message}`);
  }

  return {
    success: true,
    escrow_id: escrow.id,
    total_amount: request.total_amount,
    platform_fee: platformFeeAmount,
    platform_fee_rate: platformFeeRate,
    amount_to_distribute: amountAfterFee,
    distributions: distributions,
    referral_applied: !!referralId,
    next_step: "fund",
  };
}

// ============================================================================
// FONDEAR ESCROW (Crear Payment Intent)
// ============================================================================

async function fundEscrow(supabase: any, userId: string, escrowId: string) {
  // Obtener escrow
  const { data: escrow } = await supabase
    .from("escrow_holds")
    .select("*")
    .eq("id", escrowId)
    .eq("client_id", userId)
    .single();

  if (!escrow) {
    throw new Error("Escrow not found or not authorized");
  }

  if (escrow.status !== "created") {
    throw new Error(`Escrow already in status: ${escrow.status}`);
  }

  // Obtener o crear Stripe customer
  const { data: wallet } = await supabase
    .from("unified_wallets")
    .select("stripe_customer_id")
    .eq("id", escrow.client_wallet_id)
    .single();

  let customerId = wallet?.stripe_customer_id;

  if (!customerId) {
    // Obtener datos del usuario
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    // Crear customer en Stripe
    const customer = await stripe.customers.create({
      email: profile?.email,
      name: profile?.full_name,
      metadata: {
        user_id: userId,
      },
    });

    customerId = customer.id;

    // Guardar en wallet
    await supabase
      .from("unified_wallets")
      .update({ stripe_customer_id: customerId })
      .eq("id", escrow.client_wallet_id);
  }

  // Crear Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(escrow.total_amount * 100), // Stripe usa centavos
    currency: escrow.currency.toLowerCase(),
    customer: customerId,
    metadata: {
      type: "escrow",
      escrow_id: escrowId,
      user_id: userId,
      project_type: escrow.project_type,
    },
    description: `Escrow: ${escrow.project_title}`,
    // Captura automática
    capture_method: "automatic",
  });

  // Actualizar escrow con payment intent
  await supabase
    .from("escrow_holds")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      stripe_payment_status: "pending",
    })
    .eq("id", escrowId);

  return {
    success: true,
    escrow_id: escrowId,
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id,
    amount: escrow.total_amount,
    currency: escrow.currency,
  };
}

// ============================================================================
// APROBAR ESCROW (Cliente aprueba entrega)
// ============================================================================

async function approveEscrow(supabase: any, userId: string, escrowId: string) {
  const { data: escrow } = await supabase
    .from("escrow_holds")
    .select("*")
    .eq("id", escrowId)
    .eq("client_id", userId)
    .single();

  if (!escrow) {
    throw new Error("Escrow not found or not authorized");
  }

  if (escrow.status !== "pending_approval" && escrow.status !== "funded") {
    throw new Error(`Cannot approve escrow in status: ${escrow.status}`);
  }

  const { error } = await supabase
    .from("escrow_holds")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", escrowId);

  if (error) {
    throw new Error(`Failed to approve: ${error.message}`);
  }

  // Auto-liberar inmediatamente después de aprobación
  return await releaseEscrow(supabase, userId, { escrow_id: escrowId });
}

// ============================================================================
// LIBERAR ESCROW
// ============================================================================

async function releaseEscrow(supabase: any, userId: string, request: ReleaseEscrowRequest) {
  // Usar la función SQL para liberar
  const { data, error } = await supabase
    .rpc("release_escrow", {
      p_escrow_id: request.escrow_id,
      p_released_by: userId,
    });

  if (error) {
    throw new Error(`Failed to release escrow: ${error.message}`);
  }

  return data;
}

// ============================================================================
// DISPUTAR ESCROW
// ============================================================================

async function disputeEscrow(supabase: any, userId: string, escrowId: string, reason: string) {
  const { data: escrow } = await supabase
    .from("escrow_holds")
    .select("client_id, distributions")
    .eq("id", escrowId)
    .single();

  if (!escrow) {
    throw new Error("Escrow not found");
  }

  // Verificar que el usuario es parte del escrow
  const isClient = escrow.client_id === userId;
  const isParticipant = escrow.distributions.some(
    (d: any) => d.user_id === userId
  );

  if (!isClient && !isParticipant) {
    throw new Error("Not authorized to dispute this escrow");
  }

  const { error } = await supabase
    .from("escrow_holds")
    .update({
      status: "disputed",
      disputed_at: new Date().toISOString(),
      dispute_reason: reason,
    })
    .eq("id", escrowId);

  if (error) {
    throw new Error(`Failed to dispute: ${error.message}`);
  }

  // TODO: Notificar a todas las partes y al equipo de soporte

  return {
    success: true,
    escrow_id: escrowId,
    status: "disputed",
    message: "Dispute registered. Our team will review and contact all parties.",
  };
}

// ============================================================================
// REEMBOLSAR ESCROW
// ============================================================================

async function refundEscrow(supabase: any, userId: string, request: RefundEscrowRequest) {
  const { data: escrow } = await supabase
    .from("escrow_holds")
    .select("*")
    .eq("id", request.escrow_id)
    .single();

  if (!escrow) {
    throw new Error("Escrow not found");
  }

  // Solo admin o cliente puede reembolsar (simplificado)
  // En producción, verificar rol de admin
  if (escrow.client_id !== userId) {
    throw new Error("Not authorized to refund");
  }

  if (!["funded", "disputed"].includes(escrow.status)) {
    throw new Error(`Cannot refund escrow in status: ${escrow.status}`);
  }

  const refundAmount = request.partial_amount || escrow.total_amount;

  // Crear refund en Stripe
  if (escrow.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({
        payment_intent: escrow.stripe_payment_intent_id,
        amount: Math.round(refundAmount * 100),
        reason: "requested_by_customer",
        metadata: {
          escrow_id: request.escrow_id,
          reason: request.reason,
        },
      });
    } catch (stripeError) {
      throw new Error(`Stripe refund failed: ${stripeError.message}`);
    }
  }

  // Actualizar escrow
  const newStatus = refundAmount === escrow.total_amount ? "refunded" : "partially_refunded";

  await supabase
    .from("escrow_holds")
    .update({
      status: newStatus,
      dispute_resolved_at: new Date().toISOString(),
      dispute_resolution: `Refunded: ${request.reason}`,
    })
    .eq("id", request.escrow_id);

  // Registrar transacción de refund
  await supabase.from("unified_transactions").insert({
    wallet_id: escrow.client_wallet_id,
    transaction_type: "escrow_refund",
    status: "completed",
    amount: refundAmount,
    escrow_id: request.escrow_id,
    description: `Refund: ${request.reason}`,
    processed_at: new Date().toISOString(),
  });

  return {
    success: true,
    escrow_id: request.escrow_id,
    refund_amount: refundAmount,
    status: newStatus,
  };
}
