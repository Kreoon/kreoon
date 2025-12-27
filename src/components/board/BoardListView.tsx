import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Building2, User, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Content, STATUS_COLORS, STATUS_LABELS } from "@/types/database";
import { cn } from "@/lib/utils";

interface BoardListViewProps {
  content: Content[];
  onContentClick: (content: Content) => void;
}

export function BoardListView({ content, onContentClick }: BoardListViewProps) {
  // Group by status
  const groupedByStatus = content.reduce((acc, c) => {
    if (!acc[c.status]) acc[c.status] = [];
    acc[c.status].push(c);
    return acc;
  }, {} as Record<string, Content[]>);

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
              
              return (
                <div
                  key={c.id}
                  onClick={() => onContentClick(c)}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border bg-card cursor-pointer",
                    "hover:bg-muted/50 hover:border-primary/30 transition-all",
                    isOverdue && "border-l-4 border-l-destructive"
                  )}
                >
                  {/* Thumbnail */}
                  {c.thumbnail_url ? (
                    <img 
                      src={c.thumbnail_url} 
                      alt="" 
                      className="h-12 w-20 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-20 rounded bg-muted flex-shrink-0" />
                  )}

                  {/* Title & Client */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{c.title}</h4>
                    {c.client?.name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{c.client.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Creator */}
                  {c.creator && (
                    <div className="hidden md:flex items-center gap-2 text-sm">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={c.creator.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {c.creator.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">
                        {c.creator.full_name?.split(' ')[0]}
                      </span>
                    </div>
                  )}

                  {/* Deadline */}
                  {c.deadline && (
                    <div className={cn(
                      "hidden sm:flex items-center gap-1 text-sm",
                      isOverdue ? "text-destructive" : "text-muted-foreground"
                    )}>
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(c.deadline), 'dd MMM', { locale: es })}
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
