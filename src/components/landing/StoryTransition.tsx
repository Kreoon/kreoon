import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface StoryTransitionProps {
  label?: string;
  variant?: "glow" | "line" | "fade";
}

export function StoryTransition({ label, variant = "glow" }: StoryTransitionProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);
  const glowIntensity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);

  if (variant === "line") {
    return (
      <div ref={ref} className="relative h-32 w-full overflow-hidden">
        <motion.div
          style={{ scaleX: scrollYProgress }}
          className="absolute left-0 top-1/2 h-[1px] w-full origin-left bg-gradient-to-r from-transparent via-kreoon-purple-500 to-transparent"
        />
      </div>
    );
  }

  if (variant === "fade") {
    return (
      <motion.div
        ref={ref}
        style={{ opacity }}
        className="relative h-48 w-full"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-kreoon-bg-primary via-kreoon-purple-500/5 to-kreoon-bg-primary" />
      </motion.div>
    );
  }

  return (
    <div ref={ref} className="relative h-64 w-full overflow-hidden">
      <motion.div
        style={{ opacity, scale }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <motion.div
          style={{ opacity: glowIntensity }}
          className="absolute h-96 w-96 rounded-full bg-kreoon-purple-500/20 blur-[100px]"
        />

        {label && (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="h-12 w-[1px] bg-gradient-to-b from-transparent via-kreoon-purple-500/50 to-kreoon-purple-500" />
            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-kreoon-purple-400/80">
              {label}
            </span>
            <div className="h-12 w-[1px] bg-gradient-to-b from-kreoon-purple-500 via-kreoon-purple-500/50 to-transparent" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
