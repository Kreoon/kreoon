import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientPackage, Product, PaymentStatus } from "@/types/database";
import {
  Save, Loader2, Handshake, Video, Zap, Users, Package,
  Plus, Minus, DollarSign, Clock, CheckCircle2, CircleDollarSign,
  StickyNote, ShoppingBag, Check, CalendarClock, CalendarCheck, AlertTriangle,
} from "lucide-react";
import { CurrencyInput, type CurrencyType } from "@/components/ui/currency-input";
import { cn } from "@/lib/utils";

interface ClientPackageDialogProps {
  clientId: string;
  package_?: ClientPackage | null;
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ── Selector de estado de pago ──────────────────────────────────────────────
const PAYMENT_OPTIONS: { value: PaymentStatus; label: string; desc: string; color: string; icon: React.ReactNode }[] = [
  {
    value: 'pending',
    label: 'Sin pagar',
    desc: 'El cliente no ha pagado nada aún',
    color: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    value: 'partial',
    label: 'Pago parcial',
    desc: 'El cliente pagó una parte',
    color: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    icon: <CircleDollarSign className="h-4 w-4" />,
  },
  {
    value: 'paid',
    label: 'Pagado completo',
    desc: 'El cliente pagó todo',
    color: 'border-green-500/50 bg-green-500/10 text-green-400',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
];

// ── Stepper numérico ─────────────────────────────────────────────────────────
function Stepper({
  label, description, icon, value, color, min = 1, max = 99,
  onChange,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  value: number;
  color: string;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", color)}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-foreground text-center leading-tight">{label}</p>
      <p className="text-[10px] text-muted-foreground text-center leading-tight">{description}</p>
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-6 w-6 flex items-center justify-center rounded-full border border-border bg-muted hover:bg-muted/80 disabled:opacity-30 transition-colors"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="text-xl font-bold w-8 text-center tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-6 w-6 flex items-center justify-center rounded-full border border-border bg-muted hover:bg-muted/80 disabled:opacity-30 transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function ClientPackageDialog({
  clientId,
  package_,
  products,
  open,
  onOpenChange,
  onSuccess,
}: ClientPackageDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    total_value: 0,
    currency: "COP" as CurrencyType,
    content_quantity: 1,
    hooks_per_video: 1,
    creators_count: 1,
    products_count: 1,
    product_ids: [] as string[],
    payment_status: "pending" as PaymentStatus,
    paid_amount: 0,
    paid_at: "",          // fecha real del pago (YYYY-MM-DD)
    payment_due_date: "", // fecha límite para pagar
    is_barter: false,
    notes: "",
  });

  useEffect(() => {
    if (package_) {
      setFormData({
        name: package_.name || "",
        description: package_.description || "",
        total_value: package_.total_value || 0,
        currency: ((package_ as any).currency as CurrencyType) || "COP",
        content_quantity: package_.content_quantity || 1,
        hooks_per_video: package_.hooks_per_video || 1,
        creators_count: package_.creators_count || 1,
        products_count: package_.products_count || 1,
        product_ids: package_.product_ids || [],
        payment_status: package_.payment_status || "pending",
        paid_amount: package_.paid_amount || 0,
        paid_at: package_.paid_at ? new Date(package_.paid_at).toISOString().split('T')[0] : "",
        payment_due_date: (package_ as any).payment_due_date || "",
        is_barter: package_.is_barter || false,
        notes: package_.notes || "",
      });
    } else {
      setFormData({
        name: "", description: "", total_value: 0, currency: "COP",
        content_quantity: 1, hooks_per_video: 1, creators_count: 1,
        products_count: 1, product_ids: [], payment_status: "pending",
        paid_amount: 0, paid_at: "", payment_due_date: "",
        is_barter: false, notes: "",
      });
    }
  }, [package_, open]);

  function handleProductToggle(productId: string) {
    setFormData(prev => {
      const included = prev.product_ids.includes(productId);
      const ids = included
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId];
      return { ...prev, product_ids: ids, products_count: ids.length || 1 };
    });
  }

  function handlePaidAmountChange(paid: number) {
    const clamped = Math.max(0, Math.min(paid, formData.total_value));
    setFormData(prev => ({
      ...prev,
      paid_amount: clamped,
      payment_status: clamped >= prev.total_value && prev.total_value > 0
        ? 'paid'
        : clamped > 0 ? 'partial' : 'pending',
    }));
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Falta el nombre", description: "Escribe un nombre para la campaña", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const isBarter = formData.is_barter;

      // Calcular paid_at: usar la fecha manual si existe, si no usar ahora para pagos completos
      let paid_at: string | null = null;
      if (isBarter) {
        paid_at = null;
      } else if (formData.paid_at) {
        paid_at = new Date(formData.paid_at + 'T12:00:00').toISOString();
      } else if (formData.payment_status === 'paid') {
        paid_at = new Date().toISOString();
      }

      const data = {
        client_id: clientId,
        name: formData.name,
        description: formData.description || null,
        total_value: isBarter ? 0 : formData.total_value,
        currency: formData.currency,
        content_quantity: formData.content_quantity,
        hooks_per_video: formData.hooks_per_video,
        creators_count: formData.creators_count,
        products_count: formData.product_ids.length || formData.products_count,
        product_ids: formData.product_ids,
        payment_status: isBarter ? 'paid' : formData.payment_status,
        paid_amount: isBarter ? 0 : formData.paid_amount,
        paid_at,
        payment_due_date: (!isBarter && formData.payment_due_date) ? formData.payment_due_date : null,
        is_barter: isBarter,
        notes: formData.notes || null,
      };

      if (package_) {
        const { error } = await supabase.from('client_packages').update(data).eq('id', package_.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_packages').insert(data);
        if (error) throw error;
      }

      toast({ title: package_ ? "Campaña guardada" : "Campaña creada", description: "Todo quedó guardado correctamente" });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Algo salió mal", description: "No se pudo guardar la campaña", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const paidPct = formData.total_value > 0
    ? Math.min(100, Math.round((formData.paid_amount / formData.total_value) * 100))
    : 0;
  const pendingAmount = Math.max(0, formData.total_value - formData.paid_amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[90dvh] flex flex-col gap-0 p-0 overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-500/15 via-blue-500/8 to-transparent px-5 pt-5 pb-4 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-base flex items-center gap-2">
                  {package_ ? "Editar campaña" : "Nueva campaña"}
                  {package_ && (
                    <span className="text-sm font-medium opacity-50">
                      #{String(package_.campaign_number).padStart(4, '0')}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground font-normal">
                  {package_ ? "Modifica los datos de esta campaña" : "Registra los datos de la campaña contratada"}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* ── Formulario con scroll ── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}
        >

          {/* ① Nombre */}
          <section className="space-y-2">
            <p className="text-sm font-bold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold shrink-0">1</span>
              ¿Cómo se llama esta campaña?
            </p>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Campaña UGC Q2 — Lanzamiento producto"
              className="text-sm"
              autoFocus
            />
          </section>

          {/* ② ¿Es canje? */}
          <section className="space-y-2">
            <p className="text-sm font-bold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold shrink-0">2</span>
              ¿El cliente paga con dinero o por canje?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Con dinero */}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_barter: false }))}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                  !formData.is_barter
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-border bg-card hover:border-border/80',
                )}
              >
                <DollarSign className={cn("h-6 w-6", !formData.is_barter ? 'text-blue-400' : 'text-muted-foreground')} />
                <div>
                  <p className={cn("text-sm font-bold", !formData.is_barter ? 'text-blue-300' : 'text-foreground')}>
                    Con dinero
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Transferencia, efectivo o tarjeta</p>
                </div>
                {!formData.is_barter && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>

              {/* Por canje */}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_barter: true }))}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                  formData.is_barter
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-border bg-card hover:border-border/80',
                )}
              >
                <Handshake className={cn("h-6 w-6", formData.is_barter ? 'text-amber-400' : 'text-muted-foreground')} />
                <div>
                  <p className={cn("text-sm font-bold", formData.is_barter ? 'text-amber-300' : 'text-foreground')}>
                    Por canje
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Paga con productos o servicios</p>
                </div>
                {formData.is_barter && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            </div>
          </section>

          {/* ③ Valor total — solo si NO es canje */}
          {!formData.is_barter && (
            <section className="space-y-2">
              <p className="text-sm font-bold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold shrink-0">3</span>
                ¿Cuánto vale la campaña en total?
              </p>
              <CurrencyInput
                value={formData.total_value}
                currency={formData.currency}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  total_value: value,
                  payment_status: prev.paid_amount >= value && value > 0 ? 'paid' : prev.paid_amount > 0 ? 'partial' : 'pending',
                }))}
                onCurrencyChange={(currency) => setFormData({ ...formData, currency })}
                placeholder="0"
              />
            </section>
          )}

          {/* ④ Qué incluye — steppers */}
          <section className="space-y-3">
            <p className="text-sm font-bold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold shrink-0">
                {formData.is_barter ? '3' : '4'}
              </span>
              ¿Qué incluye esta campaña?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stepper
                label="Videos"
                description="Cantidad de videos a entregar"
                icon={<Video className="h-4 w-4 text-purple-400" />}
                color="bg-purple-500/15"
                value={formData.content_quantity}
                onChange={(v) => setFormData({ ...formData, content_quantity: v })}
              />
              <Stepper
                label="Hooks por video"
                description="Versiones de intro por cada video"
                icon={<Zap className="h-4 w-4 text-yellow-400" />}
                color="bg-yellow-500/15"
                value={formData.hooks_per_video}
                onChange={(v) => setFormData({ ...formData, hooks_per_video: v })}
              />
              <Stepper
                label="Creadores"
                description="Cuántos creators participan"
                icon={<Users className="h-4 w-4 text-blue-400" />}
                color="bg-blue-500/15"
                value={formData.creators_count}
                onChange={(v) => setFormData({ ...formData, creators_count: v })}
              />
              <Stepper
                label="Productos"
                description={products.length > 0 ? "Selecciona abajo" : "Productos a mostrar"}
                icon={<Package className="h-4 w-4 text-green-400" />}
                color="bg-green-500/15"
                value={formData.product_ids.length || formData.products_count}
                onChange={(v) => setFormData({ ...formData, products_count: v })}
              />
            </div>
          </section>

          {/* ⑤ Productos a mostrar — chips */}
          {products.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Productos que se mostrarán en los videos
              </p>
              <div className="flex flex-wrap gap-2">
                {products.map(product => {
                  const selected = formData.product_ids.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductToggle(product.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                        selected
                          ? 'border-green-500/50 bg-green-500/10 text-green-400'
                          : 'border-border bg-muted/40 text-muted-foreground hover:border-border/80',
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {product.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ⑥ Estado de pago — solo si NO es canje */}
          {!formData.is_barter && (
            <section className="space-y-3">
              <p className="text-sm font-bold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold shrink-0">
                  {formData.is_barter ? '4' : '5'}
                </span>
                ¿Cuánto ha pagado el cliente?
              </p>

              {/* Botones de estado */}
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      payment_status: opt.value,
                      paid_amount: opt.value === 'paid' ? prev.total_value : opt.value === 'pending' ? 0 : prev.paid_amount,
                    }))}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center',
                      formData.payment_status === opt.value
                        ? opt.color + ' border-opacity-100'
                        : 'border-border bg-card hover:border-border/80',
                    )}
                  >
                    <div className={formData.payment_status === opt.value ? '' : 'text-muted-foreground'}>
                      {opt.icon}
                    </div>
                    <p className={cn(
                      'text-[11px] font-bold leading-tight',
                      formData.payment_status === opt.value ? '' : 'text-foreground',
                    )}>
                      {opt.label}
                    </p>
                  </button>
                ))}
              </div>

              {/* Monto pagado — solo si es pago parcial */}
              {formData.payment_status === 'partial' && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-400">¿Cuánto pagó exactamente?</p>
                  <Input
                    type="number"
                    value={formData.paid_amount || ""}
                    onChange={(e) => handlePaidAmountChange(Number(e.target.value))}
                    placeholder="0"
                    min={0}
                    max={formData.total_value}
                    className="text-sm"
                  />
                  {formData.total_value > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Pagado: <strong className="text-green-400">{paidPct}%</strong></span>
                        <span>Pendiente: <strong className="text-amber-400">{pendingAmount.toLocaleString()} {formData.currency}</strong></span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Fechas de pago ─────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Fecha en que pagó — visible si pagó algo */}
                {(formData.payment_status === 'paid' || formData.payment_status === 'partial') && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 space-y-2">
                    <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5" />
                      {formData.payment_status === 'partial' ? 'Fecha del pago parcial' : 'Fecha de pago'}
                    </p>
                    <Input
                      type="date"
                      value={formData.paid_at}
                      onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
                      className="text-sm h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      ¿Cuándo recibiste el pago?
                    </p>
                  </div>
                )}

                {/* Fecha límite — visible si aún hay saldo pendiente */}
                {(formData.payment_status === 'pending' || formData.payment_status === 'partial') && (
                  <div className={cn(
                    "rounded-xl border p-3 space-y-2",
                    formData.payment_due_date && new Date(formData.payment_due_date) < new Date()
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-amber-500/20 bg-amber-500/5"
                  )}>
                    <p className={cn(
                      "text-xs font-semibold flex items-center gap-1.5",
                      formData.payment_due_date && new Date(formData.payment_due_date) < new Date()
                        ? "text-red-400"
                        : "text-amber-400"
                    )}>
                      {formData.payment_due_date && new Date(formData.payment_due_date) < new Date()
                        ? <AlertTriangle className="h-3.5 w-3.5" />
                        : <CalendarClock className="h-3.5 w-3.5" />
                      }
                      Fecha límite de pago
                    </p>
                    <Input
                      type="date"
                      value={formData.payment_due_date}
                      onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
                      className="text-sm h-8"
                    />
                    {formData.payment_due_date ? (
                      <p className="text-[10px] text-muted-foreground">
                        {(() => {
                          const due = new Date(formData.payment_due_date + 'T00:00:00');
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          if (diff < 0) return <span className="text-red-400 font-semibold">⚠️ Vencido hace {Math.abs(diff)} días</span>;
                          if (diff === 0) return <span className="text-red-400 font-semibold">⚠️ Vence hoy</span>;
                          if (diff <= 3) return <span className="text-amber-400 font-semibold">⚡ Vence en {diff} días</span>;
                          return <span>Faltan {diff} días</span>;
                        })()}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        Define cuándo debe pagar el cliente
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ⑦ Descripción y notas — opcionales */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Detalles adicionales (opcionales)
            </p>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe de qué trata esta campaña..."
              rows={2}
              className="text-sm resize-none"
            />
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas internas (solo las ve el equipo)..."
              rows={2}
              className="text-sm resize-none"
            />
          </section>
        </div>

        {/* ── Footer con acciones ── */}
        <div className="border-t border-border px-5 py-4 flex items-center justify-between gap-3 shrink-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1 gap-2">
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Save className="h-4 w-4" />
            }
            {package_ ? "Guardar cambios" : "Crear campaña"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
