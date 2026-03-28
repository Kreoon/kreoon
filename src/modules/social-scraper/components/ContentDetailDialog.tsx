import { ExternalLink, Heart, MessageCircle, Share2, Eye, Bookmark, Brain, Loader2, Copy, Calendar, Hash, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { SOCIAL_PLATFORM_CONFIG, CONTENT_TYPE_LABELS, formatEngagement } from "../config";
import { ContentAnalysisPanel } from "./ContentAnalysisPanel";
import type { ScrapeItem } from "../types/social-scraper.types";

interface ContentDetailDialogProps {
  item: ScrapeItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyze: (itemId: string) => void;
  isAnalyzing?: boolean;
}

export function ContentDetailDialog({ item, open, onOpenChange, onAnalyze, isAnalyzing }: ContentDetailDialogProps) {
  const { toast } = useToast();
  if (!item) return null;

  const platformConfig = SOCIAL_PLATFORM_CONFIG[item.platform];
  const contentLabel = CONTENT_TYPE_LABELS[item.content_type] || item.content_type;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado al portapapeles" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={`${platformConfig.bgColor} ${platformConfig.color}`}>
              {platformConfig.label}
            </Badge>
            <Badge variant="outline">{contentLabel}</Badge>
            {item.author_username && <span>@{item.author_username}</span>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-4">
            {/* Left column: Preview + Metadata */}
            <div className="space-y-4">
              {/* Thumbnail / Media */}
              {item.thumbnail_url && (
                <div className="relative w-full aspect-square bg-muted rounded-sm overflow-hidden">
                  <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {item.media_url && !item.thumbnail_url && (
                <div className="relative w-full aspect-video bg-muted rounded-sm overflow-hidden">
                  <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.author_name && (
                    <div className="flex items-center gap-1 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{item.author_name}</span>
                    </div>
                  )}
                  {item.author_username && (
                    <span className="text-sm text-muted-foreground">@{item.author_username}</span>
                  )}
                </div>

                {/* Engagement grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {item.likes > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Heart className="h-4 w-4" />
                      <span>{formatEngagement(item.likes)} likes</span>
                    </div>
                  )}
                  {item.comments > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      <span>{formatEngagement(item.comments)} comentarios</span>
                    </div>
                  )}
                  {item.shares > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Share2 className="h-4 w-4" />
                      <span>{formatEngagement(item.shares)} shares</span>
                    </div>
                  )}
                  {item.views > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>{formatEngagement(item.views)} views</span>
                    </div>
                  )}
                  {item.saves > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Bookmark className="h-4 w-4" />
                      <span>{formatEngagement(item.saves)} saves</span>
                    </div>
                  )}
                  {item.published_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(item.published_at)}</span>
                    </div>
                  )}
                </div>

                {item.engagement_rate !== null && item.engagement_rate !== undefined && (
                  <div className="text-sm text-muted-foreground">
                    Engagement rate: <span className="font-medium text-foreground">{item.engagement_rate.toFixed(2)}%</span>
                  </div>
                )}

                {/* Hashtags */}
                {item.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.hashtags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <Hash className="h-3 w-3 mr-0.5" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Mentions */}
                {item.mentions?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.mentions.map((mention, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">@{mention}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {item.permalink && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver en {platformConfig.label}
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAnalyze(item.id)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  {item.ai_analysis ? "Re-analizar con AI" : "Analizar con AI"}
                </Button>
              </div>
            </div>

            {/* Right column: Text content + AI Analysis */}
            <div className="space-y-4">
              {/* Full text content */}
              {item.text_content && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">Contenido</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(item.text_content!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.text_content}</p>
                </div>
              )}

              <Separator />

              {/* AI Analysis */}
              {item.ai_analysis ? (
                <ContentAnalysisPanel analysis={item.ai_analysis} />
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Haz clic en "Analizar con AI" para obtener insights de este contenido
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
