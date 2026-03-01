// ============================================================================
// KREOON MARKETING REPORTS SERVICE
// Edge Function para generar, descargar, listar, programar y eliminar
// reportes de marketing
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

interface GenerateReportRequest {
  organization_id: string;
  marketing_client_id: string;
  title: string;
  report_type: "weekly" | "monthly" | "campaign" | "custom";
  config: {
    date_range: {
      from: string;
      to: string;
    };
    campaign_ids?: string[];
    platforms?: string[];
    metrics?: string[];
    group_by?: "day" | "week" | "month" | "platform" | "campaign";
  };
}

interface DownloadReportRequest {
  report_id: string;
  format: "csv" | "pdf";
}

interface ScheduleReportRequest {
  organization_id: string;
  marketing_client_id: string;
  title: string;
  report_type: "weekly" | "monthly";
  config: {
    campaign_ids?: string[];
    platforms?: string[];
    metrics?: string[];
    group_by?: "day" | "week" | "month" | "platform" | "campaign";
  };
  schedule: {
    frequency: "daily" | "weekly" | "monthly";
    day_of_week?: number; // 0-6 for weekly
    day_of_month?: number; // 1-31 for monthly
    time?: string; // HH:MM UTC
    recipients?: string[]; // email addresses
  };
}

interface DeleteReportRequest {
  report_id: string;
}

