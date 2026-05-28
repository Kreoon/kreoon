import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TalentPayment } from '@/types/talentPayments.types';

export interface PaymentReceiptContentItem {
  content_id: string;
  title: string;
  sequence_number: string | null;
  client_name: string | null;
  amount: number;
  currency: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtDate(d: string): string {
  try { return format(parseISO(d), "d 'de' MMMM yyyy", { locale: es }); }
  catch { return d; }
}

function fmtCurrency(n: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

const LEGAL_ENTITY = `
  <div style="font-size:11px;color:#6b7280;margin-top:4px;line-height:1.7">
    SICOMMER INT LLC &nbsp;·&nbsp; EIN 87-0943710<br/>
    19790 W Dixie Hwy, 11th Floor Unit 1115, Miami, FL 33180, USA<br/>
    Florida Limited Liability Company &nbsp;·&nbsp; founder@kreoon.com
  </div>`;

const METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia bancaria',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  efectivo: 'Efectivo',
  paypal: 'PayPal',
  wise: 'Wise',
  stripe: 'Stripe',
  otro: 'Otro',
};

export function generatePaymentReceiptPDF({
  payment,
  contentItems,
  talentName,
  orgName,
}: {
  payment: TalentPayment;
  contentItems: PaymentReceiptContentItem[];
  talentName: string;
  orgName: string;
}) {
  const currency = payment.currency ?? 'COP';
  const fmt = (n: number) => escapeHtml(fmtCurrency(n, currency));
  const methodLabel = (payment as any).payment_method
    ? escapeHtml(METHOD_LABELS[(payment as any).payment_method] ?? (payment as any).payment_method)
    : '—';

  const itemRows = contentItems.length === 0
    ? `<tr><td colspan="4" style="padding:14px;text-align:center;color:#9ca3af;font-style:italic">Sin proyectos asociados</td></tr>`
    : contentItems.map((item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;white-space:nowrap;color:#6b7280;font-size:12px;font-family:monospace">
        ${item.sequence_number ? escapeHtml(item.sequence_number) : '<span style="color:#d1d5db">—</span>'}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:500;color:#111;font-size:13px">
        ${escapeHtml(item.title)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">
        ${item.client_name ? escapeHtml(item.client_name) : '<span style="color:#d1d5db">—</span>'}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;color:#16a34a;white-space:nowrap;font-size:13px">
        ${fmt(item.amount)}
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Comprobante de Pago — ${escapeHtml(talentName)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111; background:#fff; padding:40px; }
  @media print { body { padding:20px; } .no-print { display:none !important; } tr { page-break-inside:avoid; } }
  .print-btn { display:inline-block; margin-bottom:24px; padding:10px 24px; background:#7c3aed; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; }
  .org-name { font-size:22px; font-weight:700; color:#111; }
  .doc-label { font-size:26px; font-weight:800; color:#7c3aed; text-align:right; }
  .doc-meta { font-size:13px; color:#6b7280; text-align:right; margin-top:4px; }
  .divider { border:none; border-top:2px solid #7c3aed; margin:24px 0; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-bottom:28px; }
  .info-block label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; display:block; margin-bottom:4px; }
  .info-block .value { font-size:15px; font-weight:600; color:#111; }
  .amount-box { background:#f5f3ff; border:1px solid #ede9fe; border-radius:8px; padding:20px; margin-bottom:28px; display:flex; align-items:center; justify-content:space-between; }
  .amount-box .label { font-size:13px; color:#6b7280; }
  .amount-box .amount { font-size:32px; font-weight:800; color:#16a34a; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  thead th { background:#7c3aed; color:#fff; padding:9px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
  thead th:last-child { text-align:right; }
  tbody tr:nth-child(even) { background:#f9fafb; }
  .footer { text-align:center; font-size:12px; color:#9ca3af; margin-top:36px; padding-top:16px; border-top:1px solid #e5e7eb; }
  .legal { font-size:11px; color:#9ca3af; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:12px; margin-top:20px; }
</style>
</head>
<body>
  <button id="kreoon-print-btn" class="no-print print-btn">⬇ Guardar como PDF</button>

  <div class="header">
    <div>
      <div class="org-name">${escapeHtml(orgName)} <span style="font-size:14px;font-weight:500;color:#7c3aed">by UGC Colombia</span></div>
      ${LEGAL_ENTITY}
    </div>
    <div>
      <div class="doc-label">${escapeHtml(talentName)}</div>
      <div class="doc-meta">Generado: ${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>

  <hr class="divider"/>

  <div class="amount-box">
    <div>
      <div class="label">Monto pagado</div>
      ${payment.description ? `<p style="font-size:12px;color:#6b7280;margin-top:4px">${escapeHtml(payment.description)}</p>` : ''}
    </div>
    <div class="amount">${fmt(payment.amount)}</div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <label>Fecha de pago</label>
      <div class="value">${fmtDate(payment.payment_date ?? payment.created_at)}</div>
    </div>
    <div class="info-block">
      <label>Método</label>
      <div class="value">${methodLabel}</div>
    </div>
    <div class="info-block">
      <label>Moneda</label>
      <div class="value">${escapeHtml(currency)}</div>
    </div>
  </div>

  <h3 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:.04em">Proyectos Incluidos</h3>
  <table>
    <thead>
      <tr>
        <th>Secuencia</th>
        <th>Proyecto</th>
        <th>Cliente</th>
        <th style="text-align:right">Monto</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="legal">
    Este documento es un comprobante interno de pago emitido por ${escapeHtml(orgName)}. No tiene validez como factura fiscal.
    Para efectos tributarios, solicita la factura formal al equipo de finanzas.
  </div>

  <div class="footer">
    ${escapeHtml(orgName)} by UGC Colombia · SICOMMER INT LLC · EIN 87-0943710 · Miami, FL, USA · ${new Date().getFullYear()}
  </div>
<script>
    document.getElementById('kreoon-print-btn').addEventListener('click', function() {
      window.print();
    });
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
