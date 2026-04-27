import React, { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Points,
  PointMaterial,
  PerspectiveCamera,
  Sparkles,
  Stars
} from "@react-three/drei";
import * as THREE from "three";

// Stage names for storytelling
const STAGES = ["COSMOS", "GALAXY", "GRID", "NETWORK"] as const;

function MorphingParticles({ count = 5000, scrollProgress = 0 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Stage 1: COSMOS - Infinite scattered universe
  const cosmosPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 20 + Math.random() * 30;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
    }
    return p;
  }, [count]);

  // Stage 2: GALAXY - Spiral formation
  const galaxyPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 8;
      const radius = (i / count) * 25;
      const spiral = Math.sin(angle * 2) * 2;
      p[i * 3] = Math.cos(angle) * radius + spiral;
      p[i * 3 + 1] = (Math.random() - 0.5) * 3 * (1 - radius / 25);
      p[i * 3 + 2] = Math.sin(angle) * radius + spiral;
    }
    return p;
  }, [count]);

  // Stage 3: GRID - Digital matrix
  const gridPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    const gridSize = Math.ceil(Math.pow(count, 1/3));
    const spacing = 30 / gridSize;
    for (let i = 0; i < count; i++) {
      const x = (i % gridSize) * spacing - 15;
      const y = (Math.floor(i / gridSize) % gridSize) * spacing - 15;
      const z = Math.floor(i / (gridSize * gridSize)) * spacing - 15;
      p[i * 3] = x;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = z;
    }
    return p;
  }, [count]);

  // Stage 4: NETWORK - Neural sphere with connections
  const networkPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 15 + Math.sin(theta * 6 + phi * 4) * 3;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
    }
    return p;
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current || !materialRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = state.clock.getElapsedTime();

    // Dynamic rotation that accelerates with scroll
    const baseRotation = 0.002;
    const scrollBoost = scrollProgress * 0.008;
    pointsRef.current.rotation.y += baseRotation + scrollBoost;
    pointsRef.current.rotation.x = Math.sin(t * 0.1) * 0.1;
    pointsRef.current.rotation.z = Math.cos(t * 0.15) * 0.05 + scrollProgress * 0.3;

    // Morphing between stages with easing
    for (let i = 0; i < count; i++) {
      let tx, ty, tz;
      const noise = Math.sin(t * 0.5 + i * 0.01) * 0.3;

      if (scrollProgress < 0.25) {
        const s = Math.pow(scrollProgress * 4, 0.8); // Ease out
        tx = THREE.MathUtils.lerp(cosmosPos[i * 3], galaxyPos[i * 3], s);
        ty = THREE.MathUtils.lerp(cosmosPos[i * 3 + 1], galaxyPos[i * 3 + 1], s);
        tz = THREE.MathUtils.lerp(cosmosPos[i * 3 + 2], galaxyPos[i * 3 + 2], s);
      } else if (scrollProgress < 0.5) {
        const s = Math.pow((scrollProgress - 0.25) * 4, 0.8);
        tx = THREE.MathUtils.lerp(galaxyPos[i * 3], gridPos[i * 3], s);
        ty = THREE.MathUtils.lerp(galaxyPos[i * 3 + 1], gridPos[i * 3 + 1], s);
        tz = THREE.MathUtils.lerp(galaxyPos[i * 3 + 2], gridPos[i * 3 + 2], s);
      } else if (scrollProgress < 0.75) {
        const s = Math.pow((scrollProgress - 0.5) * 4, 0.8);
        tx = THREE.MathUtils.lerp(gridPos[i * 3], networkPos[i * 3], s);
        ty = THREE.MathUtils.lerp(gridPos[i * 3 + 1], networkPos[i * 3 + 1], s);
        tz = THREE.MathUtils.lerp(gridPos[i * 3 + 2], networkPos[i * 3 + 2], s);
      } else {
        // Final stage: pulsing expansion
        const s = (scrollProgress - 0.75) * 4;
        const pulse = 1 + Math.sin(t * 2) * 0.1 * s;
        tx = networkPos[i * 3] * pulse + noise * s;
        ty = networkPos[i * 3 + 1] * pulse + noise * s;
        tz = networkPos[i * 3 + 2] * pulse + noise * s;
      }

      positions[i * 3] = tx;
      positions[i * 3 + 1] = ty;
      positions[i * 3 + 2] = tz;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Dynamic material properties
    const stagePulse = Math.sin(scrollProgress * Math.PI * 4) * 0.15;
    materialRef.current.size = 0.08 + scrollProgress * 0.08 + Math.abs(stagePulse);
    materialRef.current.opacity = 0.5 + scrollProgress * 0.3 + Math.abs(stagePulse);

    // Color shifts through stages: purple -> blue -> cyan -> pink
    const hue = 0.75 - scrollProgress * 0.25;
    const saturation = 0.7 + scrollProgress * 0.2;
    const lightness = 0.5 + Math.abs(stagePulse);
    materialRef.current.color.setHSL(hue, saturation, lightness);
  });

  return (
    <Points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={cosmosPos} itemSize={3} />
      </bufferGeometry>
      <PointMaterial
        ref={materialRef}
        transparent
        color="#a78bfa"
        size={0.08}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.5}
      />
    </Points>
  );
}

function DynamicCamera({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Zoom in as user scrolls
    const targetZ = 35 - scrollProgress * 15;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.03);

    // Gentle camera sway
    camera.position.x = Math.sin(t * 0.1) * 2;
    camera.position.y = Math.cos(t * 0.15) * 1.5 + scrollProgress * 3;

    camera.lookAt(0, 0, 0);
  });

  return null;
}

