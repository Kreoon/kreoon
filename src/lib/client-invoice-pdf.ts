import type { ClientClosing, BillingItem } from '@/hooks/useClientBilling';
import { formatCurrency } from '@/lib/finance-format';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface InvoiceData {
  closing: ClientClosing;
  items: BillingItem[];
  clientName: string;
  orgName: string;
}

export function generateClientInvoicePDF({ closing, items, clientName, orgName }: InvoiceData) {
  const fmt = (n: number) => formatCurrency(n, closing.currency);
  const fmtDate = (d: string) => {
    try { return format(parseISO(d), "d 'de' MMMM yyyy", { locale: es }); }
    catch { return d; }
  };

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
        <div style="font-weight:500;color:#111">${escapeHtml(item.title)}</div>
        ${item.description ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${escapeHtml(item.description ?? "")}</div>` : ''}
        ${item.item_type === 'fillmaker' ? '<div style="font-size:11px;color:#8b5cf6;margin-top:2px">Servicio de Grabación (Fillmaker)</div>' : ''}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:center;white-space:nowrap">
        ${fmtDate(item.item_date)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111;text-align:right;white-space:nowrap">
        ${fmt(item.price_client)}
      </td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Cobro — ${escapeHtml(clientName)} — ${escapeHtml(closing.name)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111; background:#fff; padding:40px; }
  @media print {
    body { padding:20px; }
    .no-print { display:none !important; }
  }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; }
  .org-name { font-size:22px; font-weight:700; color:#111; }
  .invoice-label { font-size:28px; font-weight:800; color:#7c3aed; text-align:right; }
  .invoice-meta { font-size:13px; color:#6b7280; text-align:right; margin-top:4px; }
  .divider { border:none; border-top:2px solid #7c3aed; margin:24px 0; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px; }
  .info-block label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; display:block; margin-bottom:4px; }
  .info-block .value { font-size:15px; font-weight:600; color:#111; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  thead th { background:#7c3aed; color:#fff; padding:10px 12px; text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:.05em; }
  thead th:last-child { text-align:right; }
  thead th:nth-child(2) { text-align:center; }
  tbody tr:nth-child(even) { background:#f9fafb; }
  .total-row { background:#f5f3ff !important; }
  .total-row td { padding:12px; font-weight:700; font-size:16px; }
  .notes { background:#f9fafb; border-left:4px solid #7c3aed; padding:12px 16px; margin-bottom:24px; border-radius:0 4px 4px 0; }
  .notes label { font-size:11px; text-transform:uppercase; color:#9ca3af; display:block; margin-bottom:4px; }
  .footer { text-align:center; font-size:12px; color:#9ca3af; margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; }
  .print-btn { display:inline-block; margin-bottom:24px; padding:10px 24px; background:#7c3aed; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; }
</style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">Imprimir / Guardar como PDF</button>

  <div class="header">
    <div>
      <div class="org-name">${escapeHtml(orgName)}</div>
    </div>
    <div>
      <div class="invoice-label">Cobro</div>
      <div class="invoice-meta">${escapeHtml(closing.name)}</div>
      <div class="invoice-meta">Generado: ${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>

  <hr class="divider"/>

  <div class="info-grid">
    <div class="info-block">
      <label>Facturar a</label>
      <div class="value">${escapeHtml(clientName)}</div>
    </div>
    <div class="info-block">
      <label>Moneda</label>
      <div class="value">${escapeHtml(closing.currency)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th style="text-align:center">Fecha</th>
        <th style="text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="2" style="text-align:right">TOTAL A COBRAR</td>
        <td style="text-align:right;color:#7c3aed">${fmt(closing.total_amount)}</td>
      </tr>
    </tbody>
  </table>

  ${closing.notes ? `
  <div class="notes">
    <label>Notas</label>
    <span style="font-size:13px;color:#374151">${escapeHtml(closing.notes ?? "")}</span>
  </div>` : ''}

  <div class="footer">
    Generado por Kreoon · ${new Date().getFullYear()}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
