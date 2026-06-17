import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type SectionEditorProps, patchConfig } from "./types";

const LAYOUT_OPTIONS = [
  { value: "grid", label: "Cuadrícula" },
  { value: "masonry", label: "Mosaico" },
  { value: "featured", label: "Destacado" },
];

const COLUMN_OPTIONS = ["2", "3", "4"];

export function PortfolioSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const config = section.block.config as Record<string, unknown>;
  const layout = (config.layout as string) ?? "grid";
  const columns = String((config.columns as number | string) ?? 3);
  const showTitles = (config.showTitles as boolean) ?? true;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Distribución</Label>
        <Select
          value={layout}
          onValueChange={(value) =>
            onUpdateBlock(
              section.blockId,
              patchConfig(section, { layout: value }),
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LAYOUT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Columnas</Label>
        <Select
          value={columns}
          onValueChange={(value) =>
            onUpdateBlock(
              section.blockId,
              patchConfig(section, { columns: Number(value) }),
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMN_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {value} columnas
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <Label htmlFor="portfolio-titles" className="cursor-pointer">
          Mostrar títulos
        </Label>
        <Switch
          id="portfolio-titles"
          checked={showTitles}
          onCheckedChange={(checked) =>
            onUpdateBlock(
              section.blockId,
              patchConfig(section, { showTitles: checked }),
            )
          }
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Los trabajos se cargan desde tu portafolio. Sube o conecta media desde
        el flujo de medios.
      </p>
    </div>
  );
}
