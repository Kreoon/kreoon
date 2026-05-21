import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCreateFillmaker } from '@/hooks/useClientBilling';

interface Editor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ClientOption {
  id: string;
  name: string;
}

interface FillmakerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  /** Si no se pasa, se muestra un selector de cliente dentro del formulario */
  clientId?: string;
  /** Lista de clientes para el selector (requerida cuando clientId no se pasa) */
  clients?: ClientOption[];
}

export function FillmakerDialog({ open, onOpenChange, orgId, clientId, clients = [] }: FillmakerDialogProps) {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(clientId ?? '');
  const [form, setForm] = useState({
    title: '',
    description: '',
    service_date: new Date().toISOString().split('T')[0],
    price_client: '',
    cost_own: '',
    currency: 'COP',
    editor_id: '',
    notes: '',
  });

  const createFillmaker = useCreateFillmaker();

  const loadEditors = useCallback(async () => {
    const { data: members, error: membersError } = await (supabase as any)
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .in('role', ['editor', 'admin', 'content_creator']);

    if (membersError) { console.error('Error cargando miembros para editors:', membersError); return; }
    if (!members?.length) return;

    const ids = members.map((m: any) => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', ids)
      .order('full_name');

    if (profilesError) { console.error('Error cargando perfiles de editors:', profilesError); return; }
    setEditors((profiles ?? []) as Editor[]);
  }, [orgId]);

  useEffect(() => {
    if (!open || !orgId) return;
    loadEditors();
  }, [open, orgId, loadEditors]);

  useEffect(() => {
    if (open) setSelectedClientId(clientId ?? '');
  }, [open, clientId]);

  function f(field: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function handleSubmit() {
    const effectiveClientId = clientId ?? selectedClientId;

    if (!form.title.trim()) {
      toast({ title: 'Falta el título', variant: 'destructive' });
      return;
    }
    if (!effectiveClientId) {
      toast({ title: 'Selecciona un cliente', variant: 'destructive' });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      toast({ title: 'Error de sesión', variant: 'destructive' });
      return;
    }

    try {
      await createFillmaker.mutateAsync({
        organization_id: orgId,
        client_id: effectiveClientId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        service_date: form.service_date,
        price_client: parseFloat(form.price_client) || 0,
        cost_own: parseFloat(form.cost_own) || 0,
        currency: form.currency,
        editor_id: form.editor_id || undefined,
        notes: form.notes.trim() || undefined,
        created_by: user.id,
      });
      toast({ title: 'Servicio de grabación registrado' });
      onOpenChange(false);
      setForm({
        title: '',
        description: '',
        service_date: new Date().toISOString().split('T')[0],
        price_client: '',
        cost_own: '',
        currency: 'COP',
        editor_id: '',
        notes: '',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0e0e0e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-violet-400" />
            Nuevo Servicio de Grabación (Fillmaker)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Selector de cliente — solo cuando no se pasa clientId como prop */}
          {!clientId && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Cliente *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Título *</Label>
            <Input
              value={form.title}
              onChange={e => f('title', e.target.value)}
              placeholder="Ej. Grabación campaña producto X"
              className="bg-white/5 border-white/10"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Descripción</Label>
            <Textarea
              value={form.description}
              onChange={e => f('description', e.target.value)}
              placeholder="Detalles del servicio..."
              rows={2}
              className="bg-white/5 border-white/10 resize-none"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Fecha del servicio *</Label>
            <Input
              type="date"
              value={form.service_date}
              onChange={e => f('service_date', e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Moneda</Label>
              <Select value={form.currency} onValueChange={v => f('currency', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 h-9">
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
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Precio al cliente</Label>
              <Input
                type="number"
                min="0"
                value={form.price_client}
                onChange={e => f('price_client', e.target.value)}
                placeholder="0"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Pago al editor</Label>
              <Input
                type="number"
                min="0"
                value={form.cost_own}
                onChange={e => f('cost_own', e.target.value)}
                placeholder="0"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Editor asignado</Label>
            <Select value={form.editor_id} onValueChange={v => f('editor_id', v)}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Seleccionar editor..." />
              </SelectTrigger>
              <SelectContent>
                {editors.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name ?? e.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Notas internas</Label>
            <Input
              value={form.notes}
              onChange={e => f('notes', e.target.value)}
              placeholder="Observaciones..."
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createFillmaker.isPending} className="gap-2">
            {createFillmaker.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar servicio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
