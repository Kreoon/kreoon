import { useState } from 'react';
import { format } from 'date-fns';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  formatCurrency,
  PAYMENT_METHODS,
  type AbonoForm,
  type PackageCurrency,
  type PackagePaymentMethod,
} from '@/lib/finance-format';

interface AbonoDialogProps {
  orgId: string;
  packageId: string;
  packageName: string;
  clientName: string;
  currency: PackageCurrency | string;
  pendingAmount: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM: AbonoForm = {
  amount: '',
  payment_method: 'Transferencia',
  reference_number: '',
  payment_date: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
};

export function AbonoDialog({
  orgId,
  packageId,
  packageName,
  clientName,
  currency,
  pendingAmount,
  open,
  onClose,
  onSuccess,
}: AbonoDialogProps) {
  const [form, setForm] = useState<AbonoForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  function handleField<K extends keyof AbonoForm>(key: K, value: AbonoForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      toast({ title: 'Monto requerido', description: 'Ingresa un monto mayor a 0', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any).from('client_package_payments').insert({
        organization_id: orgId,
        client_package_id: packageId,
        amount,
        currency,
        payment_method: form.payment_method,
        reference_number: form.reference_number || null,
        payment_date: form.payment_date,
        notes: form.notes || null,
      });

      if (error) throw error;

      toast({ title: 'Abono registrado', description: `${formatCurrency(amount, currency)} registrado correctamente` });
      setForm(EMPTY_FORM);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el abono';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setForm(EMPTY_FORM);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-green-400" />
            Registrar Abono
          </DialogTitle>
          <div className="pt-1">
            <p className="text-white/60 text-sm">
              <span className="text-white font-medium">{packageName}</span>
              {' · '}{clientName}
            </p>
            <p className="text-orange-400 text-xs mt-0.5">
              Pendiente: {formatCurrency(pendingAmount, currency)}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">
              Monto <span className="text-red-400">*</span>
            </label>
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder={`Ej. ${currency === 'COP' ? '500000' : '500'}`}
              value={form.amount}
              onChange={e => handleField('amount', e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Método de pago</label>
            <select
              value={form.payment_method}
              onChange={e => handleField('payment_method', e.target.value as PackagePaymentMethod)}
              className="w-full bg-white/5 border border-white/15 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m} className="bg-[#111]">{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Número de referencia</label>
            <Input
              placeholder="Opcional"
              value={form.reference_number}
              onChange={e => handleField('reference_number', e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Fecha de pago</label>
            <Input
              type="date"
              value={form.payment_date}
              onChange={e => handleField('payment_date', e.target.value)}
              className="bg-white/5 border-white/15 text-white focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Notas</label>
            <Textarea
              placeholder="Opcional"
              rows={2}
              value={form.notes}
              onChange={e => handleField('notes', e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-white/30 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.amount}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Registrando...' : 'Confirmar abono'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
