import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ───────────────────────────────────────────────────

export type BillingStatus = 'pending' | 'in_closing' | 'paid';
export type ClosingStatus = 'draft' | 'sent' | 'paid';

export interface BillingItem {
  id: string;
  item_type: 'project' | 'fillmaker';
  title: string;
  description: string | null;
  item_date: string;
  price_client: number;
  cost_own: number;
  currency: string;
  billing_status: BillingStatus;
  editor_id: string | null;
  closing_id: string | null;
}

export interface ClientClosing {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  total_amount: number;
  currency: string;
  status: ClosingStatus;
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FillmakerService {
  id: string;
  organization_id: string;
  client_id: string;
  title: string;
  description: string | null;
  service_date: string;
  price_client: number;
  cost_own: number;
  currency: string;
  editor_id: string | null;
  billing_status: BillingStatus;
  client_closing_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Hooks de consulta ───────────────────────────────────────

export function useClientBillingItems(orgId: string, clientId: string) {
  return useQuery({
    queryKey: ['client-billing-items', orgId, clientId],
    queryFn: async (): Promise<BillingItem[]> => {
      const { data, error } = await (supabase as any).rpc('get_client_billing_items', {
        p_org_id: orgId,
        p_client_id: clientId,
      });
      if (error) throw error;
      return (data ?? []) as BillingItem[];
    },
    enabled: !!(orgId && clientId),
    staleTime: 0,
  });
}

// CRITICAL 1 — query key incluye orgId y filtra por organization_id
export function useClientClosings(orgId: string, clientId: string) {
  return useQuery({
    queryKey: ['client-closings', orgId, clientId],
    queryFn: async (): Promise<ClientClosing[]> => {
      const { data, error } = await (supabase as any)
        .from('client_closings')
        .select('*')
        .eq('organization_id', orgId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientClosing[];
    },
    enabled: !!(orgId && clientId),
    staleTime: 0,
  });
}

// ─── Hooks de mutación ───────────────────────────────────────

export function useCreateFillmaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      client_id: string;
      title: string;
      description?: string;
      service_date: string;
      price_client: number;
      cost_own: number;
      currency: string;
      editor_id?: string;
      notes?: string;
      created_by: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from('fillmaker_services')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as FillmakerService;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-billing-items', vars.organization_id, vars.client_id] });
    },
  });
}

// CRITICAL 2 — DELETE filtra también por organization_id
export function useDeleteFillmaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; orgId: string; clientId: string }) => {
      const { error } = await (supabase as any)
        .from('fillmaker_services')
        .delete()
        .eq('id', payload.id)
        .eq('organization_id', payload.orgId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-billing-items', vars.orgId, vars.clientId] });
    },
  });
}

export function useCreateClientClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      org_id: string;
      client_id: string;
      name: string;
      currency: string;
      notes: string;
      content_ids: string[];
      fillmaker_ids: string[];
      created_by: string;
    }) => {
      const { data, error } = await (supabase as any).rpc('create_client_closing', {
        p_org_id: payload.org_id,
        p_client_id: payload.client_id,
        p_name: payload.name,
        p_currency: payload.currency,
        p_notes: payload.notes,
        p_content_ids: payload.content_ids,
        p_fillmaker_ids: payload.fillmaker_ids,
        p_created_by: payload.created_by,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-billing-items', vars.org_id, vars.client_id] });
      qc.invalidateQueries({ queryKey: ['client-closings', vars.org_id, vars.client_id] });
    },
  });
}

// CRITICAL 2 — UPDATE filtra también por organization_id
export function useUpdateClientClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      orgId: string;
      clientId: string;
      updates: Partial<Pick<ClientClosing, 'status' | 'payment_date' | 'payment_method' | 'notes' | 'paid_at'>>;
    }) => {
      const { error } = await (supabase as any)
        .from('client_closings')
        .update(payload.updates)
        .eq('id', payload.id)
        .eq('organization_id', payload.orgId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-closings', vars.orgId, vars.clientId] });
    },
  });
}

// CRITICAL 3 — Pagar un closing via RPC (cascade correcto en BD)
export function usePayClientClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { closingId: string; orgId: string; clientId: string }) => {
      const { error } = await (supabase as any).rpc('mark_client_closing_paid', {
        p_closing_id: payload.closingId,
        p_org_id: payload.orgId,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-closings', vars.orgId, vars.clientId] });
      qc.invalidateQueries({ queryKey: ['client-billing-items', vars.orgId, vars.clientId] });
    },
  });
}

// CRITICAL 4 — Borrar draft closing via RPC (rollback correcto en BD)
export function useDeleteClientClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; clientId: string; orgId: string }) => {
      const { error } = await (supabase as any).rpc('rollback_client_closing_draft', {
        p_closing_id: payload.id,
        p_org_id: payload.orgId,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-closings', vars.orgId, vars.clientId] });
      qc.invalidateQueries({ queryKey: ['client-billing-items', vars.orgId, vars.clientId] });
    },
  });
}

