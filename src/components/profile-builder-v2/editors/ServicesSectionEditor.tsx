import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type SectionEditorProps, patchContent } from "./types";

interface ServiceItem {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
}

export function ServicesSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const content = section.block.content as Record<string, unknown>;
  const items = Array.isArray(content.items)
    ? (content.items as ServiceItem[])
    : [];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="services-title">Título de la sección</Label>
        <Input
          id="services-title"
          value={(content.title as string) ?? ""}
          placeholder="Mis servicios"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { title: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Servicios actuales</Label>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
            Aún no hay servicios. Se conectarán con tus servicios del
            marketplace más adelante.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={item.id ?? index}
                className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                {item.title || item.name || `Servicio ${index + 1}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        La gestión completa de servicios se conectará con el marketplace en un
        paso posterior.
      </p>
    </div>
  );
}
