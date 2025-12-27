import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, User, Building2, Clock, Video, FileText, Star, Tag, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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

// Component for each field type
function ThumbnailField({ content, cardSize }: { content: Content; cardSize: string }) {
  if (!content.thumbnail_url || cardSize === 'compact') return null;
  
  return (
    <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
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
  );
}

function TitleField({ content, cardSize }: { content: Content; cardSize: string }) {
  return (
    <h4 className={cn(
      "font-medium text-foreground line-clamp-2",
      cardSize === 'compact' ? "text-sm" : "text-base"
    )}>
      {content.title}
    </h4>
  );
}

function StatusField({ content, cardSize }: { content: Content; cardSize: string }) {
  return (
    <Badge 
      variant="secondary" 
      className={cn("shrink-0 text-xs", STATUS_COLORS[content.status])}
    >
      {cardSize === 'compact' 
        ? STATUS_LABELS[content.status]?.substring(0, 3)
        : STATUS_LABELS[content.status]
      }
    </Badge>
  );
}

function ClientField({ content }: { content: Content }) {
  if (!content.client?.name) return null;
  
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Building2 className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{content.client.name}</span>
    </div>
  );
}

function ResponsibleField({ content, cardSize }: { content: Content; cardSize: string }) {
  const person = content.creator || content.editor;
  if (!person) return null;
  
  return (
    <div className="flex items-center gap-1">
      <Avatar className="h-5 w-5">
        <AvatarImage src={person.avatar_url || undefined} />
        <AvatarFallback className="text-[10px]">
          {(person.full_name || '?').charAt(0)}
        </AvatarFallback>
      </Avatar>
      {cardSize !== 'compact' && (
        <span className="truncate max-w-20 text-xs text-muted-foreground">
          {person.full_name?.split(' ')[0]}
        </span>
      )}
    </div>
  );
}

function DeadlineField({ content, cardSize, isOverdue }: { content: Content; cardSize: string; isOverdue: boolean }) {
  if (!content.deadline) return null;
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-xs",
      isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
    )}>
      <Clock className="h-3 w-3" />
      {format(new Date(content.deadline), cardSize === 'compact' ? 'dd/MM' : 'dd MMM', { locale: es })}
    </div>
  );
}

