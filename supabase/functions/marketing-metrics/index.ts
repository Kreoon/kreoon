// ============================================================================
// KREOON MARKETING METRICS SERVICE
// Edge Function para sincronizar metricas de plataformas publicitarias,
// dashboard agregado e insights de IA
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ============================================================================
// TYPES
// ============================================================================

interface SyncCampaignRequest {
  campaign_id: string;
  platform?: string;
  date_from?: string;
  date_to?: string;
}

interface SyncAllRequest {
  organization_id: string;
  platform?: string;
}

interface SyncAccountRequest {
  organization_id: string;
  channel_id: string;
  date_from?: string;
  date_to?: string;
}

interface AIInsightsRequest {
  campaign_id: string;
  organization_id: string;
  days?: number;
}

interface DailyMetric {
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  cost_per_conversion: number;
  video_views: number;
  video_p25: number;
  video_p50: number;
  video_p75: number;
  video_p100: number;
  frequency: number;
  likes: number;
  comments: number;
  shares: number;
  roas: number;
  raw_data: Record<string, unknown>;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    let result;

    switch (action) {
      case "sync-campaign": {
        const body = await req.json();
        result = await syncCampaignMetrics(
          supabase,
          user.id,
          body as SyncCampaignRequest
        );
        break;
      }
      case "sync-all": {
        const body = await req.json();
        result = await syncAllCampaigns(
          supabase,
          user.id,
          body as SyncAllRequest
        );
        break;
      }
      case "sync-account": {
        const body = await req.json();
        result = await syncAccountSpend(
          supabase,
          user.id,
          body as SyncAccountRequest
        );
        break;
      }
      case "dashboard": {
        const orgId = url.searchParams.get("organization_id");
        const clientId = url.searchParams.get("client_id");
        const dateFrom = url.searchParams.get("date_from");
        const dateTo = url.searchParams.get("date_to");
        if (!orgId) throw new Error("organization_id is required");
        result = await getDashboardMetrics(supabase, user.id, orgId, clientId, dateFrom, dateTo);
        break;
      }
      case "ai-insights": {
        const body = await req.json();
        result = await generateAIInsights(
          supabase,
          user.id,
          body as AIInsightsRequest
        );
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Marketing metrics error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// SYNC CAMPAIGN METRICS
// Fetch metrics for a specific campaign from its ad platform
// ============================================================================

async function syncCampaignMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  request: SyncCampaignRequest
) {
  const { campaign_id, date_from, date_to } = request;

  // Get campaign with its channel info
  const { data: campaign, error: campError } = await supabase
    .from("marketing_campaigns")
    .select(
      `
      id, name, organization_id, channel_id, platforms, metrics,
      channel:traffic_channels(
        id, channel_type, channel_name, api_config, api_connected
      )
    `
    )
    .eq("id", campaign_id)
    .single();

  if (campError || !campaign) {
    throw new Error("Campaign not found");
  }

  // Verify user belongs to the organization
  await verifyOrgMembership(supabase, userId, campaign.organization_id);

  const channel = campaign.channel as Record<string, unknown> | null;
  if (!channel || !channel.api_connected) {
    throw new Error(
      "Campaign channel not connected to an ad platform API. Configure API credentials in the traffic channel settings."
    );
  }

  const apiConfig = channel.api_config as Record<string, unknown>;
  const platform = (request.platform ||
    channel.channel_type ||
    "") as string;

  // Determine date range (default: last 30 days)
  const endDate = date_to || new Date().toISOString().split("T")[0];
  const startDate =
    date_from ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

  let dailyMetrics: DailyMetric[] = [];

  switch (platform.toLowerCase()) {
    case "facebook":
    case "instagram":
    case "meta":
      dailyMetrics = await fetchMetaMetrics(apiConfig, campaign_id, startDate, endDate);
      break;
    case "tiktok":
    case "tiktok_ads":
      dailyMetrics = await fetchTikTokMetrics(apiConfig, campaign_id, startDate, endDate);
      break;
    case "google":
    case "google_ads":
      dailyMetrics = await fetchGoogleAdsMetrics(apiConfig, campaign_id, startDate, endDate);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}. Supported: meta, tiktok, google_ads`);
  }

  // Upsert daily metrics into traffic_sync_logs
  const syncLogs = dailyMetrics.map((m) => ({
    organization_id: campaign.organization_id,
    channel_id: channel.id as string,
    sync_type: "campaign_daily",
    sync_date: m.date,
    investment: m.spend,
    leads: m.conversions,
    sales: 0,
    clicks: m.clicks,
    impressions: m.impressions,
    cpa: m.cost_per_conversion,
    roas: m.roas,
    ctr: m.ctr,
    cpc: m.cpc,
    raw_data: {
      campaign_id,
      platform,
      reach: m.reach,
      cpm: m.cpm,
      video_views: m.video_views,
      video_p25: m.video_p25,
      video_p50: m.video_p50,
      video_p75: m.video_p75,
      video_p100: m.video_p100,
      frequency: m.frequency,
      likes: m.likes,
      comments: m.comments,
      shares: m.shares,
      ...m.raw_data,
    },
    synced_by: userId,
  }));

  // Delete existing logs for this date range and campaign, then insert fresh
  if (syncLogs.length > 0) {
    await supabase
      .from("traffic_sync_logs")
      .delete()
      .eq("channel_id", channel.id as string)
      .eq("sync_type", "campaign_daily")
      .gte("sync_date", startDate)
      .lte("sync_date", endDate)
      .filter("raw_data->>campaign_id", "eq", campaign_id);

    const { error: insertError } = await supabase
      .from("traffic_sync_logs")
      .insert(syncLogs);

    if (insertError) {
      console.error("Failed to insert sync logs:", insertError);
      throw new Error(`Failed to store metrics: ${insertError.message}`);
    }
  }

  // Aggregate totals and update campaign.metrics
  const totals = aggregateMetrics(dailyMetrics);

  await supabase
    .from("marketing_campaigns")
    .update({
      metrics: totals,
      spent: totals.spend,
    })
    .eq("id", campaign_id);

  // Update channel last_sync_at
  await supabase
    .from("traffic_channels")
    .update({
      last_sync_at: new Date().toISOString(),
      sync_status: "synced",
    })
    .eq("id", channel.id as string);

  return {
    success: true,
    campaign_id,
    platform,
    date_range: { from: startDate, to: endDate },
    days_synced: dailyMetrics.length,
    totals,
  };
}

// ============================================================================
// SYNC ALL CAMPAIGNS
// Sync metrics for all active campaigns in an organization
// ============================================================================

async function syncAllCampaigns(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  request: SyncAllRequest
) {
  const { organization_id, platform } = request;

  await verifyOrgMembership(supabase, userId, organization_id);

  // Get all active campaigns with connected channels
  const query = supabase
    .from("marketing_campaigns")
    .select("id, name, channel_id, platforms")
    .eq("organization_id", organization_id)
    .eq("status", "active")
    .not("channel_id", "is", null);

  const { data: campaigns, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch campaigns: ${error.message}`);
  }

