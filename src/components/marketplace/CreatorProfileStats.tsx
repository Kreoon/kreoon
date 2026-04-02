import { motion } from 'framer-motion';
import { Star, Package, Clock, MessageCircle, Shield, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { MarketplaceProfileStats, MarketplaceBadge } from '@/types/marketplace';
import { BADGE_LABELS, BADGE_ICONS } from '@/types/marketplace';

interface CreatorProfileStatsProps {
  stats: MarketplaceProfileStats;
  className?: string;
  variant?: 'full' | 'compact';
}

export function CreatorProfileStats({
  stats,
  className,
  variant = 'full',
}: CreatorProfileStatsProps) {
  const {
    avg_rating,
    reviews_count,
    total_contracts_completed,
    on_time_delivery_rate,
    response_rate,
    is_verified,
    verification_level,
    badges,
  } = stats;

  const formatPercent = (value: number | null) => {
    if (value === null) return '-';
    return `${Math.round(value * 100)}%`;
  };

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-3 text-sm", className)}>
        {avg_rating !== null && (
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">{avg_rating}</span>
            <span className="text-muted-foreground">({reviews_count})</span>
          </span>
        )}
        {total_contracts_completed > 0 && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Package className="h-4 w-4" />
            {total_contracts_completed}
          </span>
        )}
        {on_time_delivery_rate !== null && on_time_delivery_rate >= 0.9 && (
          <span className="flex items-center gap-1 text-green-500">
            <Clock className="h-4 w-4" />
            {formatPercent(on_time_delivery_rate)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main stats row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* Rating */}
        {avg_rating !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="flex items-center gap-1.5 cursor-default"
                  whileHover={{ scale: 1.05 }}
                >
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-foreground">{avg_rating}</span>
                  <span className="text-muted-foreground">
                    ({reviews_count} review{reviews_count !== 1 ? 's' : ''})
                  </span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>Calificación promedio</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Projects completed */}
        {total_contracts_completed > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="flex items-center gap-1.5 cursor-default"
                  whileHover={{ scale: 1.05 }}
                >
                  <Package className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">
                    {total_contracts_completed}
                  </span>
                  <span className="text-muted-foreground">proyectos</span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>Proyectos completados</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* On-time delivery */}
        {on_time_delivery_rate !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="flex items-center gap-1.5 cursor-default"
                  whileHover={{ scale: 1.05 }}
                >
                  <Clock
                    className={cn(
                      "h-5 w-5",
                      on_time_delivery_rate >= 0.9
                        ? "text-green-500"
                        : on_time_delivery_rate >= 0.7
                        ? "text-yellow-500"
                        : "text-red-500"
                    )}
                  />
                  <span className="font-semibold text-foreground">
                    {formatPercent(on_time_delivery_rate)}
                  </span>
                  <span className="text-muted-foreground">a tiempo</span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>Tasa de entrega a tiempo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Response time */}
      {response_rate !== null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          <span>
            Responde en ~{response_rate <= 0.25 ? '6' : response_rate <= 0.5 ? '12' : '24'} horas
          </span>
        </div>
      )}

      {/* Badges */}
      {(badges.length > 0 || is_verified) && (
        <div className="flex flex-wrap gap-2">
          {/* Verified badge */}
          {is_verified && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                      "bg-blue-500/20 text-blue-500 border border-blue-500/30"
                    )}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Shield className="h-4 w-4" />
                    Verificado
                    {verification_level > 2 && (
                      <span className="text-xs opacity-70">Nivel {verification_level}</span>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>Identidad y portfolio verificados</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Achievement badges */}
          {badges.map((badge) => (
            <TooltipProvider key={badge}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                      badge === 'top_rated' && "bg-amber-500/20 text-amber-500 border border-amber-500/30",
                      badge === 'fast_delivery' && "bg-green-500/20 text-green-500 border border-green-500/30",
                      badge === 'rising_talent' && "bg-purple-500/20 text-purple-500 border border-purple-500/30",
                      badge === 'kreoon_pick' && "bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border border-primary/30"
                    )}
                    whileHover={{ scale: 1.05 }}
                  >
                    <span>{BADGE_ICONS[badge]}</span>
                    {BADGE_LABELS[badge]}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  {badge === 'top_rated' && 'Calificación promedio de 4.8 o superior'}
                  {badge === 'fast_delivery' && 'Entrega consistentemente antes de tiempo'}
                  {badge === 'rising_talent' && 'Nuevo talento con excelentes métricas'}
                  {badge === 'kreoon_pick' && 'Seleccionado por el equipo de Kreoon'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}
    </div>
  );
}

// Minimal stats for cards
export function CreatorStatsMinimal({
  rating,
  reviewsCount,
  projectsCount,
  className,
}: {
  rating?: number | null;
  reviewsCount?: number;
  projectsCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      {rating !== null && rating !== undefined && (
        <span className="flex items-center gap-0.5">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {rating}
          {reviewsCount !== undefined && <span>({reviewsCount})</span>}
        </span>
      )}
      {projectsCount !== undefined && projectsCount > 0 && (
        <span className="flex items-center gap-0.5">
          <Package className="h-3 w-3" />
          {projectsCount}
        </span>
      )}
    </div>
  );
}