interface MetricRow {
  date: string;
  platform: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  [key: string]: unknown;
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
      case "generate": {
        const body = await req.json();
        result = await generateReport(
          supabase,
          user.id,
          body as GenerateReportRequest
        );
        break;
      }
      case "download": {
        const body = await req.json();
        result = await downloadReport(
          supabase,
          user.id,
          body as DownloadReportRequest
        );
        break;
      }
      case "list": {
        const orgId = url.searchParams.get("organization_id");
        const clientId = url.searchParams.get("client_id");
        const reportType = url.searchParams.get("report_type");
        const limit = parseInt(url.searchParams.get("limit") || "20", 10);
        const offset = parseInt(url.searchParams.get("offset") || "0", 10);
        if (!orgId) throw new Error("organization_id is required");
        result = await listReports(
          supabase,
          user.id,
          orgId,
          clientId,
          reportType,
          limit,
          offset
        );
        break;
      }
      case "schedule": {
        const body = await req.json();
        result = await scheduleReport(
          supabase,
          user.id,
          body as ScheduleReportRequest
        );
        break;
      }
      case "delete": {
        const body = await req.json();
        result = await deleteReport(
          supabase,
          user.id,
          body as DeleteReportRequest
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
    console.error("Marketing reports error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// GENERATE REPORT
// Query metrics, aggregate, store snapshot, return data
// ============================================================================

async function generateReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  request: GenerateReportRequest
) {
  const {
    organization_id,
    marketing_client_id,
    title,
    report_type,
    config,
  } = request;

  await verifyOrgMembership(supabase, userId, organization_id);

  const { date_range, campaign_ids, platforms, metrics: requestedMetrics, group_by } = config;

  if (!date_range?.from || !date_range?.to) {
    throw new Error("date_range with from and to is required");
  }

  // Get channels for this marketing client (or all for org if no client filter)
  let channelQuery = supabase
    .from("traffic_channels")
    .select("id, channel_type, channel_name")
    .eq("organization_id", organization_id)
    .eq("status", "active");

  if (marketing_client_id) {
    channelQuery = channelQuery.eq("client_id", (
      await getClientIdFromMarketingClient(supabase, marketing_client_id)
    ));
  }

  if (platforms && platforms.length > 0) {
    channelQuery = channelQuery.in("channel_type", platforms);
  }

  const { data: channels } = await channelQuery;
  const channelIds = (channels || []).map((c) => c.id);
  const channelMap: Record<string, { type: string; name: string }> = {};
  for (const ch of channels || []) {
    channelMap[ch.id] = { type: ch.channel_type, name: ch.channel_name };
  }

  // Get campaigns if filtered
  const campaignMap: Record<string, string> = {};
  if (campaign_ids && campaign_ids.length > 0) {
    const { data: campaigns } = await supabase
      .from("marketing_campaigns")
      .select("id, name, channel_id")
      .in("id", campaign_ids);

    for (const c of campaigns || []) {
      campaignMap[c.id] = c.name;
    }
  }

  // Query traffic_sync_logs
  let logsQuery = supabase
    .from("traffic_sync_logs")
    .select("*")
    .eq("organization_id", organization_id)
    .gte("sync_date", date_range.from)
    .lte("sync_date", date_range.to)
    .order("sync_date", { ascending: true });

  if (channelIds.length > 0) {
    logsQuery = logsQuery.in("channel_id", channelIds);
  }

  const { data: logs, error: logsError } = await logsQuery;

  if (logsError) {
    throw new Error(`Failed to query metrics: ${logsError.message}`);
  }

  const allLogs = logs || [];

  // Filter by campaign_ids if provided
  let filteredLogs = allLogs;
  if (campaign_ids && campaign_ids.length > 0) {
    filteredLogs = allLogs.filter((l) => {
      const rawCampId = (l.raw_data as Record<string, unknown>)?.campaign_id;
      return rawCampId && campaign_ids.includes(rawCampId as string);
    });
  }

  // Build metric rows
  const metricRows: MetricRow[] = filteredLogs.map((l) => {
    const rawData = (l.raw_data || {}) as Record<string, unknown>;
    const channelInfo = channelMap[l.channel_id] || { type: "unknown", name: "Unknown" };
    const campId = rawData.campaign_id as string;

    return {
      date: l.sync_date,
      platform: channelInfo.type,
      campaign_name: campaignMap[campId] || (rawData.campaign_name as string) || "",
      spend: Number(l.investment) || 0,
      impressions: Number(l.impressions) || 0,
      clicks: Number(l.clicks) || 0,
      conversions: Number(l.leads) || 0,
      ctr: Number(l.ctr) || 0,
      cpc: Number(l.cpc) || 0,
      cpm: Number(rawData.cpm) || 0,
      roas: Number(l.roas) || 0,
      reach: Number(rawData.reach) || 0,
      video_views: Number(rawData.video_views) || 0,
    };
  });

  // Aggregate by requested dimension
  const aggregated = aggregateByDimension(metricRows, group_by || "day");

  // Filter to only requested metrics if specified
  let finalMetrics = requestedMetrics;
  if (!finalMetrics || finalMetrics.length === 0) {
    finalMetrics = [
      "spend",
      "impressions",
      "clicks",
      "conversions",
      "ctr",
      "cpc",
      "cpm",
      "roas",
    ];
  }

  // Compute summary totals
  const totalSpend = metricRows.reduce((s, r) => s + r.spend, 0);
  const totalImpressions = metricRows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = metricRows.reduce((s, r) => s + r.clicks, 0);
  const totalConversions = metricRows.reduce((s, r) => s + r.conversions, 0);

  const summary = {
    total_spend: totalSpend,
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    total_conversions: totalConversions,
    avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    avg_cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    roas: totalSpend > 0 ? totalConversions / totalSpend : 0,
    data_points: metricRows.length,
    days: new Set(metricRows.map((r) => r.date)).size,
  };

  // Platform breakdown
  const platformBreakdown = computePlatformBreakdown(metricRows);

  // Data snapshot for storage
  const dataSnapshot = {
    config,
    summary,
    aggregated,
    platform_breakdown: platformBreakdown,
    generated_at: new Date().toISOString(),
    generated_by: userId,
  };

  // Store report
  const { data: report, error: reportError } = await supabase
    .from("marketing_reports")
    .insert({
      organization_id,
      marketing_client_id,
      title,
      report_type,
      period_start: date_range.from,
      period_end: date_range.to,
      metrics: summary,
      platforms_data: platformBreakdown,
      campaign_ids: campaign_ids || [],
      highlights: identifyHighlights(metricRows, summary),
      charts_data: buildChartsData(aggregated, group_by || "day"),
      recommendations: [],
      status: "published",
      published_at: new Date().toISOString(),
      created_by: userId,
    })
    .select()
    .single();

  if (reportError) {
    throw new Error(`Failed to store report: ${reportError.message}`);
  }

  return {
    success: true,
    report_id: report.id,
    title,
    report_type,
    date_range,
    summary,
    aggregated,
    platform_breakdown: platformBreakdown,
    available_metrics: finalMetrics,
  };
}

// ============================================================================
// DOWNLOAD REPORT
// Generate CSV or HTML (for PDF), return as base64
// ============================================================================

async function downloadReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  request: DownloadReportRequest
) {
  const { report_id, format } = request;

  // Get the report
  const { data: report, error } = await supabase
    .from("marketing_reports")
    .select("*")
    .eq("id", report_id)
    .single();

  if (error || !report) {
    throw new Error("Report not found");
  }

  await verifyOrgMembership(supabase, userId, report.organization_id);

  const metrics = report.metrics as Record<string, unknown>;
  const platformData = report.platforms_data as Record<string, Record<string, unknown>>;
  const chartsData = report.charts_data as Array<Record<string, unknown>>;

  let content: string;
  let mimeType: string;
  let filename: string;

  if (format === "csv") {
    content = generateCSV(report, metrics, platformData, chartsData);
    mimeType = "text/csv";
    filename = `${sanitizeFilename(report.title)}_${report.period_start}_${report.period_end}.csv`;
  } else if (format === "pdf") {
    // Generate HTML table representation (actual PDF would need a headless browser)
    content = generateHTMLReport(report, metrics, platformData, chartsData);
    mimeType = "text/html";
    filename = `${sanitizeFilename(report.title)}_${report.period_start}_${report.period_end}.html`;
  } else {
    throw new Error(`Unsupported format: ${format}. Use 'csv' or 'pdf'.`);
  }

  // Encode to base64
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  const base64 = btoa(String.fromCharCode(...bytes));

  return {
    success: true,
    report_id,
    format,
    filename,
    mime_type: mimeType,
    content_base64: base64,
    content_length: bytes.length,
  };
}

// ============================================================================
// LIST REPORTS
// ============================================================================

async function listReports(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  organizationId: string,
  clientId: string | null,
  reportType: string | null,
  limit: number,
  offset: number
) {
  await verifyOrgMembership(supabase, userId, organizationId);

  let query = supabase
    .from("marketing_reports")
    .select(
      `
      id, title, report_type, period_start, period_end, status,
      metrics, campaign_ids, published_at, created_at, created_by,
      marketing_client:marketing_clients(
        id,
        client:clients(id, name)
      )
    `,
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  if (reportType) {
    query = query.eq("report_type", reportType);
  }

  const { data: reports, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list reports: ${error.message}`);
  }

  return {
    success: true,
    reports: reports || [],
    total: count || 0,
    limit,
    offset,
  };
}

// ============================================================================
// SCHEDULE REPORT
// Store schedule configuration for recurring reports
// ============================================================================

async function scheduleReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  request: ScheduleReportRequest
) {
  const {
    organization_id,
    marketing_client_id,
    title,
    report_type,
    config,
    schedule,
  } = request;

  await verifyOrgMembership(supabase, userId, organization_id);

  if (
    !schedule.frequency ||
    !["daily", "weekly", "monthly"].includes(schedule.frequency)
  ) {
    throw new Error("Invalid schedule frequency. Use: daily, weekly, monthly");
  }

  // Compute the date_range based on frequency for the first report
  const now = new Date();
  let dateFrom: string;
  const dateTo = now.toISOString().split("T")[0];

  switch (schedule.frequency) {
    case "daily":
      dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      break;
    case "weekly":
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      break;
    case "monthly":
      dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        .toISOString()
        .split("T")[0];
      break;
    default:
      dateFrom = dateTo;
  }

  // Store as a scheduled report in marketing_dashboard_config (using visible_widgets JSONB for schedule)
  // Since there's no dedicated scheduled_reports table, we store the schedule as metadata
  // in the report itself with status 'scheduled'
  const { data: report, error } = await supabase
    .from("marketing_reports")
    .insert({
      organization_id,
      marketing_client_id,
      title: `[Programado] ${title}`,
      report_type,
      period_start: dateFrom,
      period_end: dateTo,
      metrics: {
        scheduled: true,
        schedule_config: schedule,
        report_config: config,
        next_run: computeNextRun(schedule),
      },
      platforms_data: {},
      campaign_ids: config.campaign_ids || [],
      status: "draft",
      notes: `Scheduled ${schedule.frequency} report. Time: ${schedule.time || "00:00"} UTC.${
        schedule.recipients?.length
          ? ` Recipients: ${schedule.recipients.join(", ")}`
          : ""
      }`,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to schedule report: ${error.message}`);
  }

  return {
    success: true,
    report_id: report.id,
    title: report.title,
    frequency: schedule.frequency,
    next_run: computeNextRun(schedule),
    message: `Report scheduled to run ${schedule.frequency}. It will be generated automatically via pg_cron.`,
  };
}

// ============================================================================
// DELETE REPORT
// ============================================================================

async function deleteReport(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  request: DeleteReportRequest
) {
  const { report_id } = request;

  // Get report to verify org membership
  const { data: report, error: fetchError } = await supabase
    .from("marketing_reports")
    .select("id, organization_id, title")
    .eq("id", report_id)
    .single();

  if (fetchError || !report) {
    throw new Error("Report not found");
  }

  await verifyOrgMembership(supabase, userId, report.organization_id);

  const { error: delError } = await supabase
    .from("marketing_reports")
    .delete()
    .eq("id", report_id);

  if (delError) {
    throw new Error(`Failed to delete report: ${delError.message}`);
  }

  return {
    success: true,
    report_id,
    message: `Report "${report.title}" deleted successfully`,
  };
}

// ============================================================================
// CSV GENERATION
// ============================================================================

function generateCSV(
  report: Record<string, unknown>,
  metrics: Record<string, unknown>,
  platformData: Record<string, Record<string, unknown>>,
  chartsData: Array<Record<string, unknown>>
): string {
  const lines: string[] = [];

  // Header section
  lines.push(`"Report: ${escapeCSV(report.title as string)}"`);
  lines.push(
    `"Period: ${report.period_start} to ${report.period_end}"`
  );
  lines.push(`"Type: ${report.report_type}"`);
  lines.push(`"Generated: ${new Date().toISOString()}"`);
  lines.push("");

  // Summary metrics
  lines.push('"=== SUMMARY ==="');
  lines.push('"Metric","Value"');
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === "number") {
      lines.push(`"${escapeCSV(formatMetricName(key))}","${formatNumber(value)}"`);
    }
  }
  lines.push("");