function ProgressField({ content }: { content: Content }) {
  // Calculate progress based on status
  const statusProgress: Record<string, number> = {
    'draft': 5,
    'pending_script': 10,
    'script_review': 20,
    'script_approved': 30,
    'assigned': 40,
    'recording': 50,
    'recorded': 60,
    'editing': 70,
    'delivered': 80,
    'issue': 75,
    'approved': 90,
    'paid': 100
  };
  
  const progress = statusProgress[content.status] || 0;
  
  return (
    <div className="w-full">
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}

function PointsField({ content }: { content: Content }) {
  // Mock points - in real implementation, get from user points
  return (
    <div className="flex items-center gap-1 text-xs text-amber-500">
      <Star className="h-3 w-3 fill-current" />
      <span>100</span>
    </div>
  );
}

function IndicatorsField({ content }: { content: Content }) {
  const hasVideo = content.video_url || (content.video_urls && content.video_urls.length > 0);
  const hasRawVideo = content.raw_video_urls && content.raw_video_urls.length > 0;
  const hasScript = !!content.script;
  
  return (
    <div className="flex items-center gap-1">
      {hasRawVideo && (
        <div className="h-2 w-2 rounded-full bg-orange-500" title="Material crudo" />
      )}
      {hasVideo && (
        <div className="h-2 w-2 rounded-full bg-green-500" title="Video editado" />
      )}
      {hasScript && (
        <div className="h-2 w-2 rounded-full bg-blue-500" title="Tiene guión" />
      )}
      {!hasRawVideo && !hasVideo && !hasScript && (
        <div className="h-2 w-2 rounded-full bg-muted" />
      )}
    </div>
  );
}

function VideoIndicators({ content }: { content: Content }) {
  const hasVideo = content.video_url || (content.video_urls && content.video_urls.length > 0);
  const hasRawVideo = content.raw_video_urls && content.raw_video_urls.length > 0;
  
  return (
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
  );
}

export function EnhancedContentCard({
  content,
  cardSize = 'normal',
  visibleFields = ['title', 'status', 'client', 'deadline', 'responsible'],
  onClick,
  onDragStart,
  isDragging
}: EnhancedContentCardProps) {
  const isOverdue = useMemo(() => {
    if (!content.deadline) return false;
    return new Date(content.deadline) < new Date() && !['approved', 'paid', 'delivered'].includes(content.status);
  }, [content.deadline, content.status]);

  // Render field by key in order
  const renderField = (fieldKey: string, index: number) => {
    switch (fieldKey) {
      case 'thumbnail':
        return <ThumbnailField key={fieldKey} content={content} cardSize={cardSize} />;
      case 'title':
        return <TitleField key={fieldKey} content={content} cardSize={cardSize} />;
      case 'status':
        return <StatusField key={fieldKey} content={content} cardSize={cardSize} />;
      case 'client':
        return <ClientField key={fieldKey} content={content} />;
      case 'responsible':
        return <ResponsibleField key={fieldKey} content={content} cardSize={cardSize} />;
      case 'deadline':
        return <DeadlineField key={fieldKey} content={content} cardSize={cardSize} isOverdue={isOverdue} />;
      case 'progress':
        return <ProgressField key={fieldKey} content={content} />;
      case 'points':
        return <PointsField key={fieldKey} content={content} />;
      case 'indicators':
        return <IndicatorsField key={fieldKey} content={content} />;
      default:
        return null;
    }
  };

  // Separate fields into groups for layout
  const thumbnailField = visibleFields.includes('thumbnail') ? 'thumbnail' : null;
  const headerFields = visibleFields.filter(f => ['title', 'status'].includes(f));
  const clientField = visibleFields.includes('client');
  const metaFields = visibleFields.filter(f => ['responsible', 'deadline', 'points', 'indicators', 'progress'].includes(f));
  
  // Check for special fields
  const showProgress = visibleFields.includes('progress');
  const showIndicators = visibleFields.includes('indicators');
  const showPoints = visibleFields.includes('points');

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
      {/* Thumbnail (if configured) */}
      {thumbnailField && cardSize !== 'compact' && (
        <div className="mb-3">
          {renderField('thumbnail', 0)}
        </div>
      )}

      {/* Title & Status Row */}
      {headerFields.length > 0 && (
        <div className={cn(
          "flex items-start justify-between gap-2",
          (clientField || metaFields.length > 0) && "mb-2"
        )}>
          {visibleFields.includes('title') && renderField('title', 1)}
          {visibleFields.includes('status') && renderField('status', 2)}
        </div>
      )}

      {/* Client */}
      {clientField && (
        <div className="mb-2">
          {renderField('client', 3)}
        </div>
      )}

      {/* Meta Row: responsible, deadline, points, indicators */}
      {metaFields.length > 0 && (
        <div className={cn(
          "flex flex-wrap items-center gap-3 text-xs text-muted-foreground",
          cardSize === 'large' && "mt-3"
        )}>
          {visibleFields.includes('responsible') && renderField('responsible', 4)}
          {visibleFields.includes('deadline') && renderField('deadline', 5)}
          {visibleFields.includes('points') && renderField('points', 6)}
          
          {/* Video indicators (always show) */}
          <VideoIndicators content={content} />
        </div>
      )}

      {/* Progress bar (full width) */}
      {showProgress && (
        <div className="mt-2">
          {renderField('progress', 7)}
        </div>
      )}

      {/* Indicators dots */}
      {showIndicators && (
        <div className="mt-2">
          {renderField('indicators', 8)}
        </div>
      )}

      {/* Ambassador badge */}
      {content.is_ambassador_content && (
        <Badge variant="outline" className="mt-2 text-xs border-amber-500 text-amber-500">
          Embajador
        </Badge>
      )}
    </Card>
  );
}
