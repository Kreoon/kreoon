import { cn } from '@/lib/utils';

interface ResponsivePreviewProps {
  device: 'desktop' | 'tablet' | 'mobile';
  children: React.ReactNode;
  className?: string;
}

const DEVICE_WIDTHS: Record<'desktop' | 'tablet' | 'mobile', string> = {
  desktop: 'w-full',
  tablet: 'w-[768px]',
  mobile: 'w-[375px]',
};

const DEVICE_FRAMES: Record<'desktop' | 'tablet' | 'mobile', string> = {
  desktop: '',
  tablet: 'rounded-2xl border-4 border-border shadow-xl',
  mobile: 'rounded-3xl border-4 border-border shadow-xl',
};

export function ResponsivePreview({ device, children, className }: ResponsivePreviewProps) {
  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out mx-auto overflow-hidden',
        DEVICE_WIDTHS[device],
        DEVICE_FRAMES[device],
        className
      )}
    >
      {device !== 'desktop' && (
        <div className="h-6 bg-border/50 flex items-center justify-center">
          <div className="w-16 h-1.5 rounded-full bg-border" />
        </div>
      )}
      <div className="overflow-y-auto">{children}</div>
    </div>
  );
}
