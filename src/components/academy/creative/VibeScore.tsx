import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VibeScoreProps {
  spaceId: string;
  accentColor?: string;
}

/**
 * Diferenciador KREOON vs Skool: Vibe Score.
 * Mide qué tan "vivo" está el space en las últimas 24h.
 * Calcula desde academy_space_point_events (cuántas acciones recientes).
 *
 * Niveles:
 *  - 0-5 acciones → "Tranquilo"
 *  - 6-20         → "Activo"
 *  - 21-50        → "Vibrante"
 *  - 51-100       → "En Llamas"
 *  - 100+         → "Imparable"
 */
export function VibeScore({ spaceId, accentColor = '#8B5CF6' }: VibeScoreProps) {
  const { data: actionsLast24h = 0 } = useQuery({
    queryKey: ['academy', 'vibe', spaceId],
    queryFn: async () => {
      if (!spaceId) return 0;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await (supabase as any)
        .from('academy_space_point_events')
        .select('*', { count: 'exact', head: true })
        .eq('space_id', spaceId)
        .gte('created_at', since);
      return count ?? 0;
    },
    enabled: !!spaceId,
    staleTime: 2 * 60 * 1000,
  });

  const { label, emoji } =
    actionsLast24h >= 100
      ? { label: 'Imparable', emoji: '🚀' }
      : actionsLast24h >= 51
      ? { label: 'En Llamas', emoji: '🔥' }
      : actionsLast24h >= 21
      ? { label: 'Vibrante', emoji: '⚡' }
      : actionsLast24h >= 6
      ? { label: 'Activo', emoji: '💫' }
      : { label: 'Tranquilo', emoji: '🌙' };

  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
      title={`${actionsLast24h} acciones en las últimas 24h`}
      style={{
        borderColor: `${accentColor}40`,
        backgroundColor: `${accentColor}10`,
        color: accentColor,
      }}
    >
      <Activity className="h-3 w-3" /> {emoji} {label}
    </span>
  );
}
