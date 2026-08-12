import { useState } from 'react';
import { Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeHTMLWithBreaks } from '@/lib/sanitizeHTML';
import { ReviewDialog } from './ReviewDialog';
import { RequestChangesDialog } from './RequestChangesDialog';
import type { PipelineScript } from '@/hooks/useClientPipeline';

interface ScriptsListProps {
  scripts: PipelineScript[];
  acting: boolean;
  onApprove: (contentId: string) => Promise<unknown>;
  onRequestChanges: (contentId: string, feedback: string) => Promise<unknown>;
}

/**
 * Lista simple de guiones. Cada guion se aprueba o se corrige por separado:
 * el cliente no tiene que aceptar el lote entero para avanzar.
 */
export function ScriptsList({ scripts, acting, onApprove, onRequestChanges }: ScriptsListProps) {
  const [reading, setReading] = useState<PipelineScript | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);

  if (!scripts.length) return null;

  // El aviso de error lo da quien nos pasa las funciones (toast); aquí solo
  // evitamos cerrar el diálogo cuando la acción no llegó a guardarse.
  const handleApprove = async (id: string) => {
    try {
      await onApprove(id);
      setReading(null);
    } catch {
      /* se queda abierto para reintentar */
    }
  };

  const handleChanges = async (feedback: string) => {
    if (!changingId) return;
    try {
      await onRequestChanges(changingId, feedback);
      setChangingId(null);
      setReading(null);
    } catch {
      /* se queda abierto para reintentar */
    }
  };

  return (
    <>
      <ul className="mt-4 space-y-2">
        {scripts.map((script, index) => {
          const approved = script.status === 'script_approved';
          return (
            <li
              key={script.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                approved && 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  approved ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                {approved ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {script.title || `Video ${index + 1}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {approved ? 'Aprobado por ti' : 'Listo para que lo leas'}
                </p>
              </div>

              <Button
                size="sm"
                variant={approved ? 'ghost' : 'default'}
                className="shrink-0"
                onClick={() => setReading(script)}
              >
                {approved ? 'Ver' : 'Leer'}
              </Button>
            </li>
          );
        })}
      </ul>

      <ReviewDialog
        open={!!reading}
        onOpenChange={open => !open && setReading(null)}
        title={reading?.title || 'Tu guion'}
        subtitle={
          reading?.status === 'script_approved'
            ? 'Ya lo aprobaste. Este es el texto final.'
            : 'Léelo con calma. Si algo no te suena, pídenos el cambio.'
        }
        showActions={reading?.status !== 'script_approved'}
        submitting={acting}
        onApprove={() => reading && handleApprove(reading.id)}
        onRequestChanges={() => reading && setChangingId(reading.id)}
      >
        {reading?.script ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: sanitizeHTMLWithBreaks(reading.script) }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Este guion todavía no tiene texto. Te avisamos en cuanto esté.
          </p>
        )}
      </ReviewDialog>

      <RequestChangesDialog
        open={!!changingId}
        onOpenChange={open => !open && setChangingId(null)}
        what="este guion"
        submitting={acting}
        onSubmit={handleChanges}
      />
    </>
  );
}
