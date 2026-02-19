import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  MoreHorizontal,
  Eye,
  AlertTriangle,
  Video,
  Camera,
  Mic,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EstadoContenido } from '@/lib/studio-system';
import { ContentStatusBadge } from './ContentStatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface Asignado {
  id: string;
  nombre: string;
  avatar?: string;
  rol: string;
}

interface Cliente {
  nombre: string;
  logo?: string;
}

interface Produccion {
  id: string;
  titulo: string;
  cliente: Cliente;
  estado: EstadoContenido;
  tipo: string;
  fechaLimite?: Date;
  progreso?: number;
  asignados?: Asignado[];
  piezasTotal?: number;
  piezasCompletadas?: number;
  creditos?: number;
}

interface ProductionCardProps {
  produccion: Produccion;
  variant?: 'grid' | 'list' | 'compact';
  showActions?: boolean;
  onClick?: () => void;
  onAction?: (action: string) => void;
  className?: string;
}

const tipoIcons: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  UGC: Video,
  Live: Mic,
  Foto: Camera,
  Video: Film,
};

const getDeadlineInfo = (fecha?: Date) => {
  if (!fecha) return null;

  const dias = differenceInDays(fecha, new Date());
  const pasada = isPast(fecha) && !isToday(fecha);
  const hoy = isToday(fecha);

  let urgencia: 'normal' | 'warning' | 'danger' | 'critical' = 'normal';
  if (pasada) urgencia = 'critical';
  else if (hoy) urgencia = 'critical';
  else if (dias <= 1) urgencia = 'danger';
  else if (dias <= 3) urgencia = 'warning';

  const colors = {
    normal: 'text-zinc-400',
    warning: 'text-amber-400',
    danger: 'text-orange-400',
    critical: 'text-red-400',
  };

  return { dias, pasada, hoy, urgencia, color: colors[urgencia] };
};

