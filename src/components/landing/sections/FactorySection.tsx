import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Layers, MousePointer2, Share2, Sparkles } from "lucide-react";

const SPHERES = [
  { id: "engage", name: "Engage", color: "from-blue-500 to-cyan-400", icon: Sparkles },
  { id: "solution", name: "Solution", color: "from-kreoon-purple-500 to-purple-400", icon: Layers },
  { id: "remarketing", name: "Remarketing", color: "from-amber-500 to-orange-400", icon: MousePointer2 },
  { id: "fidelize", name: "Fidelize", color: "from-emerald-500 to-green-400", icon: Share2 },
];

export function FactorySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Animación de la "tarjeta" que viaja
  const cardX = useTransform(scrollYProgress, [0.2, 0.4, 0.6, 0.8], ["-150%", "-50%", "50%", "150%"]);
  const cardY = useTransform(scrollYProgress, [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], [0, -50, 0, -50, 0, -50, 0]);
  const cardOpacity = useTransform(scrollYProgress, [0.1, 0.2, 0.8, 0.9], [0, 1, 1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-[150vh] bg-kreoon-bg-primary py-32 overflow-hidden">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-24"
        >
          <h2 className="text-4xl font-bold text-white md:text-6xl">La Fábrica de Contenido</h2>
          <p className="mt-6 text-xl text-kreoon-text-secondary max-w-2xl mx-auto">
            Nuestro sistema unificado organiza cada pieza en el ecosistema de ventas. 
            Del brief a la conversión sin fricción.
          </p>
        </motion.div>

        {/* Sphere System Visualization */}
        <div className="relative mt-20 flex justify-between items-center max-w-5xl mx-auto min-h-[400px]">
          {/* Connection Line Background */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-kreoon-purple-500/20 to-transparent -translate-y-1/2" />

          {/* Traveling Content Card */}
          <motion.div
            style={{ x: cardX, y: cardY, opacity: cardOpacity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
          >
            <div className="h-40 w-28 rounded-sm border border-white/20 bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col p-3">
              <div className="h-1.5 w-10 rounded-full bg-white/40 mb-2" />
              <div className="h-20 w-full rounded-sm bg-white/5 mb-2" />
              <div className="space-y-1">
                <div className="h-1 w-full rounded-full bg-white/20" />
                <div className="h-1 w-3/4 rounded-full bg-white/10" />
              </div>
              <div className="mt-auto flex justify-end">
                <div className="h-4 w-4 rounded-full bg-kreoon-purple-500/40" />
              </div>
            </div>
          </motion.div>

          {/* Spheres */}
          {SPHERES.map((sphere, index) => (
            <div key={sphere.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${sphere.color} p-[1px] shadow-lg transition-shadow duration-300 hover:shadow-xl`}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-kreoon-bg-primary/90 backdrop-blur-sm">
                  <sphere.icon className="h-8 w-8 text-white" />
                </div>
                {/* Glow effect */}
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${sphere.color} opacity-20 blur-xl`} />
              </motion.div>
              <span className="mt-4 font-bold text-kreoon-text-secondary uppercase tracking-widest text-xs">{sphere.name}</span>
            </div>
          ))}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-40">
          {[
            { title: "Gestión Kanban", desc: "Control total del flujo creativo." },
            { title: "Aprobaciones Pro", client: "Feedback directo y centralizado." },
            { title: "Entrega Bunny CDN", desc: "Velocidad máxima de carga." }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="group p-8 rounded-sm border border-kreoon-border bg-kreoon-bg-card/40 backdrop-blur-md hover:bg-kreoon-purple-500/5 hover:border-kreoon-purple-500/30 transition-all duration-300"
            >
              <h3 className="text-xl font-bold text-white group-hover:text-kreoon-purple-400 transition-colors">{item.title}</h3>
              <p className="mt-4 text-kreoon-text-secondary">{item.desc || item.client}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
