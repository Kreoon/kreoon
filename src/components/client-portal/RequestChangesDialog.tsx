import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RequestChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Qué se está cambiando, en palabras del cliente. Ej: "Así entendimos tu marca" */
  what: string;
  submitting?: boolean;
  onSubmit: (feedback: string) => Promise<void> | void;
}

export function RequestChangesDialog({
  open,
  onOpenChange,
  what,
  submitting,
  onSubmit,
}: RequestChangesDialogProps) {
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (open) setFeedback('');
  }, [open]);

  const canSend = feedback.trim().length >= 5 && !submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Qué te gustaría cambiar?</DialogTitle>
          <DialogDescription>
            Cuéntanoslo con tus palabras. Lo ajustamos y te lo volvemos a mostrar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          <p className="text-xs text-muted-foreground mb-2">Estás pidiendo cambios en: {what}</p>
          <Textarea
            autoFocus
            rows={5}
            placeholder="Ejemplo: mi cliente no es tan joven, le hablamos más a mamás de 35 a 50."
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
          />
          {feedback.trim().length > 0 && feedback.trim().length < 5 && (
            <p className="text-xs text-muted-foreground mt-2">
              Escribe un poquito más para que lo entendamos bien.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button disabled={!canSend} onClick={() => onSubmit(feedback.trim())}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando…
              </>
            ) : (
              'Enviar mi cambio'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
