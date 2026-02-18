/**
 * Shared Resend Client for KREOON Edge Functions
 *
 * Wraps the Resend API with rate-limit handling and typed helpers
 * for segments, contacts, broadcasts, and batch emails.
 *
 * Usage:
 *   import { getResend, ResendAPI } from "../_shared/resend-client.ts";
 *   const resend = getResend();
 *   const api = new ResendAPI();
 */

import { Resend } from "https://esm.sh/resend@4.0.0";

const RESEND_BASE = "https://api.resend.com";
const DEFAULT_FROM = "KREOON <noreply@kreoon.com>";
const KREOON_LOGO_HTML = '<img src="https://kreoon.com/favicon.png" alt="KREOON" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px" />';

let _resendInstance: Resend | null = null;

/** Get singleton Resend SDK instance */
export function getResend(): Resend {
  if (!_resendInstance) {
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) throw new Error("RESEND_API_KEY not configured");
    _resendInstance = new Resend(key);
  }
  return _resendInstance;
}

/** Get the API key for raw fetch calls */
function getApiKey(): string {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not configured");
  return key;
}

/** Sleep helper for rate-limit backoff */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Raw fetch against Resend API with automatic retry on 429
 */
async function resendFetch(
  path: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  const apiKey = getApiKey();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${RESEND_BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 429 && attempt < retries) {
      const retryAfter = res.headers.get("retry-after");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000 * (attempt + 1);
      console.warn(`[Resend] Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1})`);
      await sleep(waitMs);
      continue;
    }

    return res;
  }

  throw new Error("[Resend] Max retries exceeded");
}

// ─── Segments ───────────────────────────────────────────

export interface ResendSegment {
  id: string;
  name: string;
  created_at: string;
}

export async function createSegment(name: string): Promise<ResendSegment> {
  const res = await resendFetch("/segments", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`createSegment failed: ${JSON.stringify(data)}`);
  return data;
}

export async function listSegments(): Promise<ResendSegment[]> {
  const res = await resendFetch("/segments?limit=100");
  const data = await res.json();
  if (!res.ok) throw new Error(`listSegments failed: ${JSON.stringify(data)}`);
  return data.data || [];
}