  if (!campaigns || campaigns.length === 0) {
    return {
      success: true,
      message: "No active campaigns with connected channels found",
      synced: 0,
      results: [],
    };
  }

  const results: Array<{
    campaign_id: string;
    name: string;
    success: boolean;
    error?: string;
    days_synced?: number;
  }> = [];

  // Sync each campaign (sequentially to avoid rate limits)
  for (const camp of campaigns) {
    try {
      const syncResult = await syncCampaignMetrics(supabase, userId, {
        campaign_id: camp.id,
        platform,
      });
      results.push({
        campaign_id: camp.id,
        name: camp.name,
        success: true,
        days_synced: syncResult.days_synced,
      });
    } catch (err) {
      results.push({
        campaign_id: camp.id,
        name: camp.name,
        success: false,
        error: (err as Error).message,
      });
    }
  }

  return {
    success: true,
    organization_id,
    synced: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

// ============================================================================
// SYNC ACCOUNT-LEVEL SPEND
// Sync account-level spend for a specific traffic channel
// ============================================================================

async function syncAccountSpend(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  request: SyncAccountRequest
) {
  const { organization_id, channel_id, date_from, date_to } = request;

  await verifyOrgMembership(supabase, userId, organization_id);

  const { data: channel, error: chError } = await supabase
    .from("traffic_channels")
    .select("*")
    .eq("id", channel_id)
    .eq("organization_id", organization_id)
    .single();

  if (chError || !channel) {
    throw new Error("Traffic channel not found");
  }

  if (!channel.api_connected) {
    throw new Error("Channel API not connected");
  }

  const apiConfig = channel.api_config as Record<string, unknown>;
  const platform = channel.channel_type as string;

  const endDate = date_to || new Date().toISOString().split("T")[0];
  const startDate =
    date_from ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

  let dailyMetrics: DailyMetric[] = [];

  switch (platform.toLowerCase()) {
    case "facebook":
    case "instagram":
    case "meta":
      dailyMetrics = await fetchMetaAccountMetrics(apiConfig, startDate, endDate);
      break;
    case "tiktok":
    case "tiktok_ads":
      dailyMetrics = await fetchTikTokAccountMetrics(apiConfig, startDate, endDate);
      break;
    case "google":
    case "google_ads":
      dailyMetrics = await fetchGoogleAccountMetrics(apiConfig, startDate, endDate);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // Upsert daily account metrics
  const syncLogs = dailyMetrics.map((m) => ({
    organization_id,
    channel_id,
    sync_type: "account_daily",
    sync_date: m.date,
    investment: m.spend,
    leads: m.conversions,
    sales: 0,
    clicks: m.clicks,
    impressions: m.impressions,
    cpa: m.cost_per_conversion,
    roas: m.roas,
    ctr: m.ctr,
    cpc: m.cpc,
    raw_data: {
      platform,
      account_level: true,
      reach: m.reach,
      cpm: m.cpm,
      ...m.raw_data,
    },
    synced_by: userId,
  }));

  if (syncLogs.length > 0) {
    // Delete old account-level logs for this range
    await supabase
      .from("traffic_sync_logs")
      .delete()
      .eq("channel_id", channel_id)
      .eq("sync_type", "account_daily")
      .gte("sync_date", startDate)
      .lte("sync_date", endDate);

    const { error: insertError } = await supabase
      .from("traffic_sync_logs")
      .insert(syncLogs);

    if (insertError) {
      throw new Error(`Failed to store account metrics: ${insertError.message}`);
    }
  }

  // Update channel
  await supabase
    .from("traffic_channels")
    .update({
      last_sync_at: new Date().toISOString(),
      sync_status: "synced",
    })
    .eq("id", channel_id);

  const totals = aggregateMetrics(dailyMetrics);

  return {
    success: true,
    channel_id,
    platform,
    date_range: { from: startDate, to: endDate },
    days_synced: dailyMetrics.length,
    totals,
  };
}

// ============================================================================
// GET DASHBOARD METRICS
// Aggregated metrics using get_marketing_dashboard_metrics RPC or fallback query
// ============================================================================

async function getDashboardMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  organizationId: string,
  clientId: string | null,
  dateFrom: string | null,
  dateTo: string | null
) {
  await verifyOrgMembership(supabase, userId, organizationId);

  const endDate = dateTo || new Date().toISOString().split("T")[0];
  const startDate =
    dateFrom ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

  // Try RPC first (may exist as a SECURITY DEFINER function for performance)
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_marketing_dashboard_metrics",
    {
      p_organization_id: organizationId,
      p_client_id: clientId,
      p_date_from: startDate,
      p_date_to: endDate,
    }
  );

  if (!rpcError && rpcData) {
    return { success: true, ...rpcData };
  }

  // Fallback: aggregate from traffic_sync_logs directly
  console.log(
    "RPC get_marketing_dashboard_metrics not available, using fallback query:",
    rpcError?.message
  );

  // Get channels for this org
  let channelQuery = supabase
    .from("traffic_channels")
    .select("id, channel_type, channel_name, monthly_budget, currency, status")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (clientId) {
    channelQuery = channelQuery.eq("client_id", clientId);
  }

  const { data: channels } = await channelQuery;

  if (!channels || channels.length === 0) {
    return {
      success: true,
      date_range: { from: startDate, to: endDate },
      totals: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        roas: 0,
      },
      by_channel: [],
      daily: [],
    };
  }

