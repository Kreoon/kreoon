import { useEffect, useRef, useMemo, memo } from 'react';
import type { KiroState } from './useKiroAnimationLoop';

// =============================================================================
// TIPOS
// =============================================================================

type ParticleType = 'ambient' | 'sparkle' | 'energy';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  type: ParticleType;
  color: string;
  life: number;
  maxLife: number;
  // Para partículas orbitales
  orbitAngle?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
}

interface KiroParticlesProps {
  /** Estado actual de KIRO */
  kiroState: KiroState;
  /** Centro X del contenedor (relativo) */
  centerX?: number;
  /** Centro Y del contenedor (relativo) */
  centerY?: number;
  /** Si las partículas están habilitadas */
  enabled?: boolean;
  /** Reducir partículas para móvil */
  reducedMotion?: boolean;
}

// =============================================================================
// CONFIGURACIÓN POR ESTADO
// =============================================================================

interface StateParticleConfig {
  ambientCount: number;
  sparkleCount: number;
  energyCount: number;
  ambientSpeed: number;
  energyOrbitSpeed: number;
  colors: string[];
}

const STATE_CONFIGS: Record<KiroState, StateParticleConfig> = {
  idle: {
    ambientCount: 4,
    sparkleCount: 0,
    energyCount: 0,
    ambientSpeed: 0.2,
    energyOrbitSpeed: 0,
    colors: ['#a78bfa', '#c4b5fd'],
  },
  listening: {
    ambientCount: 5,
    sparkleCount: 2,
    energyCount: 0,
    ambientSpeed: 0.3,
    energyOrbitSpeed: 0,
    colors: ['#22d3ee', '#67e8f9'],
  },
  thinking: {
    ambientCount: 3,
    sparkleCount: 0,
    energyCount: 10,
    ambientSpeed: 0.15,
    energyOrbitSpeed: 0.02,
    colors: ['#fbbf24', '#fcd34d', '#fef3c7'],
  },
  speaking: {
    ambientCount: 3,
    sparkleCount: 6,
    energyCount: 0,
    ambientSpeed: 0.25,
    energyOrbitSpeed: 0,
    colors: ['#34d399', '#6ee7b7', '#a7f3d0'],
  },
  working: {
    ambientCount: 2,
    sparkleCount: 0,
    energyCount: 12,
    ambientSpeed: 0.2,
    energyOrbitSpeed: 0.035,
    colors: ['#60a5fa', '#93c5fd', '#bfdbfe'],
  },
  celebrating: {
    ambientCount: 5,
    sparkleCount: 15,
    energyCount: 0,
    ambientSpeed: 0.4,
    energyOrbitSpeed: 0,
    colors: ['#f472b6', '#fb7185', '#fda4af', '#fecdd3'],
  },
  playing: {
    ambientCount: 6,
    sparkleCount: 8,
    energyCount: 0,
    ambientSpeed: 0.35,
    energyOrbitSpeed: 0,
    colors: ['#a78bfa', '#c4b5fd', '#818cf8'],
  },
  sleeping: {
    ambientCount: 2,
    sparkleCount: 0,
    energyCount: 0,
    ambientSpeed: 0.1,
    energyOrbitSpeed: 0,
    colors: ['#6d28d9', '#7c3aed'],
  },
};

// =============================================================================
// CONSTANTES
// =============================================================================

const MAX_PARTICLES = 90;
const CANVAS_SIZE = 200; // Tamaño del canvas en px
const PARTICLE_BASE_SIZE = 2;
const ORBIT_BASE_RADIUS = 50;

// =============================================================================
// UTILIDADES
// =============================================================================

let particleIdCounter = 0;

function createParticle(
  type: ParticleType,
  config: StateParticleConfig,
  centerX: number,
  centerY: number
): Particle {
  const color = config.colors[Math.floor(Math.random() * config.colors.length)];

  if (type === 'energy') {
    // Partículas que orbitan
    const orbitAngle = Math.random() * Math.PI * 2;
    const orbitRadius = ORBIT_BASE_RADIUS + Math.random() * 20;
    return {
      id: particleIdCounter++,
      x: centerX + Math.cos(orbitAngle) * orbitRadius,
      y: centerY + Math.sin(orbitAngle) * orbitRadius,
      vx: 0,
      vy: 0,
      size: PARTICLE_BASE_SIZE + Math.random() * 2,
      opacity: 0.6 + Math.random() * 0.4,
      type,
      color,
      life: 0,
      maxLife: Infinity, // Las energy particles no mueren por vida
      orbitAngle,
      orbitRadius,
      orbitSpeed: config.energyOrbitSpeed * (0.8 + Math.random() * 0.4),
    };
  }

  if (type === 'sparkle') {
    // Partículas de brillo que aparecen y desaparecen
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 40;
    return {
      id: particleIdCounter++,
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: PARTICLE_BASE_SIZE + Math.random() * 3,
      opacity: 0,
      type,
      color,
      life: 0,
      maxLife: 60 + Math.random() * 60, // 1-2 segundos a 60fps
    };
  }

  // Ambient: partículas flotantes lentas
  return {
    id: particleIdCounter++,
    x: centerX + (Math.random() - 0.5) * 100,
    y: centerY + (Math.random() - 0.5) * 100,
    vx: (Math.random() - 0.5) * config.ambientSpeed,
    vy: (Math.random() - 0.5) * config.ambientSpeed,
    size: PARTICLE_BASE_SIZE + Math.random() * 1.5,
    opacity: 0.3 + Math.random() * 0.4,
    type,
    color,
    life: 0,
    maxLife: 180 + Math.random() * 120, // 3-5 segundos
  };
}