// ─── Fillmakers pendientes en nómina ────────────────────────────────────────

export interface FillmakerPayrollItem {
  id: string;
  fillmaker_service_id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export function useFillmakerPayroll(orgId: string) {
  return useQuery({
    queryKey: ['fillmaker-payroll', orgId],
    queryFn: async (): Promise<FillmakerPayrollItem[]> => {
      const { data: payments, error } = await (supabase as any)
        .from('talent_payments')
        .select('id, fillmaker_service_id, user_id, description, amount, currency, status, created_at')
        .eq('organization_id', orgId)
        .not('fillmaker_service_id', 'is', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!payments?.length) return [];

      const userIds = [...new Set((payments as any[]).map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return (payments as any[]).map((d) => {
        const profile = profileMap.get(d.user_id);
        return {
          id: d.id,
          fillmaker_service_id: d.fillmaker_service_id,
          user_id: d.user_id,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          description: d.description,
          amount: Number(d.amount),
          currency: d.currency ?? 'COP',
          status: d.status,
          created_at: d.created_at,
        };
      });
    },
    enabled: !!orgId,
    staleTime: 0,
  });
}

// ─── Hooks cliente (sin orgId — RLS filtra por user_id) ────────────────────

export function useClientOwnClosings(clientId: string) {
  return useQuery({
    queryKey: ['client-own-closings', clientId],
    queryFn: async (): Promise<ClientClosing[]> => {
      const { data, error } = await (supabase as any)
        .from('client_closings')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientClosing[];
    },
    enabled: !!clientId,
    staleTime: 0,
  });
}

export function useClientOwnClosingItems(closingId: string) {
  return useQuery({
    queryKey: ['client-own-closing-items', closingId],
    queryFn: async (): Promise<BillingItem[]> => {
      const [{ data: content, error: e1 }, { data: fillmaker, error: e2 }] = await Promise.all([
        (supabase as any)
          .from('content')
          .select('id, title, description, created_at, billing_price, billing_currency, billing_status')
          .eq('client_closing_id', closingId),
        (supabase as any)
          .from('fillmaker_services')
          .select('id, title, description, service_date, price_client, cost_own, currency, billing_status, editor_id')
          .eq('client_closing_id', closingId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const items: BillingItem[] = [
        ...((content ?? []) as any[]).map((c) => ({
          id: c.id,
          item_type: 'project' as const,
          title: c.title,
          description: c.description ?? null,
          item_date: c.created_at?.split('T')[0] ?? '',
          price_client: Number(c.billing_price ?? 0),
          cost_own: 0,
          currency: c.billing_currency ?? 'COP',
          billing_status: c.billing_status ?? 'paid',
          editor_id: null,
          closing_id: closingId,
        })),
        ...((fillmaker ?? []) as any[]).map((f) => ({
          id: f.id,
          item_type: 'fillmaker' as const,
          title: f.title,
          description: f.description ?? null,
          item_date: f.service_date,
          price_client: Number(f.price_client ?? 0),
          cost_own: Number(f.cost_own ?? 0),
          currency: f.currency ?? 'COP',
          billing_status: f.billing_status ?? 'paid',
          editor_id: f.editor_id ?? null,
          closing_id: closingId,
        })),
      ];
      return items;
    },
    enabled: !!closingId,
    staleTime: 0,
  });
}

export function useClientOwnPackages(clientId: string) {
  return useQuery({
    queryKey: ['client-own-packages', clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('client_packages')
        .select('id, name, total_value, paid_amount, currency, payment_status, content_quantity, hooks_per_video, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        name: string;
        total_value: number;
        paid_amount: number;
        currency: string;
        payment_status: string;
        content_quantity: number;
        hooks_per_video: number;
        created_at: string;
      }[];
    },
    enabled: !!clientId,
    staleTime: 0,
  });
}

export function useClientOwnPackagePayments(packageId: string) {
  return useQuery({
    queryKey: ['client-own-package-payments', packageId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('client_package_payments')
        .select('id, amount, currency, payment_date, payment_method, reference_number, notes')
        .eq('client_package_id', packageId)
        .order('payment_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        amount: number;
        currency: string;
        payment_date: string;
        payment_method: string;
        reference_number: string | null;
        notes: string | null;
      }[];
    },
    enabled: !!packageId,
    staleTime: 0,
  });
}

// CRITICAL 2 — UPDATE filtra también por organization_id
export function useUpdateContentBillingPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      orgId: string;
      clientId: string;
      billing_price: number;
      billing_currency: string;
    }) => {
      const { error } = await (supabase as any)
        .from('content')
        .update({
          billing_price: payload.billing_price,
          billing_currency: payload.billing_currency,
        })
        .eq('id', payload.id)
        .eq('organization_id', payload.orgId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-billing-items', vars.orgId, vars.clientId] });
    },
  });
}
