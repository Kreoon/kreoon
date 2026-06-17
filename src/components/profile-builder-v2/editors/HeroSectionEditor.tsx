import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type SectionEditorProps, patchConfig, patchContent } from "./types";

export function HeroSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const content = section.block.content as Record<string, string | undefined>;
  const config = section.block.config as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="hero-headline">Titular</Label>
        <Input
          id="hero-headline"
          value={content.headline ?? ""}
          placeholder="Tu nombre o frase principal"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { headline: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hero-subheadline">Frase de apoyo</Label>
        <Textarea
          id="hero-subheadline"
          rows={2}
          value={content.subheadline ?? ""}
          placeholder="Una línea que explique lo que haces"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { subheadline: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hero-role">Rol o especialidad</Label>
        <Input
          id="hero-role"
          value={content.role ?? ""}
          placeholder="Ej. Creador UGC · Fotógrafo"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { role: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hero-avatar">URL del avatar</Label>
        <Input
          id="hero-avatar"
          value={content.avatarUrl ?? ""}
          placeholder="https://..."
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { avatarUrl: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hero-cover">URL de portada</Label>
        <Input
          id="hero-cover"
          value={content.coverUrl ?? ""}
          placeholder="https://..."
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { coverUrl: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hero-cta">Texto del botón</Label>
        <Input
          id="hero-cta"
          value={(config.ctaText as string) ?? ""}
          placeholder="Ver portafolio"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchConfig(section, { ctaText: event.target.value }),
            )
          }
        />
      </div>
    </div>
  );
}
