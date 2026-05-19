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

export function useClientClosings(clientId: string) {
  return useQuery({
    queryKey: ['client-closings', clientId],
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

export function useDeleteFillmaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; orgId: string; clientId: string }) => {
      const { error } = await (supabase as any)
        .from('fillmaker_services')
        .delete()
        .eq('id', payload.id);
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
      qc.invalidateQueries({ queryKey: ['client-closings', vars.client_id] });
    },
  });
}

export function useUpdateClientClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      clientId: string;
      updates: Partial<Pick<ClientClosing, 'status' | 'payment_date' | 'payment_method' | 'notes' | 'paid_at'>>;
    }) => {
      const { error } = await (supabase as any)
        .from('client_closings')
        .update(payload.updates)
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-closings', vars.clientId] });
    },
  });
}

export function useDeleteClientClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; clientId: string; orgId: string }) => {
      const { error } = await (supabase as any)
        .from('client_closings')
        .delete()
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-closings', vars.clientId] });
      qc.invalidateQueries({ queryKey: ['client-billing-items', vars.orgId, vars.clientId] });
    },
  });
}

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
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-billing-items', vars.orgId, vars.clientId] });
    },
  });
}
