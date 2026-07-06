import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveState } from './types';

// ─── Save indicator ───────────────────────────────────────────────────────────

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return (
    <span className={cn('flex items-center gap-1 text-xs transition-all',
      state === 'saving' && 'text-zinc-400',
      state === 'saved' && 'text-emerald-400',
      state === 'error' && 'text-rose-400',
    )}>
      {state === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
      {state === 'saved' && <Check className="h-3 w-3" />}
      {state === 'error' && <AlertCircle className="h-3 w-3" />}
      {state === 'saving' ? 'Guardando...' : state === 'saved' ? 'Guardado' : 'Error'}
    </span>
  );
}
