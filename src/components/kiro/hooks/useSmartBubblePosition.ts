import { useState, useEffect, useCallback, type RefObject } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ConnectorPoint {
  /** X position relative to kiroRef container (px) */
  x: number;
  /** Y position relative to kiroRef container (px) */
  y: number;
  /** Diameter of the dot (px) */
  size: number;
}

export type BubbleOrigin = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface BubblePositionResult {
  /** CSS styles to apply to the bubble container (absolute positioning) */
  bubbleStyle: React.CSSProperties;
  /** Transform origin for the scale animation */
  origin: BubbleOrigin;
  /** The 3 connector dot positions (relative to kiroRef container) */
  connectorPoints: ConnectorPoint[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const KIRO_SIZE = 100; // Approximate size of the KIRO mascot (px)
const CONNECTOR_GAP = 65; // Space for connector dots between KIRO and bubble edge (px)

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT POSITION
// ═══════════════════════════════════════════════════════════════════════════

function createDefault(): BubblePositionResult {
  return {
    bubbleStyle: { bottom: KIRO_SIZE + CONNECTOR_GAP, right: 0 },
    origin: 'bottom-right',
    connectorPoints: [
      { x: 50, y: -12, size: 8 },
      { x: 46, y: -30, size: 12 },
      { x: 42, y: -50, size: 18 },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook that calculates optimal bubble position based on KIRO's viewport position.
 *
 * Determines the best direction (above/below, left/right) to place the thought
 * bubble, ensures it stays within viewport bounds, and calculates the positions
 * of the 3 connector thought-dots between KIRO and the bubble.
 *
 * Recalculates on window resize and scroll (debounced 100ms).
 */
export function useSmartBubblePosition(
  kiroRef: RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  bubbleWidth: number = 380,
  bubbleHeight: number = 520,
  padding: number = 12
): BubblePositionResult {
  const [result, setResult] = useState<BubblePositionResult>(createDefault);

  const calculate = useCallback(() => {
    if (!kiroRef.current) return;

    const rect = kiroRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // ─── Calculate available space in each direction ───
    const spaceAbove = rect.top - padding;
    const spaceBelow = vh - rect.bottom - padding;
    const spaceRight = vw - rect.right - padding;

    // Prefer above (default for bottom-positioned KIRO), go below only if insufficient space
    const goUp = spaceAbove >= (bubbleHeight + CONNECTOR_GAP) || spaceAbove > spaceBelow;
    // Prefer extending to the left (default for right-positioned KIRO)
    const goLeft = spaceRight < bubbleWidth;

    // ─── Compute CSS positioning (absolute, relative to kiroRef) ───
    const bubbleStyle: React.CSSProperties = {};
    let origin: BubbleOrigin;

    if (goUp) {
      bubbleStyle.bottom = KIRO_SIZE + CONNECTOR_GAP;
    } else {
      bubbleStyle.top = KIRO_SIZE + CONNECTOR_GAP;
    }

    if (goLeft) {
      bubbleStyle.right = 0;
    } else {
      bubbleStyle.left = 0;
    }

    // Animation transform origin — bubble scales from the corner nearest to KIRO
    if (goUp && goLeft) origin = 'bottom-right';
    else if (goUp && !goLeft) origin = 'bottom-left';
    else if (!goUp && goLeft) origin = 'top-right';
    else origin = 'top-left';

    // ─── Bounds check: prevent horizontal overflow ───
    if (goLeft) {
      const bubbleLeftEdge = rect.right - bubbleWidth;
      if (bubbleLeftEdge < padding) {
        // Shift bubble rightward by using a negative right value
        bubbleStyle.right = bubbleLeftEdge - padding;
      }
    } else {
      const bubbleRightEdge = rect.left + bubbleWidth;
      if (bubbleRightEdge > vw - padding) {
        const overflow = bubbleRightEdge - (vw - padding);
        bubbleStyle.left = -overflow;
      }
    }

    // ─── Calculate connector dot positions ───
    // Dots curve slightly toward the bubble's center direction
    const cx = KIRO_SIZE / 2;
    const hShift = goLeft ? -4 : 4; // subtle horizontal curve per dot
    const connectorPoints: ConnectorPoint[] = [];

    if (goUp) {
      // Dots go upward from KIRO's top edge
      connectorPoints.push(
        { x: cx, y: -12, size: 8 },
        { x: cx + hShift, y: -30, size: 12 },
        { x: cx + hShift * 2, y: -50, size: 18 },
      );
    } else {
      // Dots go downward from KIRO's bottom edge
      connectorPoints.push(
        { x: cx, y: KIRO_SIZE + 12, size: 8 },
        { x: cx + hShift, y: KIRO_SIZE + 30, size: 12 },
        { x: cx + hShift * 2, y: KIRO_SIZE + 50, size: 18 },
      );
    }

    setResult({ bubbleStyle, origin, connectorPoints });
  }, [kiroRef, bubbleWidth, bubbleHeight, padding]);

  // Recalculate when bubble opens and on resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    calculate();

    let timerId: ReturnType<typeof setTimeout>;
    const debouncedCalc = () => {
      clearTimeout(timerId);
      timerId = setTimeout(calculate, 100);
    };

    window.addEventListener('resize', debouncedCalc);
    window.addEventListener('scroll', debouncedCalc, true);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('resize', debouncedCalc);
      window.removeEventListener('scroll', debouncedCalc, true);
    };
  }, [isOpen, calculate]);

  return result;
}
