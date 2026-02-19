import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { kiroSounds } from '../sounds/KiroSounds';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

type SheetState = 'expanded' | 'fullscreen';

interface KiroBottomSheetProps {
  /** Si el sheet está abierto */
  isOpen: boolean;
  /** Callback al cerrar */
  onClose: () => void;
  /** Contenido del sheet */
  children: ReactNode;
  /** Altura inicial del sheet (default: 85vh) */
  initialHeight?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const DRAG_THRESHOLD_CLOSE = 100; // px para cerrar
const DRAG_THRESHOLD_EXPAND = -50; // px para expandir a fullscreen
const ANIMATION_DURATION = 300;
const SPRING_TIMING = 'cubic-bezier(0.32, 0.72, 0, 1)';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function KiroBottomSheet({
  isOpen,
  onClose,
  children,
  initialHeight = '85vh',
}: KiroBottomSheetProps) {
  // Estado del sheet
  const [sheetState, setSheetState] = useState<SheetState>('expanded');
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch tracking
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Referencia para scroll interno
  const isScrollingContent = useRef(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Efectos de apertura/cierre
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      // Abrir
      setIsVisible(true);
      setSheetState('expanded');
      setDragY(0);
      setIsAnimating(true);

      // Bloquear scroll del body
      document.body.style.overflow = 'hidden';

      // Sonido
      kiroSounds.play('panel_open');

      // Finalizar animación
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, ANIMATION_DURATION);

      return () => clearTimeout(timer);
    } else {
      // Cerrar
      if (isVisible) {
        setIsAnimating(true);

        // Sonido
        kiroSounds.play('panel_close');

        const timer = setTimeout(() => {
          setIsVisible(false);
          setIsAnimating(false);
          // Restaurar scroll del body
          document.body.style.overflow = '';
        }, ANIMATION_DURATION - 50);

        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, isVisible]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Touch handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Si el contenido tiene scroll y el usuario está scrolleando dentro, no iniciar drag
      const content = contentRef.current;
      if (content) {
        const scrollTop = content.scrollTop;
        const target = e.target as HTMLElement;

        // Verificar si el touch es dentro del área de contenido scrolleable
        if (content.contains(target) && scrollTop > 0) {
          isScrollingContent.current = true;
          return;
        }
      }

      isScrollingContent.current = false;
      touchStartY.current = e.touches[0].clientY;
      setIsDragging(true);
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isScrollingContent.current) return;
      if (!isDragging) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY.current;

      // Solo permitir arrastrar hacia abajo (cerrar) o hacia arriba (expandir a fullscreen)
      // Para expandir: solo si no está en fullscreen
      if (deltaY > 0 || (deltaY < 0 && sheetState !== 'fullscreen')) {
        setDragY(deltaY);
      }
    },
    [isDragging, sheetState]
  );

  const handleTouchEnd = useCallback(() => {
    if (isScrollingContent.current) {
      isScrollingContent.current = false;
      return;
    }

    if (!isDragging) return;

    setIsDragging(false);

    // Decidir acción basada en el drag
    if (dragY > DRAG_THRESHOLD_CLOSE) {
      // Cerrar
      onClose();
    } else if (dragY < DRAG_THRESHOLD_EXPAND && sheetState === 'expanded') {
      // Expandir a fullscreen
      setSheetState('fullscreen');
      setDragY(0);
    } else {
      // Snap back
      setDragY(0);
    }
  }, [isDragging, dragY, sheetState, onClose]);

  // ─────────────────────────────────────────────────────────────────────────
  // Click en backdrop para cerrar
  // ─────────────────────────────────────────────────────────────────────────

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Calcular estilos
  // ─────────────────────────────────────────────────────────────────────────

  const getSheetHeight = (): string => {
    if (sheetState === 'fullscreen') {
      return 'calc(100vh - env(safe-area-inset-top, 0px))';
    }
    return initialHeight;
  };

  const getTransform = (): string => {
    if (!isOpen && !isAnimating) {
      return 'translateY(100%)';
    }
    if (isDragging && dragY > 0) {
      return `translateY(${dragY}px)`;
    }
    if (!isOpen) {
      return 'translateY(100%)';
    }
    return 'translateY(0)';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (!isVisible && !isOpen) {
    return null;
  }

  return (
    // Wrapper fixed que contiene todo
    <div
      className={cn(
        'fixed inset-0 z-50',
        // Fade del backdrop
        isOpen ? 'opacity-100' : 'opacity-0',
        'transition-opacity',
        !isDragging && `duration-[${ANIMATION_DURATION}ms]`
      )}
      style={{
        transitionTimingFunction: SPRING_TIMING,
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleBackdropClick}
        onTouchEnd={handleBackdropClick}
      />

      {/* Sheet container - usamos absolute dentro del fixed */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0',
          'bg-card rounded-t-[20px]',
          'shadow-2xl shadow-violet-500/10',
          'flex flex-col',
          // Transición suave cuando no está arrastrando
          !isDragging && 'transition-transform',
          !isDragging && `duration-[${ANIMATION_DURATION}ms]`
        )}
        style={{
          height: getSheetHeight(),
          transform: getTransform(),
          transitionTimingFunction: SPRING_TIMING,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/40" />
        </div>

        {/* Contenido scrolleable */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS CSS ADICIONALES (inyectados una sola vez)
// ═══════════════════════════════════════════════════════════════════════════

// Crear y agregar estilos al document
if (typeof document !== 'undefined') {
  const styleId = 'kiro-bottom-sheet-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Prevenir overscroll en iOS */
      .kiro-bottom-sheet-content {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
      }
    `;
    document.head.appendChild(style);
  }
}
