import * as React from "react";
import { cn } from "@/lib/utils";

export type KreoonSkeletonVariant = "text" | "circular" | "rectangular" | "card";
export type KreoonSkeletonAnimation = "pulse" | "shimmer" | "none";

export interface KreoonSkeletonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: KreoonSkeletonVariant;
  width?: string | number;
  height?: string | number;
  animation?: KreoonSkeletonAnimation;
}

const variantRadius: Record<KreoonSkeletonVariant, string> = {
  text: "rounded",
  circular: "rounded-full",
  rectangular: "rounded-sm",
  card: "rounded-sm",
};

const animationClasses: Record<KreoonSkeletonAnimation, string> = {
  pulse: "animate-kreoon-skeleton-pulse",
  shimmer: "animate-kreoon-skeleton-shimmer",
  none: "",
};

/**
 * Skeleton base con estilo Kreoon.
 */
const KreoonSkeleton = React.forwardRef<HTMLDivElement, KreoonSkeletonProps>(
  (
    {
      className,
      variant = "rectangular",
      width,
      height,
      animation = "pulse",
      style,
      ...props
    },
    ref
  ) => {
    const sizeStyle: React.CSSProperties = {
      ...(width != null && {
        width: typeof width === "number" ? `${width}px` : width,
      }),
      ...(height != null && {
        height: typeof height === "number" ? `${height}px` : height,
      }),
    };
    return (
      <div
        ref={ref}
        className={cn(
          "bg-kreoon-bg-secondary",
          variantRadius[variant],
          animationClasses[animation],
          className
        )}
        style={{ ...sizeStyle, ...style }}
        aria-hidden
        {...props}
      />
    );
  }
);
KreoonSkeleton.displayName = "KreoonSkeleton";

// --- KreoonSkeletonText ---

export interface KreoonSkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
}

export function KreoonSkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  className,
}: KreoonSkeletonTextProps) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <KreoonSkeleton
          key={i}
          variant="text"
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "" : "w-full"
          )}
          style={
            i === lines - 1 && lines > 1
              ? { width: lastLineWidth }
              : undefined
          }
        />
      ))}
    </div>
  );
}

// --- KreoonSkeletonCard ---

export interface KreoonSkeletonCardProps {
  showAvatar?: boolean;
  showImage?: boolean;
  lines?: number;
  className?: string;
}

export function KreoonSkeletonCard({
  showAvatar = false,
  showImage = false,
  lines = 2,
  className,
}: KreoonSkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-sm border border-kreoon-border bg-kreoon-bg-card/80 overflow-hidden",
        className
      )}
      aria-hidden
    >
      {showImage && (
        <KreoonSkeleton
          variant="rectangular"
          className="h-40 w-full rounded-none"
        />
      )}
      <div className="p-4 space-y-3">
        {showAvatar && (
          <div className="flex items-center gap-3">
            <KreoonSkeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <KreoonSkeleton variant="text" className="h-4 w-3/4" />
              <KreoonSkeleton variant="text" className="h-3 w-1/2" />
            </div>
          </div>
        )}
        <KreoonSkeletonText lines={lines} lastLineWidth="70%" />
      </div>
    </div>
  );
}

// --- KreoonSkeletonTable ---

export interface KreoonSkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function KreoonSkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: KreoonSkeletonTableProps) {
  return (
    <div
      className={cn(
        "w-full rounded-sm border border-kreoon-border overflow-hidden",
        className
      )}
      aria-hidden
    >
      <table className="w-full border-collapse">
        {showHeader && (
          <thead>
            <tr className="border-b border-kreoon-border bg-kreoon-bg-secondary/50">
              {Array.from({ length: columns }, (_, i) => (
                <th key={i} className="p-3 text-left">
                  <KreoonSkeleton variant="text" className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-kreoon-border/50 last:border-b-0"
            >
              {Array.from({ length: columns }, (_, colIndex) => (
                <td key={colIndex} className="p-3">
                  <KreoonSkeleton
                    variant="text"
                    className="h-4"
                    style={{
                      width: colIndex === 0 ? "80%" : `${60 + colIndex * 10}%`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- KreoonLoadingScreen ---

export interface KreoonLoadingScreenProps {
  message?: string;
  showLogo?: boolean;
  className?: string;
}

export function KreoonLoadingScreen({
  message,
  showLogo = true,
  className,
}: KreoonLoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-kreoon-bg-primary p-4",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message ?? "Cargando"}
    >
      {showLogo && (
        <div className="mb-8 animate-kreoon-skeleton-pulse">
          <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-kreoon-purple-500/30 bg-kreoon-bg-card">
            <img
              src="/favicon.png"
              alt=""
              className="h-10 w-10 object-cover rounded-sm"
            />
          </div>
        </div>
      )}
      <div
        className="h-12 w-12 rounded-full border-2 border-kreoon-purple-500/30 border-t-kreoon-purple-400 animate-spin"
        style={{
          boxShadow: "0 0 20px rgba(124, 58, 237, 0.2)",
        }}
      />
      {message && (
        <p className="mt-4 text-sm text-kreoon-text-muted">{message}</p>
      )}
      <span className="sr-only">{message ?? "Cargando"}</span>
    </div>
  );
}

// --- Global styles for skeleton animations ---

const STYLES = `
  @keyframes kreoon-skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.7; }
  }
  .animate-kreoon-skeleton-pulse {
    animation: kreoon-skeleton-pulse 1.5s ease-in-out infinite;
  }
  @keyframes kreoon-skeleton-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .animate-kreoon-skeleton-shimmer {
    background: linear-gradient(
      90deg,
      var(--kreoon-bg-secondary, #12121a) 0%,
      rgba(124, 58, 237, 0.15) 50%,
      var(--kreoon-bg-secondary, #12121a) 100%
    );
    background-size: 200% 100%;
    animation: kreoon-skeleton-shimmer 1.5s ease-in-out infinite;
  }
`;

export function KreoonSkeletonStyles() {
  return <style dangerouslySetInnerHTML={{ __html: STYLES }} />;
}
