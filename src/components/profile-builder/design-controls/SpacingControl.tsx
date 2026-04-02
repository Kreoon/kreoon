/**
 * Spacing Control para Profile Builder Pro
 *
 * Control visual tipo Figma para padding y margin.
 * Features:
 * - Vista de caja con valores editables
 * - Input numerico con unidades (px, %, em, rem)
 * - Link para valores uniformes
 * - Drag para ajustar valores
 */

import { useState, useCallback, useRef } from 'react';
import { Link2, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface SpacingValues {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

interface SpacingControlProps {
  label: string;
  value: SpacingValues;
  onChange: (value: SpacingValues) => void;
  className?: string;
}

const POSITIONS = ['top', 'right', 'bottom', 'left'] as const;
type Position = (typeof POSITIONS)[number];

export function SpacingControl({ label, value, onChange, className }: SpacingControlProps) {
  const [linked, setLinked] = useState(false);
  const [activeInput, setActiveInput] = useState<Position | null>(null);
  const inputRefs = useRef<Record<Position, HTMLInputElement | null>>({
    top: null,
    right: null,
    bottom: null,
    left: null,
  });

  const parseValue = (val: string): number => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const getUnit = (val: string): string => {
    const match = val.match(/(px|%|em|rem|vh|vw)$/);
    return match ? match[1] : 'px';
  };

  const handleChange = useCallback(
    (position: Position, newValue: string) => {
      // Normalizar valor
      const numericPart = newValue.replace(/[^0-9.-]/g, '');
      const unit = getUnit(newValue) || getUnit(value[position]) || 'px';
      const finalValue = numericPart ? `${numericPart}${unit}` : '0px';

      if (linked) {
        // Aplicar a todos los lados
        onChange({
          top: finalValue,
          right: finalValue,
          bottom: finalValue,
          left: finalValue,
        });
      } else {
        onChange({
          ...value,
          [position]: finalValue,
        });
      }
    },
    [value, linked, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, position: Position) => {
      const currentValue = parseValue(value[position]);
      const unit = getUnit(value[position]);
      let delta = 0;

      if (e.key === 'ArrowUp') {
        delta = e.shiftKey ? 10 : 1;
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        delta = e.shiftKey ? -10 : -1;
        e.preventDefault();
      }

      if (delta !== 0) {
        const newValue = Math.max(0, currentValue + delta);
        handleChange(position, `${newValue}${unit}`);
      }
    },
    [value, handleChange]
  );

  const allSame =
    value.top === value.right && value.right === value.bottom && value.bottom === value.left;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-6 gap-1 text-xs', linked && 'text-primary')}
          onClick={() => setLinked(!linked)}
        >
          {linked ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
          {linked ? 'Vinculado' : 'Individual'}
        </Button>
      </div>

      {/* Box model visual */}
      <div className="relative flex items-center justify-center p-8 rounded-lg bg-muted/30 border border-border">
        {/* Top */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <Input
            ref={(el) => (inputRefs.current.top = el)}
            type="text"
            value={parseValue(value.top)}
            onChange={(e) => handleChange('top', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'top')}
            onFocus={() => setActiveInput('top')}
            onBlur={() => setActiveInput(null)}
            className={cn(
              'w-12 h-6 text-center text-xs p-0 bg-background',
              activeInput === 'top' && 'ring-2 ring-primary'
            )}
          />
        </div>

        {/* Right */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Input
            ref={(el) => (inputRefs.current.right = el)}
            type="text"
            value={parseValue(value.right)}
            onChange={(e) => handleChange('right', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'right')}
            onFocus={() => setActiveInput('right')}
            onBlur={() => setActiveInput(null)}
            className={cn(
              'w-12 h-6 text-center text-xs p-0 bg-background',
              activeInput === 'right' && 'ring-2 ring-primary'
            )}
          />
        </div>

        {/* Bottom */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <Input
            ref={(el) => (inputRefs.current.bottom = el)}
            type="text"
            value={parseValue(value.bottom)}
            onChange={(e) => handleChange('bottom', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'bottom')}
            onFocus={() => setActiveInput('bottom')}
            onBlur={() => setActiveInput(null)}
            className={cn(
              'w-12 h-6 text-center text-xs p-0 bg-background',
              activeInput === 'bottom' && 'ring-2 ring-primary'
            )}
          />
        </div>

        {/* Left */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <Input
            ref={(el) => (inputRefs.current.left = el)}
            type="text"
            value={parseValue(value.left)}
            onChange={(e) => handleChange('left', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'left')}
            onFocus={() => setActiveInput('left')}
            onBlur={() => setActiveInput(null)}
            className={cn(
              'w-12 h-6 text-center text-xs p-0 bg-background',
              activeInput === 'left' && 'ring-2 ring-primary'
            )}
          />
        </div>

        {/* Centro - el elemento */}
        <div
          className={cn(
            'w-16 h-12 rounded-md border-2 border-dashed',
            'flex items-center justify-center text-xs text-muted-foreground',
            'bg-background/50',
            label.toLowerCase().includes('padding') ? 'border-purple-400/50' : 'border-blue-400/50'
          )}
        >
          <span className="opacity-50">{label.toLowerCase().includes('padding') ? 'P' : 'M'}</span>
        </div>

        {/* Lineas visuales */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {/* Top line */}
          <line
            x1="50%"
            y1="32"
            x2="50%"
            y2="50%"
            stroke={activeInput === 'top' ? '#8B5CF6' : '#A1A1AA'}
            strokeWidth="1"
            strokeDasharray="4 2"
            style={{ transform: 'translateY(-16px)' }}
          />
          {/* Bottom line */}
          <line
            x1="50%"
            y1="50%"
            x2="50%"
            y2="calc(100% - 32px)"
            stroke={activeInput === 'bottom' ? '#8B5CF6' : '#A1A1AA'}
            strokeWidth="1"
            strokeDasharray="4 2"
            style={{ transform: 'translateY(16px)' }}
          />
        </svg>
      </div>

      {/* Tip */}
      <p className="text-[10px] text-muted-foreground text-center">
        Usa flechas ↑↓ para ajustar. Shift + flechas = ±10
      </p>
    </div>
  );
}

export default SpacingControl;
