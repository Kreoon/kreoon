import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  TalentPaymentAccount,
  TalentPayment,
  PaymentSummary,
  PaymentStatus,
  PaymentAccountType,
} from '@/types/talentPayments.types';

// ─── Cuentas de cobro ────────────────────────────────────────────────────────

export function usePaymentAccounts(organizationId: string, userId: string) {
  return useQuery({
    queryKey: ['talent-payment-accounts', organizationId, userId],
    staleTime: 0,
    queryFn: async (): Promise<TalentPaymentAccount[]> => {
      const { data, error } = await supabase
        .from('talent_payment_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId && !!userId,
  });
}

export function useCreatePaymentAccount(organizationId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (
      payload: Omit<TalentPaymentAccount, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('talent_payment_accounts')
        .insert({ ...payload, organization_id: organizationId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['talent-payment-accounts', organizationId, data.user_id] });
      toast({ title: 'Cuenta agregada' });
    },
    onError: () => toast({ title: 'Error al guardar la cuenta', variant: 'destructive' }),
  });
}

export function useUpdatePaymentAccount(organizationId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id,
      userId,
      ...patch
    }: Partial<TalentPaymentAccount> & { id: string; userId: string }) => {
      const { data, error } = await supabase
        .from('talent_payment_accounts')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, userId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['talent-payment-accounts', organizationId, data.userId] });
      toast({ title: 'Cuenta actualizada' });
    },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });
}

export function useDeletePaymentAccount(organizationId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('talent_payment_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return userId;
    },
    onSuccess: (userId) => {
      qc.invalidateQueries({ queryKey: ['talent-payment-accounts', organizationId, userId] });
      toast({ title: 'Cuenta eliminada' });
    },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });
}

export function useSetPrimaryAccount(organizationId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ accountId, userId }: { accountId: string; userId: string }) => {
      // Quitar primaria de todas las cuentas del usuario
      await supabase
        .from('talent_payment_accounts')
        .update({ is_primary: false })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);
      // Marcar la seleccionada como primaria
      const { error } = await supabase
        .from('talent_payment_accounts')
        .update({ is_primary: true })
        .eq('id', accountId);
      if (error) throw error;
      return userId;
    },
    onSuccess: (userId) => {
      qc.invalidateQueries({ queryKey: ['talent-payment-accounts', organizationId, userId] });
      toast({ title: 'Cuenta principal actualizada' });
    },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });
}

// ─── Pagos ───────────────────────────────────────────────────────────────────

export function useTalentPayments(organizationId: string, userId: string) {
  return useQuery({
    queryKey: ['talent-payments', organizationId, userId],
    staleTime: 0,
    queryFn: async (): Promise<TalentPayment[]> => {
      const { data, error } = await supabase
        .from('talent_payments')
        .select('*, payment_account:talent_payment_accounts(*)')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TalentPayment[];
    },
    enabled: !!organizationId && !!userId,
  });
}

export function usePaymentSummary(organizationId: string, userId: string): PaymentSummary {
  const { data: payments = [] } = useTalentPayments(organizationId, userId);
  return {
    total_paid: payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0),
    total_pending: payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0),
    total_processing: payments
      .filter((p) => p.status === 'processing')
      .reduce((sum, p) => sum + p.amount, 0),
    payment_count: payments.filter((p) => p.status === 'paid').length,
  };
}

export function useCreatePayment(organizationId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (
      payload: Omit<TalentPayment, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'payment_account'>
    ) => {
      const { data, error } = await supabase
        .from('talent_payments')
        .insert({ ...payload, organization_id: organizationId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['talent-payments', organizationId, data.user_id] });
      toast({ title: 'Pago registrado' });
    },
    onError: () => toast({ title: 'Error al registrar pago', variant: 'destructive' }),
  });
}

export function useUpdatePayment(organizationId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id,
      userId,
      ...patch
    }: Partial<TalentPayment> & { id: string; userId: string }) => {
      const { data, error } = await supabase
        .from('talent_payments')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, userId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['talent-payments', organizationId, data.userId] });
    },
    onError: () => toast({ title: 'Error al actualizar pago', variant: 'destructive' }),
  });
}

