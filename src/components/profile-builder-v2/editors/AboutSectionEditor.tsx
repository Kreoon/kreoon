import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type SectionEditorProps, patchContent } from "./types";

export function AboutSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const content = section.block.content as Record<string, string | undefined>;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="about-title">Título</Label>
        <Input
          id="about-title"
          value={content.title ?? ""}
          placeholder="Sobre mí"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { title: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="about-text">Biografía</Label>
        <Textarea
          id="about-text"
          rows={6}
          value={content.text ?? ""}
          placeholder="Cuenta quién eres, qué haces y por qué deberían trabajar contigo."
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { text: event.target.value }),
            )
          }
        />
      </div>
    </div>
  );
}
