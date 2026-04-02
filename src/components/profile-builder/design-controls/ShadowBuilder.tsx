/**
 * Shadow Builder para Profile Builder Pro
 *
 * Constructor visual de box-shadow.
 * Features:
 * - Multiples sombras (capas)
 * - X, Y offset con sliders
 * - Blur y spread
 * - Color con opacidad
 * - Inset toggle
 * - Preview en tiempo real
 * - Presets de sombras populares
 */

import { useState, useCallback, useMemo } from 'react';
import { HexColorPicker } from 'react-colorful';
import { colord } from 'colord';
import { Plus, Trash2, Copy, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface BoxShadow {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset?: boolean;
}

interface ShadowBuilderProps {
  shadows: BoxShadow[];
  onChange: (shadows: BoxShadow[]) => void;
  className?: string;
}

// Presets de sombras
const SHADOW_PRESETS: { name: string; shadows: BoxShadow[] }[] = [
  {
    name: 'Sutil',
    shadows: [{ x: 0, y: 1, blur: 2, spread: 0, color: 'rgba(0,0,0,0.05)' }],
  },
  {
    name: 'Elevacion sm',
    shadows: [
      { x: 0, y: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.1)' },
      { x: 0, y: 1, blur: 2, spread: -1, color: 'rgba(0,0,0,0.1)' },
    ],
  },
  {
    name: 'Elevacion md',
    shadows: [
      { x: 0, y: 4, blur: 6, spread: -1, color: 'rgba(0,0,0,0.1)' },
      { x: 0, y: 2, blur: 4, spread: -2, color: 'rgba(0,0,0,0.1)' },
    ],
  },
  {
    name: 'Elevacion lg',
    shadows: [
      { x: 0, y: 10, blur: 15, spread: -3, color: 'rgba(0,0,0,0.1)' },
      { x: 0, y: 4, blur: 6, spread: -4, color: 'rgba(0,0,0,0.1)' },
    ],
  },
  {
    name: 'Glow',
    shadows: [{ x: 0, y: 0, blur: 20, spread: 0, color: 'rgba(139,92,246,0.3)' }],
  },
  {
    name: 'Inset',
    shadows: [{ x: 0, y: 2, blur: 4, spread: 0, color: 'rgba(0,0,0,0.1)', inset: true }],
  },
];

const DEFAULT_SHADOW: BoxShadow = {
  x: 0,
  y: 4,
  blur: 6,
  spread: 0,
  color: 'rgba(0,0,0,0.1)',
  inset: false,
};

export function ShadowBuilder({ shadows, onChange, className }: ShadowBuilderProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hiddenLayers, setHiddenLayers] = useState<Set<number>>(new Set());
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // Generar CSS de sombra
  const shadowCSS = useMemo(() => {
    return shadows
      .filter((_, i) => !hiddenLayers.has(i))
      .map((s) => {
        const insetStr = s.inset ? 'inset ' : '';
        return `${insetStr}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
      })
      .join(', ');
  }, [shadows, hiddenLayers]);

  const handleAddShadow = useCallback(() => {
    if (shadows.length >= 5) return;
    onChange([...shadows, { ...DEFAULT_SHADOW }]);
    setSelectedIndex(shadows.length);
  }, [shadows, onChange]);

  const handleRemoveShadow = useCallback(
    (index: number) => {
      if (shadows.length <= 1) return;
      const newShadows = shadows.filter((_, i) => i !== index);
      onChange(newShadows);
      setSelectedIndex(Math.min(selectedIndex, newShadows.length - 1));
    },
    [shadows, selectedIndex, onChange]
  );

  const handleDuplicateShadow = useCallback(
    (index: number) => {
      if (shadows.length >= 5) return;
      const newShadows = [...shadows];
      newShadows.splice(index + 1, 0, { ...shadows[index] });
      onChange(newShadows);
      setSelectedIndex(index + 1);
    },
    [shadows, onChange]
  );

  const handleToggleVisibility = useCallback((index: number) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const updateShadow = useCallback(
    (index: number, updates: Partial<BoxShadow>) => {
      const newShadows = shadows.map((s, i) => (i === index ? { ...s, ...updates } : s));
      onChange(newShadows);
    },
    [shadows, onChange]
  );

  const applyPreset = useCallback(
    (preset: (typeof SHADOW_PRESETS)[0]) => {
      onChange(preset.shadows);
      setSelectedIndex(0);
      setHiddenLayers(new Set());
    },
    [onChange]
  );

  const selectedShadow = shadows[selectedIndex];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preview */}
      <div className="flex items-center justify-center h-24 rounded-lg bg-muted/30 border border-border">
        <div
          className="w-20 h-14 rounded-md bg-background transition-shadow"
          style={{ boxShadow: shadowCSS || 'none' }}
        />
      </div>

      {/* Capas de sombra */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Capas ({shadows.length}/5)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={handleAddShadow}
            disabled={shadows.length >= 5}
          >
            <Plus className="h-3 w-3" />
            Agregar
          </Button>
        </div>

        <div className="space-y-1.5">
          {shadows.map((shadow, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 p-1.5 rounded-md border transition-colors cursor-pointer',
                selectedIndex === index
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
                hiddenLayers.has(index) && 'opacity-50'
              )}
              onClick={() => setSelectedIndex(index)}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

              {/* Preview mini */}
              <div
                className="h-6 w-10 rounded-sm bg-background border border-border flex-shrink-0"
                style={{
                  boxShadow: `${shadow.inset ? 'inset ' : ''}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`,
                }}
              />

              <span className="text-xs text-muted-foreground flex-1 truncate">
                {shadow.inset ? 'Inset' : 'Drop'} {shadow.x}/{shadow.y}
              </span>

              {/* Acciones */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleVisibility(index);
                }}
              >
                {hiddenLayers.has(index) ? (
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Eye className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateShadow(index);
                }}
                disabled={shadows.length >= 5}
              >
                <Copy className="h-3 w-3 text-muted-foreground" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveShadow(index);
                }}
                disabled={shadows.length <= 1}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor de sombra seleccionada */}
      {selectedShadow && (
        <div className="space-y-4 p-3 rounded-lg bg-muted/30 border border-border">
          {/* X offset */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Offset X</Label>
              <span className="text-xs font-mono text-muted-foreground">{selectedShadow.x}px</span>
            </div>
            <Slider
              value={[selectedShadow.x]}
              onValueChange={([v]) => updateShadow(selectedIndex, { x: v })}
              min={-50}
              max={50}
              step={1}
            />
          </div>

          {/* Y offset */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Offset Y</Label>
              <span className="text-xs font-mono text-muted-foreground">{selectedShadow.y}px</span>
            </div>
            <Slider
              value={[selectedShadow.y]}
              onValueChange={([v]) => updateShadow(selectedIndex, { y: v })}
              min={-50}
              max={50}
              step={1}
            />
          </div>

          {/* Blur */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Blur</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {selectedShadow.blur}px
              </span>
            </div>
            <Slider
              value={[selectedShadow.blur]}
              onValueChange={([v]) => updateShadow(selectedIndex, { blur: v })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Spread */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Spread</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {selectedShadow.spread}px
              </span>
            </div>
            <Slider
              value={[selectedShadow.spread]}
              onValueChange={([v]) => updateShadow(selectedIndex, { spread: v })}
              min={-50}
              max={50}
              step={1}
            />
          </div>

          {/* Color */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-10 rounded-md border border-border"
                  style={{ backgroundColor: selectedShadow.color }}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <HexColorPicker
                  color={colord(selectedShadow.color).toHex()}
                  onChange={(color) => {
                    const alpha = colord(selectedShadow.color).alpha();
                    updateShadow(selectedIndex, {
                      color: colord(color).alpha(alpha).toRgbString(),
                    });
                  }}
                />
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Opacidad</Label>
                  <Slider
                    value={[Math.round(colord(selectedShadow.color).alpha() * 100)]}
                    onValueChange={([v]) => {
                      updateShadow(selectedIndex, {
                        color: colord(selectedShadow.color)
                          .alpha(v / 100)
                          .toRgbString(),
                      });
                    }}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Inset toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-xs text-muted-foreground">Inset</Label>
              <Switch
                checked={selectedShadow.inset || false}
                onCheckedChange={(checked) => updateShadow(selectedIndex, { inset: checked })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {SHADOW_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className={cn(
                'h-12 rounded-md border border-border bg-muted/30 hover:border-primary/50',
                'flex items-center justify-center transition-all hover:scale-105'
              )}
            >
              <div
                className="w-8 h-6 rounded-sm bg-background"
                style={{
                  boxShadow: preset.shadows
                    .map((s) => `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`)
                    .join(', '),
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* CSS output */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">CSS</Label>
        <div className="p-2 rounded-md bg-muted/50 border border-border">
          <code className="text-[10px] font-mono text-muted-foreground break-all">
            box-shadow: {shadowCSS || 'none'};
          </code>
        </div>
      </div>
    </div>
  );
}

export default ShadowBuilder;
