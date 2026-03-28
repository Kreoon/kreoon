import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Star,
  Zap,
  Clock,
  Trophy,
  Award,
  Flame,
  Calendar,
  Users,
  TrendingUp,
  Crown,
  Medal,
  Ticket,
  ArrowUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Insignia } from '@/lib/studio-system';
import { NIVELES, getNivelActual } from '@/lib/studio-system';
import { LevelBadge } from './LevelBadge';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Sparkles,
  Star,
  Zap,
  Clock,
  Trophy,
  Award,
  Flame,
  Calendar,
  Users,
  TrendingUp,
  Crown,
  Medal,
};

type ToastType = 'insignia' | 'nivel' | 'creditos';

interface ToastData {
  insignia?: Insignia;
  nivelAnterior?: number;
  nivelNuevo?: number;
  creditos?: number;
  mensaje?: string;
}

interface AchievementToastProps {
  id: string;
  type: ToastType;
  data: ToastData;
  onClose: (id: string) => void;
  duration?: number;
}

export function AchievementToast({
  id,
  type,
  data,
  onClose,
  duration = 5000,
}: AchievementToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onClose(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, id, onClose]);

  const getBorderColor = () => {
    switch (type) {
      case 'insignia':
        return data.insignia?.color || '#7c3aed';
      case 'nivel':
        return '#fbbf24';
      case 'creditos':
        return '#10b981';
      default:
        return '#7c3aed';
    }
  };

  const borderColor = getBorderColor();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative w-full max-w-sm"
    >
      <div
        className={cn(
          'relative rounded-sm overflow-hidden',
          'bg-zinc-900/95 backdrop-blur-xl',
          'shadow-2xl'
        )}
        style={{
          border: `1px solid ${borderColor}40`,
          boxShadow: `0 0 30px ${borderColor}20, 0 20px 40px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Close button */}
        <button
          onClick={() => onClose(id)}
          className="absolute top-3 right-3 z-10 p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Content */}
        <div className="p-4">
          {type === 'insignia' && data.insignia && (
            <InsigniaContent insignia={data.insignia} />
          )}
          {type === 'nivel' && data.nivelAnterior !== undefined && data.nivelNuevo !== undefined && (
            <NivelContent nivelAnterior={data.nivelAnterior} nivelNuevo={data.nivelNuevo} />
          )}
          {type === 'creditos' && data.creditos !== undefined && (
            <CreditosContent creditos={data.creditos} mensaje={data.mensaje} />
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-800">
          <motion.div
            className="h-full"
            style={{ background: borderColor, width: `${progress}%` }}
            transition={{ duration: 0.05 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function InsigniaContent({ insignia }: { insignia: Insignia }) {
  const Icon = iconMap[insignia.icono] || Award;

  return (
    <div className="flex items-center gap-4">
      {/* Icon */}
      <motion.div
        className="relative flex-shrink-0 w-14 h-14 rounded-sm flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${insignia.color}30 0%, ${insignia.color}10 100%)`,
          boxShadow: `0 0 30px ${insignia.color}40`,
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Icon size={28} style={{ color: insignia.color }} />

        {/* Particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ background: insignia.color }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              x: [0, (Math.random() - 0.5) * 60],
              y: [0, (Math.random() - 0.5) * 60],
            }}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
          />
        ))}
      </motion.div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <motion.p
          className="text-xs font-medium text-amber-400 mb-1"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          ¡Nueva Insignia!
        </motion.p>
        <motion.h4
          className="font-bold text-white text-lg truncate"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {insignia.nombre}
        </motion.h4>
        <motion.p
          className="text-sm text-purple-400"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          +{insignia.creditos} CR
        </motion.p>
      </div>
    </div>
  );
}

function NivelContent({ nivelAnterior, nivelNuevo }: { nivelAnterior: number; nivelNuevo: number }) {
  const nivelInfo = NIVELES.find(n => n.nivel === nivelNuevo) || NIVELES[0];

  return (
    <div className="flex flex-col items-center text-center gap-3 py-2">
      <motion.p
        className="text-xs font-medium text-amber-400"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        ¡Subiste de Nivel!
      </motion.p>

      {/* Level transition */}
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0.3, scale: 0.8 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <LevelBadge nivel={nivelAnterior} size="md" showTooltip={false} animated={false} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        >
          <ArrowUp className="w-5 h-5 text-amber-400" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
        >
          <LevelBadge nivel={nivelNuevo} size="lg" showTooltip={false} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <p className="text-white font-semibold">
          Ahora eres <span style={{ color: nivelInfo.color }}>{nivelInfo.nombre}</span>
        </p>
        <p className="text-xs text-zinc-500">{nivelInfo.descripcion}</p>
      </motion.div>
    </div>
  );
}

function CreditosContent({ creditos, mensaje }: { creditos: number; mensaje?: string }) {
  return (
    <div className="flex items-center gap-4">
      {/* Icon */}
      <motion.div
        className="relative flex-shrink-0 w-14 h-14 rounded-sm flex items-center justify-center bg-gradient-to-br from-emerald-500/30 to-emerald-600/10"
        style={{ boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Ticket size={28} className="text-emerald-400" />
      </motion.div>

      {/* Text */}
      <div className="flex-1">
        <motion.h4
          className="font-bold text-white text-2xl"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <span className="text-emerald-400">+{creditos.toLocaleString()}</span> CR
        </motion.h4>
        {mensaje && (
          <motion.p
            className="text-sm text-zinc-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {mensaje}
          </motion.p>
        )}
      </div>
    </div>
  );
}

// ============================================
// TOAST CONTEXT AND HOOK
// ============================================

interface ToastItem {
  id: string;
  type: ToastType;
  data: ToastData;
}

interface AchievementToastContextType {
  showAchievement: (config: { type: ToastType; data: ToastData }) => void;
}

const AchievementToastContext = createContext<AchievementToastContextType | null>(null);

export function AchievementToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showAchievement = useCallback(({ type, data }: { type: ToastType; data: ToastData }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, type, data }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AchievementToastContext.Provider value={{ showAchievement }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <AchievementToast
                id={toast.id}
                type={toast.type}
                data={toast.data}
                onClose={removeToast}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </AchievementToastContext.Provider>
  );
}

export function useAchievementToast() {
  const context = useContext(AchievementToastContext);
  if (!context) {
    throw new Error('useAchievementToast must be used within AchievementToastProvider');
  }
  return context;
}
