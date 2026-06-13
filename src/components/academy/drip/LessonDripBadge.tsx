// Badge reusable para indicar drip: candado + "Disponible en X días" si
// la lección no está desbloqueada para el usuario actual.
// Usado en listas de lecciones del player y del classroom.

import { useQuery } from '@tanstack/react-query';
import { Lock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  lessonId: string;
  className?: string;
}

export function LessonDripBadge({ lessonId, className }: Props) {
  const { data } = useQuery({
    queryKey: ['academy', 'lesson-drip-status', lessonId],
    queryFn: async () => {
      const [unlockedRes, daysRes] = await Promise.all([
        (supabase as any).rpc('is_lesson_unlocked_for_user', { p_lesson_id: lessonId }),
        (supabase as any).rpc('days_until_lesson_unlock', { p_lesson_id: lessonId }),
      ]);
      return {
        unlocked: !!unlockedRes.data,
        daysUntil: Number(daysRes.data ?? 0),
      };
    },
    staleTime: 60_000,
  });

  if (!data || data.unlocked) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full',
        'bg-amber-500/10 border border-amber-500/30 text-amber-300',
        className
      )}
      title={`Esta lección se desbloquea ${data.daysUntil} días después de tu inscripción al curso`}
    >
      <Lock className="h-2.5 w-2.5" />
      {data.daysUntil > 0
        ? <>Disponible en {data.daysUntil} {data.daysUntil === 1 ? 'día' : 'días'}</>
        : <>Aún no disponible</>}
    </span>
  );
}

/**
 * Wrapper conveniente para envolver un row de lección.
 * Si está bloqueada, mostrá el row en opacity-50 y showcase el badge.
 */
export function LessonLockOverlay({
  lessonId,
  children,
}: { lessonId: string; children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ['academy', 'lesson-drip-status', lessonId],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc('is_lesson_unlocked_for_user', {
        p_lesson_id: lessonId,
      });
      return !!data;
    },
    staleTime: 60_000,
  });

  const unlocked = data !== false;
  return (
    <div className={cn('relative', !unlocked && 'opacity-60 pointer-events-none')}>
      {children}
      {!unlocked && (
        <div className="absolute top-1 right-1 z-10 pointer-events-auto">
          <LessonDripBadge lessonId={lessonId} />
        </div>
      )}
    </div>
  );
}
