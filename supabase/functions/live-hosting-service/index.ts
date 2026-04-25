// ============================================================================
// KREOON LIVE HOSTING SERVICE
// Edge Function para gestionar contratación de hosts de transmisiones en vivo
// Soporta 3 canales: marketplace, direct, org_managed
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ============================================================================
// TYPES
// ============================================================================

type HostingChannel = "marketplace" | "direct" | "org_managed";
type HostingRequestStatus =
  | "draft"
  | "pending_payment"
  | "open"
  | "reviewing"
  | "host_selected"
  | "negotiating"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";
type HostStatus =
  | "invited"
  | "applied"
  | "shortlisted"
  | "selected"
  | "counter_offered"
  | "negotiating"
  | "confirmed"
  | "rejected"
  | "withdrawn"
  | "completed"
  | "no_show";

interface CreateRequestPayload {
  channel: HostingChannel;
  organization_id: string;
  client_id?: string;
  brand_id?: string;
  title: string;
  description?: string;
  requirements?: string[];
  preferred_niches?: string[];
  preferred_languages?: string[];
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end?: string;
  timezone?: string;
  estimated_duration_minutes?: number;
  live_type?: string;
  products_to_showcase?: string[];
  target_audience?: string;
  content_guidelines?: string;
  budget_min_usd?: number;
  budget_max_usd?: number;
  fixed_rate_usd?: number;
  commission_on_sales_pct?: number;
  org_markup_rate?: number;
  template_id?: string;
}

interface InviteHostPayload {
  request_id: string;
  user_id: string;
  proposed_rate_usd?: number;
  commission_on_sales_pct?: number;
  message?: string;
}

interface ApplyAsHostPayload {
  request_id: string;
  proposed_rate_usd?: number;
  commission_on_sales_pct?: number;
  application_message?: string;
  portfolio_links?: string[];
  experience_description?: string;
}

interface CounterOfferPayload {
  host_id: string;
  counter_offer_usd: number;
  message?: string;
}

interface ReviewHostPayload {
  host_id: string;
  action: "shortlist" | "select" | "reject";
  notes?: string;
  reason?: string;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid token");
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = req.method !== "GET" ? await req.json() : {};

    let result;

