import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Kiro3D, KIRO_STATES } from '../Kiro3D';
import type { KiroState, KiroExpression } from '../Kiro3D';
import { KIRO_BREAKPOINTS } from '../hooks/useKiroResponsive';
import { kiroSounds } from '../sounds/KiroSounds';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface KiroFloatingButtonProps {
  /** Estado actual de KIRO */
  kiroState: KiroState;
  /** Expresión actual de KIRO */
  expression: KiroExpression;
  /** Número de notificaciones no leídas */
  unreadCount: number;
  /** Callback al hacer tap para abrir */
  onOpen: () => void;
  /** Si el teclado virtual está visible */
  keyboardVisible?: boolean;
  /** Esquina preferida (cargada de settings) */
  preferredCorner?: Corner;
  /** Callback al cambiar esquina preferida */
  onCornerChange?: (corner: Corner) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const BUTTON_SIZE = KIRO_BREAKPOINTS.FLOATING_SIZE_MOBILE;
const LONG_PRESS_DURATION = 500; // ms para habilitar drag
const CORNER_STORAGE_KEY = 'kreoon_kiro_preferred_corner';
const MARGIN = 16; // px desde los bordes

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intenta hacer vibración háptica (si está disponible)
 */
function hapticFeedback(pattern: number | number[] = 10): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silenciar errores - vibrate no siempre está disponible
  }
}

/**
 * Calcula la esquina más cercana basada en la posición
 */
function getClosestCorner(x: number, y: number): Corner {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  const isLeft = x < centerX;
  const isTop = y < centerY;

  if (isTop && isLeft) return 'top-left';
  if (isTop && !isLeft) return 'top-right';
  if (!isTop && isLeft) return 'bottom-left';
  return 'bottom-right';
}

/**
 * Obtiene la posición CSS para una esquina
 */
function getCornerPosition(corner: Corner): { top?: string; bottom?: string; left?: string; right?: string } {
  const safeAreaBottom = 'env(safe-area-inset-bottom, 0px)';
  const safeAreaTop = 'env(safe-area-inset-top, 0px)';

  switch (corner) {
    case 'top-left':
      return {
        top: `calc(${MARGIN}px + ${safeAreaTop})`,
        left: `${MARGIN}px`,
      };
    case 'top-right':
      return {
        top: `calc(${MARGIN}px + ${safeAreaTop})`,
        right: `${MARGIN}px`,
      };
    case 'bottom-left':
      return {
        bottom: `calc(${MARGIN}px + ${safeAreaBottom})`,
        left: `${MARGIN}px`,
      };
    case 'bottom-right':
    default:
      return {
        bottom: `calc(${MARGIN}px + ${safeAreaBottom})`,
        right: `${MARGIN}px`,
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function KiroFloatingButton({
  kiroState,
  expression,
  unreadCount,
  onOpen,
  keyboardVisible = false,
  preferredCorner: initialCorner,
  onCornerChange,
}: KiroFloatingButtonProps) {
  // Estado
  const [corner, setCorner] = useState<Corner>(() => {
    // Cargar de props o localStorage
    if (initialCorner) return initialCorner;
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(CORNER_STORAGE_KEY);
      if (saved && ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(saved)) {
        return saved as Corner;
      }
    }
    return 'bottom-right';
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  // Refs
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Guardar esquina preferida
  // ─────────────────────────────────────────────────────────────────────────

  const saveCorner = useCallback(
    (newCorner: Corner) => {
      setCorner(newCorner);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CORNER_STORAGE_KEY, newCorner);
      }
      onCornerChange?.(newCorner);
    },
    [onCornerChange]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Touch handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsPressed(true);

    // Iniciar timer para long press
    longPressTimer.current = setTimeout(() => {
      // Long press detectado - habilitar drag
      setIsDragging(true);
      hapticFeedback([30, 50, 30]); // Patrón de vibración para indicar drag mode
    }, LONG_PRESS_DURATION);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartPos.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartPos.current.x;
      const deltaY = touch.clientY - touchStartPos.current.y;

      // Si el usuario se mueve mucho antes del long press, cancelar el timer
      if (!isDragging && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }

      // Si está en modo drag, actualizar posición
      if (isDragging) {
        e.preventDefault();
        setDragPosition({ x: touch.clientX, y: touch.clientY });
      }
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);

    // Limpiar timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isDragging && dragPosition) {
      // Terminar drag - snap a la esquina más cercana
      const newCorner = getClosestCorner(dragPosition.x, dragPosition.y);
      saveCorner(newCorner);
      setIsDragging(false);
      setDragPosition(null);
      hapticFeedback(10);
    } else if (!isDragging) {
      // Tap normal - abrir panel
      hapticFeedback(10);
      kiroSounds.play('action_click');
      onOpen();
    }

    touchStartPos.current = null;
  }, [isDragging, dragPosition, saveCorner, onOpen]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Calcular estilos
  // ─────────────────────────────────────────────────────────────────────────

  const stateColor = KIRO_STATES[kiroState]?.color || '#a78bfa';
  const cornerPos = getCornerPosition(corner);

  // Estilo base vs estilo de drag
  const buttonStyle: React.CSSProperties = isDragging && dragPosition
    ? {
        position: 'fixed',
        left: dragPosition.x - BUTTON_SIZE / 2,
        top: dragPosition.y - BUTTON_SIZE / 2,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        zIndex: 60,
        transition: 'none',
      }
    : {
        position: 'fixed',
        ...cornerPos,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        zIndex: 50,
        transition: 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        // Esconder cuando el teclado está visible y está en la parte inferior
        ...(keyboardVisible && (corner === 'bottom-left' || corner === 'bottom-right')
          ? { opacity: 0.3, transform: 'scale(0.8)' }
          : {}),
      };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={buttonRef}
      className={cn(
        'touch-none select-none cursor-pointer',
        'rounded-full',
        // Efecto de escala al presionar
        isPressed && !isDragging && 'scale-95',
        // Sombra de drag
        isDragging && 'shadow-2xl shadow-violet-500/40'
      )}
      style={buttonStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Efecto glow */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          'transition-all duration-300',
          kiroState === 'thinking' || kiroState === 'working'
            ? 'animate-pulse'
            : ''
        )}
        style={{
          background: `radial-gradient(circle, ${stateColor}40 0%, transparent 70%)`,
          transform: 'scale(1.3)',
        }}
      />

      {/* Mascota KIRO */}
      <div className="relative w-full h-full flex items-center justify-center">
        <Kiro3D
          size={BUTTON_SIZE - 8}
          mouseAngle={{ x: 0, y: 0 }}
          state={kiroState}
          expression={expression}
        />
      </div>

      {/* Badge de notificaciones */}
      {unreadCount > 0 && !isDragging && (
        <div
          className={cn(
            'absolute -top-1 -right-1',
            'min-w-[18px] h-[18px] rounded-full',
            'bg-red-500 border-2 border-[#0a0a12]',
            'flex items-center justify-center',
            'text-[10px] font-bold text-white',
            'shadow-lg shadow-red-500/50',
            'animate-pulse'
          )}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}

      {/* Indicador de modo drag */}
      {isDragging && (
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'border-2 border-dashed border-violet-400',
            'animate-spin-slow'
          )}
          style={{ animationDuration: '3s' }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS CSS ADICIONALES
// ═══════════════════════════════════════════════════════════════════════════

if (typeof document !== 'undefined') {
  const styleId = 'kiro-floating-button-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-spin-slow {
        animation: spin-slow 3s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }
}
