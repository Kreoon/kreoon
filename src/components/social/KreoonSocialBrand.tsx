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
        <div className={cn(
          'rounded-lg bg-gradient-to-br from-social-accent to-social-accent/60 flex items-center justify-center',
          symbolSizes[size]
        )}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-3/4 h-3/4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* K symbol stylized */}
            <path d="M6 4v16" className="text-social-accent-foreground" stroke="currentColor" />
            <path d="M6 12l8-8" className="text-social-accent-foreground" stroke="currentColor" />
            <path d="M6 12l8 8" className="text-social-accent-foreground" stroke="currentColor" />
          </svg>
        </div>
      )}
      <span className={cn(
        'font-bold tracking-tight',
        sizeClasses[size]
      )}>
        <span className="text-social-foreground">KREOON</span>
        <span className="text-social-accent ml-1">Social</span>
      </span>
    </div>
  );
}

// Smaller inline version for headers
export function KreoonSocialLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-social-accent to-social-accent/60 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4 h-4"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 4v16" className="text-social-accent-foreground" stroke="currentColor" />
          <path d="M6 12l8-8" className="text-social-accent-foreground" stroke="currentColor" />
          <path d="M6 12l8 8" className="text-social-accent-foreground" stroke="currentColor" />
        </svg>
      </div>
      <span className="font-bold text-lg tracking-tight">
        <span className="text-social-foreground">KREOON</span>
        <span className="text-social-accent">Social</span>
      </span>
    </div>
  );
}
