import React, { useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function NebulaBackground() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 45]);

  // Generar partículas sutiles de forma determinista
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      duration: Math.random() * 5 + 3,
      delay: Math.random() * 2,
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.div style={{ y, rotate }} className="relative h-full w-full">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-kreoon-purple-500/20 blur-[1px]"
            style={{
              width: p.size,
              height: p.size,
              left: p.x,
              top: p.y,
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Dynamic Nebulas */}
        <div className="absolute top-[20%] left-[10%] h-[400px] w-[400px] bg-kreoon-purple-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[30%] right-[15%] h-[500px] w-[500px] bg-blue-600/5 blur-[150px] rounded-full animate-glow-pulse" />
      </motion.div>
    </div>
  );
}
