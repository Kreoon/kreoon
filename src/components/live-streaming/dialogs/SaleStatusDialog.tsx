import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, CheckCircle2, DollarSign, FileCheck, CreditCard } from 'lucide-react';
import { STATUS_COLORS, SALE_STATUS_FLOW } from '../LiveStreamingConstants';
import type { StreamingSale, StreamingSaleStatus } from '@/hooks/useLiveStreaming';

interface SaleStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: StreamingSale | null;
  onUpdateStatus: (saleId: string, status: StreamingSaleStatus) => Promise<boolean>;
}

const STATUS_INFO: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  quoted: { 
    label: 'Cotizado', 
    icon: <FileCheck className="h-4 w-4" />, 
    description: 'Propuesta enviada al cliente' 
  },
  sold: { 
    label: 'Vendido', 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    description: 'Cliente aceptó la propuesta' 
  },
  executed: { 
    label: 'Ejecutado', 
    icon: <DollarSign className="h-4 w-4" />, 
    description: 'Servicio entregado' 
  },
  paid: { 
    label: 'Pagado', 
    icon: <CreditCard className="h-4 w-4" />, 
    description: 'Pago recibido' 
  },
};

export function SaleStatusDialog({ open, onOpenChange, sale, onUpdateStatus }: SaleStatusDialogProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  if (!sale) return null;

  const currentIndex = SALE_STATUS_FLOW.indexOf(sale.status);
  const nextStatus = SALE_STATUS_FLOW[currentIndex + 1] as StreamingSaleStatus | undefined;
  const canAdvance = currentIndex < SALE_STATUS_FLOW.length - 1;

  const handleAdvance = async () => {
    if (!nextStatus) return;
    
    setLoading(true);
    const success = await onUpdateStatus(sale.id, nextStatus);
    setLoading(false);
    
    if (success) {
      setNotes('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Estado de la Venta</DialogTitle>
          <DialogDescription>
            {sale.client?.name || 'Sin cliente'} - ${sale.amount.toLocaleString()} {sale.currency}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="flex items-center justify-between">
            {SALE_STATUS_FLOW.map((status, index) => {
              const info = STATUS_INFO[status];
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isPending = index > currentIndex;
              
              return (
                <div key={status} className="flex items-center">
                  <div className={`flex flex-col items-center ${isPending ? 'opacity-40' : ''}`}>
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isCurrent ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : ''}
                      ${isPending ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {info.icon}
                    </div>
                    <span className={`text-xs mt-1 ${isCurrent ? 'font-semibold' : ''}`}>
                      {info.label}
                    </span>
                  </div>
                  {index < SALE_STATUS_FLOW.length - 1 && (
                    <ArrowRight className={`h-4 w-4 mx-2 ${index >= currentIndex ? 'text-muted-foreground' : 'text-green-500'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Status */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Estado actual:</span>
              <Badge className={STATUS_COLORS[sale.status]}>
                {STATUS_INFO[sale.status]?.label}
              </Badge>
            </div>
            <p className="text-sm">{STATUS_INFO[sale.status]?.description}</p>
          </div>

          {/* Next Action */}
          {canAdvance && nextStatus && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span className="font-medium">Siguiente estado:</span>
                  <Badge variant="outline">{STATUS_INFO[nextStatus]?.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{STATUS_INFO[nextStatus]?.description}</p>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregar notas sobre este cambio..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {!canAdvance && (
            <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-700">Venta completada</p>
              <p className="text-sm text-muted-foreground">Esta venta ha sido pagada y finalizada</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {canAdvance && (
            <Button onClick={handleAdvance} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Avanzar a {STATUS_INFO[nextStatus!]?.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
