/**
 * Tech/IA Kanban - Unified design tokens and status styles
 * Integrated with Nova v2 Design System
 *
 * CSS Variables are defined in:
 * - src/styles/nova-theme.css (core Nova system)
 * - src/styles/board-tokens.css (board-specific tokens)
 */

// Nova v2 color tokens - mapped to CSS variables
export const NOVA_COLORS = {
  // Backgrounds
  bgVoid: "var(--nova-bg-void, #030308)",
  bgDeep: "var(--nova-bg-deep, #050510)",
  bgSurface: "var(--nova-bg-surface, #0a0a18)",
  bgElevated: "var(--nova-bg-elevated, #0f0f22)",
  bgHover: "var(--nova-bg-hover, #141428)",

  // Accents
  accentPrimary: "var(--nova-accent-primary, #8b5cf6)",
  accentPrimaryHover: "var(--nova-accent-primary-hover, #a78bfa)",
  accentSecondary: "var(--nova-accent-secondary, #06b6d4)",
  accentGlow: "var(--nova-accent-glow, #c084fc)",

  // Text
  textBright: "var(--nova-text-bright, #fafafa)",
  textPrimary: "var(--nova-text-primary, #e4e4e7)",
  textSecondary: "var(--nova-text-secondary, #a1a1aa)",
  textMuted: "var(--nova-text-muted, #52525b)",

  // Borders
  borderSubtle: "var(--nova-border-subtle, rgba(139, 92, 246, 0.08))",
  borderDefault: "var(--nova-border-default, rgba(139, 92, 246, 0.15))",
  borderAccent: "var(--nova-border-accent, rgba(139, 92, 246, 0.3))",
  borderFocus: "var(--nova-border-focus, rgba(139, 92, 246, 0.5))",
} as const;

// Board color tokens - dual mode support (legacy compatibility + Nova integration)
export const BOARD_COLORS = {
  dark: {
    // Nova v2 mapped colors
    bg: "#0a0a18",              // nova-bg-surface
    card: "#0f0f22",            // nova-bg-elevated
    cardHover: "#141428",       // nova-bg-hover
    cardBody: "rgba(255, 255, 255, 0.02)",
    border: "rgba(139, 92, 246, 0.15)",    // nova-border-default
    borderHover: "rgba(139, 92, 246, 0.3)", // nova-border-accent
    primary: "#8b5cf6",         // nova-accent-primary
    secondary: "#06b6d4",       // nova-accent-secondary
    text: "#e4e4e7",            // nova-text-primary
    textMuted: "#a1a1aa",       // nova-text-secondary
    textSecondary: "#52525b",   // nova-text-muted
    purple: "#8b5cf6",
    purpleLight: "#a78bfa",
    purpleLighter: "#c084fc",   // nova-accent-glow
    columnBg: "rgba(15, 15, 34, 0.6)",
    columnHeader: "#0f0f22",    // nova-bg-elevated
    dropZone: "rgba(139, 92, 246, 0.08)",
    dropZoneActive: "rgba(139, 92, 246, 0.15)",
    // Nova glow effects
    glowSm: "0 0 12px rgba(139, 92, 246, 0.15)",
    glowMd: "0 0 20px rgba(139, 92, 246, 0.2)",
    glowLg: "0 0 40px rgba(139, 92, 246, 0.25)",
  },
  light: {
    bg: "#fafafa",
    card: "#ffffff",
    cardHover: "#f4f4f5",
    cardBody: "rgba(0, 0, 0, 0.02)",
    border: "rgba(139, 92, 246, 0.12)",
    borderHover: "rgba(139, 92, 246, 0.25)",
    primary: "#8b5cf6",
    secondary: "#06b6d4",
    text: "#18181b",
    textMuted: "#52525b",
    textSecondary: "#71717a",
    purple: "#7c3aed",
    purpleLight: "#8b5cf6",
    purpleLighter: "#a78bfa",
    columnBg: "rgba(250, 250, 250, 0.8)",
    columnHeader: "#ffffff",
    dropZone: "rgba(139, 92, 246, 0.05)",
    dropZoneActive: "rgba(139, 92, 246, 0.1)",
    // No glow in light mode
    glowSm: "none",
    glowMd: "none",
    glowLg: "none",
  },
} as const;

