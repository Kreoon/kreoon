import React, { useRef, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Users, Star, TrendingUp, Heart, Loader2, Video } from "lucide-react";
import { useMarketplaceCreators } from "@/hooks/useMarketplaceCreators";
import { usePublicStats } from "@/hooks/usePublicShowcase";

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k+`;
  return String(num);
}

export function MarketplaceUniverse() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { allCreators, isLoading } = useMarketplaceCreators();
  const { data: stats } = usePublicStats();
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const rotate = useTransform(scrollYProgress, [0, 1], [0, 15]);

  // Filtrar solo creadores con portafolio real (miniaturas)
  const displayCreators = useMemo(() => {
    return allCreators
      .filter(c => c.portfolio_media && c.portfolio_media.length > 0)
      .slice(0, 8) // Tomar los mejores 8 para la galaxia
      .map((c, i) => ({
        ...c,
        delay: i * 0.1,
        // Posiciones pseudo-aleatorias pero fijas para la galaxia
        x: `${15 + (i * 10) % 70}%`,
        y: `${20 + (i * 15) % 60}%`
      }));
  }, [allCreators]);

  if (isLoading && allCreators.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-kreoon-purple-500" />
      </div>
    );
  }

  return (
    <section ref={containerRef} className="relative min-h-screen bg-kreoon-bg-primary py-32 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-kreoon-purple-500/10 blur-[150px]" />
      </div>

      <div className="container relative z-10 px-4">
        <div className="text-center mb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-kreoon-purple-500/30 bg-kreoon-purple-500/5 text-kreoon-purple-400 text-sm font-medium mb-6"
          >
            <Users className="h-4 w-4" />
            Talento Real: {allCreators.length} Creadores Activos
          </motion.div>
          <h2 className="text-4xl font-bold text-white md:text-6xl">El Universo Marketplace</h2>
          <p className="mt-6 text-xl text-kreoon-text-secondary max-w-2xl mx-auto">
            Conectamos marcas con el talento adecuado. Un ecosistema basado en reputación, 
            calidad y resultados reales de nuestra comunidad.
          </p>
        </div>

        {/* Connections Galaxy Visualization */}
        <motion.div
          style={{ rotate }}
          className="relative h-[650px] w-full max-w-5xl mx-auto border border-white/5 rounded-full bg-white/[0.01] will-change-transform"
        >
          {/* Central Logo / Core */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="h-24 w-24 rounded-full bg-kreoon-purple-500 shadow-kreoon-glow flex items-center justify-center border-4 border-kreoon-bg-primary"
            >
              <Users className="h-10 w-10 text-white" />
            </motion.div>
          </div>

          {/* Floating Real Creators */}
          {displayCreators.map((creator, i) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: creator.delay }}
              style={{ left: creator.x, top: creator.y }}
              className="absolute z-30"
            >
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
                className="group relative flex flex-col items-center"
              >
                {/* Profile Card with Thumbnail Hint - Enhanced Glassmorphism */}
                <div className="px-4 py-3 rounded-sm border border-white/10 bg-kreoon-bg-card/60 backdrop-blur-xl shadow-2xl group-hover:border-kreoon-purple-500/50 group-hover:shadow-kreoon-glow-sm transition-all overflow-hidden">
                  {/* Thumbnail Preview on Hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity">
                    <img 
                      src={creator.portfolio_media[0]?.thumbnail_url || creator.portfolio_media[0]?.url} 
                      alt="" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  
                  <div className="relative flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full border border-kreoon-purple-500/30 overflow-hidden bg-kreoon-bg-primary">
                      {creator.avatar_url ? (
                        <img src={creator.avatar_url} alt={creator.display_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-kreoon-purple-600 to-purple-900">
                          {creator.display_name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white whitespace-nowrap">{creator.display_name}</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] text-kreoon-text-muted">
                          {creator.rating_avg.toFixed(1)} • {creator.categories[0] || 'Creator'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connection Line to Center */}
                <div className="absolute top-1/2 left-1/2 h-[120px] w-[1px] bg-gradient-to-t from-kreoon-purple-500/40 to-transparent origin-top -translate-x-1/2 group-hover:h-[180px] transition-all" />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Grid - Real Data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-40">
          {[
            { label: "Creadores", value: stats ? formatNumber(stats.creators_count) : "...", icon: Users },
            { label: "Marcas", value: stats ? formatNumber(stats.brands_count) : "...", icon: Heart },
            { label: "Campañas", value: stats ? formatNumber(stats.campaigns_completed) : "...", icon: TrendingUp },
            { label: "Videos", value: stats ? formatNumber(stats.videos_approved) : "...", icon: Video },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-sm bg-kreoon-purple-500/10 flex items-center justify-center border border-kreoon-purple-500/20">
                  <stat.icon className="h-6 w-6 text-kreoon-purple-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-kreoon-text-muted uppercase tracking-wider mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
