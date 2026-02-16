import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { AdPlatform, EventMapping } from '@/analytics/types/platforms';
import { DEFAULT_EVENT_MAPPINGS } from '@/analytics/types/platforms';

const KAE_EVENTS = [
  { key: 'signup', label: 'Signup', description: 'Registro de nuevo usuario' },
  { key: 'trial_start', label: 'Trial Start', description: 'Inicio de periodo de prueba' },
  { key: 'subscription', label: 'Subscription', description: 'Suscripción pagada' },
  { key: 'content_created', label: 'Content Created', description: 'Creación de contenido' },
];

interface EventMappingEditorProps {
  platform: AdPlatform;
  mapping: EventMapping;
  onChange: (mapping: EventMapping) => void;
}

export function EventMappingEditor({ platform, mapping, onChange }: EventMappingEditorProps) {
  const defaults = DEFAULT_EVENT_MAPPINGS[platform];

  const handleReset = () => {
    onChange({ ...defaults });
  };

  const handleChange = (key: string, value: string) => {
    onChange({ ...mapping, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-white">Mapeo de Eventos</h4>
          <p className="text-xs text-gray-400 mt-0.5">
            Define cómo se traducen los eventos KAE a eventos de la plataforma
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-gray-400 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Restaurar defaults
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {KAE_EVENTS.map(({ key, label, description }) => (
          <div
            key={key}
            className="grid grid-cols-[1fr,auto,1fr] items-center gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700/30"
          >
            <div>
              <Label className="text-sm text-gray-300">{label}</Label>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
            <span className="text-gray-600 text-xs">→</span>
            <Input
              value={mapping[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={defaults[key]}
              className="bg-gray-900/50 border-gray-700 text-sm h-9"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
