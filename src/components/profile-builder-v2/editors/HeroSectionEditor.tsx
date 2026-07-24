import {
  TextField,
  TextAreaField,
  patchContent,
  patchConfig,
  asString,
  type SectionEditorProps,
} from "./fields";

export function HeroSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const { content, config } = section.block;
  return (
    <div className="space-y-4">
      <TextField
        label="Titular"
        value={asString(content.headline)}
        placeholder="Tu nombre o frase principal"
        onChange={(v) => patchContent(section, onUpdateBlock, "headline", v)}
      />
      <TextAreaField
        label="Subtitulo"
        value={asString(content.subheadline)}
        rows={3}
        placeholder="Breve descripcion de lo que haces"
        onChange={(v) => patchContent(section, onUpdateBlock, "subheadline", v)}
      />
      <TextField
        label="Rol / Especialidad"
        value={asString(content.role)}
        placeholder="Ej. Editor de video"
        onChange={(v) => patchContent(section, onUpdateBlock, "role", v)}
      />
      <TextField
        label="URL del avatar"
        value={asString(content.avatarUrl)}
        placeholder="https://..."
        onChange={(v) => patchContent(section, onUpdateBlock, "avatarUrl", v)}
      />
      <TextField
        label="Texto del boton (CTA)"
        value={asString(config.ctaText)}
        placeholder="Ver portafolio"
        onChange={(v) => patchConfig(section, onUpdateBlock, "ctaText", v)}
      />
    </div>
  );
}
