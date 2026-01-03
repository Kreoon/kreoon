import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Building2, Video, FileText, Star, MoreVertical, Brain, AlertTriangle, Clock4 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Content, STATUS_COLORS, STATUS_LABELS, ContentStatus, AppRole } from "@/types/database";
import { cn } from "@/lib/utils";
import { StatusChangeDropdown, QuickStatusButtons } from "./StatusChangeDropdown";

// Organization status interface
interface OrganizationStatus {
  id: string;
  status_key: string;
  label: string;
  color: string;
  sort_order: number;
}

interface EnhancedContentCardProps {
  content: Content;
  cardSize?: 'compact' | 'normal' | 'large';
  visibleFields?: string[];
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  onAnalyzeWithAI?: (contentId: string, title: string) => void;
  showAIIndicators?: boolean;
  organizationStatuses?: OrganizationStatus[];
  // New props for status change
  userRole?: AppRole | null;
  userId?: string | null;
  onStatusChange?: (contentId: string, newStatus: ContentStatus) => Promise<void>;
  showStatusControls?: boolean;
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
  visibleFields = ['title', 'status', 'client', 'deadline', 'creator', 'editor'],
  onClick,
  onDragStart,
  isDragging,
  onAnalyzeWithAI,
  showAIIndicators = false,
  organizationStatuses = [],
  userRole,
  userId,
  onStatusChange,
  showStatusControls = false,
}: EnhancedContentCardProps) {
  // Get size configuration
  const sizeConfig = SIZE_CONFIG[cardSize] || SIZE_CONFIG.normal;
  
  // Get the current status configuration from organization
  const currentStatusConfig = useMemo(() => {
    return organizationStatuses.find(s => s.status_key === content.status);
  }, [organizationStatuses, content.status]);
  
  // Get status label - prefer organization config, fallback to hardcoded
  const statusLabel = currentStatusConfig?.label || STATUS_LABELS[content.status] || content.status;
  
  // Get status color style - prefer organization config, fallback to hardcoded
  const statusColorStyle = useMemo(() => {
    if (currentStatusConfig?.color) {
      // Convert hex color to inline style
      return {
        backgroundColor: `${currentStatusConfig.color}20`,
        color: currentStatusConfig.color
      };
    }
    return null;
  }, [currentStatusConfig]);
  
  // Calculate progress based on organization statuses or fallback
  const getProgress = (): number => {
    if (organizationStatuses.length > 0 && currentStatusConfig) {
      // Calculate progress based on sort_order within the total statuses
      const maxOrder = Math.max(...organizationStatuses.map(s => s.sort_order));
      if (maxOrder === 0) return 0;
      return Math.round((currentStatusConfig.sort_order / maxOrder) * 100);
    }
    // Fallback to hardcoded values
    const statusProgress: Record<string, number> = {
      'draft': 5, 'pending_script': 10, 'script_review': 20, 'script_approved': 30,
      'assigned': 40, 'recording': 50, 'recorded': 60, 'editing': 70,
      'delivered': 80, 'issue': 75, 'approved': 90, 'paid': 100
    };
    return statusProgress[content.status] || 0;
  };
  
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

  // Check if card is stale (no update in 3+ days in certain statuses)
  const isStale = useMemo(() => {
    if (!content.updated_at) return false;
    const daysSinceUpdate = (Date.now() - new Date(content.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    const staleStatuses = ['draft', 'assigned', 'recording', 'editing', 'review'];
    return staleStatuses.includes(content.status) && daysSinceUpdate >= 3;
  }, [content.updated_at, content.status]);

  // Check if user is assigned to this content
  const isAssignedCreator = userId && content.creator_id === userId;
  const isAssignedEditor = userId && content.editor_id === userId;
  const isAssignedStrategist = userId && content.strategist_id === userId;


  const handleAnalyzeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAnalyzeWithAI) {
      onAnalyzeWithAI(content.id, content.title);
    }
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer relative",
        "transition-all duration-200 ease-out",
        "hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40 hover:-translate-y-1",
        "bg-card/95 backdrop-blur-sm border-border/50",
        isDragging && "opacity-60 scale-[0.98] rotate-1 shadow-2xl ring-2 ring-primary/30",
        isOverdue && "border-l-4 border-l-destructive",
        isStale && !isOverdue && "border-l-4 border-l-amber-500",
        sizeConfig.padding
      )}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      {/* AI Indicators */}
      {showAIIndicators && (isOverdue || isStale) && (
        <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
          {isOverdue && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm">
                  <AlertTriangle className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Proyecto vencido - Requiere atención</TooltipContent>
            </Tooltip>
          )}
          {isStale && !isOverdue && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                  <Clock4 className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Proyecto estancado - Sin cambios recientes</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* AI Menu */}
      {onAnalyzeWithAI && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleAnalyzeClick} className="gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Analizar proyecto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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
          showStatusControls && onStatusChange && userRole ? (
            <StatusChangeDropdown
              currentStatus={content.status as ContentStatus}
              contentId={content.id}
              userRole={userRole}
              isAssignedCreator={isAssignedCreator}
              isAssignedEditor={isAssignedEditor}
              isAssignedStrategist={isAssignedStrategist}
              onStatusChange={onStatusChange}
              size={cardSize === 'compact' ? 'sm' : 'default'}
            />
          ) : (
            <Badge 
              variant="secondary" 
              className={cn("shrink-0", sizeConfig.badgeSize, !statusColorStyle && STATUS_COLORS[content.status])}
              style={statusColorStyle || undefined}
            >
              {cardSize === 'compact' 
                ? statusLabel?.substring(0, 3)
                : statusLabel
              }
            </Badge>
          )
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

      {/* Meta Row: Avatars, Deadline, Points, Indicators */}
      <div className={cn(
        "flex flex-wrap items-center text-muted-foreground",
        sizeConfig.spacing,
        cardSize === 'large' && "mt-2"
      )}>
        {/* Creator Avatar */}
        {showField('creator') && content.creator && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className={cn(
                sizeConfig.avatarSize, 
                "ring-2 ring-primary/40 cursor-pointer transition-transform duration-200 hover:scale-110"
              )}>
                <AvatarImage src={content.creator.avatar_url || undefined} />
                <AvatarFallback className={cn(
                  "bg-primary/20 text-primary font-semibold",
                  cardSize === 'compact' ? "text-[8px]" : cardSize === 'large' ? "text-sm" : "text-xs"
                )}>
                  {(content.creator.full_name || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <span className="font-medium">Creador:</span> {content.creator.full_name}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Editor Avatar */}
        {showField('editor') && content.editor && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className={cn(
                sizeConfig.avatarSize, 
                "ring-2 ring-secondary/50 cursor-pointer transition-transform duration-200 hover:scale-110 -ml-1"
              )}>
                <AvatarImage src={content.editor.avatar_url || undefined} />
                <AvatarFallback className={cn(
                  "bg-secondary/30 text-secondary-foreground font-semibold",
                  cardSize === 'compact' ? "text-[8px]" : cardSize === 'large' ? "text-sm" : "text-xs"
                )}>
                  {(content.editor.full_name || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <span className="font-medium">Editor:</span> {content.editor.full_name}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Responsible (legacy fallback) - AVATAR MODE */}
        {showField('responsible') && !showField('creator') && !showField('editor') && responsible && (
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

      {/* Quick Status Buttons - Mobile friendly */}
      {showStatusControls && onStatusChange && userRole && cardSize !== 'compact' && (
        <div className="mt-2">
          <QuickStatusButtons
            currentStatus={content.status as ContentStatus}
            contentId={content.id}
            userRole={userRole}
            isAssignedCreator={isAssignedCreator}
            isAssignedEditor={isAssignedEditor}
            onStatusChange={onStatusChange}
          />
        </div>
      )}
    </Card>
  );
}
