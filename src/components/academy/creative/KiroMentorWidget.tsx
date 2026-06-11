import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { useMyGamificationState } from '@/hooks/academy/useAcademyGamification';
import { useMyEnrollments } from '@/hooks/academy/useAcademyEnrollment';

interface KiroMentorWidgetProps {
  spaceId: string;
  spaceSlug: string;
  accentColor?: string;
}

/**
 * Diferenciador KREOON vs Skool: KIRO Mentor.
 * Lee tu estado de gamificación + tu progreso y te sugiere UN próximo paso
 * concreto en lenguaje motivacional, como un NPC mentor de videojuego.
 */
export function KiroMentorWidget({ spaceId, spaceSlug, accentColor = '#8B5CF6' }: KiroMentorWidgetProps) {
  const { data: state } = useMyGamificationState(spaceId);
  const { data: enrollments = [] } = useMyEnrollments();

  const suggestion = useMemo(() => {
    if (!state) {
      return {
        emoji: '👋',
        title: '¡Hola, soy KIRO!',
        body: 'Tu mentor en este viaje. Te voy a acompañar paso a paso.',
        cta: { label: '🚀 Empezar', to: `/academia/${spaceSlug}/classroom` },
        mood: 'amber' as const,
      };
    }

    const inProgress = enrollments.find(
      (e) =>
        e.completion_pct > 0 &&
        e.completion_pct < 100 &&
        (e.course as any)?.space?.slug === spaceSlug
    );
    if (inProgress) {
      const courseTitle = (inProgress.course as any)?.title ?? 'tu curso';
      const courseSlug = (inProgress.course as any)?.slug ?? '';
      return {
        emoji: '📚',
        title: `¡Sigamos con "${courseTitle}"!`,
        body: `Vas en el ${Math.round(inProgress.completion_pct)}%. 5 minutos hoy te acercan al certificado.`,
        cta: { label: '▶ Reanudar', to: `/academia/${spaceSlug}/${courseSlug}/learn` },
        mood: 'purple' as const,
      };
    }

    const lastActive = state.last_active_date;
    if (lastActive && lastActive !== new Date().toISOString().split('T')[0] && state.streak_days >= 3) {
      return {
        emoji: '🔥',
        title: `¡Tu racha de ${state.streak_days} días peligra!`,
        body: 'Una lección o un comentario hoy mantiene la llama encendida.',
        cta: { label: '⚡ Mantener racha', to: `/academia/${spaceSlug}/feed` },
        mood: 'rose' as const,
      };
    }

    if (state.energy < 30) {
      return {
        emoji: '🔋',
        title: 'Tu energía está baja',
        body: 'Comenta o reacciona en la comunidad — recargas 5 puntos por interacción.',
        cta: { label: '💬 Ir al feed', to: `/academia/${spaceSlug}/feed` },
        mood: 'cyan' as const,
      };
    }

    if (state.level < 10) {
      return {
        emoji: '🏆',
        title: `¡Estás a un paso del nivel ${state.level + 1}!`,
        body: `Como ${state.title}, ya dominas lo básico. Completa una lección para subir.`,
        cta: { label: '🎯 Ver classroom', to: `/academia/${spaceSlug}/classroom` },
        mood: 'amber' as const,
      };
    }

    return {
      emoji: '🌟',
      title: '¡Sigue así, leyenda!',
      body: 'Has llegado al máximo nivel. Inspira publicando tu próximo aprendizaje.',
      cta: { label: '✍ Publicar', to: `/academia/${spaceSlug}/feed` },
      mood: 'emerald' as const,
    };
  }, [state, enrollments, spaceSlug]);

  return (
    <BigCard
      accentColor={accentColor}
      glow
      gradient={suggestion.mood}
      className="p-5 md:p-6"
    >
      <div className="flex items-start gap-4 md:gap-5">
        {/* Avatar KIRO XL con halo animado */}
        <div className="relative flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-60 motion-safe:animate-pulse"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
          <div
            className="relative h-20 w-20 md:h-24 md:w-24 rounded-full flex items-center justify-center border-4 shadow-2xl"
            style={{
              borderColor: accentColor,
              background: `radial-gradient(circle at 30% 30%, ${accentColor}80, ${accentColor}30)`,
            }}
          >
            <span className="text-4xl md:text-5xl motion-safe:animate-bounce" aria-hidden="true">
              {suggestion.emoji}
            </span>
          </div>
          {/* Indicador "online" */}
          <div
            className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-kreoon-bg-card"
            style={{ backgroundColor: '#10b981' }}
            aria-label="KIRO online"
          />
        </div>

        {/* Bocadillo */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>
            🤖 KIRO Mentor
          </div>
          <h3 className="font-extrabold text-lg md:text-xl leading-tight text-white mb-1.5">
            {suggestion.title}
          </h3>
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">
            {suggestion.body}
          </p>

          <Link
            to={suggestion.cta.to}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg motion-safe:hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              boxShadow: `0 6px 20px -4px ${accentColor}80`,
            }}
          >
            {suggestion.cta.label}
          </Link>
        </div>
      </div>
    </BigCard>
  );
}