  const channelIds = channels.map((c) => c.id);

  // Get sync logs for date range
  const { data: logs } = await supabase
    .from("traffic_sync_logs")
    .select("*")
    .in("channel_id", channelIds)
    .gte("sync_date", startDate)
    .lte("sync_date", endDate)
    .order("sync_date", { ascending: true });

  const allLogs = logs || [];

  // Aggregate totals
  const totalSpend = allLogs.reduce(
    (s, l) => s + (Number(l.investment) || 0),
    0
  );
  const totalImpressions = allLogs.reduce(
    (s, l) => s + (Number(l.impressions) || 0),
    0
  );
  const totalClicks = allLogs.reduce(
    (s, l) => s + (Number(l.clicks) || 0),
    0
  );
  const totalConversions = allLogs.reduce(
    (s, l) => s + (Number(l.leads) || 0),
    0
  );

  // Aggregate by channel
  const byChannel: Record<
    string,
    { channel_id: string; name: string; type: string; spend: number; impressions: number; clicks: number; conversions: number }
  > = {};
  for (const ch of channels) {
    byChannel[ch.id] = {
      channel_id: ch.id,
      name: ch.channel_name,
      type: ch.channel_type,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };
  }
  for (const log of allLogs) {
    const ch = byChannel[log.channel_id];
    if (ch) {
      ch.spend += Number(log.investment) || 0;
      ch.impressions += Number(log.impressions) || 0;
      ch.clicks += Number(log.clicks) || 0;
      ch.conversions += Number(log.leads) || 0;
    }
  }

  // Aggregate by day
  const byDay: Record<
    string,
    { date: string; spend: number; impressions: number; clicks: number; conversions: number }
  > = {};
  for (const log of allLogs) {
    const day = log.sync_date;
    if (!byDay[day]) {
      byDay[day] = {
        date: day,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      };
    }
    byDay[day].spend += Number(log.investment) || 0;
    byDay[day].impressions += Number(log.impressions) || 0;
    byDay[day].clicks += Number(log.clicks) || 0;
    byDay[day].conversions += Number(log.leads) || 0;
  }

