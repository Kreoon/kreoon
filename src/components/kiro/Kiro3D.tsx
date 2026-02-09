import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  useKiroAnimationLoop,
  useKiroTransitions,
  type KiroState,
  type ReactionType,
} from './animations';

// =============================================================================
// TIPOS
// =============================================================================

// Re-export KiroState for external use
export type { KiroState };

export type KiroExpression = 'neutral' | 'happy' | 'surprised' | 'talking' | 'thinking' | 'sleepy';

// Alias for clarity
export type KiroReactionType = ReactionType;

export const KIRO_STATES = {
  idle: { label: 'Disponible', color: '#a78bfa' },
  listening: { label: 'Escuchando...', color: '#22d3ee' },
  thinking: { label: 'Procesando...', color: '#fbbf24' },
  speaking: { label: 'Hablando...', color: '#34d399' },
  working: { label: 'Ejecutando...', color: '#60a5fa' },
  celebrating: { label: '¡Logro!', color: '#f472b6' },
  playing: { label: 'Jugando', color: '#a78bfa' },
  sleeping: { label: 'Descansando...', color: '#6d28d9' },
} as const;

// =============================================================================
// INTERFACE DE CONTROL EXTERNO
// =============================================================================

export interface Kiro3DHandle {
  /** Disparar una reacción animada */
  triggerReaction: (type: KiroReactionType) => void;
  /** Hacer vibrar las antenas */
  triggerAntennaVibration: (intensity?: number) => void;
}

