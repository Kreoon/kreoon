import {
  TextField,
  patchContent,
  asString,
  type SectionEditorProps,
} from "./fields";

interface ServiceItem {
  id?: string;
  title?: string;
  name?: string;
}

export function ServicesSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const { content } = section.block;
  const items = Array.isArray(content.items)
    ? (content.items as ServiceItem[])
    : [];

  return (
    <div className="space-y-4">
      <TextField
        label="Titulo de la seccion"
        value={asString(content.title)}
        placeholder="Mis servicios"
        onChange={(v) => patchContent(section, onUpdateBlock, "title", v)}
      />

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Servicios actuales
        </p>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aun no hay servicios.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item, index) => (
              <li
                key={item.id ?? index}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                {item.title || item.name || `Servicio ${index + 1}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
        La gestion de servicios se conectara con tus servicios del marketplace
        en un proximo paso.
      </p>
    </div>
  );
}