  // Get active campaigns count
  let campQuery = supabase
    .from("marketing_campaigns")
    .select("id", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (clientId) {
    campQuery = campQuery.eq("client_id", clientId);
  }

  const { count: activeCampaigns } = await campQuery;

  return {
    success: true,
    date_range: { from: startDate, to: endDate },
    active_campaigns: activeCampaigns || 0,
    totals: {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      roas: totalSpend > 0 ? totalConversions / totalSpend : 0,
    },
    by_channel: Object.values(byChannel),
    daily: Object.values(byDay).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    ),
  };
}

// ============================================================================
// GENERATE AI INSIGHTS
// Analyze campaign performance with AI and store insights
// ============================================================================

async function generateAIInsights(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  request: AIInsightsRequest
) {
  const { campaign_id, organization_id, days = 7 } = request;

  await verifyOrgMembership(supabase, userId, organization_id);

  // Get campaign info
  const { data: campaign } = await supabase
    .from("marketing_campaigns")
    .select(
      `
      id, name, campaign_type, budget, spent, currency, metrics,
      start_date, end_date, platforms, objectives,
      channel:traffic_channels(channel_type, channel_name)
    `
    )
    .eq("id", campaign_id)
    .eq("organization_id", organization_id)
    .single();

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Get daily metrics for the last N days
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: dailyLogs } = await supabase
    .from("traffic_sync_logs")
    .select("*")
    .eq("channel_id", campaign.channel_id)
    .gte("sync_date", dateFrom)
    .order("sync_date", { ascending: true });

  if (!dailyLogs || dailyLogs.length === 0) {
    return {
      success: true,
      campaign_id,
      message: "No metrics data available for analysis. Sync campaign metrics first.",
      insights: [],
    };
  }

  // Build analysis prompt
  const metricsTable = dailyLogs
    .map(
      (l) =>
        `${l.sync_date}: spend=${l.investment}, impressions=${l.impressions}, clicks=${l.clicks}, ` +
        `conversions=${l.leads}, cpc=${l.cpc}, ctr=${l.ctr}, roas=${l.roas}`
    )
    .join("\n");

  const prompt = `You are an expert digital marketing analyst. Analyze the following campaign performance data and provide actionable insights.

CAMPAIGN INFO:
- Name: ${campaign.name}
- Type: ${campaign.campaign_type}
- Platform: ${(campaign.channel as Record<string, unknown>)?.channel_type || "unknown"}
- Budget: ${campaign.currency} ${campaign.budget}
- Spent so far: ${campaign.currency} ${campaign.spent}
- Objectives: ${JSON.stringify(campaign.objectives)}
- Date range analyzed: last ${days} days

DAILY METRICS:
${metricsTable}

CUMULATIVE METRICS:
${JSON.stringify(campaign.metrics, null, 2)}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "summary": "Brief 2-sentence executive summary",
  "spend_trend": {
    "direction": "increasing|decreasing|stable",
    "change_pct": 0,
    "observation": "..."
  },
  "ctr_analysis": {
    "current_ctr": 0,
    "trend": "improving|declining|stable",
    "benchmark_comparison": "above|below|average",
    "recommendation": "..."
  },
  "conversion_analysis": {
    "conversion_rate": 0,
    "cost_per_conversion": 0,
    "trend": "improving|declining|stable",
    "recommendation": "..."
  },
  "roas_analysis": {
    "current_roas": 0,
    "trend": "improving|declining|stable",
    "recommendation": "..."
  },
  "anomalies": [
    {
      "date": "YYYY-MM-DD",
      "type": "spike|drop",
      "metric": "...",
      "description": "..."
    }
  ],
  "top_recommendations": [
    {
      "priority": "high|medium|low",
      "category": "budget|targeting|creative|bidding",
      "action": "...",
      "expected_impact": "..."
    }
  ],
  "risk_alerts": [
    {
      "severity": "critical|warning|info",
      "message": "..."
    }
  ]
}`;

  // Call multi-ai edge function
  const multiAiUrl = `${supabaseUrl}/functions/v1/multi-ai`;

  const aiResponse = await fetch(multiAiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are a digital marketing analytics expert. Always respond with valid JSON only. No markdown formatting.",
        },
        { role: "user", content: prompt },
      ],
      models: ["gemini"],
      mode: "first",
    }),
  });

  let insights: Record<string, unknown> = {};

  if (aiResponse.ok) {
    const aiData = await aiResponse.json();
    const rawContent = aiData.response || aiData.content || "";

    // Parse AI response (strip potential markdown fences)
    const jsonStr = rawContent
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    try {
      insights = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response as JSON:", jsonStr.slice(0, 500));
      insights = {
        summary: rawContent.slice(0, 500),
        parse_error: true,
        raw_response: rawContent,
      };
    }
  } else {
    const errText = await aiResponse.text();
    console.error("Multi-AI call failed:", errText);
    throw new Error("AI analysis service unavailable");
  }

  // Store insights in marketing_ai_insights
  const insightRecords = [];

  // Main summary insight
  insightRecords.push({
    organization_id,
    insight_type: "campaign_analysis",
    category: "performance",
    title: `Analisis IA: ${campaign.name}`,
    description:
      (insights.summary as string) ||
      "Analysis completed",
    severity: determineSeverity(insights),
    related_campaign_id: campaign_id,
    data_context: {
      ...insights,
      analyzed_days: days,
      analyzed_at: new Date().toISOString(),
    },
    is_actionable: true,
  });

  // Store individual risk alerts as separate insights
  const riskAlerts = (insights.risk_alerts as Array<Record<string, string>>) || [];
  for (const alert of riskAlerts) {
    insightRecords.push({
      organization_id,
      insight_type: "risk_alert",
      category: "campaign_risk",
      title: `Alerta: ${campaign.name}`,
      description: alert.message || "Risk detected",
      severity: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info",
      related_campaign_id: campaign_id,
      data_context: alert,
      is_actionable: true,
    });
  }

  // Store top recommendations as insights
  const recommendations = (insights.top_recommendations as Array<Record<string, string>>) || [];
  for (const rec of recommendations) {
    insightRecords.push({
      organization_id,
      insight_type: "recommendation",
      category: rec.category || "optimization",
      title: `Recomendacion: ${rec.action?.slice(0, 80) || "Optimization"}`,
      description: `${rec.action || ""} — Expected impact: ${rec.expected_impact || "N/A"}`,
      severity: rec.priority === "high" ? "warning" : "info",
      related_campaign_id: campaign_id,
      data_context: rec,
      is_actionable: true,
    });
  }

  const { error: insError } = await supabase
    .from("marketing_ai_insights")
    .insert(insightRecords);

  if (insError) {
    console.error("Failed to store insights:", insError);
  }

  return {
    success: true,
    campaign_id,
    campaign_name: campaign.name,
    days_analyzed: days,
    insights,
    stored_insights: insightRecords.length,
  };
}

