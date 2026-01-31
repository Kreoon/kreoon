/**
 * Tech/IA Kanban - Unified design tokens and status styles
 * Same aesthetic for all roles (admin, editor, creator, client)
 */

// Tech palette
export const TECH_COLORS = {
  bg: "#0a0118",
  card: "rgba(255, 255, 255, 0.05)",
  cardBody: "rgba(255, 255, 255, 0.03)",
  border: "rgba(139, 92, 246, 0.3)",
  primary: "#a855f7",
  secondary: "#ec4899",
  text: "#f8fafc",
  textMuted: "#cbd5e1",
  purple: "#8b5cf6",
  purpleLight: "#a78bfa",
  purpleLighter: "#c084fc",
} as const;

// Status neon styles
export const STATUS_NEON_STYLES: Record<
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

export function getStatusNeonStyle(
  status: string,
  orgColor?: string | null
): { bg: string; border: string; glow: string; text: string } {
  if (orgColor && orgColor.startsWith("#")) {
    const hex = orgColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.2)`,
      border: `rgba(${r}, ${g}, ${b}, 0.5)`,
      glow: `0 0 15px rgba(${r}, ${g}, ${b}, 0.4)`,
      text: orgColor,
    };
  }
  return (
    STATUS_NEON_STYLES[status] || STATUS_NEON_STYLES.draft
  );
}
