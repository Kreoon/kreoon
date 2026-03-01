// ============================================================================
// KREOON MARKETING CAMPAIGNS
// Edge Function para crear, gestionar y sincronizar campanas publicitarias
// Soporta Meta, TikTok y Google Ads con IA para generacion automatica
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ============================================================================
// Types
// ============================================================================

type AdPlatform = "meta" | "tiktok" | "google";

interface AdAccountInfo {
  id: string;
  platform: AdPlatform;
  platform_account_id: string;
  access_token: string;
  account_metadata?: Record<string, unknown>;
}

interface CreateCampaignRequest {
  ad_account_id: string; // marketing_ad_accounts.id
  organization_id: string;
  campaign_name: string;
  objective: string; // CONVERSIONS, TRAFFIC, AWARENESS, ENGAGEMENT, etc.
  daily_budget?: number;
  lifetime_budget?: number;
  currency?: string;
  start_date: string; // ISO date
  end_date?: string;
  targeting?: TargetingConfig;
  creative?: CreativeConfig;
  bid_strategy?: string;
  status?: string; // PAUSED, ACTIVE
  content_id?: string; // Link to Kreoon content
}

interface TargetingConfig {
  age_min?: number;
  age_max?: number;
  genders?: number[]; // 1=male, 2=female, 0=all
  locations?: { key: string; name: string; type: string }[];
  interests?: { id: string; name: string }[];
  custom_audiences?: string[];
  lookalike_audiences?: string[];
  languages?: string[];
  placements?: string[]; // feed, stories, reels, etc.
}

interface CreativeConfig {
  headline: string;
  body: string;
  cta: string; // LEARN_MORE, SHOP_NOW, SIGN_UP, etc.
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  link_url?: string;
  display_url?: string;
}

interface UpdateCampaignRequest {
  marketing_campaign_id: string; // DB id
  campaign_name?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  targeting?: TargetingConfig;
  creative?: CreativeConfig;
  bid_strategy?: string;
  end_date?: string;
}

interface CampaignActionRequest {
  marketing_campaign_id: string;
}

interface SyncRequest {
  marketing_campaign_id?: string;
  ad_account_id?: string; // sync all campaigns for account
}

interface AICreateRequest {
  content_id: string;
  ad_account_id: string;
  organization_id: string;
  objective: string;
  budget_hint?: number; // optional budget guidance
}

