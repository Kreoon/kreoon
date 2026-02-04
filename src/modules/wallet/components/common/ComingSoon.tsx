import { useState } from 'react';
import {
  Rocket,
  Clock,
  CheckCircle,
  X,
  Sparkles,
  Construction,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { WALLET_CONFIG } from '../../config';

// ============================================
// Coming Soon Banner
// ============================================
interface ComingSoonBannerProps {
  className?: string;
  dismissable?: boolean;
  variant?: 'full' | 'compact' | 'minimal';
  onDismiss?: () => void;
}

export function ComingSoonBanner({
  className,
  dismissable = true,
  variant = 'full',
  onDismiss,
}: ComingSoonBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const config = WALLET_CONFIG.COMING_SOON;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  // Minimal variant - just a small badge
  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'bg-amber-500/10 border-amber-500/30 text-amber-400 cursor-help',
                className
              )}
            >
              <Construction className="h-3 w-3 mr-1" />
              Próximamente
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{config.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lanzamiento estimado: {config.estimatedLaunch}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Compact variant - single line banner
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'flex items-center justify-between gap-4 px-4 py-3 rounded-xl',
          'bg-gradient-to-r from-amber-500/10 via-[hsl(270,100%,60%,0.1)] to-amber-500/10',
          'border border-amber-500/20',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20">
            <Construction className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <span className="text-sm font-medium text-white">
              {config.title}:{' '}
            </span>
            <span className="text-sm text-[hsl(270,30%,70%)]">
              {config.description.slice(0, 80)}...
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-500/30 text-amber-400">
            {config.estimatedLaunch}
          </Badge>
          {dismissable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  // Full variant - detailed banner with features
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-[hsl(270,100%,60%,0.1)] via-amber-500/5 to-[hsl(280,100%,60%,0.1)]',
        'border border-amber-500/20',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[hsl(270,100%,60%,0.1)] rounded-full blur-3xl" />
      </div>

      <div className="relative p-6">
        {/* Dismiss button */}
        {dismissable && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-[hsl(270,100%,60%,0.2)] animate-pulse">
              <Rocket className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white">{config.title}</h3>
                <Badge
                  variant="outline"
                  className="border-amber-500/30 text-amber-400"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {config.estimatedLaunch}
                </Badge>
              </div>
              <p className="text-lg font-medium text-[hsl(270,100%,80%)]">
                {config.subtitle}
              </p>
              <p className="text-sm text-[hsl(270,30%,60%)] mt-2 max-w-md">
                {config.description}
              </p>
            </div>
          </div>

          {/* Features list */}
          <div className="flex-1 lg:border-l lg:border-[hsl(270,100%,60%,0.1)] lg:pl-6">
            <p className="text-xs text-[hsl(270,30%,50%)] uppercase tracking-wide mb-3">
              Características incluidas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {config.features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-[hsl(270,30%,70%)]">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Coming Soon Overlay
// ============================================
interface ComingSoonOverlayProps {
  children: React.ReactNode;
  enabled?: boolean;
  message?: string;
  className?: string;
}

export function ComingSoonOverlay({
  children,
  enabled = true,
  message = 'Esta función estará disponible próximamente',
  className,
}: ComingSoonOverlayProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Content with reduced opacity */}
      <div className="opacity-60 pointer-events-none select-none">{children}</div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-[hsl(270,50%,5%,0.3)] backdrop-blur-[1px] rounded-xl">
        <div className="text-center p-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Construction className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Próximamente</span>
          </div>
          <p className="text-xs text-[hsl(270,30%,60%)] mt-2 max-w-xs">{message}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Coming Soon Tooltip Wrapper
// ============================================
interface ComingSoonTooltipProps {
  children: React.ReactNode;
  enabled?: boolean;
  message?: string;
}

export function ComingSoonTooltip({
  children,
  enabled = true,
  message = 'Disponible próximamente',
}: ComingSoonTooltipProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed">
            <span className="pointer-events-none opacity-50">{children}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <Construction className="h-3 w-3 text-amber-400" />
            <span>{message}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Demo Mode Indicator
// ============================================
interface DemoModeIndicatorProps {
  className?: string;
}

export function DemoModeIndicator({ className }: DemoModeIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'fixed bottom-4 right-4 z-50',
              'flex items-center gap-2 px-3 py-1.5 rounded-full',
              'bg-amber-500/10 border border-amber-500/30',
              'cursor-help',
              className
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span className="text-xs font-medium text-amber-400">Modo Demo</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-sm">
            Estás viendo una vista previa del sistema de wallet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Las transacciones no son reales.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Coming Soon Page Wrapper
// ============================================
interface ComingSoonPageWrapperProps {
  children: React.ReactNode;
  showBanner?: boolean;
  showDemoIndicator?: boolean;
  bannerVariant?: 'full' | 'compact' | 'minimal';
  className?: string;
}

export function ComingSoonPageWrapper({
  children,
  showBanner = true,
  showDemoIndicator = true,
  bannerVariant = 'compact',
  className,
}: ComingSoonPageWrapperProps) {
  return (
    <div className={cn('relative', className)}>
      {showBanner && (
        <ComingSoonBanner variant={bannerVariant} className="mb-6" />
      )}
      {children}
      {showDemoIndicator && <DemoModeIndicator />}
    </div>
  );
}
