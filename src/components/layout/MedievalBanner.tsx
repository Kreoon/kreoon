import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MedievalBannerProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: {
    text: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  };
  action?: React.ReactNode;
  className?: string;
}

export function MedievalBanner({ 
  icon: Icon, 
  title, 
  subtitle, 
  badge,
  action,
  className 
}: MedievalBannerProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl bg-card p-6 border border-border/50",
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {badge && (
            <Badge 
              variant={badge.variant || 'outline'} 
              className="bg-primary/10 text-primary border-primary/30"
            >
              {badge.text}
            </Badge>
          )}
          {action}
        </div>
      </div>
    </div>
  );
}
