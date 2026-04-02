/**
 * Typography Control para Profile Builder Pro
 *
 * Control avanzado de tipografia.
 * Features:
 * - Selector de fuente (Google Fonts populares)
 * - Tamano de fuente con slider
 * - Peso de fuente
 * - Line height
 * - Letter spacing
 * - Text transform
 * - Text align
 */

import { useCallback } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  CaseSensitive,
  CaseUpper,
  CaseLower
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export interface TypographyValues {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

interface TypographyControlProps {
  value: TypographyValues;
  onChange: (value: TypographyValues) => void;
  className?: string;
}

// Fuentes populares (Google Fonts + system)
const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter', category: 'sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'sans-serif' },
  { value: 'Nunito', label: 'Nunito', category: 'sans-serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'serif' },
  { value: 'Lora', label: 'Lora', category: 'serif' },
  { value: 'Georgia', label: 'Georgia', category: 'serif' },
  { value: 'Space Mono', label: 'Space Mono', category: 'monospace' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'monospace' },
  { value: 'Fira Code', label: 'Fira Code', category: 'monospace' },
];

const FONT_WEIGHTS = [
  { value: '100', label: 'Thin' },
  { value: '200', label: 'Extra Light' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' },
];

const FONT_SIZE_PRESETS = [
  { value: '12px', label: 'XS' },
  { value: '14px', label: 'SM' },
  { value: '16px', label: 'Base' },
  { value: '18px', label: 'LG' },
  { value: '20px', label: 'XL' },
  { value: '24px', label: '2XL' },
  { value: '30px', label: '3XL' },
  { value: '36px', label: '4XL' },
  { value: '48px', label: '5XL' },
  { value: '60px', label: '6XL' },
];

export function TypographyControl({ value, onChange, className }: TypographyControlProps) {
  const parseSize = (val: string | undefined): number => {
    if (!val) return 16;
    const num = parseFloat(val);
    return isNaN(num) ? 16 : num;
  };

  const parseLineHeight = (val: string | undefined): number => {
    if (!val) return 1.5;
    const num = parseFloat(val);
    return isNaN(num) ? 1.5 : num;
  };

  const parseLetterSpacing = (val: string | undefined): number => {
    if (!val) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const handleUpdate = useCallback(
    (updates: Partial<TypographyValues>) => {
      onChange({ ...value, ...updates });
    },
    [value, onChange]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preview */}
      <div
        className="p-4 rounded-lg bg-muted/30 border border-border min-h-[60px] flex items-center justify-center"
        style={{
          fontFamily: value.fontFamily || 'Inter',
          fontSize: value.fontSize || '16px',
          fontWeight: value.fontWeight || '400',
          lineHeight: value.lineHeight || '1.5',
          letterSpacing: value.letterSpacing || '0px',
          textTransform: value.textTransform || 'none',
          textAlign: value.textAlign || 'left',
        }}
      >
        <span className="text-foreground">Texto de ejemplo Aa</span>
      </div>

      {/* Fuente */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Fuente</Label>
        <Select
          value={value.fontFamily || 'Inter'}
          onValueChange={(v) => handleUpdate({ fontFamily: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <div className="text-[10px] text-muted-foreground px-2 py-1">Sans Serif</div>
            {FONT_FAMILIES.filter((f) => f.category === 'sans-serif').map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
            <div className="text-[10px] text-muted-foreground px-2 py-1 mt-1">Serif</div>
            {FONT_FAMILIES.filter((f) => f.category === 'serif').map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
            <div className="text-[10px] text-muted-foreground px-2 py-1 mt-1">Monospace</div>
            {FONT_FAMILIES.filter((f) => f.category === 'monospace').map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tamano y Peso */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tamano */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Tamano</Label>
            <span className="text-xs font-mono text-muted-foreground">
              {value.fontSize || '16px'}
            </span>
          </div>
          <Slider
            value={[parseSize(value.fontSize)]}
            onValueChange={([v]) => handleUpdate({ fontSize: `${v}px` })}
            min={10}
            max={72}
            step={1}
          />
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1 mt-1">
            {FONT_SIZE_PRESETS.slice(0, 5).map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant={value.fontSize === preset.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => handleUpdate({ fontSize: preset.value })}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Peso */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Peso</Label>
          <Select
            value={value.fontWeight || '400'}
            onValueChange={(v) => handleUpdate({ fontWeight: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((weight) => (
                <SelectItem key={weight.value} value={weight.value}>
                  <span style={{ fontWeight: weight.value }}>{weight.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Interlineado</Label>
          <span className="text-xs font-mono text-muted-foreground">
            {value.lineHeight || '1.5'}
          </span>
        </div>
        <Slider
          value={[parseLineHeight(value.lineHeight) * 100]}
          onValueChange={([v]) => handleUpdate({ lineHeight: `${(v / 100).toFixed(2)}` })}
          min={80}
          max={250}
          step={5}
        />
      </div>

      {/* Letter Spacing */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Espaciado de letras</Label>
          <span className="text-xs font-mono text-muted-foreground">
            {value.letterSpacing || '0px'}
          </span>
        </div>
        <Slider
          value={[parseLetterSpacing(value.letterSpacing)]}
          onValueChange={([v]) => handleUpdate({ letterSpacing: `${v}px` })}
          min={-5}
          max={20}
          step={0.5}
        />
      </div>

      {/* Text Transform */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Transformacion</Label>
        <ToggleGroup
          type="single"
          value={value.textTransform || 'none'}
          onValueChange={(v) => v && handleUpdate({ textTransform: v as TypographyValues['textTransform'] })}
          className="justify-start"
        >
          <ToggleGroupItem value="none" className="h-7 px-2">
            <CaseSensitive className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="uppercase" className="h-7 px-2">
            <CaseUpper className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="lowercase" className="h-7 px-2">
            <CaseLower className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="capitalize" className="h-7 px-2 text-xs">
            Aa
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Text Align */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Alineacion</Label>
        <ToggleGroup
          type="single"
          value={value.textAlign || 'left'}
          onValueChange={(v) => v && handleUpdate({ textAlign: v as TypographyValues['textAlign'] })}
          className="justify-start"
        >
          <ToggleGroupItem value="left" className="h-7 px-2">
            <AlignLeft className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" className="h-7 px-2">
            <AlignCenter className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" className="h-7 px-2">
            <AlignRight className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="justify" className="h-7 px-2">
            <AlignJustify className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

export default TypographyControl;