interface PromoteContentRequest {
  content_id: string;
  ad_account_id: string;
  organization_id: string;
  platform: AdPlatform;
  daily_budget: number;
  duration_days: number;
  objective?: string;
}

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req: Request) => {
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid or expired token");
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = req.method !== "GET" ? await req.json() : {};

    let result: unknown;

    switch (action) {
      case "create":
        result = await handleCreate(supabase, user.id, body as CreateCampaignRequest);
        break;
      case "update":
        result = await handleUpdate(supabase, user.id, body as UpdateCampaignRequest);
        break;
      case "pause":
        result = await handlePause(supabase, user.id, body as CampaignActionRequest);
        break;
      case "resume":
        result = await handleResume(supabase, user.id, body as CampaignActionRequest);
        break;
      case "delete":
        result = await handleDelete(supabase, user.id, body as CampaignActionRequest);
        break;
      case "sync":
        result = await handleSync(supabase, user.id, body as SyncRequest);
        break;
      case "ai-create":
        result = await handleAICreate(supabase, user.id, body as AICreateRequest);
        break;
      case "promote-content":
        result = await handlePromoteContent(supabase, user.id, body as PromoteContentRequest);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("marketing-campaigns error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// Helpers: fetch ad account with credentials
// ============================================================================

async function getAdAccount(
  supabase: ReturnType<typeof createClient>,
  accountId: string
): Promise<AdAccountInfo> {
  const { data, error } = await supabase
    .from("marketing_ad_accounts")
    .select("id, platform, platform_account_id, access_token, account_metadata")
    .eq("id", accountId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    throw new Error("Ad account not found or disconnected");
  }

  return data as AdAccountInfo;
}

async function getCampaignWithAccount(
  supabase: ReturnType<typeof createClient>,
  campaignId: string
): Promise<{
  campaign: Record<string, unknown>;
  account: AdAccountInfo;
}> {
  const { data: campaign, error } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) {
    throw new Error("Marketing campaign not found");
  }

  const account = await getAdAccount(
    supabase,
    campaign.ad_account_id as string
  );

  return { campaign, account };
}

// ============================================================================
// CREATE - Create campaign on ad platform + DB
// ============================================================================

async function handleCreate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: CreateCampaignRequest
): Promise<unknown> {
  const account = await getAdAccount(supabase, body.ad_account_id);

  let platformCampaignId: string;
  let platformAdSetId: string | null = null;
  let platformAdId: string | null = null;
  let platformResponse: Record<string, unknown> = {};

  // Create campaign on the ad platform
  switch (account.platform) {
    case "meta":
      ({ campaignId: platformCampaignId, adSetId: platformAdSetId, adId: platformAdId, response: platformResponse } =
        await createMetaCampaign(account, body));
      break;
    case "tiktok":
      ({ campaignId: platformCampaignId, adGroupId: platformAdSetId, adId: platformAdId, response: platformResponse } =
        await createTikTokCampaign(account, body));
      break;
    case "google":
      ({ campaignId: platformCampaignId, adGroupId: platformAdSetId, adId: platformAdId, response: platformResponse } =
        await createGoogleCampaign(account, body));
      break;
    default:
      throw new Error(`Unsupported platform: ${account.platform}`);
  }

  // Store in DB
  const { data: dbCampaign, error: dbErr } = await supabase
    .from("marketing_campaigns")
    .insert({
      organization_id: body.organization_id,
      ad_account_id: body.ad_account_id,
      user_id: userId,
      platform: account.platform,
      platform_campaign_id: platformCampaignId,
      platform_adset_id: platformAdSetId,
      platform_ad_id: platformAdId,
      campaign_name: body.campaign_name,
      objective: body.objective,
      daily_budget: body.daily_budget,
      lifetime_budget: body.lifetime_budget,
      currency: body.currency || "USD",
      start_date: body.start_date,
      end_date: body.end_date,
      targeting: body.targeting || {},
      creative: body.creative || {},
      bid_strategy: body.bid_strategy,
      status: body.status || "PAUSED",
      content_id: body.content_id,
      platform_response: platformResponse,
    })
    .select()
    .single();

  if (dbErr) {
    console.error("Failed to save campaign to DB:", dbErr.message);
    throw new Error(`Campaign created on ${account.platform} but failed to save: ${dbErr.message}`);
  }

  return {
    success: true,
    campaign: dbCampaign,
    platform_campaign_id: platformCampaignId,
    platform_adset_id: platformAdSetId,
    platform_ad_id: platformAdId,
  };
}

// ============================================================================
// UPDATE - Update campaign on ad platform + DB
// ============================================================================

async function handleUpdate(
  supabase: ReturnType<typeof createClient>,
  _userId: string,
  body: UpdateCampaignRequest
): Promise<unknown> {
  const { campaign, account } = await getCampaignWithAccount(
    supabase,
    body.marketing_campaign_id
  );

  // Update on platform
  switch (account.platform) {
    case "meta":
      await updateMetaCampaign(account, campaign, body);
      break;
    case "tiktok":
      await updateTikTokCampaign(account, campaign, body);
      break;
    case "google":
      await updateGoogleCampaign(account, campaign, body);
      break;
  }

  // Update in DB
  const updateFields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.campaign_name) updateFields.campaign_name = body.campaign_name;
  if (body.daily_budget !== undefined) updateFields.daily_budget = body.daily_budget;
  if (body.lifetime_budget !== undefined) updateFields.lifetime_budget = body.lifetime_budget;
  if (body.targeting) updateFields.targeting = body.targeting;
  if (body.creative) updateFields.creative = body.creative;
  if (body.bid_strategy) updateFields.bid_strategy = body.bid_strategy;
  if (body.end_date) updateFields.end_date = body.end_date;

  const { data, error } = await supabase
    .from("marketing_campaigns")
    .update(updateFields)
    .eq("id", body.marketing_campaign_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update campaign in DB: ${error.message}`);
  }

  return { success: true, campaign: data };
}

// ============================================================================
// PAUSE - Pause campaign on platform
// ============================================================================

async function handlePause(
  supabase: ReturnType<typeof createClient>,
  _userId: string,
  body: CampaignActionRequest
): Promise<unknown> {
  const { campaign, account } = await getCampaignWithAccount(
    supabase,
    body.marketing_campaign_id
  );

  switch (account.platform) {
    case "meta":
      await setMetaCampaignStatus(
        account,
        campaign.platform_campaign_id as string,
        "PAUSED"
      );
      break;
    case "tiktok":
      await setTikTokCampaignStatus(
        account,
        campaign.platform_campaign_id as string,
        "DISABLE"
      );
      break;
    case "google":
      await setGoogleCampaignStatus(
        account,
        campaign.platform_campaign_id as string,
        "PAUSED"
      );
      break;
  }

  await supabase
    .from("marketing_campaigns")
    .update({ status: "PAUSED", updated_at: new Date().toISOString() })
    .eq("id", body.marketing_campaign_id);

  return { success: true, status: "PAUSED" };
}

// ============================================================================
// RESUME - Resume campaign on platform
// ============================================================================

async function handleResume(
  supabase: ReturnType<typeof createClient>,
  _userId: string,
  body: CampaignActionRequest
): Promise<unknown> {
  const { campaign, account } = await getCampaignWithAccount(
    supabase,
    body.marketing_campaign_id
  );

  switch (account.platform) {
    case "meta":
      await setMetaCampaignStatus(
        account,
        campaign.platform_campaign_id as string,
        "ACTIVE"
      );
      break;
    case "tiktok":
      await setTikTokCampaignStatus(
        account,
        campaign.platform_campaign_id as string,
        "ENABLE"
      );
      break;
    case "google":
      await setGoogleCampaignStatus(
        account,
        campaign.platform_campaign_id as string,
        "ENABLED"
      );
      break;
  }

  await supabase
    .from("marketing_campaigns")
    .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
    .eq("id", body.marketing_campaign_id);

  return { success: true, status: "ACTIVE" };
}

// ============================================================================
// DELETE - Archive/delete campaign
// ============================================================================

async function handleDelete(
  supabase: ReturnType<typeof createClient>,
  _userId: string,
  body: CampaignActionRequest
): Promise<unknown> {
  const { campaign, account } = await getCampaignWithAccount(
    supabase,
    body.marketing_campaign_id
  );

  // Most platforms only support archiving, not hard deleting
  try {
    switch (account.platform) {
      case "meta":
        await setMetaCampaignStatus(
          account,
          campaign.platform_campaign_id as string,
          "ARCHIVED"
        );
        break;
      case "tiktok":
        await setTikTokCampaignStatus(
          account,
          campaign.platform_campaign_id as string,
          "DELETE"
        );
        break;
      case "google":
        await setGoogleCampaignStatus(
          account,
          campaign.platform_campaign_id as string,
          "REMOVED"
        );
        break;
    }
  } catch (err) {
    console.warn("Platform delete/archive failed (continuing with DB):", err);
  }

  // Soft delete in DB
  await supabase
    .from("marketing_campaigns")
    .update({
      status: "ARCHIVED",
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.marketing_campaign_id);

  return { success: true, status: "ARCHIVED" };
}

// ============================================================================
// SYNC - Sync campaign status and metrics from platform
// ============================================================================

async function handleSync(
  supabase: ReturnType<typeof createClient>,
  _userId: string,
  body: SyncRequest
): Promise<unknown> {
  const campaignsToSync: Record<string, unknown>[] = [];

  if (body.marketing_campaign_id) {
    const { data, error } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("id", body.marketing_campaign_id)
      .single();
    if (error || !data) throw new Error("Campaign not found");
    campaignsToSync.push(data);
  } else if (body.ad_account_id) {
    const { data, error } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("ad_account_id", body.ad_account_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`Failed to fetch campaigns: ${error.message}`);
    campaignsToSync.push(...(data || []));
  } else {
    throw new Error("marketing_campaign_id or ad_account_id is required");
  }

  const results: { id: string; synced: boolean; error?: string }[] = [];

  for (const campaign of campaignsToSync) {
    try {
      const account = await getAdAccount(
        supabase,
        campaign.ad_account_id as string
      );
      let metrics: Record<string, unknown> = {};
      let platformStatus = "";

      switch (account.platform) {
        case "meta":
          ({ metrics, status: platformStatus } = await syncMetaCampaign(
            account,
            campaign.platform_campaign_id as string
          ));
          break;
        case "tiktok":
          ({ metrics, status: platformStatus } = await syncTikTokCampaign(
            account,
            campaign.platform_campaign_id as string
          ));
          break;
        case "google":
          ({ metrics, status: platformStatus } = await syncGoogleCampaign(
            account,
            campaign.platform_campaign_id as string
          ));
          break;
      }

      await supabase
        .from("marketing_campaigns")
        .update({
          status: platformStatus || campaign.status,
          metrics,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      results.push({ id: campaign.id as string, synced: true });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Sync failed for campaign ${campaign.id}:`, errMsg);
      results.push({
        id: campaign.id as string,
        synced: false,
        error: errMsg,
      });
    }
  }

  return {
    success: true,
    synced_count: results.filter((r) => r.synced).length,
    total: results.length,
    results,
  };
}

