import type { ComponentType } from 'react';
import { Images, Layers, LayoutTemplate, Palette, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BuilderPanel } from './types';

interface LeftToolRailProps {
  activePanel: BuilderPanel;
  onPanelChange: (panel: BuilderPanel) => void;
}

const TOOLS: Array<{ panel: BuilderPanel; label: string; icon: ComponentType<{ className?: string }> }> = [
  { panel: 'templates', label: 'Plantillas', icon: LayoutTemplate },
  { panel: 'sections', label: 'Secciones', icon: Layers },
  { panel: 'style', label: 'Estilo', icon: Palette },
  { panel: 'media', label: 'Media', icon: Images },
  { panel: 'ai', label: 'IA', icon: Sparkles },
  { panel: 'publish', label: 'Publicar', icon: Send },
];

export function LeftToolRail({ activePanel, onPanelChange }: LeftToolRailProps) {
  return (
    <nav className="flex w-16 flex-shrink-0 flex-col items-center gap-2 border-r border-border bg-background px-2 py-3">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activePanel === tool.panel;
        return (
          <Button
            key={tool.panel}
            type="button"
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
            className={cn('h-10 w-10', !isActive && 'bg-transparent')}
            onClick={() => onPanelChange(tool.panel)}
            aria-label={tool.label}
            title={tool.label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </nav>
  );
}
