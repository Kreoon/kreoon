import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface StoryTransitionProps {
  label?: string;
  variant?: "glow" | "line" | "fade" | "aurora";
}

export function StoryTransition({ label, variant = "glow" }: StoryTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const springConfig = { stiffness: 100, damping: 30 };

  // Efectos base
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]),
    springConfig
  );
  const y = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], [60, 0, -60]),
    springConfig
  );
  const scale = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]),
    springConfig
  );

  if (variant === "line") {
    const lineScale = useSpring(scrollYProgress, springConfig);
    return (
      <motion.div
        ref={ref}
        style={{ y, opacity }}
        className="relative h-24 w-full overflow-hidden"
      >
        <motion.div
          style={{ scaleX: lineScale }}
          className="absolute left-0 top-1/2 h-[2px] w-full origin-left"
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-kreoon-purple-500 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-kreoon-purple-400 to-transparent blur-sm" />
        </motion.div>
      </motion.div>
    );
  }

  if (variant === "fade") {
    return (
      <motion.div
        ref={ref}
        style={{ opacity, y }}
        className="relative h-40 w-full"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-kreoon-purple-500/5 to-transparent" />
        <motion.div
          style={{ scale }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      </motion.div>
    );
  }

  if (variant === "aurora") {
    const rotate = useTransform(scrollYProgress, [0, 1], [-5, 5]);
    const auroraOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0.6, 0.6, 0]);

    return (
      <motion.div
        ref={ref}
        style={{ y }}
        className="relative h-72 w-full overflow-hidden"
      >
        <motion.div
          style={{ opacity: auroraOpacity, rotate, scale }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {/* Aurora layers */}
          <div className="absolute w-[200%] h-[200%] -left-[50%] -top-[50%]">
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 50% 30% at 30% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
                  radial-gradient(ellipse 40% 40% at 70% 40%, rgba(6, 182, 212, 0.25) 0%, transparent 45%),
                  radial-gradient(ellipse 60% 25% at 50% 60%, rgba(219, 39, 119, 0.2) 0%, transparent 40%)
                `,
                filter: 'blur(40px)',
                animation: 'aurora-drift 8s ease-in-out infinite alternate'
              }}
            />
          </div>

          {label && (
            <div className="relative z-10 flex flex-col items-center gap-4">
              <motion.div
                style={{ scaleY: useTransform(scrollYProgress, [0.2, 0.5], [0, 1]) }}
                className="h-16 w-[1px] origin-bottom bg-gradient-to-b from-transparent to-kreoon-purple-500"
              />
              <span className="text-xs font-mono uppercase tracking-[0.5em] text-kreoon-purple-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                {label}
              </span>
              <motion.div
                style={{ scaleY: useTransform(scrollYProgress, [0.5, 0.8], [0, 1]) }}
                className="h-16 w-[1px] origin-top bg-gradient-to-b from-kreoon-purple-500 to-transparent"
              />
            </div>
          )}
        </motion.div>

        <style>{`
          @keyframes aurora-drift {
            0% { transform: translate(0, 0) rotate(0deg); }
            100% { transform: translate(20px, -10px) rotate(3deg); }
          }
        `}</style>
      </motion.div>
    );
  }

  // Default: glow variant
  const glowIntensity = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]),
    springConfig
  );

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className="relative h-56 w-full overflow-hidden"
    >
      <motion.div
        style={{ opacity, scale }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {/* Glow orb */}
        <motion.div
          style={{ opacity: glowIntensity, scale: useTransform(glowIntensity, [0, 1], [0.5, 1.2]) }}
          className="absolute h-80 w-80 rounded-full bg-kreoon-purple-500/20 blur-[80px]"
        />

        {/* Secondary glow */}
        <motion.div
          style={{ opacity: useTransform(glowIntensity, v => v * 0.5) }}
          className="absolute h-60 w-60 rounded-full bg-cyan-500/10 blur-[60px] translate-x-20"
        />

        {label && (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <motion.div
              style={{ scaleY: useTransform(scrollYProgress, [0.2, 0.4], [0, 1]) }}
              className="h-14 w-[1px] origin-bottom bg-gradient-to-b from-transparent via-kreoon-purple-500/50 to-kreoon-purple-500"
            />
            <motion.span
              style={{ opacity: useTransform(scrollYProgress, [0.35, 0.5], [0, 1]) }}
              className="text-[11px] font-mono uppercase tracking-[0.4em] text-kreoon-purple-400"
            >
              {label}
            </motion.span>
            <motion.div
              style={{ scaleY: useTransform(scrollYProgress, [0.5, 0.7], [0, 1]) }}
              className="h-14 w-[1px] origin-top bg-gradient-to-b from-kreoon-purple-500 via-kreoon-purple-500/50 to-transparent"
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
