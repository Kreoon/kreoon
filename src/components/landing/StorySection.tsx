import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

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
  const isMobile = useIsMobile();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // En móvil: spring muy rígido para no crear lag/rebote
  // En desktop: spring suave para efecto cinematográfico
  const springConfig = isMobile
    ? { stiffness: 400, damping: 50, mass: 0.3 }
    : { stiffness: 100, damping: 30, mass: 0.5 };

  // En móvil: sin translateY para no generar sensación de rebote
  const rawY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    isMobile ? [0, 0, 0, 0] : [150 * intensity, 0, 0, -100 * intensity]
  );
  const y = useSpring(rawY, springConfig);

  // Opacidad: fade in suave (en móvil más rápido)
  const rawOpacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.85, 1],
    isMobile ? [0, 1, 1, 1] : [0, 1, 1, 0]
  );
  const opacity = useSpring(rawOpacity, springConfig);

  // Escala: solo en desktop
  const rawScale = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    scaleEffect && !isMobile ? [0.9, 1, 1, 0.95] : [1, 1, 1, 1]
  );
  const scale = useSpring(rawScale, springConfig);

  // Rotación 3D: solo en desktop
  const rawRotateX = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    tiltEffect && !isMobile ? [8, 0, 0, -5] : [0, 0, 0, 0]
  );
  const rotateX = useSpring(rawRotateX, springConfig);

  // Blur: solo en desktop
  const rawBlur = useTransform(
    scrollYProgress,
    [0, 0.1, 0.9, 1],
    blurOnExit && !isMobile ? [8, 0, 0, 4] : [0, 0, 0, 0]
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
  const isMobile = useIsMobile();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // En móvil: sin parallax en Y para scroll nativo fluido
  const springConfig = isMobile
    ? { stiffness: 400, damping: 50, mass: 0.3 }
    : { stiffness: 80, damping: 25, mass: 0.8 };

  const y = useSpring(
    useTransform(scrollYProgress, [0, 1], isMobile ? [0, 0] : [0, -200]),
    springConfig
  );

  const scale = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], isMobile ? [1, 1, 1] : [1, 1.05, 0.9]),
    springConfig
  );

  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, isMobile ? 1 : 0]),
    springConfig
  );

  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 1], isMobile ? [0, 0] : [0, -15]),
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
