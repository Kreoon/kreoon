import { useState, useMemo, useCallback } from 'react';
import { Settings2, Wand2, Monitor, Tablet, Smartphone, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  BLOCK_DEFINITIONS,
  type ProfileBlock,
  type BlockStyles,
  type DeviceType,
  resolveBlockForDevice,
  updateDeviceOverrides,
  hasDeviceOverrides,
} from './types/profile-builder';
import { getConfigLabel, OPTION_LABELS } from './config-labels';
import { AdvancedStylesTab } from './design-controls';
import { STAT_METRICS, type StatMetricKey } from '@/hooks/useCreatorStats';

interface BlockSettingsPanelProps {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
  userId?: string;
  creatorProfileId?: string;
  /** Dispositivo actual del preview (sincronizado con BuilderToolbar) */
  previewDevice?: DeviceType;
}

// ─── Selector de dispositivo ────────────────────────────────────────────────

const DEVICES: { id: DeviceType; icon: typeof Monitor; label: string }[] = [
  { id: 'desktop', icon: Monitor, label: 'Escritorio (base)' },
  { id: 'tablet', icon: Tablet, label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, label: 'Móvil' },
];

function DeviceSelector({
  currentDevice,
  onDeviceChange,
  block,
  onResetDevice,
}: {
  currentDevice: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  block: ProfileBlock;
  onResetDevice: (device: DeviceType) => void;
}) {
  const isNotDesktop = currentDevice !== 'desktop';
  const currentHasOverrides = hasDeviceOverrides(block, currentDevice);

  return (
    <TooltipProvider>
      <div
        className={cn(
          'border-b transition-colors',
          isNotDesktop ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/30 border-border'
        )}
      >
        {/* Selector de dispositivo */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex items-center gap-0.5 bg-background rounded-md p-0.5 flex-1 shadow-sm">
            {DEVICES.map(({ id, icon: Icon, label }) => {
              const hasOverrides = hasDeviceOverrides(block, id);
              const isActive = currentDevice === id;
              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onDeviceChange(id)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded transition-all relative',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium hidden sm:inline">
                        {id === 'desktop' ? 'PC' : id === 'tablet' ? 'Tablet' : 'Móvil'}
                      </span>
                      {hasOverrides && !isActive && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 border border-background" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {label}
                    {hasOverrides && ' (personalizado)'}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          {isNotDesktop && currentHasOverrides && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                  onClick={() => onResetDevice(currentDevice)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Resetear a valores de PC
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Indicador inline cuando no es desktop */}
        {isNotDesktop && (
          <div className="px-3 pb-2">
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Los cambios solo aplican a {currentDevice === 'tablet' ? 'tablets' : 'móviles'}.
              {!currentHasOverrides && ' Actualmente hereda de PC.'}
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── Subcomponentes de campos ────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ─── Hero Banner Settings ────────────────────────────────────────────────────

function HeroBannerSettings({
  block,
  onUpdate,
}: {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
}) {
  const config = block.config as Record<string, unknown>;

  const handleConfigChange = (key: string, value: unknown) => {
    onUpdate({ config: { ...config, [key]: value } });
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

        <FieldRow label="Layout">
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

        <FieldRow label="Posicion del avatar">
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

        <FieldRow label="Tamano del avatar">
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

        <FieldRow label="Forma del avatar">
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

        <FieldRow label="Alineacion del texto">
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

        <FieldRow label="Altura minima">
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

// ─── Stats Settings ─────────────────────────────────────────────────────────

const METRIC_CATEGORIES = {
  projects: { label: 'Proyectos', emoji: '📊' },
  quality: { label: 'Calidad', emoji: '⭐' },
  engagement: { label: 'Engagement', emoji: '👀' },
  social: { label: 'Redes Sociales', emoji: '📱' },
  general: { label: 'General', emoji: '📈' },
};

function StatsSettings({
  block,
  onUpdate,
}: {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
}) {
  const config = block.config as Record<string, unknown>;
  const selectedMetrics = (config.selectedMetrics as StatMetricKey[]) || [];

  const handleToggleMetric = (metricKey: StatMetricKey) => {
    const newMetrics = selectedMetrics.includes(metricKey)
      ? selectedMetrics.filter((m) => m !== metricKey)
      : [...selectedMetrics, metricKey];
    onUpdate({ config: { ...config, selectedMetrics: newMetrics } });
  };

  const handleConfigChange = (key: string, value: unknown) => {
    onUpdate({ config: { ...config, [key]: value } });
  };

  // Agrupar métricas por categoría
  const metricsByCategory = STAT_METRICS.reduce(
    (acc, metric) => {
      if (!acc[metric.category]) acc[metric.category] = [];
      acc[metric.category].push(metric);
      return acc;
    },
    {} as Record<string, typeof STAT_METRICS>
  );

  return (
    <div className="space-y-5">
      {/* Info */}
      <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2">
        Las estadísticas se conectan a tus datos reales de la plataforma
      </p>

      {/* Layout */}
      <FieldRow label="Disposición">
        <Select
          value={(config.layout as string) || 'row'}
          onValueChange={(v) => handleConfigChange('layout', v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="row">Fila centrada</SelectItem>
            <SelectItem value="grid">Cuadrícula</SelectItem>
            <SelectItem value="compact">Compacto</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      {/* Opciones */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Mostrar iconos</Label>
        <Switch
          checked={config.showIcons !== false}
          onCheckedChange={(v) => handleConfigChange('showIcons', v)}
        />
      </div>

      {/* Métricas por categoría */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Selecciona las métricas ({selectedMetrics.length}/6)
        </p>

        {Object.entries(metricsByCategory).map(([category, metrics]) => (
          <div key={category} className="space-y-2">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span>{METRIC_CATEGORIES[category as keyof typeof METRIC_CATEGORIES]?.emoji}</span>
              {METRIC_CATEGORIES[category as keyof typeof METRIC_CATEGORIES]?.label || category}
            </p>
            <div className="space-y-1.5 pl-1">
              {metrics.map((metric) => {
                const isSelected = selectedMetrics.includes(metric.key);
                const isDisabled = !isSelected && selectedMetrics.length >= 6;
                return (
                  <label
                    key={metric.key}
                    className={cn(
                      'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => handleToggleMetric(metric.key)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs flex-1">{metric.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedMetrics.length === 0 && (
        <p className="text-[10px] text-amber-500 text-center">
          Selecciona al menos una métrica para mostrar
        </p>
      )}
    </div>
  );
}

// ─── Portfolio Settings ─────────────────────────────────────────────────────

function PortfolioSettings({
  block,
  onUpdate,
}: {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
}) {
  const config = block.config as Record<string, unknown>;

  const handleConfigChange = (key: string, value: unknown) => {
    onUpdate({ config: { ...config, [key]: value } });
  };

  return (
    <div className="space-y-5">
      {/* Info */}
      <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2">
        Muestra tu portfolio real con thumbnails optimizados de Bunny CDN
      </p>

      {/* Layout */}
      <FieldRow label="Disposición">
        <Select
          value={(config.layout as string) || 'grid'}
          onValueChange={(v) => handleConfigChange('layout', v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Cuadrícula</SelectItem>
            <SelectItem value="masonry">Masonry</SelectItem>
            <SelectItem value="featured">Destacado + Grid</SelectItem>
            <SelectItem value="carousel">Carrusel</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      {/* Columnas */}
      <FieldRow label="Columnas">
        <Select
          value={String(config.columns || 3)}
          onValueChange={(v) => handleConfigChange('columns', Number(v))}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 columnas</SelectItem>
            <SelectItem value="3">3 columnas</SelectItem>
            <SelectItem value="4">4 columnas</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      {/* Aspect Ratio */}
      <FieldRow label="Relación de aspecto">
        <Select
          value={(config.aspectRatio as string) || '9:16'}
          onValueChange={(v) => handleConfigChange('aspectRatio', v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="9:16">9:16 (Vertical/Reels)</SelectItem>
            <SelectItem value="4:5">4:5 (Instagram)</SelectItem>
            <SelectItem value="1:1">1:1 (Cuadrado)</SelectItem>
            <SelectItem value="16:9">16:9 (Horizontal)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      {/* Espaciado */}
      <FieldRow label="Espaciado">
        <Select
          value={(config.gap as string) || 'md'}
          onValueChange={(v) => handleConfigChange('gap', v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Pequeño</SelectItem>
            <SelectItem value="md">Mediano</SelectItem>
            <SelectItem value="lg">Grande</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      {/* Hover effect */}
      <FieldRow label="Efecto hover">
        <Select
          value={(config.hoverEffect as string) || 'overlay'}
          onValueChange={(v) => handleConfigChange('hoverEffect', v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin efecto</SelectItem>
            <SelectItem value="overlay">Overlay oscuro</SelectItem>
            <SelectItem value="zoom">Zoom</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      {/* Max items */}
      <FieldRow label="Máximo de items">
        <Input
          type="number"
          min={1}
          max={50}
          value={config.maxItems as number || 12}
          onChange={(e) => handleConfigChange('maxItems', Number(e.target.value))}
          className="h-8 text-xs"
        />
      </FieldRow>

      {/* Toggles */}
      <div className="space-y-3 pt-2 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Opciones
        </p>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Mostrar títulos</Label>
          <Switch
            checked={config.showTitles !== false}
            onCheckedChange={(v) => handleConfigChange('showTitles', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Mostrar métricas</Label>
          <Switch
            checked={config.showMetrics !== false}
            onCheckedChange={(v) => handleConfigChange('showMetrics', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Badge de destacado</Label>
          <Switch
            checked={config.showFeaturedBadge !== false}
            onCheckedChange={(v) => handleConfigChange('showFeaturedBadge', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Filtro de categoría</Label>
          <Switch
            checked={Boolean(config.showCategoryFilter)}
            onCheckedChange={(v) => handleConfigChange('showCategoryFilter', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Solo destacados</Label>
          <Switch
            checked={Boolean(config.onlyFeatured)}
            onCheckedChange={(v) => handleConfigChange('onlyFeatured', v)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Tab Contenido: campos genéricos según config ───────────────────────────

function ContentFields({
  block,
  onUpdate,
  userId,
  creatorProfileId,
}: {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
  userId?: string;
  creatorProfileId?: string;
}) {
  const definition = BLOCK_DEFINITIONS[block.type];

  // Bloques con panel especializado
  if (block.type === 'hero_banner') {
    return <HeroBannerSettings block={block} onUpdate={onUpdate} />;
  }

  if (block.type === 'stats') {
    return <StatsSettings block={block} onUpdate={onUpdate} />;
  }

  if (block.type === 'portfolio') {
    return <PortfolioSettings block={block} onUpdate={onUpdate} />;
  }

  const handleConfigChange = (key: string, value: unknown) => {
    onUpdate({ config: { ...block.config, [key]: value } });
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
        const currentValue = block.config[key] ?? defaultValue;

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

        // Verificar si hay opciones conocidas para este campo
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

        // string: texto libre
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

// ─── Tab Estilos: edición de BlockStyles ────────────────────────────────────

const PADDING_OPTIONS: BlockStyles['padding'][] = ['none', 'sm', 'md', 'lg', 'xl'];
const SHADOW_OPTIONS: BlockStyles['shadow'][] = ['none', 'sm', 'md', 'lg'];
const RADIUS_OPTIONS: BlockStyles['borderRadius'][] = ['none', 'sm', 'md', 'lg', 'full'];
const WIDTH_OPTIONS: BlockStyles['width'][] = ['full', 'wide', 'normal', 'narrow'];

function OptionPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: (T | undefined)[];
  value: T | undefined;
  onChange: (val: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.filter(Boolean).map((opt) => (
          <button
            key={opt as string}
            onClick={() => onChange(opt as T)}
            className={cn(
              'px-2 py-0.5 rounded-sm border text-[11px] transition-colors',
              value === opt
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function StyleFields({
  block,
  onUpdate,
}: {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
}) {
  const handleStyleChange = (updates: Partial<BlockStyles>) => {
    onUpdate({ styles: { ...block.styles, ...updates } });
  };

  return (
    <div className="space-y-4">
      <OptionPills
        label="Padding"
        options={PADDING_OPTIONS}
        value={block.styles.padding}
        onChange={(v) => handleStyleChange({ padding: v })}
      />

      <OptionPills
        label="Margen"
        options={PADDING_OPTIONS}
        value={block.styles.margin}
        onChange={(v) => handleStyleChange({ margin: v })}
      />

      <OptionPills
        label="Sombra"
        options={SHADOW_OPTIONS}
        value={block.styles.shadow}
        onChange={(v) => handleStyleChange({ shadow: v })}
      />

      <OptionPills
        label="Esquinas"
        options={RADIUS_OPTIONS}
        value={block.styles.borderRadius}
        onChange={(v) => handleStyleChange({ borderRadius: v })}
      />

      <OptionPills
        label="Ancho"
        options={WIDTH_OPTIONS}
        value={block.styles.width}
        onChange={(v) => handleStyleChange({ width: v })}
      />

      <p className="text-[10px] text-muted-foreground pt-2 border-t border-border mt-4">
        Colores, tipografia y animaciones en la pestana "Avanzado"
      </p>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function BlockSettingsPanel({ block, onUpdate, userId, creatorProfileId, previewDevice = 'desktop' }: BlockSettingsPanelProps) {
  const definition = BLOCK_DEFINITIONS[block.type];
  const [editingDevice, setEditingDevice] = useState<DeviceType>(previewDevice);

  // Resolver config/content/styles para el dispositivo actual
  const resolved = useMemo(
    () => resolveBlockForDevice(block, editingDevice),
    [block, editingDevice]
  );

  // Handler para actualizar config (respeta dispositivo)
  const handleConfigUpdate = useCallback(
    (configUpdates: Record<string, unknown>) => {
      if (editingDevice === 'desktop') {
        // Actualizar base directamente
        onUpdate({ config: { ...block.config, ...configUpdates } });
      } else {
        // Actualizar override del dispositivo
        const newOverrides = updateDeviceOverrides(block, editingDevice, {
          config: configUpdates,
        });
        onUpdate({ deviceOverrides: newOverrides });
      }
    },
    [block, editingDevice, onUpdate]
  );

  // Handler para actualizar content (respeta dispositivo)
  const handleContentUpdate = useCallback(
    (contentUpdates: Record<string, unknown>) => {
      if (editingDevice === 'desktop') {
        onUpdate({ content: { ...block.content, ...contentUpdates } });
      } else {
        const newOverrides = updateDeviceOverrides(block, editingDevice, {
          content: contentUpdates,
        });
        onUpdate({ deviceOverrides: newOverrides });
      }
    },
    [block, editingDevice, onUpdate]
  );

  // Handler para actualizar styles (respeta dispositivo)
  const handleStylesUpdate = useCallback(
    (styleUpdates: Partial<BlockStyles>) => {
      if (editingDevice === 'desktop') {
        onUpdate({ styles: { ...block.styles, ...styleUpdates } });
      } else {
        const newOverrides = updateDeviceOverrides(block, editingDevice, {
          styles: styleUpdates,
        });
        onUpdate({ deviceOverrides: newOverrides });
      }
    },
    [block, editingDevice, onUpdate]
  );

  // Handler para resetear dispositivo a valores base
  const handleResetDevice = useCallback(
    (device: DeviceType) => {
      if (device === 'desktop') return;
      const currentOverrides = block.deviceOverrides || {};
      const { [device]: _, ...rest } = currentOverrides;
      onUpdate({
        deviceOverrides: Object.keys(rest).length > 0 ? rest : undefined,
      });
    },
    [block.deviceOverrides, onUpdate]
  );

  // Crear un bloque virtual con los valores resueltos para pasar a los campos
  const resolvedBlock: ProfileBlock = useMemo(
    () => ({
      ...block,
      config: resolved.config,
      content: resolved.content,
      styles: resolved.styles,
    }),
    [block, resolved]
  );

  // Wrapper para onUpdate que maneja dispositivos
  const deviceAwareUpdate = useCallback(
    (updates: Partial<ProfileBlock>) => {
      if (updates.config) {
        handleConfigUpdate(updates.config);
      }
      if (updates.content) {
        handleContentUpdate(updates.content);
      }
      if (updates.styles) {
        handleStylesUpdate(updates.styles);
      }
      // Otras propiedades se actualizan normalmente
      const { config: _, content: __, styles: ___, ...otherUpdates } = updates;
      if (Object.keys(otherUpdates).length > 0) {
        onUpdate(otherUpdates);
      }
    },
    [handleConfigUpdate, handleContentUpdate, handleStylesUpdate, onUpdate]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Encabezado */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{definition.label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{definition.description}</p>
        </div>
      </div>

      {/* Selector de dispositivo - aplica a las 3 pestañas */}
      <DeviceSelector
        currentDevice={editingDevice}
        onDeviceChange={setEditingDevice}
        block={block}
        onResetDevice={handleResetDevice}
      />

      {/* Tabs */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="rounded-none border-b border-border bg-transparent h-9 px-4 w-full justify-start gap-0">
          <TabsTrigger
            value="content"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
          >
            Contenido
          </TabsTrigger>
          <TabsTrigger
            value="styles"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
          >
            Estilos
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3 gap-1"
          >
            <Wand2 className="h-3 w-3" />
            Avanzado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-y-auto p-4 mt-0">
          <ContentFields
            block={resolvedBlock}
            onUpdate={deviceAwareUpdate}
            userId={userId}
            creatorProfileId={creatorProfileId}
          />
        </TabsContent>

        <TabsContent value="styles" className="flex-1 overflow-y-auto p-4 mt-0">
          <StyleFields block={resolvedBlock} onUpdate={deviceAwareUpdate} />
        </TabsContent>

        <TabsContent value="advanced" className="flex-1 overflow-y-auto p-4 mt-0">
          <AdvancedStylesTab
            styles={resolved.styles}
            onStylesChange={handleStylesUpdate}
            userId={userId}
            creatorProfileId={creatorProfileId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
