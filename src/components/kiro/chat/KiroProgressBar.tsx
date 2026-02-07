import { useState } from 'react';
import { cn } from '@/lib/utils';
import { type KiroLevel, formatPoints } from '../config/gamification';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface KiroProgressBarProps {
  /** Puntos totales del usuario */
  points: number;
  /** Nivel actual */
  level: KiroLevel;
  /** Siguiente nivel (null si está en el máximo) */
  nextLevel: KiroLevel | null;
  /** Porcentaje de progreso (0-100) */
  progress: number;
  /** Puntos que faltan para el siguiente nivel */
  pointsToNext: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS CSS PARA SHIMMER DORADO (NIVEL MÁXIMO)
// ═══════════════════════════════════════════════════════════════════════════

const shimmerStyles = `
  @keyframes kiro-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .kiro-shimmer-gold {
    background: linear-gradient(
      90deg,
      #eab308 0%,
      #fbbf24 25%,
      #fef3c7 50%,
      #fbbf24 75%,
      #eab308 100%
    );
    background-size: 200% 100%;
    animation: kiro-shimmer 2s linear infinite;
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Barra de progreso de nivel para KIRO.
 * Muestra el nivel actual, progreso y puntos totales.
 */
export function KiroProgressBar({
  points,
  level,
  nextLevel,
  progress,
  pointsToNext,
}: KiroProgressBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isMaxLevel = !nextLevel;

  // Tooltip content
  const tooltipText = isMaxLevel
    ? `${level.emoji} ${level.name} | MAX`
    : `Nivel ${level.level}: ${level.name} → Nivel ${nextLevel.level}: ${nextLevel.name} | Faltan ${formatPoints(pointsToNext)} UP`;

  return (
    <>
      {/* Inyectar estilos para shimmer */}
      <style dangerouslySetInnerHTML={{ __html: shimmerStyles }} />

      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5',
          'bg-[#0a0a12]/50 border-b border-violet-500/10'
        )}
        style={{ height: '32px' }}
      >
        {/* Nivel actual */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm">{level.emoji}</span>
          <span
            className="text-[11px] font-medium truncate max-w-[80px]"
            style={{ color: level.color }}
          >
            {level.name}
          </span>
        </div>

        {/* Barra de progreso */}
        <div
          className="relative flex-1 h-3 rounded-full overflow-hidden cursor-help"
          style={{ backgroundColor: 'rgba(124, 58, 237, 0.2)' }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Fill de la barra */}
          <div
            className={cn(
              'h-full rounded-full transition-all duration-600 ease-out',
              isMaxLevel && 'kiro-shimmer-gold'
            )}
            style={{
              width: `${progress}%`,
              ...(isMaxLevel
                ? {}
                : {
                    background: 'linear-gradient(90deg, #7c3aed, #c084fc)',
                  }),
            }}
          />

          {/* Porcentaje dentro de la barra (si hay espacio) */}
          {progress >= 30 && !isMaxLevel && (
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                'text-[9px] font-bold text-white/90'
              )}
            >
              {progress}%
            </span>
          )}

          {/* Tooltip */}
          {showTooltip && (
            <div
              className={cn(
                'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
                'px-2 py-1 rounded-md',
                'bg-[#1a1a2e] border border-violet-500/30',
                'text-[10px] text-violet-200 whitespace-nowrap',
                'shadow-lg z-50',
                'animate-in fade-in duration-150'
              )}
            >
              {tooltipText}
              {/* Flecha del tooltip */}
              <div
                className={cn(
                  'absolute top-full left-1/2 -translate-x-1/2',
                  'w-0 h-0',
                  'border-l-[6px] border-l-transparent',
                  'border-r-[6px] border-r-transparent',
                  'border-t-[6px] border-t-violet-500/30'
                )}
              />
            </div>
          )}
        </div>

        {/* Porcentaje fuera de la barra (si no hay espacio dentro) */}
        {progress < 30 && !isMaxLevel && (
          <span className="text-[10px] text-violet-400 font-medium flex-shrink-0">
            {progress}%
          </span>
        )}

        {/* Indicador MAX para nivel máximo */}
        {isMaxLevel && (
          <span className="text-[10px] text-yellow-400 font-bold flex-shrink-0">
            MAX
          </span>
        )}

        {/* Puntos totales */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[11px] font-bold text-violet-300">
            {formatPoints(points)}
          </span>
          <span className="text-[10px] text-violet-500">UP</span>
        </div>
      </div>
    </>
  );
}
