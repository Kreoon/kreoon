import {
  TextField,
  SwitchField,
  patchContent,
  patchConfig,
  asString,
  asBool,
  type SectionEditorProps,
} from "./fields";

interface PricingPackage {
  id?: string;
  name?: string;
  title?: string;
  price?: number | string;
}

export function PricingSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const { content, config } = section.block;
  const packages = Array.isArray(content.packages)
    ? (content.packages as PricingPackage[])
    : Array.isArray(content.items)
      ? (content.items as PricingPackage[])
      : [];

  return (
    <div className="space-y-4">
      <TextField
        label="Titulo de la seccion"
        value={asString(content.title)}
        placeholder="Precios"
        onChange={(v) => patchContent(section, onUpdateBlock, "title", v)}
      />
      <SwitchField
        label="Mostrar moneda"
        checked={asBool(config.showCurrency)}
        onChange={(v) => patchConfig(section, onUpdateBlock, "showCurrency", v)}
      />

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Paquetes</p>
        {packages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aun no hay paquetes definidos.
          </p>
        ) : (
          <ul className="space-y-1">
            {packages.map((pkg, index) => (
              <li
                key={pkg.id ?? index}
                className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                <span>{pkg.name || pkg.title || `Paquete ${index + 1}`}</span>
                {pkg.price != null && (
                  <span className="text-muted-foreground">
                    {String(pkg.price)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
