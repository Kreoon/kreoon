import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TalentReportItem, TalentReportTotals, TalentReportFilters } from '@/hooks/useTalentReports';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtAmount(amount: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

function fmtDateShort(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

const STATUS_LABELS: Record<string, string> = {
  paid:            'Pagado',
  processing:      'En proceso',
  pending_payment: 'Aprobado · Por cobrar',
  not_approved:    'En producción',
  barter:          'Canje / $0',
};

const STATUS_COLORS: Record<string, string> = {
  paid:            '#16a34a',
  processing:      '#2563eb',
  pending_payment: '#d97706',
  not_approved:    '#6b7280',
  barter:          '#d97706',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  commercial:          'Comercial',
  ugc:                 'UGC',
  ambassador_internal: 'Embajador',
  organic:             'Orgánico',
};

export function generateTalentReportPDF(
  items: TalentReportItem[],
  totals: TalentReportTotals,
  talentName: string,
  filters: TalentReportFilters,
): void {
  const now = new Date();
  const periodoLabel = `${fmtDate(filters.dateFrom)} — ${fmtDate(filters.dateTo)}`;
  const generadoLabel = fmtDate(now.toISOString());
  const totalProjects = totals.count_by_status.all;

  const rowsHtml = items.map((item) => {
    const statusLabel = STATUS_LABELS[item.status] ?? item.status;
    const statusColor = STATUS_COLORS[item.status] ?? '#6b7280';
    const typeLabel = CONTENT_TYPE_LABELS[item.content_type ?? ''] ?? (item.content_type ?? '—');
    const amountStr = item.status === 'barter' ? '$0' : escapeHtml(fmtAmount(item.amount, item.currency));
    return `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap;color:#374151;font-size:12px">
        ${escapeHtml(fmtDateShort(item.date))}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px">
        ${item.client_name ? escapeHtml(item.client_name) : '<span style="color:#9ca3af">—</span>'}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;max-width:180px">
        <div style="font-weight:500;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${escapeHtml(item.project_title)}
        </div>
        ${item.sequence_number ? `<div style="font-size:10px;color:#9ca3af;font-family:monospace">${escapeHtml(item.sequence_number)}</div>` : ''}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:11px">
        ${escapeHtml(typeLabel)}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:11px;text-align:center">
        ${escapeHtml(item.role)}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;white-space:nowrap;font-size:12px;color:#111">
        ${amountStr}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center">
        <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;color:#fff;background:${statusColor}">
          ${escapeHtml(statusLabel)}
        </span>
      </td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Extracto de Proyectos — ${escapeHtml(talentName)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111; background:#fff; padding:40px; }
  @media print {
    body { padding:20px; }
    .no-print { display:none !important; }
    table { page-break-inside:auto; }
    tr { page-break-inside:avoid; }
  }
  .print-btn { display:inline-block; margin-bottom:24px; padding:10px 24px; background:#7c3aed; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; }
  .brand { font-size:24px; font-weight:800; color:#7c3aed; letter-spacing:-0.5px; }
  .report-title { font-size:13px; color:#6b7280; margin-top:4px; }
  .meta-block { text-align:right; }
  .meta-block .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#9ca3af; }
  .meta-block .value { font-size:14px; font-weight:600; color:#111; }
  .divider { border:none; border-top:2px solid #7c3aed; margin:20px 0; }
  .talent-section { display:flex; gap:40px; margin-bottom:28px; }
  .talent-section .block label { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#9ca3af; display:block; margin-bottom:3px; }
  .talent-section .block .val { font-size:14px; font-weight:600; color:#111; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; font-size:12px; }
  thead th { background:#7c3aed; color:#fff; padding:9px 10px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
  thead th:nth-child(6) { text-align:right; }
  thead th:nth-child(5),thead th:nth-child(7) { text-align:center; }
  tbody tr:nth-child(even) { background:#f9fafb; }
  .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:28px; }
  .summary-card { background:#f5f3ff; border:1px solid #ede9fe; border-radius:8px; padding:14px 16px; }
  .summary-card .sc-label { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#7c3aed; margin-bottom:4px; }
  .summary-card .sc-value { font-size:18px; font-weight:800; color:#4c1d95; }
  .summary-card .sc-sub { font-size:10px; color:#9ca3af; margin-top:2px; }
  .footer { text-align:center; font-size:11px; color:#9ca3af; margin-top:28px; padding-top:14px; border-top:1px solid #e5e7eb; }
  .empty-state { text-align:center; padding:40px 0; color:#9ca3af; font-size:13px; }
</style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">Imprimir / Guardar como PDF</button>

  <div class="header">
    <div>
      <div class="brand">Kreoon</div>
      <div class="report-title">Extracto de Proyectos y Pagos</div>
    </div>
    <div class="meta-block">
      <div class="label">Generado</div>
      <div class="value">${escapeHtml(generadoLabel)}</div>
    </div>
  </div>

  <hr class="divider"/>

  <div class="talent-section">
    <div class="block">
      <label>Talento</label>
      <div class="val">${escapeHtml(talentName)}</div>
    </div>
    <div class="block">
      <label>Período</label>
      <div class="val">${escapeHtml(periodoLabel)}</div>
    </div>
    <div class="block">
      <label>Total proyectos</label>
      <div class="val">${totalProjects}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="sc-label">Total cobrado</div>
      <div class="sc-value">${escapeHtml(fmtAmount(totals.total_pagado))}</div>
      <div class="sc-sub">${totals.count_by_status.paid} pagos completados</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Por cobrar</div>
      <div class="sc-value">${escapeHtml(fmtAmount(totals.total_pendiente))}</div>
      <div class="sc-sub">${totals.count_by_status.pending_payment + totals.count_by_status.processing} proyectos aprobados</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Sin aprobar</div>
      <div class="sc-value">${totals.count_by_status.not_approved}</div>
      <div class="sc-sub">proyectos en revisión</div>
    </div>
  </div>

  ${items.length === 0
    ? '<div class="empty-state">No hay proyectos para el filtro seleccionado.</div>'
    : `<table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Cliente</th>
        <th>Proyecto</th>
        <th>Tipo</th>
        <th style="text-align:center">Rol</th>
        <th style="text-align:right">Monto</th>
        <th style="text-align:center">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>`}

  <div class="footer">
    Generado por Kreoon &middot; kreoon.com &middot; ${now.getFullYear()}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1000,height=750');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function getMonthDiff(dateFrom: string, dateTo: string): number {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1);
}

export function downloadTalentReportCSV(
  items: TalentReportItem[],
  totals: TalentReportTotals,
  talentName: string,
  filters: TalentReportFilters,
): void {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const rows: string[] = [];
  rows.push(esc(`# Reporte de proyectos - ${talentName}`));
  rows.push(esc(`# Período: ${filters.dateFrom} al ${filters.dateTo}`));
  rows.push(esc(`# Generado: ${format(new Date(), "yyyy-MM-dd HH:mm", { locale: es })}`));
  rows.push('');
  rows.push(
    ['Fecha', 'Cliente', 'Proyecto', 'Secuencia', 'Tipo', 'Rol', 'Monto', 'Moneda', 'Estado']
      .map(esc).join(','),
  );

  for (const item of items) {
    rows.push([
      esc(item.date ? format(new Date(item.date), 'yyyy-MM-dd') : ''),
      esc(item.client_name ?? ''),
      esc(item.project_title),
      esc(item.sequence_number ?? ''),
      esc(CONTENT_TYPE_LABELS[item.content_type ?? ''] ?? (item.content_type ?? '')),
      esc(item.role),
      item.status === 'barter' ? '0' : item.amount.toFixed(0),
      esc(item.currency),
      esc(STATUS_LABELS[item.status] ?? item.status),
    ].join(','));
  }

  rows.push('');
  rows.push(['', '', '', '', '', 'Total cobrado', totals.total_pagado.toFixed(0), 'COP', ''].join(','));
  rows.push(['', '', '', '', '', 'Por cobrar', totals.total_pendiente.toFixed(0), 'COP', ''].join(','));
  rows.push(['', '', '', '', '', 'Sin aprobar', String(totals.count_by_status.not_approved), '', ''].join(','));

  const csv = '﻿' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proyectos_${talentName.replace(/\s+/g, '_')}_${filters.dateFrom}_${filters.dateTo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