    switch (action) {
      // ─── Shared Actions ───
      case "create-request":
        result = await createRequest(supabase, user.id, body as CreateRequestPayload);
        break;
      case "update-request":
        result = await updateRequest(supabase, user.id, body);
        break;
      case "cancel-request":
        result = await cancelRequest(supabase, user.id, body.request_id, body.reason);
        break;
      case "get-request":
        result = await getRequest(supabase, user.id, body.request_id);
        break;
      case "list-requests":
        result = await listRequests(supabase, user.id, body);
        break;

      // ─── Canal A: Marketplace ───
      case "publish-to-marketplace":
        result = await publishToMarketplace(supabase, user.id, body.request_id);
        break;
      case "apply-as-host":
        result = await applyAsHost(supabase, user.id, body as ApplyAsHostPayload);
        break;
      case "review-applications":
        result = await reviewApplications(supabase, user.id, body.request_id);
        break;
      case "review-host":
        result = await reviewHost(supabase, user.id, body as ReviewHostPayload);
        break;

      // ─── Canal B: Direct ───
      case "invite-host":
        result = await inviteHost(supabase, user.id, body as InviteHostPayload);
        break;
      case "respond-to-invitation":
        result = await respondToInvitation(supabase, user.id, body);
        break;
      case "send-counter-offer":
        result = await sendCounterOffer(supabase, user.id, body as CounterOfferPayload);
        break;
      case "finalize-negotiation":
        result = await finalizeNegotiation(supabase, user.id, body);
        break;

      // ─── Canal C: Org Managed ───
      case "assign-internal-host":
        result = await assignInternalHost(supabase, user.id, body);
        break;
      case "calculate-org-markup":
        result = await calculateOrgMarkup(supabase, user.id, body);
        break;
      case "set-client-price":
        result = await setClientPrice(supabase, user.id, body);
        break;

      // ─── Financials ───
      case "create-hosting-checkout":
        result = await createHostingCheckout(supabase, user.id, body.request_id);
        break;
      case "confirm-payment":
        result = await confirmPayment(supabase, user.id, body.request_id, body.escrow_id);
        break;

      // ─── Post-Live ───
      case "start-live":
        result = await startLive(supabase, user.id, body.request_id);
        break;
      case "end-live":
        result = await endLive(supabase, user.id, body);
        break;
      case "submit-host-review":
        result = await submitHostReview(supabase, user.id, body);
        break;
      case "complete-hosting":
        result = await completeHosting(supabase, user.id, body);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Live hosting error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// SHARED ACTIONS
// ============================================================================

async function createRequest(
  supabase: SupabaseClient,
  userId: string,
  payload: CreateRequestPayload
) {
  // Determinar comisión según canal
  let platformCommissionRate = 0.2; // 20% default
  if (payload.channel === "org_managed") {
    platformCommissionRate = payload.org_markup_rate ? 0.12 : 0.1; // 10-12%
  }

  const { data: request, error } = await supabase
    .from("live_hosting_requests")
    .insert({
      ...payload,
      created_by: userId,
      platform_commission_rate: platformCommissionRate,
      status: "draft",
      requirements: payload.requirements || [],
      products_to_showcase: payload.products_to_showcase || [],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create request: ${error.message}`);

  return {
    success: true,
    request_id: request.id,
    channel: request.channel,
    status: request.status,
  };
}

async function updateRequest(
  supabase: SupabaseClient,
  userId: string,
  payload: { request_id: string; updates: Partial<CreateRequestPayload> }
) {
  // Verificar autorización
  const { data: existing } = await supabase
    .from("live_hosting_requests")
    .select("created_by, status, organization_id")
    .eq("id", payload.request_id)
    .single();

  if (!existing) throw new Error("Request not found");

  // Solo draft/pending_payment pueden editarse libremente
  if (!["draft", "pending_payment"].includes(existing.status)) {
    throw new Error("Cannot update request in current status");
  }

  const { data, error } = await supabase
    .from("live_hosting_requests")
    .update(payload.updates)
    .eq("id", payload.request_id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update: ${error.message}`);

  return { success: true, request: data };
}

async function cancelRequest(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  reason?: string
) {
  const { data: request } = await supabase
    .from("live_hosting_requests")
    .select("*, escrow_hold_id")
    .eq("id", requestId)
    .single();

  if (!request) throw new Error("Request not found");

  // No se puede cancelar si ya está in_progress o completed
  if (["in_progress", "completed"].includes(request.status)) {
    throw new Error("Cannot cancel request in current status");
  }

  // Si hay escrow, procesarlo
  if (request.escrow_hold_id) {
    // Llamar a escrow-service para refund si es necesario
    // Por ahora solo marcamos como cancelled
  }

  const { error } = await supabase
    .from("live_hosting_requests")
    .update({
      status: "cancelled",
      metadata: { ...request.metadata, cancel_reason: reason, cancelled_by: userId },
    })
    .eq("id", requestId);

  if (error) throw new Error(`Failed to cancel: ${error.message}`);

  // Notificar hosts si los hay
  await supabase
    .from("live_hosting_hosts")
    .update({ status: "rejected", rejection_reason: "Request cancelled" })
    .eq("request_id", requestId)
    .in("status", ["invited", "applied", "shortlisted", "selected", "negotiating"]);

  return { success: true, request_id: requestId, status: "cancelled" };
}

async function getRequest(supabase: SupabaseClient, userId: string, requestId: string) {
  const { data: request, error } = await supabase
    .from("live_hosting_requests")
    .select(
      `
      *,
      organization:organizations(id, name),
      client:clients(id, name),
      brand:brands(id, name),
      streaming_session:streaming_sessions_v2(id, status, scheduled_at),
      hosts:live_hosting_hosts(*)
    `
    )
    .eq("id", requestId)
    .single();

  if (error) throw new Error("Request not found");

  return { success: true, request };
}

async function listRequests(
  supabase: SupabaseClient,
  userId: string,
  filters: {
    organization_id?: string;
    channel?: HostingChannel;
    statuses?: HostingRequestStatus[];
    as_host?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase.from("live_hosting_requests").select("*", { count: "exact" });

  if (filters.as_host) {
    // Obtener solicitudes donde el usuario es host
    const { data: hostIds } = await supabase
      .from("live_hosting_hosts")
      .select("request_id")
      .eq("user_id", userId);

    const requestIds = hostIds?.map((h) => h.request_id) || [];
    if (requestIds.length === 0) {
      return { success: true, requests: [], total: 0 };
    }
    query = query.in("id", requestIds);
  } else if (filters.organization_id) {
    query = query.eq("organization_id", filters.organization_id);
  }

  if (filters.channel) {
    query = query.eq("channel", filters.channel);
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  }

  query = query
    .order("scheduled_date", { ascending: true })
    .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1);

  const { data, count, error } = await query;

  if (error) throw new Error(`Failed to list: ${error.message}`);

  return { success: true, requests: data, total: count };
}

// ============================================================================
// CANAL A: MARKETPLACE
// ============================================================================

async function publishToMarketplace(
  supabase: SupabaseClient,
  userId: string,
  requestId: string
) {
  const { data: request } = await supabase
    .from("live_hosting_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) throw new Error("Request not found");
  if (request.channel !== "marketplace") {
    throw new Error("Only marketplace channel can be published");
  }
  if (request.status !== "draft") {
    throw new Error("Request must be in draft status");
  }

  // Crear campaña asociada en marketplace_campaigns (opcional)
  const { data: campaign } = await supabase
    .from("marketplace_campaigns")
    .insert({
      brand_id: request.brand_id,
      title: `[Live] ${request.title}`,
      description: request.description,
      purpose: "live_shopping",
      status: "open",
      budget_usd: request.budget_max_usd || request.fixed_rate_usd,
      start_date: request.scheduled_date,
      end_date: request.scheduled_date,
      application_deadline: request.scheduled_date,
      metadata: { live_hosting_request_id: requestId },
    })
    .select()
    .single();

  // Actualizar request
  const { error } = await supabase
    .from("live_hosting_requests")
    .update({
      status: "open",
      campaign_id: campaign?.id,
    })
    .eq("id", requestId);

  if (error) throw new Error(`Failed to publish: ${error.message}`);

  return {
    success: true,
    request_id: requestId,
    campaign_id: campaign?.id,
    status: "open",
    message: "Request published to marketplace",
  };
}

async function applyAsHost(
  supabase: SupabaseClient,
  userId: string,
  payload: ApplyAsHostPayload
) {
  // Verificar que el request esté abierto
  const { data: request } = await supabase
    .from("live_hosting_requests")
    .select("status, channel")
    .eq("id", payload.request_id)
    .single();

  if (!request) throw new Error("Request not found");
  if (request.status !== "open") throw new Error("Request is not accepting applications");

  // Obtener creator_profile_id
  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  // Verificar que no haya aplicado ya
  const { data: existing } = await supabase
    .from("live_hosting_hosts")
    .select("id")
    .eq("request_id", payload.request_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) throw new Error("Already applied to this request");

  const { data: host, error } = await supabase
    .from("live_hosting_hosts")
    .insert({
      request_id: payload.request_id,
      user_id: userId,
      creator_profile_id: creatorProfile?.id,
      status: "applied",
      proposed_rate_usd: payload.proposed_rate_usd,
      commission_on_sales_pct: payload.commission_on_sales_pct,
      application_message: payload.application_message,
      portfolio_links: payload.portfolio_links || [],
      experience_description: payload.experience_description,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to apply: ${error.message}`);

  return { success: true, host_id: host.id, status: "applied" };
}

async function reviewApplications(
  supabase: SupabaseClient,
  userId: string,
  requestId: string
) {
  const { data: hosts } = await supabase.rpc("get_hosting_hosts", {
    p_request_id: requestId,
  });

  return {
    success: true,
    hosts: hosts || [],
    total: hosts?.length || 0,
  };
}

async function reviewHost(
  supabase: SupabaseClient,
  userId: string,
  payload: ReviewHostPayload
) {
  const { data: host } = await supabase
    .from("live_hosting_hosts")
    .select("*, request:live_hosting_requests(organization_id)")
    .eq("id", payload.host_id)
    .single();

  if (!host) throw new Error("Host not found");

  let newStatus: HostStatus;
  const updateData: Record<string, any> = {};

  switch (payload.action) {
    case "shortlist":
      newStatus = "shortlisted";
      updateData.shortlist_notes = payload.notes;
      break;
    case "select":
      newStatus = "selected";
      updateData.shortlist_notes = payload.notes;
      // Actualizar request status
      await supabase
        .from("live_hosting_requests")
        .update({ status: "host_selected" })
        .eq("id", host.request_id);
      break;
    case "reject":
      newStatus = "rejected";
      updateData.rejection_reason = payload.reason;
      break;
    default:
      throw new Error("Invalid action");
  }

  updateData.status = newStatus;

  const { error } = await supabase
    .from("live_hosting_hosts")
    .update(updateData)
    .eq("id", payload.host_id);

  if (error) throw new Error(`Failed to review: ${error.message}`);

  return { success: true, host_id: payload.host_id, new_status: newStatus };
}

// ============================================================================
// CANAL B: DIRECT
// ============================================================================

async function inviteHost(
  supabase: SupabaseClient,
  userId: string,
  payload: InviteHostPayload
) {
  // Verificar request
  const { data: request } = await supabase
    .from("live_hosting_requests")
    .select("channel, status")
    .eq("id", payload.request_id)
    .single();

  if (!request) throw new Error("Request not found");
  if (request.channel !== "direct") {
    throw new Error("Invitations only for direct channel");
  }

  // Obtener creator_profile
  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", payload.user_id)
    .single();

  const { data: host, error } = await supabase
    .from("live_hosting_hosts")
    .insert({
      request_id: payload.request_id,
      user_id: payload.user_id,
      creator_profile_id: creatorProfile?.id,
      status: "invited",
      proposed_rate_usd: payload.proposed_rate_usd,
      commission_on_sales_pct: payload.commission_on_sales_pct,
      application_message: payload.message,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to invite: ${error.message}`);

  // Actualizar request status
  await supabase
    .from("live_hosting_requests")
    .update({ status: "negotiating" })
    .eq("id", payload.request_id);

  return {
    success: true,
    host_id: host.id,
    status: "invited",
    message: "Invitation sent",
  };
}

async function respondToInvitation(
  supabase: SupabaseClient,
  userId: string,
  payload: { host_id: string; accept: boolean; message?: string }
) {
  const { data: host } = await supabase
    .from("live_hosting_hosts")
    .select("*, request:live_hosting_requests(*)")
    .eq("id", payload.host_id)
    .eq("user_id", userId)
    .single();

  if (!host) throw new Error("Invitation not found");
  if (host.status !== "invited") throw new Error("Invalid invitation status");

  const newStatus: HostStatus = payload.accept ? "confirmed" : "rejected";

  const { error } = await supabase
    .from("live_hosting_hosts")
    .update({
      status: newStatus,
      agreed_rate_usd: payload.accept ? host.proposed_rate_usd : null,
      host_feedback: payload.message,
    })
    .eq("id", payload.host_id);

  if (error) throw new Error(`Failed to respond: ${error.message}`);

  // Si acepta, actualizar request
  if (payload.accept) {
    await supabase
      .from("live_hosting_requests")
      .update({
        status: "pending_payment",
        fixed_rate_usd: host.proposed_rate_usd,
      })
      .eq("id", host.request_id);
  }

  return {
    success: true,
    host_id: payload.host_id,
    accepted: payload.accept,
    next_step: payload.accept ? "payment" : null,
  };
}

async function sendCounterOffer(
  supabase: SupabaseClient,
  userId: string,
  payload: CounterOfferPayload
) {
  const { data: host } = await supabase
    .from("live_hosting_hosts")
    .select("*")
    .eq("id", payload.host_id)
    .eq("user_id", userId)
    .single();

  if (!host) throw new Error("Host record not found");
  if (!["invited", "negotiating"].includes(host.status)) {
    throw new Error("Cannot send counter offer in current status");
  }

  const { error } = await supabase
    .from("live_hosting_hosts")
    .update({
      status: "counter_offered",
      counter_offer_usd: payload.counter_offer_usd,
      counter_offer_message: payload.message,
      counter_offer_at: new Date().toISOString(),
    })
    .eq("id", payload.host_id);

  if (error) throw new Error(`Failed to send counter offer: ${error.message}`);

  return {
    success: true,
    host_id: payload.host_id,
    counter_offer_usd: payload.counter_offer_usd,
    status: "counter_offered",
  };
}

async function finalizeNegotiation(
  supabase: SupabaseClient,
  userId: string,
  payload: { host_id: string; agreed_rate_usd: number; accept_counter?: boolean }
) {
  const { data: host } = await supabase
    .from("live_hosting_hosts")
    .select("*, request:live_hosting_requests(*)")
    .eq("id", payload.host_id)
    .single();

  if (!host) throw new Error("Host not found");

  const finalRate = payload.accept_counter
    ? host.counter_offer_usd
    : payload.agreed_rate_usd;

  // Actualizar host
  const { error: hostError } = await supabase
    .from("live_hosting_hosts")
    .update({
      status: "confirmed",
      agreed_rate_usd: finalRate,
    })
    .eq("id", payload.host_id);

  if (hostError) throw new Error(`Failed to finalize: ${hostError.message}`);

  // Actualizar request
  const { error: reqError } = await supabase
    .from("live_hosting_requests")
    .update({
      status: "pending_payment",
      fixed_rate_usd: finalRate,
    })
    .eq("id", host.request_id);

  if (reqError) throw new Error(`Failed to update request: ${reqError.message}`);

  return {
    success: true,
    host_id: payload.host_id,
    agreed_rate_usd: finalRate,
    status: "confirmed",
    next_step: "payment",
  };
}

// ============================================================================
// CANAL C: ORG MANAGED
// ============================================================================

async function assignInternalHost(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    request_id: string;
    user_id: string;
    agreed_rate_usd: number;
    commission_on_sales_pct?: number;
  }
) {
  const { data: request } = await supabase
    .from("live_hosting_requests")
    .select("channel, organization_id")
    .eq("id", payload.request_id)
    .single();

  if (!request) throw new Error("Request not found");
  if (request.channel !== "org_managed") {
    throw new Error("Internal assignment only for org_managed channel");
  }

  // Verificar que el usuario es miembro de la org
  const { data: member } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", request.organization_id)
    .eq("user_id", payload.user_id)
    .single();

  if (!member) throw new Error("User is not a member of this organization");

  // Obtener creator_profile
  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", payload.user_id)
    .maybeSingle();

  const { data: host, error } = await supabase
    .from("live_hosting_hosts")
    .insert({
      request_id: payload.request_id,
      user_id: payload.user_id,
      creator_profile_id: creatorProfile?.id,
      status: "confirmed",
      agreed_rate_usd: payload.agreed_rate_usd,
      commission_on_sales_pct: payload.commission_on_sales_pct,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to assign: ${error.message}`);

  // Actualizar request
  await supabase
    .from("live_hosting_requests")
    .update({
      status: "pending_payment",
      fixed_rate_usd: payload.agreed_rate_usd,
    })
    .eq("id", payload.request_id);

  return {
    success: true,
    host_id: host.id,
    status: "confirmed",
    next_step: "payment",
  };
}

async function calculateOrgMarkup(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    host_rate_usd: number;
    org_markup_rate: number;
  }
) {
  const hostRate = payload.host_rate_usd;
  const markupRate = payload.org_markup_rate;

  const orgMarkupAmount = hostRate * markupRate;
  const clientPrice = hostRate + orgMarkupAmount;

  // Platform fee se calcula sobre el total
  const platformFeeRate = markupRate > 0 ? 0.12 : 0.1;
  const platformFee = clientPrice * platformFeeRate;

  // Neto para la org después de pagar al host y platform fee
  const orgNetProfit = clientPrice - hostRate - platformFee;

  return {
    success: true,
    breakdown: {
      host_rate_usd: hostRate,
      org_markup_rate: markupRate,
      org_markup_amount: orgMarkupAmount,
      client_price_usd: clientPrice,
      platform_fee_rate: platformFeeRate,
      platform_fee_usd: platformFee,
      org_net_profit_usd: orgNetProfit,
    },
  };
}

async function setClientPrice(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    request_id: string;
    client_price_usd: number;
    org_markup_rate: number;
    org_markup_amount: number;
  }
) {
  const { error } = await supabase
    .from("live_hosting_requests")
    .update({
      budget_max_usd: payload.client_price_usd,
      org_markup_rate: payload.org_markup_rate,
      org_markup_amount_usd: payload.org_markup_amount,
    })
    .eq("id", payload.request_id);

  if (error) throw new Error(`Failed to set price: ${error.message}`);

  return {
    success: true,
    request_id: payload.request_id,
    client_price_usd: payload.client_price_usd,
  };
}

// ============================================================================
// FINANCIALS
// ============================================================================

async function createHostingCheckout(
  supabase: SupabaseClient,
  userId: string,
  requestId: string
) {
  const { data: request } = await supabase
    .from("live_hosting_requests")
    .select("*, host:live_hosting_hosts!inner(*)")
    .eq("id", requestId)
    .eq("live_hosting_hosts.status", "confirmed")
    .single();

  if (!request) throw new Error("Request not found or no confirmed host");

  const confirmedHost = Array.isArray(request.host) ? request.host[0] : request.host;
  const totalAmount =
    request.channel === "org_managed"
      ? request.budget_max_usd // Precio al cliente con markup
      : request.fixed_rate_usd || confirmedHost.agreed_rate_usd;

  if (!totalAmount) throw new Error("No price set for this request");

  // Determinar distribuciones
  const distributions = [];

  if (request.channel === "org_managed") {
    // Org managed: host recibe su tarifa, org recibe markup
    distributions.push({
      user_id: confirmedHost.user_id,
      role: "creator",
      percentage: confirmedHost.agreed_rate_usd / totalAmount,
    });
    // El resto va a la org (markup - platform fee se maneja en escrow)
  } else {
    // Direct/Marketplace: host recibe todo (menos platform fee)
    distributions.push({
      user_id: confirmedHost.user_id,
      role: "creator",
      percentage: 1.0,
    });
  }

  // Crear escrow via escrow-service
  const { data: escrow, error: escrowError } = await supabase
    .from("escrow_holds")
    .insert({
      project_type: "live_shopping",
      project_id: requestId,
      project_title: request.title,
      client_id: userId,
      total_amount: totalAmount,
      currency: "USD",
      platform_fee_rate: request.platform_commission_rate,
      distributions: distributions.map((d) => ({
        ...d,
        amount: totalAmount * (1 - request.platform_commission_rate) * d.percentage,
        released: false,
        released_at: null,
      })),
      status: "created",
    })
    .select()
    .single();

  if (escrowError) throw new Error(`Failed to create escrow: ${escrowError.message}`);

  // Asociar escrow con request
  await supabase
    .from("live_hosting_requests")
    .update({ escrow_hold_id: escrow.id })
    .eq("id", requestId);

  // Crear Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalAmount * 100),
    currency: "usd",
    metadata: {
      type: "live_hosting",
      escrow_id: escrow.id,
      request_id: requestId,
      user_id: userId,
    },
    description: `Live Hosting: ${request.title}`,
    capture_method: "automatic",
  });

  await supabase
    .from("escrow_holds")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      stripe_payment_status: "pending",
    })
    .eq("id", escrow.id);

  return {
    success: true,
    escrow_id: escrow.id,
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id,
    amount: totalAmount,
    currency: "USD",
  };
}

async function confirmPayment(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  escrowId: string
) {
  // Actualizar escrow a funded
  await supabase
    .from("escrow_holds")
    .update({ status: "funded", stripe_payment_status: "succeeded" })
    .eq("id", escrowId);

  // El trigger en la BD creará la sesión de streaming automáticamente
  // y actualizará el status del request a "confirmed"

  return {
    success: true,
    request_id: requestId,
    escrow_id: escrowId,
    message: "Payment confirmed, streaming session will be created",
  };
}

// ============================================================================
// POST-LIVE
// ============================================================================

async function startLive(supabase: SupabaseClient, userId: string, requestId: string) {
  const { data: request } = await supabase
    .from("live_hosting_requests")
    .select("streaming_session_id")
    .eq("id", requestId)
    .single();

  if (!request?.streaming_session_id) {
    throw new Error("No streaming session found");
  }

  // Actualizar sesión de streaming
  await supabase
    .from("streaming_sessions_v2")
    .update({
      status: "live",
      started_at: new Date().toISOString(),
    })
    .eq("id", request.streaming_session_id);

  // Actualizar request
  await supabase
    .from("live_hosting_requests")
    .update({ status: "in_progress" })
    .eq("id", requestId);

  return { success: true, request_id: requestId, status: "in_progress" };
}

async function endLive(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    request_id: string;
    actual_duration_minutes?: number;
    actual_revenue_usd?: number;
    actual_orders?: number;
  }
) {
  const { data: request } = await supabase
    .from("live_hosting_requests")
    .select("streaming_session_id")
    .eq("id", payload.request_id)
    .single();

  if (!request?.streaming_session_id) {
    throw new Error("No streaming session found");
  }

  // Actualizar sesión de streaming
  await supabase
    .from("streaming_sessions_v2")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      total_revenue_usd: payload.actual_revenue_usd || 0,
      total_orders: payload.actual_orders || 0,
    })
    .eq("id", request.streaming_session_id);

  // Actualizar request con métricas
  await supabase
    .from("live_hosting_requests")
    .update({
      actual_duration_minutes: payload.actual_duration_minutes,
      actual_revenue_usd: payload.actual_revenue_usd,
      actual_orders: payload.actual_orders,
    })
    .eq("id", payload.request_id);

  return {
    success: true,
    request_id: payload.request_id,
    next_step: "review_and_complete",
  };
}

async function submitHostReview(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    request_id: string;
    host_rating: number;
    client_feedback?: string;
  }
) {
  // Actualizar request
  await supabase
    .from("live_hosting_requests")
    .update({ host_rating: payload.host_rating })
    .eq("id", payload.request_id);

  // Actualizar host
  await supabase
    .from("live_hosting_hosts")
    .update({
      actual_performance_score: payload.host_rating,
      client_feedback: payload.client_feedback,
    })
    .eq("request_id", payload.request_id)
    .eq("status", "confirmed");

  return { success: true, request_id: payload.request_id };
}

async function completeHosting(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    request_id: string;
    client_rating?: number;
    host_feedback?: string;
  }
) {
  // Usar la función SQL
  const { data, error } = await supabase.rpc("complete_live_hosting", {
    p_request_id: payload.request_id,
    p_host_rating: null, // Ya se envió en submitHostReview
    p_client_rating: payload.client_rating,
    p_actual_duration: null,
    p_actual_revenue: null,
    p_actual_orders: null,
  });

  if (error) throw new Error(`Failed to complete: ${error.message}`);

  // Actualizar feedback del host
  if (payload.host_feedback) {
    await supabase
      .from("live_hosting_hosts")
      .update({ host_feedback: payload.host_feedback })
      .eq("request_id", payload.request_id)
      .eq("status", "completed");
  }

  // Registrar evento de reputación
  const { data: host } = await supabase
    .from("live_hosting_hosts")
    .select("user_id")
    .eq("request_id", payload.request_id)
    .eq("status", "completed")
    .single();

  if (host) {
    const { data: request } = await supabase
      .from("live_hosting_requests")
      .select("organization_id, actual_revenue_usd, host_rating")
      .eq("id", payload.request_id)
      .single();

    // Evento base de completado
    await supabase.from("reputation_events").insert({
      user_id: host.user_id,
      organization_id: request?.organization_id,
      event_type: "live_completed",
      points: 50,
      source: "live_hosting",
    });

    // Bonus por alto revenue
    if (request?.actual_revenue_usd && request.actual_revenue_usd >= 500) {
      await supabase.from("reputation_events").insert({
        user_id: host.user_id,
        organization_id: request.organization_id,
        event_type: "live_high_revenue",
        points: 100,
        source: "live_hosting",
      });
    }

    // Bonus por excelente rating
    if (request?.host_rating && request.host_rating >= 4.5) {
      await supabase.from("reputation_events").insert({
        user_id: host.user_id,
        organization_id: request.organization_id,
        event_type: "live_excellent_rating",
        points: 30,
        source: "live_hosting",
      });
    }
  }

  return {
    success: true,
    request_id: payload.request_id,
    status: "completed",
    escrow_status: "pending_approval",
  };
}
