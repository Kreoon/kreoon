import {
  SelectField,
  SwitchField,
  patchConfig,
  asBool,
  type SectionEditorProps,
} from "./fields";

export function PortfolioSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const { config } = section.block;
  const layout = typeof config.layout === "string" ? config.layout : "grid";
  const columns = typeof config.columns === "number" ? config.columns : 3;

  return (
    <div className="space-y-4">
      <SelectField
        label="Estilo de galeria"
        value={layout}
        options={[
          { value: "grid", label: "Cuadricula" },
          { value: "masonry", label: "Mosaico" },
          { value: "featured", label: "Destacado" },
        ]}
        onChange={(v) => patchConfig(section, onUpdateBlock, "layout", v)}
      />
      <SelectField
        label="Columnas"
        value={String(columns)}
        options={[
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
        ]}
        onChange={(v) =>
          patchConfig(section, onUpdateBlock, "columns", Number(v))
        }
      />
      <SwitchField
        label="Mostrar titulos"
        checked={asBool(config.showTitles)}
        onChange={(v) => patchConfig(section, onUpdateBlock, "showTitles", v)}
      />
      <p className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
        Los trabajos se gestionan desde tu portafolio de medios. La conexion con
        la biblioteca llegara en un proximo paso.
      </p>
    </div>
  );
}
