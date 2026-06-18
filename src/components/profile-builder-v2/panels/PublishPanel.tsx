import { CheckCircle2, Circle, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProfileBlock } from "@/components/profile-builder/types/profile-builder";
import { getPublishChecklist } from "../publish-checklist";

interface PublishPanelProps {
  blocks: ProfileBlock[];
  isSaving: boolean;
  onPreview: () => void;
  onPublish: () => void;
}

export function PublishPanel({
  blocks,
  isSaving,
  onPreview,
  onPublish,
}: PublishPanelProps) {
  const checklist = getPublishChecklist(blocks);
  const completed = checklist.filter((item) => item.isComplete).length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Lista de verificacion</p>
        <p className="text-xs text-muted-foreground">
          {completed} de {checklist.length} completados
        </p>
      </div>

      <ul className="space-y-2">
        {checklist.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            {item.isComplete ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={item.isComplete ? "" : "text-muted-foreground"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2 pt-2">
        <Button variant="outline" className="w-full" onClick={onPreview}>
          <Eye className="mr-1.5 h-4 w-4" />
          Vista previa
        </Button>
        <Button className="w-full" onClick={onPublish} disabled={isSaving}>
          <Send className="mr-1.5 h-4 w-4" />
          Publicar portafolio
        </Button>
      </div>
    </div>
  );
}
