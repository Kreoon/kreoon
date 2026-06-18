import {
  TextField,
  TextAreaField,
  patchContent,
  asString,
  type SectionEditorProps,
} from "./fields";

export function AboutSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const { content } = section.block;
  return (
    <div className="space-y-4">
      <TextField
        label="Titulo"
        value={asString(content.title)}
        placeholder="Sobre mi"
        onChange={(v) => patchContent(section, onUpdateBlock, "title", v)}
      />
      <TextAreaField
        label="Texto"
        value={asString(content.text)}
        rows={6}
        placeholder="Cuenta tu historia, experiencia y lo que te hace unico."
        onChange={(v) => patchContent(section, onUpdateBlock, "text", v)}
      />
    </div>
  );
}
