import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Upload,
  UserPlus,
  TrendingUp,
  Award,
  MessageCircle,
  Plus,
  DollarSign,
  Film,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type ActividadTipo =
  | 'pieza_aprobada'
  | 'pieza_entregada'
  | 'nuevo_miembro'
  | 'nivel_subido'
  | 'insignia_ganada'
  | 'comentario'
  | 'produccion_creada'
  | 'pago_realizado';

interface Usuario {
  id: string;
  nombre: string;
  avatar?: string;
}

interface Actividad {
  id: string;
  tipo: ActividadTipo;
  usuario: Usuario;
  descripcion: string;
  metadata?: {
    produccion?: string;
    pieza?: string;
    nivel?: number;
    nombreNivel?: string;
    insignia?: string;
    nombreInsignia?: string;
    monto?: number;
    rol?: string;
  };
  fecha: Date;
}

interface RecentActivityFeedProps {
  actividades: Actividad[];
  maxItems?: number;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
  filtrarPorTipo?: ActividadTipo[];
  className?: string;
}

const actividadConfig: Record<ActividadTipo, {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bgColor: string;
}> = {
  pieza_aprobada: {
    icon: CheckCircle,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
  pieza_entregada: {
    icon: Upload,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  nuevo_miembro: {
    icon: UserPlus,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
  nivel_subido: {
    icon: TrendingUp,
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.1)',
  },
  insignia_ganada: {
    icon: Award,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  comentario: {
    icon: MessageCircle,
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
  },
  produccion_creada: {
    icon: Plus,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
  pago_realizado: {
    icon: DollarSign,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
};

function formatActividadTexto(actividad: Actividad): React.ReactNode {
  const { tipo, usuario, metadata } = actividad;

  switch (tipo) {
    case 'pieza_aprobada':
      return (
        <>
          <span className="font-medium text-white">{usuario.nombre}</span>
          {' aprobó el corte final'}
          {metadata?.pieza && (
            <>
              {' de '}
              <span className="text-purple-400">{metadata.pieza}</span>
            </>
          )}
          {metadata?.produccion && (
            <>
              {' en '}
              <span className="text-foreground/80">{metadata.produccion}</span>
            </>
          )}
        </>
      );

    case 'pieza_entregada':
      return (
        <>
          <span className="font-medium text-white">{usuario.nombre}</span>
          {' entregó una toma'}
          {metadata?.produccion && (
            <>
              {' para '}
              <span className="text-foreground/80">{metadata.produccion}</span>
            </>
          )}
        </>
      );

    case 'nuevo_miembro':
      return (
        <>
          <span className="font-medium text-white">{usuario.nombre}</span>
          {' se unió al estudio'}
          {metadata?.rol && (
            <>
              {' como '}
              <span className="text-purple-400 capitalize">{metadata.rol.replace('_', ' ')}</span>
            </>
          )}
        </>
      );

    case 'nivel_subido':
      return (
        <>
          <span className="font-medium text-white">{usuario.nombre}</span>
          {' subió a '}
          <span className="text-amber-400">Nivel {metadata?.nivel}</span>
          {metadata?.nombreNivel && (
            <>
              {': '}
              <span className="text-amber-400">{metadata.nombreNivel}</span>
            </>
          )}
        </>
      );

    case 'insignia_ganada':
      return (
        <>
          <span className="font-medium text-white">{usuario.nombre}</span>
          {' desbloqueó la insignia '}
          <span className="text-orange-400">{metadata?.nombreInsignia || metadata?.insignia}</span>
        </>
      );

    case 'comentario':
      return (
        <>
          <span className="font-medium text-white">{usuario.nombre}</span>
          {' comentó'}
          {metadata?.pieza && (
            <>
              {' en '}
              <span className="text-foreground/80">{metadata.pieza}</span>
            </>
          )}
        </>
      );

    case 'produccion_creada':
      return (
        <>
          <span className="font-medium text-white">{usuario.nombre}</span>
          {' creó la producción '}
          <span className="text-purple-400">{metadata?.produccion}</span>
        </>
      );

    case 'pago_realizado':
      return (
        <>
          <span className="font-medium text-white">{usuario.nombre}</span>
          {' recibió un pago de '}
          <span className="text-emerald-400">
            ${metadata?.monto?.toLocaleString() || '0'}
          </span>
        </>
      );

    default:
      return actividad.descripcion;
  }
}

export function RecentActivityFeed({
  actividades,
  maxItems = 10,
  showLoadMore = false,
  onLoadMore,
  filtrarPorTipo,
  className,
}: RecentActivityFeedProps) {
  // Filter activities
  const filteredActividades = filtrarPorTipo
    ? actividades.filter(a => filtrarPorTipo.includes(a.tipo))
    : actividades;

  const displayActividades = filteredActividades.slice(0, maxItems);

  if (displayActividades.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Film className="w-12 h-12 text-zinc-600 mb-4" />
        <h3 className="text-lg font-semibold text-zinc-400">El set está tranquilo</h3>
        <p className="text-sm text-zinc-500">No hay actividad reciente</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-400" />
        <h3 className="font-bold text-white text-lg">Detrás de Cámaras</h3>
      </div>

      {/* Activity list */}
      <div className="flex flex-col">
        <AnimatePresence mode="popLayout">
          {displayActividades.map((actividad, index) => {
            const config = actividadConfig[actividad.tipo];
            const Icon = config.icon;
            const isRecent = Date.now() - new Date(actividad.fecha).getTime() < 5 * 60 * 1000; // 5 minutes

            return (
              <motion.div
                key={actividad.id}
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-sm',
                  'border-b border-zinc-800/50 last:border-0',
                  'hover:bg-zinc-800/30 transition-colors',
                  isRecent && 'bg-purple-500/5'
                )}
              >
                {/* Avatar */}
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src={actividad.usuario.avatar} />
                  <AvatarFallback className="bg-purple-500/20 text-purple-400 text-xs">
                    {actividad.usuario.nombre.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {formatActividadTexto(actividad)}
                  </p>
                </div>

                {/* Timestamp + Icon */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-zinc-600">
                    {formatDistanceToNow(new Date(actividad.fecha), {
                      addSuffix: false,
                      locale: es,
                    })}
                  </span>
                  <div
                    className="w-7 h-7 rounded-sm flex items-center justify-center"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <Icon size={14} style={{ color: config.color }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Load more */}
      {showLoadMore && onLoadMore && filteredActividades.length > maxItems && (
        <motion.button
          className={cn(
            'w-full py-2.5 rounded-sm text-sm font-medium',
            'bg-zinc-800/50 hover:bg-zinc-700/50',
            'text-zinc-400 hover:text-white',
            'border border-zinc-700/50 hover:border-zinc-600',
            'transition-all'
          )}
          onClick={onLoadMore}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          Ver más actividad
        </motion.button>
      )}
    </div>
  );
}
