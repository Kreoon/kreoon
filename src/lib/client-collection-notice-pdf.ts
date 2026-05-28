import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/finance-format';
import type { BillingItem } from '@/hooks/useClientBilling';
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
  try { return format(parseISO(d), "d 'de' MMMM 'de' yyyy", { locale: es }); }
  catch { return d; }
}

function fmt(n: number, currency: string): string {
  return escapeHtml(formatCurrency(n, currency));
}

const LEGAL_ENTITY = `
  <div style="font-size:11px;color:#6b7280;margin-top:4px;line-height:1.7">
    SICOMMER INT LLC &nbsp;·&nbsp; EIN 87-0943710<br/>
    19790 W Dixie Hwy, 11th Floor Unit 1115, Miami, FL 33180, USA<br/>
    Florida Limited Liability Company &nbsp;·&nbsp; founder@kreoon.com
  </div>`;

function refNumber(): string {
  const d = new Date();
  return `CC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}

export function generateCollectionNoticePDF({
  pendingItems,
  pendingPackages,
  clientName,
  orgName,
}: {
  pendingItems: BillingItem[];
  pendingPackages: PackageForInvoice[];
  clientName: string;
  orgName: string;
}) {
  // Agrupa todo por moneda para el total
  const totalByCurrency = new Map<string, number>();

  for (const item of pendingItems) {
    totalByCurrency.set(item.currency, (totalByCurrency.get(item.currency) ?? 0) + item.price_client);
  }
  for (const pkg of pendingPackages) {
    const saldo = Math.max(0, pkg.total_value - pkg.paid_amount);
    if (saldo > 0) {
      totalByCurrency.set(pkg.currency, (totalByCurrency.get(pkg.currency) ?? 0) + saldo);
    }
  }

  const itemRows = pendingItems.map(item => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">
        ${escapeHtml(item.title)}
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">${item.item_type === 'fillmaker' ? 'Servicio Fillmaker' : 'Proyecto'}</div>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;color:#111;white-space:nowrap;font-size:13px">
        ${fmt(item.price_client, item.currency)}
      </td>
    </tr>`).join('');

  const pkgRows = pendingPackages
    .filter(p => Math.max(0, p.total_value - p.paid_amount) > 0)
    .map(p => {
      const saldo = Math.max(0, p.total_value - p.paid_amount);
      const pct = p.total_value > 0 ? Math.round((p.paid_amount / p.total_value) * 100) : 0;
      const statusNote = p.payment_status === 'partial'
        ? `Pago parcial (${pct}% abonado — saldo pendiente)`
        : 'Sin abono registrado';
      return `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">
        ${escapeHtml(p.name)}
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">Paquete / Campaña · ${statusNote}</div>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right;color:#dc2626;white-space:nowrap;font-size:13px">
        ${fmt(saldo, p.currency)}
      </td>
    </tr>`;
    }).join('');

  const allRows = itemRows + pkgRows;
  const totalRows = Array.from(totalByCurrency.entries()).map(([cur, amt]) => `
    <tr>
      <td style="padding:12px 14px;font-weight:700;font-size:15px;color:#111;background:#f5f3ff;border-top:2px solid #7c3aed">
        TOTAL A PAGAR ${totalByCurrency.size > 1 ? `(${cur})` : ''}
      </td>
      <td style="padding:12px 14px;font-weight:800;font-size:18px;color:#7c3aed;text-align:right;white-space:nowrap;background:#f5f3ff;border-top:2px solid #7c3aed">
        ${fmt(amt, cur)}
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Cuenta de Cobro — ${escapeHtml(clientName)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111; background:#fff; padding:40px; max-width:700px; margin:0 auto; }
  @media print { body { padding:20px; } .no-print { display:none !important; } tr { page-break-inside:avoid; } }
  .print-btn { display:inline-block; margin-bottom:28px; padding:10px 24px; background:#7c3aed; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
  .org-name { font-size:22px; font-weight:700; color:#111; }
  .doc-label { font-size:28px; font-weight:900; color:#7c3aed; text-align:right; letter-spacing:-.5px; }
  .doc-meta { font-size:12px; color:#6b7280; text-align:right; margin-top:5px; line-height:1.7; }
  .divider { border:none; border-top:3px solid #7c3aed; margin:20px 0; }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
  .party-block label { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#9ca3af; display:block; margin-bottom:5px; }
  .party-block .name { font-size:16px; font-weight:700; color:#111; }
  .party-block .sub { font-size:12px; color:#6b7280; margin-top:2px; }
  table { width:100%; border-collapse:collapse; margin-bottom:0; }
  thead th { background:#7c3aed; color:#fff; padding:10px 14px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
  thead th:last-child { text-align:right; }
  tbody tr:nth-child(even) { background:#fafafa; }
  .legal { font-size:11px; color:#9ca3af; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:12px 14px; margin-top:24px; line-height:1.6; }
  .footer { text-align:center; font-size:12px; color:#9ca3af; margin-top:28px; padding-top:14px; border-top:1px solid #e5e7eb; }
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
      <div class="doc-label">Cuenta de Cobro</div>
      <div class="doc-meta">
        Ref: ${escapeHtml(refNumber())}<br/>
        Fecha: ${fmtDate(new Date().toISOString())}
      </div>
    </div>
  </div>

  <hr class="divider"/>

  <div class="parties">
    <div class="party-block">
      <label>Cobrado por</label>
      <div class="name">${escapeHtml(orgName)} <span style="font-size:12px;font-weight:500;color:#7c3aed">by UGC Colombia</span></div>
      <div class="sub">SICOMMER INT LLC · EIN 87-0943710</div>
      <div class="sub">19790 W Dixie Hwy, Suite 1115, Miami, FL 33180</div>
    </div>
    <div class="party-block">
      <label>Cobrado a</label>
      <div class="name">${escapeHtml(clientName)}</div>
      <div class="sub">Cliente</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción del servicio</th>
        <th style="text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${allRows || `<tr><td colspan="2" style="padding:14px;text-align:center;color:#9ca3af;font-style:italic">Sin ítems pendientes</td></tr>`}
      ${totalRows}
    </tbody>
  </table>

  <div class="legal">
    Este documento es una cuenta de cobro por servicios de producción de contenido prestados por ${escapeHtml(orgName)}.
    No tiene validez como factura de venta. Para facturación fiscal, solicitar al equipo de finanzas.
    El pago debe realizarse dentro de los plazos acordados en el contrato de servicios.
  </div>

  <div class="footer">
    ${escapeHtml(orgName)} by UGC Colombia · SICOMMER INT LLC · ${fmtDate(new Date().toISOString())}
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
