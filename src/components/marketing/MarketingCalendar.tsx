import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Image, Video, FileText } from "lucide-react";
import { toast } from "sonner";
import { MarketingCalendarItem, PLATFORMS, CONTENT_TYPES } from "./types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketingCalendarProps {
  organizationId: string | null | undefined;
}

export function MarketingCalendar({ organizationId }: MarketingCalendarProps) {
  const [items, setItems] = useState<MarketingCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (organizationId) {
      fetchCalendarItems();
    }
  }, [organizationId, currentMonth]);

  const fetchCalendarItems = async () => {
    if (!organizationId) return;

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    try {
      const { data, error } = await supabase
        .from('marketing_content_calendar')
        .select(`
          *,
          marketing_client:marketing_clients(
            id,
            client:clients(id, name)
          )
        `)
        .eq('organization_id', organizationId)
        .gte('scheduled_date', format(start, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(end, 'yyyy-MM-dd'))
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      
      setItems((data || []).map(item => ({
        ...item,
        media_urls: item.media_urls || [],
        hashtags: item.hashtags || [],
        performance: item.performance || {},
      })) as unknown as MarketingCalendarItem[]);
    } catch (error) {
      console.error('Error fetching calendar items:', error);
      toast.error('Error al cargar calendario');
    } finally {
      setLoading(false);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getItemsForDay = (date: Date) => {
    return items.filter(item => isSameDay(new Date(item.scheduled_date), date));
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
      case 'reel':
      case 'live':
        return Video;
      case 'post':
      case 'carousel':
        return Image;
      default:
        return FileText;
    }
  };

  const getPlatformColor = (platform: string) => {
    const p = PLATFORMS.find(pl => pl.value === platform);
    return p?.color || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'ready':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Contenido
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before the first of the month */}
            {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px] p-2 border-r border-b bg-muted/30" />
            ))}

            {days.map((day) => {
              const dayItems = getItemsForDay(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[120px] p-2 border-r border-b last:border-r-0",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday(day) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => {
                      const Icon = getContentTypeIcon(item.content_type);
                      
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
                            getPlatformColor(item.platform),
                            "text-white"
                          )}
                          title={item.title}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(item.status))} />
                            <Icon className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {dayItems.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayItems.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium">Plataformas:</span>
          {PLATFORMS.slice(0, 4).map(p => (
            <Badge key={p.value} className={cn(p.color, "text-white text-xs")}>
              {p.label}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Estado:</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span>Planeado</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>En progreso</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Publicado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
