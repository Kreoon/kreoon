import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type {
  EmailTemplate,
  EmailTemplateInsert,
  EmailSegment,
  EmailSegmentInsert,
  EmailCampaign,
  EmailCampaignInsert,
  EmailDripSequence,
  EmailDripSequenceInsert,
  EmailDripStep,
  EmailDripStepInsert,
  EmailDripEnrollment,
  EmailEvent,
  CampaignFilters,
  TemplateFilters,
  CampaignAnalytics,
  GlobalEmailAnalytics,
} from "@/types/email-marketing.types";

const QK = {
  templates: ["email-templates"] as const,
  segments: ["email-segments"] as const,
  campaigns: ["email-campaigns"] as const,
  campaign: (id: string) => ["email-campaign", id] as const,
  sequences: ["email-drip-sequences"] as const,
  sequence: (id: string) => ["email-drip-sequence", id] as const,
  steps: (seqId: string) => ["email-drip-steps", seqId] as const,
  enrollments: (seqId: string) => ["email-drip-enrollments", seqId] as const,
  events: (campaignId?: string) => ["email-events", campaignId] as const,
  analytics: ["email-analytics"] as const,
};

// ─── Helper: invoke edge function ───────────────────────

async function invokeEmailService(action: string, body: Record<string, unknown> = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("No autenticado");

  const res = await supabase.functions.invoke("email-marketing-service", {
    body,
    headers: { "x-action": action },
  });

  // The function uses ?action= but supabase.functions.invoke doesn't support query params easily
  // So we'll use the body approach and pass action in body
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// Actually, supabase.functions.invoke sends POST to the function URL.
// We need to pass action as a query param. Let's use fetch directly.
async function callEmailService(action: string, body: Record<string, unknown> = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("No autenticado");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(
    `${supabaseUrl}/functions/v1/email-marketing-service?action=${action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// ============================================================
// TEMPLATES
// ============================================================

export function useEmailTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: [...QK.templates, filters],
    queryFn: async () => {
      let query = supabase
        .from("email_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (filters?.category) query = query.eq("category", filters.category);
      if (filters?.search) query = query.ilike("name", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<EmailTemplateInsert, "created_by">) => {
      const { data, error } = await supabase
        .from("email_templates")
        .insert({ ...input, created_by: user?.id || null })
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.templates });
      toast.success("Template creado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.templates });
      toast.success("Template actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.templates });
      toast.success("Template eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ============================================================
// SEGMENTS
// ============================================================

export function useEmailSegments() {
  return useQuery({
    queryKey: QK.segments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_segments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EmailSegment[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<EmailSegmentInsert, "created_by">) => {
      const { data, error } = await supabase
        .from("email_segments")
        .insert({ ...input, created_by: user?.id || null })
        .select()
        .single();
      if (error) throw error;
      return data as EmailSegment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.segments });
      toast.success("Segmento creado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSyncSegment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (segmentId: string) => {
      return callEmailService("sync-segment", { segment_id: segmentId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.segments });
      toast.success("Segmento sincronizado con Resend");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSyncContacts() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (segmentId: string) => {
      return callEmailService("sync-contacts", { segment_id: segmentId });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: QK.segments });
      toast.success(`${data.synced} contactos sincronizados`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (segmentId: string) => {
      return callEmailService("delete-segment", { segment_id: segmentId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.segments });
      toast.success("Segmento eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ============================================================
// CAMPAIGNS
// ============================================================

export function useEmailCampaigns(filters?: CampaignFilters) {
  return useQuery({
    queryKey: [...QK.campaigns, filters],
    queryFn: async () => {
      let query = supabase
        .from("email_campaigns")
        .select("*, email_templates(id, name), email_segments(id, name, contact_count)")
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.segment_id) query = query.eq("segment_id", filters.segment_id);
      if (filters?.search) query = query.ilike("name", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EmailCampaign[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useEmailCampaign(id: string | null) {
  return useQuery({
    queryKey: QK.campaign(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*, email_templates(*), email_segments(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as EmailCampaign;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: EmailCampaignInsert) => {
      return callEmailService("create-campaign", input as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.campaigns });
      toast.success("Campaña creada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.campaigns });
      qc.invalidateQueries({ queryKey: QK.campaign(vars.id) });
      toast.success("Campaña actualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaign_id, scheduled_at }: { campaign_id: string; scheduled_at?: string }) => {
      return callEmailService("send-campaign", { campaign_id, scheduled_at });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: QK.campaigns });
      const msg = data.status === "scheduled" ? "Campaña programada" : "Campaña enviándose";
      toast.success(msg);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      return callEmailService("cancel-campaign", { campaign_id: campaignId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.campaigns });
      toast.success("Campaña cancelada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ============================================================
// DRIP SEQUENCES
// ============================================================

export function useDripSequences() {
  return useQuery({
    queryKey: QK.sequences,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_drip_sequences")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EmailDripSequence[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDripSequence(id: string | null) {
  return useQuery({
    queryKey: QK.sequence(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("email_drip_sequences")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as EmailDripSequence;
    },
    enabled: !!id,
  });
}

export function useCreateDripSequence() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<EmailDripSequenceInsert, "created_by">) => {
      const { data, error } = await supabase
        .from("email_drip_sequences")
        .insert({ ...input, created_by: user?.id || null })
        .select()
        .single();
      if (error) throw error;
      return data as EmailDripSequence;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.sequences });
      toast.success("Secuencia creada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateDripSequence() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailDripSequence> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_drip_sequences")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.sequences });
      qc.invalidateQueries({ queryKey: QK.sequence(vars.id) });
      toast.success("Secuencia actualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteDripSequence() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_drip_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.sequences });
      toast.success("Secuencia eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Steps ──────────────────────────────────────────────

export function useDripSteps(sequenceId: string | null) {
  return useQuery({
    queryKey: QK.steps(sequenceId || ""),
    queryFn: async () => {
      if (!sequenceId) return [];
      const { data, error } = await supabase
        .from("email_drip_steps")
        .select("*, email_templates(id, name, subject)")
        .eq("sequence_id", sequenceId)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data || []) as EmailDripStep[];
    },
    enabled: !!sequenceId,
  });
}

export function useCreateDripStep() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: EmailDripStepInsert) => {
      const { data, error } = await supabase
        .from("email_drip_steps")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as EmailDripStep;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.steps(data.sequence_id) });
      toast.success("Paso agregado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateDripStep() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailDripStep> & { id: string; sequence_id: string }) => {
      const { data, error } = await supabase
        .from("email_drip_steps")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.steps(vars.sequence_id) });
      toast.success("Paso actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteDripStep() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sequence_id }: { id: string; sequence_id: string }) => {
      const { error } = await supabase.from("email_drip_steps").delete().eq("id", id);
      if (error) throw error;
      return { sequence_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.steps(data.sequence_id) });
      toast.success("Paso eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Enrollments ────────────────────────────────────────

export function useDripEnrollments(sequenceId: string | null) {
  return useQuery({
    queryKey: QK.enrollments(sequenceId || ""),
    queryFn: async () => {
      if (!sequenceId) return [];
      const { data, error } = await supabase
        .from("email_drip_enrollments")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EmailDripEnrollment[];
    },
    enabled: !!sequenceId,
  });
}

export function useEnrollContacts() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sequence_id,
      contacts,
    }: {
      sequence_id: string;
      contacts: { email: string; name?: string; metadata?: Record<string, unknown> }[];
    }) => {
      return callEmailService("enroll-contacts", { sequence_id, contacts });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: QK.enrollments("") });
      toast.success(`${data.enrolled} contactos inscritos`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePauseEnrollment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollment_id, resume }: { enrollment_id: string; resume?: boolean }) => {
      return callEmailService("pause-enrollment", { enrollment_id, resume });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.enrollments("") });
      toast.success("Inscripción actualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ============================================================
// EVENTS & ANALYTICS
// ============================================================

export function useEmailEvents(campaignId?: string) {
  return useQuery({
    queryKey: QK.events(campaignId),
    queryFn: async () => {
      let query = supabase
        .from("email_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (campaignId) query = query.eq("campaign_id", campaignId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EmailEvent[];
    },
    staleTime: 60 * 1000,
  });
}

export function useEmailAnalytics(): { data: GlobalEmailAnalytics | undefined; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: QK.analytics,
    queryFn: async () => {
      // Aggregate from campaigns
      const { data: campaigns, error: campErr } = await supabase
        .from("email_campaigns")
        .select("total_sent, total_delivered, total_opened, total_clicked, total_bounced, total_complained, status");
      if (campErr) throw campErr;

      const { data: segments } = await supabase
        .from("email_segments")
        .select("contact_count");

      const { count: activeEnrollments } = await supabase
        .from("email_drip_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      const totals = (campaigns || []).reduce(
        (acc, c) => ({
          total_sent: acc.total_sent + (c.total_sent || 0),
          total_delivered: acc.total_delivered + (c.total_delivered || 0),
          total_opened: acc.total_opened + (c.total_opened || 0),
          total_clicked: acc.total_clicked + (c.total_clicked || 0),
          total_bounced: acc.total_bounced + (c.total_bounced || 0),
        }),
        { total_sent: 0, total_delivered: 0, total_opened: 0, total_clicked: 0, total_bounced: 0 }
      );

      const sentCampaigns = (campaigns || []).filter((c) => c.status === "sent").length;
      const totalContacts = (segments || []).reduce((sum, s) => sum + (s.contact_count || 0), 0);

      return {
        total_campaigns: sentCampaigns,
        total_sent: totals.total_sent,
        total_delivered: totals.total_delivered,
        total_opened: totals.total_opened,
        total_clicked: totals.total_clicked,
        total_bounced: totals.total_bounced,
        avg_open_rate: totals.total_delivered > 0 ? totals.total_opened / totals.total_delivered : 0,
        avg_click_rate: totals.total_opened > 0 ? totals.total_clicked / totals.total_opened : 0,
        active_drip_enrollments: activeEnrollments || 0,
        total_segments: (segments || []).length,
        total_contacts_synced: totalContacts,
      } as GlobalEmailAnalytics;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { data, isLoading };
}

// ─── Computed analytics for a single campaign ───────────

export function computeCampaignAnalytics(campaign: EmailCampaign): CampaignAnalytics {
  const sent = campaign.total_sent || 1;
  const delivered = campaign.total_delivered || 0;
  const opened = campaign.total_opened || 0;
  const clicked = campaign.total_clicked || 0;
  const bounced = campaign.total_bounced || 0;
  const complained = campaign.total_complained || 0;

  return {
    delivery_rate: delivered / sent,
    open_rate: delivered > 0 ? opened / delivered : 0,
    click_rate: opened > 0 ? clicked / opened : 0,
    bounce_rate: bounced / sent,
    complaint_rate: delivered > 0 ? complained / delivered : 0,
  };
}
