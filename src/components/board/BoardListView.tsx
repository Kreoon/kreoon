import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Building2, ChevronRight, Video, FileText, Star, Crown, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Content, STATUS_COLORS, STATUS_LABELS } from "@/types/database";
import { cn } from "@/lib/utils";
import { OrganizationStatus, getStatusLabel, getStatusColorStyle, getStatusFallbackClass, getStatusProgress } from "@/lib/statusUtils";
import { CardFieldsCustomizer } from "./CardFieldsCustomizer";
import { GroupBySelector } from "./GroupBySelector";
import { BOARD_FIELDS } from "./boardFieldsConfig";

interface BoardListViewProps {
  content: Content[];
  onContentClick: (content: Content) => void;
  cardSize?: 'compact' | 'normal' | 'large';
  visibleFields?: string[];
  onVisibleFieldsChange?: (fields: string[]) => void;
  organizationStatuses?: OrganizationStatus[];
  ambassadorIds?: Set<string>;
  /** Mostrar header con controles de personalización */
  showFieldsCustomizer?: boolean;
  /** Campo por el cual agrupar (default: status, none = sin agrupar) */
  groupBy?: string;
  /** Callback cuando cambia el campo de agrupación */
  onGroupByChange?: (field: string) => void;
}

// Size configurations
const SIZE_CONFIG = {
  compact: {
    padding: 'p-2 gap-2',
    thumbnailSize: 'h-10 w-16',
    avatarSize: 'h-5 w-5',
    textSize: 'text-xs',
    iconSize: 'h-2.5 w-2.5',
  },
  normal: {
    padding: 'p-3 gap-3',
    thumbnailSize: 'h-12 w-20',
    avatarSize: 'h-6 w-6',
    textSize: 'text-sm',
    iconSize: 'h-3 w-3',
  },
  large: {
    padding: 'p-4 gap-4',
    thumbnailSize: 'h-16 w-28',
    avatarSize: 'h-8 w-8',
    textSize: 'text-base',
    iconSize: 'h-4 w-4',
  },
};

