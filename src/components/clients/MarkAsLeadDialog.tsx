import { useState } from 'react';
import { Snowflake, Sun, Flame, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useMarkUserAsLead } from '@/hooks/useUnifiedClients';
import { RELATIONSHIP_STRENGTH_LABELS } from '@/types/crm.types';
import type { RelationshipStrength } from '@/types/crm.types';

interface MarkAsLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  orgId: string;
  onSuccess?: () => void;
}

const TEMPERATURE_OPTIONS: { value: RelationshipStrength; icon: typeof Snowflake; activeClass: string }[] = [
  { value: 'cold', icon: Snowflake, activeClass: 'border-blue-500/60 bg-blue-500/10 text-blue-500' },
  { value: 'warm', icon: Sun, activeClass: 'border-yellow-500/60 bg-yellow-500/10 text-yellow-500' },
  { value: 'hot', icon: Flame, activeClass: 'border-red-500/60 bg-red-500/10 text-red-500' },
];

/** Diálogo pequeño para marcar un usuario de la pestaña "Usuarios" como lead */
export function MarkAsLeadDialog({ open, onOpenChange, userId, userName, orgId, onSuccess }: MarkAsLeadDialogProps) {
  const [temperatura, setTemperatura] = useState<RelationshipStrength>('warm');
  const [notas, setNotas] = useState('');
  const markAsLead = useMarkUserAsLead();

  const reset = () => {
    setTemperatura('warm');
    setNotas('');
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleSubmit = () => {
    markAsLead.mutate(
      { userId, orgId, temperatura, notas: notas.trim() || undefined },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{userName}</strong> pasará a la pestaña Leads
            para que puedas remarketearlo más adelante (enviarle promociones, publicidad, etc.).
          </p>

          <div className="space-y-2">
            <Label>Temperatura</Label>
            <div className="flex gap-2">
              {TEMPERATURE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isActive = temperatura === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTemperatura(opt.value)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 py-2 rounded-sm border transition-all',
                      isActive ? opt.activeClass : 'border-border bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">{RELATIONSHIP_STRENGTH_LABELS[opt.value]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-notes">Nota (opcional)</Label>
            <Textarea
              id="lead-notes"
              placeholder="Ej: pidió precios en enero, salió de un formulario de Instagram..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={markAsLead.isPending}>
              {markAsLead.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Marcando...
                </>
              ) : (
                'Marcar como lead'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