// ============================================================================
// AI-CREATE - AI-powered campaign generation
// ============================================================================

async function handleAICreate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: AICreateRequest
): Promise<unknown> {
  const { content_id, ad_account_id, organization_id, objective, budget_hint } = body;

  if (!content_id || !ad_account_id || !organization_id) {
    throw new Error("content_id, ad_account_id, and organization_id are required");
  }

  const account = await getAdAccount(supabase, ad_account_id);

  // 1. Fetch the content from DB
  const { data: content, error: contentErr } = await supabase
    .from("content")
    .select("id, title, description, video_url, thumbnail_url, bunny_video_id, status, client_id, organization_id")
    .eq("id", content_id)
    .single();

  if (contentErr || !content) {
    throw new Error("Content not found");
  }

  // 2. Fetch the client/brand DNA
  let clientDna: Record<string, unknown> | null = null;
  if (content.client_id) {
    const { data: dna } = await supabase
      .from("client_dna")
      .select("*")
      .eq("client_id", content.client_id)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    clientDna = dna;
  }

  // 3. Build the AI prompt
  const dnaContext = clientDna
    ? `
Brand DNA Information:
- Business: ${(clientDna.dna_data as Record<string, unknown>)?.business_identity || "N/A"}
- Target audience: ${(clientDna.dna_data as Record<string, unknown>)?.ideal_customer || "N/A"}
- Value proposition: ${(clientDna.dna_data as Record<string, unknown>)?.value_proposition || "N/A"}
- Marketing strategy: ${(clientDna.dna_data as Record<string, unknown>)?.marketing_strategy || "N/A"}
- Flagship offer: ${(clientDna.dna_data as Record<string, unknown>)?.flagship_offer || "N/A"}
- Ads targeting notes: ${(clientDna.dna_data as Record<string, unknown>)?.ads_targeting || "N/A"}
`
    : "No brand DNA available - use general best practices.";

  const prompt = `You are an expert digital advertising strategist. Generate a complete ad campaign configuration for the ${account.platform.toUpperCase()} platform.

Content to promote:
- Title: ${content.title || "Untitled"}
- Description: ${content.description || "No description"}
- Has video: ${content.video_url ? "Yes" : "No"}
- Has thumbnail: ${content.thumbnail_url ? "Yes" : "No"}

${dnaContext}

Campaign objective: ${objective}
Platform: ${account.platform}
${budget_hint ? `Budget guidance: $${budget_hint}/day` : "Suggest an appropriate budget."}

Respond in JSON format with the following structure:
{
  "campaign_name": "suggested campaign name",
  "targeting": {
    "age_min": 18,
    "age_max": 65,
    "genders": [0],
    "locations": [{"key": "US", "name": "United States", "type": "country"}],
    "interests": [{"id": "example_id", "name": "interest name"}],
    "languages": ["en"],
    "placements": ["feed", "stories"]
  },
  "creative": {
    "headline": "ad headline (max 40 chars)",
    "body": "ad body text (max 125 chars)",
    "cta": "LEARN_MORE or SHOP_NOW or SIGN_UP",
    "link_url": "suggested landing page URL or leave empty"
  },
  "daily_budget": 20,
  "bid_strategy": "LOWEST_COST or COST_CAP",
  "duration_days": 14,
  "rationale": "brief explanation of the strategy"
}

Only return valid JSON, no markdown code blocks.`;

  // 4. Call the multi-ai edge function
  const aiResp = await fetch(`${supabaseUrl}/functions/v1/multi-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a digital advertising expert. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      model: "gemini-2.5-flash",
      response_format: "json",
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    throw new Error(`AI generation failed: ${errText}`);
  }

  const aiData = await aiResp.json();
  const aiContent = aiData.content || aiData.text || "";

  // Parse AI response
  let campaignConfig: Record<string, unknown>;
  try {
    // Strip markdown code fences if present
    const cleaned = aiContent
      .replace(/^```json?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();
    campaignConfig = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse AI campaign config. Raw response: ${aiContent.substring(0, 500)}`
    );
  }

  return {
    success: true,
    ai_generated: true,
    platform: account.platform,
    content: {
      id: content.id,
      title: content.title,
      video_url: content.video_url,
      thumbnail_url: content.thumbnail_url,
    },
    campaign_config: campaignConfig,
    // Pre-fill for the create endpoint
    ready_to_submit: {
      ad_account_id,
      organization_id,
      campaign_name: campaignConfig.campaign_name,
      objective,
      daily_budget: campaignConfig.daily_budget,
      start_date: new Date().toISOString().split("T")[0],
      end_date: campaignConfig.duration_days
        ? new Date(
            Date.now() +
              (campaignConfig.duration_days as number) * 86400000
          )
            .toISOString()
            .split("T")[0]
        : undefined,
      targeting: campaignConfig.targeting,
      creative: campaignConfig.creative,
      bid_strategy: campaignConfig.bid_strategy,
      content_id,
      status: "PAUSED",
    },
  };
}

// ============================================================================
// PROMOTE-CONTENT - Quick campaign from content
// ============================================================================

async function handlePromoteContent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: PromoteContentRequest
): Promise<unknown> {
  const {
    content_id,
    ad_account_id,
    organization_id,
    platform,
    daily_budget,
    duration_days,
    objective = "CONVERSIONS",
  } = body;

  if (!content_id || !ad_account_id || !daily_budget || !duration_days) {
    throw new Error(
      "content_id, ad_account_id, daily_budget, and duration_days are required"
    );
  }

  const account = await getAdAccount(supabase, ad_account_id);

  if (account.platform !== platform) {
    throw new Error(
      `Account platform (${account.platform}) does not match requested platform (${platform})`
    );
  }

  // 1. Fetch content details
  const { data: content, error: contentErr } = await supabase
    .from("content")
    .select("id, title, description, video_url, thumbnail_url, bunny_video_id, client_id")
    .eq("id", content_id)
    .single();

  if (contentErr || !content) {
    throw new Error("Content not found");
  }

  // 2. Fetch client DNA for targeting hints
  const dnaTargeting: TargetingConfig = {
    age_min: 18,
    age_max: 65,
    genders: [0],
    placements: ["feed", "stories", "reels"],
  };

  if (content.client_id) {
    const { data: dna } = await supabase
      .from("client_dna")
      .select("dna_data")
      .eq("client_id", content.client_id)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dna?.dna_data) {
      const dnaData = dna.dna_data as Record<string, unknown>;
      const adsTargeting = dnaData.ads_targeting as Record<string, unknown> | undefined;
      if (adsTargeting) {
        if (adsTargeting.age_min) dnaTargeting.age_min = adsTargeting.age_min as number;
        if (adsTargeting.age_max) dnaTargeting.age_max = adsTargeting.age_max as number;
        if (adsTargeting.genders) dnaTargeting.genders = adsTargeting.genders as number[];
        if (adsTargeting.locations) dnaTargeting.locations = adsTargeting.locations as TargetingConfig["locations"];
        if (adsTargeting.interests) dnaTargeting.interests = adsTargeting.interests as TargetingConfig["interests"];
      }
    }
  }

  // 3. Auto-generate creative from content
  const creative: CreativeConfig = {
    headline: truncate(content.title || "Check this out", 40),
    body: truncate(
      content.description || "Discover our latest content",
      125
    ),
    cta: objective === "TRAFFIC" ? "LEARN_MORE" : "SHOP_NOW",
    video_url: content.video_url || undefined,
    thumbnail_url: content.thumbnail_url || undefined,
  };

  // 4. Build campaign name
  const now = new Date();
  const campaignName = `Promote: ${truncate(content.title || "Content", 30)} - ${now.toISOString().slice(0, 10)}`;

  const startDate = now.toISOString().split("T")[0];
  const endDate = new Date(now.getTime() + duration_days * 86400000)
    .toISOString()
    .split("T")[0];

  // 5. Create the full campaign via our own create handler
  const createRequest: CreateCampaignRequest = {
    ad_account_id,
    organization_id,
    campaign_name: campaignName,
    objective,
    daily_budget,
    currency: (account.account_metadata?.currency as string) || "USD",
    start_date: startDate,
    end_date: endDate,
    targeting: dnaTargeting,
    creative,
    bid_strategy: "LOWEST_COST",
    status: "ACTIVE",
    content_id,
  };

  const result = await handleCreate(supabase, userId, createRequest);

  return {
    ...(result as Record<string, unknown>),
    promote: true,
    content_title: content.title,
    budget_total: daily_budget * duration_days,
    duration_days,
  };
}

// ============================================================================
// META ADS API - Campaign CRUD
// ============================================================================

async function createMetaCampaign(
  account: AdAccountInfo,
  body: CreateCampaignRequest
): Promise<{
  campaignId: string;
  adSetId: string | null;
  adId: string | null;
  response: Record<string, unknown>;
}> {
  const actId = `act_${account.platform_account_id}`;

  // Step 1: Create Campaign
  const campaignResp = await fetch(
    `https://graph.facebook.com/v21.0/${actId}/campaigns`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: body.campaign_name,
        objective: mapMetaObjective(body.objective),
        status: body.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
        special_ad_categories: [],
        access_token: account.access_token,
      }),
    }
  );
  const campaignData = await campaignResp.json();
  if (campaignData.error) {
    throw new Error(`Meta campaign creation failed: ${campaignData.error.message}`);
  }
  const campaignId = campaignData.id;

  let adSetId: string | null = null;
  let adId: string | null = null;

  // Step 2: Create Ad Set (if targeting provided)
  if (body.targeting || body.daily_budget) {
    const adSetBody: Record<string, unknown> = {
      name: `${body.campaign_name} - Ad Set`,
      campaign_id: campaignId,
      billing_event: "IMPRESSIONS",
      optimization_goal: mapMetaOptimizationGoal(body.objective),
      status: body.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
      access_token: account.access_token,
    };

    if (body.daily_budget) {
      adSetBody.daily_budget = Math.round(body.daily_budget * 100); // cents
    }
    if (body.lifetime_budget) {
      adSetBody.lifetime_budget = Math.round(body.lifetime_budget * 100);
      adSetBody.end_time = body.end_date;
    }
    if (body.start_date) {
      adSetBody.start_time = body.start_date;
    }

    // Build targeting spec
    const targeting: Record<string, unknown> = {};
    if (body.targeting) {
      if (body.targeting.age_min) targeting.age_min = body.targeting.age_min;
      if (body.targeting.age_max) targeting.age_max = body.targeting.age_max;
      if (body.targeting.genders && body.targeting.genders[0] !== 0) {
        targeting.genders = body.targeting.genders;
      }
      if (body.targeting.locations) {
        targeting.geo_locations = {
          countries: body.targeting.locations
            .filter((l) => l.type === "country")
            .map((l) => l.key),
          cities: body.targeting.locations
            .filter((l) => l.type === "city")
            .map((l) => ({ key: l.key })),
        };
      }
      if (body.targeting.interests) {
        targeting.flexible_spec = [
          { interests: body.targeting.interests },
        ];
      }
      if (body.targeting.languages) {
        targeting.locales = body.targeting.languages;
      }
    }
    if (Object.keys(targeting).length === 0) {
      // Minimum targeting required
      targeting.geo_locations = { countries: ["US"] };
    }
    adSetBody.targeting = targeting;

    if (body.targeting?.placements) {
      adSetBody.publisher_platforms = mapMetaPlacements(
        body.targeting.placements
      );
    }

    if (body.bid_strategy) {
      adSetBody.bid_strategy = body.bid_strategy;
    }

    const adSetResp = await fetch(
      `https://graph.facebook.com/v21.0/${actId}/adsets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adSetBody),
      }
    );
    const adSetData = await adSetResp.json();
    if (adSetData.error) {
      console.error("Meta ad set creation failed:", adSetData.error.message);
    } else {
      adSetId = adSetData.id;
    }

    // Step 3: Create Ad (if creative provided and ad set succeeded)
    if (adSetId && body.creative) {
      const adCreative: Record<string, unknown> = {
        name: `${body.campaign_name} - Creative`,
        object_story_spec: {
          page_id:
            (account.account_metadata?.page_id as string) || undefined,
          link_data: {
            message: body.creative.body,
            link: body.creative.link_url || "https://kreoon.com",
            name: body.creative.headline,
            call_to_action: {
              type: body.creative.cta || "LEARN_MORE",
            },
          },
        },
        access_token: account.access_token,
      };

      if (body.creative.image_url) {
        (adCreative.object_story_spec as Record<string, unknown>).link_data = {
          ...(adCreative.object_story_spec as Record<string, Record<string, unknown>>).link_data,
          image_url: body.creative.image_url,
        };
      }
      if (body.creative.video_url) {
        (adCreative.object_story_spec as Record<string, unknown>).video_data = {
          video_url: body.creative.video_url,
          title: body.creative.headline,
          message: body.creative.body,
          call_to_action: {
            type: body.creative.cta || "LEARN_MORE",
            value: { link: body.creative.link_url || "https://kreoon.com" },
          },
          image_url: body.creative.thumbnail_url,
        };
      }

      // Create ad creative first
      const creativeResp = await fetch(
        `https://graph.facebook.com/v21.0/${actId}/adcreatives`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(adCreative),
        }
      );
      const creativeData = await creativeResp.json();

      if (creativeData.id) {
        // Create the ad linking creative + adset
        const adResp = await fetch(
          `https://graph.facebook.com/v21.0/${actId}/ads`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `${body.campaign_name} - Ad`,
              adset_id: adSetId,
              creative: { creative_id: creativeData.id },
              status: body.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
              access_token: account.access_token,
            }),
          }
        );
        const adData = await adResp.json();
        if (!adData.error) {
          adId = adData.id;
        } else {
          console.error("Meta ad creation failed:", adData.error.message);
        }
      }
    }
  }

  return {
    campaignId,
    adSetId,
    adId,
    response: campaignData,
  };
}

