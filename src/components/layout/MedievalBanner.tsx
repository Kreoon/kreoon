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
      "relative overflow-hidden rounded-lg bg-gradient-stone p-6 border-2 border-primary/30 hover-torch",
      className
    )}>
      <div className="absolute inset-0 bg-primary/5 opacity-50" />
      {/* Ember particles effect */}
      <div className="absolute top-2 right-4 text-amber-400/40 animate-magic-sparkle">✦</div>
      <div className="absolute top-4 right-12 text-amber-500/30 animate-magic-sparkle" style={{ animationDelay: '0.5s' }}>✧</div>
      <div className="absolute top-6 right-8 text-orange-400/35 animate-magic-sparkle" style={{ animationDelay: '1s' }}>✦</div>
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/30 border-2 border-primary/50 emboss animate-torch-glow">
            <Icon className="h-8 w-8 text-primary animate-torch" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-medieval font-bold text-primary-foreground">
              {title}
            </h1>
            <p className="text-sm text-primary-foreground/70 font-body">
              {subtitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {badge && (
            <Badge variant={badge.variant || 'outline'} className="font-medieval">
              {badge.text}
            </Badge>
          )}
          {action}
        </div>
      </div>
    </div>
  );
}
