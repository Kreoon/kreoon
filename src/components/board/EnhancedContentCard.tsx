import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Building2, Video, FileText, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Content, STATUS_COLORS, STATUS_LABELS } from "@/types/database";
import { cn } from "@/lib/utils";

interface EnhancedContentCardProps {
  content: Content;
  cardSize?: 'compact' | 'normal' | 'large';
  visibleFields?: string[];
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

// Size configurations for different card sizes
const SIZE_CONFIG = {
  compact: {
    padding: 'p-2',
    titleSize: 'text-xs',
    thumbnailHeight: 'h-12',
    avatarSize: 'h-5 w-5',
    badgeSize: 'text-[10px] px-1.5 py-0.5',
    spacing: 'gap-1',
    iconSize: 'h-2.5 w-2.5',
  },
  normal: {
    padding: 'p-3',
    titleSize: 'text-sm',
    thumbnailHeight: 'h-20',
    avatarSize: 'h-6 w-6',
    badgeSize: 'text-xs',
    spacing: 'gap-2',
    iconSize: 'h-3 w-3',
  },
  large: {
    padding: 'p-4',
    titleSize: 'text-base',
    thumbnailHeight: 'h-28',
    avatarSize: 'h-8 w-8',
    badgeSize: 'text-sm',
    spacing: 'gap-3',
    iconSize: 'h-4 w-4',
  },
};

export function EnhancedContentCard({
  content,
  cardSize = 'normal',
  visibleFields = ['title', 'status', 'client', 'deadline', 'responsible'],
  onClick,
  onDragStart,
  isDragging
}: EnhancedContentCardProps) {
  // Get size configuration
  const sizeConfig = SIZE_CONFIG[cardSize] || SIZE_CONFIG.normal;
  
  const isOverdue = useMemo(() => {
    if (!content.deadline) return false;
    return new Date(content.deadline) < new Date() && !['approved', 'paid', 'delivered'].includes(content.status);
  }, [content.deadline, content.status]);

  // Helper to check if field should be shown
  const showField = (field: string) => visibleFields.includes(field);
  
  // Get responsible person (creator or editor)
  const responsible = content.creator || content.editor;
  
  // Video indicators
  const hasVideo = content.video_url || (content.video_urls && content.video_urls.length > 0);
  const hasRawVideo = content.raw_video_urls && content.raw_video_urls.length > 0;

  // Calculate progress based on status
  const getProgress = (): number => {
    const statusProgress: Record<string, number> = {
      'draft': 5, 'pending_script': 10, 'script_review': 20, 'script_approved': 30,
      'assigned': 40, 'recording': 50, 'recorded': 60, 'editing': 70,
      'delivered': 80, 'issue': 75, 'approved': 90, 'paid': 100
    };
    return statusProgress[content.status] || 0;
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
        "bg-card/90 backdrop-blur-sm border-border/60",
        isDragging && "opacity-50 scale-95 rotate-1 shadow-xl",
        isOverdue && "border-l-4 border-l-destructive",
        sizeConfig.padding
      )}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      {/* Thumbnail - respects cardSize */}
      {showField('thumbnail') && content.thumbnail_url && (
        <div className={cn(
          "relative rounded-lg overflow-hidden bg-muted mb-2",
          cardSize === 'compact' && "hidden", // Hide thumbnail in compact
          cardSize === 'normal' && "aspect-video",
          cardSize === 'large' && "aspect-video"
        )}>
          <img 
            src={content.thumbnail_url} 
            alt={content.title}
            className="w-full h-full object-cover"
          />
          {content.hooks_count && content.hooks_count > 1 && (
            <Badge className={cn("absolute top-1 right-1 bg-black/70 text-white", sizeConfig.badgeSize)}>
              {content.hooks_count} hooks
            </Badge>
          )}
        </div>
      )}

      {/* Title & Status Row */}
      <div className={cn("flex items-start justify-between", sizeConfig.spacing, "mb-1.5")}>
        {showField('title') && (
          <h4 className={cn(
            "font-medium text-foreground flex-1 line-clamp-2",
            sizeConfig.titleSize
          )}>
            {content.title}
          </h4>
        )}
        