// ============================================================================
// PLATFORM API FETCHERS
// ============================================================================

// --- META (Facebook / Instagram) ---

async function fetchMetaMetrics(
  apiConfig: Record<string, unknown>,
  campaignId: string,
  dateFrom: string,
  dateTo: string
): Promise<DailyMetric[]> {
  const accessToken = apiConfig.access_token as string;
  const adAccountId = apiConfig.ad_account_id as string;
  const platformCampaignId = apiConfig.platform_campaign_id as string || campaignId;

  if (!accessToken || !adAccountId) {
    throw new Error(
      "Meta API credentials missing. Configure access_token and ad_account_id in traffic channel api_config."
    );
  }

  const apiVersion = (apiConfig.api_version as string) || "v19.0";

  const fields = [
    "impressions",
    "reach",
    "clicks",
    "cpc",
    "cpm",
    "spend",
    "actions",
    "video_views",
    "video_p25_watched_actions",
    "video_p50_watched_actions",
    "video_p75_watched_actions",
    "video_p100_watched_actions",
    "frequency",
    "cost_per_action_type",
  ].join(",");

  const url = `https://graph.facebook.com/${apiVersion}/${platformCampaignId}/insights?fields=${fields}&time_range={"since":"${dateFrom}","until":"${dateTo}"}&time_increment=1&access_token=${accessToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errBody = await response.text();
    console.error("Meta API error:", errBody);
    throw new Error(`Meta API error: ${response.status} — ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const rows = data.data || [];

  return rows.map((row: Record<string, unknown>) => {
    const actions = (row.actions as Array<Record<string, string>>) || [];
    const conversions = actions
      .filter(
        (a) =>
          a.action_type === "offsite_conversion" ||
          a.action_type === "lead" ||
          a.action_type === "purchase"
      )
      .reduce((s, a) => s + parseInt(a.value || "0", 10), 0);

    const videoP25 = extractVideoMetric(row.video_p25_watched_actions as Array<Record<string, string>>);
    const videoP50 = extractVideoMetric(row.video_p50_watched_actions as Array<Record<string, string>>);
    const videoP75 = extractVideoMetric(row.video_p75_watched_actions as Array<Record<string, string>>);
    const videoP100 = extractVideoMetric(row.video_p100_watched_actions as Array<Record<string, string>>);

    const spend = parseFloat(row.spend as string) || 0;
    const clicks = parseInt(row.clicks as string, 10) || 0;
    const impressions = parseInt(row.impressions as string, 10) || 0;

    return {
      date: row.date_start as string,
      impressions,
      reach: parseInt(row.reach as string, 10) || 0,
      clicks,
      spend,
      cpc: parseFloat(row.cpc as string) || 0,
      cpm: parseFloat(row.cpm as string) || 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversions,
      cost_per_conversion: conversions > 0 ? spend / conversions : 0,
      video_views: parseInt(row.video_views as string, 10) || 0,
      video_p25: videoP25,
      video_p50: videoP50,
      video_p75: videoP75,
      video_p100: videoP100,
      frequency: parseFloat(row.frequency as string) || 0,
      likes: 0,
      comments: 0,
      shares: 0,
      roas: 0,
      raw_data: row,
    };
  });
}

