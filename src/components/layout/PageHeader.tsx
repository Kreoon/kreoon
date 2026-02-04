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
        "bg-gradient-to-br from-[hsl(250,20%,6%,0.9)] via-[hsl(250,20%,4%,0.95)] to-[hsl(250,20%,3%)]",
        "border border-[hsl(270,100%,60%,0.1)]",
        "backdrop-blur-xl",
        "shadow-[0_4px_24px_-8px_hsl(0,0%,0%,0.5)]",
        "transition-all duration-300",
        "hover:border-[hsl(270,100%,60%,0.2)]",
        "hover:shadow-[0_8px_32px_-8px_hsl(0,0%,0%,0.6),0_0_40px_-10px_hsl(270,100%,60%,0.1)]",
        className
      )}
    >
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-[hsl(270,100%,60%,0.08)] rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[hsl(270,100%,60%,0.05)] rounded-full blur-2xl" />
      </div>

      {/* Gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(270,100%,60%,0.3)] to-transparent" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={cn(
              "p-3 rounded-xl",
              "bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(270,100%,60%,0.05)]",
              "border border-[hsl(270,100%,60%,0.25)]",
              "shadow-[0_0_20px_-5px_hsl(270,100%,60%,0.4)]",
              "transition-all duration-300"
            )}
          >
            <Icon className="h-7 w-7 text-[hsl(270,100%,70%)]" />
          </motion.div>
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-[hsl(270,100%,80%)] bg-clip-text text-transparent"
            >
              {title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-sm text-[hsl(270,30%,55%)] mt-0.5"
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
                "bg-gradient-to-r from-[hsl(270,100%,60%,0.2)] to-[hsl(270,100%,60%,0.1)]",
                "border border-[hsl(270,100%,60%,0.3)]",
                "text-[hsl(270,100%,80%)]",
                "shadow-[0_0_15px_-5px_hsl(270,100%,60%,0.3)]"
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
