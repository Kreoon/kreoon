import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Content, STATUS_COLORS, STATUS_LABELS } from "@/types/database";
import { cn } from "@/lib/utils";

interface BoardCalendarViewProps {
  content: Content[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onContentClick: (content: Content) => void;
}

export function BoardCalendarView({
  content,
  currentDate,
  onDateChange,
  onContentClick
}: BoardCalendarViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group content by deadline date
  const contentByDate = useMemo(() => {
    const map = new Map<string, Content[]>();
    content.forEach(c => {
      if (c.deadline) {
        const dateKey = format(new Date(c.deadline), 'yyyy-MM-dd');
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(c);
      }
    });
    return map;
  }, [content]);

  const prevMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Calculate first day offset (Monday = 0)
  const firstDayOffset = (monthStart.getDay() + 6) % 7;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDateChange(new Date())}
          >
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-xl overflow-hidden bg-card">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-24 border-t border-r bg-muted/20" />
          ))}

          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayContent = contentByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  "min-h-24 border-t border-r p-1 transition-colors",
                  !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                  isTodayDate && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "text-sm font-medium p-1 rounded",
                  isTodayDate && "bg-primary text-primary-foreground w-7 h-7 flex items-center justify-center"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1 mt-1">
                  {dayContent.slice(0, 3).map(c => (
                    <div
                      key={c.id}
                      onClick={() => onContentClick(c)}
                      className={cn(
                        "text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity",
                        STATUS_COLORS[c.status]
                      )}
                    >
                      {c.title}
                    </div>
                  ))}
                  {dayContent.length > 3 && (
                    <Badge variant="secondary" className="text-xs w-full justify-center">
                      +{dayContent.length - 3} más
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
