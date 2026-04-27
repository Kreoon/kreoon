import React, { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, MotionValue } from "framer-motion";

interface StoryScrollContainerProps {
  children: React.ReactNode;
}

interface ChapterMarkerProps {
  chapter: { id: string; label: string; position: number };
  scrollYProgress: MotionValue<number>;
  index: number;
}

const CHAPTERS = [
  { id: "hero", label: "Inicio", position: 0 },
  { id: "solutions", label: "Soluciones", position: 0.15 },
  { id: "content", label: "Contenido", position: 0.3 },
  { id: "ai", label: "IA", position: 0.45 },
  { id: "kanban", label: "Proyectos", position: 0.55 },
  { id: "factory", label: "Factory", position: 0.65 },
  { id: "marketplace", label: "Marketplace", position: 0.75 },
  { id: "pricing", label: "Planes", position: 0.9 },
];

function ChapterMarker({ chapter, scrollYProgress, index }: ChapterMarkerProps) {
  const isActive = useTransform(
    scrollYProgress,
    [chapter.position - 0.05, chapter.position, chapter.position + 0.1],
    [0.3, 1, 0.3]
  );

  return (
    <motion.button
      style={{ opacity: isActive }}
      onClick={() => {
        const sections = document.querySelectorAll("section");
        sections[index]?.scrollIntoView({ behavior: "smooth" });
      }}
      className="group relative flex items-center gap-3"
    >
      <span className="text-[9px] font-mono uppercase tracking-wider text-kreoon-text-muted opacity-0 group-hover:opacity-100 transition-opacity text-right w-20">
        {chapter.label}
      </span>
      <div className="h-2 w-2 rounded-full bg-kreoon-purple-500/50 group-hover:bg-kreoon-purple-400 transition-colors" />
    </motion.button>
  );
}

export function StoryScrollContainer({ children }: StoryScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 18,
    mass: 0.5,
    restDelta: 0.001
  });

  return (
    <div ref={containerRef} className="relative">
      {/* Progress Bar con Glow */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 z-[100] origin-left"
        style={{ scaleX }}
      >
        <div className="h-full w-full bg-kreoon-purple-500" />
        <div className="absolute right-0 top-0 h-full w-8 bg-kreoon-purple-400 blur-md" />
      </motion.div>

      {/* Chapter Markers - Desktop Only */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[90] hidden lg:flex flex-col gap-3">
        {CHAPTERS.map((chapter, index) => (
          <ChapterMarker
            key={chapter.id}
            chapter={chapter}
            scrollYProgress={scrollYProgress}
            index={index}
          />
        ))}
      </div>

      {/* Scroll Percentage - Mobile */}
      <motion.div
        className="fixed bottom-6 right-6 z-[90] lg:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-kreoon-bg-card/80 border border-white/10 backdrop-blur-md">
          <div className="h-1.5 w-12 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-kreoon-purple-500 origin-left"
              style={{ scaleX }}
            />
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col">
        {children}
      </div>
    </div>
  );
}
