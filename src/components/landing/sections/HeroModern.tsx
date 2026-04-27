import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { KreoonButton } from "@/components/ui/kreoon";
import { FeatheredImage } from "@/components/ui/FeatheredImage";

interface HeroModernProps {
  onGetStarted: () => void;
  onWatchDemo?: () => void;
}

const ORBITAL_PARTICLES = [0, 90, 180, 270];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function HeroModern({ onGetStarted, onWatchDemo }: HeroModernProps) {
  const orbContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, isMobile ? 100 : 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Mouse Parallax Logic - UGC Colombia premium config
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 120, damping: 18, mass: 0.5 };
  const mobileSpringConfig = { stiffness: 80, damping: 25, mass: 0.8 };
  const config = isMobile ? mobileSpringConfig : springConfig;

  const orbX = useSpring(useTransform(mouseX, [-1, 1], isMobile ? [-15, 15] : [-40, 40]), config);
  const orbY = useSpring(useTransform(mouseY, [-1, 1], isMobile ? [-15, 15] : [-40, 40]), config);
  const bgX = useSpring(useTransform(mouseX, [-1, 1], isMobile ? [8, -8] : [20, -20]), config);
  const bgY = useSpring(useTransform(mouseY, [-1, 1], isMobile ? [8, -8] : [20, -20]), config);

  // 3D Tilt effect - reduced on mobile
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], isMobile ? [-5, 5] : [-12, 12]), config);
  const rotateX = useSpring(useTransform(mouseY, [-1, 1], isMobile ? [3, -3] : [8, -8]), config);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth) * 2 - 1;
      const y = (clientY / innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mouseX, mouseY]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-20 bg-transparent">
      {/* Background Motion Elements - Subtle parallax for the global scene */}
      <motion.div 
        style={{ x: bgX, y: bgY }}
        className="absolute inset-0 z-0 pointer-events-none"
      >
        <motion.div 
          style={{ y: y1, opacity }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px]"
        >
          <div className="absolute inset-0 rounded-full bg-kreoon-purple-500/5 blur-[120px] animate-pulse" />
        </motion.div>
      </motion.div>

      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.h1 
              className="text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl lg:text-8xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Contenido que <br />
              <span className="bg-gradient-to-r from-kreoon-purple-400 via-kreoon-purple-300 to-kreoon-purple-400 bg-clip-text text-transparent">
                Convierte
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 max-w-xl text-lg text-kreoon-text-secondary md:text-xl"
            >
              Kreoon es la infraestructura integral donde marcas y creadores escalan sus operaciones. 
              IA Research, Gestión de Equipos y Marketplace en una sola interfaz.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <KreoonButton
                variant="primary"
                size="lg"
                onClick={onGetStarted}
                className="group relative overflow-hidden px-8 py-6 text-lg shadow-kreoon-glow-sm hover:shadow-kreoon-glow"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Comenzar Gratis
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </KreoonButton>

              {onWatchDemo && (
                <KreoonButton
                  variant="outline"
                  size="lg"
                  onClick={onWatchDemo}
                  className="px-8 py-6 text-lg backdrop-blur-sm"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Ver Demo
                </KreoonButton>
              )}
            </motion.div>
          </motion.div>

          {/* 3D Orb Visual with Premium Parallax */}
          <motion.div
            ref={orbContainerRef}
            style={{
              x: orbX,
              y: orbY,
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
              perspective: "1400px",
            }}
            initial={{ opacity: 0, scale: 0.6, filter: "blur(12px)" }}
            animate={{
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
              y: [0, -10, 0],
            }}
            transition={{
              opacity: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 1, ease: [0.22, 1, 0.36, 1] },
              filter: { duration: 0.9, ease: "easeOut" },
              y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 },
            }}
            className="relative flex items-center justify-center will-change-transform"
          >
            {/* Orbital Particles - UGC Colombia pattern - hidden on mobile for performance */}
            {!isMobile && (
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none z-30 will-change-transform"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {ORBITAL_PARTICLES.map((angle) => (
                <div
                  key={angle}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-kreoon-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                  style={{
                    transform: `rotate(${angle}deg) translateX(min(280px, 42vw)) translateY(-4px)`,
                  }}
                />
              ))}
            </motion.div>
            )}

            <div className="relative h-[400px] w-[400px] md:h-[600px] md:w-[600px]">
              {/* Floating UI Cards */}
              <motion.div
                animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-10 top-20 z-20 hidden rounded-sm border border-kreoon-purple-500/20 bg-kreoon-bg-card/40 p-4 backdrop-blur-xl md:block"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-12 rounded-full bg-kreoon-purple-500/50" />
                  <div className="h-2 w-8 rounded-full bg-kreoon-purple-500/20" />
                </div>
                <div className="mt-4 h-24 w-32 rounded-sm bg-kreoon-purple-500/5" />
              </motion.div>

              <motion.div
                animate={{ y: [0, 20, 0], rotate: [0, -2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -right-10 bottom-20 z-20 hidden rounded-sm border border-kreoon-purple-500/20 bg-kreoon-bg-card/40 p-4 backdrop-blur-xl md:block"
              >
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                  <span className="text-xs font-mono text-kreoon-text-muted">SYSTEM_ACTIVE</span>
                </div>
                <div className="mt-2 h-16 w-40 rounded-sm bg-kreoon-purple-500/5" />
              </motion.div>


              {/* Hero Orb Image - difuminado agresivo sin bordes visibles */}
              <FeatheredImage
                src="/assets/landing/hero_orb.png"
                alt="Kreoon Universe"
                variant="orb"
                glow="aurora"
                className="absolute inset-0 z-0"
                imageClassName="opacity-80 scale-110"
              />

              {/* Decorative Rings */}
              <div className="absolute inset-0 rounded-full border border-kreoon-purple-500/10 animate-[spin_20s_linear_infinite]" />
              <div className="absolute -inset-4 rounded-full border border-kreoon-purple-500/5 animate-[spin_30s_linear_infinite_reverse]" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-kreoon-text-muted">Scroll to enter OS</span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-12 w-[1px] bg-gradient-to-b from-kreoon-purple-500 to-transparent"
          />
        </div>
      </motion.div>
    </section>
  );
}