export function useDeletePayment(organizationId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('talent_payments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return userId;
    },
    onSuccess: (userId) => {
      qc.invalidateQueries({ queryKey: ['talent-payments', organizationId, userId] });
      toast({ title: 'Pago eliminado' });
    },
    onError: () => toast({ title: 'Error al eliminar pago', variant: 'destructive' }),
  });
}

// ─── Comprobantes (Storage) ───────────────────────────────────────────────────

export function useUploadReceipt(organizationId: string) {
  return useMutation({
    mutationFn: async ({ file, userId }: { file: File; userId: string }) => {
      const ext = file.name.split('.').pop();
      const path = `${organizationId}/${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('payment-receipts')
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from('payment-receipts')
        .createSignedUrl(path, 3600);
      return { path, signedUrl: signed?.signedUrl ?? null };
    },
  });
}

export function useSignedReceiptUrl(path: string | null) {
  return useQuery({
    queryKey: ['receipt-signed-url', path],
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 50 * 60 * 1000, // 50 min — antes de que expire la firma
  });
}

// ─── Resumen financiero basado en contenido ───────────────────────────────────
// Lógica:
//   en_proceso = contenido antes de 'approved' (incluye 'delivered' — esperando aprobación cliente)
//   pendiente  = contenido en 'approved' sin pagar (único status que genera cobro)
//   pagado     = contenido con status 'paid' o creator_paid/editor_paid = true

export interface ContentFinancialItem {
  id: string;
  title: string;
  sequence_number: string | null;
  role: 'creator' | 'editor' | 'both';
  amount: number;
  status: string;
}

export interface ContentFinancialSummary {
  total_en_proceso: number;
  total_pendiente: number;
  total_pagado: number;
  count_en_proceso: number;
  count_pendiente: number;
  count_pagado: number;
  items_pagado: ContentFinancialItem[];
  items_pendiente: ContentFinancialItem[];
  items_en_proceso: ContentFinancialItem[];
}

const IN_PROGRESS_STATUSES = [
  'draft', 'script_pending', 'script_approved', 'assigned',
  'recording', 'recorded', 'editing', 'review', 'issue', 'corrected',
  'delivered', // entregado al cliente pero pendiente de aprobación — aún no se paga
];
const PENDING_PAYMENT_STATUSES = ['approved']; // único status que genera pago
const PAID_STATUSES = ['paid'];

export function useContentFinancialSummary(organizationId: string, userId: string) {
  return useQuery({
    queryKey: ['content-financial-summary', organizationId, userId],
    staleTime: 0,
    queryFn: async (): Promise<ContentFinancialSummary> => {
      const { data, error } = await supabase
        .from('content')
        .select('id, title, sequence_number, status, creator_id, editor_id, creator_payment, editor_payment, creator_paid, editor_paid')
        .eq('organization_id', organizationId)
        .or(`creator_id.eq.${userId},editor_id.eq.${userId}`);

      if (error) throw error;

      const summary: ContentFinancialSummary = {
        total_en_proceso: 0, total_pendiente: 0, total_pagado: 0,
        count_en_proceso: 0, count_pendiente: 0, count_pagado: 0,
        items_pagado: [], items_pendiente: [], items_en_proceso: [],
      };

      for (const row of data ?? []) {
        const isCreator = row.creator_id === userId;
        const isEditor  = row.editor_id  === userId;

        // Convertir a number explícitamente — PostgREST puede devolver numeric como string
        const amount =
          (isCreator ? Number(row.creator_payment ?? 0) : 0) +
          (isEditor  ? Number(row.editor_payment  ?? 0) : 0);

        if (amount <= 0) continue;

        const isPaid =
          PAID_STATUSES.includes(row.status) ||
          (isCreator && (row.creator_paid ?? false)) ||
          (isEditor  && (row.editor_paid  ?? false));

        const role: ContentFinancialItem['role'] =
          isCreator && isEditor ? 'both' : isCreator ? 'creator' : 'editor';

        const item: ContentFinancialItem = {
          id: row.id,
          title: row.title ?? 'Sin título',
          sequence_number: (row as any).sequence_number ?? null,
          role,
          amount,
          status: row.status,
        };

        if (isPaid) {
          summary.total_pagado += amount;
          summary.count_pagado++;
          summary.items_pagado.push(item);
        } else if (PENDING_PAYMENT_STATUSES.includes(row.status)) {
          summary.total_pendiente += amount;
          summary.count_pendiente++;
          summary.items_pendiente.push(item);
        } else if (IN_PROGRESS_STATUSES.includes(row.status)) {
          summary.total_en_proceso += amount;
          summary.count_en_proceso++;
          summary.items_en_proceso.push(item);
        }
      }

      return summary;
    },
    enabled: !!organizationId && !!userId,
  });
}

// ─── Resumen de nómina (vista global para admins) ─────────────────────────────

export interface PayrollItem {
  id: string;
  title: string;
  sequence_number: string | null;
  role: 'creator' | 'editor';
  amount: number;
}

export interface PayrollEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_pending: number;
  project_count: number;
  items: PayrollItem[];
}

export function usePayrollSummary(organizationId: string) {
  return useQuery({
    queryKey: ['payroll-summary', organizationId],
    staleTime: 0, // siempre refetch — los precios cambian en tiempo real
    queryFn: async (): Promise<PayrollEntry[]> => {
      const { data: rows, error } = await supabase
        .from('content')
        .select('id, title, sequence_number, creator_id, editor_id, creator_payment, editor_payment, creator_paid, editor_paid')
        .eq('organization_id', organizationId)
        .in('status', ['approved']);

      if (error) throw error;

      const userIds = new Set<string>();
      for (const row of rows ?? []) {
        if (row.creator_id && !row.creator_paid && Number(row.creator_payment ?? 0) > 0)
          userIds.add(row.creator_id);
        if (row.editor_id && !row.editor_paid && Number(row.editor_payment ?? 0) > 0)
          userIds.add(row.editor_id);
      }

      if (userIds.size === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', [...userIds]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const entryMap = new Map<string, PayrollEntry>();

      const getEntry = (userId: string): PayrollEntry => {
        if (!entryMap.has(userId)) {
          const p = profileMap.get(userId);
          entryMap.set(userId, {
            user_id: userId,
            full_name: p?.full_name ?? 'Usuario',
            avatar_url: p?.avatar_url ?? null,
            total_pending: 0,
            project_count: 0,
            items: [],
          });
        }
        return entryMap.get(userId)!;
      };

      for (const row of rows ?? []) {
        if (row.creator_id && !row.creator_paid) {
          const amount = Number(row.creator_payment ?? 0);
          if (amount > 0) {
            const e = getEntry(row.creator_id);
            e.total_pending += amount;
            e.project_count++;
            e.items.push({ id: row.id, title: row.title ?? 'Sin título', sequence_number: (row as any).sequence_number ?? null, role: 'creator', amount });
          }
        }
        if (row.editor_id && !row.editor_paid) {
          const amount = Number(row.editor_payment ?? 0);
          if (amount > 0) {
            const e = getEntry(row.editor_id);
            e.total_pending += amount;
            e.project_count++;
            e.items.push({ id: row.id, title: row.title ?? 'Sin título', sequence_number: (row as any).sequence_number ?? null, role: 'editor', amount });
          }
        }
      }

      return [...entryMap.values()].sort((a, b) => b.total_pending - a.total_pending);
    },
    enabled: !!organizationId,
  });
}

// ─── Contenido pendiente de liquidar (para el selector de proyectos) ──────────

export interface PendingContentItem {
  id: string;
  title: string;
  sequence_number: string | null;
  role: 'creator' | 'editor';
  payment_amount: number;
  status: string;
  delivered_at: string | null;
  already_linked: boolean;
}

export function usePendingContentForUser(organizationId: string, userId: string) {
  return useQuery({
    queryKey: ['pending-content-payment', organizationId, userId],
    staleTime: 0,
    queryFn: async (): Promise<PendingContentItem[]> => {
      // Fetch content aprobado/entregado y payments existentes en paralelo
      const [creatorRes, editorRes, paymentsRes] = await Promise.all([
        supabase
          .from('content')
          .select('id, title, sequence_number, creator_payment, status, delivered_at')
          .eq('organization_id', organizationId)
          .eq('creator_id', userId)
          .in('status', [...PENDING_PAYMENT_STATUSES])
          .neq('creator_paid', true)
          .gt('creator_payment', 0)
          .order('delivered_at', { ascending: false })
          .limit(100),
        supabase
          .from('content')
          .select('id, title, sequence_number, editor_payment, status, delivered_at')
          .eq('organization_id', organizationId)
          .eq('editor_id', userId)
          .in('status', [...PENDING_PAYMENT_STATUSES])
          .neq('editor_paid', true)
          .gt('editor_payment', 0)
          .order('delivered_at', { ascending: false })
          .limit(100),
        // IDs de contenido ya vinculados a pagos no cancelados
        supabase
          .from('talent_payments')
          .select('content_ids')
          .eq('organization_id', organizationId)
          .eq('user_id', userId)
          .neq('status', 'cancelled'),
      ]);

      // Construir set de content_ids ya vinculados
      const linkedIds = new Set<string>();
      for (const row of paymentsRes.data ?? []) {
        for (const id of row.content_ids ?? []) {
          linkedIds.add(id);
        }
      }

      const seen = new Set<string>();
      const items: PendingContentItem[] = [];

      for (const row of creatorRes.data ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        items.push({
          id: row.id,
          title: row.title ?? 'Sin título',
          sequence_number: (row as any).sequence_number ?? null,
          role: 'creator',
          payment_amount: Number(row.creator_payment ?? 0),
          status: row.status,
          delivered_at: row.delivered_at ?? null,
          already_linked: linkedIds.has(row.id),
        });
      }

      for (const row of editorRes.data ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        items.push({
          id: row.id,
          title: row.title ?? 'Sin título',
          sequence_number: (row as any).sequence_number ?? null,
          role: 'editor',
          payment_amount: Number(row.editor_payment ?? 0),
          status: row.status,
          delivered_at: row.delivered_at ?? null,
          already_linked: linkedIds.has(row.id),
        });
      }

      return items;
    },
    enabled: !!organizationId && !!userId,
  });
}

// ─── Detalles de contenido dentro de una liquidación ─────────────────────────

export interface ClosureContentDetail {
  id: string;
  title: string;
  sequence_number: string | null;
  client_name: string | null;
  approved_at: string | null;
  creator_payment: number | null;
  editor_payment: number | null;
}

export function useClosureContentDetails(contentIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['closure-content-details', ...contentIds],
    staleTime: 0,
    enabled: enabled && contentIds.length > 0,
    queryFn: async (): Promise<ClosureContentDetail[]> => {
      const { data, error } = await supabase
        .from('content')
        .select('id, title, sequence_number, approved_at, creator_payment, editor_payment, clients(name)')
        .in('id', contentIds);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? 'Sin título',
        sequence_number: (row as any).sequence_number ?? null,
        client_name: (row as any).clients?.name ?? null,
        approved_at: (row as any).approved_at ?? null,
        creator_payment: row.creator_payment != null ? Number(row.creator_payment) : null,
        editor_payment: row.editor_payment != null ? Number(row.editor_payment) : null,
      }));
    },
  });
}

// ─── Pagos vencidos (payment_date < hoy y no pagados) ────────────────────────

export interface OverduePayment {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_date: string;
  description: string | null;
  days_overdue: number;
}

export function useOverduePayments(organizationId: string) {
  return useQuery({
    queryKey: ['overdue-payments', organizationId],
    staleTime: 0,
    queryFn: async (): Promise<OverduePayment[]> => {
      const today = new Date().toISOString().split('T')[0];
      const { data: payments, error } = await supabase
        .from('talent_payments')
        .select('id, user_id, amount, currency, status, payment_date, description')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'processing'])
        .lt('payment_date', today)
        .order('payment_date', { ascending: true });

      if (error) throw error;
      if (!payments || payments.length === 0) return [];

      const userIds = [...new Set(payments.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const now = Date.now();

      return payments.map((p) => {
        const profile = profileMap.get(p.user_id);
        const payDate = new Date(p.payment_date).getTime();
        const days = Math.floor((now - payDate) / (1000 * 60 * 60 * 24));
        return {
          id: p.id,
          user_id: p.user_id,
          full_name: profile?.full_name ?? 'Usuario',
          avatar_url: profile?.avatar_url ?? null,
          amount: Number(p.amount),
          currency: p.currency ?? 'COP',
          status: p.status as PaymentStatus,
          payment_date: p.payment_date,
          description: p.description,
          days_overdue: days,
        };
      });
    },
    enabled: !!organizationId,
  });
}

// ─── Historial de cierres pagados agrupados por mes ──────────────────────────

export interface MonthlyClosureGroup {
  month: string;    // formato 'YYYY-MM'
  label: string;    // formato 'Mayo 2026'
  total_paid: number;
  payment_count: number;
  payments: TalentPayment[];
}

export function usePaidClosuresByMonth(organizationId: string) {
  return useQuery({
    queryKey: ['paid-closures-by-month', organizationId],
    staleTime: 0,
    queryFn: async (): Promise<MonthlyClosureGroup[]> => {
      const { data, error } = await supabase
        .from('talent_payments')
        .select('*, payment_account:talent_payment_accounts(*)')
        .eq('organization_id', organizationId)
        .eq('status', 'paid')
        .order('payment_date', { ascending: false })
        .limit(500);

      if (error) throw error;

      const groups = new Map<string, MonthlyClosureGroup>();
      const fmt = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });

      for (const row of (data ?? []) as TalentPayment[]) {
        const date = new Date(row.payment_date ?? row.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!groups.has(monthKey)) {
          groups.set(monthKey, {
            month: monthKey,
            label: fmt.format(date).replace(/^\w/, (c) => c.toUpperCase()),
            total_paid: 0,
            payment_count: 0,
            payments: [],
          });
        }
        const g = groups.get(monthKey)!;
        g.total_paid += Number(row.amount);
        g.payment_count++;
        g.payments.push(row);
      }

      return [...groups.values()].sort((a, b) => b.month.localeCompare(a.month));
    },
    enabled: !!organizationId,
  });
}

// ─── Realtime centralizado para el módulo financiero ─────────────────────────
// Úsalo en cualquier vista financiera (nómina, wallet, tab pagos).
// Escucha cambios en content, talent_payments y talent_payment_accounts
// e invalida las queries relevantes para que la UI se actualice al instante.

export function useTalentFinanceRealtime(organizationId: string, userId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!organizationId) return;

    const channelId = userId
      ? `talent-finance-${organizationId}-${userId}`
      : `talent-finance-${organizationId}`;

    const channel = supabase
      .channel(channelId)
      // Cambios en contenido (precios, estado, paid flags)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'content',
        filter: `organization_id=eq.${organizationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['payroll-summary',            organizationId] });
        qc.invalidateQueries({ queryKey: ['content-financial-summary',  organizationId] });
        qc.invalidateQueries({ queryKey: ['pending-content-payment',    organizationId] });
        if (userId) {
          qc.invalidateQueries({ queryKey: ['content-financial-summary', organizationId, userId] });
          qc.invalidateQueries({ queryKey: ['pending-content-payment',   organizationId, userId] });
        }
      })
      // Cambios en pagos (nuevo, status, comprobante)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'talent_payments',
        filter: `organization_id=eq.${organizationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['monthly-closures',         organizationId] });
        qc.invalidateQueries({ queryKey: ['overdue-payments',         organizationId] });
        qc.invalidateQueries({ queryKey: ['paid-closures-by-month',   organizationId] });
        qc.invalidateQueries({ queryKey: ['talent-payments',          organizationId] });
        if (userId) {
          qc.invalidateQueries({ queryKey: ['talent-payments', organizationId, userId] });
        }
      })
      // Cambios en cuentas de cobro
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'talent_payment_accounts',
        filter: `organization_id=eq.${organizationId}`,
      }, () => {
        if (userId) {
          qc.invalidateQueries({ queryKey: ['talent-payment-accounts', organizationId, userId] });
        } else {
          qc.invalidateQueries({ queryKey: ['talent-payment-accounts', organizationId] });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [organizationId, userId, qc]);
}
