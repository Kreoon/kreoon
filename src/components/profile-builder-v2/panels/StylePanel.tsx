import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BuilderConfig } from "@/components/profile-builder/types/profile-builder";

interface StylePanelProps {
  config: BuilderConfig;
  onChange: (updates: Partial<BuilderConfig>) => void;
}

const ACCENT_COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#6366F1",
  "#0F172A",
];

const FONT_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "poppins", label: "Poppins" },
  { value: "montserrat", label: "Montserrat" },
  { value: "playfair", label: "Playfair Display" },
  { value: "roboto", label: "Roboto" },
];

const RADIUS_OPTIONS: {
  value: BuilderConfig["borderRadius"];
  label: string;
}[] = [
  { value: "none", label: "Recto" },
  { value: "sm", label: "Suave" },
  { value: "md", label: "Medio" },
  { value: "lg", label: "Redondeado" },
];

const SPACING_OPTIONS: { value: BuilderConfig["spacing"]; label: string }[] = [
  { value: "compact", label: "Compacto" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Amplio" },
];

export function StylePanel({ config, onChange }: StylePanelProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Color principal</Label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((color) => {
            const isActive =
              config.accentColor?.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ accentColor: color })}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                title={color}
                aria-label={`Color ${color}`}
              >
                {isActive && <Check className="h-4 w-4 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tema</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => onChange({ theme })}
              className={[
                "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                config.theme === theme
                  ? "border-slate-900 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
              ].join(" ")}
            >
              {theme === "light" ? "Claro" : "Oscuro"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Fuente de títulos</Label>
        <Select
          value={config.fontHeading}
          onValueChange={(value) => onChange({ fontHeading: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Fuente de texto</Label>
        <Select
          value={config.fontBody}
          onValueChange={(value) => onChange({ fontBody: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Bordes</Label>
        <Select
          value={config.borderRadius}
          onValueChange={(value) =>
            onChange({ borderRadius: value as BuilderConfig["borderRadius"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RADIUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Espaciado</Label>
        <Select
          value={config.spacing}
          onValueChange={(value) =>
            onChange({ spacing: value as BuilderConfig["spacing"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPACING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