async function updateMetaCampaign(
  account: AdAccountInfo,
  campaign: Record<string, unknown>,
  body: UpdateCampaignRequest
): Promise<void> {
  const updates: Record<string, unknown> = {
    access_token: account.access_token,
  };
  if (body.campaign_name) updates.name = body.campaign_name;

  if (Object.keys(updates).length > 1) {
    const resp = await fetch(
      `https://graph.facebook.com/v21.0/${campaign.platform_campaign_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }
    );
    const data = await resp.json();
    if (data.error) {
      throw new Error(`Meta campaign update failed: ${data.error.message}`);
    }
  }

  // Update ad set if budget/targeting changed
  if (campaign.platform_adset_id && (body.daily_budget !== undefined || body.targeting)) {
    const adSetUpdates: Record<string, unknown> = {
      access_token: account.access_token,
    };
    if (body.daily_budget !== undefined) {
      adSetUpdates.daily_budget = Math.round(body.daily_budget * 100);
    }
    if (body.targeting) {
      const targeting: Record<string, unknown> = {};
      if (body.targeting.age_min) targeting.age_min = body.targeting.age_min;
      if (body.targeting.age_max) targeting.age_max = body.targeting.age_max;
      if (body.targeting.locations) {
        targeting.geo_locations = {
          countries: body.targeting.locations
            .filter((l) => l.type === "country")
            .map((l) => l.key),
        };
      }
      adSetUpdates.targeting = targeting;
    }

    await fetch(
      `https://graph.facebook.com/v21.0/${campaign.platform_adset_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adSetUpdates),
      }
    );
  }
}

