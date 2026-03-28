import { motion } from "framer-motion";
import { ReactNode } from "react";

// Animated grid background
export function TechGrid({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id="tech-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(270 100% 60%)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tech-grid)" />
      </svg>
    </div>
  );
}

// Floating particles
export function TechParticles({ count = 20 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[hsl(270,100%,60%,0.4)]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Pulsing orb
export function TechOrb({ 
  size = "md",
  position = "top-right",
  delay = 0 
}: { 
  size?: "sm" | "md" | "lg";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  delay?: number;
}) {
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-64 h-64",
    lg: "w-96 h-96",
  };

  const positionClasses = {
    "top-left": "-top-16 -left-16",
    "top-right": "-top-16 -right-16",
    "bottom-left": "-bottom-16 -left-16",
    "bottom-right": "-bottom-16 -right-16",
    "center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  };

  return (
    <motion.div
      className={`absolute ${sizeClasses[size]} ${positionClasses[position]} rounded-full blur-[100px] pointer-events-none`}
      style={{
        background: "radial-gradient(circle, hsl(270 100% 60% / 0.3), transparent 70%)",
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

// Staggered container for children animations
export function StaggerContainer({ 
  children, 
  className,
  staggerDelay = 0.1,
}: { 
  children: ReactNode; 
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Individual animated item
export function StaggerItem({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { 
          opacity: 0, 
          y: 20,
          scale: 0.95,
        },
        visible: { 
          opacity: 1, 
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 100,
            damping: 15,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Glowing border animation
export function GlowBorder({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute -inset-px rounded-sm opacity-50"
        style={{
          background: "linear-gradient(90deg, hsl(270 100% 60%), hsl(300 100% 60%), hsl(270 100% 60%))",
          backgroundSize: "200% 100%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "200% 0%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="relative bg-card rounded-sm">
        {children}
      </div>
    </div>
  );
}

// Data flow lines effect
export function DataFlowLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-[hsl(270,100%,60%,0.3)] to-transparent"
          style={{
            top: `${20 + i * 15}%`,
            left: 0,
            right: 0,
          }}
          animate={{
            x: ["-100%", "100%"],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// Pulse ring effect
export function PulseRing({ className }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border border-[hsl(270,100%,60%,0.3)]"
          animate={{
            scale: [1, 2],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// Typing text effect
export function TypewriterText({ 
  text, 
  className,
  speed = 50 
}: { 
  text: string; 
  className?: string;
  speed?: number;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * (speed / 1000) }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        className="inline-block w-0.5 h-[1em] bg-[hsl(270,100%,60%)] ml-0.5"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    </motion.span>
  );
}

// Hover scale with glow
export function HoverGlow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 0 30px hsl(270 100% 60% / 0.3)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

// AI Processing indicator
export function AIProcessing({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-4 h-4">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[hsl(270,100%,60%,0.3)] border-t-[hsl(270,100%,60%)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <motion.span
        className="text-xs text-primary"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        AI Processing...
      </motion.span>
    </div>
  );
}

// Neon text
export function NeonText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.span
      className={`text-primary ${className}`}
      style={{
        textShadow: "0 0 10px hsl(270 100% 60% / 0.5), 0 0 20px hsl(270 100% 60% / 0.3)",
      }}
      animate={{
        textShadow: [
          "0 0 10px hsl(270 100% 60% / 0.5), 0 0 20px hsl(270 100% 60% / 0.3)",
          "0 0 15px hsl(270 100% 60% / 0.7), 0 0 30px hsl(270 100% 60% / 0.5)",
          "0 0 10px hsl(270 100% 60% / 0.5), 0 0 20px hsl(270 100% 60% / 0.3)",
        ],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {children}
    </motion.span>
  );
}
