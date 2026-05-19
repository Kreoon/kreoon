import { Loader2, Sparkles, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useGenerationJob } from '@/contexts/GenerationJobContext';
import { cn } from '@/lib/utils';

export function FloatingGenerationBadge() {
  const { jobs, clearJob } = useGenerationJob();

  const allJobs = [...jobs.values()];
  const running   = allJobs.filter(j => j.status === 'running');
  const errors    = allJobs.filter(j => j.status === 'error');
  const completed = allJobs.filter(j => j.status === 'completed');

  if (allJobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-[220px]">

      {/* Resumen si hay múltiples corriendo */}
      {running.length > 1 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg pointer-events-auto animate-in slide-in-from-bottom-2 duration-300">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <div>
            <p className="text-xs font-medium">{running.length} guiones generando</p>
            <p className="text-[10px] text-muted-foreground">en paralelo en segundo plano</p>
          </div>
        </div>
      )}

      {/* Job individual (cuando hay 1 corriendo) */}
      {running.length === 1 && running.map(job => (
        <div
          key={job.contentId}
          className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-lg animate-in slide-in-from-bottom-2 duration-300"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary/60" />
              <p className="text-xs font-medium truncate max-w-[140px]">
                {job.projectTitle ?? 'Generando guión...'}
              </p>
            </div>
            {job.progress && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Fase {job.progress.phase}/{job.progress.totalPhases} — {job.progress.pct}%
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Errores */}
      {errors.map(job => (
        <div
          key={job.contentId}
          className="flex items-center gap-2.5 rounded-lg border border-destructive/50 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-lg pointer-events-auto animate-in slide-in-from-bottom-2 duration-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate max-w-[120px]">
              {job.projectTitle ?? 'Error'}
            </p>
            <p className="text-[10px] text-destructive mt-0.5 truncate max-w-[120px]">
              {job.error ?? 'Error en generación'}
            </p>
          </div>
          <button
            onClick={() => clearJob(job.contentId)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Completados recientes */}
      {completed.length > 0 && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg border border-green-500/30 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg pointer-events-auto animate-in slide-in-from-bottom-2 duration-300',
        )}>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-green-400">
              {completed.length === 1
                ? (completed[0].projectTitle ?? 'Guión listo')
                : `${completed.length} guiones completados`}
            </p>
          </div>
          <button
            onClick={() => completed.forEach(j => clearJob(j.contentId))}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
