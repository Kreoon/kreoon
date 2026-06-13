import { useState } from 'react';
import { Plus, Trash2, Tag, Percent, DollarSign, Calendar, Hash, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useAcademyCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  type AcademyCoupon,
  type CouponDiscountType,
  type CouponDuration,
  type CouponPlan,
} from '@/hooks/academy/useAcademyCoupons';

interface Props {
  spaceId: string;
  accentColor?: string;
}

export function CouponsAdminTab({ spaceId, accentColor = '#8B5CF6' }: Props) {
  const { data: coupons = [], isLoading } = useAcademyCoupons(spaceId);
  const [openCreate, setOpenCreate] = useState(false);
  const updateMutation = useUpdateCoupon(spaceId);
  const deleteMutation = useDeleteCoupon(spaceId);

  const handleToggleActive = async (coupon: AcademyCoupon) => {
    try {
      await updateMutation.mutateAsync({
        id: coupon.id,
        patch: { is_active: !coupon.is_active },
      });
      toast.success(coupon.is_active ? 'Cupón desactivado' : 'Cupón activado');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error');
    }
  };

  const handleDelete = async (coupon: AcademyCoupon) => {
    if (!confirm(`¿Eliminar el cupón ${coupon.code}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteMutation.mutateAsync(coupon.id);
      toast.success('Cupón eliminado');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-white/5 border-white/10">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4" style={{ color: accentColor }} />
              Cupones de descuento
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              Crea códigos que los visitantes pueden aplicar al suscribirse a tu academia.
            </p>
          </div>
          <Button
            onClick={() => setOpenCreate(true)}
            className="text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo cupón
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-12 text-center text-zinc-500">
          <Loader2 className="h-6 w-6 mx-auto animate-spin" />
        </Card>
      ) : coupons.length === 0 ? (
        <Card className="p-12 text-center text-zinc-500">
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-zinc-300">Aún no tienes cupones</p>
          <p className="text-xs mt-1">Crea el primero para empezar a hacer promociones.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {coupons.map((c) => (
            <CouponCard
              key={c.id}
              coupon={c}
              accentColor={accentColor}
              onToggle={() => handleToggleActive(c)}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}

      <CreateCouponDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        spaceId={spaceId}
        accentColor={accentColor}
      />
    </div>
  );
}

// ─── Card por cupón ──────────────────────────────────────────────────

function CouponCard({
  coupon,
  accentColor,
  onToggle,
  onDelete,
}: {
  coupon: AcademyCoupon;
  accentColor: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const discountText = coupon.discount_type === 'percentage'
    ? `${coupon.discount_value}% off`
    : `USD ${coupon.discount_value} off`;
  const durationText =
    coupon.duration === 'forever' ? 'Para siempre'
    : coupon.duration === 'once' ? 'Solo primer cobro'
    : `${coupon.duration_in_months} ${coupon.duration_in_months === 1 ? 'mes' : 'meses'}`;
  const planText = coupon.applies_to.includes('monthly') && coupon.applies_to.includes('yearly')
    ? 'Mensual + anual'
    : coupon.applies_to.includes('yearly') ? 'Solo anual'
    : 'Solo mensual';

  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div className="flex items-start gap-4">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}26` }}
        >
          {coupon.discount_type === 'percentage' ? (
            <Percent className="h-5 w-5" style={{ color: accentColor }} />
          ) : (
            <DollarSign className="h-5 w-5" style={{ color: accentColor }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="font-mono font-bold text-base">{coupon.code}</code>
            <Badge variant="outline" className="text-xs">{discountText}</Badge>
            <Badge variant="outline" className="text-xs">{durationText}</Badge>
            <Badge variant="outline" className="text-xs">{planText}</Badge>
            {!coupon.is_active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
          </div>
          <div className="text-xs text-zinc-500 mt-2 flex gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {coupon.redemptions_count}
              {coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ''} usos
            </span>
            {coupon.expires_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Vence {new Date(coupon.expires_at).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch checked={coupon.is_active} onCheckedChange={onToggle} />
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Eliminar">
            <Trash2 className="h-4 w-4 text-rose-400" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Dialog: crear cupón ─────────────────────────────────────────────

function CreateCouponDialog({
  open,
  onOpenChange,
  spaceId,
  accentColor,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  spaceId: string;
  accentColor: string;
}) {
  const createMutation = useCreateCoupon();
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [appliesMonthly, setAppliesMonthly] = useState(true);
  const [appliesYearly, setAppliesYearly] = useState(true);
  const [duration, setDuration] = useState<CouponDuration>('forever');
  const [durationMonths, setDurationMonths] = useState<string>('3');
  const [maxRedemptions, setMaxRedemptions] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  const reset = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('10');
    setAppliesMonthly(true);
    setAppliesYearly(true);
    setDuration('forever');
    setDurationMonths('3');
    setMaxRedemptions('');
    setExpiresAt('');
  };

  const handleSubmit = async () => {
    const value = Number(discountValue);
    if (!code.trim()) return toast.error('El código es obligatorio');
    if (!value || value <= 0) return toast.error('El descuento debe ser mayor a 0');
    if (discountType === 'percentage' && value > 100) return toast.error('El % no puede ser mayor a 100');
    if (!appliesMonthly && !appliesYearly) return toast.error('Selecciona al menos un plan');
    if (duration === 'repeating' && (!Number(durationMonths) || Number(durationMonths) < 1)) {
      return toast.error('Indica el número de meses');
    }
    const applies_to: CouponPlan[] = [];
    if (appliesMonthly) applies_to.push('monthly');
    if (appliesYearly) applies_to.push('yearly');

    try {
      await createMutation.mutateAsync({
        space_id: spaceId,
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: value,
        applies_to,
        duration,
        duration_in_months: duration === 'repeating' ? Number(durationMonths) : null,
        max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active: true,
      });
      toast.success('Cupón creado');
      reset();
      onOpenChange(false);
    } catch (e: any) {
      const msg = (e?.message ?? '').includes('duplicate')
        ? 'Ya existe un cupón con ese código en esta academia'
        : (e?.message ?? 'Error');
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo cupón</DialogTitle>
          <DialogDescription>
            Los visitantes ingresarán este código al suscribirse y verán el precio descontado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Código *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="EJ. PROMO50"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de descuento</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={discountType === 'percentage' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDiscountType('percentage')}
                className="flex-1"
              >
                <Percent className="h-3.5 w-3.5 mr-1.5" /> Porcentaje
              </Button>
              <Button
                type="button"
                variant={discountType === 'fixed_amount' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDiscountType('fixed_amount')}
                className="flex-1"
              >
                <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Monto fijo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor del descuento *</Label>
            <div className="relative">
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min={0}
                step={discountType === 'percentage' ? 1 : 0.01}
                max={discountType === 'percentage' ? 100 : undefined}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                {discountType === 'percentage' ? '%' : 'USD'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Aplica a planes</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={appliesMonthly}
                  onChange={(e) => setAppliesMonthly(e.target.checked)}
                  className="h-4 w-4 accent-purple-600"
                />
                Mensual
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={appliesYearly}
                  onChange={(e) => setAppliesYearly(e.target.checked)}
                  className="h-4 w-4 accent-purple-600"
                />
                Anual
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duración</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['once', 'repeating', 'forever'] as CouponDuration[]).map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={duration === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDuration(d)}
                >
                  {d === 'once' ? 'Primer cobro' : d === 'repeating' ? 'X meses' : 'Para siempre'}
                </Button>
              ))}
            </div>
            {duration === 'repeating' && (
              <div className="pt-1">
                <Input
                  type="number"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  min={1}
                  placeholder="Número de meses"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Límite de usos</Label>
              <Input
                type="number"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Sin límite"
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Vence</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="text-white"
              style={{ backgroundColor: accentColor }}
            >
              {createMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando…</>
              ) : (
                'Crear cupón'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
