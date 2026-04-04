/**
 * Responsive Toggle - Profile Builder Pro
 *
 * Selector de dispositivo para editar estilos responsive.
 * Permite alternar entre todos (global), desktop (base), tablet y mobile.
 */

import { Monitor, Tablet, Smartphone, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type DeviceMode = 'all' | 'desktop' | 'tablet' | 'mobile';

interface ResponsiveToggleProps {
  value: DeviceMode;
  onChange: (device: DeviceMode) => void;
  className?: string;
}

const DEVICES: { mode: DeviceMode; icon: typeof Monitor; label: string; description: string }[] = [
  { mode: 'all', icon: Layers, label: 'Todos', description: 'Aplica a todos los dispositivos' },
  { mode: 'desktop', icon: Monitor, label: 'PC', description: 'Solo escritorio (1440px+)' },
  { mode: 'tablet', icon: Tablet, label: 'Tablet', description: 'Solo tablet (768px - 1024px)' },
  { mode: 'mobile', icon: Smartphone, label: 'Movil', description: 'Solo movil (< 768px)' },
];

export function ResponsiveToggle({ value, onChange, className }: ResponsiveToggleProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-0.5 p-0.5 bg-muted rounded-md', className)}>
        {DEVICES.map(({ mode, icon: Icon, label, description }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(mode)}
                className={cn(
                  'flex items-center justify-center gap-1 px-2 py-1 rounded transition-all text-[11px]',
                  value === mode
                    ? 'bg-background text-primary shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-medium">{label}</p>
              <p className="text-muted-foreground">{description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export default ResponsiveToggle;
