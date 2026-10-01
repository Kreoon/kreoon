import { memo, useState } from "react";
import { AlertTriangle, Check, Clapperboard, Scissors, Send, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppRole, ContentStatus } from "@/types/database";
import { cn } from "@/lib/utils";

/**
 * Acciones rápidas por rol (p. ej. «Iniciar grabación» para el creador asignado).
 * Es el flujo principal de creador/editor/cliente en el tablero, así que se conserva con la
 * misma lógica de visibilidad.
 *
 * El antiguo selector grande de estado (StatusChangeDropdown, con tablas GROUP_ALLOWED_STATUSES
 * hardcodeadas que ignoraban las reglas de la organización) se reemplazó por el menú
 * «Mover a…» de la tarjeta, que usa canMoveToStatusWithRules (las mismas reglas que el arrastre).
 */
interface QuickStatusButtonsProps {
  currentStatus: ContentStatus;
  contentId: string;
  userRole: AppRole | string | null;
  isAssignedCreator?: boolean;
  isAssignedEditor?: boolean;
  onStatusChange: (contentId: string, newStatus: ContentStatus) => Promise<void>;
  className?: string;
}

const BASE = "min-h-8 px-3 text-xs gap-1.5 [@media(pointer:coarse)]:min-h-10";
const PRIMARY = cn(BASE, "bg-primary text-primary-foreground hover:bg-primary/90");
const DANGER = cn(
  BASE,
  "border-destructive/60 bg-transparent text-[color:var(--kb-danger-ink,hsl(var(--destructive)))] hover:bg-destructive/10",
);

export function hasQuickActions(
  currentStatus: string,
  userRole: string | null | undefined,
  isAssignedCreator: boolean,
  isAssignedEditor: boolean,
): boolean {
  if (userRole === "creator" && isAssignedCreator) return currentStatus === "assigned" || currentStatus === "recording";
  if (userRole === "editor" && isAssignedEditor) {
    return ["recorded", "editing", "issue", "corrected"].includes(currentStatus);
  }
  if (userRole === "client") return currentStatus === "delivered" || currentStatus === "corrected";
  return false;
}

export const QuickStatusButtons = memo(function QuickStatusButtons({
  currentStatus,
  contentId,
  userRole,
  isAssignedCreator = false,
  isAssignedEditor = false,
  onStatusChange,
  className,
}: QuickStatusButtonsProps) {
  const [busy, setBusy] = useState<ContentStatus | null>(null);

  const go = async (status: ContentStatus) => {
    if (busy) return;
    setBusy(status);
    try {
      await onStatusChange(contentId, status);
    } finally {
      setBusy(null);
    }
  };

  const btn = (status: ContentStatus, label: string, Icon: typeof Check, variant: "primary" | "danger" = "primary") => (
    <Button
      key={status + label}
      type="button"
      size="sm"
      variant={variant === "danger" ? "outline" : "default"}
      disabled={!!busy}
      aria-busy={busy === status}
      data-no-click
      data-no-drag
      onClick={(e) => {
        e.stopPropagation();
        void go(status);
      }}
      className={variant === "danger" ? DANGER : PRIMARY}
    >
      <Icon aria-hidden="true" />
      {busy === status ? "Guardando…" : label}
    </Button>
  );

  let content: React.ReactNode = null;

  // Creador asignado
  if (userRole === "creator" && isAssignedCreator) {
    if (currentStatus === "assigned") content = btn("recording", "Iniciar grabación", Clapperboard);
    else if (currentStatus === "recording") {
      content = (
        <>
          {btn("recorded", "Grabado", Check)}
          {btn("issue", "Novedad", AlertTriangle, "danger")}
        </>
      );
    }
  }

  // Editor asignado
  if (!content && userRole === "editor" && isAssignedEditor) {
    if (currentStatus === "recorded") content = btn("editing", "Iniciar edición", Scissors);
    else if (currentStatus === "editing") {
      content = (
        <>
          {btn("delivered", "Entregar", Send)}
          {btn("issue", "Novedad", AlertTriangle, "danger")}
        </>
      );
    } else if (currentStatus === "issue" || currentStatus === "corrected") {
      content = (
        <>
          {btn("editing", "Editar", Scissors)}
          {btn("delivered", "Entregar", Send)}
        </>
      );
    }
  }

  // Cliente
  if (!content && userRole === "client" && (currentStatus === "delivered" || currentStatus === "corrected")) {
    content = (
      <>
        {btn("approved", "Aprobar", ThumbsUp)}
        {btn("issue", "Novedad", AlertTriangle, "danger")}
      </>
    );
  }

  if (!content) return null;
  return <div className={cn("kb-quick", className)}>{content}</div>;
});
