/**
 * Advanced Styles Tab para Profile Builder Pro
 *
 * Tab que agrupa todos los controles de diseno avanzados.
 * Se integra en BlockSettingsPanel como tercer tab.
 */

import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Palette, Type, Box, Sparkles, Layers, ImagePlus, Link2, X, Square } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ColorPickerAdvanced } from './ColorPickerAdvanced';
import { GradientBuilder, type GradientStop, type GradientType } from './GradientBuilder';
import { SpacingControl, type SpacingValues } from './SpacingControl';
import { ShadowBuilder, type BoxShadow } from './ShadowBuilder';
import { TypographyControl, type TypographyValues } from './TypographyControl';
import { AnimationPicker, type AnimationConfig } from './AnimationPicker';
import { type DeviceMode } from './ResponsiveToggle';
import { MediaLibraryPicker, type MediaItem } from '../media';
import type { BlockStyles } from '../types/profile-builder';

interface AdvancedStylesTabProps {
  styles: BlockStyles;
  onStylesChange: (updates: Partial<BlockStyles>) => void;
  userId?: string;
  creatorProfileId?: string;
  /** Dispositivo actual - controlado desde el padre */
  deviceMode?: DeviceMode;
}

// Seccion colapsable
function StyleSection({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-4 pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdvancedStylesTab({ styles, onStylesChange, userId, creatorProfileId, deviceMode = 'all' }: AdvancedStylesTabProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('upload');

  // Obtener estilos efectivos segun dispositivo
  const effectiveStyles = useMemo((): BlockStyles => {
    // 'all' y 'desktop' muestran los estilos base
    if (deviceMode === 'all' || deviceMode === 'desktop') {
      return styles;
    }
    // tablet y mobile muestran estilos base + overrides
    const overrides = styles.responsiveOverrides?.[deviceMode] || {};
    return { ...styles, ...overrides };
  }, [styles, deviceMode]);

  // Handler para cambios de estilo segun dispositivo
  const handleStyleChange = useCallback((updates: Partial<BlockStyles>) => {
    // Excluir responsiveOverrides de los updates para evitar conflictos
    const { responsiveOverrides: _, ...cleanUpdates } = updates as BlockStyles;

    if (deviceMode === 'all') {
      // 'all' aplica a estilos base Y limpia los overrides de esas propiedades
      const currentOverrides = styles.responsiveOverrides || {};
      const updatedKeys = Object.keys(cleanUpdates);

      // Limpiar esas propiedades de tablet y mobile overrides
      const cleanedTablet = { ...(currentOverrides.tablet || {}) };
      const cleanedMobile = { ...(currentOverrides.mobile || {}) };
      updatedKeys.forEach(key => {
        delete cleanedTablet[key as keyof typeof cleanedTablet];
        delete cleanedMobile[key as keyof typeof cleanedMobile];
      });

      const newOverrides: typeof currentOverrides = {};
      if (Object.keys(cleanedTablet).length > 0) newOverrides.tablet = cleanedTablet;
      if (Object.keys(cleanedMobile).length > 0) newOverrides.mobile = cleanedMobile;

      onStylesChange({
        ...cleanUpdates,
        responsiveOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
      });
    } else if (deviceMode === 'desktop') {
      // Desktop solo modifica estilos base, preserva overrides
      onStylesChange(cleanUpdates);
    } else {
      // tablet/mobile guardan en responsiveOverrides
      const currentOverrides = styles.responsiveOverrides || {};
      const deviceOverrides = currentOverrides[deviceMode] || {};
      onStylesChange({
        responsiveOverrides: {
          ...currentOverrides,
          [deviceMode]: { ...deviceOverrides, ...cleanUpdates },
        },
      });
    }
  }, [deviceMode, styles.responsiveOverrides, onStylesChange]);

  // Helpers para convertir entre formatos (usan effectiveStyles para mostrar valor correcto)
  const getSpacingValues = (prefix: 'paddingCustom' | 'marginCustom'): SpacingValues => {
    const custom = effectiveStyles[prefix];
    return custom || { top: '0px', right: '0px', bottom: '0px', left: '0px' };
  };

  const getShadows = (): BoxShadow[] => {
    return effectiveStyles.boxShadows || [{ x: 0, y: 4, blur: 6, spread: 0, color: 'rgba(0,0,0,0.1)' }];
  };

  const getTypography = (): TypographyValues => ({
    fontFamily: effectiveStyles.fontFamily,
    fontSize: effectiveStyles.fontSize,
    fontWeight: effectiveStyles.fontWeight,
    lineHeight: effectiveStyles.lineHeight,
    letterSpacing: effectiveStyles.letterSpacing,
    textTransform: effectiveStyles.textTransform as TypographyValues['textTransform'],
    textAlign: effectiveStyles.textAlign as TypographyValues['textAlign'],
  });

  const getAnimation = (): AnimationConfig => ({
    type: effectiveStyles.animation || 'none',
    duration: effectiveStyles.animationDuration,
    delay: effectiveStyles.animationDelay,
    easing: effectiveStyles.animationEasing,
    trigger: effectiveStyles.animationTrigger as AnimationConfig['trigger'],
  });

  const getGradientStops = (): GradientStop[] => {
    return effectiveStyles.gradientStops || [
      { color: '#8B5CF6', position: 0 },
      { color: '#EC4899', position: 100 },
    ];
  };

  return (
    <div className="space-y-3">
      {/* Colores y Fondo */}
      <StyleSection icon={Palette} title="Colores y Fondo" defaultOpen>
        <div className="space-y-4">
          {/* Tipo de fondo */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo de fondo</Label>
            <Select
              value={effectiveStyles.backgroundType || 'color'}
              onValueChange={(v) => handleStyleChange({ backgroundType: v as BlockStyles['backgroundType'] })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="color">Color solido</SelectItem>
                <SelectItem value="gradient">Gradiente</SelectItem>
                <SelectItem value="image">Imagen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color de fondo */}
          {(!effectiveStyles.backgroundType || effectiveStyles.backgroundType === 'color') && (
            <ColorPickerAdvanced
              label="Color de fondo"
              value={effectiveStyles.backgroundColor || 'transparent'}
              onChange={(color) => handleStyleChange({ backgroundColor: color })}
            />
          )}

          {/* Gradiente */}
          {effectiveStyles.backgroundType === 'gradient' && (
            <GradientBuilder
              type={(effectiveStyles.gradientType as GradientType) || 'linear'}
              angle={effectiveStyles.gradientAngle || 135}
              stops={getGradientStops()}
              onTypeChange={(type) => handleStyleChange({ gradientType: type })}
              onAngleChange={(angle) => handleStyleChange({ gradientAngle: angle })}
              onStopsChange={(stops) => handleStyleChange({ gradientStops: stops })}
            />
          )}

          {/* Imagen de fondo */}
          {effectiveStyles.backgroundType === 'image' && (
            <div className="space-y-3">
              {/* Toggle URL / Upload */}
              <div className="flex gap-1 p-0.5 bg-muted rounded-md">
                <button
                  type="button"
                  onClick={() => setImageInputMode('upload')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
                    imageInputMode === 'upload'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <ImagePlus className="h-3 w-3" />
                  Subir
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('url')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
                    imageInputMode === 'url'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Link2 className="h-3 w-3" />
                  URL
                </button>
              </div>

              {/* Vista previa + acciones */}
              {effectiveStyles.backgroundImage ? (
                <div className="relative rounded-md overflow-hidden border border-border">
                  <img
                    src={effectiveStyles.backgroundImage}
                    alt="Fondo"
                    className="w-full h-24 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {imageInputMode === 'upload' && userId && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setMediaPickerOpen(true)}
                      >
                        <ImagePlus className="h-3.5 w-3.5 mr-1" />
                        Cambiar
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStyleChange({ backgroundImage: undefined })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : imageInputMode === 'upload' ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed flex flex-col gap-1"
                  onClick={() => setMediaPickerOpen(true)}
                  disabled={!userId}
                >
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {userId ? 'Seleccionar imagen' : 'Inicia sesion para subir'}
                  </span>
                </Button>
              ) : (
                <Input
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={effectiveStyles.backgroundImage || ''}
                  onChange={(e) => handleStyleChange({ backgroundImage: e.target.value })}
                  className="h-8 text-xs"
                />
              )}

              {/* Opciones de imagen */}
              {effectiveStyles.backgroundImage && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Posicion</Label>
                    <Select
                      value={effectiveStyles.backgroundPosition || 'center'}
                      onValueChange={(v) => handleStyleChange({ backgroundPosition: v as BlockStyles['backgroundPosition'] })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="top">Arriba</SelectItem>
                        <SelectItem value="bottom">Abajo</SelectItem>
                        <SelectItem value="left">Izquierda</SelectItem>
                        <SelectItem value="right">Derecha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tamano</Label>
                    <Select
                      value={effectiveStyles.backgroundSize || 'cover'}
                      onValueChange={(v) => handleStyleChange({ backgroundSize: v as BlockStyles['backgroundSize'] })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cubrir</SelectItem>
                        <SelectItem value="contain">Contener</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estilo de overlay */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Estilo de overlay</Label>
                    <Select
                      value={effectiveStyles.backgroundOverlayStyle || 'gradient-bottom'}
                      onValueChange={(v) => handleStyleChange({ backgroundOverlayStyle: v as BlockStyles['backgroundOverlayStyle'] })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin overlay</SelectItem>
                        <SelectItem value="full">Completo</SelectItem>
                        <SelectItem value="gradient-bottom">Gradiente desde abajo</SelectItem>
                        <SelectItem value="gradient-top">Gradiente desde arriba</SelectItem>
                        <SelectItem value="gradient-center">Vineta (bordes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Intensidad del overlay */}
                  {effectiveStyles.backgroundOverlayStyle !== 'none' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Intensidad: {effectiveStyles.backgroundOverlayIntensity ?? 50}%
                      </Label>
                      <Slider
                        value={[effectiveStyles.backgroundOverlayIntensity ?? 50]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([v]) => handleStyleChange({ backgroundOverlayIntensity: v })}
                        className="py-2"
                      />
                    </div>
                  )}

                  {/* Color del overlay */}
                  {effectiveStyles.backgroundOverlayStyle !== 'none' && (
                    <ColorPickerAdvanced
                      label="Color del overlay"
                      value={effectiveStyles.backgroundOverlay || '#000000'}
                      onChange={(color) => handleStyleChange({ backgroundOverlay: color })}
                      showOpacity={false}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Opacidad del fondo */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Opacidad: {effectiveStyles.backgroundOpacity ?? 100}%
            </Label>
            <Slider
              value={[effectiveStyles.backgroundOpacity ?? 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => handleStyleChange({ backgroundOpacity: v })}
              className="py-2"
            />
          </div>

          {/* Separador */}
          <div className="pt-2 border-t border-border">
            <ColorPickerAdvanced
              label="Color de texto"
              value={effectiveStyles.textColor || '#000000'}
              onChange={(color) => handleStyleChange({ textColor: color })}
            />
          </div>
        </div>

        {/* Media Library Picker */}
        {userId && (
          <MediaLibraryPicker
            open={mediaPickerOpen}
            onOpenChange={setMediaPickerOpen}
            onSelect={(media: MediaItem) => {
              handleStyleChange({ backgroundImage: media.url });
              setMediaPickerOpen(false);
            }}
            allowedTypes={['image']}
            userId={userId}
            creatorProfileId={creatorProfileId}
          />
        )}
      </StyleSection>

      {/* Tipografia */}
      <StyleSection icon={Type} title="Tipografia">
        <TypographyControl
          value={getTypography()}
          onChange={(typography) => {
            handleStyleChange({
              fontFamily: typography.fontFamily,
              fontSize: typography.fontSize,
              fontWeight: typography.fontWeight as BlockStyles['fontWeight'],
              lineHeight: typography.lineHeight,
              letterSpacing: typography.letterSpacing,
              textTransform: typography.textTransform,
              textAlign: typography.textAlign,
            });
          }}
        />
      </StyleSection>

      {/* Espaciado */}
      <StyleSection icon={Box} title="Espaciado">
        <div className="space-y-6">
          <SpacingControl
            label="Padding (interno)"
            value={getSpacingValues('paddingCustom')}
            onChange={(values) => handleStyleChange({ paddingCustom: values })}
          />

          <SpacingControl
            label="Margin (externo)"
            value={getSpacingValues('marginCustom')}
            onChange={(values) => handleStyleChange({ marginCustom: values })}
          />
        </div>
      </StyleSection>

      {/* Bordes */}
      <StyleSection icon={Square} title="Bordes">
        <div className="space-y-4">
          {/* Estilo de borde */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Estilo de borde</Label>
            <Select
              value={effectiveStyles.borderStyle || 'none'}
              onValueChange={(v) => handleStyleChange({ borderStyle: v as BlockStyles['borderStyle'] })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin borde</SelectItem>
                <SelectItem value="solid">Solido</SelectItem>
                <SelectItem value="dashed">Discontinuo</SelectItem>
                <SelectItem value="dotted">Punteado</SelectItem>
                <SelectItem value="double">Doble</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grosor y color solo si hay borde */}
          {effectiveStyles.borderStyle && effectiveStyles.borderStyle !== 'none' && (
            <>
              {/* Grosor de borde */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Grosor del borde</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[parseInt(effectiveStyles.borderWidth || '1', 10)]}
                    min={1}
                    max={16}
                    step={1}
                    onValueChange={([v]) => handleStyleChange({ borderWidth: `${v}px` })}
                    className="flex-1 py-2"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                    {effectiveStyles.borderWidth || '1px'}
                  </span>
                </div>
              </div>

              {/* Color del borde */}
              <ColorPickerAdvanced
                label="Color del borde"
                value={effectiveStyles.borderColor || '#e4e4e7'}
                onChange={(color) => handleStyleChange({ borderColor: color })}
              />
            </>
          )}

          {/* Radio de borde */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Radio de esquinas</Label>
            <Select
              value={effectiveStyles.borderRadius || 'none'}
              onValueChange={(v) => handleStyleChange({ borderRadius: v as BlockStyles['borderRadius'] })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Cuadrado (0)</SelectItem>
                <SelectItem value="sm">Suave (4px)</SelectItem>
                <SelectItem value="md">Medio (8px)</SelectItem>
                <SelectItem value="lg">Redondeado (12px)</SelectItem>
                <SelectItem value="full">Circular (9999px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Radio personalizado por esquina */}
          {effectiveStyles.borderRadius !== 'none' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Radio por esquina (px)</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'tl', label: 'Sup. izq.' },
                    { key: 'tr', label: 'Sup. der.' },
                    { key: 'bl', label: 'Inf. izq.' },
                    { key: 'br', label: 'Inf. der.' },
                  ] as const
                ).map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{label}</Label>
                    <Input
                      type="text"
                      placeholder="8px"
                      value={effectiveStyles.borderRadiusCustom?.[key] || ''}
                      onChange={(e) =>
                        handleStyleChange({
                          borderRadiusCustom: {
                            tl: '0px',
                            tr: '0px',
                            br: '0px',
                            bl: '0px',
                            ...(effectiveStyles.borderRadiusCustom || {}),
                            [key]: e.target.value,
                          },
                        })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
              {effectiveStyles.borderRadiusCustom && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground w-full"
                  onClick={() => handleStyleChange({ borderRadiusCustom: undefined })}
                >
                  Limpiar radios personalizados
                </Button>
              )}
            </div>
          )}
        </div>
      </StyleSection>

      {/* Sombras */}
      <StyleSection icon={Layers} title="Sombras">
        <ShadowBuilder
          shadows={getShadows()}
          onChange={(shadows) => handleStyleChange({ boxShadows: shadows })}
        />
      </StyleSection>

      {/* Animaciones */}
      <StyleSection icon={Sparkles} title="Animacion">
        <AnimationPicker
          value={getAnimation()}
          onChange={(animation) => {
            handleStyleChange({
              animation: animation.type,
              animationDuration: animation.duration,
              animationDelay: animation.delay,
              animationEasing: animation.easing,
              animationTrigger: animation.trigger,
            });
          }}
        />
      </StyleSection>
    </div>
  );
}

export default AdvancedStylesTab;
