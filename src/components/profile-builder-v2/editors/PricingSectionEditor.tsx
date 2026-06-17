import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type SectionEditorProps, patchConfig, patchContent } from "./types";

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
  const content = section.block.content as Record<string, unknown>;
  const config = section.block.config as Record<string, unknown>;
  const packages = Array.isArray(content.packages)
    ? (content.packages as PricingPackage[])
    : Array.isArray(content.items)
      ? (content.items as PricingPackage[])
      : [];
  const showCurrency = (config.showCurrency as boolean) ?? true;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pricing-title">Título de la sección</Label>
        <Input
          id="pricing-title"
          value={(content.title as string) ?? ""}
          placeholder="Planes y precios"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { title: event.target.value }),
            )
          }
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <Label htmlFor="pricing-currency" className="cursor-pointer">
          Mostrar moneda
        </Label>
        <Switch
          id="pricing-currency"
          checked={showCurrency}
          onCheckedChange={(checked) =>
            onUpdateBlock(
              section.blockId,
              patchConfig(section, { showCurrency: checked }),
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Paquetes actuales</Label>
        {packages.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
            Aún no hay paquetes configurados.
          </p>
        ) : (
          <ul className="space-y-2">
            {packages.map((pkg, index) => (
              <li
                key={pkg.id ?? index}
                className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                <span>{pkg.name || pkg.title || `Paquete ${index + 1}`}</span>
                {pkg.price != null && (
                  <span className="text-muted-foreground">{pkg.price}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
