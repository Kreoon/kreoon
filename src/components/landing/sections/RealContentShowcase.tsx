import React from "react";
import { motion } from "framer-motion";
import { useApprovedContent } from "@/hooks/useApprovedContent";
import { Play, CheckCircle2 } from "lucide-react";

function SkeletonCard() {
  return (
    <div className="relative h-[450px] w-[300px] flex-shrink-0 overflow-hidden rounded-sm border border-white/10 bg-kreoon-bg-card animate-pulse">
      <div className="h-full w-full bg-gradient-to-b from-white/5 to-white/[0.02]" />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full bg-white/10" />
          <div className="h-3 w-24 rounded bg-white/10" />
        </div>
        <div className="h-5 w-40 rounded bg-white/10 mb-2" />
        <div className="h-4 w-28 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function RealContentShowcase() {
  const { data: content, isLoading } = useApprovedContent(12);

  if (!isLoading && (!content || content.length === 0)) return null;

  // Duplicar contenido para el efecto de scroll infinito (solo si hay contenido)
  const marqueeItems = content && content.length > 0 ? [...content, ...content] : [];

  return (
    <section className="relative bg-kreoon-bg-primary py-24 overflow-hidden">
      <div className="container relative z-10 px-4 mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-kreoon-purple-400 mb-4">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-widest">Contenido Real Aprobado</span>
            </div>
            <h2 className="text-3xl font-bold text-white md:text-5xl">Lo que nuestras marcas están lanzando</h2>
          </div>
          <p className="text-kreoon-text-secondary max-w-md">
            Cada pieza que ves ha sido creada por talento de Kreoon y aprobada para su distribución oficial.
          </p>
        </div>
      </div>

      {/* Infinite Marquee */}
      <div className="relative flex overflow-hidden py-10">
        {isLoading ? (
          <div className="flex gap-8 px-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
        <motion.div
          animate={{ x: [0, -100 * (content?.length || 1) + "%"] }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex gap-8 whitespace-nowrap will-change-transform"
        >
          {marqueeItems.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="group relative h-[450px] w-[300px] flex-shrink-0 overflow-hidden rounded-sm border border-white/10 bg-kreoon-bg-card transition-all hover:border-kreoon-purple-500/50 shadow-2xl"
            >
              {/* Thumbnail */}
              <img
                src={item.thumbnail_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=300&h=450&auto=format&fit=crop"}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-kreoon-bg-primary via-transparent to-transparent opacity-80" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-kreoon-purple-500 flex items-center justify-center">
                    <Play className="h-3 w-3 text-white fill-white" />
                  </div>
                  <span className="text-[10px] font-bold text-kreoon-purple-300 uppercase tracking-tighter">Approved by Brand</span>
                </div>
                <h3 className="text-lg font-bold text-white truncate">{item.title}</h3>
                <p className="text-sm text-kreoon-text-muted mt-1">Por {item.creator_name}</p>
              </div>

              {/* Hover Glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute inset-0 bg-kreoon-purple-500/10 mix-blend-overlay" />
              </div>
            </div>
          ))}
        </motion.div>
        )}
      </div>

      {/* Decorative Lines */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </section>
  );
}
