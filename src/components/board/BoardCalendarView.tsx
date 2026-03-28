import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { toDateKeyInTz } from "@/lib/utils/timezone";
import { ChevronLeft, ChevronRight, Star, Video, FileText, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Content, STATUS_COLORS, STATUS_LABELS } from "@/types/database";
import { cn } from "@/lib/utils";
import { OrganizationStatus, getStatusColorStyle, getStatusFallbackClass } from "@/lib/statusUtils";
import { CardFieldsCustomizer } from "./CardFieldsCustomizer";

interface BoardCalendarViewProps {
  content: Content[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onContentClick: (content: Content) => void;
  cardSize?: 'compact' | 'normal' | 'large';
  visibleFields?: string[];
  onVisibleFieldsChange?: (fields: string[]) => void;
  organizationStatuses?: OrganizationStatus[];
  ambassadorIds?: Set<string>;
  /** Mostrar customizador de campos en header */
  showFieldsCustomizer?: boolean;
}

export function BoardCalendarView({
  content,
  currentDate,
  onDateChange,
  onContentClick,
  cardSize = 'normal',
  visibleFields = ['title', 'status', 'responsible'],
  onVisibleFieldsChange,
  organizationStatuses = [],
  ambassadorIds = new Set(),
  showFieldsCustomizer = true
}: BoardCalendarViewProps) {
  const orgTz = useOrgTimezone();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const showField = (field: string) => visibleFields.includes(field);

  // Group content by deadline date
  const contentByDate = useMemo(() => {
    const map = new Map<string, Content[]>();
    content.forEach(c => {
      if (c.deadline) {
        const dateKey = toDateKeyInTz(c.deadline, orgTz);
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

  // Max items to show based on card size
  const maxItems = cardSize === 'compact' ? 2 : cardSize === 'large' ? 5 : 3;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex items-center gap-2">
          {/* Navegación de meses */}
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
          {/* Personalizador de campos - estilo Notion */}
          {showFieldsCustomizer && onVisibleFieldsChange && (
            <CardFieldsCustomizer
              visibleFields={visibleFields}
              onFieldsChange={onVisibleFieldsChange}
              compact={true}
            />
          )}
        </div>
      </div>

      {/* Calendar Grid - Nova v2 */}
      <div className="border border-zinc-200/80 dark:border-purple-500/15 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f22]">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-zinc-100 dark:bg-[#0a0a18]/60">
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
            <div key={`empty-${i}`} className="min-h-24 border-t border-r border-zinc-200/80 dark:border-purple-500/10 bg-zinc-50 dark:bg-[#050510]/40" />
          ))}

          {days.map(day => {
            const dateKey = toDateKeyInTz(day, orgTz);
            const dayContent = contentByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  // Base styles - Nova v2
                  "min-h-24 border-t border-r p-1 transition-all duration-200",
                  "border-zinc-200/80 dark:border-purple-500/10",
                  // Inactive month
                  !isCurrentMonth && "bg-zinc-50 dark:bg-[#050510]/40 text-zinc-400 dark:text-[#52525b]",
                  // Today highlight - Nova glow
                  isTodayDate && "bg-purple-50 dark:bg-purple-500/8 dark:shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]"
                )}
              >
                <div className={cn(
                  "text-sm font-medium p-1 rounded",
                  isTodayDate && "bg-primary text-primary-foreground w-7 h-7 flex items-center justify-center"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1 mt-1">
                  {dayContent.slice(0, maxItems).map(c => {
                    const hasVideo = c.video_url || (c.video_urls && c.video_urls.length > 0);
                    const statusStyle = getStatusColorStyle(c.status, organizationStatuses);
                    const statusClass = getStatusFallbackClass(c.status, organizationStatuses);
                    
                    return (
                      <div
                        key={c.id}
                        onClick={() => onContentClick(c)}
                        className={cn(
                          "rounded cursor-pointer hover:opacity-80 transition-opacity",
                          statusClass,
                          cardSize === 'compact' ? "p-0.5" : "p-1"
                        )}
                        style={statusStyle || undefined}
                      >
                        {/* Title */}
                        {showField('title') && (
                          <div className={cn(
                            "truncate",
                            cardSize === 'compact' ? "text-[10px]" : "text-xs"
                          )}>
                            {c.title}
                          </div>
                        )}
                        
                        {/* Extra info for normal/large */}
                        {cardSize !== 'compact' && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {/* Responsible avatar */}
                            {showField('responsible') && c.creator && (
                              <Avatar className="h-3 w-3">
                                <AvatarImage src={c.creator.avatar_url || undefined} />
                                <AvatarFallback className="text-[6px]">
                                  {c.creator.full_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            {/* Indicators */}
                            {showField('indicators') && (
                              <div className="flex items-center gap-0.5 ml-auto">
                                {hasVideo && <div className="h-1.5 w-1.5 rounded-full bg-green-600" />}
                                {c.script && <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dayContent.length > maxItems && (
                    <Badge variant="secondary" className="text-xs w-full justify-center">
                      +{dayContent.length - maxItems} más
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