async function setMetaCampaignStatus(
  account: AdAccountInfo,
  campaignId: string,
  status: string
): Promise<void> {
  const resp = await fetch(
    `https://graph.facebook.com/v21.0/${campaignId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        access_token: account.access_token,
      }),
    }
  );
  const data = await resp.json();
  if (data.error) {
    throw new Error(`Meta status update failed: ${data.error.message}`);
  }
}

async function syncMetaCampaign(
  account: AdAccountInfo,
  campaignId: string
): Promise<{ metrics: Record<string, unknown>; status: string }> {
  // Fetch campaign status
  const statusResp = await fetch(
    `https://graph.facebook.com/v21.0/${campaignId}?fields=status,effective_status,name&access_token=${account.access_token}`
  );
  const statusData = await statusResp.json();

  // Fetch insights (last 30 days)
  const insightsResp = await fetch(
    `https://graph.facebook.com/v21.0/${campaignId}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,conversions,cost_per_action_type&date_preset=last_30d&access_token=${account.access_token}`
  );
  const insightsData = await insightsResp.json();

  const insights = insightsData.data?.[0] || {};

  return {
    metrics: {
      impressions: parseInt(insights.impressions || "0"),
      clicks: parseInt(insights.clicks || "0"),
      spend: parseFloat(insights.spend || "0"),
      cpc: parseFloat(insights.cpc || "0"),
      cpm: parseFloat(insights.cpm || "0"),
      ctr: parseFloat(insights.ctr || "0"),
      reach: parseInt(insights.reach || "0"),
      frequency: parseFloat(insights.frequency || "0"),
      actions: insights.actions || [],
      conversions: insights.conversions || [],
      cost_per_action: insights.cost_per_action_type || [],
      synced_at: new Date().toISOString(),
    },
    status: statusData.effective_status || statusData.status || "UNKNOWN",
  };
}

function mapMetaObjective(objective: string): string {
  const map: Record<string, string> = {
    AWARENESS: "OUTCOME_AWARENESS",
    TRAFFIC: "OUTCOME_TRAFFIC",
    ENGAGEMENT: "OUTCOME_ENGAGEMENT",
    LEADS: "OUTCOME_LEADS",
    CONVERSIONS: "OUTCOME_SALES",
    SALES: "OUTCOME_SALES",
    APP_PROMOTION: "OUTCOME_APP_PROMOTION",
  };
  return map[objective.toUpperCase()] || "OUTCOME_TRAFFIC";
}

function mapMetaOptimizationGoal(objective: string): string {
  const map: Record<string, string> = {
    AWARENESS: "REACH",
    TRAFFIC: "LINK_CLICKS",
    ENGAGEMENT: "POST_ENGAGEMENT",
    LEADS: "LEAD_GENERATION",
    CONVERSIONS: "OFFSITE_CONVERSIONS",
    SALES: "OFFSITE_CONVERSIONS",
  };
  return map[objective.toUpperCase()] || "LINK_CLICKS";
}

function mapMetaPlacements(placements: string[]): string[] {
  const platformMap: Record<string, string> = {
    feed: "facebook",
    stories: "facebook",
    reels: "facebook",
    instagram_feed: "instagram",
    instagram_stories: "instagram",
    instagram_reels: "instagram",
    audience_network: "audience_network",
    messenger: "messenger",
  };
  const platforms = new Set(
    placements.map((p) => platformMap[p] || "facebook")
  );
  return [...platforms];
}

// ============================================================================
// TIKTOK ADS API - Campaign CRUD
// ============================================================================

