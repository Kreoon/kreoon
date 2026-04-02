/**
 * Color Picker Avanzado para Profile Builder Pro
 *
 * Features:
 * - Selector de color HEX, RGB, HSL
 * - Opacidad ajustable
 * - Colores recientes
 * - Presets de colores de marca
 * - Eyedropper (cuando el navegador lo soporta)
 */

import { useState, useCallback, useEffect } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import { Pipette, RotateCcw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

extend([namesPlugin]);

// Colores preset de KREOON
const BRAND_PRESETS = [
  { name: 'Primario', color: '#8B5CF6' },
  { name: 'Secundario', color: '#EC4899' },
  { name: 'Exito', color: '#10B981' },
  { name: 'Alerta', color: '#F59E0B' },
  { name: 'Error', color: '#EF4444' },
  { name: 'Info', color: '#3B82F6' },
];

const NEUTRAL_PRESETS = [
  '#FFFFFF', '#F4F4F5', '#E4E4E7', '#A1A1AA',
  '#71717A', '#52525B', '#3F3F46', '#27272A',
  '#18181B', '#0A0A0F', '#000000', 'transparent',
];

interface ColorPickerAdvancedProps {
  value: string;
  onChange: (color: string) => void;
  showOpacity?: boolean;
  showPresets?: boolean;
  label?: string;
  className?: string;
}

export function ColorPickerAdvanced({
  value,
  onChange,
  showOpacity = true,
  showPresets = true,
  label,
  className,
}: ColorPickerAdvancedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Parsear color y opacidad
  const parsedColor = colord(value || '#8B5CF6');
  const hexColor = parsedColor.toHex().slice(0, 7);
  const opacity = Math.round(parsedColor.alpha() * 100);

  // Agregar color a recientes al cerrar
  useEffect(() => {
    if (!isOpen && value && !recentColors.includes(value)) {
      setRecentColors((prev) => [value, ...prev.slice(0, 7)]);
    }
  }, [isOpen, value, recentColors]);

  const handleColorChange = useCallback(
    (newHex: string) => {
      const newColor = colord(newHex).alpha(opacity / 100);
      onChange(opacity < 100 ? newColor.toRgbString() : newHex);
    },
    [opacity, onChange]
  );

  const handleOpacityChange = useCallback(
    (newOpacity: number[]) => {
      const alpha = newOpacity[0] / 100;
      const newColor = colord(hexColor).alpha(alpha);
      onChange(alpha < 1 ? newColor.toRgbString() : hexColor);
    },
    [hexColor, onChange]
  );

  const handleEyedropper = useCallback(async () => {
    if (!('EyeDropper' in window)) return;

    try {
      // @ts-expect-error - EyeDropper es experimental
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      onChange(result.sRGBHex);
    } catch {
      // Usuario cancelo
    }
  }, [onChange]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  const handleReset = useCallback(() => {
    onChange('#8B5CF6');
  }, [onChange]);

  const supportsEyedropper = 'EyeDropper' in window;

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 w-full h-9 px-3 rounded-md border border-input bg-background',
              'hover:bg-accent hover:text-accent-foreground transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
          >
            <div
              className="h-5 w-5 rounded-sm border border-border shadow-sm flex-shrink-0"
              style={{
                background:
                  value === 'transparent'
                    ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 8px 8px'
                    : value,
              }}
            />
            <span className="text-xs font-mono flex-1 text-left truncate">
              {value || 'Seleccionar'}
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-4">
            {/* Color picker principal */}
            <HexColorPicker
              color={hexColor}
              onChange={handleColorChange}
              className="!w-full"
            />

            {/* Input HEX + acciones */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 border border-border">
                <span className="text-xs text-muted-foreground">#</span>
                <HexColorInput
                  color={hexColor}
                  onChange={handleColorChange}
                  prefixed={false}
                  className="w-full bg-transparent text-xs font-mono focus:outline-none uppercase"
                />
              </div>

              {supportsEyedropper && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleEyedropper}
                  title="Selector de color"
                >
                  <Pipette className="h-3.5 w-3.5" />
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopy}
                title="Copiar color"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleReset}
                title="Restablecer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Opacidad */}
            {showOpacity && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Opacidad</Label>
                  <span className="text-xs font-mono text-muted-foreground">{opacity}%</span>
                </div>
                <Slider
                  value={[opacity]}
                  onValueChange={handleOpacityChange}
                  min={0}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>
            )}

            {/* Presets */}
            {showPresets && (
              <>
                {/* Colores de marca */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Colores de marca</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {BRAND_PRESETS.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => onChange(preset.color)}
                        className={cn(
                          'h-6 w-6 rounded-md border-2 transition-all',
                          hexColor === preset.color
                            ? 'border-primary scale-110'
                            : 'border-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: preset.color }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Neutros */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Neutros</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {NEUTRAL_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onChange(color)}
                        className={cn(
                          'h-5 w-5 rounded-sm border transition-all',
                          hexColor === color || value === color
                            ? 'border-primary ring-1 ring-primary scale-110'
                            : 'border-border hover:scale-105',
                          color === 'transparent' &&
                            'bg-[repeating-conic-gradient(#808080_0%_25%,transparent_0%_50%)] bg-[length:6px_6px]'
                        )}
                        style={{
                          backgroundColor: color === 'transparent' ? undefined : color,
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Recientes */}
                {recentColors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Recientes</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {recentColors.map((color, i) => (
                        <button
                          key={`${color}-${i}`}
                          type="button"
                          onClick={() => onChange(color)}
                          className={cn(
                            'h-5 w-5 rounded-sm border border-border transition-all hover:scale-105'
                          )}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default ColorPickerAdvanced;
