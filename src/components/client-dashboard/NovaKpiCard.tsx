import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NovaKpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: "success" | "primary" | "warning" | "info";
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

// Animated counter using requestAnimationFrame
const AnimatedNumber = ({
  value,
  prefix = "",
  suffix = ""
}: {
  value: number;
  prefix?: string;
  suffix?: string
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value === prevValueRef.current || value === 0) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 800;
    let startTime: number | null = null;
    let animationId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationId = requestAnimationFrame(animate);
    prevValueRef.current = value;

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [value]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

const variantStyles = {
  success: {
    iconBg: "bg-green-50 dark:bg-green-950/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  primary: {
    iconBg: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  warning: {
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  info: {
    iconBg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
};

export function NovaKpiCard({
  title,
  value,
  icon: Icon,
  variant = "primary",
  prefix = "",
  suffix = "",
  subtitle,
  onClick,
  className,
}: NovaKpiCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-lg p-4",
        "bg-white dark:bg-[#14141f]",
        "border border-zinc-200 dark:border-zinc-800",
        "shadow-sm dark:shadow-none",
        "transition-colors duration-150",
        onClick && "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
        className
      )}
    >
      {/* Icon container */}
      <div className={cn(
        "absolute right-3 top-3 p-2 rounded-lg",
        styles.iconBg,
      )}>
        <Icon className={cn("h-5 w-5", styles.iconColor)} />
      </div>

      {/* Content */}
      <div className="pr-12">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        </p>
        {subtitle && (
          <p className="text-xs text-zinc-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export { AnimatedNumber };
