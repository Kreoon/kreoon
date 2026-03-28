import { cn } from '@/lib/utils';

interface KreoonSocialBrandProps {
  size?: 'sm' | 'md' | 'lg';
  showSymbol?: boolean;
  className?: string;
}

export function KreoonSocialBrand({ 
  size = 'md', 
  showSymbol = true,
  className 
}: KreoonSocialBrandProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const symbolSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showSymbol && (
        <img
          src="/favicon.png"
          alt="KREOON"
          className={cn('rounded-sm', symbolSizes[size])}
        />
      )}
      <span className={cn(
        'font-bold tracking-tight',
        sizeClasses[size]
      )}>
        <span className="text-social-foreground">KREOON</span>
      </span>
    </div>
  );
}

// Smaller inline version for headers
export function KreoonSocialLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <img
        src="/favicon.png"
        alt="KREOON"
        className="h-7 w-7 rounded-sm"
      />
      <span className="font-bold text-lg tracking-tight">
        <span className="text-social-foreground">KREOON</span>
      </span>
    </div>
  );
}
