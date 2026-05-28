import * as React from 'react';
import { useState } from 'react';
import { FileText, Download, Receipt, Package, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useClientOwnClosings,
  useClientOwnClosingItems,
  useClientOwnPackages,
  useClientOwnPackagePayments,
} from '@/hooks/useClientBilling';
import { generateClientInvoicePDF } from '@/lib/client-invoice-pdf';
import { generatePackageInvoicePDF } from '@/lib/client-package-invoice-pdf';
import { generateAccountStatementPDF } from '@/lib/client-account-statement-pdf';
import type { PackageForInvoice } from '@/lib/client-package-invoice-pdf';

interface ClientInvoicesTabProps {
  clientId: string;
  clientName: string;
  orgName: string;
}

const CLOSING_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'text-amber-400 bg-amber-500/15' },
  sent:  { label: 'Enviado',  color: 'text-blue-400 bg-blue-500/15' },
  paid:  { label: 'Pagado',   color: 'text-green-400 bg-green-500/15' },
};

const PKG_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'text-red-400 bg-red-500/15' },
  partial: { label: 'Parcial',   color: 'text-amber-400 bg-amber-500/15' },
  paid:    { label: 'Pagado',    color: 'text-green-400 bg-green-500/15' },
  overdue: { label: 'Vencido',   color: 'text-red-400 bg-red-500/15' },
};

function fmtDate(d: string) {
  try { return format(parseISO(d), "d 'de' MMMM yyyy", { locale: es }); }
  catch { return d; }
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; color: string }> }) {
  const cfg = map[status] ?? { label: status, color: 'text-white/50 bg-white/10' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', cfg.color)}>
      {cfg.label}
    </span>
  );
}

function ClosingRow({ closingId, closing, clientName, orgName }: {
  closingId: string;
  closing: ReturnType<typeof useClientOwnClosings>['data'] extends (infer T)[] | undefined ? T : never;
  clientName: string;
  orgName: string;
}) {
  const { data: items = [], isLoading } = useClientOwnClosingItems(closingId);

  function handleDownload() {
    if (!closing) return;
    generateClientInvoicePDF({ closing, items, clientName, orgName });
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{closing?.name}</p>
        <p className="text-xs text-white/50 mt-0.5">{closing ? fmtDate(closing.created_at) : ''}</p>
      </div>
      <StatusBadge status={closing?.status ?? 'draft'} map={CLOSING_STATUS} />
      <p className="text-sm font-bold text-white whitespace-nowrap">
        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: closing?.currency ?? 'COP', maximumFractionDigits: 0 }).format(closing?.total_amount ?? 0)}
      </p>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDownload}
        disabled={isLoading}
        className="h-8 gap-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 shrink-0"
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        PDF
      </Button>
    </div>
  );
}

function PackageRow({ pkg, clientName, orgName }: {
  pkg: NonNullable<ReturnType<typeof useClientOwnPackages>['data']>[number];
  clientName: string;
  orgName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: payments = [], isLoading } = useClientOwnPackagePayments(pkg.id);
  const pct = pkg.total_value > 0 ? Math.round((pkg.paid_amount / pkg.total_value) * 100) : 0;

  function handleDownload() {
    const pkgForInvoice: PackageForInvoice = {
      id: pkg.id,
      name: pkg.name,
      total_value: pkg.total_value,
      paid_amount: pkg.paid_amount,
      currency: pkg.currency,
      payment_status: pkg.payment_status,
      content_quantity: pkg.content_quantity,
      hooks_per_video: pkg.hooks_per_video,
      created_at: pkg.created_at,
    };
    generatePackageInvoicePDF({ pkg: pkgForInvoice, payments, clientName, orgName });
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: pkg.currency, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 py-3 px-4 hover:bg-white/8 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{pkg.name}</p>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 bg-white/10 rounded-full h-1.5 max-w-[120px]">
              <div className="bg-violet-500 rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-white/50">{pct}% pagado</span>
          </div>
        </div>
        <StatusBadge status={pkg.payment_status} map={PKG_STATUS} />
        <div className="text-right shrink-0">
          <p className="text-xs text-white/40">Saldo</p>
          <p className={cn('text-sm font-bold', pkg.paid_amount >= pkg.total_value ? 'text-green-400' : 'text-red-400')}>
            {fmt(Math.max(0, pkg.total_value - pkg.paid_amount))}
          </p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-white/40 shrink-0" /> : <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Valor total', value: fmt(pkg.total_value), color: 'text-white' },
              { label: 'Pagado', value: fmt(pkg.paid_amount), color: 'text-green-400' },
              { label: 'Saldo', value: fmt(Math.max(0, pkg.total_value - pkg.paid_amount)), color: pkg.paid_amount >= pkg.total_value ? 'text-green-400' : 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 rounded-lg p-2.5">
                <p className="text-xs text-white/40 mb-1">{label}</p>
                <p className={cn('text-sm font-bold', color)}>{value}</p>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Historial de pagos</p>
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-white/60 text-xs">{fmtDate(p.payment_date)}</span>
                  <span className="text-white/50 text-xs capitalize">{p.payment_method}</span>
                  <span className="text-green-400 font-semibold">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40 text-center py-2">Sin pagos registrados</p>
          )}

          <Button
            size="sm"
            onClick={handleDownload}
            disabled={isLoading}
            className="w-full gap-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar factura del paquete
          </Button>
        </div>
      )}
    </div>
  );
}

export function ClientInvoicesTab({ clientId, clientName, orgName }: ClientInvoicesTabProps) {
  const { data: closings = [], isLoading: loadingClosings } = useClientOwnClosings(clientId);
  const { data: packages = [], isLoading: loadingPackages } = useClientOwnPackages(clientId);

  function handleAccountStatement() {
    const pkgs: PackageForInvoice[] = packages.map((p) => ({
      id: p.id,
      name: p.name,
      total_value: p.total_value,
      paid_amount: p.paid_amount,
      currency: p.currency,
      payment_status: p.payment_status,
      content_quantity: p.content_quantity,
      hooks_per_video: p.hooks_per_video,
      created_at: p.created_at,
    }));
    generateAccountStatementPDF({ closings, packages: pkgs, clientName, orgName });
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-violet-400" />
            Mis Facturas
          </h2>
          <p className="text-sm text-white/50 mt-1">Descarga tus cobros, paquetes y estado de cuenta</p>
        </div>
        <Button
          onClick={handleAccountStatement}
          disabled={loadingClosings || loadingPackages}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
        >
          <FileText className="h-4 w-4" />
          Estado de cuenta
        </Button>
      </div>

      {/* Sección cierres */}
      <section>
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Cobros / Cierres
        </h3>
        {loadingClosings ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : closings.length === 0 ? (
          <div className="text-center py-10 text-white/40 text-sm">Sin cierres registrados</div>
        ) : (
          <div className="space-y-2">
            {closings.map((c) => (
              <ClosingRow
                key={c.id}
                closingId={c.id}
                closing={c}
                clientName={clientName}
                orgName={orgName}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sección paquetes */}
      <section>
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Mis Paquetes
        </h3>
        {loadingPackages ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-10 text-white/40 text-sm">Sin paquetes contratados</div>
        ) : (
          <div className="space-y-2">
            {packages.map((p) => (
              <PackageRow key={p.id} pkg={p} clientName={clientName} orgName={orgName} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
