import { cn } from '@/lib/utils';
import { KREOON_ACCENT_COLORS, type AccentColorId } from '@/lib/marketplace/profile-customization';
import { Check } from 'lucide-react';

interface ColorPaletteSelectorProps {
  value: AccentColorId;
  onChange: (color: AccentColorId) => void;
  className?: string;
}

export function ColorPaletteSelector({ value, onChange, className }: ColorPaletteSelectorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {KREOON_ACCENT_COLORS.map(color => (
        <button
          key={color.id}
          type="button"
          onClick={() => onChange(color.id)}
          className={cn(
            'relative w-10 h-10 rounded-full transition-all duration-200',
            'ring-2 ring-offset-2 ring-offset-background',
            value === color.id
              ? 'ring-white scale-110'
              : 'ring-transparent hover:ring-white/30 hover:scale-105'
          )}
          style={{ backgroundColor: color.hex }}
          title={color.label}
        >
          {value === color.id && (
            <Check
              className={cn(
                'absolute inset-0 m-auto h-5 w-5',
                color.id === 'white' || color.id === 'yellow' ? 'text-gray-800' : 'text-white'
              )}
            />
          )}
        </button>
      ))}
    </div>
  );
}
