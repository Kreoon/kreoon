import { ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReadableSections } from './ReadableSections';
import type { ReadableSection } from './plainLanguage';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  sections?: ReadableSection[];
  children?: ReactNode;
  /** Cuando ya está aprobado se muestra solo la lectura, sin botones. */
  showActions?: boolean;
  submitting?: boolean;
  onApprove?: () => void;
  onRequestChanges?: () => void;
}

export function ReviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  sections,
  children,
  showActions,
  submitting,
  onApprove,
  onRequestChanges,
}: ReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {children ?? <ReadableSections sections={sections ?? []} />}
        </div>

        {showActions && (
          <div className="border-t p-4 sm:px-6 flex flex-col sm:flex-row-reverse gap-2 bg-card">
            <Button className="w-full sm:w-auto" disabled={submitting} onClick={onApprove}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Está perfecto, aprobar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto text-muted-foreground"
              disabled={submitting}
              onClick={onRequestChanges}
            >
              Pedir un cambio
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