  // Platform breakdown
  if (platformData && Object.keys(platformData).length > 0) {
    lines.push('"=== PLATFORM BREAKDOWN ==="');
    lines.push(
      '"Platform","Spend","Impressions","Clicks","Conversions","CTR","CPC","CPM"'
    );
    for (const [platform, data] of Object.entries(platformData)) {
      lines.push(
        `"${escapeCSV(platform)}","${formatNumber(data.spend as number)}","${data.impressions}","${data.clicks}","${data.conversions}","${formatNumber(data.ctr as number)}%","${formatNumber(data.cpc as number)}","${formatNumber(data.cpm as number)}"`
      );
    }
    lines.push("");
  }

  // Daily/aggregated data
  if (chartsData && chartsData.length > 0) {
    lines.push('"=== DETAILED DATA ==="');

    // Determine columns from first row
    const firstRow = chartsData[0];
    const columns = Object.keys(firstRow);
    lines.push(columns.map((c) => `"${escapeCSV(formatMetricName(c))}"`).join(","));

    for (const row of chartsData) {
      const values = columns.map((c) => {
        const val = row[c];
        if (typeof val === "number") return `"${formatNumber(val)}"`;
        return `"${escapeCSV(String(val || ""))}"`;
      });
      lines.push(values.join(","));
    }
  }

