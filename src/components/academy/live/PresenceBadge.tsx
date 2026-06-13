import { useAcademyPresence } from '@/hooks/academy/useAcademyLive';
import { cn } from '@/lib/utils';

interface PresenceBadgeProps {
  spaceId: string | null | undefined;
  className?: string;
  variant?: 'compact' | 'full';
}

export function PresenceBadge({ spaceId, className, variant = 'full' }: PresenceBadgeProps) {
  const { online } = useAcademyPresence(spaceId);

  if (variant === 'compact') {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-emerald-300', className)}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        {online}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs',
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {online === 1 ? '1 en línea ahora' : `${online} en línea ahora`}
    </span>
  );
}
