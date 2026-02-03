/**
 * Kreoon Design System — constantes de tema y utilidades para UI.
 * Sincronizado con tailwind.config.ts (paleta Kreoon).
 */

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type KreoonBackgroundColors = {
  primary: string;
  secondary: string;
  card: string;
};

export type KreoonPurpleColors = {
  400: string;
  500: string;
  600: string;
  glow: string;
};

export type KreoonBorderColors = {
  subtle: string;
  medium: string;
};

export type KreoonTextColors = {
  primary: string;
  secondary: string;
  muted: string;
};

export type KreoonColorsShape = {
  background: KreoonBackgroundColors;
  purple: KreoonPurpleColors;
  border: KreoonBorderColors;
  text: KreoonTextColors;
};

export type KreoonShadowsShape = {
  glow: string;
  glowLg: string;
  glowSm: string;
  card: string;
};

export type KreoonGradientsShape = {
  primary: string;
  dark: string;
  radial: string;
};

export type RoleColorItem = {
  primary: string;
  gradient: string;
};

export type RoleColorsShape = Record<string, RoleColorItem>;

export type FramerMotionVariant = {
  initial: object;
  animate: object;
  exit?: object;
  transition?: object;
};

export type KreoonAnimationsShape = {
  fadeIn: FramerMotionVariant;
  slideUp: FramerMotionVariant;
  scaleIn: FramerMotionVariant;
  glowPulse: FramerMotionVariant;
};

// ─── 1. KREOON_COLORS ──────────────────────────────────────────────────────

export const KREOON_COLORS: KreoonColorsShape = {
  background: {
    primary: '#0a0a0f',
    secondary: '#12121a',
    card: '#1a1a24',
  },
  purple: {
    400: '#a855f7',
    500: '#7c3aed',
    600: '#6d28d9',
    glow: 'rgba(124, 58, 237, 0.3)',
  },
  border: {
    subtle: 'rgba(139, 92, 246, 0.2)',
    medium: 'rgba(139, 92, 246, 0.35)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#a1a1aa',
    muted: '#71717a',
  },
};

// ─── 2. KREOON_SHADOWS ──────────────────────────────────────────────────────

export const KREOON_SHADOWS: KreoonShadowsShape = {
  glow: '0 0 40px rgba(124, 58, 237, 0.3)',
  glowLg: '0 0 60px rgba(124, 58, 237, 0.4)',
  glowSm: '0 0 20px rgba(124, 58, 237, 0.2)',
  card: '0 4px 24px rgba(0, 0, 0, 0.4)',
};

// ─── 3. KREOON_GRADIENTS ───────────────────────────────────────────────────

export const KREOON_GRADIENTS: KreoonGradientsShape = {
  primary: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
  dark: 'linear-gradient(135deg, #1a1a24 0%, #0a0a0f 100%)',
  radial: 'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
};

// ─── 4. ROLE_COLORS ───────────────────────────────────────────────────────

export const ROLE_COLORS: RoleColorsShape = {
  creator: {
    primary: '#7c3aed',
    gradient: 'from-purple-600 to-violet-500',
  },
  editor: {
    primary: '#3b82f6',
    gradient: 'from-blue-600 to-cyan-500',
  },
  client: {
    primary: '#10b981',
    gradient: 'from-emerald-600 to-teal-500',
  },
  strategist: {
    primary: '#f59e0b',
    gradient: 'from-amber-500 to-orange-500',
  },
  ambassador: {
    primary: '#ec4899',
    gradient: 'from-pink-500 to-rose-500',
  },
  admin: {
    primary: '#ef4444',
    gradient: 'from-red-600 to-rose-500',
  },
};

// ─── 5. KREOON_ANIMATIONS (framer-motion variants) ─────────────────────────

export const KREOON_ANIMATIONS: KreoonAnimationsShape = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  slideUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.2 },
  },
  glowPulse: {
    initial: { boxShadow: '0 0 20px rgba(124, 58, 237, 0.2)' },
    animate: {
      boxShadow: [
        '0 0 20px rgba(124, 58, 237, 0.2)',
        '0 0 40px rgba(124, 58, 237, 0.4)',
        '0 0 20px rgba(124, 58, 237, 0.2)',
      ],
    },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};
