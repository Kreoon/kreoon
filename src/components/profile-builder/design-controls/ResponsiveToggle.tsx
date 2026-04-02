/**
 * Responsive Toggle - Profile Builder Pro
 *
 * Selector de dispositivo para editar estilos responsive.
 * Permite alternar entre desktop (base), tablet y mobile.
 */

import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface ResponsiveToggleProps {
  value: DeviceMode;
  onChange: (device: DeviceMode) => void;
  className?: string;
}

const DEVICES: { mode: DeviceMode; icon: typeof Monitor; label: string; width: string }[] = [
  { mode: 'desktop', icon: Monitor, label: 'Escritorio (base)', width: '1440px' },
  { mode: 'tablet', icon: Tablet, label: 'Tablet', width: '768px' },
  { mode: 'mobile', icon: Smartphone, label: 'Movil', width: '375px' },
];

export function ResponsiveToggle({ value, onChange, className }: ResponsiveToggleProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-1 p-1 bg-muted rounded-lg', className)}>
        {DEVICES.map(({ mode, icon: Icon, label, width }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(mode)}
                className={cn(
                  'flex items-center justify-center p-2 rounded-md transition-all',
                  value === mode
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-medium">{label}</p>
              <p className="text-muted-foreground">{width}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export default ResponsiveToggle;