export async function deleteSegment(segmentId: string): Promise<void> {
  const res = await resendFetch(`/segments/${segmentId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(`deleteSegment failed: ${JSON.stringify(data)}`);
  }
}

// ─── Contacts ───────────────────────────────────────────

export interface ResendContactInput {
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed?: boolean;
  properties?: Record<string, string>;
  segments?: { id: string }[];
}

export interface ResendContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
  created_at: string;
}

export async function createContact(contact: ResendContactInput): Promise<{ id: string }> {
  const res = await resendFetch("/contacts", {
    method: "POST",
    body: JSON.stringify(contact),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`createContact failed: ${JSON.stringify(data)}`);
  return data;
}

export async function updateContact(
  idOrEmail: string,
  updates: Partial<ResendContactInput>
): Promise<void> {
  const res = await resendFetch(`/contacts/${encodeURIComponent(idOrEmail)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(`updateContact failed: ${JSON.stringify(data)}`);
  }
}

export async function deleteContact(idOrEmail: string): Promise<void> {
  const res = await resendFetch(`/contacts/${encodeURIComponent(idOrEmail)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(`deleteContact failed: ${JSON.stringify(data)}`);
  }
}

export async function getContact(idOrEmail: string): Promise<ResendContact | null> {
  const res = await resendFetch(`/contacts/${encodeURIComponent(idOrEmail)}`);
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(`getContact failed: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Sync a contact to Resend — creates if not exists, updates if exists.
 * Returns the Resend contact ID.
 */
export async function syncContactToResend(
  email: string,
  firstName?: string,
  lastName?: string,
  segmentIds?: string[],
  properties?: Record<string, string>
): Promise<string> {
  const existing = await getContact(email);

  if (existing) {
    await updateContact(email, {
      first_name: firstName,
      last_name: lastName,
      properties,
      segments: segmentIds?.map((id) => ({ id })),
    });
    return existing.id;
  }

  const result = await createContact({
    email,
    first_name: firstName,
    last_name: lastName,
    properties,
    segments: segmentIds?.map((id) => ({ id })),
  });

  return result.id;
}

// ─── Broadcasts ─────────────────────────────────────────

export interface BroadcastInput {
  segment_id: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  name?: string;
  reply_to?: string;
  send?: boolean;
  scheduled_at?: string;
}

export interface ResendBroadcast {
  id: string;
  name?: string;
  segment_id: string;
  from: string;
  subject: string;
  status: string;
  created_at: string;
  sent_at?: string;
  scheduled_at?: string;
}

export async function createBroadcast(input: BroadcastInput): Promise<{ id: string }> {
  const body = {
    ...input,
    from: input.from || DEFAULT_FROM,
  };
  const res = await resendFetch("/broadcasts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`createBroadcast failed: ${JSON.stringify(data)}`);
  return data;
}

export async function sendBroadcast(
  broadcastId: string,
  scheduledAt?: string
): Promise<void> {
  const body = scheduledAt ? { scheduled_at: scheduledAt } : {};
  const res = await resendFetch(`/broadcasts/${broadcastId}/send`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(`sendBroadcast failed: ${JSON.stringify(data)}`);
  }
}

export async function deleteBroadcast(broadcastId: string): Promise<void> {
  const res = await resendFetch(`/broadcasts/${broadcastId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(`deleteBroadcast failed: ${JSON.stringify(data)}`);
  }
}

export async function getBroadcast(broadcastId: string): Promise<ResendBroadcast> {
  const res = await resendFetch(`/broadcasts/${broadcastId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(`getBroadcast failed: ${JSON.stringify(data)}`);
  return data;
}

// ─── Single Email & Batch ───────────────────────────────

export interface EmailInput {
  from?: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
  tags?: { name: string; value: string }[];
}

export async function sendEmail(input: EmailInput): Promise<{ id: string }> {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: input.from || DEFAULT_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    reply_to: input.reply_to,
    tags: input.tags,
  });
  if (error) throw new Error(`sendEmail failed: ${JSON.stringify(error)}`);
  return { id: data!.id };
}

/**
 * Send batch emails (max 100 per call).
 * Automatically chunks if more than 100 with 600ms delay between chunks.
 */
export async function sendBatchEmails(
  emails: EmailInput[]
): Promise<{ ids: string[] }> {
  const chunks: EmailInput[][] = [];
  for (let i = 0; i < emails.length; i += 100) {
    chunks.push(emails.slice(i, i + 100));
  }

  const allIds: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(600); // rate limit safety

    const batch = chunks[i].map((e) => ({
      from: e.from || DEFAULT_FROM,
      to: e.to,
      subject: e.subject,
      html: e.html,
      text: e.text,
      reply_to: e.reply_to,
      tags: e.tags,
    }));

    const res = await resendFetch("/emails/batch", {
      method: "POST",
      body: JSON.stringify(batch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`sendBatchEmails failed: ${JSON.stringify(data)}`);

    const ids = (data.data || []).map((d: { id: string }) => d.id);
    allIds.push(...ids);
  }

  return { ids: allIds };
}

// ─── Template Variable Resolution ──────────────────────

/**
 * Replace {{variable}} placeholders in a template string with actual values.
 */
export function resolveTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value || "");
  }
  // Remove any remaining unresolved variables
  result = result.replace(/\{\{[^}]+\}\}/g, "");
  return result;
}

// ─── Organization Email Config (White-Label) ────────────

export interface OrgEmailConfig {
  /** The "from" address: "Org Name <noreply@kreoon.com>" or custom domain */
  from: string;
  /** HTML for the org logo (or KREOON logo fallback) */
  logoHtml: string;
  /** Primary brand color hex */
  brandColor: string;
  /** Support email for footers */
  supportEmail: string;
  /** Org name for email text */
  orgName: string;
}

/**
 * Get email configuration for an organization.
 * Determines sender address and branding based on org plan tier.
 *
 * - Enterprise + verified domain → from: "OrgName <noreply@custom.com>"
 * - Pro/Growth/Scale → from: "OrgName <noreply@kreoon.com>"
 * - Starter/default → from: "KREOON <noreply@kreoon.com>"
 *
 * @param supabase - Admin/service-role Supabase client
 * @param organizationId - The org UUID
 */
export async function getOrgEmailConfig(
  supabase: any,
  organizationId: string | null | undefined
): Promise<OrgEmailConfig> {
  const defaults: OrgEmailConfig = {
    from: DEFAULT_FROM,
    logoHtml: KREOON_LOGO_HTML,
    brandColor: "#7700b8",
    supportEmail: "soporte@kreoon.com",
    orgName: "KREOON",
  };

  if (!organizationId) return defaults;

  try {
    const { data: org, error } = await supabase
      .from("organizations")
      .select("name, logo_url, primary_color, selected_plan, sender_name, sender_email, support_email, resend_domain_verified")
      .eq("id", organizationId)
      .single();

    if (error || !org) return defaults;

    const plan = (org.selected_plan || "starter").toLowerCase();
    const orgName = org.name || "KREOON";
    const brandColor = org.primary_color || defaults.brandColor;
    const supportEmail = org.support_email || defaults.supportEmail;

    // Build logo HTML
    let logoHtml: string;
    if (org.logo_url) {
      logoHtml = `<img src="${org.logo_url}" alt="${orgName}" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px" />`;
    } else {
      // Colored circle with initial
      const initial = orgName.charAt(0).toUpperCase();
      logoHtml = `<div style="width:48px;height:48px;border-radius:12px;background:${brandColor};color:#fff;font-size:24px;font-weight:bold;line-height:48px;text-align:center;margin:0 auto 16px">${initial}</div>`;
    }

    // Determine sender address by plan tier
    let from: string;
    if (
      plan === "enterprise" &&
      org.resend_domain_verified &&
      org.sender_email
    ) {
      // Enterprise with verified custom domain
      const senderName = org.sender_name || orgName;
      from = `${senderName} <${org.sender_email}>`;
    } else if (["growth", "scale", "enterprise"].includes(plan)) {
      // Pro tier: custom sender name, kreoon.com domain
      const senderName = org.sender_name || orgName;
      from = `${senderName} <noreply@kreoon.com>`;
    } else {
      // Starter: default KREOON sender
      from = DEFAULT_FROM;
    }

    return { from, logoHtml, brandColor, supportEmail, orgName };
  } catch (err) {
    console.error("[getOrgEmailConfig] Error:", err);
    return defaults;
  }
}

// ─── Constants ──────────────────────────────────────────

export { DEFAULT_FROM, KREOON_LOGO_HTML };
