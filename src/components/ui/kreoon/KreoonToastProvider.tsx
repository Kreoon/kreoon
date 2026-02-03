"use client";

import * as React from "react";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";

const KREOON_TOAST_DURATION = 4000;
const KREOON_TOAST_VISIBLE = 3;
const KREOON_TOAST_GAP = 12;

const toastBase =
  "kreoon-toast !bg-kreoon-bg-card backdrop-blur-md border shadow-lg rounded-lg " +
  "flex flex-row items-start gap-3 p-4 min-w-[320px] max-w-[calc(100vw-2rem)] " +
  "[&[data-type=success]]:border-green-500/50 [&[data-type=success]]:[--kreoon-progress:#22c55e] " +
  "[&[data-type=error]]:border-red-500/50 [&[data-type=error]]:[--kreoon-progress:#ef4444] " +
  "[&[data-type=warning]]:border-amber-500/50 [&[data-type=warning]]:[--kreoon-progress:#f59e0b] " +
  "[&[data-type=info]]:border-kreoon-purple-500/50 [&[data-type=info]]:[--kreoon-progress:#7c3aed] " +
  "[&[data-type=loading]]:border-kreoon-border [&[data-type=loading]]:[--kreoon-progress:transparent]";

export type KreoonToastProviderProps = Omit<ToasterProps, "toastOptions"> & {
  toastOptions?: Partial<ToasterProps["toastOptions"]>;
};

/**
 * Provider de toasts con estilo Kreoon.
 * Posición: top-right en desktop, top-center en mobile.
 * Duración por defecto 4s, máximo 3 toasts visibles, gap 12px.
 */
function KreoonToastProvider({
  position = "top-right",
  visibleToasts = KREOON_TOAST_VISIBLE,
  gap = KREOON_TOAST_GAP,
  duration = KREOON_TOAST_DURATION,
  closeButton = true,
  toastOptions,
  className,
  ...props
}: KreoonToastProviderProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const effectivePosition = isMobile ? "top-center" : position;

  return (
    <>
      <style>{`
        .kreoon-toast {
          position: relative;
          overflow: hidden;
        }
        .kreoon-toast::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          width: 100%;
          background: var(--kreoon-progress, rgba(139, 92, 246, 0.5));
          transform-origin: left;
          animation: kreoon-toast-progress 4s linear forwards;
        }
        [data-type="loading"].kreoon-toast::after {
          display: none;
        }
        @keyframes kreoon-toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        .kreoon-toast [data-title] {
          font-weight: 600;
          color: var(--kreoon-text-primary, #ffffff);
        }
        .kreoon-toast [data-description] {
          color: var(--kreoon-text-secondary, #a1a1aa);
          font-size: 0.8125rem;
        }
        .kreoon-toast [data-close-button] {
          opacity: 0.7;
          border-radius: 0.375rem;
          transition: opacity 0.15s, background 0.15s;
        }
        .kreoon-toast [data-close-button]:hover {
          opacity: 1;
          background: rgba(255,255,255,0.08);
        }
        .kreoon-toaster-desktop {
          left: auto !important;
          right: 1rem !important;
          transform: none !important;
        }
        @media (max-width: 640px) {
          .kreoon-toaster-mobile {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            width: calc(100% - 2rem) !important;
          }
        }
      `}</style>
      <Sonner
        theme="dark"
        position={effectivePosition}
        visibleToasts={visibleToasts}
        gap={gap}
        duration={duration}
        closeButton={closeButton}
        icons={{
          success: <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />,
          error: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
          warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
          info: <Info className="h-5 w-5 text-kreoon-purple-400 shrink-0" />,
          loading: <Loader2 className="h-5 w-5 text-kreoon-purple-400 animate-spin shrink-0" />,
          close: <X className="h-4 w-4" />,
        }}
        className={cn(
          "kreoon-toaster",
          isMobile ? "kreoon-toaster-mobile" : "kreoon-toaster-desktop",
          className
        )}
        toastOptions={{
          classNames: {
            toast: toastBase,
            description: "text-kreoon-text-secondary text-sm mt-0.5",
            actionButton: "!bg-kreoon-purple-500 hover:!bg-kreoon-purple-400 text-white",
            cancelButton: "!bg-kreoon-bg-secondary text-kreoon-text-secondary",
            ...toastOptions?.classNames,
          },
          ...toastOptions,
        }}
        {...props}
      />
    </>
  );
}

export { KreoonToastProvider };
