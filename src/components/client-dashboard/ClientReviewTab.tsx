import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScriptReviewCard } from '@/components/content/ScriptReviewCard';
import { ReviewCard } from '@/components/content/ReviewCard';
import { FileText, Video, Eye, CheckCircle2 } from 'lucide-react';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import type { Content } from '@/types/database';

export interface ClientReviewTabProps {
  scriptReviewContent: Content[];
  videoReviewContent: Content[];
  totalPendingReview: number;
  userId?: string;
  onUpdate: () => void;
  onViewScript: (content: Content) => void;
}

export function ClientReviewTab({
  scriptReviewContent, videoReviewContent, totalPendingReview, userId, onUpdate, onViewScript,
}: ClientReviewTabProps) {
  return (
    <div className="space-y-6">
      {scriptReviewContent.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Guiones por Aprobar
            </h2>
            <p className="text-sm text-muted-foreground">
              {scriptReviewContent.length} {scriptReviewContent.length === 1 ? 'guión pendiente' : 'guiones pendientes'} de aprobación
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scriptReviewContent.map((item) => (
              <ScriptReviewCard
                key={item.id}
                content={item}
                userId={userId}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Video className="h-5 w-5 text-info" />
              Videos por Revisar
            </h2>
            <p className="text-sm text-muted-foreground">
              {videoReviewContent.length} {videoReviewContent.length === 1 ? 'video pendiente' : 'videos pendientes'} de revisión
            </p>
          </div>
        </div>

        {videoReviewContent.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
              <h3 className="font-semibold mb-2">Todo al día</h3>
              <p className="text-sm text-muted-foreground">No hay videos pendientes de revisión</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {videoReviewContent.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ReviewCard
                    content={item}
                    userId={userId}
                    onUpdate={onUpdate}
                  />

                  {item.script ? (
                    <Card className="overflow-hidden border-primary/20">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-primary/5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">Guión</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onViewScript(item)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver completo
                        </Button>
                      </div>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[460px]">
                          <div className="p-4">
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none [&_p]:leading-relaxed [&_p]:mb-3 [&_strong]:font-bold [&_em]:text-muted-foreground [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:pl-4 [&_ul]:mb-3 [&_li]:leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: sanitizeHTML(item.script) }}
                            />
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="overflow-hidden border-dashed border-muted-foreground/20">
                      <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Sin guión disponible</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPendingReview === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
            <h3 className="font-semibold mb-2">Todo al día</h3>
            <p className="text-sm text-muted-foreground">No hay contenido pendiente de revisión</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
