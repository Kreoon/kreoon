import { Calendar, User, GripVertical, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Content, STATUS_LABELS, STATUS_COLORS } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DraggableContentCardProps {
  content: Content;
  onDragStart: (e: React.DragEvent, content: Content) => void;
  onClick?: (content: Content) => void;
  isDragging?: boolean;
}

export function DraggableContentCard({ 
  content, 
  onDragStart,
  onClick,
  isDragging 
}: DraggableContentCardProps) {
  const statusInfo = {
    label: STATUS_LABELS[content.status],
    className: STATUS_COLORS[content.status]
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Sin fecha';
    return format(new Date(date), 'd MMM', { locale: es });
  };

  const getPriorityClass = () => {
    if (!content.deadline) return 'border-l-muted';
    const deadline = new Date(content.deadline);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'border-l-destructive';
    if (diffDays <= 2) return 'border-l-warning';
    return 'border-l-success';
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, content)}
      onClick={() => onClick?.(content)}
      className={cn(
        "group relative overflow-hidden rounded-lg border-l-4 bg-card border border-border p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-grab active:cursor-grabbing",
        getPriorityClass(),
        isDragging && "opacity-50 scale-95"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusInfo.className
            )}>
              {statusInfo.label}
            </span>
            {content.is_ambassador_content && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                Ambassador
              </span>
            )}
          </div>
          
          <h3 className="font-semibold text-card-foreground truncate mb-1">
            {content.title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-3 truncate">
            {content.client?.name || 'Sin cliente'}
          </p>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {content.creator && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[100px]">{content.creator.full_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(content.deadline)}</span>
            </div>
            {(content.creator_payment > 0 || content.editor_payment > 0) && (
              <div className="flex items-center gap-1 text-success">
                <DollarSign className="h-3 w-3" />
                <span>${(content.creator_payment || 0) + (content.editor_payment || 0)}</span>
              </div>
            )}
          </div>
        </div>

        {content.thumbnail_url && (
          <div className="h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
            <img 
              src={content.thumbnail_url} 
              alt={content.title} 
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
