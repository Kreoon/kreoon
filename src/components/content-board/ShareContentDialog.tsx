import { Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PostComposer } from "@/modules/social/components/Composer/PostComposer";
import { getPrimaryVideoUrl } from "@/components/board/KanbanCardVideoPreview";
import type { Content } from "@/types/database";
import type { ShareMode } from "./kanban/kanbanTypes";

interface ShareContentDialogProps {
  content: Content | null;
  mode: ShareMode;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo único de compartir (antes había uno por tarjeta, montado aunque estuviera cerrado).
 * Solo se monta cuando hay una producción seleccionada; el PostComposer solo vive mientras está abierto.
 * - "full": opción de ir al Social Hub con el contenido precargado + publicación rápida.
 * - "quick": solo el compositor (el antiguo QuickShareButton del menú de admin).
 */
export function ShareContentDialog({ content, mode, onOpenChange }: ShareContentDialogProps) {
  const navigate = useNavigate();
  if (!content) return null;
  const videoUrl = getPrimaryVideoUrl(content);
  const initialData = {
    contentId: content.id,
    title: content.title || "",
    videoUrl,
    thumbnailUrl: content.thumbnail_url || null,
    caption: content.title || "",
  };
  const close = () => onOpenChange(false);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Compartir en redes sociales</DialogTitle>
          <DialogDescription className="truncate">{content.title}</DialogDescription>
        </DialogHeader>
        {mode === "full" && (
          <>
            <button
              type="button"
              onClick={() => {
                close();
                navigate("/social-hub", { state: { shareContent: initialData } });
              }}
              className="mb-4 flex w-full items-center gap-3 rounded-[var(--radius-control,0.75rem)] border border-primary/30 bg-accent p-3 text-left transition-colors hover:bg-accent/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-control,0.75rem)] bg-primary/15">
                <Share2 className="h-4 w-4 text-primary" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">Crear publicación en Social Hub</span>
                <span className="block text-xs text-muted-foreground">Ir al Social Hub con este contenido precargado</span>
              </span>
            </button>
            <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" />o publicar rápido<span className="h-px flex-1 bg-border" />
            </p>
          </>
        )}
        <PostComposer initialData={initialData} onSuccess={close} onClose={close} />
      </DialogContent>
    </Dialog>
  );
}
