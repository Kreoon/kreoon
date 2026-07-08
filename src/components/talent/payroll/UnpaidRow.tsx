import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, DollarSign, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatePayment, usePaymentAccounts } from '@/hooks/useTalentPayments';
import type { PayrollEntry } from '@/hooks/useTalentPayments';
import { PAYMENT_ACCOUNT_LABELS } from '@/types/talentPayments.types';
import { formatCurrency } from './formatCurrency';
import { UnpaidContentTable } from './UnpaidContentTable';

export function UnpaidRow({
  entry,
  organizationId,
}: {
  entry: PayrollEntry;
  organizationId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [paying, setPaying] = useState(false);
  const createPayment = useCreatePayment(organizationId);
  const { data: accounts = [] } = usePaymentAccounts(organizationId, entry.user_id);
  const qc = useQueryClient();

  const [amount, setAmount] = useState(String(entry.total_pending));
  const [currency, setCurrency] = useState('COP');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  async function handlePay() {
    await createPayment.mutateAsync({
      user_id: entry.user_id,
      amount: parseFloat(amount) || 0,
      currency,
      status: 'pending',
      description: `Liquidación manual — ${format(new Date(), 'dd/MM/yyyy')}`,
      payment_account_id: accountId || null,
      payment_date: new Date(date).toISOString(),
      notes: null,
      receipt_url: null,
      content_ids: entry.items.map((i) => i.id),
      created_by: null,
    });
    qc.invalidateQueries({ queryKey: ['payroll-summary', organizationId] });
    qc.invalidateQueries({ queryKey: ['monthly-closures', organizationId] });
    setPaying(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {entry.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{entry.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {entry.project_count} proyecto{entry.project_count > 1 ? 's' : ''} sin liquidar
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
            {formatCurrency(entry.total_pending)}
          </span>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setPaying((v) => !v)}>
            <DollarSign className="h-3 w-3" />
            Pagar ya
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Form de pago manual */}
      {paying && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-1">
              <Label className="text-xs">Monto</Label>
              <Input type="number" className="h-8 text-xs" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
              <Input type="date" className="h-8 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cuenta destino</Label>
            <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {accounts.map((a) => (
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
            <Button size="sm" className="gap-1" onClick={handlePay} disabled={!amount || createPayment.isPending}>
              {createPayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Registrar pago
            </Button>
          </div>
        </div>
      )}

      {/* Proyectos */}
      {expanded && (
        <UnpaidContentTable items={entry.items} />
      )}
    </div>
  );
}