async function createTikTokCampaign(
  account: AdAccountInfo,
  body: CreateCampaignRequest
): Promise<{
  campaignId: string;
  adGroupId: string | null;
  adId: string | null;
  response: Record<string, unknown>;
}> {
  const advertiserId = account.platform_account_id;

  // Step 1: Create Campaign
  const campaignResp = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/campaign/create/",
    {
      method: "POST",
      headers: {
        "Access-Token": account.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        advertiser_id: advertiserId,
        campaign_name: body.campaign_name,
        objective_type: mapTikTokObjective(body.objective),
        budget_mode: body.daily_budget ? "BUDGET_MODE_DAY" : body.lifetime_budget ? "BUDGET_MODE_TOTAL" : "BUDGET_MODE_INFINITE",
        budget: body.daily_budget || body.lifetime_budget || 0,
        operation_status: body.status === "ACTIVE" ? "ENABLE" : "DISABLE",
      }),
    }
  );
  const campaignData = await campaignResp.json();
  if (campaignData.code !== 0) {
    throw new Error(
      `TikTok campaign creation failed: ${campaignData.message || JSON.stringify(campaignData)}`
    );
  }
  const campaignId = campaignData.data.campaign_id;

  let adGroupId: string | null = null;
  let adId: string | null = null;

  // Step 2: Create Ad Group
  if (body.targeting || body.daily_budget) {
    const adGroupBody: Record<string, unknown> = {
      advertiser_id: advertiserId,
      campaign_id: campaignId,
      adgroup_name: `${body.campaign_name} - Ad Group`,
      placement_type: "PLACEMENT_TYPE_AUTOMATIC",
      budget_mode: body.daily_budget ? "BUDGET_MODE_DAY" : "BUDGET_MODE_TOTAL",
      budget: body.daily_budget || body.lifetime_budget || 50,
      schedule_type: "SCHEDULE_START_END",
      schedule_start_time: formatTikTokDate(body.start_date),
      optimization_goal: mapTikTokOptimizationGoal(body.objective),
      billing_event: "CPC",
      bid_type: "BID_TYPE_NO_BID",
      operation_status: body.status === "ACTIVE" ? "ENABLE" : "DISABLE",
    };

    if (body.end_date) {
      adGroupBody.schedule_end_time = formatTikTokDate(body.end_date);
    }

    // Targeting
    if (body.targeting) {
      if (body.targeting.age_min || body.targeting.age_max) {
        adGroupBody.age_groups = mapTikTokAgeGroups(
          body.targeting.age_min || 18,
          body.targeting.age_max || 65
        );
      }
      if (body.targeting.genders && body.targeting.genders[0] !== 0) {
        adGroupBody.gender = body.targeting.genders[0] === 1 ? "GENDER_MALE" : "GENDER_FEMALE";
      }
      if (body.targeting.locations) {
        adGroupBody.location_ids = body.targeting.locations.map(
          (l) => l.key
        );
      }
      if (body.targeting.languages) {
        adGroupBody.languages = body.targeting.languages;
      }
      if (body.targeting.interests) {
        adGroupBody.interest_category_ids = body.targeting.interests.map(
          (i) => i.id
        );
      }
    }

    const adGroupResp = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/adgroup/create/",
      {
        method: "POST",
        headers: {
          "Access-Token": account.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adGroupBody),
      }
    );
    const adGroupData = await adGroupResp.json();
    if (adGroupData.code === 0) {
      adGroupId = adGroupData.data.adgroup_id;
    } else {
      console.error("TikTok ad group creation failed:", adGroupData.message);
    }

    // Step 3: Create Ad
    if (adGroupId && body.creative) {
      const adBody: Record<string, unknown> = {
        advertiser_id: advertiserId,
        adgroup_id: adGroupId,
        creatives: [
          {
            ad_name: `${body.campaign_name} - Ad`,
            ad_text: body.creative.body,
            ad_format: body.creative.video_url ? "SINGLE_VIDEO" : "SINGLE_IMAGE",
            landing_page_url: body.creative.link_url || "https://kreoon.com",
            call_to_action: body.creative.cta || "LEARN_MORE",
            display_name: body.creative.headline,
            ...(body.creative.video_url && {
              video_url: body.creative.video_url,
            }),
            ...(body.creative.image_url && {
              image_url: body.creative.image_url,
            }),
          },
        ],
      };

      const adResp = await fetch(
        "https://business-api.tiktok.com/open_api/v1.3/ad/create/",
        {
          method: "POST",
          headers: {
            "Access-Token": account.access_token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(adBody),
        }
      );
      const adData = await adResp.json();
      if (adData.code === 0 && adData.data?.ad_ids?.length > 0) {
        adId = adData.data.ad_ids[0];
      } else {
        console.error("TikTok ad creation failed:", adData.message);
      }
    }
  }

  return {
    campaignId,
    adGroupId,
    adId,
    response: campaignData,
  };
}

async function updateTikTokCampaign(
  account: AdAccountInfo,
  campaign: Record<string, unknown>,
  body: UpdateCampaignRequest
): Promise<void> {
  const updates: Record<string, unknown> = {
    advertiser_id: account.platform_account_id,
    campaign_id: campaign.platform_campaign_id,
  };
  if (body.campaign_name) updates.campaign_name = body.campaign_name;
  if (body.daily_budget !== undefined) updates.budget = body.daily_budget;

  const resp = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/campaign/update/",
    {
      method: "POST",
      headers: {
        "Access-Token": account.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );
  const data = await resp.json();
  if (data.code !== 0) {
    throw new Error(`TikTok campaign update failed: ${data.message}`);
  }

  // Update ad group targeting if provided
  if (campaign.platform_adset_id && body.targeting) {
    const adGroupUpdates: Record<string, unknown> = {
      advertiser_id: account.platform_account_id,
      adgroup_id: campaign.platform_adset_id,
    };
    if (body.targeting.age_min || body.targeting.age_max) {
      adGroupUpdates.age_groups = mapTikTokAgeGroups(
        body.targeting.age_min || 18,
        body.targeting.age_max || 65
      );
    }
    if (body.targeting.locations) {
      adGroupUpdates.location_ids = body.targeting.locations.map(
        (l) => l.key
      );
    }

    await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/adgroup/update/",
      {
        method: "POST",
        headers: {
          "Access-Token": account.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adGroupUpdates),
      }
    );
  }
}

async function setTikTokCampaignStatus(
  account: AdAccountInfo,
  campaignId: string,
  status: string
): Promise<void> {
  const resp = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/campaign/status/update/",
    {
      method: "POST",
      headers: {
        "Access-Token": account.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        advertiser_id: account.platform_account_id,
        campaign_ids: [campaignId],
        operation_status: status,
      }),
    }
  );
  const data = await resp.json();
  if (data.code !== 0) {
    throw new Error(`TikTok status update failed: ${data.message}`);
  }
}

async function syncTikTokCampaign(
  account: AdAccountInfo,
  campaignId: string
): Promise<{ metrics: Record<string, unknown>; status: string }> {
  // Fetch campaign info
  const infoResp = await fetch(
    `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${account.platform_account_id}&filtering=${JSON.stringify({ campaign_ids: [campaignId] })}`,
    {
      headers: {
        "Access-Token": account.access_token,
        "Content-Type": "application/json",
      },
    }
  );
  const infoData = await infoResp.json();
  const campaignInfo = infoData.data?.list?.[0] || {};

  // Fetch reporting data
  const reportResp = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/",
    {
      method: "POST",
      headers: {
        "Access-Token": account.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        advertiser_id: account.platform_account_id,
        report_type: "BASIC",
        dimensions: ["campaign_id"],
        data_level: "AUCTION_CAMPAIGN",
        metrics: [
          "spend",
          "impressions",
          "clicks",
          "cpc",
          "cpm",
          "ctr",
          "reach",
          "conversion",
          "cost_per_conversion",
        ],
        filters: [
          {
            field_name: "campaign_id",
            filter_type: "IN",
            filter_value: JSON.stringify([campaignId]),
          },
        ],
        start_date: new Date(Date.now() - 30 * 86400000)
          .toISOString()
          .split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
      }),
    }
  );
  const reportData = await reportResp.json();
  const report = reportData.data?.list?.[0]?.metrics || {};

  return {
    metrics: {
      impressions: parseInt(report.impressions || "0"),
      clicks: parseInt(report.clicks || "0"),
      spend: parseFloat(report.spend || "0"),
      cpc: parseFloat(report.cpc || "0"),
      cpm: parseFloat(report.cpm || "0"),
      ctr: parseFloat(report.ctr || "0"),
      reach: parseInt(report.reach || "0"),
      conversions: parseInt(report.conversion || "0"),
      cost_per_conversion: parseFloat(report.cost_per_conversion || "0"),
      synced_at: new Date().toISOString(),
    },
    status: mapTikTokStatus(campaignInfo.operation_status || campaignInfo.secondary_status || "UNKNOWN"),
  };
}