export function ProductionCard({
  produccion,
  variant = 'grid',
  showActions = true,
  onClick,
  onAction,
  className,
}: ProductionCardProps) {
  const TipoIcon = tipoIcons[produccion.tipo] || Video;
  const deadlineInfo = getDeadlineInfo(produccion.fechaLimite ? new Date(produccion.fechaLimite) : undefined);

  const piezasProgreso = useMemo(() => {
    if (produccion.piezasTotal && produccion.piezasTotal > 0) {
      return ((produccion.piezasCompletadas || 0) / produccion.piezasTotal) * 100;
    }
    return produccion.progreso || 0;
  }, [produccion]);

  // Compact variant - single line
  if (variant === 'compact') {
    return (
      <motion.div
        className={cn(
          'flex items-center gap-3 p-2 rounded-lg',
          'bg-zinc-900/40 hover:bg-zinc-800/40',
          'border border-zinc-800/50 hover:border-zinc-700/50',
          'cursor-pointer transition-all',
          className
        )}
        onClick={onClick}
        whileHover={{ x: 2 }}
      >
        <span className="text-sm text-white font-medium truncate flex-1">
          {produccion.titulo}
        </span>
        <ContentStatusBadge status={produccion.estado} size="sm" showTooltip={false} />
        {deadlineInfo && (
          <span className={cn('text-xs', deadlineInfo.color)}>
            {deadlineInfo.pasada ? 'Vencido' : format(new Date(produccion.fechaLimite!), 'd MMM', { locale: es })}
          </span>
        )}
      </motion.div>
    );
  }

  // List variant - horizontal row
  if (variant === 'list') {
    return (
      <motion.div
        className={cn(
          'flex items-center gap-4 p-3 rounded-xl',
          'bg-zinc-900/40 hover:bg-zinc-800/40',
          'border border-zinc-800/50 hover:border-zinc-700/50',
          'cursor-pointer transition-all',
          className
        )}
        onClick={onClick}
        whileHover={{ y: -1 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {/* Type icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <TipoIcon className="w-5 h-5 text-purple-400" />
        </div>

        {/* Title + Client */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{produccion.titulo}</h4>
          <p className="text-xs text-zinc-500 truncate">{produccion.cliente.nombre}</p>
        </div>

        {/* Status */}
        <ContentStatusBadge status={produccion.estado} size="sm" />

        {/* Progress */}
        {produccion.piezasTotal && (
          <div className="hidden sm:flex flex-col items-center w-20">
            <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${piezasProgreso}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500 mt-1">
              {produccion.piezasCompletadas}/{produccion.piezasTotal}
            </span>
          </div>
        )}

        {/* Deadline */}
        {deadlineInfo && (
          <div className={cn('flex items-center gap-1', deadlineInfo.color)}>
            {deadlineInfo.urgencia === 'critical' && (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span className="text-xs whitespace-nowrap">
              {deadlineInfo.pasada
                ? 'Vencido'
                : deadlineInfo.hoy
                ? 'Hoy'
                : format(new Date(produccion.fechaLimite!), 'd MMM', { locale: es })}
            </span>
          </div>
        )}

        {/* Assignees */}
        {produccion.asignados && produccion.asignados.length > 0 && (
          <div className="hidden md:flex -space-x-2">
            {produccion.asignados.slice(0, 3).map((asignado) => (
              <Avatar key={asignado.id} className="w-7 h-7 border-2 border-zinc-900">
                <AvatarImage src={asignado.avatar} />
                <AvatarFallback className="bg-purple-500/20 text-purple-400 text-xs">
                  {asignado.nombre.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {produccion.asignados.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center">
                <span className="text-xs text-foreground/80">+{produccion.asignados.length - 3}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
              <DropdownMenuItem onClick={() => onAction?.('ver')}>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('urgente')}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Marcar urgente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.div>
    );
  }

  // Grid variant - vertical card
  return (
    <motion.div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-gradient-to-b from-zinc-900/80 to-zinc-900/40',
        'border border-zinc-800/50 hover:border-purple-500/30',
        'cursor-pointer transition-all group',
        className
      )}
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.01 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      {/* Thumbnail placeholder */}
      <div className="relative h-32 bg-gradient-to-br from-purple-900/30 to-zinc-900">
        {/* Type badge */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm flex items-center gap-1.5">
          <TipoIcon className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs text-white font-medium">{produccion.tipo}</span>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <ContentStatusBadge status={produccion.estado} size="sm" animated />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Client */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="w-5 h-5">
            <AvatarImage src={produccion.cliente.logo} />
            <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
              {produccion.cliente.nombre.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-zinc-400 truncate">
            {produccion.cliente.nombre}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-semibold text-white text-lg line-clamp-2 mb-3">
          {produccion.titulo}
        </h4>

        {/* Progress */}
        {produccion.piezasTotal && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>Progreso</span>
              <span>{produccion.piezasCompletadas}/{produccion.piezasTotal} piezas</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${piezasProgreso}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Deadline */}
          {deadlineInfo && (
            <motion.div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg',
                deadlineInfo.urgencia === 'critical'
                  ? 'bg-red-500/10'
                  : deadlineInfo.urgencia === 'danger'
                  ? 'bg-orange-500/10'
                  : deadlineInfo.urgencia === 'warning'
                  ? 'bg-amber-500/10'
                  : 'bg-zinc-800/50'
              )}
              animate={deadlineInfo.urgencia === 'critical' ? {
                scale: [1, 1.02, 1],
              } : undefined}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {deadlineInfo.urgencia === 'critical' && (
                <AlertTriangle className={cn('w-3.5 h-3.5', deadlineInfo.color)} />
              )}
              <Calendar className={cn('w-3.5 h-3.5', deadlineInfo.color)} />
              <span className={cn('text-xs font-medium', deadlineInfo.color)}>
                {deadlineInfo.pasada
                  ? 'Vencido'
                  : deadlineInfo.hoy
                  ? 'Hoy'
                  : format(new Date(produccion.fechaLimite!), 'd MMM', { locale: es })}
              </span>
            </motion.div>
          )}

          {/* Assignees */}
          {produccion.asignados && produccion.asignados.length > 0 && (
            <div className="flex -space-x-2">
              {produccion.asignados.slice(0, 3).map((asignado) => (
                <Avatar key={asignado.id} className="w-7 h-7 border-2 border-zinc-900">
                  <AvatarImage src={asignado.avatar} />
                  <AvatarFallback className="bg-purple-500/20 text-purple-400 text-xs">
                    {asignado.nombre.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {produccion.asignados.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center">
                  <span className="text-xs text-foreground/80">+{produccion.asignados.length - 3}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hover actions overlay */}
      {showActions && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <motion.button
            className="px-4 py-2 rounded-xl bg-purple-500 text-white font-medium text-sm hover:bg-purple-600 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onAction?.('ver');
            }}
          >
            Ver detalles
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
