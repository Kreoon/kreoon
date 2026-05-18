import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Trash2, Pencil, Loader2, Repeat, Power, PowerOff,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  useRecurringExpensesList,
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
  useDeleteRecurringExpense,
  FREQUENCY_LABELS,
} from '@/hooks/useFinance';
import type { RecurringExpenseRow, RecurringFrequency } from '@/hooks/useFinance';
import { COST_CATEGORY_LABELS } from '@/hooks/useFinance';
import type { CostCategory } from '@/hooks/useFinance';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';
import { formatCurrency } from '@/lib/finance-format';
import { TabIntro, HelpTip } from './FinanceHelp';

interface FormData {
  name: string;
  category: CostCategory;
  amount: string;
  currency: string;
  frequency: RecurringFrequency;
  next_due_date: string;
  vendor: string;
  payment_method: string;
  notes: string;
}

const BLANK: FormData = {
  name: '',
  category: 'plataforma',
  amount: '',
  currency: 'COP',
  frequency: 'monthly',
  next_due_date: new Date().toISOString().split('T')[0],
  vendor: '',
  payment_method: '',
  notes: '',
};

interface Props {
  orgId: string;
}

export function RecurringExpensesSection({ orgId }: Props) {
  const { currency } = useFinanceFilters();
  const { data: expenses = [], isLoading } = useRecurringExpensesList(orgId);
  const create = useCreateRecurringExpense();
  const update = useUpdateRecurringExpense();
  const remove = useDeleteRecurringExpense();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpenseRow | null>(null);
  const [form, setForm] = useState<FormData>(BLANK);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  // Cálculo de costo mensual equivalente para el total
  const monthlyEquivalent = (e: RecurringExpenseRow): number => {
    switch (e.frequency) {
      case 'weekly':    return e.amount * 4.33;
      case 'monthly':   return e.amount;
      case 'quarterly': return e.amount / 3;
      case 'annual':    return e.amount / 12;
      default: return 0;
    }
  };

  const totalMonthly = expenses
    .filter(e => e.is_active && e.currency === currency)
    .reduce((s, e) => s + monthlyEquivalent(e), 0);

  function openNew() {
    setEditing(null);
    setForm({ ...BLANK, currency });
    setDialogOpen(true);
  }

  function openEdit(e: RecurringExpenseRow) {
    setEditing(e);
    setForm({
      name: e.name,
      category: e.category as CostCategory,
      amount: String(e.amount),
      currency: e.currency,
      frequency: e.frequency,
      next_due_date: e.next_due_date ?? new Date().toISOString().split('T')[0],
      vendor: e.vendor ?? '',
      payment_method: e.payment_method ?? '',
      notes: e.notes ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.amount || Number(form.amount) <= 0) {
      toast({ title: 'Faltan datos', description: 'Nombre y monto son requeridos.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        organization_id: orgId,
        name: form.name.trim(),
        category: form.category,
        amount: Number(form.amount),
        currency: form.currency,
        frequency: form.frequency,
        next_due_date: form.next_due_date || null,
        vendor: form.vendor.trim() || null,
        payment_method: form.payment_method.trim() || null,
        notes: form.notes.trim() || null,
        is_active: true,
        auto_renew: true,
        start_date: null,
        end_date: null,
        created_by: user?.id ?? null,
      };

      if (editing) {
        await update.mutateAsync({ id: editing.id, updates: payload });
        toast({ title: 'Gasto actualizado' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Gasto recurrente creado' });
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(e: RecurringExpenseRow) {
    setActing(e.id);
    try {
      await update.mutateAsync({ id: e.id, updates: { is_active: !e.is_active } });
      toast({ title: e.is_active ? 'Gasto desactivado' : 'Gasto activado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActing(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este gasto recurrente? Esto NO borra los costos ya registrados.')) return;
    setActing(id);
    try {
      await remove.mutateAsync(id);
      toast({ title: 'Gasto eliminado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setActing(null);
    }
  }

  const f = (field: keyof FormData, val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div className="space-y-4">
      <TabIntro
        emoji="🔁"
        title="Gastos recurrentes"
        subtitle="Suscripciones y gastos fijos mensuales (Netflix, arriendo, hosting). Aquí solo los defines — se descuentan en el cálculo de flujo de caja proyectado."
        accent="cyan"
        bullets={[
          'NO se descuentan automáticamente de la utilidad. Cuando los pagas, regístralos manualmente en la pestaña "Lista" de costos.',
          'SÍ aparecen en el Flujo de Caja Proyectado (tab Análisis) para ver cuánto te van a costar las próximas semanas.',
          'Puedes desactivar un gasto sin borrarlo si dejas de pagarlo temporalmente.',
        ]}
      />

      <Card className="bg-white/5 border-white/10">
        <div className="p-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-cyan-400" />
              Lista de gastos recurrentes
              <HelpTip text="Cada gasto se convierte automáticamente a su equivalente mensual para sumar el total." />
            </h3>
            <p className="text-white/40 text-xs">
              {expenses.filter(e => e.is_active && e.currency === currency).length} activos en {currency} ·
              Total mensual: <span className="text-white font-semibold">{formatCurrency(totalMonthly, currency)}</span>
            </p>
          </div>
          <Button size="sm" onClick={openNew} className="gap-1.5 h-7">
            <Plus className="h-3.5 w-3.5" />
            Agregar gasto recurrente
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-white/40 text-sm">
            <Repeat className="h-8 w-8 opacity-30" />
            <p>No tienes gastos recurrentes definidos aún.</p>
            <Button variant="outline" size="sm" onClick={openNew} className="gap-2 mt-1">
              <Plus className="h-4 w-4" />
              Agregar el primero
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/60 text-xs">Nombre</TableHead>
                <TableHead className="text-white/60 text-xs">Categoría</TableHead>
                <TableHead className="text-white/60 text-xs">Frecuencia</TableHead>
                <TableHead className="text-white/60 text-xs text-right">Monto</TableHead>
                <TableHead className="text-white/60 text-xs text-right">Mensual eq.</TableHead>
                <TableHead className="text-white/60 text-xs">Próx. pago</TableHead>
                <TableHead className="text-white/60 text-xs">Estado</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map(e => (
                <TableRow key={e.id} className={`border-white/5 hover:bg-white/5 ${!e.is_active ? 'opacity-50' : ''}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-white">{e.name}</p>
                      {e.vendor && <p className="text-[10px] text-muted-foreground">{e.vendor}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {COST_CATEGORY_LABELS[e.category as CostCategory] ?? e.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/70 text-xs">
                    {FREQUENCY_LABELS[e.frequency]}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-white">
                    {formatCurrency(e.amount, e.currency)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-white/60">
                    {formatCurrency(monthlyEquivalent(e), e.currency)}
                  </TableCell>
                  <TableCell className="text-xs text-white/50">
                    {e.next_due_date ? format(parseISO(e.next_due_date), 'd MMM yyyy', { locale: es }) : '—'}
                  </TableCell>
                  <TableCell>
                    {e.is_active ? (
                      <Badge className="bg-green-500/15 text-green-300 border-green-500/30 text-[10px]">Activo</Badge>
                    ) : (
                      <Badge className="bg-white/10 text-white/40 border-white/15 text-[10px]">Pausado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(e)} disabled={acting === e.id} title={e.is_active ? 'Pausar' : 'Reactivar'}>
                        {acting === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> :
                          e.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(e.id)} disabled={acting === e.id}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0e0e0e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre *</label>
              <Input
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="Ej. Netflix, Arriendo oficina, Hosting Vercel"
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Monto *</label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={e => f('amount', e.target.value)}
                  placeholder="0"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Moneda</label>
                <select value={form.currency} onChange={e => f('currency', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-white">
                  <option value="COP" className="bg-[#111]">COP</option>
                  <option value="USD" className="bg-[#111]">USD</option>
                  <option value="EUR" className="bg-[#111]">EUR</option>
                  <option value="MXN" className="bg-[#111]">MXN</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Frecuencia *</label>
                <select value={form.frequency} onChange={e => f('frequency', e.target.value as RecurringFrequency)}
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-white">
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <option key={k} value={k} className="bg-[#111]">{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Próximo pago</label>
                <Input
                  type="date"
                  value={form.next_due_date}
                  onChange={e => f('next_due_date', e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoría</label>
              <select value={form.category} onChange={e => f('category', e.target.value as CostCategory)}
                className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-white">
                {Object.entries(COST_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#111]">{v}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Proveedor</label>
                <Input
                  value={form.vendor}
                  onChange={e => f('vendor', e.target.value)}
                  placeholder="Ej. Vercel, Netflix"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Método</label>
                <Input
                  value={form.payment_method}
                  onChange={e => f('payment_method', e.target.value)}
                  placeholder="Tarjeta, débito, etc."
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
              <Textarea
                value={form.notes}
                onChange={e => f('notes', e.target.value)}
                placeholder="Detalles adicionales"
                rows={2}
                className="bg-white/5 border-white/10 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
