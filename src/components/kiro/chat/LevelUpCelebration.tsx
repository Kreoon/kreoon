import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { type KiroLevel } from '../config/gamification';
import { kiroSounds } from '../sounds/KiroSounds';
import { KiroConfetti, type KiroConfettiHandle } from '../animations';

// =============================================================================
// TIPOS
// =============================================================================

interface LevelUpCelebrationProps {
  /** Nuevo nivel alcanzado */
  level: KiroLevel;
  /** Nivel anterior */
  previousLevel: KiroLevel;
  /** Puntos otorgados que causaron el level up */
  pointsAwarded?: number;
  /** Callback al cerrar */
  onClose: () => void;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const AUTO_CLOSE_MS = 8000;

// =============================================================================
// ESTILOS CSS PARA ANIMACIONES
// =============================================================================

const celebrationStyles = `
  @keyframes kiro-level-bounce {
    0%, 100% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.2);
    }
    50% {
      transform: scale(0.9);
    }
    75% {
      transform: scale(1.1);
    }
  }

  @keyframes kiro-celebration-scale-in {
    0% {
      transform: scale(0.5);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes kiro-points-float {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    100% {
      transform: translateY(-20px);
      opacity: 0.5;
    }
  }

  .kiro-level-emoji {
    animation: kiro-level-bounce 0.8s ease-out;
  }

  .kiro-celebration-content {
    animation: kiro-celebration-scale-in 0.4s ease-out;
  }

  .kiro-points-badge {
    animation: kiro-points-float 2s ease-in-out infinite alternate;
  }
`;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

/**
 * Overlay de celebración cuando el usuario sube de nivel.
 * Incluye confetti animado con canvas, mensaje de KIRO y botón de cierre.
 */
export function LevelUpCelebration({
  level,
  previousLevel,
  pointsAwarded,
  onClose,
}: LevelUpCelebrationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const soundPlayedRef = useRef(false);
  const confettiRef = useRef<KiroConfettiHandle>(null);

  // Reproducir sonidos y disparar confetti al montar
  useEffect(() => {
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      kiroSounds.play('level_up');

      // Reproducir celebration un poco después para efecto
      setTimeout(() => {
        kiroSounds.play('celebration');
      }, 300);

      // Disparar confetti inicial
      confettiRef.current?.trigger('celebration');

      // Segundo burst de confetti después de un momento
      setTimeout(() => {
        confettiRef.current?.trigger('celebration');
      }, 800);

      // Tercer burst para efecto continuo
      setTimeout(() => {
        confettiRef.current?.trigger('mini');
      }, 1600);
    }
  }, []);

  // Auto-cerrar después de 8 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Esperar la animación de salida
    }, AUTO_CLOSE_MS);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    kiroSounds.play('action_click');
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Inyectar estilos */}
      <style dangerouslySetInnerHTML={{ __html: celebrationStyles }} />

      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 z-50',
          'flex items-center justify-center',
          'bg-gradient-radial',
          'transition-opacity duration-300'
        )}
        style={{
          background: `radial-gradient(circle at center, ${level.color}30 0%, rgba(10, 10, 18, 0.95) 70%)`,
        }}
      >
        {/* Confetti con canvas */}
        <KiroConfetti
          ref={confettiRef}
          width={350}
          height={400}
          enabled={true}
        />

        {/* Contenido de celebración */}
        <div className="kiro-celebration-content text-center px-6 relative z-10">
          {/* Emoji del nivel grande */}
          <div className="kiro-level-emoji text-5xl mb-3">{level.emoji}</div>

          {/* Título */}
          <h2 className="text-lg font-bold text-white mb-1">
            ¡SUBISTE DE NIVEL!
          </h2>

          {/* Nombre del nivel */}
          <div
            className="text-2xl font-bold mb-3"
            style={{ color: level.color }}
          >
            {level.name} {level.emoji}
          </div>

          {/* Mensaje de KIRO */}
          <p className="text-sm text-gray-300 mb-4 max-w-[250px] mx-auto leading-relaxed">
            {level.kiroMessage}
          </p>

          {/* Puntos otorgados */}
          {pointsAwarded && (
            <div
              className={cn(
                'kiro-points-badge inline-flex items-center gap-1.5',
                'px-3 py-1.5 rounded-full mb-4',
                'bg-yellow-500/20 border border-yellow-500/40'
              )}
            >
              <span className="text-yellow-400 font-bold">+{pointsAwarded} UP</span>
              <span className="text-lg">⭐</span>
            </div>
          )}

          {/* Indicador de progreso */}
          <div className="text-xs text-gray-500 mb-4">
            Nivel {previousLevel.level} → Nivel {level.level}
          </div>

          {/* Botón de cerrar */}
          <button
            onClick={handleClose}
            className={cn(
              'px-6 py-3 rounded-xl min-h-[48px]',
              'bg-violet-500/30 border border-violet-500/50',
              'text-violet-200 font-medium',
              'hover:bg-violet-500/40 transition-colors',
              'active:scale-95'
            )}
          >
            ¡Sigamos! 🚀
          </button>
        </div>
      </div>
    </>
  );
}
