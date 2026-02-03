import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const KREOON_PURPLE = "#7c3aed";

export type PendingVariant = "dots" | "pulse" | "orbit" | "progress";
export type PendingSize = "sm" | "md" | "lg";

const SIZE_PX: Record<PendingSize, number> = {
  sm: 40,
  md: 60,
  lg: 80,
};

const LABEL_SIZE: Record<PendingSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export interface PendingAnimationProps {
  variant: PendingVariant;
  color?: string;
  size?: PendingSize;
  label?: string;
  className?: string;
}

/**
 * Animación visual para estados "esperando aprobación" o "procesando".
 * Variantes: dots, pulse, orbit, progress.
 */
export function PendingAnimation({
  variant,
  color = KREOON_PURPLE,
  size = "md",
  label,
  className,
}: PendingAnimationProps) {
  const px = SIZE_PX[size];

  return (
    <div
      className={cn("flex flex-col items-center gap-3", className)}
      role="status"
      aria-label={label ?? "Cargando"}
    >
      {variant === "dots" && <DotsAnimation color={color} size={px} />}
      {variant === "pulse" && <PulseAnimation color={color} size={px} />}
      {variant === "orbit" && <OrbitAnimation color={color} size={px} />}
      {variant === "progress" && <ProgressAnimation color={color} size={px} />}
      {label && (
        <p className={cn("text-kreoon-text-secondary", LABEL_SIZE[size])}>
          {label}
        </p>
      )}
    </div>
  );
}

function DotsAnimation({ color, size }: { color: string; size: number }) {
  const dotSize = Math.max(6, size / 8);
  const gap = dotSize * 1.5;

  return (
    <div
      className="flex items-center justify-center gap-1"
      style={{ height: size }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
          }}
          animate={{
            y: [0, -size * 0.2, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function PulseAnimation({ color, size }: { color: string; size: number }) {
  return (
    <motion.div
      className="rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        opacity: 0.4,
      }}
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{
        duration: 1.8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function OrbitAnimation({ color, size }: { color: string; size: number }) {
  const dotSize = Math.max(8, size / 6);
  const radius = (size - dotSize) / 2;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute rounded-full border-2 opacity-30"
        style={{ width: size, height: size, borderColor: color }}
        aria-hidden
      />
      <div
        className="absolute flex items-center justify-center rounded-full bg-kreoon-bg-card/80"
        style={{ width: size * 0.35, height: size * 0.35 }}
        aria-hidden
      >
        <img
          src="/favicon.png"
          alt=""
          className="h-3/5 w-3/5 object-contain opacity-80"
        />
      </div>
      <motion.div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{
          width: dotSize,
          height: dotSize,
          marginLeft: -dotSize / 2,
          marginTop: -dotSize / 2,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute left-0 top-0 h-full w-full rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}60`,
            transform: `translateX(${radius}px)`,
          }}
        />
      </motion.div>
    </div>
  );
}

function ProgressAnimation({ color, size }: { color: string; size: number }) {
  const barHeight = Math.max(4, size / 15);
  const barWidth = size * 2;

  return (
    <div
      className="overflow-hidden rounded-full bg-kreoon-bg-card"
      style={{ width: barWidth, height: barHeight }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{
          width: barWidth * 0.4,
          background: `linear-gradient(90deg, transparent 0%, ${color}80 50%, transparent 100%)`,
        }}
        animate={{
          x: [-barWidth * 0.4, barWidth],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

PendingAnimation.displayName = "PendingAnimation";
