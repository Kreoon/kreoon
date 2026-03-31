import { motion } from 'framer-motion';
import {
  Pencil,
  FileText,
  FileCheck,
  Video,
  Film,
  Scissors,
  Clapperboard,
  Eye,
  RotateCcw,
  CheckCircle,
  Package,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ESTADOS_CONTENIDO, type EstadoContenido } from '@/lib/studio-system';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Pencil,
  FileText,
  FileCheck,
  Video,
  Film,
  Scissors,
  Clapperboard,
  Eye,
  RotateCcw,
  CheckCircle,
  Package,
  Megaphone,
};

interface ContentStatusBadgeProps {
  status: EstadoContenido;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 12,
    gap: 'gap-1',
    rounded: 'rounded-full',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-sm',
    icon: 14,
    gap: 'gap-1.5',
    rounded: 'rounded-sm',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-base',
    icon: 16,
    gap: 'gap-2',
    rounded: 'rounded-sm',
  },
};

// Active states that should show animation
const activeStates: EstadoContenido[] = ['recording', 'editing'];

export function ContentStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  showTooltip = true,
  animated = false,
  className,
}: ContentStatusBadgeProps) {
  const estado = ESTADOS_CONTENIDO[status];
  if (!estado) return null;

  const config = sizeConfig[size];
  const Icon = iconMap[estado.icono];
  const isActive = activeStates.includes(status);
  const shouldAnimate = animated && isActive;

  const badgeContent = (
    <motion.div
      className={cn(
        'inline-flex items-center',
        config.padding,
        config.gap,
        config.rounded,
        'font-medium',
        config.text,
        className
      )}
      style={{
        backgroundColor: estado.bgColor,
        color: estado.color,
        border: `1px solid ${estado.color}30`,
        boxShadow: shouldAnimate ? `0 0 10px ${estado.color}30` : undefined,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Icon */}
      {showIcon && Icon && (
        <motion.div
          className="relative"
          animate={shouldAnimate ? { rotate: [0, 5, -5, 0] } : undefined}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Icon size={config.icon} />

          {/* Pulsing dot for active states */}
          {shouldAnimate && (
            <motion.div
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
              style={{ backgroundColor: estado.color }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.6, 1],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>
      )}

      {/* Text */}
      <span>
        {size === 'sm' ? estado.nombreCorto : estado.nombre}
      </span>
    </motion.div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent
          className="bg-zinc-900/95 border-white/10 max-w-[200px]"
        >
          <div className="flex flex-col gap-1">
            <span className="font-semibold" style={{ color: estado.color }}>
              {estado.nombre}
            </span>
            <span className="text-xs text-zinc-400">
              {estado.descripcion}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Dot indicator version for compact displays
export function ContentStatusDot({
  status,
  size = 'md',
  showTooltip = true,
  animated = false,
}: {
  status: EstadoContenido;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  animated?: boolean;
}) {
  const estado = ESTADOS_CONTENIDO[status];
  if (!estado) return null;

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const isActive = activeStates.includes(status);
  const shouldAnimate = animated && isActive;

  const dot = (
    <motion.div
      className={cn('rounded-full', dotSizes[size])}
      style={{
        backgroundColor: estado.color,
        boxShadow: `0 0 6px ${estado.color}60`,
      }}
      animate={shouldAnimate ? {
        scale: [1, 1.2, 1],
        opacity: [1, 0.8, 1],
      } : undefined}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );

  if (!showTooltip) {
    return dot;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {dot}
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-900/95 border-white/10">
          <span style={{ color: estado.color }}>{estado.nombre}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
