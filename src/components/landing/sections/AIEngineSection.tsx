import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Brain, Cpu, Database, Search, Zap } from "lucide-react";

const DNA_STEPS = [
  { id: 1, title: "Análisis de Producto", icon: Search, desc: "Descomponemos el ADN del producto." },
  { id: 2, title: "Audiencias", icon: Database, desc: "Identificamos nichos específicos." },
  { id: 3, title: "Ángulos de Venta", icon: Zap, desc: "Definimos ganchos emocionales." },
  { id: 4, title: "Extracción de Intereses", icon: Cpu, desc: "Keywords optimizadas para CAPI." },
  { id: 5, title: "Research Completo", icon: Brain, desc: "12 pasos de inteligencia pura." },
];

export function AIEngineSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Animaciones de fondo
  const gridOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 0.1, 0.1, 0]);
  const brainScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.2, 0.8]);

  return (
    <div ref={containerRef} className="relative h-[300vh] bg-kreoon-bg-primary">
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        {/* Tech Grid Background */}
        <motion.div 
          style={{ opacity: gridOpacity }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="h-full w-full bg-[linear-gradient(rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.1)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-kreoon-bg-primary via-transparent to-kreoon-bg-primary" />
        </motion.div>

        <div className="container relative z-10 px-4">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Visual AI Core */}
            <div className="relative flex justify-center">
              <motion.div 
                style={{ scale: brainScale }}
                className="relative h-[300px] w-[300px] md:h-[450px] md:w-[450px]"
              >
                {/* AI Core Glow */}
                <div className="absolute inset-0 rounded-full bg-kreoon-purple-500/20 blur-[100px]" />
                
                {/* Interactive Layers */}
                {DNA_STEPS.map((step, index) => {
                  // Cada paso aparece en un punto diferente del scroll
                  const start = index * 0.15;
                  const end = start + 0.2;
                  // eslint-disable-next-line react-hooks/rules-of-hooks
                  const layerOpacity = useTransform(scrollYProgress, [start, start + 0.1, end - 0.1, end], [0, 1, 1, 0]);
                  // eslint-disable-next-line react-hooks/rules-of-hooks
                  const layerRotate = useTransform(scrollYProgress, [start, end], [index * 30, index * 30 + 90]);

                  return (
                    <motion.div
                      key={step.id}
                      style={{ opacity: layerOpacity, rotate: layerRotate }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="relative h-full w-full rounded-full border border-kreoon-purple-500/30 p-12">
                        <step.icon className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-kreoon-purple-400" />
                      </div>
                    </motion.div>
                  );
                })}

                {/* Central Brain Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="flex h-32 w-32 items-center justify-center rounded-full bg-kreoon-purple-500/10 border border-kreoon-purple-500/30 backdrop-blur-md shadow-kreoon-glow-sm"
                  >
                    <Brain className="h-16 w-16 text-kreoon-purple-400" />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Narrative Content */}
            <div className="flex flex-col justify-center">
              <div className="space-y-12">
                {DNA_STEPS.map((step, index) => {
                  const start = index * 0.15;
                  const end = start + 0.2;
                  // eslint-disable-next-line react-hooks/rules-of-hooks
                  const textY = useTransform(scrollYProgress, [start, start + 0.1, end - 0.1, end], [50, 0, 0, -50]);
                  // eslint-disable-next-line react-hooks/rules-of-hooks
                  const textOpacity = useTransform(scrollYProgress, [start, start + 0.1, end - 0.1, end], [0, 1, 1, 0]);

                  return (
                    <motion.div
                      key={step.id}
                      style={{ y: textY, opacity: textOpacity }}
                      className="absolute max-w-lg"
                    >
                      <div className="flex items-center gap-4 text-kreoon-purple-400">
                        <span className="text-sm font-mono tracking-widest">DNA_MODULE_0{step.id}</span>
                        <div className="h-[1px] w-12 bg-kreoon-purple-500/30" />
                      </div>
                      <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">{step.title}</h2>
                      <p className="mt-6 text-xl text-kreoon-text-secondary">{step.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
