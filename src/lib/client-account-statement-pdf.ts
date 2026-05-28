import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/finance-format';
import type { ClientClosing } from '@/hooks/useClientBilling';
import type { PackageForInvoice } from '@/lib/client-package-invoice-pdf';

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

function fmt(n: number, currency: string): string {
  return escapeHtml(formatCurrency(n, currency));
}

function renderAmounts(map: Map<string, number>, color: string): string {
  if (map.size === 0) return `<div class="amount" style="color:#16a34a">${fmt(0, 'COP')}</div>`;
  return Array.from(map.entries())
    .map(([cur, amt]) => `<div class="amount" style="color:${color}">${fmt(amt, cur)}</div>`)
    .join('');
}

const CLOSING_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: '#d97706' },
  sent:  { label: 'Enviado',  color: '#2563eb' },
  paid:  { label: 'Pagado',   color: '#16a34a' },
};

const LEGAL_ENTITY = `
  <div style="font-size:11px;color:#6b7280;margin-top:4px;line-height:1.7">
    SICOMMER INT LLC &nbsp;·&nbsp; EIN 87-0943710<br/>
    19790 W Dixie Hwy, 11th Floor Unit 1115, Miami, FL 33180, USA<br/>
    Florida Limited Liability Company &nbsp;·&nbsp; founder@kreoon.com
  </div>`;

const PKG_STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pendiente', color: '#dc2626' },
  partial:  { label: 'Parcial',   color: '#d97706' },
  paid:     { label: 'Pagado',    color: '#16a34a' },
  overdue:  { label: 'Vencido',   color: '#dc2626' },
};

export function generateAccountStatementPDF({
  closings,
  packages,
  clientName,
  orgName,
}: {
  closings: ClientClosing[];
  packages: PackageForInvoice[];
  clientName: string;
  orgName: string;
}) {
  // ── Totales por moneda ─────────────────────────────────────
  const paidByCurrency = new Map<string, number>();
  for (const c of closings.filter(c => c.status === 'paid')) {
    paidByCurrency.set(c.currency, (paidByCurrency.get(c.currency) ?? 0) + c.total_amount);
  }
  for (const p of packages) {
    if (p.paid_amount > 0) {
      paidByCurrency.set(p.currency, (paidByCurrency.get(p.currency) ?? 0) + p.paid_amount);
    }
  }

  const pendingClosingsByCurrency = new Map<string, number>();
  for (const c of closings.filter(c => c.status !== 'paid')) {
    pendingClosingsByCurrency.set(c.currency, (pendingClosingsByCurrency.get(c.currency) ?? 0) + c.total_amount);
  }

  const saldoPaquetesByCurrency = new Map<string, number>();
  for (const p of packages) {
    if (p.payment_status !== 'paid') {
      const saldo = Math.max(0, p.total_value - p.paid_amount);
      if (saldo > 0) saldoPaquetesByCurrency.set(p.currency, (saldoPaquetesByCurrency.get(p.currency) ?? 0) + saldo);
    }
  }

  // ── Filas de tabla ──────────────────────────────────────────
  const closingRows = closings.length === 0
    ? `<tr><td colspan="4" style="padding:14px;text-align:center;color:#9ca3af;font-style:italic">Sin cierres registrados</td></tr>`
    : closings.map(c => {
        const st = CLOSING_STATUS[c.status] ?? { label: c.status, color: '#6b7280' };
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:500;color:#111">${escapeHtml(c.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">${fmtDate(c.created_at)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;background:${st.color}">${escapeHtml(st.label)}</span>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;color:#111;white-space:nowrap">${fmt(c.total_amount, c.currency)}</td>
        </tr>`;
      }).join('');

  const pkgRows = packages.length === 0
    ? `<tr><td colspan="5" style="padding:14px;text-align:center;color:#9ca3af;font-style:italic">Sin paquetes registrados</td></tr>`
    : packages.map(p => {
        const st = PKG_STATUS[p.payment_status] ?? { label: p.payment_status, color: '#6b7280' };
        const saldo = Math.max(0, p.total_value - p.paid_amount);
        const pct = p.total_value > 0 ? Math.round((p.paid_amount / p.total_value) * 100) : 0;
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
            <div style="font-weight:500;color:#111;font-size:13px">${escapeHtml(p.name)}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">${p.content_quantity} contenidos · ${pct}% pagado</div>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;background:${st.color}">${escapeHtml(st.label)}</span>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;text-align:right;white-space:nowrap">${fmt(p.total_value, p.currency)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#16a34a;text-align:right;white-space:nowrap">${fmt(p.paid_amount, p.currency)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;color:${saldo > 0 ? '#dc2626' : '#16a34a'};text-align:right;white-space:nowrap">${fmt(saldo, p.currency)}</td>
        </tr>`;
      }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Estado de Cuenta — ${escapeHtml(clientName)}</title>
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
  .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:32px; }
  .kpi-card { background:#f5f3ff; border:1px solid #ede9fe; border-radius:8px; padding:16px; }
  .kpi-card label { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:#7c3aed; display:block; margin-bottom:6px; }
  .kpi-card .amount { font-size:20px; font-weight:800; color:#4c1d95; line-height:1.2; }
  .section-title { font-size:13px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.04em; margin-bottom:10px; margin-top:28px; }
  table { width:100%; border-collapse:collapse; margin-bottom:8px; }
  thead th { background:#7c3aed; color:#fff; padding:9px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
  thead th.r { text-align:right; }
  thead th.c { text-align:center; }
  tbody tr:nth-child(even) { background:#f9fafb; }
  .footer { text-align:center; font-size:12px; color:#9ca3af; margin-top:36px; padding-top:16px; border-top:1px solid #e5e7eb; }
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
      <div class="doc-label">${escapeHtml(clientName)}</div>
      <div class="doc-meta">Generado: ${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>

  <hr class="divider"/>

  <div class="kpi-grid">
    <div class="kpi-card">
      <label>Total pagado</label>
      ${renderAmounts(paidByCurrency, '#16a34a')}
    </div>
    <div class="kpi-card">
      <label>Cierres pendientes</label>
      ${renderAmounts(pendingClosingsByCurrency, '#d97706')}
    </div>
    <div class="kpi-card">
      <label>Saldo en paquetes</label>
      ${renderAmounts(saldoPaquetesByCurrency, '#dc2626')}
    </div>
  </div>

  <div class="section-title">Cierres de Cuenta</div>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Fecha</th>
        <th class="c">Estado</th>
        <th class="r">Valor</th>
      </tr>
    </thead>
    <tbody>${closingRows}</tbody>
  </table>

  <div class="section-title">Paquetes Contratados</div>
  <table>
    <thead>
      <tr>
        <th>Paquete</th>
        <th class="c">Estado</th>
        <th class="r">Total</th>
        <th class="r">Pagado</th>
        <th class="r">Saldo</th>
      </tr>
    </thead>
    <tbody>${pkgRows}</tbody>
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
