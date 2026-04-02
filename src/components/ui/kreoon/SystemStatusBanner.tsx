import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Construction,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SystemStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance";

export interface SystemStatusBannerProps {
  status: SystemStatus;
  message: string;
  link?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const STATUS_CONFIG: Record<
  SystemStatus,
  { bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  operational: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    icon: CheckCircle,
  },
  degraded: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    icon: AlertTriangle,
  },
  partial_outage: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    icon: AlertCircle,
  },
  major_outage: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    icon: XCircle,
  },
  maintenance: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    icon: Construction,
  },
};

/**
 * Banner que aparece arriba de todo cuando hay incidentes o mantenimiento del sistema.
 * Sticky top, full width, con icono, mensaje, link opcional y botón de cerrar (si dismissible).
 */
export function SystemStatusBanner({
  status,
  message,
  link,
  dismissible = false,
  onDismiss,
}: SystemStatusBannerProps) {
  const [visible, setVisible] = React.useState(true);

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "sticky top-0 z-[10000] w-full border-b",
            config.bg,
            config.border
          )}
        >
          <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex flex-1 items-center gap-3">
              <Icon className={cn("h-5 w-5 shrink-0", config.text)} />
              <p className={cn("text-sm font-medium", config.text)}>
                {message}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1 text-sm underline decoration-current/30 underline-offset-2 transition-colors hover:decoration-current",
                    config.text
                  )}
                >
                  Más info
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {dismissible && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Cerrar banner"
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/10",
                    config.text
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

SystemStatusBanner.displayName = "SystemStatusBanner";
