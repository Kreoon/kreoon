import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CreditCard, Loader2, CheckCircle2, AlertTriangle,
  Calendar, Package, ExternalLink
} from "lucide-react";

interface ClientPackage {
  id: string;
  name: string;
  content_quantity: number;
  hooks_per_video: number;
  total_value: number;
  paid_amount: number;
  payment_status: string;
  payment_due_date: string | null;
  currency?: string;
  is_active: boolean;
}

interface ClientPaymentModalProps {
  open: boolean;
  onClose: () => void;
  packages: ClientPackage[];
  clientName: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", COP: "$", EUR: "€", MXN: "$" };
const CURRENCY_LABELS: Record<string, string> = { USD: "USD", COP: "COP", EUR: "EUR", MXN: "MXN" };

function formatMoney(amount: number, currency = "USD") {
  const symbol = CURRENCY_SYMBOLS[currency] || "$";
  const label = CURRENCY_LABELS[currency] || currency;
  return `${symbol}${amount.toLocaleString("es-CO", { maximumFractionDigits: 0 })} ${label}`;
}

function DueDateBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const d = new Date(date);
  const overdue = isPast(d) && !isToday(d);
  const dueToday = isToday(d);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs",
      overdue ? "text-red-600 dark:text-red-400" :
      dueToday ? "text-orange-500 dark:text-orange-400" :
      "text-zinc-500 dark:text-zinc-400"
    )}>
      <Calendar className="h-3 w-3" />
      {overdue ? `Venció ${format(d, "d MMM", { locale: es })}` :
       dueToday ? "Vence hoy" :
       `Vence ${format(d, "d 'de' MMMM", { locale: es })}`}
    </span>
  );
}

export function ClientPaymentModal({ open, onClose, packages, clientName }: ClientPaymentModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const pendingPackages = packages.filter(
    p => p.payment_status !== "paid" && Math.max(0, Number(p.total_value) - Number(p.paid_amount)) > 0
  );

  const toggleAll = () => {
    if (selected.size === pendingPackages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingPackages.map(p => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const selectedPackages = pendingPackages.filter(p => selected.has(p.id));

  // Agrupar total por moneda para el resumen
  const totalByCurrency = selectedPackages.reduce<Record<string, number>>((acc, p) => {
    const cur = p.currency || "USD";
    const pending = Math.max(0, Number(p.total_value) - Number(p.paid_amount));
    acc[cur] = (acc[cur] || 0) + pending;
    return acc;
  }, {});

  const mixedCurrencies = Object.keys(totalByCurrency).length > 1;

  const handlePay = async () => {
    if (selected.size === 0) return;
    if (mixedCurrencies) {
      toast.error("Selecciona solo paquetes de la misma moneda para pagar en una sola transacción");
      return;
    }

    setLoading(true);
    try {
      const packageIds = Array.from(selected);
      const res = await supabase.functions.invoke("stripe-client-checkout", {
        body: { package_ids: packageIds },
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Error al crear sesión de pago");
      }

      const { url } = res.data as { url: string };
      if (!url) throw new Error("No se recibió la URL de pago");

      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message || "No se pudo iniciar el pago");
      setLoading(false);
    }
  };

  const allSelected = selected.size === pendingPackages.length && pendingPackages.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-500" />
            Pagos Pendientes
          </DialogTitle>
          <DialogDescription>
            Selecciona los paquetes a pagar de <strong>{clientName}</strong>
          </DialogDescription>
        </DialogHeader>

        {pendingPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm text-zinc-500">Todo al día — no hay pagos pendientes</p>
          </div>
        ) : (
          <>
            {/* Select all */}
            {pendingPackages.length > 1 && (
              <div
                className="flex items-center gap-2 px-1 cursor-pointer"
                onClick={toggleAll}
              >
                <Checkbox
                  checked={allSelected}
                  ref={(el) => el && (el as any).indeterminate !== undefined && ((el as any).indeterminate = someSelected)}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </span>
              </div>
            )}

            {/* Package list */}
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {pendingPackages.map(pkg => {
                const pending = Math.max(0, Number(pkg.total_value) - Number(pkg.paid_amount));
                const currency = pkg.currency || "USD";
                const isSelected = selected.has(pkg.id);
                const overdue = pkg.payment_due_date &&
                  isPast(new Date(pkg.payment_due_date)) &&
                  !isToday(new Date(pkg.payment_due_date));

                return (
                  <div
                    key={pkg.id}
                    onClick={() => toggleOne(pkg.id)}
                    className={cn(
                      "rounded-lg border p-3 cursor-pointer transition-all",
                      isSelected
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                        : overdue
                        ? "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/10 hover:border-red-400"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        className="mt-0.5 shrink-0 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        onClick={e => e.stopPropagation()}
                        onCheckedChange={() => toggleOne(pkg.id)}
                      />
                      <div className="flex-1 min-w-0">
                        {/* Name + overdue badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {pkg.name}
                          </span>
                          {overdue && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          )}
                        </div>

                        {/* Amounts row */}
                        <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
                          <div className="rounded bg-white dark:bg-zinc-800 px-1.5 py-1">
                            <p className="text-[9px] text-zinc-400">Total</p>
                            <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                              {formatMoney(Number(pkg.total_value), currency)}
                            </p>
                          </div>
                          <div className="rounded bg-green-50 dark:bg-green-950/30 px-1.5 py-1">
                            <p className="text-[9px] text-green-600 dark:text-green-400">Pagado</p>
                            <p className="text-[11px] font-medium text-green-700 dark:text-green-300">
                              {formatMoney(Number(pkg.paid_amount), currency)}
                            </p>
                          </div>
                          <div className="rounded bg-orange-50 dark:bg-orange-950/30 px-1.5 py-1">
                            <p className="text-[9px] text-orange-500">Pendiente</p>
                            <p className="text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                              {formatMoney(pending, currency)}
                            </p>
                          </div>
                        </div>

                        <DueDateBadge date={pkg.payment_due_date} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Total seleccionado + botón */}
            <div className="space-y-3">
              {selected.size > 0 && (
                <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                      {selected.size} paquete{selected.size > 1 ? "s" : ""} seleccionado{selected.size > 1 ? "s" : ""}
                    </span>
                    <div className="text-right">
                      {Object.entries(totalByCurrency).map(([cur, total]) => (
                        <p key={cur} className="text-sm font-bold text-purple-800 dark:text-purple-200">
                          {formatMoney(total, cur)}
                        </p>
                      ))}
                    </div>
                  </div>
                  {mixedCurrencies && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      ⚠ Monedas distintas — selecciona paquetes de la misma moneda
                    </p>
                  )}
                </div>
              )}

              <Button
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white h-10"
                disabled={selected.size === 0 || loading || mixedCurrencies}
                onClick={handlePay}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirigiendo a Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    {selected.size === 0
                      ? "Selecciona un paquete"
                      : `Pagar ${selected.size > 1 ? `${selected.size} paquetes` : "paquete"} con Stripe`}
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-start gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Serás redirigido a Stripe. Acepta Visa, Mastercard y Amex.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