export function BoardListView({
  content,
  onContentClick,
  cardSize = 'normal',
  visibleFields = ['title', 'thumbnail', 'status', 'client', 'creator', 'editor', 'deadline'],
  onVisibleFieldsChange,
  organizationStatuses = [],
  ambassadorIds = new Set(),
  showFieldsCustomizer = true,
  groupBy = 'status',
  onGroupByChange
}: BoardListViewProps) {
  const showField = (field: string) => visibleFields.includes(field);
  const sizeConfig = SIZE_CONFIG[cardSize] || SIZE_CONFIG.normal;

  // Función para obtener el valor de agrupación de un contenido
  const getGroupKey = (c: Content): string => {
    if (groupBy === 'none') return 'all';

    switch (groupBy) {
      case 'status':
        return c.status;
      case 'client':
        return c.client?.name || 'Sin cliente';
      case 'creator':
        return c.creator?.full_name || 'Sin creador';
      case 'editor':
        return c.editor?.full_name || 'Sin editor';
      case 'sphere_phase':
        return c.sphere_phase || 'Sin fase';
      case 'campaign_week':
        return c.campaign_week ? `Semana ${c.campaign_week}` : 'Sin semana';
      case 'deadline':
        return c.deadline ? format(new Date(c.deadline), 'MMMM yyyy', { locale: es }) : 'Sin fecha';
      default:
        return c.status;
    }
  };

  // Obtener etiqueta del grupo según el campo de agrupación
  const getGroupLabel = (key: string): string => {
    if (groupBy === 'none') return 'Todos los proyectos';
    if (groupBy === 'status') {
      return getStatusLabel(key as Content['status'], organizationStatuses);
    }
    return key;
  };

  // Agrupar contenido dinámicamente
  const groupedContent = content.reduce((acc, c) => {
    const key = getGroupKey(c);
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, Content[]>);

  return (
    <div className="space-y-4">
      {/* Header con controles de personalización - Nova v2 */}
      {(showFieldsCustomizer || onGroupByChange) && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-200/80 dark:border-purple-500/10">
          <div className="flex items-center gap-2">
            {onGroupByChange && (
              <GroupBySelector
                currentGroupBy={groupBy}
                onGroupByChange={onGroupByChange}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {showFieldsCustomizer && onVisibleFieldsChange && (
              <CardFieldsCustomizer
                visibleFields={visibleFields}
                onFieldsChange={onVisibleFieldsChange}
                compact={true}
              />
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
      {Object.entries(groupedContent).map(([groupKey, items]) => {
        // Estilos para grupos de status
        const isStatusGroup = groupBy === 'status';
        const statusStyle = isStatusGroup ? getStatusColorStyle(groupKey as Content['status'], organizationStatuses) : null;
        const statusClass = isStatusGroup ? getStatusFallbackClass(groupKey as Content['status'], organizationStatuses) : '';
        const label = getGroupLabel(groupKey);

        return (
          <div key={groupKey} className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Badge
                variant="secondary"
                className={cn("text-xs", isStatusGroup && statusClass)}
                style={statusStyle || undefined}
              >
                {label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? 'proyecto' : 'proyectos'}
              </span>
            </div>

          <div className="space-y-1">
            {items.map(c => {
              const isOverdue = c.deadline && new Date(c.deadline) < new Date() && !['approved', 'paid', 'delivered'].includes(c.status);
              const hasVideo = c.video_url || (c.video_urls && c.video_urls.length > 0);
              const hasRawVideo = c.raw_video_urls && c.raw_video_urls.length > 0;
              const responsible = c.creator || c.editor;
              
              return (
                <div
                  key={c.id}
                  onClick={() => onContentClick(c)}
                  className={cn(
                    // Base styles - Nova v2
                    "flex items-center rounded-lg border cursor-pointer",
                    "bg-white dark:bg-[#0f0f22]",
                    "border-zinc-200/80 dark:border-purple-500/15",
                    // Hover state - Nova glow
                    "hover:bg-zinc-50 dark:hover:bg-[#141428]",
                    "hover:border-purple-300 dark:hover:border-purple-500/30",
                    "dark:hover:shadow-[0_0_12px_rgba(139,92,246,0.15)]",
                    "transition-all duration-200",
                    // Overdue indicator
                    isOverdue && "border-l-4 border-l-red-500",
                    sizeConfig.padding
                  )}
                >
                  {/* Thumbnail */}
                  {showField('thumbnail') && cardSize !== 'compact' && (
                    c.thumbnail_url ? (
                      <img 
                        src={c.thumbnail_url} 
                        alt="" 
                        className={cn("rounded object-cover flex-shrink-0", sizeConfig.thumbnailSize)}
                      />
                    ) : (
                      <div className={cn("rounded bg-muted flex-shrink-0", sizeConfig.thumbnailSize)} />
                    )
                  )}

                  {/* Title & Client */}
                  <div className="flex-1 min-w-0">
                    {showField('title') && (
                      <h4 className={cn("font-medium text-foreground truncate", sizeConfig.textSize)}>
                        {c.title}
                      </h4>
                    )}
                    {showField('client') && c.client?.name && (
                      <div className={cn("flex items-center gap-1 text-muted-foreground mt-0.5", cardSize === 'compact' ? "text-[10px]" : "text-xs")}>
                        <Building2 className={sizeConfig.iconSize} />
                        <span className="truncate">{c.client.name}</span>
                      </div>
                    )}
                    
                    {/* Progress bar */}
                    {showField('progress') && (
                      <div className="mt-2">
                        <Progress value={getStatusProgress(c.status, organizationStatuses)} className="h-1" />
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  {showField('status') && (() => {
                    const itemStatusStyle = getStatusColorStyle(c.status, organizationStatuses);
                    const itemStatusClass = getStatusFallbackClass(c.status, organizationStatuses);
                    const itemLabel = getStatusLabel(c.status, organizationStatuses);
                    return (
                      <Badge 
                        variant="secondary" 
                        className={cn("shrink-0", cardSize === 'compact' ? "text-[10px]" : "text-xs", itemStatusClass)}
                        style={itemStatusStyle || undefined}
                      >
                        {cardSize === 'compact' ? itemLabel?.substring(0, 3) : itemLabel}
                      </Badge>
                    );
                  })()}

                  {/* Creator Avatar */}
                  {showField('creator') && c.creator && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Avatar className={cn(
                            sizeConfig.avatarSize, 
                            "ring-2 cursor-pointer",
                            c.creator_id && ambassadorIds.has(c.creator_id)
                              ? "ring-amber-500"
                              : "ring-primary/30"
                          )}>
                            <AvatarImage src={c.creator.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                              {(c.creator.full_name || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {c.creator_id && ambassadorIds.has(c.creator_id) && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                              <Crown className="h-2 w-2 text-white fill-white" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Creador:</span> {c.creator.full_name}
                          {c.creator_id && ambassadorIds.has(c.creator_id) && (
                            <span className="inline-flex items-center gap-0.5 text-amber-500">
                              <Crown className="h-3 w-3 fill-amber-500" /> Embajador
                            </span>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Editor Avatar */}
                  {showField('editor') && c.editor && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Avatar className={cn(
                            sizeConfig.avatarSize, 
                            "ring-2 cursor-pointer",
                            c.editor_id && ambassadorIds.has(c.editor_id)
                              ? "ring-amber-500"
                              : "ring-secondary/50"
                          )}>
                            <AvatarImage src={c.editor.avatar_url || undefined} />
                            <AvatarFallback className="bg-secondary/20 text-secondary-foreground font-medium text-xs">
                              {(c.editor.full_name || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {c.editor_id && ambassadorIds.has(c.editor_id) && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                              <Crown className="h-2 w-2 text-white fill-white" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Editor:</span> {c.editor.full_name}
                          {c.editor_id && ambassadorIds.has(c.editor_id) && (
                            <span className="inline-flex items-center gap-0.5 text-amber-500">
                              <Crown className="h-3 w-3 fill-amber-500" /> Embajador
                            </span>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Responsible (legacy fallback) - AVATAR ONLY with tooltip */}
                  {showField('responsible') && !showField('creator') && !showField('editor') && (c.creator || c.editor) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className={cn(sizeConfig.avatarSize, "ring-2 ring-background cursor-pointer")}>
                          <AvatarImage src={(c.creator || c.editor)?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                            {((c.creator || c.editor)?.full_name || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {(c.creator || c.editor)?.full_name}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Deadline */}
                  {showField('deadline') && c.deadline && (
                    <div className={cn(
                      "hidden sm:flex items-center gap-1",
                      cardSize === 'compact' ? "text-[10px]" : "text-xs",
                      isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                    )}>
                      <Clock className={sizeConfig.iconSize} />
                      {format(new Date(c.deadline), cardSize === 'compact' ? 'dd/MM' : 'dd MMM', { locale: es })}
                    </div>
                  )}

                  {/* Points */}
                  {showField('points') && (
                    <div className={cn("flex items-center gap-1 text-amber-500", cardSize === 'compact' ? "text-[10px]" : "text-xs")}>
                      <Star className={cn(sizeConfig.iconSize, "fill-current")} />
                      <span>100</span>
                    </div>
                  )}

                  {/* Indicators */}
                  {showField('indicators') && (
                    <div className="flex items-center gap-1">
                      {hasRawVideo && <div className="h-2 w-2 rounded-full bg-orange-500" />}
                      {hasVideo && <div className="h-2 w-2 rounded-full bg-green-500" />}
                      {c.script && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                    </div>
                  )}

                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </div>
        );
      })}

      {content.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay contenido para mostrar
        </div>
      )}
      </div>
    </div>
  );
}
