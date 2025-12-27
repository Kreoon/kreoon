import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Building2, User, ChevronRight, Video, FileText, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Content, STATUS_COLORS, STATUS_LABELS } from "@/types/database";
import { cn } from "@/lib/utils";

interface BoardListViewProps {
  content: Content[];
  onContentClick: (content: Content) => void;
  cardSize?: 'compact' | 'normal' | 'large';
  visibleFields?: string[];
}

export function BoardListView({ 
  content, 
  onContentClick,
  cardSize = 'normal',
  visibleFields = ['title', 'thumbnail', 'status', 'client', 'responsible', 'deadline']
}: BoardListViewProps) {
  const showField = (field: string) => visibleFields.includes(field);

  // Group by status
  const groupedByStatus = content.reduce((acc, c) => {
    if (!acc[c.status]) acc[c.status] = [];
    acc[c.status].push(c);
    return acc;
  }, {} as Record<string, Content[]>);

  // Calculate progress for a content item
  const getProgress = (status: string): number => {
    const statusProgress: Record<string, number> = {
      'draft': 5, 'pending_script': 10, 'script_review': 20, 'script_approved': 30,
      'assigned': 40, 'recording': 50, 'recorded': 60, 'editing': 70,
      'delivered': 80, 'issue': 75, 'approved': 90, 'paid': 100
    };
    return statusProgress[status] || 0;
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedByStatus).map(([status, items]) => (
        <div key={status} className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[status as Content['status']])}>
              {STATUS_LABELS[status as Content['status']]}
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
              
              return (
                <div
                  key={c.id}
                  onClick={() => onContentClick(c)}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border bg-card cursor-pointer",
                    "hover:bg-muted/50 hover:border-primary/30 transition-all",
                    isOverdue && "border-l-4 border-l-destructive",
                    cardSize === 'compact' && "p-2 gap-2",
                    cardSize === 'normal' && "p-3",
                    cardSize === 'large' && "p-4"
                  )}
                >
                  {/* Thumbnail */}
                  {showField('thumbnail') && cardSize !== 'compact' && (
                    c.thumbnail_url ? (
                      <img 
                        src={c.thumbnail_url} 
                        alt="" 
                        className={cn(
                          "rounded object-cover flex-shrink-0",
                          cardSize === 'large' ? "h-16 w-28" : "h-12 w-20"
                        )}
                      />
                    ) : (
                      <div className={cn(
                        "rounded bg-muted flex-shrink-0",
                        cardSize === 'large' ? "h-16 w-28" : "h-12 w-20"
                      )} />
                    )
                  )}

                  {/* Title & Client */}
                  <div className="flex-1 min-w-0">
                    {showField('title') && (
                      <h4 className={cn(
                        "font-medium text-foreground truncate",
                        cardSize === 'compact' && "text-sm"
                      )}>
                        {c.title}
                      </h4>
                    )}
                    {showField('client') && c.client?.name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{c.client.name}</span>
                      </div>
                    )}
                    
                    {/* Progress bar */}
                    {showField('progress') && (
                      <div className="mt-2">
                        <Progress value={getProgress(c.status)} className="h-1" />
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  {showField('status') && (
                    <Badge variant="secondary" className={cn("text-xs shrink-0", STATUS_COLORS[c.status])}>
                      {cardSize === 'compact' ? STATUS_LABELS[c.status]?.substring(0, 3) : STATUS_LABELS[c.status]}
                    </Badge>
                  )}

                  {/* Responsible */}
                  {showField('responsible') && c.creator && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm",
                      cardSize === 'compact' && "hidden md:flex"
                    )}>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={c.creator.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {c.creator.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {cardSize !== 'compact' && (
                        <span className="text-muted-foreground hidden lg:inline">
                          {c.creator.full_name?.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Deadline */}
                  {showField('deadline') && c.deadline && (
                    <div className={cn(
                      "hidden sm:flex items-center gap-1 text-sm",
                      isOverdue ? "text-destructive" : "text-muted-foreground"
                    )}>
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(c.deadline), cardSize === 'compact' ? 'dd/MM' : 'dd MMM', { locale: es })}
                    </div>
                  )}

                  {/* Points */}
                  {showField('points') && (
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="h-3 w-3 fill-current" />
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
      ))}

      {content.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay contenido para mostrar
        </div>
      )}
    </div>
  );
}
