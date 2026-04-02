import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Users, AlertTriangle, TrendingUp, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FomoCardProps {
  show?: boolean;
}

const URGENCY_POINTS = [
  {
    icon: Users,
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    text: 'Ya hay marcas buscando talento en la plataforma',
    highlight: 'No dejes que otros se lleven las oportunidades'
  },
  {
    icon: CalendarClock,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    text: 'El 30 de abril las puertas se abren a todos',
    highlight: 'Miles de creadores competirán por los mismos clientes'
  },
  {
    icon: TrendingUp,
    iconColor: 'text-green-400',
    bgColor: 'bg-green-500/10',
    text: 'Los fundadores tendrán posición privilegiada',
    highlight: 'Después será mucho más difícil posicionarte'
  }
];

export const FomoCard = memo(function FomoCard({ show = true }: FomoCardProps) {
  const [activePoint, setActivePoint] = useState(0);

  // Rotar puntos de urgencia
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePoint(prev => (prev + 1) % URGENCY_POINTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      {/* Glow effect */}
      <motion.div
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.02, 1]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -inset-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-sm blur-lg opacity-30"
      />

      <div className={cn(
        'relative rounded-sm overflow-hidden',
        'bg-gradient-to-br from-red-950/80 via-orange-950/60 to-red-950/80',
        'border-2 border-red-500/50'
      )}>
        {/* Animated background */}
        <motion.div
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,100,100,0.1) 10px, rgba(255,100,100,0.1) 20px)',
            backgroundSize: '200% 200%'
          }}
        />

        <div className="relative p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="shrink-0"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/30 border-2 border-red-500/50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
            </motion.div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-base sm:text-lg">
                ¡No te quedes fuera!
              </h3>
              <p className="text-xs text-red-300/70">
                Acceso anticipado limitado
              </p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">URGENTE</span>
            </div>
          </div>

          {/* Puntos de urgencia - carousel */}
          <div className="space-y-2 mb-4">
            {URGENCY_POINTS.map((point, index) => {
              const Icon = point.icon;
              const isActive = index === activePoint;
              return (
                <motion.div
                  key={index}
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0.5,
                    scale: isActive ? 1 : 0.98,
                    x: isActive ? 0 : -5
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'p-3 rounded-sm border transition-all',
                    isActive
                      ? 'bg-white/5 border-white/20'
                      : 'bg-transparent border-transparent'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-sm flex items-center justify-center shrink-0',
                      point.bgColor
                    )}>
                      <Icon className={cn('w-4 h-4', point.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80">{point.text}</p>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs text-red-400 font-medium mt-1"
                        >
                          → {point.highlight}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Indicador de progreso del carousel */}
          <div className="flex justify-center gap-1.5 mb-3">
            {URGENCY_POINTS.map((_, index) => (
              <motion.div
                key={index}
                animate={{
                  width: index === activePoint ? 20 : 6,
                  backgroundColor: index === activePoint ? 'rgb(251 146 60)' : 'rgba(255,255,255,0.2)'
                }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>

          {/* Live activity */}
          <div className="flex items-center justify-center gap-2 p-2 rounded-sm bg-black/30 border border-red-500/20">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-green-500"
            />
            <span className="text-xs text-white/60">
              <span className="text-green-400 font-medium">12 personas</span> se unieron en la última hora
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
