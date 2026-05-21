import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TalentContentStatus =
  | 'paid'            // pagado (content.status = 'archived' con amount > 0, o talent_payment paid)
  | 'processing'      // en proceso (talent_payment creado, aún no paid)
  | 'pending_payment' // aprobado por cliente (content.status = 'approved'), sin pago aún
  | 'not_approved'    // aún no aprobado (draft, recording, editing, delivered, etc.)
  | 'barter';         // canje / valor $0 (content completado con amount = 0)

export interface TalentReportFilters {
  dateFrom: string;
  dateTo: string;
  status: 'all' | TalentContentStatus;
}

export interface TalentReportItem {
  id: string;
  date: string;
  client_name: string | null;
  project_title: string;
  sequence_number: string | null;
  content_type: string | null;
  content_status: string;   // valor real del enum content.status
  role: 'Creador' | 'Editor';
  amount: number;
  currency: string;
  status: TalentContentStatus;
  payment_date: string | null;
}

export interface TalentReportTotals {
  total_pagado: number;
  total_pendiente: number;
  count_by_status: Record<TalentContentStatus | 'all', number>;
  currency: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultFilters(): TalentReportFilters {
  const now = new Date();
  return {
    dateFrom: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], // inicio del año
    dateTo: now.toISOString().split('T')[0],
    status: 'all',
  };
}

type PaymentPriority = { status: string; payment_date: string | null };
const PAYMENT_PRIORITY: Record<string, number> = { paid: 3, processing: 2, pending: 1 };

function deriveStatus(
  contentStatus: string,   // content.status enum (archived, approved, draft, etc.)
  myAmount: number,
  paymentInfo: PaymentPriority | null,
): TalentContentStatus {
  // El talent_payment tiene prioridad sobre cualquier otra señal
  if (paymentInfo) {
    if (paymentInfo.status === 'paid') return 'paid';
    return 'processing';
  }

  // Sin talent_payment: derivar del estado del contenido
  // archived = fue aprobado por el cliente Y ya está pagado
  if (contentStatus === 'archived') {
    return myAmount === 0 ? 'barter' : 'paid';
  }

  // approved = cliente aprobó, pendiente de cobro
  if (contentStatus === 'approved') {
    return myAmount === 0 ? 'barter' : 'pending_payment';
  }

  // Cualquier otro estado = aún no aprobado (draft, recording, editing, delivered, issue, etc.)
  return 'not_approved';
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useTalentReports(
  organizationId: string,
  userId: string,
  externalFilters?: TalentReportFilters,
) {
  const [internalFilters, setInternalFilters] = useState<TalentReportFilters>(defaultFilters);
  const filters = externalFilters ?? internalFilters;

  const { data, isLoading } = useQuery({
    queryKey: ['talent-reports', organizationId, userId, filters],
    staleTime: 0,
    enabled: !!organizationId && !!userId,
    queryFn: async (): Promise<{ items: TalentReportItem[]; totals: TalentReportTotals }> => {

      // ── A: Todo el contenido del talento en el período ────────────────────
      const { data: contentRows, error: contentError } = await (supabase as any)
        .from('content')
        .select(`
          id, title, sequence_number, content_type, status,
          creator_id, editor_id, creator_payment, editor_payment,
          created_at, approved_at, paid_at,
          clients(name)
        `)
        .eq('organization_id', organizationId)
        .or(`creator_id.eq.${userId},editor_id.eq.${userId}`)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (contentError) throw contentError;

      // ── B: Todos los pagos del talento (sin filtro de fecha) ──────────────
      // Sin filtro de fecha para cruzar cualquier pago contra el contenido del período
      const { data: payments, error: payError } = await (supabase as any)
        .from('talent_payments')
        .select('id, status, payment_date, content_ids, currency')
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (payError) throw payError;

      // Construir mapa: content_id → { status, payment_date }
      const paymentMap = new Map<string, PaymentPriority>();
      for (const p of payments ?? []) {
        for (const cid of (p.content_ids ?? []) as string[]) {
          const existing = paymentMap.get(cid);
          const myP = PAYMENT_PRIORITY[p.status] ?? 0;
          const exP = existing ? (PAYMENT_PRIORITY[existing.status] ?? 0) : -1;
          if (myP > exP) {
            paymentMap.set(cid, { status: p.status, payment_date: p.payment_date ?? null });
          }
        }
      }

      // ── C: Construir items unificados ─────────────────────────────────────
      const allItems: TalentReportItem[] = [];

      for (const row of contentRows ?? []) {
        const isCreator = row.creator_id === userId;
        const myAmount = isCreator
          ? (row.creator_payment != null ? Number(row.creator_payment) : 0)
          : (row.editor_payment != null ? Number(row.editor_payment) : 0);

        const contentStatus = String(row.status ?? '');
        const payInfo = paymentMap.get(row.id) ?? null;
        const status = deriveStatus(contentStatus, myAmount, payInfo);

        // Fecha más relevante: pago > aprobación > creación
        const displayDate = payInfo?.payment_date ?? row.paid_at ?? row.approved_at ?? row.created_at;

        allItems.push({
          id: row.id,
          date: displayDate,
          client_name: (row as any).clients?.name ?? null,
          project_title: row.title ?? 'Sin título',
          sequence_number: row.sequence_number ?? null,
          content_type: row.content_type ?? null,
          content_status: contentStatus,
          role: isCreator ? 'Creador' : 'Editor',
          amount: myAmount,
          currency: 'COP',
          status,
          payment_date: payInfo?.payment_date ?? null,
        });
      }

      // ── D: Filtrar por estado si aplica ───────────────────────────────────
      const items = filters.status === 'all'
        ? allItems
        : allItems.filter((i) => i.status === filters.status);

      // ── E: Totales (siempre sobre allItems, no sobre el filtrado) ─────────
      const paidItems = allItems.filter((i) => i.status === 'paid');
      const pendingItems = allItems.filter(
        (i) => i.status === 'pending_payment' || i.status === 'processing',
      );

      const countByStatus = allItems.reduce<Record<string, number>>(
        (acc, i) => { acc[i.status] = (acc[i.status] ?? 0) + 1; return acc; },
        {},
      );

      const totals: TalentReportTotals = {
        total_pagado: paidItems.reduce((s, i) => s + i.amount, 0),
        total_pendiente: pendingItems.reduce((s, i) => s + i.amount, 0),
        count_by_status: {
          all:             allItems.length,
          paid:            countByStatus['paid'] ?? 0,
          processing:      countByStatus['processing'] ?? 0,
          pending_payment: countByStatus['pending_payment'] ?? 0,
          not_approved:    countByStatus['not_approved'] ?? 0,
          barter:          countByStatus['barter'] ?? 0,
        },
        currency: 'COP',
      };

      return { items, totals };
    },
  });

  return {
    items: data?.items ?? [],
    totals: data?.totals ?? {
      total_pagado: 0,
      total_pendiente: 0,
      count_by_status: { all: 0, paid: 0, processing: 0, pending_payment: 0, not_approved: 0, barter: 0 },
      currency: 'COP',
    },
    isLoading,
    filters,
    setFilters: setInternalFilters,
  };
}
