import {
  TextField,
  patchContent,
  patchConfig,
  asString,
  type SectionEditorProps,
} from "./fields";

export function ContactSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const { content, config } = section.block;
  return (
    <div className="space-y-4">
      <TextField
        label="Texto del boton"
        value={asString(config.buttonText)}
        placeholder="Enviar mensaje"
        onChange={(v) => patchConfig(section, onUpdateBlock, "buttonText", v)}
      />
      <TextField
        label="Correo de contacto"
        value={asString(content.email)}
        placeholder="hola@ejemplo.com"
        onChange={(v) => patchContent(section, onUpdateBlock, "email", v)}
      />
      <TextField
        label="WhatsApp / Telefono"
        value={asString(content.phone)}
        placeholder="+57 300 000 0000"
        onChange={(v) => patchContent(section, onUpdateBlock, "phone", v)}
      />
      <TextField
        label="Ubicacion"
        value={asString(content.location)}
        placeholder="Bogota, Colombia"
        onChange={(v) => patchContent(section, onUpdateBlock, "location", v)}
      />
    </div>
  );
}
