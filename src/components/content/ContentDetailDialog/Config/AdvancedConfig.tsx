import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdvancedConfig as AdvancedConfigType } from './types';
import { 
  MessageSquare, 
  ShieldCheck, 
  Eye, 
  Puzzle, 
  Tags,
  Plus,
  X
} from 'lucide-react';
import { useState } from 'react';

interface AdvancedConfigProps {
  config: AdvancedConfigType | null;
  onUpdate: (config: Partial<AdvancedConfigType>) => void;
}

export function AdvancedConfig({ config, onUpdate }: AdvancedConfigProps) {
  const [newContentType, setNewContentType] = useState('');

  const handleToggle = (key: keyof Pick<AdvancedConfigType, 'enable_comments' | 'require_approval_before_advance' | 'client_read_only_mode' | 'enable_custom_fields'>) => {
    onUpdate({ [key]: !config?.[key] });
  };

  const handleAddContentType = () => {
    if (!newContentType.trim()) return;
    const currentTypes = config?.content_types ?? ['UGC', 'Ads', 'Orgánico'];
    if (!currentTypes.includes(newContentType.trim())) {
      onUpdate({ content_types: [...currentTypes, newContentType.trim()] });
    }
    setNewContentType('');
  };

  const handleRemoveContentType = (type: string) => {
    const currentTypes = config?.content_types ?? ['UGC', 'Ads', 'Orgánico'];
    onUpdate({ content_types: currentTypes.filter(t => t !== type) });
  };

  const options = [
    {
      key: 'enable_comments' as const,
      label: 'Habilitar Comentarios',
      description: 'Permite comentarios en los bloques del contenido',
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      key: 'require_approval_before_advance' as const,
      label: 'Requerir Aprobación',
      description: 'Exige aprobación antes de avanzar a ciertos estados',
      icon: <ShieldCheck className="h-5 w-5" />,
    },
    {
      key: 'client_read_only_mode' as const,
      label: 'Modo Solo Lectura para Clientes',
      description: 'Los clientes solo pueden ver, no editar contenido',
      icon: <Eye className="h-5 w-5" />,
    },
    {
      key: 'enable_custom_fields' as const,
      label: 'Campos Personalizados',
      description: 'Permite agregar campos custom al contenido',
      icon: <Puzzle className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Configuración Avanzada</h3>
        <p className="text-sm text-muted-foreground">
          Opciones adicionales para personalizar el comportamiento del contenido
        </p>
      </div>

      {/* Toggle Options */}
      <div className="space-y-3">
        {options.map(option => {
          const isEnabled = config?.[option.key] ?? true;
          return (
            <Card 
              key={option.key}
              className={`p-4 transition-all ${!isEnabled ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-sm ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <Label 
                    htmlFor={option.key} 
                    className="font-medium cursor-pointer"
                  >
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
                <Switch
                  id={option.key}
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(option.key)}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Content Types */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-sm bg-primary/10 text-primary">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <Label className="font-medium">Tipos de Contenido</Label>
            <p className="text-sm text-muted-foreground">
              Categorías disponibles para clasificar el contenido
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {(config?.content_types ?? ['UGC', 'Ads', 'Orgánico']).map(type => (
            <Badge 
              key={type} 
              variant="secondary"
              className="pl-3 pr-1 py-1 flex items-center gap-1"
            >
              {type}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-destructive/20"
                onClick={() => handleRemoveContentType(type)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Nuevo tipo de contenido..."
            value={newContentType}
            onChange={(e) => setNewContentType(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddContentType()}
            className="flex-1"
          />
          <Button onClick={handleAddContentType} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-sm text-sm">
        <span>⚙️</span>
        <p className="text-muted-foreground">
          Estas configuraciones afectan a todos los contenidos de la organización. 
          Los cambios se aplican inmediatamente.
        </p>
      </div>
    </div>
  );
}
