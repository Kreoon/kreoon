import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/finance-format';

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

export interface PackagePaymentRow {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
}

export interface PackageForInvoice {
  id: string;
  name: string;
  total_value: number;
  paid_amount: number;
  currency: string;
  payment_status: string;
  content_quantity: number;
  hooks_per_video: number;
  created_at: string;
}

const LEGAL_ENTITY = `
  <div style="font-size:11px;color:#6b7280;margin-top:4px;line-height:1.7">
    SICOMMER INT LLC &nbsp;·&nbsp; EIN 87-0943710<br/>
    19790 W Dixie Hwy, 11th Floor Unit 1115, Miami, FL 33180, USA<br/>
    Florida Limited Liability Company &nbsp;·&nbsp; founder@kreoon.com
  </div>`;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
  overdue: 'Vencido',
};

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

export function generatePackageInvoicePDF({
  pkg,
  payments,
  clientName,
  orgName,
}: {
  pkg: PackageForInvoice;
  payments: PackagePaymentRow[];
  clientName: string;
  orgName: string;
}) {
  const fmt = (n: number) => escapeHtml(formatCurrency(n, pkg.currency));
  const saldo = pkg.total_value - pkg.paid_amount;
  const pct = pkg.total_value > 0 ? Math.round((pkg.paid_amount / pkg.total_value) * 100) : 0;

  const paymentRows = payments.length === 0
    ? `<tr><td colspan="4" style="padding:16px;text-align:center;color:#9ca3af;font-style:italic">Sin pagos registrados</td></tr>`
    : payments.map(p => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;white-space:nowrap;color:#374151;font-size:13px">
        ${escapeHtml(fmtDate(p.payment_date))}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">
        ${escapeHtml(METHOD_LABELS[p.payment_method] ?? p.payment_method)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">
        ${p.reference_number ? escapeHtml(p.reference_number) : '<span style="color:#d1d5db">—</span>'}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;color:#16a34a;white-space:nowrap;font-size:13px">
        ${escapeHtml(formatCurrency(p.amount, p.currency))}
      </td>
    </tr>`).join('');

  const statusColor = pkg.payment_status === 'paid' ? '#16a34a' : pkg.payment_status === 'partial' ? '#d97706' : '#dc2626';
  const statusLabel = STATUS_LABELS[pkg.payment_status] ?? pkg.payment_status;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Factura Paquete — ${escapeHtml(pkg.name)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111; background:#fff; padding:40px; }
  @media print { body { padding:20px; } .no-print { display:none !important; } }
  .print-btn { display:inline-block; margin-bottom:24px; padding:10px 24px; background:#7c3aed; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; }
  .org-name { font-size:22px; font-weight:700; color:#111; }
  .doc-label { font-size:26px; font-weight:800; color:#7c3aed; text-align:right; }
  .doc-meta { font-size:13px; color:#6b7280; text-align:right; margin-top:4px; }
  .divider { border:none; border-top:2px solid #7c3aed; margin:24px 0; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
  .info-block label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; display:block; margin-bottom:4px; }
  .info-block .value { font-size:15px; font-weight:600; color:#111; }
  .package-box { background:#f5f3ff; border:1px solid #ede9fe; border-radius:8px; padding:20px; margin-bottom:28px; }
  .package-box .pkg-name { font-size:18px; font-weight:700; color:#4c1d95; margin-bottom:12px; }
  .pkg-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:12px; }
  .pkg-stat label { font-size:10px; text-transform:uppercase; color:#7c3aed; display:block; margin-bottom:3px; }
  .pkg-stat .val { font-size:17px; font-weight:800; color:#4c1d95; }
  .progress-wrap { margin-top:16px; }
  .progress-label { display:flex; justify-content:space-between; font-size:12px; color:#6b7280; margin-bottom:6px; }
  .progress-bar-bg { background:#ede9fe; border-radius:99px; height:8px; overflow:hidden; }
  .progress-bar-fill { background:#7c3aed; border-radius:99px; height:8px; }
  .status-badge { display:inline-block; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600; color:#fff; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  thead th { background:#7c3aed; color:#fff; padding:9px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
  thead th:last-child { text-align:right; }
  tbody tr:nth-child(even) { background:#f9fafb; }
  .summary-row td { padding:12px; font-weight:700; background:#f5f3ff !important; }
  .footer { text-align:center; font-size:12px; color:#9ca3af; margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; }
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
      <div class="doc-label">Factura de Paquete</div>
      <div class="doc-meta">Generado: ${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>

  <hr class="divider"/>

  <div class="info-grid">
    <div class="info-block">
      <label>Cliente</label>
      <div class="value">${escapeHtml(clientName)}</div>
    </div>
    <div class="info-block">
      <label>Estado del paquete</label>
      <div class="value">
        <span class="status-badge" style="background:${statusColor}">${escapeHtml(statusLabel)}</span>
      </div>
    </div>
  </div>

  <div class="package-box">
    <div class="pkg-name">${escapeHtml(pkg.name)}</div>
    <p style="font-size:12px;color:#6b7280">Contratado el ${fmtDate(pkg.created_at)} · ${pkg.content_quantity} contenido${pkg.content_quantity !== 1 ? 's' : ''} × ${pkg.hooks_per_video} hook${pkg.hooks_per_video !== 1 ? 's' : ''}</p>
    <div class="pkg-stats">
      <div class="pkg-stat">
        <label>Valor total</label>
        <div class="val">${fmt(pkg.total_value)}</div>
      </div>
      <div class="pkg-stat">
        <label>Pagado</label>
        <div class="val" style="color:#16a34a">${fmt(pkg.paid_amount)}</div>
      </div>
      <div class="pkg-stat">
        <label>Saldo pendiente</label>
        <div class="val" style="color:${saldo > 0 ? '#dc2626' : '#16a34a'}">${fmt(Math.max(0, saldo))}</div>
      </div>
    </div>
    <div class="progress-wrap">
      <div class="progress-label">
        <span>Avance de pago</span>
        <span>${pct}%</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>
  </div>

  <h3 style="font-size:14px;font-weight:700;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:.04em">Historial de Pagos</h3>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Método</th>
        <th>Referencia</th>
        <th style="text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${paymentRows}
      <tr class="summary-row">
        <td colspan="3" style="text-align:right;font-size:14px">TOTAL PAGADO</td>
        <td style="text-align:right;color:#16a34a;font-size:14px">${fmt(pkg.paid_amount)}</td>
      </tr>
    </tbody>
  </table>

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
