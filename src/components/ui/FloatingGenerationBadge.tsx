import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useGenerationJob } from '@/contexts/GenerationJobContext';
import { cn } from '@/lib/utils';

export function FloatingGenerationBadge() {
  const { jobs } = useGenerationJob();

  const activeJobs = [...jobs.values()].filter(
    (j) => j.status === 'running' || j.status === 'error',
  );

  if (activeJobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {activeJobs.map((job) => (
        <div
          key={job.contentId}
          className={cn(
            'flex items-center gap-3 rounded-lg border px-3 py-2.5 shadow-lg',
            'bg-card/95 backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-300',
            job.status === 'error' ? 'border-destructive/50' : 'border-primary/20',
          )}
        >
          {job.status === 'running' ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary/60" />
              <p className="text-xs font-medium truncate max-w-[160px]">
                {job.projectTitle ?? 'Generando guión...'}
              </p>
            </div>
            {job.status === 'running' && job.progress && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Fase {job.progress.phase}/{job.progress.totalPhases} — {job.progress.pct}%
              </p>
            )}
            {job.status === 'error' && (
              <p className="text-[10px] text-destructive mt-0.5 truncate max-w-[160px]">
                {job.error ?? 'Error en generación'}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