interface Kiro3DProps {
  size?: number;
  mouseAngle?: { x: number; y: number };
  state?: KiroState;
  expression?: KiroExpression;
  onClick?: () => void;
  animate?: boolean;
  /** Si KIRO está "somnoliento" (parpadeo más frecuente) */
  isSleepy?: boolean;
  /** Reducir animaciones para móvil/bajo rendimiento */
  reducedMotion?: boolean;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export const Kiro3D = forwardRef<Kiro3DHandle, Kiro3DProps>(function Kiro3D(
  {
    size = 120,
    mouseAngle = { x: 0, y: 0 },
    state = 'idle',
    expression = 'neutral',
    onClick,
    animate = true,
    isSleepy = false,
    reducedMotion = false,
  },
  ref
) {
  // Referencias a elementos DOM para manipulación directa
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyGroupRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGGElement>(null);
  const rightEyeRef = useRef<SVGGElement>(null);
  const leftPupilRef = useRef<SVGEllipseElement>(null);
  const rightPupilRef = useRef<SVGEllipseElement>(null);
  const leftWhiteRef = useRef<SVGEllipseElement>(null);
  const rightWhiteRef = useRef<SVGEllipseElement>(null);
  const leftAntennaPulseRef = useRef<SVGCircleElement>(null);
  const rightAntennaPulseRef = useRef<SVGCircleElement>(null);
  const leftAntennaRef = useRef<SVGPathElement>(null);
  const rightAntennaRef = useRef<SVGPathElement>(null);
  const glowFilterRef = useRef<SVGFEGaussianBlurElement>(null);
  const mouthRef = useRef<SVGGElement>(null);

  // Hook de animaciones
  const { animationValues, triggerReaction, triggerAntennaVibration } = useKiroAnimationLoop({
    kiroState: state,
    mouseAngle,
    enabled: animate && !reducedMotion,
    isSleepy,
  });

  // Hook de transiciones
  const { transitionValues } = useKiroTransitions({
    kiroState: state,
    enabled: animate && !reducedMotion,
  });

  // Exponer funciones de control
  useImperativeHandle(
    ref,
    () => ({
      triggerReaction,
      triggerAntennaVibration,
    }),
    [triggerReaction, triggerAntennaVibration]
  );

  // Loop de renderizado DOM (separado del cálculo de valores)
  useEffect(() => {
    if (!animate || reducedMotion) return;

    let rafId: number;

    const render = () => {
      const anim = animationValues.current;
      const trans = transitionValues.current;

      // Actualizar container (breathing + reaction)
      if (containerRef.current) {
        const totalScale = anim.breathScale * anim.reactionScale;
        const totalOffsetY = anim.idleOffsetY + anim.reactionOffsetY;
        containerRef.current.style.transform = `
          perspective(600px)
          rotateY(${mouseAngle.x * 8 + anim.bodyTilt}deg)
          rotateX(${-mouseAngle.y * 5}deg)
          scale(${totalScale})
          translateY(${totalOffsetY}px)
          translateX(${anim.idleOffsetX}px)
        `;
      }

      // Actualizar ojos (blinking)
      const eyeScaleY = anim.blinkScaleY;
      if (leftWhiteRef.current) {
        leftWhiteRef.current.setAttribute('ry', String(9 * eyeScaleY));
      }
      if (rightWhiteRef.current) {
        rightWhiteRef.current.setAttribute('ry', String(9 * eyeScaleY));
      }
      if (leftPupilRef.current) {
        leftPupilRef.current.setAttribute('ry', String(4.5 * eyeScaleY));
      }
      if (rightPupilRef.current) {
        rightPupilRef.current.setAttribute('ry', String(4.5 * eyeScaleY));
      }

      // Actualizar antenas (ángulo + pulso)
      if (leftAntennaRef.current) {
        leftAntennaRef.current.style.transform = `rotate(${-anim.antennaAngle}deg)`;
        leftAntennaRef.current.style.transformOrigin = '88px 16px';
      }
      if (rightAntennaRef.current) {
        rightAntennaRef.current.style.transform = `rotate(${anim.antennaAngle}deg)`;
        rightAntennaRef.current.style.transformOrigin = '112px 16px';
      }
      if (leftAntennaPulseRef.current) {
        leftAntennaPulseRef.current.style.opacity = String(anim.antennaPulseOpacity);
        leftAntennaPulseRef.current.setAttribute('fill', trans.antennaColor);
      }
      if (rightAntennaPulseRef.current) {
        rightAntennaPulseRef.current.style.opacity = String(anim.antennaPulseOpacity);
        rightAntennaPulseRef.current.setAttribute('fill', trans.antennaColor);
      }

      // Actualizar glow
      if (glowFilterRef.current) {
        const glowSize = 3 + anim.glowOpacity * 2;
        glowFilterRef.current.setAttribute('stdDeviation', String(glowSize));
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [animate, reducedMotion, mouseAngle, animationValues, transitionValues]);

  // Calcular offsets de ojos basados en mouse y transición
  const eyeOffsetX = mouseAngle.x * 4 + transitionValues.current.transitionGazeX * 0.5;
  const eyeOffsetY = mouseAngle.y * 3 + transitionValues.current.transitionGazeY * 0.5;

  // Color actual (con transición)
  const stateColor = transitionValues.current.bodyColor;
  const glowColor = transitionValues.current.glowColor;

  // Renderizar boca según expresión y mouthOpenness
  const renderMouth = useCallback(() => {
    const openness = animationValues.current.mouthOpenness;

    switch (expression) {
      case 'happy':
        return (
          <path
            d="M 88 104 Q 100 116 112 104"
            fill="none"
            stroke={stateColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      case 'surprised':
        return (
          <ellipse
            cx="100"
            cy="108"
            rx="5"
            ry={6 + openness * 4}
            fill="none"
            stroke={stateColor}
            strokeWidth="2"
          />
        );
      case 'talking':
        return (
          <ellipse
            cx="100"
            cy="107"
            rx="7"
            ry={3 + openness * 4}
            fill={stateColor}
            opacity="0.6"
          />
        );
      case 'thinking':
        return (
          <path
            d="M 90 107 Q 95 103 100 107 Q 105 111 110 107"
            fill="none"
            stroke={stateColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      case 'sleepy':
        return (
          <path
            d="M 92 108 Q 100 105 108 108"
            fill="none"
            stroke={stateColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        );
      default:
        return (
          <line
            x1="92"
            y1="106"
            x2="108"
            y2="106"
            stroke={stateColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
    }
  }, [expression, stateColor, animationValues]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        cursor: onClick ? 'pointer' : 'default',
        filter: `drop-shadow(0 0 ${state === 'celebrating' ? 25 : 12}px ${glowColor}50)`,
        transition: reducedMotion ? 'none' : 'filter 0.4s ease',
        willChange: 'transform',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 200 200">
        <defs>
          <linearGradient id="kg-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="kg-screen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id="kg-lens" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stateColor} />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <radialGradient id="kg-reflect" cx="30%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="kg-glow">
            <feGaussianBlur ref={glowFilterRef} stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g ref={bodyGroupRef}>
          {/* Shadow */}
          <ellipse cx="100" cy="185" rx="45" ry="8" fill="rgba(0,0,0,0.2)" />

          {/* Legs */}
          <rect x="72" y="150" width="14" height="22" rx="7" fill="#6d28d9" />
          <rect x="114" y="150" width="14" height="22" rx="7" fill="#6d28d9" />
          <ellipse cx="79" cy="172" rx="11" ry="5" fill="#5b21b6" />
          <ellipse cx="121" cy="172" rx="11" ry="5" fill="#5b21b6" />

          {/* Arms */}
          <rect
            x="26"
            y="82"
            width="18"
            height="11"
            rx="5.5"
            fill="#7c3aed"
            style={{
              transform: `rotate(${-mouseAngle.x * 5}deg)`,
              transformOrigin: '40px 87px',
            }}
          />
          <rect
            x="156"
            y="82"
            width="18"
            height="11"
            rx="5.5"
            fill="#7c3aed"
            style={{
              transform: `rotate(${mouseAngle.x * 5}deg)`,
              transformOrigin: '160px 87px',
            }}
          />

          {/* Body */}
          <rect x="42" y="48" width="116" height="108" rx="22" fill="url(#kg-body)" />

          {/* Screen */}
          <rect x="54" y="57" width="92" height="72" rx="14" fill="url(#kg-screen)" />
          <rect x="54" y="57" width="92" height="72" rx="14" fill="url(#kg-reflect)" />

          {/* Film strip detail */}
          {[64, 76, 88, 100, 112].map((y, i) => (
            <rect key={i} x="46" y={y} width="5" height="4" rx="1" fill="#4c1d95" opacity="0.4" />
          ))}

          {/* Camera lens */}
          <circle cx="100" cy="48" r="17" fill="#4c1d95" stroke={stateColor} strokeWidth="2.5" />
          <circle cx="100" cy="48" r="11" fill={`url(#kg-lens)`}>
            {state === 'working' && animate && !reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 100 48;360 100 48"
                dur="2s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          <circle cx="100" cy="48" r="5.5" fill="#1e1b4b" />
          <circle cx="96" cy="44" r="2.2" fill="rgba(255,255,255,0.6)" />

          {/* REC light */}
          <circle
            cx="136"
            cy="64"
            r="3.5"
            fill={state === 'listening' ? '#22d3ee' : '#ef4444'}
            filter="url(#kg-glow)"
          >
            {animate && !reducedMotion && (
              <animate
                attributeName="opacity"
                values="1;0.3;1"
                dur={state === 'listening' ? '0.5s' : '2s'}
                repeatCount="indefinite"
              />
            )}
          </circle>

          {/* Eyes with tracking */}
          <g
            ref={leftEyeRef}
            transform={`translate(${80 + eyeOffsetX * 0.3}, ${87 + eyeOffsetY * 0.3})`}
          >
            <ellipse
              ref={leftWhiteRef}
              cx="0"
              cy="0"
              rx="9"
              ry="9"
              fill="#e0e7ff"
            />
            <ellipse
              ref={leftPupilRef}
              cx={eyeOffsetX * 0.4}
              cy={eyeOffsetY * 0.4}
              rx="4.5"
              ry="4.5"
              fill={stateColor}
            />
            <circle
              cx={eyeOffsetX * 0.3 - 1.5}
              cy={eyeOffsetY * 0.3 - 1.5}
              r="1.5"
              fill="rgba(255,255,255,0.8)"
              style={{ opacity: animationValues.current.blinkScaleY > 0.5 ? 1 : 0 }}
            />
          </g>
          <g
            ref={rightEyeRef}
            transform={`translate(${120 + eyeOffsetX * 0.3}, ${87 + eyeOffsetY * 0.3})`}
          >
            <ellipse
              ref={rightWhiteRef}
              cx="0"
              cy="0"
              rx="9"
              ry="9"
              fill="#e0e7ff"
            />
            <ellipse
              ref={rightPupilRef}
              cx={eyeOffsetX * 0.4}
              cy={eyeOffsetY * 0.4}
              rx="4.5"
              ry="4.5"
              fill={stateColor}
            />
            <circle
              cx={eyeOffsetX * 0.3 - 1.5}
              cy={eyeOffsetY * 0.3 - 1.5}
              r="1.5"
              fill="rgba(255,255,255,0.8)"
              style={{ opacity: animationValues.current.blinkScaleY > 0.5 ? 1 : 0 }}
            />
          </g>

          {/* Mouth */}
          <g ref={mouthRef}>{renderMouth()}</g>

          {/* Antenna signals with pulse */}
          <path
            ref={leftAntennaRef}
            d="M 86 33 Q 83 22 88 16"
            fill="none"
            stroke={transitionValues.current.antennaColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <circle
            ref={leftAntennaPulseRef}
            cx="88"
            cy="16"
            r="4"
            fill={transitionValues.current.antennaColor}
            opacity="0"
          />
          <path
            ref={rightAntennaRef}
            d="M 114 33 Q 117 22 112 16"
            fill="none"
            stroke={transitionValues.current.antennaColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <circle
            ref={rightAntennaPulseRef}
            cx="112"
            cy="16"
            r="4"
            fill={transitionValues.current.antennaColor}
            opacity="0"
          />

          {/* State indicator ring */}
          {state !== 'idle' && state !== 'sleeping' && (
            <circle
              cx="100"
              cy="100"
              r="70"
              fill="none"
              stroke={glowColor}
              strokeWidth="1"
              opacity="0.2"
              strokeDasharray="8 6"
            >
              {animate && !reducedMotion && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0 100 100;360 100 100"
                  dur="8s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          )}

          {/* Sleeping ZZZ indicator */}
          {state === 'sleeping' && (
            <g opacity="0.6">
              <text
                x="140"
                y="50"
                fill={glowColor}
                fontSize="12"
                fontFamily="monospace"
              >
                Z
                {animate && !reducedMotion && (
                  <animate
                    attributeName="opacity"
                    values="0.3;1;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </text>
              <text
                x="150"
                y="38"
                fill={glowColor}
                fontSize="10"
                fontFamily="monospace"
              >
                z
                {animate && !reducedMotion && (
                  <animate
                    attributeName="opacity"
                    values="0.5;1;0.5"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                )}
              </text>
              <text
                x="158"
                y="28"
                fill={glowColor}
                fontSize="8"
                fontFamily="monospace"
              >
                z
                {animate && !reducedMotion && (
                  <animate
                    attributeName="opacity"
                    values="0.7;1;0.7"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                )}
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
});