function mapTikTokObjective(objective: string): string {
  const map: Record<string, string> = {
    AWARENESS: "REACH",
    TRAFFIC: "TRAFFIC",
    ENGAGEMENT: "VIDEO_VIEWS",
    LEADS: "LEAD_GENERATION",
    CONVERSIONS: "CONVERSIONS",
    SALES: "PRODUCT_SALES",
    APP_PROMOTION: "APP_PROMOTION",
  };
  return map[objective.toUpperCase()] || "TRAFFIC";
}

function mapTikTokOptimizationGoal(objective: string): string {
  const map: Record<string, string> = {
    AWARENESS: "REACH",
    TRAFFIC: "CLICK",
    ENGAGEMENT: "VIDEO_VIEW",
    LEADS: "LEAD_GENERATION",
    CONVERSIONS: "CONVERSION",
    SALES: "VALUE",
  };
  return map[objective.toUpperCase()] || "CLICK";
}

function mapTikTokAgeGroups(ageMin: number, ageMax: number): string[] {
  const groups = [
    { id: "AGE_13_17", min: 13, max: 17 },
    { id: "AGE_18_24", min: 18, max: 24 },
    { id: "AGE_25_34", min: 25, max: 34 },
    { id: "AGE_35_44", min: 35, max: 44 },
    { id: "AGE_45_54", min: 45, max: 54 },
    { id: "AGE_55_100", min: 55, max: 100 },
  ];
  return groups
    .filter((g) => g.max >= ageMin && g.min <= ageMax)
    .map((g) => g.id);
}

function mapTikTokStatus(status: string): string {
  const map: Record<string, string> = {
    ENABLE: "ACTIVE",
    DISABLE: "PAUSED",
    DELETE: "ARCHIVED",
    CAMPAIGN_STATUS_ENABLE: "ACTIVE",
    CAMPAIGN_STATUS_DISABLE: "PAUSED",
    CAMPAIGN_STATUS_DELETE: "ARCHIVED",
  };
  return map[status] || status;
}

function formatTikTokDate(dateStr: string): string {
  // TikTok expects "YYYY-MM-DD HH:MM:SS"
  if (dateStr.includes("T")) {
    return dateStr.replace("T", " ").substring(0, 19);
  }
  return `${dateStr} 00:00:00`;
}

// ============================================================================
// GOOGLE ADS API - Campaign CRUD
// ============================================================================

async function createGoogleCampaign(
  account: AdAccountInfo,
  body: CreateCampaignRequest
): Promise<{
  campaignId: string;
  adGroupId: string | null;
  adId: string | null;
  response: Record<string, unknown>;
}> {
  const customerId = account.platform_account_id;
  const headers = {
    Authorization: `Bearer ${account.access_token}`,
    "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
    "login-customer-id": customerId,
    "Content-Type": "application/json",
  };

  // Step 1: Create Campaign Budget
  const budgetResp = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/campaignBudgets:mutate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        operations: [
          {
            create: {
              name: `${body.campaign_name} Budget`,
              amountMicros: String(
                Math.round((body.daily_budget || 50) * 1000000)
              ),
              deliveryMethod: "STANDARD",
            },
          },
        ],
      }),
    }
  );
  const budgetData = await budgetResp.json();
  if (budgetData.error) {
    throw new Error(
      `Google Ads budget creation failed: ${budgetData.error.message || JSON.stringify(budgetData.error)}`
    );
  }
  const budgetResourceName = budgetData.results?.[0]?.resourceName || "";

  // Step 2: Create Campaign
  const campaignResp = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/campaigns:mutate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        operations: [
          {
            create: {
              name: body.campaign_name,
              advertisingChannelType: "SEARCH",
              status: body.status === "ACTIVE" ? "ENABLED" : "PAUSED",
              campaignBudget: budgetResourceName,
              startDate: formatGoogleDate(body.start_date),
              ...(body.end_date && {
                endDate: formatGoogleDate(body.end_date),
              }),
              biddingStrategyType: mapGoogleBidStrategy(body.bid_strategy),
              networkSettings: {
                targetGoogleSearch: true,
                targetSearchNetwork: true,
                targetContentNetwork: false,
              },
            },
          },
        ],
      }),
    }
  );
  const campaignData = await campaignResp.json();
  if (campaignData.error) {
    throw new Error(
      `Google Ads campaign creation failed: ${campaignData.error.message || JSON.stringify(campaignData.error)}`
    );
  }
  const campaignResourceName =
    campaignData.results?.[0]?.resourceName || "";
  const campaignId = campaignResourceName.split("/").pop() || "";

  let adGroupId: string | null = null;
  let adId: string | null = null;

  // Step 3: Create Ad Group
  const adGroupResp = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/adGroups:mutate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        operations: [
          {
            create: {
              name: `${body.campaign_name} - Ad Group`,
              campaign: campaignResourceName,
              status: body.status === "ACTIVE" ? "ENABLED" : "PAUSED",
              type: "SEARCH_STANDARD",
              cpcBidMicros: "1000000", // $1 default
            },
          },
        ],
      }),
    }
  );
  const adGroupData = await adGroupResp.json();
  if (!adGroupData.error && adGroupData.results?.[0]?.resourceName) {
    const adGroupResourceName = adGroupData.results[0].resourceName;
    adGroupId = adGroupResourceName.split("/").pop() || null;

    // Step 4: Create Ad
    if (body.creative) {
      const adResp = await fetch(
        `https://googleads.googleapis.com/v18/customers/${customerId}/adGroupAds:mutate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            operations: [
              {
                create: {
                  adGroup: adGroupResourceName,
                  status: body.status === "ACTIVE" ? "ENABLED" : "PAUSED",
                  ad: {
                    responsiveSearchAd: {
                      headlines: [
                        { text: truncate(body.creative.headline, 30), pinnedField: "HEADLINE_1" },
                        { text: truncate(body.creative.body, 30) },
                        { text: truncate(body.creative.cta || "Learn More", 30) },
                      ],
                      descriptions: [
                        { text: truncate(body.creative.body, 90), pinnedField: "DESCRIPTION_1" },
                        { text: truncate(body.creative.headline + " - " + body.creative.cta, 90) },
                      ],
                      path1: body.creative.display_url
                        ? truncate(body.creative.display_url, 15)
                        : undefined,
                    },
                    finalUrls: [
                      body.creative.link_url || "https://kreoon.com",
                    ],
                  },
                },
              },
            ],
          }),
        }
      );
      const adData = await adResp.json();
      if (!adData.error && adData.results?.[0]?.resourceName) {
        adId = adData.results[0].resourceName.split("/").pop() || null;
      } else {
        console.error("Google ad creation failed:", adData.error?.message);
      }
    }

    // Step 5: Add targeting criteria (locations, languages)
    if (body.targeting) {
      const criteriaOps: Record<string, unknown>[] = [];

      // Location targeting
      if (body.targeting.locations) {
        for (const loc of body.targeting.locations) {
          criteriaOps.push({
            create: {
              campaign: campaignResourceName,
              type: "LOCATION",
              location: {
                geoTargetConstant: `geoTargetConstants/${loc.key}`,
              },
            },
          });
        }
      }

      // Language targeting
      if (body.targeting.languages) {
        for (const lang of body.targeting.languages) {
          criteriaOps.push({
            create: {
              campaign: campaignResourceName,
              type: "LANGUAGE",
              language: {
                languageConstant: `languageConstants/${lang}`,
              },
            },
          });
        }
      }

      if (criteriaOps.length > 0) {
        await fetch(
          `https://googleads.googleapis.com/v18/customers/${customerId}/campaignCriteria:mutate`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ operations: criteriaOps }),
          }
        );
      }
    }
  } else {
    console.error("Google ad group creation failed:", adGroupData.error?.message);
  }

  return {
    campaignId,
    adGroupId,
    adId,
    response: campaignData,
  };
}