// =============================================================================
// COMPONENTE
// =============================================================================

export const KiroParticles = memo(function KiroParticles({
  kiroState,
  centerX = 100,
  centerY = 100,
  enabled = true,
  reducedMotion = false,
}: KiroParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const previousStateRef = useRef<KiroState>(kiroState);

  // Configuración actual (memoizada)
  const config = useMemo(() => {
    const baseConfig = STATE_CONFIGS[kiroState];
    if (reducedMotion) {
      return {
        ...baseConfig,
        ambientCount: Math.ceil(baseConfig.ambientCount / 2),
        sparkleCount: Math.ceil(baseConfig.sparkleCount / 2),
        energyCount: Math.ceil(baseConfig.energyCount / 2),
      };
    }
    return baseConfig;
  }, [kiroState, reducedMotion]);

  // Detectar cambio de estado para transición de partículas
  useEffect(() => {
    if (kiroState !== previousStateRef.current) {
      // Al cambiar de estado, marcar partículas existentes para fade out
      particlesRef.current.forEach((p) => {
        if (p.type === 'energy') {
          // Las energy se desvanecen rápido
          p.maxLife = p.life + 30;
        }
      });
      previousStateRef.current = kiroState;
    }
  }, [kiroState]);

  // Loop de animación
  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar DPI para pantallas retina
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      // Limpiar canvas
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const particles = particlesRef.current;

      // Contar partículas por tipo
      let ambientCount = 0;
      let sparkleCount = 0;
      let energyCount = 0;

      particles.forEach((p) => {
        if (p.type === 'ambient') ambientCount++;
        else if (p.type === 'sparkle') sparkleCount++;
        else if (p.type === 'energy') energyCount++;
      });

      // Spawn nuevas partículas si es necesario
      if (particles.length < MAX_PARTICLES) {
        if (ambientCount < config.ambientCount) {
          particles.push(createParticle('ambient', config, centerX, centerY));
        }
        if (sparkleCount < config.sparkleCount && Math.random() < 0.1) {
          particles.push(createParticle('sparkle', config, centerX, centerY));
        }
        if (energyCount < config.energyCount) {
          particles.push(createParticle('energy', config, centerX, centerY));
        }
      }

      // Actualizar y dibujar partículas
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        // Actualizar posición según tipo
        if (p.type === 'energy' && p.orbitAngle !== undefined && p.orbitSpeed !== undefined) {
          // Movimiento orbital
          p.orbitAngle += p.orbitSpeed;
          p.x = centerX + Math.cos(p.orbitAngle) * (p.orbitRadius || ORBIT_BASE_RADIUS);
          p.y = centerY + Math.sin(p.orbitAngle) * (p.orbitRadius || ORBIT_BASE_RADIUS);
        } else {
          // Movimiento lineal con rebote suave
          p.x += p.vx;
          p.y += p.vy;

          // Rebote en bordes con amortiguación
          if (p.x < 20 || p.x > CANVAS_SIZE - 20) {
            p.vx *= -0.8;
            p.x = Math.max(20, Math.min(CANVAS_SIZE - 20, p.x));
          }
          if (p.y < 20 || p.y > CANVAS_SIZE - 20) {
            p.vy *= -0.8;
            p.y = Math.max(20, Math.min(CANVAS_SIZE - 20, p.y));
          }

          // Pequeña deriva aleatoria para ambient
          if (p.type === 'ambient') {
            p.vx += (Math.random() - 0.5) * 0.02;
            p.vy += (Math.random() - 0.5) * 0.02;
            // Limitar velocidad
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > config.ambientSpeed) {
              p.vx *= config.ambientSpeed / speed;
              p.vy *= config.ambientSpeed / speed;
            }
          }
        }

        // Calcular opacidad basada en ciclo de vida
        let alpha = p.opacity;
        if (p.type === 'sparkle') {
          // Fade in/out para sparkles
          const lifeRatio = p.life / p.maxLife;
          if (lifeRatio < 0.2) {
            alpha = p.opacity * (lifeRatio / 0.2);
          } else if (lifeRatio > 0.8) {
            alpha = p.opacity * ((1 - lifeRatio) / 0.2);
          }
        } else if (p.life > p.maxLife - 30) {
          // Fade out al final de la vida
          alpha = p.opacity * ((p.maxLife - p.life) / 30);
        }

        // Dibujar partícula
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fill();

        // Glow effect para energy y sparkle
        if ((p.type === 'energy' || p.type === 'sparkle') && alpha > 0.3) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.3;
          ctx.fill();
        }

        ctx.globalAlpha = 1;

        // Remover partículas muertas
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, config, centerX, centerY]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
});
