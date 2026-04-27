import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface StorySectionProps {
  children: React.ReactNode;
  className?: string;
  /** Intensidad del efecto parallax (0-1) */
  intensity?: number;
  /** Efecto de escala al entrar */
  scaleEffect?: boolean;
  /** Efecto de rotación 3D */
  tiltEffect?: boolean;
  /** Efecto de blur al salir */
  blurOnExit?: boolean;
}

export function StorySection({
  children,
  className = "",
  intensity = 0.5,
  scaleEffect = true,
  tiltEffect = false,
  blurOnExit = true,
}: StorySectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Spring config para movimientos suaves
  const springConfig = { stiffness: 100, damping: 30, mass: 0.5 };

  // El contenido "sube" hacia el usuario (translateY negativo cuando entra)
  const rawY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [150 * intensity, 0, 0, -100 * intensity]
  );
  const y = useSpring(rawY, springConfig);

  // Opacidad: fade in cuando entra, fade out cuando sale
  const rawOpacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.85, 1],
    [0, 1, 1, 0]
  );
  const opacity = useSpring(rawOpacity, springConfig);

  // Escala: crece ligeramente al entrar, se mantiene, decrece al salir
  const rawScale = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    scaleEffect ? [0.9, 1, 1, 0.95] : [1, 1, 1, 1]
  );
  const scale = useSpring(rawScale, springConfig);

  // Rotación 3D sutil
  const rawRotateX = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    tiltEffect ? [8, 0, 0, -5] : [0, 0, 0, 0]
  );
  const rotateX = useSpring(rawRotateX, springConfig);

  // Blur al salir
  const rawBlur = useTransform(
    scrollYProgress,
    [0, 0.1, 0.9, 1],
    blurOnExit ? [8, 0, 0, 4] : [0, 0, 0, 0]
  );

  return (
    <motion.section
      ref={sectionRef}
      style={{
        y,
        opacity,
        scale,
        rotateX,
        filter: useTransform(rawBlur, (v) => `blur(${v}px)`),
        transformPerspective: 1200,
        transformOrigin: "center center",
      }}
      className={`relative will-change-transform ${className}`}
    >
      {children}
    </motion.section>
  );
}

/**
 * Variante más dramática para secciones importantes
 */
export function StoryHeroSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 80, damping: 25, mass: 0.8 };

  // El hero se "aleja" hacia arriba mientras scrolleas
  const y = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -200]),
    springConfig
  );

  const scale = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.05, 0.9]),
    springConfig
  );

  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0]),
    springConfig
  );

  // El contenido se dispersa ligeramente
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -15]),
    springConfig
  );

  return (
    <motion.section
      ref={sectionRef}
      style={{
        y,
        scale,
        opacity,
        rotateX,
        transformPerspective: 1500,
        transformOrigin: "center bottom",
      }}
      className={`relative will-change-transform ${className}`}
    >
      {children}
    </motion.section>
  );
}

/**
 * Contenedor que hace que los hijos aparezcan en secuencia
 */
export function StoryStaggerContainer({
  children,
  className = "",
  staggerDelay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "start center"],
  });

  return (
    <motion.div
      ref={containerRef}
      className={className}
    >
      {React.Children.map(children, (child, index) => {
        const delay = index * staggerDelay;
        const start = Math.min(delay, 0.5);
        const end = Math.min(delay + 0.3, 0.8);

        const itemY = useTransform(
          scrollYProgress,
          [start, end],
          [80, 0]
        );
        const itemOpacity = useTransform(
          scrollYProgress,
          [start, end],
          [0, 1]
        );

        return (
          <motion.div
            style={{ y: itemY, opacity: itemOpacity }}
            className="will-change-transform"
          >
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