async function updateGoogleCampaign(
  account: AdAccountInfo,
  campaign: Record<string, unknown>,
  body: UpdateCampaignRequest
): Promise<void> {
  const customerId = account.platform_account_id;
  const headers = {
    Authorization: `Bearer ${account.access_token}`,
    "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
    "login-customer-id": customerId,
    "Content-Type": "application/json",
  };

  const updateFields: Record<string, unknown> = {};
  const updateMask: string[] = [];

  if (body.campaign_name) {
    updateFields.name = body.campaign_name;
    updateMask.push("name");
  }
  if (body.end_date) {
    updateFields.endDate = formatGoogleDate(body.end_date);
    updateMask.push("end_date");
  }

  if (updateMask.length > 0) {
    const campaignResourceName = `customers/${customerId}/campaigns/${campaign.platform_campaign_id}`;
    const resp = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/campaigns:mutate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          operations: [
            {
              update: {
                resourceName: campaignResourceName,
                ...updateFields,
              },
              updateMask: updateMask.join(","),
            },
          ],
        }),
      }
    );
    const data = await resp.json();
    if (data.error) {
      throw new Error(`Google Ads campaign update failed: ${data.error.message}`);
    }
  }

  // Update budget if changed
  if (body.daily_budget !== undefined) {
    // Fetch current budget resource
    const queryResp = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `SELECT campaign_budget.resource_name FROM campaign_budget WHERE campaign.id = ${campaign.platform_campaign_id} LIMIT 1`,
        }),
      }
    );
    const queryData = await queryResp.json();
    const budgetResource =
      queryData?.[0]?.results?.[0]?.campaignBudget?.resourceName;

    if (budgetResource) {
      await fetch(
        `https://googleads.googleapis.com/v18/customers/${customerId}/campaignBudgets:mutate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            operations: [
              {
                update: {
                  resourceName: budgetResource,
                  amountMicros: String(
                    Math.round(body.daily_budget * 1000000)
                  ),
                },
                updateMask: "amount_micros",
              },
            ],
          }),
        }
      );
    }
  }
}

async function setGoogleCampaignStatus(
  account: AdAccountInfo,
  campaignId: string,
  status: string
): Promise<void> {
  const customerId = account.platform_account_id;
  const campaignResourceName = `customers/${customerId}/campaigns/${campaignId}`;

  const resp = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/campaigns:mutate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
        "login-customer-id": customerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operations: [
          {
            update: {
              resourceName: campaignResourceName,
              status,
            },
            updateMask: "status",
          },
        ],
      }),
    }
  );
  const data = await resp.json();
  if (data.error) {
    throw new Error(`Google Ads status update failed: ${data.error.message}`);
  }
}

async function syncGoogleCampaign(
  account: AdAccountInfo,
  campaignId: string
): Promise<{ metrics: Record<string, unknown>; status: string }> {
  const customerId = account.platform_account_id;

  const resp = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
        "login-customer-id": customerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.average_cpc,
            metrics.ctr,
            metrics.conversions,
            metrics.cost_per_conversion
          FROM campaign
          WHERE campaign.id = ${campaignId}
            AND segments.date DURING LAST_30_DAYS
        `,
      }),
    }
  );

  const data = await resp.json();

  const row = data?.[0]?.results?.[0] || {};
  const campaignInfo = row.campaign || {};
  const m = row.metrics || {};

  return {
    metrics: {
      impressions: parseInt(m.impressions || "0"),
      clicks: parseInt(m.clicks || "0"),
      spend: parseInt(m.costMicros || "0") / 1000000,
      cpc: parseInt(m.averageCpc || "0") / 1000000,
      ctr: parseFloat(m.ctr || "0"),
      conversions: parseFloat(m.conversions || "0"),
      cost_per_conversion:
        parseInt(m.costPerConversion || "0") / 1000000,
      synced_at: new Date().toISOString(),
    },
    status: campaignInfo.status || "UNKNOWN",
  };
}

function mapGoogleBidStrategy(
  strategy?: string
): string {
  const map: Record<string, string> = {
    LOWEST_COST: "MAXIMIZE_CLICKS",
    COST_CAP: "TARGET_CPA",
    MAX_CONVERSIONS: "MAXIMIZE_CONVERSIONS",
    MAX_VALUE: "MAXIMIZE_CONVERSION_VALUE",
    TARGET_ROAS: "TARGET_ROAS",
  };
  return map[(strategy || "").toUpperCase()] || "MAXIMIZE_CLICKS";
}

function formatGoogleDate(dateStr: string): string {
  // Google Ads expects YYYY-MM-DD
  return dateStr.split("T")[0];
}

// ============================================================================
// Utilities
// ============================================================================

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + "...";
}