async function fetchMetaAccountMetrics(
  apiConfig: Record<string, unknown>,
  dateFrom: string,
  dateTo: string
): Promise<DailyMetric[]> {
  const accessToken = apiConfig.access_token as string;
  const adAccountId = apiConfig.ad_account_id as string;

  if (!accessToken || !adAccountId) {
    throw new Error("Meta API credentials missing");
  }

  const apiVersion = (apiConfig.api_version as string) || "v19.0";
  const fields = "impressions,reach,clicks,cpc,cpm,spend,frequency";

  const url = `https://graph.facebook.com/${apiVersion}/act_${adAccountId}/insights?fields=${fields}&time_range={"since":"${dateFrom}","until":"${dateTo}"}&time_increment=1&level=account&access_token=${accessToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Meta account API error: ${response.status} — ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const rows = data.data || [];

  return rows.map((row: Record<string, unknown>) => {
    const spend = parseFloat(row.spend as string) || 0;
    const clicks = parseInt(row.clicks as string, 10) || 0;
    const impressions = parseInt(row.impressions as string, 10) || 0;

    return {
      date: row.date_start as string,
      impressions,
      reach: parseInt(row.reach as string, 10) || 0,
      clicks,
      spend,
      cpc: parseFloat(row.cpc as string) || 0,
      cpm: parseFloat(row.cpm as string) || 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversions: 0,
      cost_per_conversion: 0,
      video_views: 0,
      video_p25: 0,
      video_p50: 0,
      video_p75: 0,
      video_p100: 0,
      frequency: parseFloat(row.frequency as string) || 0,
      likes: 0,
      comments: 0,
      shares: 0,
      roas: 0,
      raw_data: row,
    };
  });
}

// --- TIKTOK ADS ---

async function fetchTikTokMetrics(
  apiConfig: Record<string, unknown>,
  campaignId: string,
  dateFrom: string,
  dateTo: string
): Promise<DailyMetric[]> {
  const accessToken = apiConfig.access_token as string;
  const advertiserId = apiConfig.advertiser_id as string;
  const platformCampaignId = apiConfig.platform_campaign_id as string || campaignId;

  if (!accessToken || !advertiserId) {
    throw new Error(
      "TikTok API credentials missing. Configure access_token and advertiser_id in traffic channel api_config."
    );
  }

  const metrics = [
    "spend",
    "impressions",
    "clicks",
    "cpc",
    "cpm",
    "reach",
    "video_views_p25",
    "video_views_p50",
    "video_views_p75",
    "video_views_p100",
    "likes",
    "comments",
    "shares",
    "conversion",
    "cost_per_conversion",
  ];

  const url = "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/";

  const body = {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    dimensions: ["stat_time_day", "campaign_id"],
    metrics,
    data_level: "AUCTION_CAMPAIGN",
    start_date: dateFrom,
    end_date: dateTo,
    page: 1,
    page_size: 1000,
    filtering: [
      {
        field_name: "campaign_ids",
        filter_type: "IN",
        filter_value: JSON.stringify([platformCampaignId]),
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("TikTok API error:", errBody);
    throw new Error(`TikTok API error: ${response.status} — ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`TikTok API error: ${data.message || JSON.stringify(data)}`);
  }

  const rows = data.data?.list || [];

  return rows.map((row: Record<string, unknown>) => {
    const m = row.metrics as Record<string, string>;
    const dims = row.dimensions as Record<string, string>;

    const spend = parseFloat(m.spend) || 0;
    const clicks = parseInt(m.clicks, 10) || 0;
    const impressions = parseInt(m.impressions, 10) || 0;
    const conversions = parseInt(m.conversion, 10) || 0;

    return {
      date: dims.stat_time_day,
      impressions,
      reach: parseInt(m.reach, 10) || 0,
      clicks,
      spend,
      cpc: parseFloat(m.cpc) || 0,
      cpm: parseFloat(m.cpm) || 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversions,
      cost_per_conversion: parseFloat(m.cost_per_conversion) || 0,
      video_views: 0,
      video_p25: parseInt(m.video_views_p25, 10) || 0,
      video_p50: parseInt(m.video_views_p50, 10) || 0,
      video_p75: parseInt(m.video_views_p75, 10) || 0,
      video_p100: parseInt(m.video_views_p100, 10) || 0,
      frequency: 0,
      likes: parseInt(m.likes, 10) || 0,
      comments: parseInt(m.comments, 10) || 0,
      shares: parseInt(m.shares, 10) || 0,
      roas: 0,
      raw_data: row,
    };
  });
}

