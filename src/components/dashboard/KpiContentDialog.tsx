import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Content, STATUS_LABELS, STATUS_COLORS } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface KpiContentDialogProps {
  title: string;
  content: Content[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContent?: (content: Content) => void;
}

export function KpiContentDialog({ 
  title, 
  content, 
  open, 
  onOpenChange,
  onSelectContent 
}: KpiContentDialogProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge variant="secondary">{content.length} videos</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {content.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No hay contenido en esta categoría
            </div>
          ) : (
            <div className="space-y-3">
              {content.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectContent?.(item);
                    onOpenChange(false);
                  }}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.client?.name || 'Sin cliente'}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[item.status]}>
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {item.creator?.full_name && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{item.creator.full_name}</span>
                      </div>
                    )}
                    {item.deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(item.deadline)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>
                        Creador: ${item.creator_payment?.toLocaleString() || 0}
                        {item.creator_paid && <Badge variant="outline" className="ml-1 text-[10px] px-1">Pagado</Badge>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>
                        Editor: ${item.editor_payment?.toLocaleString() || 0}
                        {item.editor_paid && <Badge variant="outline" className="ml-1 text-[10px] px-1">Pagado</Badge>}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