// Legacy export for backward compatibility
export const TECH_COLORS = BOARD_COLORS.dark;

// Helper to get colors based on theme
export function getBoardColors(isDark: boolean) {
  return isDark ? BOARD_COLORS.dark : BOARD_COLORS.light;
}

// Status neon styles - dark mode (higher contrast)
const STATUS_NEON_DARK: Record<
  string,
  { bg: string; border: string; glow: string; text: string }
> = {
  draft: {
    bg: "rgba(148, 163, 184, 0.15)",
    border: "rgba(148, 163, 184, 0.4)",
    glow: "0 0 12px rgba(148, 163, 184, 0.3)",
    text: "#94a3b8",
  },
  script_pending: {
    bg: "rgba(148, 163, 184, 0.15)",
    border: "rgba(148, 163, 184, 0.4)",
    glow: "0 0 12px rgba(148, 163, 184, 0.3)",
    text: "#94a3b8",
  },
  script_approved: {
    bg: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.5)",
    glow: "0 0 15px rgba(59, 130, 246, 0.4)",
    text: "#60a5fa",
  },
  assigned: {
    bg: "rgba(139, 92, 246, 0.2)",
    border: "rgba(139, 92, 246, 0.5)",
    glow: "0 0 15px rgba(168, 85, 247, 0.4)",
    text: "#a78bfa",
  },
  recording: {
    bg: "rgba(59, 130, 246, 0.2)",
    border: "rgba(59, 130, 246, 0.5)",
    glow: "0 0 15px rgba(59, 130, 246, 0.5)",
    text: "#60a5fa",
  },
  recorded: {
    bg: "rgba(6, 182, 212, 0.2)",
    border: "rgba(6, 182, 212, 0.5)",
    glow: "0 0 15px rgba(6, 182, 212, 0.4)",
    text: "#22d3ee",
  },
  editing: {
    bg: "rgba(236, 72, 153, 0.2)",
    border: "rgba(236, 72, 153, 0.5)",
    glow: "0 0 15px rgba(236, 72, 153, 0.4)",
    text: "#f472b6",
  },
  review: {
    bg: "rgba(234, 179, 8, 0.2)",
    border: "rgba(234, 179, 8, 0.5)",
    glow: "0 0 15px rgba(234, 179, 8, 0.4)",
    text: "#facc15",
  },
  issue: {
    bg: "rgba(249, 115, 22, 0.2)",
    border: "rgba(249, 115, 22, 0.5)",
    glow: "0 0 15px rgba(249, 115, 22, 0.4)",
    text: "#fb923c",
  },
  delivered: {
    bg: "rgba(16, 185, 129, 0.2)",
    border: "rgba(16, 185, 129, 0.5)",
    glow: "0 0 15px rgba(16, 185, 129, 0.4)",
    text: "#34d399",
  },
  corrected: {
    bg: "rgba(59, 130, 246, 0.2)",
    border: "rgba(59, 130, 246, 0.5)",
    glow: "0 0 15px rgba(59, 130, 246, 0.4)",
    text: "#60a5fa",
  },
  approved: {
    bg: "rgba(34, 197, 94, 0.2)",
    border: "rgba(34, 197, 94, 0.5)",
    glow: "0 0 18px rgba(34, 197, 94, 0.5)",
    text: "#4ade80",
  },
  paid: {
    bg: "rgba(168, 85, 247, 0.25)",
    border: "rgba(168, 85, 247, 0.6)",
    glow: "0 0 20px rgba(168, 85, 247, 0.5)",
    text: "#c084fc",
  },
  rejected: {
    bg: "rgba(239, 68, 68, 0.2)",
    border: "rgba(239, 68, 68, 0.5)",
    glow: "0 0 15px rgba(239, 68, 68, 0.4)",
    text: "#f87171",
  },
};

