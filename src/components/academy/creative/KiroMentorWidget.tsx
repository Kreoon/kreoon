import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Trophy, BookOpen, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
 * concreto en lenguaje motivacional. No es una caja de chat con IA, es un
 * widget proactivo que actúa como mentor silencioso.
 */
export function KiroMentorWidget({ spaceId, spaceSlug, accentColor = '#8B5CF6' }: KiroMentorWidgetProps) {
  const { data: state } = useMyGamificationState(spaceId);
  const { data: enrollments = [] } = useMyEnrollments();

  const suggestion = useMemo(() => {
    if (!state) {
      return {
        icon: Sparkles,
        title: 'Hola, soy KIRO',
        body: 'Tu mentor silencioso. Voy a guiarte mientras aprendes.',
        cta: { label: 'Explorar cursos', to: `/academia/${spaceSlug}/classroom` },
      };
    }

    // 1) ¿Hay curso en progreso?
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
        icon: BookOpen,
        title: `Sigamos con "${courseTitle}"`,
        body: `Vas en el ${Math.round(inProgress.completion_pct)}%. Cinco minutos hoy te acercan al certificado.`,
        cta: { label: 'Reanudar', to: `/academia/${spaceSlug}/${courseSlug}/learn` },
      };
    }

    // 2) ¿Streak en riesgo? (último activo no es hoy)
    const lastActive = state.last_active_date;
    if (lastActive && lastActive !== new Date().toISOString().split('T')[0] && state.streak_days >= 3) {
      return {
        icon: Flame,
        title: `Tu racha de ${state.streak_days} días peligra`,
        body: 'Una sola lección o un comentario hoy mantiene la llama encendida.',
        cta: { label: 'Mantener racha', to: `/academia/${spaceSlug}/feed` },
      };
    }

    // 3) ¿Energy baja?
    if (state.energy < 30) {
      return {
        icon: Sparkles,
        title: 'Tu Energy está apagada',
        body: 'Comenta o reacciona en la comunidad — recargas 5 puntos por interacción.',
        cta: { label: 'Ir al feed', to: `/academia/${spaceSlug}/feed` },
      };
    }

    // 4) ¿Cerca del próximo nivel?
    if (state.level < 10) {
      return {
        icon: Trophy,
        title: `Estás a un paso del nivel ${state.level + 1}`,
        body: `Como ${state.title}, ya dominas lo básico. Completa una lección para subir.`,
        cta: { label: 'Ver classroom', to: `/academia/${spaceSlug}/classroom` },
      };
    }

    // 5) Default
    return {
      icon: Sparkles,
      title: '¡Sigue así, leyenda!',
      body: 'Has llegado al máximo nivel. Inspira a la comunidad publicando tu próximo aprendizaje.',
      cta: { label: 'Publicar', to: `/academia/${spaceSlug}/feed` },
    };
  }, [state, enrollments, spaceSlug]);

  const Icon = suggestion.icon;

  return (
    <Card
      className={cn(
        'p-4 border-2 relative overflow-hidden',
        'bg-gradient-to-br from-purple-500/10 via-cyan-500/5 to-transparent'
      )}
      style={{ borderColor: `${accentColor}30` }}
    >
      {/* Aura decorativa */}
      <div
        className="absolute -top-6 -right-6 h-24 w-24 rounded-full blur-2xl pointer-events-none"
        style={{ backgroundColor: `${accentColor}30` }}
      />
      <div className="relative">
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}30` }}
          >
            <Icon className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              KIRO Mentor
            </div>
            <h3 className="font-bold text-sm leading-tight">{suggestion.title}</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{suggestion.body}</p>
          </div>
        </div>
        <Link
          to={suggestion.cta.to}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          style={{ color: accentColor }}
        >
          {suggestion.cta.label} →
        </Link>
      </div>
    </Card>
  );
}
