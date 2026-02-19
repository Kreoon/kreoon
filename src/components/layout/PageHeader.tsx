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
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  action,
  className
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
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

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={cn(
              "p-3 rounded-xl",
              "bg-primary/10",
              "border border-primary/20",
              "shadow-sm",
              "transition-all duration-300"
            )}
          >
            <Icon className="h-7 w-7 text-primary" />
          </motion.div>
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            >
              {title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-sm text-muted-foreground mt-0.5"
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
