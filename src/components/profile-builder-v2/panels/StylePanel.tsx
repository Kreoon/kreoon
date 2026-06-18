import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BuilderConfig } from "@/components/profile-builder/types/profile-builder";

interface StylePanelProps {
  config: BuilderConfig;
  onChange: (updates: Partial<BuilderConfig>) => void;
}

const ACCENT_COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9",
  "#111827",
];
const FONTS: Array<{ value: string; label: string }> = [
  { value: "inter", label: "Inter" },
  { value: "poppins", label: "Poppins" },
  { value: "montserrat", label: "Montserrat" },
  { value: "playfair", label: "Playfair" },
  { value: "roboto", label: "Roboto" },
];
const SPACINGS: Array<{ value: BuilderConfig["spacing"]; label: string }> = [
  { value: "compact", label: "Compacto" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Amplio" },
];
const RADII: Array<{ value: BuilderConfig["borderRadius"]; label: string }> = [
  { value: "none", label: "Recto" },
  { value: "sm", label: "Suave" },
  { value: "md", label: "Medio" },
  { value: "lg", label: "Redondo" },
];

export function StylePanel({ config, onChange }: StylePanelProps) {
  return (
    <div className="space-y-5">
      {/* Color de acento */}
      <div className="space-y-2">
        <Label className="text-xs">Color de acento</Label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ accentColor: color })}
              aria-label={`Color ${color}`}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                config.accentColor.toLowerCase() === color.toLowerCase()
                  ? "border-foreground"
                  : "border-transparent",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Tema */}
      <Segment
        label="Tema"
        value={config.theme}
        options={[
          { value: "light", label: "Claro" },
          { value: "dark", label: "Oscuro" },
        ]}
        onChange={(v) => onChange({ theme: v as BuilderConfig["theme"] })}
      />

      {/* Fuente de titulos */}
      <Segment
        label="Fuente de titulos"
        value={config.fontHeading}
        options={FONTS}
        onChange={(v) => onChange({ fontHeading: v })}
      />

      {/* Fuente de cuerpo */}
      <Segment
        label="Fuente de cuerpo"
        value={config.fontBody}
        options={FONTS}
        onChange={(v) => onChange({ fontBody: v })}
      />

      {/* Espaciado */}
      <Segment
        label="Espaciado"
        value={config.spacing}
        options={SPACINGS}
        onChange={(v) => onChange({ spacing: v as BuilderConfig["spacing"] })}
      />

      {/* Bordes */}
      <Segment
        label="Bordes"
        value={config.borderRadius}
        options={RADII}
        onChange={(v) =>
          onChange({ borderRadius: v as BuilderConfig["borderRadius"] })
        }
      />
    </div>
  );
}

interface SegmentProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function Segment({ label, value, options, onChange }: SegmentProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              value === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
