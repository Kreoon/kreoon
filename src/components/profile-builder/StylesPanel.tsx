import { Sun, Moon, Crown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCreatorPlanFeatures } from '@/hooks/useCreatorPlanFeatures';
import type { BuilderConfig } from './types/profile-builder';

interface StylesPanelProps {
  config: BuilderConfig;
  onChange: (updates: Partial<BuilderConfig>) => void;
}

const ACCENT_COLORS = [
  '#8B5CF6', // violet
  '#6366F1', // indigo
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
];

const FONTS = [
  { value: 'inter', label: 'Inter' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'playfair', label: 'Playfair Display' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'montserrat', label: 'Montserrat' },
];

const SPACING_OPTIONS: { value: BuilderConfig['spacing']; label: string }[] = [
  { value: 'compact', label: 'Compacto' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Amplio' },
];

const RADIUS_OPTIONS: { value: BuilderConfig['borderRadius']; label: string }[] = [
  { value: 'none', label: 'Cuadrado' },
  { value: 'sm', label: 'Suave' },
  { value: 'md', label: 'Medio' },
  { value: 'lg', label: 'Redondeado' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

export function StylesPanel({ config, onChange }: StylesPanelProps) {
  const { canHideBranding } = useCreatorPlanFeatures();

  return (
    <div className="space-y-5 p-4">
      {/* Tema */}
      <div>
        <SectionTitle>Tema</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChange({ theme: 'light' })}
            aria-label="Tema claro"
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-sm border text-sm transition-colors',
              config.theme === 'light'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50'
            )}
          >
            <Sun className="h-4 w-4" />
            Claro
          </button>
          <button
            onClick={() => onChange({ theme: 'dark' })}
            aria-label="Tema oscuro"
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-sm border text-sm transition-colors',
              config.theme === 'dark'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50'
            )}
          >
            <Moon className="h-4 w-4" />
            Oscuro
          </button>
        </div>
      </div>

      {/* Color de acento */}
      <div>
        <SectionTitle>Color de acento</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ accentColor: color })}
              aria-label={`Color de acento ${color}`}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                config.accentColor === color
                  ? 'border-foreground scale-110'
                  : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          {/* Color personalizado */}
          <label
            htmlFor="custom-color"
            className="h-7 w-7 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
            aria-label="Color personalizado"
          >
            <span className="text-xs text-muted-foreground">+</span>
            <input
              id="custom-color"
              type="color"
              value={config.accentColor}
              onChange={(e) => onChange({ accentColor: e.target.value })}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* Fuente de encabezados */}
      <div>
        <SectionTitle>Fuente de encabezados</SectionTitle>
        <select
          value={config.fontHeading}
          onChange={(e) => onChange({ fontHeading: e.target.value })}
          aria-label="Fuente de encabezados"
          className="w-full h-9 rounded-sm border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fuente de cuerpo */}
      <div>
        <SectionTitle>Fuente de cuerpo</SectionTitle>
        <select
          value={config.fontBody}
          onChange={(e) => onChange({ fontBody: e.target.value })}
          aria-label="Fuente de cuerpo"
          className="w-full h-9 rounded-sm border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Espaciado */}
      <div>
        <SectionTitle>Espaciado</SectionTitle>
        <div className="grid grid-cols-3 gap-1.5">
          {SPACING_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ spacing: value })}
              className={cn(
                'py-1.5 rounded-sm border text-xs transition-colors',
                config.spacing === value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Border radius */}
      <div>
        <SectionTitle>Esquinas</SectionTitle>
        <div className="grid grid-cols-2 gap-1.5">
          {RADIUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ borderRadius: value })}
              className={cn(
                'py-1.5 rounded-sm border text-xs transition-colors',
                config.borderRadius === value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Branding Kreoon - Solo Premium puede desactivar */}
      <div className="flex items-center justify-between py-1">
        <div>
          <Label htmlFor="kreoon-branding" className="text-sm font-medium">
            Branding Kreoon
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mostrar "Creado con Kreoon" en tu perfil
          </p>
        </div>
        {canHideBranding ? (
          <Switch
            id="kreoon-branding"
            checked={config.showKreoonBranding}
            onCheckedChange={(checked) => onChange({ showKreoonBranding: checked })}
            aria-label="Mostrar branding de Kreoon"
          />
        ) : (
          <div className="flex items-center gap-2">
            <Switch
              id="kreoon-branding"
              checked
              disabled
              aria-label="Solo disponible en Premium"
            />
            <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-400">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