  return lines.join("\n");
}

// ============================================================================
// HTML REPORT GENERATION (for PDF placeholder)
// ============================================================================

function generateHTMLReport(
  report: Record<string, unknown>,
  metrics: Record<string, unknown>,
  platformData: Record<string, Record<string, unknown>>,
  chartsData: Array<Record<string, unknown>>
): string {
  const title = report.title as string;
  const periodStart = report.period_start as string;
  const periodEnd = report.period_end as string;
  const reportType = report.report_type as string;

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a2e;
      background: #f8f9fa;
      padding: 40px;
    }
    .report-header {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 32px;
      border-radius: 12px;
      margin-bottom: 32px;
    }
    .report-header h1 { font-size: 24px; margin-bottom: 8px; }
    .report-header p { opacity: 0.85; font-size: 14px; }
    .section { margin-bottom: 32px; }
    .section h2 {
      font-size: 18px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .kpi-card .value { font-size: 28px; font-weight: 700; color: #6366f1; }
    .kpi-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th {
      background: #f1f5f9;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    tr:hover td { background: #f8fafc; }
    .footer {
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${escapeHTML(title)}</h1>
    <p>Periodo: ${periodStart} - ${periodEnd} | Tipo: ${reportType} | Generado: ${new Date().toLocaleDateString("es")}</p>
  </div>
`;

  // KPI cards
  if (metrics && Object.keys(metrics).length > 0) {
    html += `  <div class="section">
    <h2>Resumen de Metricas</h2>
    <div class="kpi-grid">
`;
    const kpiEntries = Object.entries(metrics).filter(
      ([, v]) => typeof v === "number"
    );
    for (const [key, value] of kpiEntries) {
      html += `      <div class="kpi-card">
        <div class="value">${formatNumber(value as number)}</div>
        <div class="label">${escapeHTML(formatMetricName(key))}</div>
      </div>
`;
    }
    html += `    </div>
  </div>
`;
  }

  // Platform breakdown table
  if (platformData && Object.keys(platformData).length > 0) {
    html += `  <div class="section">
    <h2>Desglose por Plataforma</h2>
    <table>
      <thead>
        <tr>
          <th>Plataforma</th>
          <th>Inversion</th>
          <th>Impresiones</th>
          <th>Clicks</th>
          <th>Conversiones</th>
          <th>CTR</th>
          <th>CPC</th>
          <th>CPM</th>
        </tr>
      </thead>
      <tbody>
`;
    for (const [platform, data] of Object.entries(platformData)) {
      html += `        <tr>
          <td><strong>${escapeHTML(platform)}</strong></td>
          <td>$${formatNumber(data.spend as number)}</td>
          <td>${formatNumber(data.impressions as number)}</td>
          <td>${formatNumber(data.clicks as number)}</td>
          <td>${formatNumber(data.conversions as number)}</td>
          <td>${formatNumber(data.ctr as number)}%</td>
          <td>$${formatNumber(data.cpc as number)}</td>
          <td>$${formatNumber(data.cpm as number)}</td>
        </tr>
`;
    }
    html += `      </tbody>
    </table>
  </div>
`;
  }

  // Detailed data table
  if (chartsData && chartsData.length > 0) {
    const columns = Object.keys(chartsData[0]);

    html += `  <div class="section">
    <h2>Datos Detallados</h2>
    <table>
      <thead>
        <tr>
`;
    for (const col of columns) {
      html += `          <th>${escapeHTML(formatMetricName(col))}</th>
`;
    }
    html += `        </tr>
      </thead>
      <tbody>
`;
    for (const row of chartsData) {
      html += `        <tr>
`;
      for (const col of columns) {
        const val = row[col];
        const displayVal =
          typeof val === "number" ? formatNumber(val) : escapeHTML(String(val || ""));
        html += `          <td>${displayVal}</td>
`;
      }
      html += `        </tr>
`;
    }
    html += `      </tbody>
    </table>
  </div>
`;
  }

  // Notes
  if (report.notes) {
    html += `  <div class="section">
    <h2>Notas</h2>
    <p>${escapeHTML(report.notes as string)}</p>
  </div>
`;
  }

  // Recommendations
  const recommendations = report.recommendations as
    | Array<Record<string, string>>
    | string
    | null;
  if (
    recommendations &&
    Array.isArray(recommendations) &&
    recommendations.length > 0
  ) {
    html += `  <div class="section">
    <h2>Recomendaciones</h2>
    <ul>
`;
    for (const rec of recommendations) {
      const text = typeof rec === "string" ? rec : rec.text || rec.description || JSON.stringify(rec);
      html += `      <li>${escapeHTML(text)}</li>
`;
    }
    html += `    </ul>
  </div>
`;
  }

  html += `  <div class="footer">
    <p>Generado por Kreoon Marketing Intelligence | ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;

  return html;
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

function aggregateByDimension(
  rows: MetricRow[],
  groupBy: string
): Array<Record<string, unknown>> {
  const groups: Record<string, MetricRow[]> = {};

  for (const row of rows) {
    let key: string;

    switch (groupBy) {
      case "week": {
        // Group by ISO week
        const d = new Date(row.date);
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = startOfWeek.toISOString().split("T")[0];
        break;
      }
      case "month":
        key = row.date.slice(0, 7); // YYYY-MM
        break;
      case "platform":
        key = row.platform;
        break;
      case "campaign":
        key = row.campaign_name || "unknown";
        break;
      case "day":
      default:
        key = row.date;
        break;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(row);
  }

  const result: Array<Record<string, unknown>> = [];

  for (const [key, groupRows] of Object.entries(groups)) {
    const totalSpend = groupRows.reduce((s, r) => s + r.spend, 0);
    const totalImpressions = groupRows.reduce((s, r) => s + r.impressions, 0);
    const totalClicks = groupRows.reduce((s, r) => s + r.clicks, 0);
    const totalConversions = groupRows.reduce((s, r) => s + r.conversions, 0);

    result.push({
      [groupBy]: key,
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      roas: totalSpend > 0 ? totalConversions / totalSpend : 0,
    });
  }

  return result;
}

function computePlatformBreakdown(
  rows: MetricRow[]
): Record<string, Record<string, number>> {
  const platforms: Record<string, MetricRow[]> = {};

  for (const row of rows) {
    const p = row.platform || "unknown";
    if (!platforms[p]) platforms[p] = [];
    platforms[p].push(row);
  }

  const result: Record<string, Record<string, number>> = {};

  for (const [platform, platformRows] of Object.entries(platforms)) {
    const totalSpend = platformRows.reduce((s, r) => s + r.spend, 0);
    const totalImpressions = platformRows.reduce(
      (s, r) => s + r.impressions,
      0
    );
    const totalClicks = platformRows.reduce((s, r) => s + r.clicks, 0);
    const totalConversions = platformRows.reduce(
      (s, r) => s + r.conversions,
      0
    );

    result[platform] = {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      roas: totalSpend > 0 ? totalConversions / totalSpend : 0,
    };
  }

  return result;
}

function identifyHighlights(
  rows: MetricRow[],
  summary: Record<string, number>
): Array<Record<string, string>> {
  const highlights: Array<Record<string, string>> = [];

  if (rows.length === 0) return highlights;

  // Best performing day (by conversions)
  const bestDay = rows.reduce((best, r) =>
    r.conversions > (best?.conversions || 0) ? r : best
  );
  if (bestDay && bestDay.conversions > 0) {
    highlights.push({
      type: "best_day",
      title: "Mejor dia por conversiones",
      description: `${bestDay.date}: ${bestDay.conversions} conversiones con $${formatNumber(bestDay.spend)} de inversion`,
    });
  }

  // Highest CTR day
  const bestCTR = rows.reduce((best, r) =>
    r.ctr > (best?.ctr || 0) ? r : best
  );
  if (bestCTR && bestCTR.ctr > 0) {
    highlights.push({
      type: "best_ctr",
      title: "Mejor CTR",
      description: `${bestCTR.date}: ${formatNumber(bestCTR.ctr)}% CTR`,
    });
  }

  // Total spend vs budget status
  if (summary.total_spend > 0) {
    highlights.push({
      type: "spend_total",
      title: "Inversion total",
      description: `$${formatNumber(summary.total_spend)} invertidos en ${summary.days} dias`,
    });
  }

  return highlights;
}

function buildChartsData(
  aggregated: Array<Record<string, unknown>>,
  groupBy: string
): Array<Record<string, unknown>> {
  // Return aggregated data formatted for chart rendering on frontend
  return aggregated.map((row) => ({
    label: row[groupBy] as string,
    ...row,
  }));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function getClientIdFromMarketingClient(
  supabase: ReturnType<typeof createClient>,
  marketingClientId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("marketing_clients")
    .select("client_id")
    .eq("id", marketingClientId)
    .single();

  if (error || !data) {
    throw new Error("Marketing client not found");
  }

  return data.client_id;
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
    throw new Error(
      "Not authorized: user is not a member of this organization"
    );
  }
}

function computeNextRun(schedule: {
  frequency: string;
  day_of_week?: number;
  day_of_month?: number;
  time?: string;
}): string {
  const now = new Date();
  const [hours, minutes] = (schedule.time || "00:00").split(":").map(Number);

  const next = new Date(now);
  next.setUTCHours(hours, minutes, 0, 0);

  switch (schedule.frequency) {
    case "daily":
      if (next <= now) next.setDate(next.getDate() + 1);
      break;
    case "weekly": {
      const targetDay = schedule.day_of_week ?? 1; // default Monday
      const daysUntil =
        ((targetDay - now.getDay() + 7) % 7) || (next <= now ? 7 : 0);
      next.setDate(next.getDate() + daysUntil);
      break;
    }
    case "monthly": {
      const targetDayOfMonth = schedule.day_of_month ?? 1;
      next.setDate(targetDayOfMonth);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(targetDayOfMonth);
      }
      break;
    }
  }

  return next.toISOString();
}

function escapeCSV(value: string): string {
  return value.replace(/"/g, '""');
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMetricName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}