async function fetchTikTokAccountMetrics(
  apiConfig: Record<string, unknown>,
  dateFrom: string,
  dateTo: string
): Promise<DailyMetric[]> {
  const accessToken = apiConfig.access_token as string;
  const advertiserId = apiConfig.advertiser_id as string;

  if (!accessToken || !advertiserId) {
    throw new Error("TikTok API credentials missing");
  }

  const metrics = [
    "spend",
    "impressions",
    "clicks",
    "cpc",
    "cpm",
    "reach",
    "conversion",
    "cost_per_conversion",
  ];

  const url = "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/";

  const body = {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    dimensions: ["stat_time_day"],
    metrics,
    data_level: "AUCTION_ADVERTISER",
    start_date: dateFrom,
    end_date: dateTo,
    page: 1,
    page_size: 1000,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`TikTok account API error: ${response.status} — ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`TikTok API error: ${data.message}`);
  }

  const rows = data.data?.list || [];

  return rows.map((row: Record<string, unknown>) => {
    const m = row.metrics as Record<string, string>;
    const dims = row.dimensions as Record<string, string>;
    const spend = parseFloat(m.spend) || 0;
    const clicks = parseInt(m.clicks, 10) || 0;
    const impressions = parseInt(m.impressions, 10) || 0;

    return {
      date: dims.stat_time_day,
      impressions,
      reach: parseInt(m.reach, 10) || 0,
      clicks,
      spend,
      cpc: parseFloat(m.cpc) || 0,
      cpm: parseFloat(m.cpm) || 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversions: parseInt(m.conversion, 10) || 0,
      cost_per_conversion: parseFloat(m.cost_per_conversion) || 0,
      video_views: 0,
      video_p25: 0,
      video_p50: 0,
      video_p75: 0,
      video_p100: 0,
      frequency: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      roas: 0,
      raw_data: row,
    };
  });
}

// --- GOOGLE ADS ---

async function fetchGoogleAdsMetrics(
  apiConfig: Record<string, unknown>,
  campaignId: string,
  dateFrom: string,
  dateTo: string
): Promise<DailyMetric[]> {
  const developerToken = apiConfig.developer_token as string;
  const customerId = apiConfig.customer_id as string;
  const accessToken = apiConfig.access_token as string;
  const loginCustomerId = (apiConfig.login_customer_id as string) || customerId;
  const platformCampaignId = apiConfig.platform_campaign_id as string || campaignId;

  if (!developerToken || !customerId || !accessToken) {
    throw new Error(
      "Google Ads API credentials missing. Configure developer_token, customer_id, and access_token in traffic channel api_config."
    );
  }

  // Format dates for GAQL (YYYY-MM-DD)
  const gaqlDateFrom = dateFrom.replace(/-/g, "");
  const gaqlDateTo = dateTo.replace(/-/g, "");

  const gaqlQuery = `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm,
      metrics.video_views,
      metrics.video_quartile_p25_rate,
      metrics.video_quartile_p50_rate,
      metrics.video_quartile_p75_rate,
      metrics.video_quartile_p100_rate
    FROM campaign
    WHERE campaign.id = ${platformCampaignId}
      AND segments.date BETWEEN '${gaqlDateFrom}' AND '${gaqlDateTo}'
    ORDER BY segments.date
  `;

  const cleanCustomerId = customerId.replace(/-/g, "");
  const url = `https://googleads.googleapis.com/v16/customers/${cleanCustomerId}/googleAds:searchStream`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "login-customer-id": loginCustomerId.replace(/-/g, ""),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: gaqlQuery }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("Google Ads API error:", errBody);
    throw new Error(`Google Ads API error: ${response.status} — ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();

  // searchStream returns an array of result batches
  const results: DailyMetric[] = [];

  for (const batch of data) {
    const rows = batch.results || [];
    for (const row of rows) {
      const m = row.metrics || {};
      const seg = row.segments || {};

      const costMicros = parseInt(m.costMicros || "0", 10);
      const spend = costMicros / 1_000_000;
      const clicks = parseInt(m.clicks || "0", 10);
      const impressions = parseInt(m.impressions || "0", 10);
      const conversions = parseFloat(m.conversions || "0");

      results.push({
        date: seg.date,
        impressions,
        reach: 0, // Google Ads does not provide reach at campaign level via this endpoint
        clicks,
        spend,
        cpc: parseFloat(m.averageCpc || "0") / 1_000_000,
        cpm: parseFloat(m.averageCpm || "0") / 1_000_000,
        ctr: parseFloat(m.ctr || "0") * 100,
        conversions,
        cost_per_conversion: parseFloat(m.costPerConversion || "0") / 1_000_000,
        video_views: parseInt(m.videoViews || "0", 10),
        video_p25: parseFloat(m.videoQuartileP25Rate || "0"),
        video_p50: parseFloat(m.videoQuartileP50Rate || "0"),
        video_p75: parseFloat(m.videoQuartileP75Rate || "0"),
        video_p100: parseFloat(m.videoQuartileP100Rate || "0"),
        frequency: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        roas: 0,
        raw_data: row,
      });
    }
  }

  return results;
}

async function fetchGoogleAccountMetrics(
  apiConfig: Record<string, unknown>,
  dateFrom: string,
  dateTo: string
): Promise<DailyMetric[]> {
  const developerToken = apiConfig.developer_token as string;
  const customerId = apiConfig.customer_id as string;
  const accessToken = apiConfig.access_token as string;
  const loginCustomerId = (apiConfig.login_customer_id as string) || customerId;

  if (!developerToken || !customerId || !accessToken) {
    throw new Error("Google Ads API credentials missing");
  }

  const gaqlDateFrom = dateFrom.replace(/-/g, "");
  const gaqlDateTo = dateTo.replace(/-/g, "");

  const gaqlQuery = `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm
    FROM customer
    WHERE segments.date BETWEEN '${gaqlDateFrom}' AND '${gaqlDateTo}'
    ORDER BY segments.date
  `;

  const cleanCustomerId = customerId.replace(/-/g, "");
  const url = `https://googleads.googleapis.com/v16/customers/${cleanCustomerId}/googleAds:searchStream`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "login-customer-id": loginCustomerId.replace(/-/g, ""),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: gaqlQuery }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Google Ads account API error: ${response.status} — ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const results: DailyMetric[] = [];

  for (const batch of data) {
    const rows = batch.results || [];
    for (const row of rows) {
      const m = row.metrics || {};
      const seg = row.segments || {};

      const costMicros = parseInt(m.costMicros || "0", 10);
      const spend = costMicros / 1_000_000;
      const clicks = parseInt(m.clicks || "0", 10);
      const impressions = parseInt(m.impressions || "0", 10);

      results.push({
        date: seg.date,
        impressions,
        reach: 0,
        clicks,
        spend,
        cpc: parseFloat(m.averageCpc || "0") / 1_000_000,
        cpm: parseFloat(m.averageCpm || "0") / 1_000_000,
        ctr: parseFloat(m.ctr || "0") * 100,
        conversions: parseFloat(m.conversions || "0"),
        cost_per_conversion: 0,
        video_views: 0,
        video_p25: 0,
        video_p50: 0,
        video_p75: 0,
        video_p100: 0,
        frequency: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        roas: 0,
        raw_data: row,
      });
    }
  }

  return results;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractVideoMetric(
  actions: Array<Record<string, string>> | null | undefined
): number {
  if (!actions || !Array.isArray(actions)) return 0;
  return actions.reduce((s, a) => s + parseInt(a.value || "0", 10), 0);
}

function aggregateMetrics(
  metrics: DailyMetric[]
): Record<string, number> {
  if (metrics.length === 0) {
    return {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      cost_per_conversion: 0,
      video_views: 0,
      video_p25: 0,
      video_p50: 0,
      video_p75: 0,
      video_p100: 0,
      frequency: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      roas: 0,
    };
  }

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);

  return {
    spend: totalSpend,
    impressions: totalImpressions,
    reach: metrics.reduce((s, m) => s + m.reach, 0),
    clicks: totalClicks,
    conversions: totalConversions,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    cost_per_conversion:
      totalConversions > 0 ? totalSpend / totalConversions : 0,
    video_views: metrics.reduce((s, m) => s + m.video_views, 0),
    video_p25: metrics.reduce((s, m) => s + m.video_p25, 0),
    video_p50: metrics.reduce((s, m) => s + m.video_p50, 0),
    video_p75: metrics.reduce((s, m) => s + m.video_p75, 0),
    video_p100: metrics.reduce((s, m) => s + m.video_p100, 0),
    frequency:
      metrics.reduce((s, m) => s + m.frequency, 0) / metrics.length,
    likes: metrics.reduce((s, m) => s + m.likes, 0),
    comments: metrics.reduce((s, m) => s + m.comments, 0),
    shares: metrics.reduce((s, m) => s + m.shares, 0),
    roas: metrics.reduce((s, m) => s + m.roas, 0),
  };
}

function determineSeverity(
  insights: Record<string, unknown>
): string {
  const riskAlerts = (insights.risk_alerts as Array<Record<string, string>>) || [];
  if (riskAlerts.some((a) => a.severity === "critical")) return "critical";
  if (riskAlerts.some((a) => a.severity === "warning")) return "warning";
  return "info";
}

async function verifyOrgMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  organizationId: string
) {
  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    throw new Error("Not authorized: user is not a member of this organization");
  }
}
