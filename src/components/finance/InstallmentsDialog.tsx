import { useState, useEffect, useMemo } from 'react';
import { format, addMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, Loader2, Calendar, CheckCircle, Clock } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  usePackageInstallmentsList,
  useSavePackageInstallments,
  useDeletePackageInstallments,
} from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/finance-format';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  packageId: string;
  packageName: string;
  totalValue: number;
  paidAmount: number;
  currency: string;
}

interface InstallmentDraft {
  due_date: string;
  expected_amount: string;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  invoiced:  'bg-purple-500/15 text-purple-300 border-purple-500/30',
  paid:      'bg-green-500/15 text-green-300 border-green-500/30',
  overdue:   'bg-red-500/15 text-red-300 border-red-500/30',
  cancelled: 'bg-white/10 text-white/40 border-white/15',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  invoiced:  'Facturada',
  paid:      'Pagada',
  overdue:   'Vencida',
  cancelled: 'Cancelada',
};

export function InstallmentsDialog({
  open, onClose, orgId, packageId, packageName, totalValue, paidAmount, currency,
}: Props) {
  const { data: existing = [], isLoading } = usePackageInstallmentsList(open ? packageId : undefined);
  const save = useSavePackageInstallments();
  const remove = useDeletePackageInstallments();

  const [drafts, setDrafts] = useState<InstallmentDraft[]>([]);
  const [generating, setGenerating] = useState(false);

  const pending = totalValue - paidAmount;

  // Inicializar desde data existente
  useEffect(() => {
    if (existing.length > 0) {
      setDrafts(existing.map(i => ({
        due_date: i.due_date,
        expected_amount: String(i.expected_amount),
      })));
    } else if (open && drafts.length === 0) {
      // Pre-generar 3 cuotas mensuales por defecto
      generateInstallments(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.length, open]);

  function generateInstallments(count: number, startDate?: string) {
    setGenerating(true);
    const base = startDate ? parseISO(startDate) : new Date();
    const amountEach = Math.round(pending / count);
    const remainder = pending - (amountEach * count);

    const list: InstallmentDraft[] = [];
    for (let i = 0; i < count; i++) {
      const d = i === 0 ? base : addMonths(base, i);
      list.push({
        due_date: format(d, 'yyyy-MM-dd'),
        // La última cuota lleva el remainder para que sume exacto
        expected_amount: String(i === count - 1 ? amountEach + remainder : amountEach),
      });
    }
    setDrafts(list);
    setGenerating(false);
  }

  function addManual() {
    setDrafts(prev => [
      ...prev,
      {
        due_date: format(addMonths(new Date(), prev.length + 1), 'yyyy-MM-dd'),
        expected_amount: '0',
      },
    ]);
  }

  function updateDraft(i: number, field: keyof InstallmentDraft, value: string) {
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  }

  function removeDraft(i: number) {
    setDrafts(prev => prev.filter((_, idx) => idx !== i));
  }

  const totalDrafts = useMemo(() =>
    drafts.reduce((s, d) => s + (Number(d.expected_amount) || 0), 0),
    [drafts]);

  const difference = pending - totalDrafts;

  async function handleSave() {
    // Validaciones
    if (drafts.length === 0) {
      toast({ title: 'Sin cuotas', description: 'Agrega al menos una cuota o usa "Eliminar todas".', variant: 'destructive' });
      return;
    }

    const invalid = drafts.find(d => !d.due_date || !d.expected_amount || Number(d.expected_amount) <= 0);
    if (invalid) {
      toast({ title: 'Cuotas inválidas', description: 'Todas las cuotas necesitan fecha y monto > 0.', variant: 'destructive' });
      return;
    }

    if (Math.abs(difference) > 1) {
      toast({
        title: '⚠️ Total no coincide',
        description: `La suma de cuotas (${formatCurrency(totalDrafts, currency)}) debe igualar el pendiente (${formatCurrency(pending, currency)}). Diferencia: ${formatCurrency(difference, currency)}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await save.mutateAsync({
        orgId, packageId, currency,
        installments: drafts.map(d => ({
          due_date: d.due_date,
          expected_amount: Number(d.expected_amount),
        })),
      });
      toast({ title: 'Cuotas guardadas', description: `${drafts.length} cuotas programadas` });
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'No se pudo guardar', variant: 'destructive' });
    }
  }

  async function handleDeleteAll() {
    if (!confirm('¿Eliminar todas las cuotas de este paquete? Esto no afecta los pagos ya registrados.')) return;
    try {
      await remove.mutateAsync(packageId);
      setDrafts([]);
      toast({ title: 'Cuotas eliminadas' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0e0e0e] border-white/10 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Plan de pagos del paquete
          </DialogTitle>
          <div className="text-xs text-white/50 mt-1">
            <p className="text-white font-medium">{packageName}</p>
            <p>
              Total {formatCurrency(totalValue, currency)} ·
              Cobrado {formatCurrency(paidAmount, currency)} ·
              <span className="text-orange-300"> Pendiente {formatCurrency(pending, currency)}</span>
            </p>
          </div>
        </DialogHeader>

        {/* Generadores rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/50">Plantilla rápida:</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => generateInstallments(2)} disabled={generating}>
            2 cuotas mensuales
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => generateInstallments(3)} disabled={generating}>
            3 cuotas
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => generateInstallments(6)} disabled={generating}>
            6 cuotas
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => generateInstallments(12)} disabled={generating}>
            12 cuotas
          </Button>
        </div>

        {/* Lista de drafts */}
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : (
            drafts.map((d, i) => {
              const existingInst = existing[i];
              const isPaid = existingInst?.status === 'paid';
              return (
                <div key={i} className={`flex items-center gap-2 p-2 rounded border ${isPaid ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                  <span className="text-white/40 text-xs w-6 shrink-0">#{i + 1}</span>
                  <Input
                    type="date"
                    value={d.due_date}
                    onChange={e => updateDraft(i, 'due_date', e.target.value)}
                    disabled={isPaid}
                    className="bg-white/5 border-white/10 text-xs h-8 flex-1"
                  />
                  <Input
                    type="number"
                    min="0"
                    value={d.expected_amount}
                    onChange={e => updateDraft(i, 'expected_amount', e.target.value)}
                    disabled={isPaid}
                    placeholder="0"
                    className="bg-white/5 border-white/10 text-xs h-8 w-32"
                  />
                  {existingInst && (
                    <Badge className={`text-[10px] ${STATUS_STYLES[existingInst.status]}`}>
                      {existingInst.status === 'paid' && <CheckCircle className="w-2.5 h-2.5 mr-1 inline" />}
                      {existingInst.status === 'overdue' && <Clock className="w-2.5 h-2.5 mr-1 inline" />}
                      {STATUS_LABELS[existingInst.status]}
                    </Badge>
                  )}
                  {!isPaid && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeDraft(i)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <Button variant="outline" size="sm" onClick={addManual} className="gap-1.5">
          <Plus className="w-3 h-3" />
          Agregar cuota manual
        </Button>

        {/* Resumen */}
        <div className={`text-xs px-3 py-2 rounded ${
          Math.abs(difference) <= 1 ? 'bg-green-500/10 text-green-300 border border-green-500/30'
          : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
        }`}>
          Suma cuotas: <strong>{formatCurrency(totalDrafts, currency)}</strong>
          {' · '}Pendiente: <strong>{formatCurrency(pending, currency)}</strong>
          {' · '}Diferencia: <strong>{formatCurrency(difference, currency)}</strong>
          {Math.abs(difference) <= 1 ? ' ✓' : ' (debe ser 0 para guardar)'}
        </div>

        <DialogFooter className="gap-2">
          {existing.length > 0 && (
            <Button variant="ghost" onClick={handleDeleteAll} disabled={remove.isPending} className="text-destructive hover:text-destructive">
              {remove.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar todas
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Guardar cuotas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
