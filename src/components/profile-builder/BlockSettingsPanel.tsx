import { useState } from 'react';
import { Settings2, Wand2, RotateCcw, Plus, Trash2, Dna, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BLOCK_DEFINITIONS,
  type ProfileBlock,
} from './types/profile-builder';
import { getConfigLabel, OPTION_LABELS } from './config-labels';
import { AdvancedStylesTab, ResponsiveToggle, type DeviceMode } from './design-controls';
import { useDNAForBuilder } from './hooks/useDNAForBuilder';
import type { DNASuggestion } from '@/lib/profile-builder/dnaToBlocksMapping';

interface BlockSettingsPanelProps {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
  userId?: string;
  creatorProfileId?: string;
}

// ─── Subcomponentes de campos ────────────────────────────────────────────────

function FieldRow({
  label,
  children,
  hasOverride = false,
}: {
  label: string;
  children: React.ReactNode;
  hasOverride?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {hasOverride && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
            Override
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Hero Banner Settings ────────────────────────────────────────────────────

function HeroBannerSettings({
  block,
  onUpdate,
  deviceMode = 'all',
}: {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
  deviceMode?: DeviceMode;
}) {
  // Obtener config efectiva segun dispositivo
  const getEffectiveConfig = (): Record<string, unknown> => {
    if (deviceMode === 'all' || deviceMode === 'desktop') {
      return block.config;
    }
    const overrides = block.configOverrides?.[deviceMode] || {};
    return { ...block.config, ...overrides };
  };

  const config = getEffectiveConfig();

  // Verificar si un campo tiene override para el dispositivo actual
  const hasOverrideFor = (key: string): boolean => {
    if (deviceMode === 'all' || deviceMode === 'desktop') return false;
    return block.configOverrides?.[deviceMode]?.[key] !== undefined;
  };

  // Handler para cambios de config segun dispositivo
  const handleConfigChange = (key: string, value: unknown) => {

    if (deviceMode === 'all') {
      // Aplica a config base y limpia overrides de esa propiedad
      const currentOverrides = block.configOverrides || {};
      const cleanedTablet = { ...(currentOverrides.tablet || {}) };
      const cleanedMobile = { ...(currentOverrides.mobile || {}) };
      delete cleanedTablet[key];
      delete cleanedMobile[key];

      const newOverrides: typeof currentOverrides = {};
      if (Object.keys(cleanedTablet).length > 0) newOverrides.tablet = cleanedTablet;
      if (Object.keys(cleanedMobile).length > 0) newOverrides.mobile = cleanedMobile;

      onUpdate({
        config: { ...block.config, [key]: value },
        configOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
      });
    } else if (deviceMode === 'desktop') {
      // Solo modifica config base
      onUpdate({ config: { ...block.config, [key]: value } });
    } else {
      // tablet/mobile guardan en configOverrides
      const currentOverrides = block.configOverrides || {};
      const deviceOverrides = currentOverrides[deviceMode] || {};
      onUpdate({
        configOverrides: {
          ...currentOverrides,
          [deviceMode]: { ...deviceOverrides, [key]: value },
        },
      });
    }
  };

  const ctaAction = (config.ctaAction as string) || 'scroll-portfolio';

  return (
    <div className="space-y-5">
      {/* Nota sobre fondo */}
      <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2">
        Configura el fondo (color, gradiente o imagen) en la pestana "Avanzado"
      </p>

      {/* Seccion: Layout */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Disposicion</p>

        <FieldRow label="Layout" hasOverride={hasOverrideFor('layout')}>
          <Select
            value={(config.layout as string) || 'horizontal'}
            onValueChange={(v) => handleConfigChange('layout', v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
              <SelectItem value="centered">Centrado</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Posicion del avatar" hasOverride={hasOverrideFor('avatarPosition')}>
          <Select
            value={(config.avatarPosition as string) || 'left'}
            onValueChange={(v) => handleConfigChange('avatarPosition', v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Izquierda</SelectItem>
              <SelectItem value="right">Derecha</SelectItem>
              <SelectItem value="top">Arriba</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Tamano del avatar" hasOverride={hasOverrideFor('avatarSize')}>
          <Select
            value={(config.avatarSize as string) || 'lg'}
            onValueChange={(v) => handleConfigChange('avatarSize', v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Pequeno</SelectItem>
              <SelectItem value="md">Mediano</SelectItem>
              <SelectItem value="lg">Grande</SelectItem>
              <SelectItem value="xl">Extra grande</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Forma del avatar" hasOverride={hasOverrideFor('avatarShape')}>
          <Select
            value={(config.avatarShape as string) || 'rounded'}
            onValueChange={(v) => handleConfigChange('avatarShape', v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="square">Cuadrado</SelectItem>
              <SelectItem value="rounded">Redondeado</SelectItem>
              <SelectItem value="circle">Circular</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Alineacion del texto" hasOverride={hasOverrideFor('contentAlign')}>
          <Select
            value={(config.contentAlign as string) || 'left'}
            onValueChange={(v) => handleConfigChange('contentAlign', v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Izquierda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Derecha</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Altura minima" hasOverride={hasOverrideFor('minHeight')}>
          <Select
            value={(config.minHeight as string) || 'md'}
            onValueChange={(v) => handleConfigChange('minHeight', v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatico</SelectItem>
              <SelectItem value="sm">Pequeno</SelectItem>
              <SelectItem value="md">Mediano</SelectItem>
              <SelectItem value="lg">Grande</SelectItem>
              <SelectItem value="full">Completo</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </div>

      {/* Seccion: Contenido visible */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contenido opcional</p>
        <p className="text-[10px] text-muted-foreground -mt-1">Avatar y nombre siempre visibles</p>

        {(['showRole', 'showTagline', 'showCTA'] as const).map((key) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={`config-${key}`} className="text-xs">
              {getConfigLabel(key)}
            </Label>
            <Switch
              id={`config-${key}`}
              checked={Boolean(config[key] ?? true)}
              onCheckedChange={(checked) => handleConfigChange(key, checked)}
            />
          </div>
        ))}
      </div>

      {/* Seccion: CTA */}
      {config.showCTA !== false && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Boton CTA</p>

          <FieldRow label="Texto del boton">
            <Input
              value={(config.ctaText as string) || 'Ver Portfolio'}
              onChange={(e) => handleConfigChange('ctaText', e.target.value)}
              className="h-8 text-xs"
            />
          </FieldRow>

          <FieldRow label="Accion del boton">
            <Select
              value={ctaAction}
              onValueChange={(v) => handleConfigChange('ctaAction', v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scroll-portfolio">Ver Portfolio</SelectItem>
                <SelectItem value="contact">Ir a Contacto</SelectItem>
                <SelectItem value="link" disabled={!config.premiumCtaEnabled}>
                  Link externo {!config.premiumCtaEnabled && '(Premium)'}
                </SelectItem>
                <SelectItem value="whatsapp" disabled={!config.premiumCtaEnabled}>
                  WhatsApp {!config.premiumCtaEnabled && '(Premium)'}
                </SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          {ctaAction === 'link' && config.premiumCtaEnabled && (
            <FieldRow label="URL de destino">
              <Input
                value={(config.ctaUrl as string) || ''}
                onChange={(e) => handleConfigChange('ctaUrl', e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </FieldRow>
          )}

          {ctaAction === 'whatsapp' && config.premiumCtaEnabled && (
            <>
              <FieldRow label="Numero WhatsApp">
                <Input
                  value={(config.ctaWhatsapp as string) || ''}
                  onChange={(e) => handleConfigChange('ctaWhatsapp', e.target.value)}
                  placeholder="573001234567"
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Mensaje predeterminado">
                <Input
                  value={(config.ctaWhatsappMessage as string) || ''}
                  onChange={(e) => handleConfigChange('ctaWhatsappMessage', e.target.value)}
                  placeholder="Hola! Vi tu perfil..."
                  className="h-8 text-xs"
                />
              </FieldRow>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab Contenido: campos genéricos según config ───────────────────────────

function ContentFields({
  block,
  onUpdate,
  userId,
  creatorProfileId,
  deviceMode = 'all',
}: {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
  userId?: string;
  creatorProfileId?: string;
  deviceMode?: DeviceMode;
}) {
  const definition = BLOCK_DEFINITIONS[block.type];

  // Hero Banner tiene su propio panel especializado
  if (block.type === 'hero_banner') {
    return <HeroBannerSettings block={block} onUpdate={onUpdate} deviceMode={deviceMode} />;
  }

  // Obtener config efectiva segun dispositivo
  const getEffectiveConfig = () => {
    if (deviceMode === 'all' || deviceMode === 'desktop') {
      return block.config;
    }
    const overrides = block.configOverrides?.[deviceMode] || {};
    return { ...block.config, ...overrides };
  };

  const effectiveConfig = getEffectiveConfig();

  // Handler para cambios de config segun dispositivo
  const handleConfigChange = (key: string, value: unknown) => {
    if (deviceMode === 'all') {
      // Aplica a config base y limpia overrides de esa propiedad
      const currentOverrides = block.configOverrides || {};
      const cleanedTablet = { ...(currentOverrides.tablet || {}) };
      const cleanedMobile = { ...(currentOverrides.mobile || {}) };
      delete cleanedTablet[key];
      delete cleanedMobile[key];

      const newOverrides: typeof currentOverrides = {};
      if (Object.keys(cleanedTablet).length > 0) newOverrides.tablet = cleanedTablet;
      if (Object.keys(cleanedMobile).length > 0) newOverrides.mobile = cleanedMobile;

      onUpdate({
        config: { ...block.config, [key]: value },
        configOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
      });
    } else if (deviceMode === 'desktop') {
      // Solo modifica config base
      onUpdate({ config: { ...block.config, [key]: value } });
    } else {
      // tablet/mobile guardan en configOverrides
      const currentOverrides = block.configOverrides || {};
      const deviceOverrides = currentOverrides[deviceMode] || {};
      onUpdate({
        configOverrides: {
          ...currentOverrides,
          [deviceMode]: { ...deviceOverrides, [key]: value },
        },
      });
    }
  };

  const configEntries = Object.entries(definition.defaultConfig);

  if (configEntries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        Este bloque no tiene opciones de contenido configurables.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {configEntries.map(([key, defaultValue]) => {
        const currentValue = effectiveConfig[key] ?? defaultValue;

        // Booleanos: mostrar Switch
        if (typeof defaultValue === 'boolean') {
          return (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`config-${key}`} className="text-xs">
                {getConfigLabel(key)}
              </Label>
              <Switch
                id={`config-${key}`}
                checked={Boolean(currentValue)}
                onCheckedChange={(checked) => handleConfigChange(key, checked)}
              />
            </div>
          );
        }

        // PRIMERO verificar si hay opciones predefinidas (Select)
        // Esto tiene prioridad sobre el tipo de dato
        if (OPTION_LABELS[key]) {
          return (
            <FieldRow key={key} label={getConfigLabel(key)}>
              <Select
                value={String(currentValue)}
                onValueChange={(v) => handleConfigChange(key, v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPTION_LABELS[key]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          );
        }

        // Numeros sin opciones predefinidas: Input numerico
        if (typeof defaultValue === 'number') {
          return (
            <FieldRow key={key} label={getConfigLabel(key)}>
              <Input
                type="number"
                value={String(currentValue)}
                onChange={(e) => handleConfigChange(key, Number(e.target.value))}
                className="h-8 text-xs"
              />
            </FieldRow>
          );
        }

        // Campos de fecha: datetime-local picker
        if (key.toLowerCase().includes('date') && typeof defaultValue === 'string') {
          const toLocalInput = (iso: string) => {
            if (!iso) return '';
            try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
          };
          const fromLocalInput = (local: string) => {
            if (!local) return '';
            return new Date(local).toISOString();
          };
          return (
            <FieldRow key={key} label={getConfigLabel(key)}>
              <Input
                type="datetime-local"
                value={toLocalInput(String(currentValue))}
                onChange={(e) => handleConfigChange(key, fromLocalInput(e.target.value))}
                className="h-8 text-xs"
              />
            </FieldRow>
          );
        }

        // String sin opciones: texto libre
        return (
          <FieldRow key={key} label={getConfigLabel(key)}>
            <Input
              value={String(currentValue)}
              onChange={(e) => handleConfigChange(key, e.target.value)}
              className="h-8 text-xs"
            />
          </FieldRow>
        );
      })}
    </div>
  );
}


// ─── Componente principal ────────────────────────────────────────────────────

export function BlockSettingsPanel({ block, onUpdate, userId, creatorProfileId }: BlockSettingsPanelProps) {
  const definition = BLOCK_DEFINITIONS[block.type];
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('all');
  const { hasDNA, getSuggestionsForBlock, applyToBlock } = useDNAForBuilder();

  // Obtener sugerencias ADN para este tipo de bloque
  const dnaSuggestions = getSuggestionsForBlock(block.type);

  // Handler para aplicar una sugerencia ADN
  const handleApplyDNASuggestion = (suggestion: DNASuggestion) => {
    const updates = applyToBlock(suggestion, block);
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
      toast.success(`"${suggestion.label}" aplicado al bloque`);
    }
  };

  // Contar overrides por dispositivo (estilos + config)
  const styleOverrides = {
    tablet: Object.keys(block.styles.responsiveOverrides?.tablet || {}).length,
    mobile: Object.keys(block.styles.responsiveOverrides?.mobile || {}).length,
  };
  const configOverrideCounts = {
    tablet: Object.keys(block.configOverrides?.tablet || {}).length,
    mobile: Object.keys(block.configOverrides?.mobile || {}).length,
  };
  const overrideCounts = {
    tablet: styleOverrides.tablet + configOverrideCounts.tablet,
    mobile: styleOverrides.mobile + configOverrideCounts.mobile,
  };
  const totalOverrides = overrideCounts.tablet + overrideCounts.mobile;

  // Resetear overrides de un dispositivo (o todos) - estilos y config
  const handleResetDevice = () => {
    if (deviceMode === 'all') {
      // Limpiar todos los overrides (estilos y config)
      onUpdate({
        styles: {
          ...block.styles,
          responsiveOverrides: undefined,
        },
        configOverrides: undefined,
      });
    } else if (deviceMode !== 'desktop') {
      // Limpiar overrides del dispositivo específico
      const styleOverrides = block.styles.responsiveOverrides || {};
      const { [deviceMode]: _s, ...restStyleOverrides } = styleOverrides;

      const cfgOverrides = block.configOverrides || {};
      const { [deviceMode]: _c, ...restConfigOverrides } = cfgOverrides;

      onUpdate({
        styles: {
          ...block.styles,
          responsiveOverrides: Object.keys(restStyleOverrides).length > 0 ? restStyleOverrides : undefined,
        },
        configOverrides: Object.keys(restConfigOverrides).length > 0 ? restConfigOverrides : undefined,
      });
    }
  };

  // Obtener el conteo correcto segun el modo
  const currentOverrideCount = deviceMode === 'all'
    ? totalOverrides
    : deviceMode === 'desktop'
      ? 0
      : overrideCounts[deviceMode];

  // Texto descriptivo del modo
  const getModeDescription = () => {
    switch (deviceMode) {
      case 'all': return 'Cambios aplicados a todos los dispositivos';
      case 'desktop': return 'Solo para escritorio (1440px+)';
      case 'tablet': return 'Solo para tablet (768px - 1024px)';
      case 'mobile': return 'Solo para movil (< 768px)';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Encabezado con nombre del bloque */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{definition.label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{definition.description}</p>
        </div>
      </div>

      {/* Selector de dispositivo - Global para todo el panel */}
      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <ResponsiveToggle value={deviceMode} onChange={setDeviceMode} />

          {/* Indicador de overrides y boton reset */}
          {currentOverrideCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {currentOverrideCount} {deviceMode === 'all' ? 'override' : ''}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={handleResetDevice}
                title={deviceMode === 'all' ? 'Limpiar todos los overrides' : 'Resetear'}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {getModeDescription()}
        </p>
      </div>

      {/* Tabs - Contenido y Diseno */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="rounded-none border-b border-border bg-transparent h-9 px-4 w-full justify-start gap-0">
          <TabsTrigger
            value="content"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
          >
            Contenido
          </TabsTrigger>
          <TabsTrigger
            value="design"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3 gap-1"
          >
            <Wand2 className="h-3 w-3" />
            Diseno
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-y-auto p-4 mt-0">
          <ContentFields block={block} onUpdate={onUpdate} userId={userId} creatorProfileId={creatorProfileId} deviceMode={deviceMode} />

          {/* Seccion de sugerencias del ADN de Talento */}
          {hasDNA && dnaSuggestions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <Label className="flex items-center gap-2 text-xs font-medium mb-3">
                <Dna className="h-4 w-4 text-purple-400" />
                Datos de tu ADN
              </Label>
              <p className="text-[10px] text-muted-foreground mb-3">
                Usa contenido de tu ADN de Talento en este bloque
              </p>
              <div className="space-y-2">
                {dnaSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion.dnaPath}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs h-auto py-2 px-3"
                    onClick={() => handleApplyDNASuggestion(suggestion)}
                  >
                    <Sparkles className="h-3 w-3 mr-2 text-amber-400 flex-shrink-0" />
                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className="font-medium">Usar: {suggestion.label}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-full">
                        {suggestion.preview}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="design" className="flex-1 overflow-y-auto p-4 mt-0">
          <AdvancedStylesTab
            styles={block.styles}
            onStylesChange={(updates) => onUpdate({ styles: { ...block.styles, ...updates } })}
            userId={userId}
            creatorProfileId={creatorProfileId}
            deviceMode={deviceMode}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