function AtmosphericEffects({ scrollProgress }: { scrollProgress: number }) {
  return (
    <group>
      {/* Background stars */}
      <Stars
        radius={100}
        depth={50}
        count={2000}
        factor={4}
        saturation={0.5}
        fade
        speed={0.5 + scrollProgress}
      />

      {/* Floating sparkles that intensify with scroll */}
      <Sparkles
        count={100 + Math.floor(scrollProgress * 100)}
        scale={40}
        size={3 + scrollProgress * 4}
        speed={0.3 + scrollProgress * 0.5}
        color={scrollProgress > 0.5 ? "#22d3ee" : "#a78bfa"}
        opacity={0.4 + scrollProgress * 0.4}
      />
    </group>
  );
}

export function HeroOrbCanvas() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const winHeight = window.innerHeight;
          const docHeight = document.documentElement.scrollHeight;
          const progress = Math.min(1, Math.max(0, scrollY / (docHeight - winHeight)));
          setScrollProgress(progress);
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Calculate stage-specific colors
  const auroraColor1 = `hsl(${270 - scrollProgress * 60}, 80%, 50%)`;
  const auroraColor2 = `hsl(${300 - scrollProgress * 80}, 70%, 40%)`;
  const auroraColor3 = `hsl(${180 + scrollProgress * 40}, 75%, 45%)`;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base gradient that shifts with scroll */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% ${30 + scrollProgress * 40}%,
              ${auroraColor1}15 0%,
              transparent 50%),
            radial-gradient(ellipse 100% 60% at ${20 + scrollProgress * 30}% ${60 - scrollProgress * 20}%,
              ${auroraColor2}12 0%,
              transparent 45%),
            radial-gradient(ellipse 80% 100% at ${80 - scrollProgress * 30}% ${40 + scrollProgress * 30}%,
              ${auroraColor3}10 0%,
              transparent 40%),
            linear-gradient(180deg, #020208 0%, #050510 50%, #0a0a18 100%)
          `
        }}
      />

      {/* Animated nebula layers */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          transform: `translateY(${scrollProgress * -100}px) scale(${1 + scrollProgress * 0.3})`,
          transition: 'transform 0.5s ease-out'
        }}
      >
        <div
          className="absolute w-[150%] h-[150%] -left-[25%] -top-[25%]"
          style={{
            background: `
              radial-gradient(circle at ${30 + scrollProgress * 40}% ${50}%, rgba(139, 92, 246, 0.2) 0%, transparent 40%),
              radial-gradient(circle at ${70 - scrollProgress * 20}% ${30 + scrollProgress * 20}%, rgba(6, 182, 212, 0.15) 0%, transparent 35%)
            `,
            filter: 'blur(60px)',
            animation: 'drift 20s ease-in-out infinite'
          }}
        />
      </div>

      {/* Secondary floating aurora */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          transform: `translateX(${scrollProgress * 50}px) rotate(${scrollProgress * 10}deg)`,
          transition: 'transform 0.8s ease-out'
        }}
      >
        <div
          className="absolute w-full h-full"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 20% 80%, rgba(219, 39, 119, 0.25) 0%, transparent 50%),
              radial-gradient(ellipse 50% 50% at 80% 20%, rgba(124, 58, 237, 0.2) 0%, transparent 45%)
            `,
            filter: 'blur(80px)',
            animation: 'drift-reverse 25s ease-in-out infinite'
          }}
        />
      </div>

      {/* Three.js Canvas */}
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        className="absolute inset-0"
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 35]} fov={50} />
          <group
            rotation={[
              mouse.y * -0.1,
              mouse.x * 0.1,
              0
            ]}
          >
            <MorphingParticles count={5000} scrollProgress={scrollProgress} />
            <AtmosphericEffects scrollProgress={scrollProgress} />
          </group>
          <DynamicCamera scrollProgress={scrollProgress} />
        </Suspense>
      </Canvas>

      {/* Vignette overlay that intensifies */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center,
            transparent ${30 - scrollProgress * 10}%,
            rgba(2, 2, 8, ${0.3 + scrollProgress * 0.4}) 100%
          )`
        }}
      />

      {/* Top fade for navbar blend */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(2,2,8,0.8) 0%, transparent 100%)'
        }}
      />

      {/* Stage indicator dots */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {STAGES.map((stage, i) => {
          const isActive = scrollProgress >= i * 0.25 && scrollProgress < (i + 1) * 0.25;
          const isPast = scrollProgress >= (i + 1) * 0.25;
          return (
            <div
              key={stage}
              className="group relative"
              title={stage}
            >
              <div
                className={`h-2 w-2 rounded-full transition-all duration-500 ${
                  isActive
                    ? "bg-kreoon-purple-400 scale-150 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                    : isPast
                      ? "bg-kreoon-purple-500/60"
                      : "bg-white/20"
                }`}
              />
              <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-wider transition-opacity duration-300 whitespace-nowrap ${
                isActive ? "opacity-100 text-kreoon-purple-300" : "opacity-0"
              }`}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -20px) rotate(2deg); }
          50% { transform: translate(-20px, 30px) rotate(-1deg); }
          75% { transform: translate(-30px, -10px) rotate(1deg); }
        }
        @keyframes drift-reverse {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-20px, 30px) rotate(-2deg); }
          50% { transform: translate(30px, -20px) rotate(1deg); }
          75% { transform: translate(20px, 20px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
