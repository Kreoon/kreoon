import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TECH_PRESETS = [
  { value: "#6b7280", label: "Gris" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#a855f7", label: "Purpura" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#22d3ee", label: "Cian claro" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#22c55e", label: "Verde" },
  { value: "#eab308", label: "Amarillo" },
  { value: "#f97316", label: "Naranja" },
  { value: "#ef4444", label: "Rojo" },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-white/20 bg-white/5 hover:bg-white/10",
            "focus:ring-[#a855f7]/50 focus:border-[#a855f7]/50",
            className
          )}
        >
          <div
            className="h-4 w-4 rounded-full border-2 border-white/30"
            style={{ backgroundColor: value }}
          />
          <span className="text-[#cbd5e1]">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-4 bg-[#0a0118] border-[#8b5cf6]/30"
        align="start"
      >
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#94a3b8]">Presets tech</p>
          <div className="grid grid-cols-6 gap-1.5">
            {TECH_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange(p.value)}
                className={cn(
                  "h-8 w-8 rounded-lg border-2 transition-all",
                  "hover:scale-110",
                  value === p.value
                    ? "border-[#a855f7] ring-2 ring-[#a855f7]/50"
                    : "border-white/20 hover:border-white/40"
                )}
                style={{ backgroundColor: p.value }}
                title={p.label}
              />
            ))}
          </div>
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs font-medium text-[#94a3b8] mb-2">Custom</p>
            <div className="flex gap-2">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-white/20 bg-transparent"
              />
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                className="flex-1 h-9 bg-white/5 border-white/20 text-[#f8fafc] text-sm font-mono"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
