import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, Play, Brain, ArrowRight } from "lucide-react";

const COLUMNS = [
  { id: "brief", title: "Brief", icon: Clock, color: "text-blue-400" },
  { id: "strategy", title: "Estrategia IA", icon: Brain, color: "text-purple-400" },
  { id: "production", title: "Producción", icon: Play, color: "text-amber-400" },
  { id: "approved", title: "Aprobado", icon: CheckCircle2, color: "text-green-400" },
];

const INITIAL_TASKS = [
  { id: "t1", title: "Video Campaña Verano", brand: "Coca-Cola", status: "brief", creator: "Ana Tech" },
  { id: "t2", title: "Review Producto X", brand: "Nike", status: "strategy", creator: "Carlos Fit" },
  { id: "t3", title: "UGC Testimonial", brand: "L'Oréal", status: "production", creator: "Elena Creative" },
];

export function ProjectKanbanShowcase() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  // Simular movimiento automático de tareas
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prev) =>
        prev.map((task) => {
          const currentIndex = COLUMNS.findIndex((c) => c.id === task.status);
          const nextIndex = (currentIndex + 1) % COLUMNS.length;
          return { ...task, status: COLUMNS[nextIndex].id };
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative bg-kreoon-bg-primary py-32 overflow-hidden">
      <div className="container relative z-10 px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold text-white md:text-5xl mb-6">Gestión de Proyectos en Tiempo Real</h2>
          <p className="text-kreoon-text-secondary max-w-2xl mx-auto text-lg">
            Simulamos el flujo de trabajo de nuestra plataforma. Desde la idea hasta el contenido aprobado, 
            todo en una interfaz fluida y automatizada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <column.icon className={`h-5 w-5 ${column.color}`} />
                  <h3 className="font-bold text-white uppercase tracking-wider text-xs">{column.title}</h3>
                </div>
                <span className="text-[10px] text-kreoon-text-muted bg-white/5 px-2 py-0.5 rounded-full">
                  {tasks.filter((t) => t.status === column.id).length}
                </span>
              </div>

              <div className="min-h-[300px] rounded-sm border border-white/5 bg-white/[0.02] p-3 backdrop-blur-md shadow-inner">
                <AnimatePresence mode="popLayout">
                  {tasks
                    .filter((task) => task.status === column.id)
                    .map((task) => (
                      <motion.div
                        key={task.id}
                        layoutId={task.id}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="mb-3 p-4 rounded-sm border border-white/10 bg-kreoon-bg-card/60 backdrop-blur-md shadow-lg hover:shadow-xl hover:border-kreoon-purple-500/30 transition-all will-change-transform"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-[10px] font-bold text-kreoon-purple-400 uppercase tracking-tighter">{task.brand}</span>
                          <div className="h-1.5 w-1.5 rounded-full bg-kreoon-purple-500 animate-pulse" />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-4">{task.title}</h4>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-kreoon-purple-600 to-purple-900 border border-white/10 flex items-center justify-center text-[10px] text-white font-bold">
                              {task.creator[0]}
                            </div>
                            <span className="text-[10px] text-kreoon-text-muted">{task.creator}</span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-kreoon-text-muted/30" />
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative Blur Background */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-kreoon-purple-500/5 blur-[120px] pointer-events-none" />
    </section>
  );
}
