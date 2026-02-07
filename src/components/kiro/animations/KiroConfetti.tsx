import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useEffect,
  memo,
} from 'react';

// =============================================================================
// TIPOS
// =============================================================================

export type ConfettiType = 'celebration' | 'mini' | 'sparkle';

export interface KiroConfettiHandle {
  /** Disparar confetti del tipo especificado */
  trigger: (type: ConfettiType) => void;
  /** Limpiar todas las partículas */
  clear: () => void;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
  shape: 'square' | 'circle' | 'star';
  gravity: number;
  friction: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface KiroConfettiProps {
  /** Ancho del canvas */
  width?: number;
  /** Alto del canvas */
  height?: number;
  /** Si el confetti está habilitado */
  enabled?: boolean;
  /** Reducir partículas para móvil/bajo rendimiento */
  reducedMotion?: boolean;
}

// =============================================================================
// CONFIGURACIÓN POR TIPO
// =============================================================================

interface ConfettiConfig {
  particleCount: number;
  colors: string[];
  initialVelocity: { x: [number, number]; y: [number, number] };
  gravity: number;
  friction: number;
  particleSize: [number, number];
  lifespan: [number, number];
  shapes: Array<'square' | 'circle' | 'star'>;
}

const CONFETTI_CONFIGS: Record<ConfettiType, ConfettiConfig> = {
  celebration: {
    particleCount: 50,
    colors: ['#a78bfa', '#eab308', '#ffffff', '#22d3ee', '#f472b6', '#34d399', '#fb923c'],
    initialVelocity: { x: [-8, 8], y: [-12, -6] },
    gravity: 0.25,
    friction: 0.98,
    particleSize: [6, 12],
    lifespan: [120, 180], // 2-3 segundos a 60fps
    shapes: ['square', 'circle', 'star'],
  },
  mini: {
    particleCount: 15,
    colors: ['#a78bfa', '#c4b5fd', '#22d3ee', '#fbbf24'],
    initialVelocity: { x: [-4, 4], y: [-8, -4] },
    gravity: 0.2,
    friction: 0.96,
    particleSize: [4, 8],
    lifespan: [60, 90], // 1-1.5 segundos
    shapes: ['square', 'circle'],
  },
  sparkle: {
    particleCount: 20,
    colors: ['#ffffff', '#fef3c7', '#e0e7ff', '#fce7f3'],
    initialVelocity: { x: [-2, 2], y: [-3, -1] },
    gravity: 0.05,
    friction: 0.99,
    particleSize: [2, 5],
    lifespan: [40, 70],
    shapes: ['circle', 'star'],
  },
};

// =============================================================================
// CONSTANTES
// =============================================================================

const MAX_PARTICLES = 150;
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 300;

// =============================================================================
// UTILIDADES
// =============================================================================

let confettiIdCounter = 0;

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createConfettiParticle(
  config: ConfettiConfig,
  originX: number,
  originY: number
): ConfettiParticle {
  const shape = config.shapes[Math.floor(Math.random() * config.shapes.length)];
  return {
    id: confettiIdCounter++,
    x: originX,
    y: originY,
    vx: randomRange(config.initialVelocity.x[0], config.initialVelocity.x[1]),
    vy: randomRange(config.initialVelocity.y[0], config.initialVelocity.y[1]),
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 15,
    size: randomRange(config.particleSize[0], config.particleSize[1]),
    color: config.colors[Math.floor(Math.random() * config.colors.length)],
    shape,
    gravity: config.gravity,
    friction: config.friction,
    opacity: 1,
    life: 0,
    maxLife: randomRange(config.lifespan[0], config.lifespan[1]),
  };
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number
): void {
  const spikes = 4;
  const outerRadius = size;
  const innerRadius = size * 0.4;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.beginPath();

  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// =============================================================================
// COMPONENTE
// =============================================================================

export const KiroConfetti = memo(
  forwardRef<KiroConfettiHandle, KiroConfettiProps>(function KiroConfetti(
    {
      width = DEFAULT_WIDTH,
      height = DEFAULT_HEIGHT,
      enabled = true,
      reducedMotion = false,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<ConfettiParticle[]>([]);
    const rafIdRef = useRef<number | null>(null);
    const isAnimatingRef = useRef(false);

    // Función para disparar confetti
    const trigger = useCallback(
      (type: ConfettiType) => {
        if (!enabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        let config = { ...CONFETTI_CONFIGS[type] };

        // Reducir partículas si es necesario
        if (reducedMotion) {
          config = {
            ...config,
            particleCount: Math.ceil(config.particleCount / 2),
          };
        }

        // Origen del confetti (centro inferior del canvas)
        const originX = width / 2;
        const originY = height * 0.7;

        // Crear partículas
        const newParticles: ConfettiParticle[] = [];
        const particlesToCreate = Math.min(
          config.particleCount,
          MAX_PARTICLES - particlesRef.current.length
        );

        for (let i = 0; i < particlesToCreate; i++) {
          newParticles.push(createConfettiParticle(config, originX, originY));
        }

        particlesRef.current.push(...newParticles);

        // Iniciar animación si no está corriendo
        if (!isAnimatingRef.current) {
          isAnimatingRef.current = true;
          startAnimation();
        }
      },
      [enabled, reducedMotion, width, height]
    );

    // Función para limpiar
    const clear = useCallback(() => {
      particlesRef.current = [];
    }, []);

    // Exponer funciones via ref
    useImperativeHandle(
      ref,
      () => ({
        trigger,
        clear,
      }),
      [trigger, clear]
    );

    // Función de animación
    const startAnimation = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ajustar DPI
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const animate = () => {
        const particles = particlesRef.current;

        // Limpiar canvas
        ctx.clearRect(0, 0, width, height);

        if (particles.length === 0) {
          isAnimatingRef.current = false;
          return;
        }

        // Actualizar y dibujar cada partícula
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];

          // Física
          p.vy += p.gravity;
          p.vx *= p.friction;
          p.vy *= p.friction;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;
          p.life++;

          // Fade out al final de la vida
          if (p.life > p.maxLife * 0.7) {
            p.opacity = 1 - (p.life - p.maxLife * 0.7) / (p.maxLife * 0.3);
          }

          // Dibujar partícula
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === 'star') {
            drawStar(ctx, p.x, p.y, p.size / 2, p.rotation);
          } else {
            // Square
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
          }

          ctx.globalAlpha = 1;

          // Remover partículas muertas o fuera de pantalla
          if (p.life >= p.maxLife || p.y > height + 50 || p.x < -50 || p.x > width + 50) {
            particles.splice(i, 1);
          }
        }

        rafIdRef.current = requestAnimationFrame(animate);
      };

      rafIdRef.current = requestAnimationFrame(animate);
    }, [width, height]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
      };
    }, []);

    if (!enabled) return null;

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width,
          height,
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 100,
        }}
        aria-hidden="true"
      />
    );
  })
);
