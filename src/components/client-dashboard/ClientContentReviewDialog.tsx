import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AutoPauseVideo } from '@/components/content/AutoPauseVideo';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';

export interface ClientContentReviewDialogProps {
  selectedContent: Content | null;
  onClose: () => void;
  feedback: string;
  setFeedback: (v: string) => void;
  submitting: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export function ClientContentReviewDialog({
  selectedContent, onClose, feedback, setFeedback, submitting, onApprove, onReject,
}: ClientContentReviewDialogProps) {
  return (
    <Dialog open={!!selectedContent} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg">{selectedContent?.title}</DialogTitle>
        </DialogHeader>

        {selectedContent && (
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 space-y-4">
              <Badge className={STATUS_COLORS[selectedContent.status]}>
                {STATUS_LABELS[selectedContent.status]}
              </Badge>

              {selectedContent.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm mt-1">{selectedContent.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Creador</Label>
                  <p>{selectedContent.creator?.full_name || 'Sin asignar'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Editor</Label>
                  <p>{selectedContent.editor?.full_name || 'Sin asignar'}</p>
                </div>
              </div>

              {selectedContent.script && (
                <div>
                  <Label className="text-xs text-muted-foreground">Guión</Label>
                  <div className="mt-1 p-3 bg-muted rounded-sm whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
                    {selectedContent.script}
                  </div>
                </div>
              )}

              {(() => {
                const urls = (selectedContent.video_urls as string[] | undefined)?.filter(u => u?.trim()) || [];
                const singleUrl = selectedContent.video_url || selectedContent.bunny_embed_url;
                const allUrls = urls.length > 0 ? urls : (singleUrl ? [singleUrl] : []);
                if (allUrls.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {allUrls.length > 1 ? `Videos (${allUrls.length})` : 'Video'}
                    </Label>
                    {allUrls.map((url, i) => (
                      <div key={i} className="rounded-sm overflow-hidden bg-black" style={{ aspectRatio: '9/16', maxHeight: '350px' }}>
                        <AutoPauseVideo
                          src={url}
                          contentId={selectedContent.id}
                          thumbnailUrl={selectedContent.thumbnail_url}
                          className="w-full h-full"
                          autoPlay={false}
                          muted
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(['review', 'delivered', 'corrected'] as ContentStatus[]).includes(selectedContent.status) && (
                <>
                  <div>
                    <Label htmlFor="feedback" className="text-xs text-muted-foreground">
                      Comentarios (opcional para aprobar, requerido para correcciones)
                    </Label>
                    <Textarea
                      id="feedback"
                      placeholder="Escribe tus comentarios o correcciones..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-success hover:bg-success/90"
                      onClick={onApprove}
                      disabled={submitting}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={onReject}
                      disabled={submitting || !feedback}
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Correcciones
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
