import * as React from "react";
import { motion } from "framer-motion";
import {
  Inbox,
  Megaphone,
  Users,
  MessageSquare,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KreoonButton } from "./KreoonButton";

export type KreoonEmptyStateSize = "sm" | "md" | "lg";

export interface KreoonEmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export interface KreoonEmptyStateSecondaryAction {
  label: string;
  onClick: () => void;
}

export interface KreoonEmptyStateProps {
  /** Icono principal (default: Inbox) */
  icon?: React.ReactNode;
  /** Título obligatorio */
  title: string;
  /** Descripción opcional */
  description?: string;
  /** Acción principal */
  action?: KreoonEmptyStateAction;
  /** Acción secundaria (link debajo) */
  secondaryAction?: KreoonEmptyStateSecondaryAction;
  /** Tamaño del bloque */
  size?: KreoonEmptyStateSize;
  className?: string;
}

const sizeConfig: Record<
  KreoonEmptyStateSize,
  { iconWrapper: string; title: string; description: string }
> = {
  sm: {
    iconWrapper: "h-14 w-14 [&>svg]:h-6 [&>svg]:w-6",
    title: "text-base",
    description: "text-sm",
  },
  md: {
    iconWrapper: "h-20 w-20 [&>svg]:h-9 [&>svg]:w-9",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    iconWrapper: "h-28 w-28 [&>svg]:h-12 [&>svg]:w-12",
    title: "text-xl",
    description: "text-base",
  },
};

/**
 * Estado vacío cuando no hay datos. Centrado, icono, título, descripción y acciones opcionales.
 */
export const KreoonEmptyState = React.forwardRef<
  HTMLDivElement,
  KreoonEmptyStateProps
>(function KreoonEmptyState(
  {
    icon,
    title,
    description,
    action,
    secondaryAction,
    size = "md",
    className,
  },
  ref
) {
  const config = sizeConfig[size];
  const IconElement = icon ?? <Inbox className="h-9 w-9" />;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center px-6 py-10 text-center",
        className
      )}
    >
      {/* Área del icono */}
      <motion.div
        className={cn(
          "mb-4 flex shrink-0 items-center justify-center rounded-full bg-kreoon-bg-secondary text-kreoon-text-muted",
          config.iconWrapper
        )}
        initial={{ y: 0 }}
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {React.isValidElement(IconElement)
          ? React.cloneElement(IconElement as React.ReactElement<{ className?: string }>, {
              className: cn("text-kreoon-text-muted", IconElement.props?.className),
            })
          : IconElement}
      </motion.div>

      {/* Título */}
      <h3
        className={cn(
          "font-medium text-white",
          config.title,
          description ? "mb-1" : action || secondaryAction ? "mb-4" : "mb-0"
        )}
      >
        {title}
      </h3>

      {/* Descripción */}
      {description && (
        <p
          className={cn(
            "text-kreoon-text-secondary max-w-sm",
            config.description,
            action || secondaryAction ? "mb-6" : "mb-0"
          )}
        >
          {description}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-col items-center gap-3">
        {action && (
          <KreoonButton
            type="button"
            variant={action.variant ?? "primary"}
            size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"}
            onClick={action.onClick}
          >
            {action.label}
          </KreoonButton>
        )}
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="text-sm text-kreoon-text-secondary underline decoration-kreoon-border underline-offset-2 transition-colors hover:text-kreoon-purple-400 hover:decoration-kreoon-purple-400"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </motion.div>
  );
});

KreoonEmptyState.displayName = "KreoonEmptyState";

// ─── Variantes predefinidas ─────────────────────────────────────────────────

export interface KreoonEmptyStateVariantProps
  extends Omit<KreoonEmptyStateProps, "icon" | "title" | "description" | "action"> {
  /** Sobrescribe la acción (label + onClick). Si no se pasa onClick, se oculta el botón. */
  action?: KreoonEmptyStateAction;
  /** Sobrescribe descripción */
  description?: string;
  /** Sobrescribe título */
  title?: string;
}

/** Sin campañas activas */
export function KreoonEmptyStateNoCampaigns({
  title = "No tienes campañas activas",
  description = "Crea tu primera campaña para conectar con creadores",
  action,
  ...props
}: KreoonEmptyStateVariantProps) {
  return (
    <KreoonEmptyState
      icon={<Megaphone className="h-9 w-9" />}
      title={title}
      description={description}
      action={
        action
          ? { label: action.label ?? "Crear campaña", onClick: action.onClick, variant: action.variant }
          : undefined
      }
      {...props}
    />
  );
}

/** Sin creadores (filtros) */
export function KreoonEmptyStateNoCreators({
  title = "No hay creadores disponibles",
  description = "Intenta ajustar tus filtros de búsqueda",
  action,
  ...props
}: KreoonEmptyStateVariantProps) {
  return (
    <KreoonEmptyState
      icon={<Users className="h-9 w-9" />}
      title={title}
      description={description}
      action={
        action
          ? { label: action.label ?? "Limpiar filtros", onClick: action.onClick, variant: action.variant }
          : undefined
      }
      {...props}
    />
  );
}

/** Sin mensajes */
export function KreoonEmptyStateNoMessages({
  title = "Sin mensajes",
  description = "Cuando tengas conversaciones, aparecerán aquí",
  ...props
}: KreoonEmptyStateVariantProps) {
  return (
    <KreoonEmptyState
      icon={<MessageSquare className="h-9 w-9" />}
      title={title}
      description={description}
      {...props}
    />
  );
}

/** Sin notificaciones */
export function KreoonEmptyStateNoNotifications({
  title = "Todo al día",
  description = "No tienes notificaciones pendientes",
  ...props
}: KreoonEmptyStateVariantProps) {
  return (
    <KreoonEmptyState
      icon={<Bell className="h-9 w-9" />}
      title={title}
      description={description}
      {...props}
    />
  );
}
