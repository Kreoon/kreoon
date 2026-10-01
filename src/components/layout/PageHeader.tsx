import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: {
    text: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'glow';
  };
  action?: React.ReactNode;
  className?: string;
  /** Una sola línea, sin caja: título + subtítulo corto a la izquierda y acciones a la derecha. */
  compact?: boolean;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  action,
  className,
  compact = false
}: PageHeaderProps) {
  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2", className)}>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent text-accent-foreground"
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
            <p className="hidden truncate text-sm text-muted-foreground sm:block">{subtitle}</p>
          </div>
        </div>
        {(badge || action) && (
          <div className="flex items-center gap-2">
            {badge && (
              <Badge variant={badge.variant || 'glow'} className="bg-accent text-accent-foreground">
                {badge.text}
              </Badge>
            )}
            {action}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "relative overflow-hidden rounded-sm p-3 md:p-6",
        "bg-card",
        "border border-border",
        "shadow-sm",
        "transition-all duration-300",
        "hover:border-primary/20",
        "hover:shadow-md",
        className
      )}
    >
      {/* Gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2.5 md:gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={cn(
              "p-1.5 md:p-3 rounded-sm",
              "bg-primary/10",
              "border border-primary/20",
              "shadow-sm",
              "transition-all duration-300"
            )}
          >
            <Icon className="h-4 w-4 md:h-7 md:w-7 text-primary" />
          </motion.div>
          <div className="min-w-0">
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-base md:text-3xl font-bold tracking-tight text-foreground truncate"
            >
              {title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="hidden md:block text-sm text-muted-foreground mt-0.5"
            >
              {subtitle}
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center gap-3"
        >
          {badge && (
            <Badge
              variant={badge.variant || 'glow'}
              className={cn(
                "bg-primary/10",
                "border border-primary/20",
                "text-primary"
              )}
            >
              {badge.text}
            </Badge>
          )}
          {action}
        </motion.div>
      </div>
    </motion.div>
  );
}

// Re-export as MedievalBanner for backwards compatibility
export { PageHeader as MedievalBanner };
