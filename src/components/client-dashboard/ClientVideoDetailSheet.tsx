import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { CommentsSection } from "@/components/content/CommentsSection";
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from "@/types/database";
import { getBunnyVideoUrls, extractBunnyIds } from "@/hooks/useHLSPlayer";
import { updateContentStatusWithUP } from "@/hooks/useContentStatusWithUP";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, ThumbsUp, AlertTriangle,
  FileText, MessageCircle, Video, Loader2, List
} from "lucide-react";
import { toast } from "sonner";

interface ClientVideoDetailSheetProps {
  content: Content | null;
  userId?: string;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

function buildBunnyEmbedUrl(libraryId: string, videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&preload=true&responsive=true&controls=true`;
}

export function ClientVideoDetailSheet({
  content,
  userId,
  open,
  onClose,
  onUpdate,
}: ClientVideoDetailSheetProps) {
  const [variantIndex, setVariantIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const videoUrls = useMemo(() => {
    if (!content) return [];
    const urls: string[] = [];
    if (content.bunny_embed_url) urls.push(content.bunny_embed_url);
    if (content.video_url && !urls.includes(content.video_url)) urls.push(content.video_url);
    const extra = content.video_urls as string[] | null;
    if (extra) extra.filter(u => u?.trim() && !urls.includes(u)).forEach(u => urls.push(u));
    return urls.filter(u => u?.trim());
  }, [content]);

  const currentUrl = videoUrls[variantIndex] || videoUrls[0] || "";

  const bunnyIds = useMemo(() => currentUrl ? extractBunnyIds(currentUrl) : null, [currentUrl]);
  const canUseNativePlayer = bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId));
  const embedUrl = canUseNativePlayer
    ? buildBunnyEmbedUrl(bunnyIds!.libraryId, bunnyIds!.videoId)
    : null;

  const bunnyUrls = useMemo(() => currentUrl ? getBunnyVideoUrls(currentUrl) : null, [currentUrl]);
  const thumbnailSrc = bunnyUrls?.thumbnail || content?.thumbnail_url;

  const canApprove = content?.status === "delivered" || content?.status === "corrected" || content?.status === "review";
  const canReject = content?.status === "delivered" || content?.status === "review";

  const handleAction = async (newStatus: ContentStatus, label: string) => {
    if (!content || !userId) return;
    setSubmitting(true);
    try {
      await updateContentStatusWithUP({
        contentId: content.id,
        oldStatus: content.status as ContentStatus,
        newStatus,
      });
      if (newStatus === "approved") {
        await supabase.rpc("update_content_by_id", {
          p_content_id: content.id,
          p_updates: { approved_by: userId },
        });
      }
      if (feedback.trim()) {
        await supabase.from("content_comments").insert({
          content_id: content.id,
          user_id: userId,
          comment: `${label}: ${feedback.trim()}`,
        });
      }
      toast.success(label);
      setFeedback("");
      setShowFeedback(false);
      onUpdate?.();
      onClose();
    } catch {
      toast.error("Error al actualizar el estado");
    } finally {
      setSubmitting(false);
    }
  };

  if (!content) return null;

  const statusColor = STATUS_COLORS[content.status as keyof typeof STATUS_COLORS] || "bg-gray-500";
  const statusLabel = STATUS_LABELS[content.status as keyof typeof STATUS_LABELS] || content.status;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-base font-semibold truncate">{content.title}</DialogTitle>
            <Badge className={cn("text-[10px] shrink-0", statusColor)}>{statusLabel}</Badge>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Left: video player */}
          <div className="md:w-[340px] shrink-0 bg-black flex flex-col items-center justify-center relative">
            <div className="w-full" style={{ aspectRatio: "9/16", maxHeight: "calc(90vh - 120px)" }}>
              {currentUrl ? (
                embedUrl ? (
                  <iframe
                    key={embedUrl}
                    src={embedUrl}
                    title={content.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={currentUrl}
                    src={bunnyUrls?.mp4 || bunnyUrls?.hls || currentUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                    poster={thumbnailSrc || undefined}
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="h-12 w-12 text-zinc-600" />
                </div>
              )}
            </div>

            {/* Variant navigation */}
            {videoUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full">
                <button
                  onClick={() => setVariantIndex(i => Math.max(0, i - 1))}
                  disabled={variantIndex === 0}
                  className="text-white disabled:opacity-30 hover:bg-white/20 rounded p-0.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-white text-xs font-medium min-w-[50px] text-center">
                  {variantIndex + 1} / {videoUrls.length}
                </span>
                <button
                  onClick={() => setVariantIndex(i => Math.min(videoUrls.length - 1, i + 1))}
                  disabled={variantIndex === videoUrls.length - 1}
                  className="text-white disabled:opacity-30 hover:bg-white/20 rounded p-0.5"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right: info tabs */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Tabs defaultValue="script" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-4 mt-3 mb-0 shrink-0 w-auto self-start">
                <TabsTrigger value="script" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Guión
                </TabsTrigger>
                {videoUrls.length > 1 && (
                  <TabsTrigger value="variants" className="gap-1.5 text-xs">
                    <List className="h-3.5 w-3.5" />
                    Variantes ({videoUrls.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="comments" className="gap-1.5 text-xs">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Comentarios
                </TabsTrigger>
              </TabsList>

              {/* Script */}
              <TabsContent value="script" className="flex-1 overflow-hidden mt-0 px-4 py-3">
                <ScrollArea className="h-full">
                  {content.script ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none
                        prose-headings:font-semibold prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100
                        prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-p:leading-relaxed
                        prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100
                        prose-li:text-zinc-700 dark:prose-li:text-zinc-300
                        prose-hr:border-zinc-200 dark:prose-hr:border-zinc-700
                        [&_em]:text-zinc-500 dark:[&_em]:text-zinc-400"
                      dangerouslySetInnerHTML={{ __html: content.script }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-2">
                      <FileText className="h-8 w-8" />
                      <p className="text-sm">Sin guión registrado</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Variants */}
              {videoUrls.length > 1 && (
                <TabsContent value="variants" className="flex-1 overflow-hidden mt-0 px-4 py-3">
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {videoUrls.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setVariantIndex(idx)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors",
                            idx === variantIndex
                              ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
                              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                          )}
                        >
                          <span className="font-medium">Variante {idx + 1}</span>
                          <span className="block text-xs text-zinc-500 truncate mt-0.5">{url}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {/* Comments */}
              <TabsContent value="comments" className="flex-1 overflow-hidden mt-0 px-4 py-3">
                <CommentsSection contentId={content.id} isOpen={open} compact />
              </TabsContent>
            </Tabs>

            {/* Approve / Reject actions */}
            {(canApprove || canReject) && (
              <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-2">
                {showFeedback && (
                  <Textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Describe las correcciones necesarias..."
                    className="resize-none text-sm"
                    rows={3}
                  />
                )}
                <div className="flex gap-2">
                  {canApprove && (
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      onClick={() => handleAction("approved", "Aprobado")}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                      Aprobar
                    </Button>
                  )}
                  {canReject && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 gap-1.5"
                      onClick={() => {
                        if (!showFeedback) {
                          setShowFeedback(true);
                        } else {
                          handleAction("issue", "Corrección solicitada");
                        }
                      }}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {showFeedback ? "Enviar corrección" : "Correcciones"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
