import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatorPlanFeatures } from "@/hooks/useCreatorPlanFeatures";
import { type SectionEditorProps, patchConfig, patchContent } from "./types";

export function ContactSectionEditor({
  section,
  onUpdateBlock,
}: SectionEditorProps) {
  const { canUseBlock } = useCreatorPlanFeatures();
  const content = section.block.content as Record<string, string | undefined>;
  const config = section.block.config as Record<string, unknown>;
  const isLocked = !canUseBlock(section.type);

  return (
    <div className="space-y-4">
      {isLocked && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            El contacto directo es una función Premium. Puedes editarla, pero
            solo será visible con un plan Premium.
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="contact-button">Texto del botón</Label>
        <Input
          id="contact-button"
          value={(config.buttonText as string) ?? ""}
          placeholder="Enviar mensaje"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchConfig(section, { buttonText: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          value={content.email ?? ""}
          placeholder="hola@tudominio.com"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { email: event.target.value }),
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-whatsapp">WhatsApp</Label>
        <Input
          id="contact-whatsapp"
          value={content.whatsapp ?? ""}
          placeholder="+57 300 000 0000"
          onChange={(event) =>
            onUpdateBlock(
              section.blockId,
              patchContent(section, { whatsapp: event.target.value }),
            )
          }
        />
      </div>
    </div>
  );
}
