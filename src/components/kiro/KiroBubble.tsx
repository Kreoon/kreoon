import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useSmartBubblePosition,
  type BubbleOrigin,
} from './hooks/useSmartBubblePosition';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface KiroBubbleProps {
  /** Whether the bubble is open/visible */
  isOpen: boolean;
  /** Ref to the KIRO container element (for positioning) */
  kiroRef: RefObject<HTMLDivElement | null>;
  /** Panel content to render inside the bubble */
  children: ReactNode;
  /** Width of the bubble in px (default 380) */
  bubbleWidth?: number;
  /** Called when user clicks outside the bubble and KIRO */
  onClickOutside?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Map BubbleOrigin to CSS transformOrigin value */
const ORIGIN_CSS: Record<BubbleOrigin, string> = {
  'top-left': 'top left',
  'top-right': 'top right',
  'bottom-left': 'bottom left',
  'bottom-right': 'bottom right',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Thought bubble component for KIRO.
 *
 * Renders a glassmorphism panel connected to KIRO via 3 ascending
 * thought-bubble dots. Positions itself intelligently based on available
 * viewport space. Supports staggered enter/exit animations.
 *
 * Entry animation: dots appear 1→2→3, then bubble pops in.
 * Exit animation: bubble shrinks first, then dots disappear 3→2→1.
 */
export function KiroBubble({
  isOpen,
  kiroRef,
  children,
  bubbleWidth = 380,
  onClickOutside,
}: KiroBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { bubbleStyle, origin, connectorPoints } = useSmartBubblePosition(
    kiroRef,
    isOpen,
    bubbleWidth,
  );

  // ─── Click outside handler ───
  useEffect(() => {
    if (!isOpen || !onClickOutside) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't close if clicking inside the bubble
      if (bubbleRef.current?.contains(target)) return;
      // Don't close if clicking on KIRO (toggle handler manages that)
      if (kiroRef.current?.contains(target)) return;
      onClickOutside();
    };

    // Small delay to prevent the opening click from immediately closing
    const timer = setTimeout(
      () => document.addEventListener('mousedown', handler),
      50,
    );

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [isOpen, onClickOutside, kiroRef]);

  const transformOrigin = ORIGIN_CSS[origin];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ═══ CONNECTOR THOUGHT DOTS ═══ */}
          {/* 3 ascending circles connecting KIRO to the bubble */}
          {connectorPoints.map((pt, i) => (
            <motion.div
              key={`kiro-dot-${i}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: pt.x - pt.size / 2,
                top: pt.y - pt.size / 2,
                width: pt.size,
                height: pt.size,
                background: `rgba(124, 58, 237, ${0.6 - i * 0.1})`,
                boxShadow: `0 0 ${6 + i * 3}px rgba(124, 58, 237, ${0.3 - i * 0.05})`,
                zIndex: 51,
              }}
              // Entry: dots appear in order 1→2→3
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: {
                  delay: i * 0.08,
                  duration: 0.2,
                  ease: [0.34, 1.56, 0.64, 1], // backOut easing
                },
              }}
              // Exit: dots disappear in reverse 3→2→1 (after bubble closes)
              exit={{
                scale: 0,
                opacity: 0,
                transition: {
                  delay: (2 - i) * 0.06 + 0.12,
                  duration: 0.12,
                },
              }}
            />
          ))}

          {/* ═══ THOUGHT BUBBLE PANEL ═══ */}
          <motion.div
            key="kiro-bubble-panel"
            ref={bubbleRef}
            className="absolute overflow-hidden"
            style={{
              ...bubbleStyle,
              width: bubbleWidth,
              maxHeight: '70vh',
              transformOrigin,
              // Glassmorphism bubble styling
              background: 'rgba(15, 10, 30, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: 20,
              boxShadow:
                '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(124, 58, 237, 0.1)',
              zIndex: 51,
            }}
            // Entry: bubble pops in after all 3 dots
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: {
                delay: 0.24,
                type: 'spring',
                stiffness: 300,
                damping: 25,
              },
            }}
            // Exit: bubble closes first (before dots)
            exit={{
              opacity: 0,
              scale: 0.8,
              transition: { duration: 0.15 },
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