        {showField('status') && (
          <Badge 
            variant="secondary" 
            className={cn("shrink-0", sizeConfig.badgeSize, STATUS_COLORS[content.status])}
          >
            {cardSize === 'compact' 
              ? STATUS_LABELS[content.status]?.substring(0, 3)
              : STATUS_LABELS[content.status]
            }
          </Badge>
        )}
      </div>

      {/* Client */}
      {showField('client') && content.client?.name && (
        <div className={cn("flex items-center text-muted-foreground mb-1.5", sizeConfig.spacing)}>
          <Building2 className={sizeConfig.iconSize} />
          <span className={cn("truncate", cardSize === 'compact' ? "text-[10px]" : "text-xs")}>
            {content.client.name}
          </span>
        </div>
      )}

      {/* Meta Row: Avatar, Deadline, Points, Indicators */}
      <div className={cn(
        "flex flex-wrap items-center text-muted-foreground",
        sizeConfig.spacing,
        cardSize === 'large' && "mt-2"
      )}>
        {/* Responsible - AVATAR MODE (no text, just avatar with tooltip) */}
        {showField('responsible') && responsible && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className={cn(sizeConfig.avatarSize, "ring-2 ring-background cursor-pointer")}>
                <AvatarImage src={responsible.avatar_url || undefined} />
                <AvatarFallback className={cn(
                  "bg-primary/10 text-primary font-medium",
                  cardSize === 'compact' ? "text-[8px]" : cardSize === 'large' ? "text-sm" : "text-xs"
                )}>
                  {(responsible.full_name || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {responsible.full_name}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Deadline */}
        {showField('deadline') && content.deadline && (
          <div className={cn(
            "flex items-center",
            sizeConfig.spacing,
            isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            <Clock className={sizeConfig.iconSize} />
            <span className={cn(cardSize === 'compact' ? "text-[10px]" : "text-xs")}>
              {format(new Date(content.deadline), cardSize === 'compact' ? 'dd/MM' : 'dd MMM', { locale: es })}
            </span>
          </div>
        )}

        {/* Points */}
        {showField('points') && (
          <div className={cn("flex items-center text-amber-500", sizeConfig.spacing)}>
            <Star className={cn(sizeConfig.iconSize, "fill-current")} />
            <span className={cn(cardSize === 'compact' ? "text-[10px]" : "text-xs")}>100</span>
          </div>
        )}

        {/* Video/Script Indicators (icons) */}
        <div className={cn("flex items-center ml-auto", sizeConfig.spacing)}>
          {hasRawVideo && (
            <Tooltip>
              <TooltipTrigger>
                <Video className={cn(sizeConfig.iconSize, "text-orange-500")} />
              </TooltipTrigger>
              <TooltipContent>Material crudo</TooltipContent>
            </Tooltip>
          )}
          {hasVideo && (
            <Tooltip>
              <TooltipTrigger>
                <Video className={cn(sizeConfig.iconSize, "text-green-500 fill-current")} />
              </TooltipTrigger>
              <TooltipContent>Video editado</TooltipContent>
            </Tooltip>
          )}
          {content.script && (
            <Tooltip>
              <TooltipTrigger>
                <FileText className={cn(sizeConfig.iconSize, "text-blue-500")} />
              </TooltipTrigger>
              <TooltipContent>Tiene guión</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Progress bar - full width */}
      {showField('progress') && (
        <div className="mt-2">
          <Progress value={getProgress()} className={cn(cardSize === 'compact' ? "h-1" : "h-1.5")} />
        </div>
      )}

      {/* Dot Indicators */}
      {showField('indicators') && (
        <div className={cn("flex items-center mt-2", sizeConfig.spacing)}>
          {hasRawVideo && <div className="h-2 w-2 rounded-full bg-orange-500" />}
          {hasVideo && <div className="h-2 w-2 rounded-full bg-green-500" />}
          {content.script && <div className="h-2 w-2 rounded-full bg-blue-500" />}
          {!hasRawVideo && !hasVideo && !content.script && (
            <div className="h-2 w-2 rounded-full bg-muted" />
          )}
        </div>
      )}

      {/* Ambassador badge */}
      {content.is_ambassador_content && (
        <Badge variant="outline" className={cn("mt-2 border-amber-500 text-amber-500", sizeConfig.badgeSize)}>
          Embajador
        </Badge>
      )}
    </Card>
  );
}
