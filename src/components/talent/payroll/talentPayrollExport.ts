import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { PayrollEntry } from '@/hooks/useTalentPayments';
import type { MonthlyClosureEntry, ContentExportDetail, StatusDateMap } from './types';

export const STATUS_LABELS_ES: Record<string, string> = {
  pending:    'Pendiente',
  processing: 'En transferencia',
  paid:       'Pagado',
  cancelled:  'Cancelado',
};

// ─── Estados del kanban que se incluyen como columnas en el CSV ───────────────

export const KANBAN_STATUS_COLUMNS: { key: string; label: string }[] = [
  { key: 'draft',           label: 'Borrador'            },
  { key: 'script_pending',  label: 'Guión pendiente'     },
  { key: 'script_approved', label: 'Guión aprobado'      },
  { key: 'assigned',        label: 'Asignado'            },
  { key: 'recording',       label: 'Grabando'            },
  { key: 'recorded',        label: 'Grabado'             },
  { key: 'editing',         label: 'Editando'            },
  { key: 'review',          label: 'En revisión'         },
  { key: 'issue',           label: 'Con observación'     },
  { key: 'corrected',       label: 'Corregido'           },
  { key: 'delivered',       label: 'Entregado al cliente'},
  { key: 'approved',        label: 'Aprobado'            },
  { key: 'paid',            label: 'Pagado'              },
];

export const CSV_HEADERS = [
  'Sección',
  'Talento',
  'Estado liquidación',
  'Descripción liquidación',
  'Rol',
  '# Proyecto',
  'Título',
  'Cliente',
  'Monto (COP)',
  'Moneda',
  // Una columna por cada estado del kanban
  ...KANBAN_STATUS_COLUMNS.map((s) => `Fecha — ${s.label}`),
  'Fecha prevista pago',
  'Liquidación creada',
];

