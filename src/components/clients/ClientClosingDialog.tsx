import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Camera, FolderKanban } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCreateClientClosing } from '@/hooks/useClientBilling';
import type { BillingItem, ClientClosing } from '@/hooks/useClientBilling';
import { formatCurrency } from '@/lib/finance-format';
import { generateClientInvoicePDF } from '@/lib/client-invoice-pdf';

interface ClientClosingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  clientId: string;
  clientName: string;
  orgName: string;
  pendingItems: BillingItem[];
}

export function ClientClosingDialog({
  open,
  onOpenChange,
  orgId,
  clientId,
  clientName,
  orgName,
  pendingItems,
}: ClientClosingDialogProps) {
  const now = new Date();
  const defaultName = `Cobro ${clientName} — ${format(now, "MMMM yyyy", { locale: es })}`;

  const [form, setForm] = useState({ name: defaultName, currency: 'COP', notes: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set(pendingItems.map(i => i.id)));
  const [createdClosing, setCreatedClosing] = useState<ClientClosing | null>(null);

  const createClosing = useCreateClientClosing();

  function f(field: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  function toggleItem(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedItems = useMemo(
    () => pendingItems.filter(i => selected.has(i.id)),
    [pendingItems, selected],
  );

  const total = useMemo(
    () => selectedItems.reduce((acc, i) => acc + i.price_client, 0),
    [selectedItems],
  );

  const fmtDate = (d: string) => {
    try { return format(parseISO(d), 'd MMM yyyy', { locale: es }); }
    catch { return d; }
  };

  async function handleCreate() {
    if (!form.name.trim() || selected.size === 0) {
      toast({ title: 'Selecciona al menos un ítem', variant: 'destructive' });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const contentIds = selectedItems.filter(i => i.item_type === 'project').map(i => i.id);
    const fillmakerIds = selectedItems.filter(i => i.item_type === 'fillmaker').map(i => i.id);

    try {
      const closingId = await createClosing.mutateAsync({
        org_id: orgId,
        client_id: clientId,
        name: form.name.trim(),
        currency: form.currency,
        notes: form.notes.trim(),
        content_ids: contentIds,
        fillmaker_ids: fillmakerIds,
        created_by: user!.id,
      });

      setCreatedClosing({
        id: closingId,
        organization_id: orgId,
        client_id: clientId,
        name: form.name.trim(),
        total_amount: total,
        currency: form.currency,
        status: 'draft',
        payment_date: null,
        payment_method: null,
        notes: form.notes.trim() || null,
        created_by: user?.id ?? null,
        paid_at: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      toast({ title: 'Cierre creado correctamente' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  function handleDownloadPDF() {
    if (!createdClosing) return;
    generateClientInvoicePDF({
      closing: createdClosing,
      items: selectedItems,
      clientName,
      orgName,
    });
  }

  function handleClose() {
    setCreatedClosing(null);
    setSelected(new Set(pendingItems.map(i => i.id)));
    setForm({ name: defaultName, currency: 'COP', notes: '' });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-[#0e0e0e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-400" />
            Generar Cierre de Cuenta
          </DialogTitle>
        </DialogHeader>

        {!createdClosing ? (
          <>
            <div className="space-y-3 py-1">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Nombre del cierre *</Label>
                <Input
                  value={form.name}
                  onChange={e => f('name', e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Moneda</Label>
                <Select value={form.currency} onValueChange={v => f('currency', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-9 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">COP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="MXN">MXN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de ítems */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Ítems a incluir ({selected.size} seleccionados)
                </Label>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {pendingItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded border border-white/5 bg-white/3 hover:bg-white/6 cursor-pointer"
                      onClick={() => toggleItem(item.id)}
                    >
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.item_type === 'fillmaker'
                            ? <Camera className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                            : <FolderKanban className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                          <span className="text-sm font-medium truncate">{item.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{fmtDate(item.item_date)}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-400 shrink-0">
                        {formatCurrency(item.price_client, item.currency)}
                      </span>
                    </div>
                  ))}
                  {pendingItems.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay ítems pendientes de cobro
                    </p>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded bg-violet-500/10 border border-violet-500/20">
                <span className="text-sm font-medium">Total a cobrar</span>
                <span className="text-xl font-bold text-violet-300">
                  {formatCurrency(total, form.currency)}
                </span>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Notas / acuerdos</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => f('notes', e.target.value)}
                  rows={2}
                  placeholder="Condiciones de pago, plazos..."
                  className="bg-white/5 border-white/10 resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={createClosing.isPending || selected.size === 0}
                className="gap-2"
              >
                {createClosing.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear cierre
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Estado: cierre creado exitosamente */
          <div className="py-4 space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl">✅</div>
              <h3 className="font-semibold text-lg">Cierre creado</h3>
              <p className="text-muted-foreground text-sm">
                {createdClosing.name} · {formatCurrency(createdClosing.total_amount, createdClosing.currency)}
              </p>
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Borrador</Badge>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleDownloadPDF} className="gap-2 w-full">
                <FileText className="h-4 w-4" />
                Ver / Descargar PDF para el cliente
              </Button>
              <Button variant="outline" onClick={handleClose} className="w-full">
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
