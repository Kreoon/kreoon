/**
 * Gradient Builder para Profile Builder Pro
 *
 * Features:
 * - Gradientes lineales, radiales y conicos
 * - Angulo ajustable para lineales
 * - Multiples color stops con posicion
 * - Preview en tiempo real
 * - Presets de gradientes populares
 */

import { useState, useCallback, useMemo } from 'react';
import { HexColorPicker } from 'react-colorful';
import { colord } from 'colord';
import { Plus, Trash2, RotateCw, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface GradientStop {
  color: string;
  position: number;
}

export type GradientType = 'linear' | 'radial' | 'conic';

interface GradientBuilderProps {
  type: GradientType;
  angle: number;
  stops: GradientStop[];
  onTypeChange: (type: GradientType) => void;
  onAngleChange: (angle: number) => void;
  onStopsChange: (stops: GradientStop[]) => void;
  className?: string;
}

// Presets de gradientes populares
const GRADIENT_PRESETS = [
  {
    name: 'Kreoon',
    type: 'linear' as GradientType,
    angle: 135,
    stops: [
      { color: '#8B5CF6', position: 0 },
      { color: '#EC4899', position: 100 },
    ],
  },
  {
    name: 'Sunset',
    type: 'linear' as GradientType,
    angle: 45,
    stops: [
      { color: '#F59E0B', position: 0 },
      { color: '#EF4444', position: 50 },
      { color: '#EC4899', position: 100 },
    ],
  },
  {
    name: 'Ocean',
    type: 'linear' as GradientType,
    angle: 180,
    stops: [
      { color: '#3B82F6', position: 0 },
      { color: '#06B6D4', position: 100 },
    ],
  },
  {
    name: 'Forest',
    type: 'linear' as GradientType,
    angle: 135,
    stops: [
      { color: '#10B981', position: 0 },
      { color: '#059669', position: 100 },
    ],
  },
  {
    name: 'Night',
    type: 'linear' as GradientType,
    angle: 180,
    stops: [
      { color: '#1E1B4B', position: 0 },
      { color: '#312E81', position: 50 },
      { color: '#4C1D95', position: 100 },
    ],
  },
  {
    name: 'Fire',
    type: 'radial' as GradientType,
    angle: 0,
    stops: [
      { color: '#FCD34D', position: 0 },
      { color: '#F59E0B', position: 50 },
      { color: '#DC2626', position: 100 },
    ],
  },
];

export function GradientBuilder({
  type,
  angle,
  stops,
  onTypeChange,
  onAngleChange,
  onStopsChange,
  className,
}: GradientBuilderProps) {
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const [editingStopColor, setEditingStopColor] = useState<string | null>(null);

  // Generar string CSS del gradiente
  const gradientCSS = useMemo(() => {
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);
    const stopsStr = sortedStops.map((s) => `${s.color} ${s.position}%`).join(', ');

    switch (type) {
      case 'linear':
        return `linear-gradient(${angle}deg, ${stopsStr})`;
      case 'radial':
        return `radial-gradient(circle, ${stopsStr})`;
      case 'conic':
        return `conic-gradient(from ${angle}deg, ${stopsStr})`;
      default:
        return `linear-gradient(${angle}deg, ${stopsStr})`;
    }
  }, [type, angle, stops]);

  const handleAddStop = useCallback(() => {
    if (stops.length >= 5) return;

    // Encontrar posicion intermedia
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);
    let newPosition = 50;
    if (sortedStops.length >= 2) {
      const lastTwo = sortedStops.slice(-2);
      newPosition = Math.round((lastTwo[0].position + lastTwo[1].position) / 2);
    }

    // Interpolar color
    const newColor = '#A855F7';
    onStopsChange([...stops, { color: newColor, position: newPosition }]);
    setSelectedStopIndex(stops.length);
  }, [stops, onStopsChange]);

  const handleRemoveStop = useCallback(
    (index: number) => {
      if (stops.length <= 2) return;
      const newStops = stops.filter((_, i) => i !== index);
      onStopsChange(newStops);
      setSelectedStopIndex(Math.min(selectedStopIndex, newStops.length - 1));
    },
    [stops, selectedStopIndex, onStopsChange]
  );

  const handleStopColorChange = useCallback(
    (index: number, color: string) => {
      const newStops = stops.map((s, i) => (i === index ? { ...s, color } : s));
      onStopsChange(newStops);
    },
    [stops, onStopsChange]
  );

  const handleStopPositionChange = useCallback(
    (index: number, position: number) => {
      const newStops = stops.map((s, i) => (i === index ? { ...s, position } : s));
      onStopsChange(newStops);
    },
    [stops, onStopsChange]
  );

  const applyPreset = useCallback(
    (preset: (typeof GRADIENT_PRESETS)[0]) => {
      onTypeChange(preset.type);
      onAngleChange(preset.angle);
      onStopsChange(preset.stops);
      setSelectedStopIndex(0);
    },
    [onTypeChange, onAngleChange, onStopsChange]
  );

  const selectedStop = stops[selectedStopIndex];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preview */}
      <div
        className="h-20 rounded-lg border border-border shadow-inner"
        style={{ background: gradientCSS }}
      />

      {/* Tipo y angulo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={type} onValueChange={(v) => onTypeChange(v as GradientType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Lineal</SelectItem>
              <SelectItem value="radial">Radial</SelectItem>
              <SelectItem value="conic">Conico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(type === 'linear' || type === 'conic') && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Angulo</Label>
              <span className="text-xs font-mono text-muted-foreground">{angle}°</span>
            </div>
            <div className="flex items-center gap-2">
              <Slider
                value={[angle]}
                onValueChange={([v]) => onAngleChange(v)}
                min={0}
                max={360}
                step={15}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAngleChange((angle + 45) % 360)}
              >
                <RotateCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Color stops */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Colores ({stops.length}/5)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={handleAddStop}
            disabled={stops.length >= 5}
          >
            <Plus className="h-3 w-3" />
            Agregar
          </Button>
        </div>

        {/* Lista de stops */}
        <div className="space-y-1.5">
          {stops.map((stop, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 p-1.5 rounded-md border transition-colors cursor-pointer',
                selectedStopIndex === index
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => setSelectedStopIndex(index)}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

              {/* Color swatch */}
              <Popover
                open={editingStopColor === `${index}`}
                onOpenChange={(open) => setEditingStopColor(open ? `${index}` : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-6 w-6 rounded-sm border border-border shadow-sm flex-shrink-0"
                    style={{ backgroundColor: stop.color }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <HexColorPicker
                    color={stop.color}
                    onChange={(color) => handleStopColorChange(index, color)}
                  />
                </PopoverContent>
              </Popover>

              {/* Posicion slider */}
              <div className="flex-1 flex items-center gap-2">
                <Slider
                  value={[stop.position]}
                  onValueChange={([v]) => handleStopPositionChange(index, v)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                  {stop.position}%
                </span>
              </div>

              {/* Delete */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveStop(index);
                }}
                disabled={stops.length <= 2}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {GRADIENT_PRESETS.map((preset) => {
            const presetCSS =
              preset.type === 'linear'
                ? `linear-gradient(${preset.angle}deg, ${preset.stops.map((s) => `${s.color} ${s.position}%`).join(', ')})`
                : preset.type === 'radial'
                  ? `radial-gradient(circle, ${preset.stops.map((s) => `${s.color} ${s.position}%`).join(', ')})`
                  : `conic-gradient(from ${preset.angle}deg, ${preset.stops.map((s) => `${s.color} ${s.position}%`).join(', ')})`;

            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  'h-10 rounded-md border border-border hover:border-primary/50 transition-all',
                  'hover:scale-105 hover:shadow-md'
                )}
                style={{ background: presetCSS }}
                title={preset.name}
              />
            );
          })}
        </div>
      </div>

      {/* CSS output */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">CSS</Label>
        <div className="p-2 rounded-md bg-muted/50 border border-border">
          <code className="text-[10px] font-mono text-muted-foreground break-all">
            {gradientCSS}
          </code>
        </div>
      </div>
    </div>
  );
}

export default GradientBuilder;