export async function exportDetailedPayrollToCSV(
  closures: MonthlyClosureEntry[],
  unpaid: PayrollEntry[],
) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const num = (v: number | null | undefined) => v != null ? v.toFixed(0) : '';
  const dt  = (d: string | null | undefined) =>
    d ? format(new Date(d), 'yyyy-MM-dd HH:mm') : '';

  // ── 1. Recopilar todos los IDs de contenido ───────────────────────────────
  const allIds = new Set<string>([
    ...closures.flatMap((c) => c.payment.content_ids ?? []),
    ...unpaid.flatMap((e) => e.items.map((i) => i.id)),
  ]);

  const detailMap = new Map<string, ContentExportDetail>();
  const statusDateMap: StatusDateMap = new Map();

  if (allIds.size > 0) {
    const idList = [...allIds];

    // ── 2a. Detalles de contenido + join cliente ──────────────────────────
    const { data: contentRows } = await supabase
      .from('content')
      .select('id, title, sequence_number, clients(name), creator_payment, editor_payment')
      .in('id', idList);

    for (const row of contentRows ?? []) {
      detailMap.set(row.id, {
        id: row.id,
        title: row.title ?? null,
        sequence_number: (row as any).sequence_number ?? null,
        client_name: (row as any).clients?.name ?? null,
        creator_payment: row.creator_payment != null ? Number(row.creator_payment) : null,
        editor_payment:  row.editor_payment  != null ? Number(row.editor_payment)  : null,
      });
    }

    // ── 2b. Historial completo de cambios de estado ───────────────────────
    // Usamos content_status_logs (más completo) con fallback a content_history.
    // Guardamos la ÚLTIMA fecha en que cada contenido llegó a cada estado
    // (un proyecto puede volver a 'issue' → 'corrected' → 'delivered' varias veces).
    const { data: statusLogs } = await supabase
      .from('content_status_logs')
      .select('content_id, to_status, moved_at')
      .in('content_id', idList)
      .order('moved_at', { ascending: true }); // asc → el último sobreescribe = fecha más reciente por estado

    for (const log of statusLogs ?? []) {
      if (!statusDateMap.has(log.content_id)) statusDateMap.set(log.content_id, {});
      if (log.to_status) statusDateMap.get(log.content_id)![log.to_status] = log.moved_at;
    }

    // Fallback a content_history para proyectos sin registros en status_logs
    const idsWithoutLogs = idList.filter((id) => !statusDateMap.has(id));
    if (idsWithoutLogs.length > 0) {
      const { data: historyRows } = await supabase
        .from('content_history')
        .select('content_id, new_status, created_at')
        .in('content_id', idsWithoutLogs)
        .order('created_at', { ascending: true });

      for (const h of historyRows ?? []) {
        if (!statusDateMap.has(h.content_id)) statusDateMap.set(h.content_id, {});
        if (h.new_status) statusDateMap.get(h.content_id)![h.new_status] = h.created_at;
      }
    }
  }

  // ── 3. Helper: fechas kanban como array ordenado por KANBAN_STATUS_COLUMNS ─
  function kanbanDates(contentId: string): string[] {
    const dates = statusDateMap.get(contentId) ?? {};
    return KANBAN_STATUS_COLUMNS.map((s) => esc(dt(dates[s.key])));
  }

  // ── 4. Construir filas ────────────────────────────────────────────────────
  const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm');
  const rows: string[] = [];

  rows.push(esc(`Nómina detallada — Kreoon — Generado el ${dateStr}`));
  rows.push(esc(`Proyectos incluidos: ${allIds.size} · Liquidaciones activas: ${closures.length} · Próximo cierre: ${unpaid.reduce((s, e) => s + e.project_count, 0)} proyectos`));
  rows.push('');
  rows.push(CSV_HEADERS.map(esc).join(','));

  // ─ Sección A: Liquidaciones activas ──────────────────────────────────────
  let totalA = 0;

  for (const { payment: p, full_name } of closures) {
    const contentIds = p.content_ids ?? [];
    const baseFields = [
      esc('Liquidación activa'),
      esc(full_name),
      esc(STATUS_LABELS_ES[p.status] ?? p.status),
      esc(p.description ?? ''),
    ];

    if (contentIds.length === 0) {
      rows.push([
        ...baseFields,
        esc(''), esc(''), esc(''), esc(''),
        num(p.amount), esc(p.currency),
        ...KANBAN_STATUS_COLUMNS.map(() => esc('')),
        esc(dt(p.payment_date)),
        esc(dt(p.created_at)),
      ].join(','));
      totalA += p.amount;
    } else {
      for (const cid of contentIds) {
        const d = detailMap.get(cid);
        const projectAmount = d
          ? ((d.creator_payment ?? 0) + (d.editor_payment ?? 0))
          : p.amount / contentIds.length;

        rows.push([
          ...baseFields,
          esc('Creador/Editor'),
          esc(d?.sequence_number ?? ''),
          esc(d?.title ?? cid),
          esc(d?.client_name ?? ''),
          num(projectAmount),
          esc(p.currency),
          ...kanbanDates(cid),
          esc(dt(p.payment_date)),
          esc(dt(p.created_at)),
        ].join(','));
        totalA += projectAmount;
      }
    }
  }

  // ─ Sección B: Próximo cierre — un fila por proyecto × rol ────────────────
  let totalB = 0;

  for (const entry of unpaid) {
    for (const item of entry.items) {
      const d = detailMap.get(item.id);
      rows.push([
        esc('Próximo cierre'),
        esc(entry.full_name),
        esc('Sin liquidar'),
        esc(''),
        esc(item.role === 'creator' ? 'Creador' : 'Editor'),
        esc(d?.sequence_number ?? item.sequence_number ?? ''),
        esc(d?.title ?? item.title),
        esc(d?.client_name ?? ''),
        num(item.amount),
        esc('COP'),
        ...kanbanDates(item.id),
        esc(''),
        esc(''),
      ].join(','));
      totalB += item.amount;
    }
  }

  // ── 5. Resumen ────────────────────────────────────────────────────────────
  rows.push('');
  rows.push(esc('=== RESUMEN ==='));
  rows.push([esc('Total liquidaciones activas'), num(totalA)].join(','));
  rows.push([esc('Total próximo cierre'),        num(totalB)].join(','));
  rows.push([esc('GRAN TOTAL'),                  num(totalA + totalB)].join(','));

  // ── 6. Descarga ───────────────────────────────────────────────────────────
  const csv  = '﻿' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `nomina_detallada_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
