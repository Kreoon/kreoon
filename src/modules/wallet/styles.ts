// Wallet Module - Reusable Styles
// Design System: "El Estudio" - Purple glassmorphism theme

export const walletStyles = {
  // Cards
  card: 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6',
  cardHover: 'hover:bg-white/10 hover:border-[hsl(270,100%,60%,0.3)] transition-all duration-300',
  cardGlass: 'bg-[hsl(270,100%,60%,0.05)] backdrop-blur-xl border border-[hsl(270,100%,60%,0.1)] rounded-2xl',

  // Gradients
  gradientPurple: 'bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]',
  gradientText: 'bg-gradient-to-r from-white via-[hsl(270,100%,85%)] to-[hsl(270,100%,70%)] bg-clip-text text-transparent',

  // Glows
  glowPurple: 'shadow-lg shadow-[hsl(270,100%,60%,0.2)]',
  glowGreen: 'shadow-lg shadow-emerald-500/20',
  glowAmber: 'shadow-lg shadow-amber-500/20',

  // Backgrounds
  bgSubtle: 'bg-[hsl(270,100%,60%,0.03)]',
  bgMuted: 'bg-[hsl(270,100%,60%,0.05)]',
  bgAccent: 'bg-[hsl(270,100%,60%,0.08)]',
  bgHighlight: 'bg-[hsl(270,100%,60%,0.1)]',

  // Borders
  borderSubtle: 'border border-[hsl(270,100%,60%,0.05)]',
  borderMuted: 'border border-[hsl(270,100%,60%,0.1)]',
  borderAccent: 'border border-[hsl(270,100%,60%,0.2)]',
  borderHighlight: 'border border-[hsl(270,100%,60%,0.3)]',

  // Text
  textMuted: 'text-[hsl(270,30%,60%)]',
  textSubtle: 'text-[hsl(270,30%,50%)]',
  textPurple: 'text-[hsl(270,100%,70%)]',

  // Buttons
  buttonPrimary: 'bg-[hsl(270,100%,60%)] hover:bg-[hsl(270,100%,55%)] text-white',
  buttonGhost: 'hover:bg-[hsl(270,100%,60%,0.1)] text-white',
  buttonOutline: 'border border-[hsl(270,100%,60%,0.3)] hover:bg-[hsl(270,100%,60%,0.1)] text-white',

  // Icons
  iconContainer: 'p-2 rounded-xl bg-[hsl(270,100%,60%,0.1)]',
  iconContainerSm: 'p-1.5 rounded-lg bg-[hsl(270,100%,60%,0.1)]',

  // Interactive states
  interactive: 'transition-all duration-200 cursor-pointer',
  interactiveHover: 'hover:bg-[hsl(270,100%,60%,0.08)] hover:border-[hsl(270,100%,60%,0.15)]',

  // Skeletons
  skeleton: 'bg-[hsl(270,100%,60%,0.1)] animate-pulse rounded',
  skeletonSubtle: 'bg-[hsl(270,100%,60%,0.05)] animate-pulse rounded',

  // Status colors
  statusActive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  statusPending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  statusFrozen: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  statusSuspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  statusCompleted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  statusFailed: 'bg-red-500/10 text-red-400 border-red-500/20',
  statusCancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',

  // Balance colors
  balancePositive: 'text-emerald-400',
  balanceNegative: 'text-red-400',
  balanceNeutral: 'text-white',
};

// Animation variants for framer-motion
export const animationVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  staggerChildren: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
};

// Common transition settings
export const transitions = {
  fast: { duration: 0.15 },
  normal: { duration: 0.2 },
  slow: { duration: 0.3 },
  spring: { type: 'spring', stiffness: 300, damping: 25 },
};
