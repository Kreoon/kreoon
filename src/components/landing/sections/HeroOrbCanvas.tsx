import React, { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  Points, 
  PointMaterial, 
  PerspectiveCamera, 
  Environment, 
  Sparkles, 
  Cloud,
  Float,
  Text
} from "@react-three/drei";
import * as THREE from "three";

/**
 * ULTRA_PREMIUM_TRANSFORMATION_ENGINE
 * This is the core visual engine that drives the storytelling.
 */
function MorphingParticles({ count = 10000, scrollProgress = 0 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  // -- Stage 1: COSMOS (Hero) --
  const cosmosPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 50;
      p[i * 3 + 1] = (Math.random() - 0.5) * 50;
      p[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return p;
  }, [count]);

  // -- Stage 2: GENESIS (Galaxy / Ecosystem) --
  const galaxyPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 25;
      const spin = radius * 3.5;
      const x = Math.cos(angle + spin) * radius;
      const y = (Math.random() - 0.5) * 1.2 * (25 - radius) / 25;
      const z = Math.sin(angle + spin) * radius;
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    }
    return p;
  }, [count]);

  // -- Stage 3: LOGIC (Digital Grid / AI Engine) --
  const gridPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    const size = 20;
    const step = size / Math.pow(count, 1/3);
    let idx = 0;
    for (let x = -size/2; x < size/2; x += step) {
      for (let y = -size/2; y < size/2; y += step) {
        for (let z = -size/2; z < size/2; z += step) {
          if (idx < count) {
            p[idx * 3] = x; p[idx * 3 + 1] = y; p[idx * 3 + 2] = z;
            idx++;
          }
        }
      }
    }
    return p;
  }, [count]);

  // -- Stage 4: FLOW (Neural Network / Marketplace) --
  const networkPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 12 + Math.sin(theta * 5) * 2;
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
    
    // Dynamic Speed & Rotation based on scroll
    const rotationSpeed = 0.05 + scrollProgress * 0.5;
    pointsRef.current.rotation.y += rotationSpeed * 0.01;
    pointsRef.current.rotation.z = Math.sin(t * 0.1) * 0.1 + scrollProgress * 0.5;

    // Morphing Engine
    for (let i = 0; i < count; i++) {
      let tx, ty, tz;
      
      if (scrollProgress < 0.25) {
        // Stage 1 -> 2
        const s = scrollProgress * 4;
        tx = THREE.MathUtils.lerp(cosmosPos[i * 3], galaxyPos[i * 3], s);
        ty = THREE.MathUtils.lerp(cosmosPos[i * 3 + 1], galaxyPos[i * 3 + 1], s);
        tz = THREE.MathUtils.lerp(cosmosPos[i * 3 + 2], galaxyPos[i * 3 + 2], s);
      } else if (scrollProgress < 0.5) {
        // Stage 2 -> 3
        const s = (scrollProgress - 0.25) * 4;
        tx = THREE.MathUtils.lerp(galaxyPos[i * 3], gridPos[i * 3], s);
        ty = THREE.MathUtils.lerp(galaxyPos[i * 3 + 1], gridPos[i * 3 + 1], s);
        tz = THREE.MathUtils.lerp(galaxyPos[i * 3 + 2], gridPos[i * 3 + 2], s);
      } else if (scrollProgress < 0.75) {
        // Stage 3 -> 4
        const s = (scrollProgress - 0.5) * 4;
        tx = THREE.MathUtils.lerp(gridPos[i * 3], networkPos[i * 3], s);
        ty = THREE.MathUtils.lerp(gridPos[i * 3 + 1], networkPos[i * 3 + 1], s);
        tz = THREE.MathUtils.lerp(gridPos[i * 3 + 2], networkPos[i * 3 + 2], s);
      } else {
        // Stage 4 Final Flow
        const s = (scrollProgress - 0.75) * 4;
        const noise = Math.sin(t + i) * 0.2;
        tx = networkPos[i * 3] * (1 + s * 0.5) + noise;
        ty = networkPos[i * 3 + 1] * (1 + s * 0.5) + noise;
        tz = networkPos[i * 3 + 2] * (1 + s * 0.5) + noise;
      }
      
      positions[i * 3] = tx;
      positions[i * 3 + 1] = ty;
      positions[i * 3 + 2] = tz;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Pulse Effect on scroll transitions
    const pulse = Math.abs(Math.sin(scrollProgress * Math.PI * 4)) * 0.2;
    materialRef.current.size = 0.12 + pulse;
    materialRef.current.opacity = 0.4 + pulse;
    materialRef.current.color.setHSL(0.7 - scrollProgress * 0.2, 0.8, 0.6 + pulse);
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
        size={0.12}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.4}
      />
    </Points>
  );
}

function Atmosphere({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();
  
  useFrame((state) => {
    // Cinematic Camera Movement
    const t = state.clock.getElapsedTime();
    const zoom = 30 - scrollProgress * 10;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, zoom, 0.05);
    camera.position.y = Math.sin(t * 0.2) * 2;
    camera.lookAt(0, 0, 0);
  });

  return (
    <group>
      <Sparkles count={150} scale={30} size={4} speed={0.5} color="#ffffff" />
      <Cloud 
        opacity={0.03 + scrollProgress * 0.05} 
        speed={0.1} 
        width={100} 
        depth={20} 
        color={scrollProgress > 0.5 ? "#1e1b4b" : "#2e1065"} 
        position={[0, 0, -30]} 
      />
    </group>
  );
}

export function HeroOrbCanvas() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const progress = scrollY / (docHeight - winHeight);
      setScrollProgress(progress);
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#020208]">
      {/* High-Spec Cinematic Backdrop */}
      <div 
        className="absolute inset-0 z-0 opacity-40 transition-transform duration-1000 ease-out"
        style={{ transform: `scale(${1 + scrollProgress * 0.2}) rotate(${scrollProgress * 5}deg)` }}
      >
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=2048')] bg-cover bg-center mix-blend-screen contrast-125 brightness-50" />
      </div>

      <Canvas
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          exposure: 1.6
        }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 30]} fov={35} />
          <group 
            rotation={[
              THREE.MathUtils.lerp(0, -mouse.y * 0.15, 0.05),
              THREE.MathUtils.lerp(0, mouse.x * 0.15, 0.05),
              0
            ]}
          >
            <MorphingParticles count={10000} scrollProgress={scrollProgress} />
            <Atmosphere scrollProgress={scrollProgress} />
          </group>
          <Environment preset="night" />
        </Suspense>
      </Canvas>
      
      {/* Dynamic Overlays that react to scroll transitions */}
      <div 
        className="absolute inset-0 z-10 transition-opacity duration-700"
        style={{ 
          background: `radial-gradient(circle at center, transparent 30%, rgba(5,5,15,${0.4 + scrollProgress * 0.4}) 100%)` 
        }} 
      />
    </div>
  );
}
