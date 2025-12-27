import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, User, Building2, Clock, Video, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export function EnhancedContentCard({
  content,
  cardSize = 'normal',
  visibleFields = ['title', 'status', 'client', 'deadline', 'responsible'],
  onClick,
  onDragStart,
  isDragging
}: EnhancedContentCardProps) {
  const showField = (field: string) => visibleFields.includes(field);
  
  const isOverdue = useMemo(() => {
    if (!content.deadline) return false;
    return new Date(content.deadline) < new Date() && !['approved', 'paid', 'delivered'].includes(content.status);
  }, [content.deadline, content.status]);

  const hasVideo = content.video_url || (content.video_urls && content.video_urls.length > 0);
  const hasRawVideo = content.raw_video_urls && content.raw_video_urls.length > 0;

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30",
        "bg-card/80 backdrop-blur-sm border-border/50",
        isDragging && "opacity-50 scale-95 rotate-2",
        isOverdue && "border-l-4 border-l-destructive",
        cardSize === 'compact' && "p-2",
        cardSize === 'normal' && "p-3",
        cardSize === 'large' && "p-4"
      )}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      {/* Thumbnail */}
      {showField('thumbnail') && content.thumbnail_url && cardSize !== 'compact' && (
        <div className="relative mb-3 rounded-lg overflow-hidden aspect-video bg-muted">
          <img 
            src={content.thumbnail_url} 
            alt={content.title}
            className="w-full h-full object-cover"
          />
          {content.hooks_count && content.hooks_count > 1 && (
            <Badge className="absolute top-2 right-2 bg-black/60 text-white text-xs">
              {content.hooks_count} hooks
            </Badge>
          )}
        </div>
      )}

      {/* Title & Status Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        {showField('title') && (
          <h4 className={cn(
            "font-medium text-foreground line-clamp-2 flex-1",
            cardSize === 'compact' ? "text-sm" : "text-base"
          )}>
            {content.title}
          </h4>
        )}
        
        {showField('status') && (
          <Badge 
            variant="secondary" 
            className={cn("shrink-0 text-xs", STATUS_COLORS[content.status])}
          >
            {cardSize === 'compact' 
              ? STATUS_LABELS[content.status].substring(0, 3)
              : STATUS_LABELS[content.status]
            }
          </Badge>
        )}
      </div>

      {/* Client */}
      {showField('client') && content.client?.name && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{content.client.name}</span>
        </div>
      )}

      {/* Meta Row */}
      <div className={cn(
        "flex items-center gap-3 text-xs text-muted-foreground",
        cardSize === 'large' && "mt-3"
      )}>
        {/* Responsible */}
        {showField('responsible') && (content.creator || content.editor) && (
          <div className="flex items-center gap-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={content.creator?.avatar_url || content.editor?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {(content.creator?.full_name || content.editor?.full_name || '?').charAt(0)}
              </AvatarFallback>
            </Avatar>
            {cardSize !== 'compact' && (
              <span className="truncate max-w-20">
                {content.creator?.full_name?.split(' ')[0] || content.editor?.full_name?.split(' ')[0]}
              </span>
            )}
          </div>
        )}

        {/* Deadline */}
        {showField('deadline') && content.deadline && (
          <div className={cn(
            "flex items-center gap-1",
            isOverdue && "text-destructive font-medium"
          )}>
            <Clock className="h-3 w-3" />
            {format(new Date(content.deadline), cardSize === 'compact' ? 'dd/MM' : 'dd MMM', { locale: es })}
          </div>
        )}

        {/* Video indicators */}
        <div className="flex items-center gap-1 ml-auto">
          {hasRawVideo && (
            <div className="flex items-center gap-0.5 text-orange-500" title="Material crudo">
              <Video className="h-3 w-3" />
            </div>
          )}
          {hasVideo && (
            <div className="flex items-center gap-0.5 text-green-500" title="Video editado">
              <Video className="h-3 w-3 fill-current" />
            </div>
          )}
          {content.script && (
            <div className="flex items-center gap-0.5 text-blue-500" title="Tiene guión">
              <FileText className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>

      {/* Ambassador badge */}
      {content.is_ambassador_content && (
        <Badge variant="outline" className="mt-2 text-xs border-amber-500 text-amber-500">
          Embajador
        </Badge>
      )}
    </Card>
  );
}
