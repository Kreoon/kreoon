import { cn } from "@/lib/utils";
import { Calendar, User, Clock, MoreVertical, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ContentStatus = "pendiente" | "en_progreso" | "revision" | "completado";

interface ContentCardProps {
  title: string;
  client: string;
  creator?: string;
  editor?: string;
  dueDate: string;
  status: ContentStatus;
  thumbnail?: string;
  priority?: "alta" | "media" | "baja";
  isAmbassadorContent?: boolean;
}

const statusConfig: Record<ContentStatus, { label: string; className: string }> = {
  pendiente: { 
    label: "Pendiente", 
    className: "bg-muted text-muted-foreground" 
  },
  en_progreso: { 
    label: "En Progreso", 
    className: "bg-info/10 text-info" 
  },
  revision: { 
    label: "En Revisión", 
    className: "bg-warning/10 text-warning" 
  },
  completado: { 
    label: "Completado", 
    className: "bg-success/10 text-success" 
  },
};

const priorityConfig = {
  alta: "border-l-destructive",
  media: "border-l-warning",
  baja: "border-l-muted-foreground",
};

export function ContentCard({ 
  title, 
  client, 
  creator, 
  editor, 
  dueDate, 
  status,
  thumbnail,
  priority = "media",
  isAmbassadorContent = false
}: ContentCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-lg border-l-4 bg-card border border-border p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer",
        priorityConfig[priority]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusInfo.className
            )}>
              {statusInfo.label}
            </span>
            {isAmbassadorContent && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm">
                <Crown className="h-3 w-3" />
                Embajador
              </span>
            )}
          </div>
          
          <h3 className="font-semibold text-card-foreground truncate mb-1">
            {title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-3">
            {client}
          </p>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {creator && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{creator}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{dueDate}</span>
            </div>
          </div>
        </div>

        {thumbnail && (
          <div className="h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
            <img 
              src={thumbnail} 
              alt={title} 
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
}
