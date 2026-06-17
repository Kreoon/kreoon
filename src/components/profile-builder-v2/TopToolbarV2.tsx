import { Eye, Monitor, Save, Send, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DevicePreview } from './types';

interface TopToolbarV2Props {
  isDirty: boolean;
  isSaving: boolean;
  device: DevicePreview;
  onDeviceChange: (device: DevicePreview) => void;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
}

export function TopToolbarV2({
  isDirty,
  isSaving,
  device,
  onDeviceChange,
  onSave,
  onPreview,
  onPublish,
}: TopToolbarV2Props) {
  const status = isSaving ? 'Guardando...' : isDirty ? 'Cambios sin guardar' : 'Guardado';

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-background px-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">Portfolio builder</p>
        <p className="truncate text-[11px] text-muted-foreground">{status}</p>
      </div>

      <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 p-1">
        <Button
          type="button"
          variant={device === 'desktop' ? 'secondary' : 'ghost'}
          size="icon"
          className={cn('h-7 w-8', device !== 'desktop' && 'bg-transparent')}
          onClick={() => onDeviceChange('desktop')}
          aria-label="Vista desktop"
          title="Desktop"
        >
          <Monitor className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={device === 'mobile' ? 'secondary' : 'ghost'}
          size="icon"
          className={cn('h-7 w-8', device !== 'mobile' && 'bg-transparent')}
          onClick={() => onDeviceChange('mobile')}
          aria-label="Vista mobile"
          title="Mobile"
        >
          <Smartphone className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onPreview}>
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4" />
          Guardar
        </Button>
        <Button type="button" size="sm" onClick={onPublish} disabled={isSaving}>
          <Send className="h-4 w-4" />
          Publicar
        </Button>
      </div>
    </header>
  );
}