// Status styles - light mode (softer, more subtle)
const STATUS_NEON_LIGHT: Record<
  string,
  { bg: string; border: string; glow: string; text: string }
> = {
  draft: {
    bg: "rgba(113, 113, 122, 0.1)",
    border: "rgba(113, 113, 122, 0.3)",
    glow: "none",
    text: "#52525b",
  },
  script_pending: {
    bg: "rgba(113, 113, 122, 0.1)",
    border: "rgba(113, 113, 122, 0.3)",
    glow: "none",
    text: "#52525b",
  },
  script_approved: {
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
    glow: "none",
    text: "#2563eb",
  },
  assigned: {
    bg: "rgba(139, 92, 246, 0.1)",
    border: "rgba(139, 92, 246, 0.3)",
    glow: "none",
    text: "#7c3aed",
  },
  recording: {
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
    glow: "none",
    text: "#2563eb",
  },
  recorded: {
    bg: "rgba(6, 182, 212, 0.1)",
    border: "rgba(6, 182, 212, 0.3)",
    glow: "none",
    text: "#0891b2",
  },
  editing: {
    bg: "rgba(219, 39, 119, 0.1)",
    border: "rgba(219, 39, 119, 0.3)",
    glow: "none",
    text: "#be185d",
  },
  review: {
    bg: "rgba(202, 138, 4, 0.1)",
    border: "rgba(202, 138, 4, 0.3)",
    glow: "none",
    text: "#a16207",
  },
  issue: {
    bg: "rgba(234, 88, 12, 0.1)",
    border: "rgba(234, 88, 12, 0.3)",
    glow: "none",
    text: "#c2410c",
  },
  delivered: {
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.3)",
    glow: "none",
    text: "#059669",
  },
  corrected: {
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
    glow: "none",
    text: "#2563eb",
  },
  approved: {
    bg: "rgba(34, 197, 94, 0.1)",
    border: "rgba(34, 197, 94, 0.3)",
    glow: "none",
    text: "#16a34a",
  },
  paid: {
    bg: "rgba(139, 92, 246, 0.1)",
    border: "rgba(139, 92, 246, 0.3)",
    glow: "none",
    text: "#7c3aed",
  },
  rejected: {
    bg: "rgba(220, 38, 38, 0.1)",
    border: "rgba(220, 38, 38, 0.3)",
    glow: "none",
    text: "#dc2626",
  },
};

// Legacy export for backward compatibility
export const STATUS_NEON_STYLES = STATUS_NEON_DARK;

// Get status style with theme support
export function getStatusNeonStyle(
  status: string,
  orgColor?: string | null,
  isDark: boolean = true
): { bg: string; border: string; glow: string; text: string } {
  // Custom org color takes precedence
  if (orgColor && orgColor.startsWith("#")) {
    const hex = orgColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    if (isDark) {
      return {
        bg: `rgba(${r}, ${g}, ${b}, 0.2)`,
        border: `rgba(${r}, ${g}, ${b}, 0.5)`,
        glow: `0 0 15px rgba(${r}, ${g}, ${b}, 0.4)`,
        text: orgColor,
      };
    } else {
      // Darken color for light mode text
      const darkenFactor = 0.7;
      const dr = Math.round(r * darkenFactor);
      const dg = Math.round(g * darkenFactor);
      const db = Math.round(b * darkenFactor);
      return {
        bg: `rgba(${r}, ${g}, ${b}, 0.1)`,
        border: `rgba(${r}, ${g}, ${b}, 0.3)`,
        glow: "none",
        text: `rgb(${dr}, ${dg}, ${db})`,
      };
    }
  }

  const styles = isDark ? STATUS_NEON_DARK : STATUS_NEON_LIGHT;
  return styles[status] || styles.draft;
}

