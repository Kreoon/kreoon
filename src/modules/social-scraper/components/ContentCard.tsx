import { ExternalLink, Brain, Heart, MessageCircle, Share2, Eye, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SOCIAL_PLATFORM_CONFIG, CONTENT_TYPE_LABELS, formatEngagement } from "../config";
import type { ScrapeItem } from "../types/social-scraper.types";

interface ContentCardProps {
  item: ScrapeItem;
  onViewDetail: (item: ScrapeItem) => void;
  onAnalyze: (itemId: string) => void;
  isAnalyzing?: boolean;
}

export function ContentCard({ item, onViewDetail, onAnalyze, isAnalyzing }: ContentCardProps) {
  const platformConfig = SOCIAL_PLATFORM_CONFIG[item.platform];
  const contentLabel = CONTENT_TYPE_LABELS[item.content_type] || item.content_type;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card
      className="group hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer overflow-hidden"
      onClick={() => onViewDetail(item)}
    >
      {/* Thumbnail */}
      {item.thumbnail_url ? (
        <div className="relative w-full h-48 bg-muted overflow-hidden">
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ) : (
        <div className="w-full h-32 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Sin preview</span>
        </div>
      )}

      <CardContent className="p-3 space-y-2">
        {/* Platform + content type badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className={`text-xs ${platformConfig.bgColor} ${platformConfig.color}`}>
            {platformConfig.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {contentLabel}
          </Badge>
          {item.ai_analysis && (
            <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">AI</Badge>
          )}
        </div>

        {/* Author */}
        {item.author_username && (
          <p className="text-sm font-medium truncate">@{item.author_username}</p>
        )}

        {/* Text preview */}
        {item.text_content && (
          <p className="text-xs text-muted-foreground line-clamp-3">{item.text_content}</p>
        )}

        {/* Engagement stats */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {item.likes > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatEngagement(item.likes)}
            </span>
          )}
          {item.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {formatEngagement(item.comments)}
            </span>
          )}
          {item.shares > 0 && (
            <span className="flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              {formatEngagement(item.shares)}
            </span>
          )}
          {item.views > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatEngagement(item.views)}
            </span>
          )}
        </div>

        {/* Date + virality */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {item.published_at && <span>{formatDate(item.published_at)}</span>}
          {item.ai_analysis?.virality_score !== undefined && (
            <div className="flex items-center gap-1">
              <span>Viralidad:</span>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(item.ai_analysis.virality_score / 10) * 100}%` }}
                />
              </div>
              <span className="font-medium">{item.ai_analysis.virality_score}/10</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
          {item.permalink && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onAnalyze(item.id)}
            disabled={isAnalyzing}
          >
            <Brain className="h-3 w-3 mr-1" />
            {item.ai_analysis ? "Re-analizar" : "Analizar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
