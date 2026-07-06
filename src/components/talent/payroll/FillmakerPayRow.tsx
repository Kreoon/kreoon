import { useState } from 'react';
import { format } from 'date-fns';
import { DollarSign, Loader2, Check, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { usePaymentAccounts, useUpdatePayment } from '@/hooks/useTalentPayments';
import type { FillmakerPayrollItem } from '@/hooks/useClientBilling';
import { PAYMENT_ACCOUNT_LABELS } from '@/types/talentPayments.types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from './formatCurrency';

export function FillmakerPayRow({
  item,
  organizationId,
}: {
  item: FillmakerPayrollItem;
  organizationId: string;
}) {
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState(String(item.amount));
  const [currency, setCurrency] = useState(item.currency ?? 'COP');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { data: accounts = [] } = usePaymentAccounts(organizationId, item.user_id);
  const updatePayment = useUpdatePayment(organizationId);
  const qc = useQueryClient();
  const { toast } = useToast();

  async function handlePay() {
    try {
      await updatePayment.mutateAsync({
        id: item.id,
        userId: item.user_id,
        status: 'processing',
        amount: parseFloat(amount) || item.amount,
        currency,
        payment_account_id: accountId || null,
        payment_date: new Date(date).toISOString(),
        description: item.description ?? `Fillmaker — ${format(new Date(), 'dd/MM/yyyy')}`,
      });
      qc.invalidateQueries({ queryKey: ['fillmaker-payroll', organizationId] });
      setPaying(false);
      toast({ title: 'Pago registrado', description: 'La grabación pasó a transferencia.' });
    } catch {
      // useUpdatePayment ya muestra el toast de error
    }
  }

  const initials = (item.full_name ?? 'ED').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="rounded-lg border border-violet-500/20 bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {item.avatar_url ? (
          <img src={item.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{item.full_name ?? 'Editor'}</p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Camera className="h-3 w-3 text-violet-400 shrink-0" />
            {item.description ?? 'Grabación Fillmaker'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-violet-300">
            {formatCurrency(item.amount, item.currency)}
          </span>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setPaying(v => !v)}>
            <DollarSign className="h-3 w-3" />
            Pagar ya
          </Button>
        </div>
      </div>

      {paying && (
        <div className="border-t border-violet-500/20 bg-muted/20 p-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-1">
              <Label className="text-xs">Monto</Label>
              <Input type="number" className="h-8 text-xs" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" className="h-8 text-xs" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cuenta destino</Label>
            <Select value={accountId || 'none'} onValueChange={v => setAccountId(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label ?? PAYMENT_ACCOUNT_LABELS[a.account_type]}
                    {a.account_number ? ` · ${a.account_number}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setPaying(false)}>Cancelar</Button>
            <Button size="sm" className="gap-1" onClick={handlePay} disabled={!amount || updatePayment.isPending}>
              {updatePayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Registrar pago
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