// Sphere phase colors - dual mode
export const SPHERE_PHASE_COLORS = {
  dark: {
    engage: { bg: "rgba(34, 211, 238, 0.15)", text: "#22d3ee", border: "rgba(34, 211, 238, 0.4)" },
    solution: { bg: "rgba(52, 211, 153, 0.15)", text: "#34d399", border: "rgba(52, 211, 153, 0.4)" },
    remarketing: { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24", border: "rgba(251, 191, 36, 0.4)" },
    fidelize: { bg: "rgba(192, 132, 252, 0.15)", text: "#c084fc", border: "rgba(192, 132, 252, 0.4)" },
  },
  light: {
    engage: { bg: "rgba(6, 182, 212, 0.1)", text: "#0891b2", border: "rgba(6, 182, 212, 0.3)" },
    solution: { bg: "rgba(16, 185, 129, 0.1)", text: "#059669", border: "rgba(16, 185, 129, 0.3)" },
    remarketing: { bg: "rgba(202, 138, 4, 0.1)", text: "#a16207", border: "rgba(202, 138, 4, 0.3)" },
    fidelize: { bg: "rgba(139, 92, 246, 0.1)", text: "#7c3aed", border: "rgba(139, 92, 246, 0.3)" },
  },
} as const;

export function getSpherePhaseStyle(phase: string, isDark: boolean = true) {
  const colors = isDark ? SPHERE_PHASE_COLORS.dark : SPHERE_PHASE_COLORS.light;
  return colors[phase as keyof typeof colors] || colors.engage;
}

// Utility CSS classes for Tailwind - Nova v2 design system
export const BOARD_CLASSES = {
  // Card styles - Nova integrated
  card: "bg-white dark:bg-[#0f0f22] border-zinc-200/80 dark:border-purple-500/15",
  cardHover: "hover:border-zinc-300 dark:hover:border-purple-500/30 hover:shadow-sm dark:hover:shadow-[0_0_12px_rgba(139,92,246,0.15)]",
  cardSelected: "ring-2 ring-purple-500/50 dark:ring-purple-500/40 dark:shadow-[0_0_20px_rgba(139,92,246,0.25)]",

  // Column styles - Nova integrated
  column: "bg-zinc-50/80 dark:bg-[#0f0f22]/60",
  columnHeader: "bg-white dark:bg-[#0f0f22]",

  // Text hierarchy - Nova
  text: "text-zinc-900 dark:text-[#e4e4e7]",
  textMuted: "text-zinc-600 dark:text-[#a1a1aa]",
  textSecondary: "text-zinc-500 dark:text-[#52525b]",

  // Borders - Nova
  border: "border-zinc-200 dark:border-zinc-800/80",
  borderPurple: "border-zinc-200 dark:border-purple-500/15",
  borderFocus: "border-purple-400 dark:border-purple-500/50",

  // Input styles
  input: "bg-zinc-50 dark:bg-[#141428] border-zinc-200 dark:border-purple-500/15 focus:border-purple-400 dark:focus:border-purple-500/40",

  // Drop zones - Nova
  dropZone: "bg-purple-50/50 dark:bg-purple-500/8",
  dropZoneActive: "bg-purple-100/50 dark:bg-purple-500/15 border-purple-300 dark:border-purple-500/40",

  // Glass effect (for overlays/modals)
  glass: "bg-white/90 dark:bg-[#0a0a18]/70 border-zinc-200/50 dark:border-purple-500/10",

  // Glow effects (dark mode only)
  glowSm: "dark:shadow-[0_0_12px_rgba(139,92,246,0.15)]",
  glowMd: "dark:shadow-[0_0_20px_rgba(139,92,246,0.2)]",
  glowLg: "dark:shadow-[0_0_40px_rgba(139,92,246,0.25)]",
} as const;
