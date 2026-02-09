import { useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

// KiroState definido localmente para evitar dependencia circular
export type KiroState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'working'
  | 'celebrating'
  | 'playing'
  | 'sleeping';

export interface KiroAnimationValues {
  /** Escala de respiración (0.97 a 1.03) */
  breathScale: number;
  /** Escala Y de los ojos para parpadeo (0.1 a 1) */
  blinkScaleY: number;
  /** Offset X de micro-movimiento idle */
  idleOffsetX: number;
  /** Offset Y de micro-movimiento idle */
  idleOffsetY: number;
  /** Ángulo de rotación de la antena (-15 a 15) */
  antennaAngle: number;
  /** Opacidad del pulso LED de la antena (0.3 a 1) */
  antennaPulseOpacity: number;
  /** Apertura de la boca (0 a 1) - prep para lip sync */
  mouthOpenness: number;
  /** Color del glow ambiental */
  glowColor: string;
  /** Opacidad del glow ambiental (0 a 0.4) */
  glowOpacity: number;
  /** Inclinación del cuerpo en grados (-3 a 3) */
  bodyTilt: number;
  /** Offset Y para reacciones (jump, bounce) */
  reactionOffsetY: number;
  /** Escala para reacciones (bounce, shake) */
  reactionScale: number;
}

export type ReactionType = 'bounce' | 'shake' | 'nod' | 'wiggle' | 'jump';

type BlinkState = 'open' | 'closing' | 'closed' | 'opening';

interface AnimationState {
  // Respiración
  breathPhase: number;
  // Parpadeo
  blinkState: BlinkState;
  blinkTimer: number;
  blinkPhaseTimer: number;
  doDoubleBlink: boolean;
  // Micro-movimiento idle
  idleTargetX: number;
  idleTargetY: number;
  idleTimer: number;
  // Antena
  antennaTime: number;
  antennaReactionAngle: number;
  antennaReactionDecay: number;
  // Glow
  glowPhase: number;
  // Body tilt
  currentTilt: number;
  targetTilt: number;
  // Celebración tilt alternante
  celebrationTiltPhase: number;
  // Reacciones
  reactionType: ReactionType | null;
  reactionProgress: number;
  reactionDuration: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE ANIMACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const GLOW_COLORS: Record<KiroState | 'sleepy', { color: string; baseOpacity: number }> = {
  idle: { color: '#7c3aed', baseOpacity: 0.15 },
  listening: { color: '#22d3ee', baseOpacity: 0.2 },
  thinking: { color: '#22d3ee', baseOpacity: 0.2 },
  speaking: { color: '#8b5cf6', baseOpacity: 0.25 },
  working: { color: '#34d399', baseOpacity: 0.2 },
  celebrating: { color: '#eab308', baseOpacity: 0.3 },
  playing: { color: '#f472b6', baseOpacity: 0.2 },
  sleeping: { color: '#6d28d9', baseOpacity: 0.1 },
  sleepy: { color: '#6366f1', baseOpacity: 0.1 },
};

// Configuración de respiración por estado
const BREATH_CONFIG: Record<KiroState | 'sleepy', { cycleDuration: number; amplitude: number }> = {
  idle: { cycleDuration: 3000, amplitude: 0.02 },
  listening: { cycleDuration: 2500, amplitude: 0.022 },
  thinking: { cycleDuration: 2000, amplitude: 0.025 },
  speaking: { cycleDuration: 2200, amplitude: 0.022 },
  working: { cycleDuration: 2500, amplitude: 0.02 },
  celebrating: { cycleDuration: 1500, amplitude: 0.035 },
  playing: { cycleDuration: 1800, amplitude: 0.028 },
  sleeping: { cycleDuration: 5000, amplitude: 0.03 },
  sleepy: { cycleDuration: 5000, amplitude: 0.03 },
};

// Configuración de parpadeo por estado
const BLINK_CONFIG: Record<KiroState | 'sleepy', { minInterval: number; maxInterval: number; baseScaleY: number }> = {
  idle: { minInterval: 2000, maxInterval: 6000, baseScaleY: 1 },
  listening: { minInterval: 2000, maxInterval: 5000, baseScaleY: 1 },
  thinking: { minInterval: 1500, maxInterval: 3000, baseScaleY: 1 },
  speaking: { minInterval: 2000, maxInterval: 5000, baseScaleY: 1 },
  working: { minInterval: 2500, maxInterval: 6000, baseScaleY: 1 },
  celebrating: { minInterval: 3000, maxInterval: 8000, baseScaleY: 1 },
  playing: { minInterval: 2000, maxInterval: 5000, baseScaleY: 1 },
  sleeping: { minInterval: 4000, maxInterval: 8000, baseScaleY: 0.4 },
  sleepy: { minInterval: 3000, maxInterval: 6000, baseScaleY: 0.6 },
};

// Configuración de micro-movimiento por estado
const IDLE_MOVEMENT_CONFIG: Record<KiroState | 'sleepy', { rangeX: number; rangeY: number; intervalMin: number; intervalMax: number }> = {
  idle: { rangeX: 2, rangeY: 1.5, intervalMin: 2000, intervalMax: 4000 },
  listening: { rangeX: 1.5, rangeY: 1, intervalMin: 2000, intervalMax: 3500 },
  thinking: { rangeX: 1, rangeY: 0.8, intervalMin: 1500, intervalMax: 3000 },
  speaking: { rangeX: 1.5, rangeY: 1.2, intervalMin: 1500, intervalMax: 3000 },
  working: { rangeX: 0.5, rangeY: 0.4, intervalMin: 3000, intervalMax: 5000 },
  celebrating: { rangeX: 4, rangeY: 3, intervalMin: 500, intervalMax: 1000 },
  playing: { rangeX: 3, rangeY: 2, intervalMin: 800, intervalMax: 1500 },
  sleeping: { rangeX: 0.3, rangeY: 0.2, intervalMin: 5000, intervalMax: 8000 },
  sleepy: { rangeX: 0.5, rangeY: 0.3, intervalMin: 4000, intervalMax: 7000 },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/** Interpolación lineal */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Número aleatorio en rango */
function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Easing ease-out cubic */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Easing ease-in-out */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface UseKiroAnimationLoopOptions {
  kiroState: KiroState;
  mouseAngle?: { x: number; y: number };
  enabled?: boolean;
  isSleepy?: boolean;
}

export function useKiroAnimationLoop({
  kiroState,
  mouseAngle = { x: 0, y: 0 },
  enabled = true,
  isSleepy = false,
}: UseKiroAnimationLoopOptions) {
  // Valores de animación accesibles externamente (sin causar re-renders)
  const animationValues = useRef<KiroAnimationValues>({
    breathScale: 1,
    blinkScaleY: 1,
    idleOffsetX: 0,
    idleOffsetY: 0,
    antennaAngle: 0,
    antennaPulseOpacity: 0.5,
    mouthOpenness: 0,
    glowColor: '#7c3aed',
    glowOpacity: 0.15,
    bodyTilt: 0,
    reactionOffsetY: 0,
    reactionScale: 1,
  });

  // Estado interno de animación (no expuesto)
  const stateRef = useRef<AnimationState>({
    breathPhase: 0,
    blinkState: 'open',
    blinkTimer: randomRange(2000, 4000),
    blinkPhaseTimer: 0,
    doDoubleBlink: false,
    idleTargetX: 0,
    idleTargetY: 0,
    idleTimer: randomRange(2000, 4000),
    antennaTime: 0,
    antennaReactionAngle: 0,
    antennaReactionDecay: 0,
    glowPhase: 0,
    currentTilt: 0,
    targetTilt: 0,
    celebrationTiltPhase: 0,
    reactionType: null,
    reactionProgress: 0,
    reactionDuration: 0,
  });

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const previousStateRef = useRef<KiroState>(kiroState);

  // Determinar estado efectivo (sleepy override)
  const effectiveState = isSleepy ? 'sleepy' : kiroState;

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIONES DE ACTUALIZACIÓN DE SUBSISTEMAS
  // ─────────────────────────────────────────────────────────────────────────

  const updateBreathing = useCallback((deltaTime: number, state: KiroState | 'sleepy') => {
    const config = BREATH_CONFIG[state];
    const s = stateRef.current;
    const values = animationValues.current;

    // Avanzar fase de respiración
    s.breathPhase += (deltaTime / config.cycleDuration) * Math.PI * 2;
    if (s.breathPhase > Math.PI * 2) {
      s.breathPhase -= Math.PI * 2;
    }

    // Calcular escala
    values.breathScale = 1 + Math.sin(s.breathPhase) * config.amplitude;
  }, []);

  const updateBlink = useCallback((deltaTime: number, state: KiroState | 'sleepy') => {
    const config = BLINK_CONFIG[state];
    const s = stateRef.current;
    const values = animationValues.current;

    // Al inicio de celebrating, mantener ojos abiertos
    if (state === 'celebrating' && s.blinkTimer > 2000) {
      s.blinkTimer = 2000;
    }

    switch (s.blinkState) {
      case 'open':
        s.blinkTimer -= deltaTime;
        if (s.blinkTimer <= 0) {
          s.blinkState = 'closing';
          s.blinkPhaseTimer = 0;
          s.doDoubleBlink = Math.random() < 0.15;
        }
        values.blinkScaleY = config.baseScaleY;
        break;

      case 'closing':
        s.blinkPhaseTimer += deltaTime;
        values.blinkScaleY = lerp(config.baseScaleY, 0.1, Math.min(1, s.blinkPhaseTimer / 60));
        if (s.blinkPhaseTimer >= 60) {
          s.blinkState = 'closed';
          s.blinkPhaseTimer = 0;
        }
        break;

      case 'closed':
        s.blinkPhaseTimer += deltaTime;
        values.blinkScaleY = 0.1;
        if (s.blinkPhaseTimer >= 40) {
          s.blinkState = 'opening';
          s.blinkPhaseTimer = 0;
        }
        break;

      case 'opening':
        s.blinkPhaseTimer += deltaTime;
        values.blinkScaleY = lerp(0.1, config.baseScaleY, Math.min(1, s.blinkPhaseTimer / 60));
        if (s.blinkPhaseTimer >= 60) {
          if (s.doDoubleBlink) {
            s.doDoubleBlink = false;
            s.blinkState = 'closing';
            s.blinkPhaseTimer = 0;
            s.blinkTimer = 150; // Parpadeo rápido
          } else {
            s.blinkState = 'open';
            s.blinkTimer = randomRange(config.minInterval, config.maxInterval);
          }
        }
        break;
    }
  }, []);

  const updateIdleMovement = useCallback((deltaTime: number, state: KiroState | 'sleepy') => {
    const config = IDLE_MOVEMENT_CONFIG[state];
    const s = stateRef.current;
    const values = animationValues.current;

    // Timer para nuevo target
    s.idleTimer -= deltaTime;
    if (s.idleTimer <= 0) {
      s.idleTargetX = randomRange(-config.rangeX, config.rangeX);
      s.idleTargetY = randomRange(-config.rangeY, config.rangeY);
      s.idleTimer = randomRange(config.intervalMin, config.intervalMax);
    }

    // Interpolar hacia target (lerp suave)
    const lerpFactor = state === 'celebrating' ? 0.08 : 0.02;
    values.idleOffsetX = lerp(values.idleOffsetX, s.idleTargetX, lerpFactor);
    values.idleOffsetY = lerp(values.idleOffsetY, s.idleTargetY, lerpFactor);
  }, []);

  const updateAntenna = useCallback((deltaTime: number, state: KiroState | 'sleepy') => {
    const s = stateRef.current;
    const values = animationValues.current;

    // Oscilación pendular base
    s.antennaTime += deltaTime / 1000;
    let baseAngle = Math.sin(s.antennaTime * 0.8) * 8;

    // Aplicar reacciones con decay
    if (s.antennaReactionDecay > 0) {
      baseAngle += s.antennaReactionAngle * s.antennaReactionDecay;
      s.antennaReactionDecay *= 0.95; // Decay exponencial
      if (s.antennaReactionDecay < 0.01) {
        s.antennaReactionDecay = 0;
      }
    }

    values.antennaAngle = baseAngle;

    // Pulso del LED
    let pulseSpeed: number;
    let pulseBase: number;
    let pulseAmplitude: number;

    switch (state) {
      case 'thinking':
        pulseSpeed = 0.5;
        pulseBase = 0.6;
        pulseAmplitude = 0.4;
        break;
      case 'celebrating':
        pulseSpeed = 0;
        pulseBase = 1;
        pulseAmplitude = 0;
        break;
      case 'working':
        // Parpadeo tipo semáforo
        const workingPhase = (s.antennaTime * 1000) % 400;
        values.antennaPulseOpacity = workingPhase < 200 ? 1 : 0.3;
        return;
      default:
        pulseSpeed = 3;
        pulseBase = 0.5;
        pulseAmplitude = 0.3;
    }

    if (pulseAmplitude > 0) {
      values.antennaPulseOpacity = pulseBase + Math.sin(s.antennaTime / pulseSpeed * Math.PI * 2) * pulseAmplitude;
    } else {
      values.antennaPulseOpacity = pulseBase;
    }
  }, []);

  const updateGlow = useCallback((deltaTime: number, state: KiroState | 'sleepy') => {
    const config = GLOW_COLORS[state];
    const s = stateRef.current;
    const values = animationValues.current;

    // Transición de color (simplificado - el color cambia inmediato, la opacidad suave)
    values.glowColor = config.color;

    // Pulso de opacidad
    s.glowPhase += deltaTime / 1000;
    let pulseMultiplier: number;

    switch (state) {
      case 'celebrating':
        pulseMultiplier = 0.7 + Math.sin(s.glowPhase * 4) * 0.3;
        break;
      case 'thinking':
        pulseMultiplier = 0.8 + Math.sin(s.glowPhase * 2) * 0.2;
        break;
      case 'speaking':
        // Sincronizar con mouthOpenness
        pulseMultiplier = 0.7 + values.mouthOpenness * 0.3;
        break;
      default:
        pulseMultiplier = 0.85 + Math.sin(s.glowPhase * 0.5) * 0.15;
    }

    values.glowOpacity = lerp(values.glowOpacity, config.baseOpacity * pulseMultiplier, 0.05);
  }, []);

  const updateBodyTilt = useCallback((deltaTime: number, state: KiroState | 'sleepy', mouse: { x: number; y: number }) => {
    const s = stateRef.current;
    const values = animationValues.current;

    if (state === 'celebrating') {
      // Bailecito alternante
      s.celebrationTiltPhase += deltaTime / 1000;
      s.targetTilt = Math.sin(s.celebrationTiltPhase * 8) * 4;
    } else if (state === 'sleepy') {
      // Cabeceo constante
      s.targetTilt = -3;
    } else {
      // Inclinación hacia el cursor
      s.targetTilt = mouse.x * 2;
    }

    // Interpolar suavemente
    s.currentTilt = lerp(s.currentTilt, s.targetTilt, 0.03);
    values.bodyTilt = s.currentTilt;
  }, []);

  const updateMouthOpenness = useCallback((deltaTime: number, state: KiroState | 'sleepy') => {
    const values = animationValues.current;
    const s = stateRef.current;

    if (state === 'speaking') {
      // Simulación de habla con ondas pseudo-aleatorias
      const time = s.antennaTime;
      const wave1 = Math.sin(time * 8) * 0.3;
      const wave2 = Math.sin(time * 12 + 0.5) * 0.2;
      const wave3 = Math.sin(time * 5) * 0.2;
      values.mouthOpenness = 0.3 + wave1 + wave2 + wave3;
      values.mouthOpenness = Math.max(0, Math.min(1, values.mouthOpenness));
    } else {
      // Cerrar boca gradualmente
      values.mouthOpenness = lerp(values.mouthOpenness, 0, 0.1);
    }
  }, []);

  const updateReactions = useCallback((deltaTime: number) => {
    const s = stateRef.current;
    const values = animationValues.current;

    if (!s.reactionType) {
      values.reactionOffsetY = lerp(values.reactionOffsetY, 0, 0.1);
      values.reactionScale = lerp(values.reactionScale, 1, 0.1);
      return;
    }

    s.reactionProgress += deltaTime;
    const t = Math.min(1, s.reactionProgress / s.reactionDuration);

    switch (s.reactionType) {
      case 'bounce': {
        // Efecto de rebote
        const bounceT = easeOutCubic(t);
        const bounce = Math.sin(bounceT * Math.PI * 3) * (1 - bounceT);
        values.reactionScale = 1 + bounce * 0.15;
        values.reactionOffsetY = -bounce * 8;
        break;
      }
      case 'shake': {
        // Vibración horizontal
        const shakeIntensity = (1 - t) * 4;
        values.reactionOffsetY = Math.sin(t * Math.PI * 20) * shakeIntensity;
        break;
      }
      case 'nod': {
        // Asentimiento
        const nodT = easeInOutQuad(t);
        values.reactionOffsetY = Math.sin(nodT * Math.PI * 2) * -5;
        break;
      }
      case 'wiggle': {
        // Meneo lateral
        const wiggleIntensity = (1 - t) * 3;
        values.reactionScale = 1 + Math.sin(t * Math.PI * 10) * 0.02 * (1 - t);
        values.reactionOffsetY = Math.sin(t * Math.PI * 8) * wiggleIntensity;
        break;
      }
      case 'jump': {
        // Salto con gravedad
        const jumpT = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
        const eased = easeOutCubic(jumpT);
        values.reactionOffsetY = -eased * 15;
        values.reactionScale = 1 + (t < 0.3 ? -0.05 : eased * 0.08 * (1 - t));
        break;
      }
    }

    // Terminar reacción
    if (t >= 1) {
      s.reactionType = null;
      s.reactionProgress = 0;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LOOP PRINCIPAL DE ANIMACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) return;

    const animate = (timestamp: number) => {
      const deltaTime = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      const state = isSleepy ? 'sleepy' : kiroState;

      // Actualizar cada subsistema
      updateBreathing(deltaTime, state);
      updateBlink(deltaTime, state);
      updateIdleMovement(deltaTime, state);
      updateAntenna(deltaTime, state);
      updateGlow(deltaTime, state);
      updateBodyTilt(deltaTime, state, mouseAngle);
      updateMouthOpenness(deltaTime, state);
      updateReactions(deltaTime);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, kiroState, isSleepy, mouseAngle, updateBreathing, updateBlink, updateIdleMovement, updateAntenna, updateGlow, updateBodyTilt, updateMouthOpenness, updateReactions]);

  // ─────────────────────────────────────────────────────────────────────────
  // DETECTAR CAMBIOS DE ESTADO PARA REACCIONES AUTOMÁTICAS
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const prevState = previousStateRef.current;
    previousStateRef.current = kiroState;

    if (prevState === kiroState) return;

    const s = stateRef.current;

    // Reacciones de antena al cambiar estado
    switch (kiroState) {
      case 'celebrating':
        s.antennaReactionAngle = 20;
        s.antennaReactionDecay = 1;
        break;
      case 'listening':
        s.antennaReactionAngle = 15;
        s.antennaReactionDecay = 0.8;
        break;
      default:
        // Pequeña vibración al cambiar
        s.antennaReactionAngle = 5;
        s.antennaReactionDecay = 0.5;
    }
  }, [kiroState]);

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIÓN PARA DISPARAR REACCIONES
  // ─────────────────────────────────────────────────────────────────────────

  const triggerReaction = useCallback((type: ReactionType) => {
    const s = stateRef.current;
    s.reactionType = type;
    s.reactionProgress = 0;

    // Duración según tipo
    switch (type) {
      case 'bounce':
        s.reactionDuration = 600;
        break;
      case 'shake':
        s.reactionDuration = 400;
        break;
      case 'nod':
        s.reactionDuration = 500;
        break;
      case 'wiggle':
        s.reactionDuration = 500;
        break;
      case 'jump':
        s.reactionDuration = 700;
        break;
    }

    // Reacciones de antena adicionales
    if (type === 'shake') {
      s.antennaReactionAngle = 8;
      s.antennaReactionDecay = 1;
    } else if (type === 'jump' || type === 'bounce') {
      s.antennaReactionAngle = 12;
      s.antennaReactionDecay = 0.9;
    }
  }, []);

  // Función para vibrar antena (para notificaciones)
  const triggerAntennaVibration = useCallback(() => {
    const s = stateRef.current;
    s.antennaReactionAngle = 5;
    s.antennaReactionDecay = 1;
  }, []);

  return {
    animationValues,
    triggerReaction,
    triggerAntennaVibration,
  };
}
