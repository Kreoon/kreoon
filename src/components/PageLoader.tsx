"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const SPLASH_DURATION_MS = 2000;

function KiroLoader({ size = 140 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0 0 20px rgba(167, 139, 250, 0.5))",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 200 200">
        <defs>
          <linearGradient id="pl-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="pl-screen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id="pl-lens" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <radialGradient id="pl-reflect" cx="30%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="pl-glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.g
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Shadow */}
          <motion.ellipse
            cx="100"
            cy="185"
            rx="45"
            ry="8"
            fill="rgba(0,0,0,0.2)"
            animate={{ rx: [45, 40, 45], opacity: [0.2, 0.15, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Legs */}
          <rect x="72" y="150" width="14" height="22" rx="7" fill="#6d28d9" />
          <rect x="114" y="150" width="14" height="22" rx="7" fill="#6d28d9" />
          <ellipse cx="79" cy="172" rx="11" ry="5" fill="#5b21b6" />
          <ellipse cx="121" cy="172" rx="11" ry="5" fill="#5b21b6" />

          {/* Arms */}
          <motion.rect
            x="26"
            y="82"
            width="18"
            height="11"
            rx="5.5"
            fill="#7c3aed"
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "40px 87px" }}
          />
          <motion.rect
            x="156"
            y="82"
            width="18"
            height="11"
            rx="5.5"
            fill="#7c3aed"
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "160px 87px" }}
          />

          {/* Body */}
          <rect x="42" y="48" width="116" height="108" rx="22" fill="url(#pl-body)" />

          {/* Screen */}
          <rect x="54" y="57" width="92" height="72" rx="14" fill="url(#pl-screen)" />
          <rect x="54" y="57" width="92" height="72" rx="14" fill="url(#pl-reflect)" />

          {/* Film strip detail */}
          {[64, 76, 88, 100, 112].map((y, i) => (
            <rect key={i} x="46" y={y} width="5" height="4" rx="1" fill="#4c1d95" opacity="0.4" />
          ))}

          {/* Camera lens */}
          <circle cx="100" cy="48" r="17" fill="#4c1d95" stroke="#a78bfa" strokeWidth="2.5" />
          <motion.circle
            cx="100"
            cy="48"
            r="11"
            fill="url(#pl-lens)"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "100px 48px" }}
          />
          <circle cx="100" cy="48" r="5.5" fill="#1e1b4b" />
          <circle cx="96" cy="44" r="2.2" fill="rgba(255,255,255,0.6)" />

          {/* REC light */}
          <motion.circle
            cx="136"
            cy="64"
            r="3.5"
            fill="#ef4444"
            filter="url(#pl-glow)"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />

          {/* Eyes */}
          <g>
            {/* Left eye */}
            <motion.ellipse
              cx="80"
              cy="87"
              rx="9"
              ry="9"
              fill="#e0e7ff"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3 }}
            />
            <ellipse cx="80" cy="87" rx="4.5" ry="4.5" fill="#a78bfa" />
            <circle cx="78" cy="85" r="1.5" fill="rgba(255,255,255,0.8)" />

            {/* Right eye */}
            <motion.ellipse
              cx="120"
              cy="87"
              rx="9"
              ry="9"
              fill="#e0e7ff"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3 }}
            />
            <ellipse cx="120" cy="87" rx="4.5" ry="4.5" fill="#a78bfa" />
            <circle cx="118" cy="85" r="1.5" fill="rgba(255,255,255,0.8)" />
          </g>

          {/* Mouth - happy smile */}
          <path
            d="M 88 106 Q 100 116 112 106"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Antenna signals */}
          <motion.path
            d="M 86 33 Q 83 22 88 16"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.5"
            strokeLinecap="round"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="88"
            cy="16"
            r="4"
            fill="#a78bfa"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M 114 33 Q 117 22 112 16"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.5"
            strokeLinecap="round"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
          <motion.circle
            cx="112"
            cy="16"
            r="4"
            fill="#a78bfa"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />

          {/* Processing ring */}
          <motion.circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1"
            opacity="0.3"
            strokeDasharray="8 6"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "100px 100px" }}
          />
        </motion.g>
      </svg>
    </motion.div>
  );
}

export function PageLoader() {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    const isProtectedRoute = location.pathname.startsWith("/dashboard") ||
                             location.pathname.startsWith("/admin") ||
                             location.pathname.startsWith("/settings");

    if (!isFirstLoad && isProtectedRoute) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 400 : SPLASH_DURATION_MS;

    const timer = setTimeout(() => {
      setVisible(false);
      setIsFirstLoad(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [location.pathname, isFirstLoad]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="page-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-kreoon-bg-primary"
          role="status"
          aria-live="polite"
          aria-label="Cargando"
        >
          {/* Glow púrpura ambiental */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 45% at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 70%)",
            }}
          />

          {/* Orbe animado de fondo */}
          <motion.div
            aria-hidden="true"
            className="absolute"
            animate={{
              scale: [0.9, 1.2, 0.9],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            style={{
              width: 300,
              height: 300,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Kiro animado */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={{
                filter: [
                  "drop-shadow(0 0 15px rgba(139,92,246,0.4))",
                  "drop-shadow(0 0 30px rgba(139,92,246,0.6))",
                  "drop-shadow(0 0 15px rgba(139,92,246,0.4))"
                ]
              }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
            >
              <KiroLoader size={140} />
            </motion.div>

            {/* Barra de progreso */}
            <div className="relative w-32 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
                className="absolute inset-y-0 w-1/2 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #8b5cf6, #a78bfa, #8b5cf6, transparent)",
                }}
              />
            </div>
          </motion.div>

          {/* Partículas flotantes */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              aria-hidden="true"
              className="absolute rounded-full bg-violet-400"
              style={{
                width: 3 + (i % 2) * 2,
                height: 3 + (i % 2) * 2,
              }}
              initial={{
                x: (i % 2 === 0 ? -1 : 1) * (60 + i * 12),
                y: (i < 3 ? -1 : 1) * (50 + i * 8),
                opacity: 0,
                scale: 0,
              }}
              animate={{
                x: [
                  (i % 2 === 0 ? -1 : 1) * (60 + i * 12),
                  (i % 2 === 0 ? 1 : -1) * (80 + i * 15),
                ],
                y: [
                  (i < 3 ? -1 : 1) * (50 + i * 8),
                  (i < 3 ? 1 : -1) * (70 + i * 10),
                ],
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2.5 + i * 0.2,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
