import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Image, Video, FileText, Filter, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { MarketingCalendarItem, PLATFORMS, CONTENT_TYPES } from "./types";
import { AddCalendarItemDialog } from "./AddCalendarItemDialog";
import { CalendarItemDetailDialog } from "./CalendarItemDetailDialog";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MarketingCalendarProps {
  organizationId: string | null | undefined;
}

export function MarketingCalendar({ organizationId }: MarketingCalendarProps) {
  const [items, setItems] = useState<MarketingCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<MarketingCalendarItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchCalendarItems();
    }
  }, [organizationId, currentMonth, currentWeek, viewMode]);

  const fetchCalendarItems = async () => {
    if (!organizationId) return;

    let start: Date, end: Date;
    
    if (viewMode === 'week') {
      start = startOfWeek(currentWeek, { weekStartsOn: 1 });
      end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(currentMonth);
      end = endOfMonth(currentMonth);
    }

    try {
      let query = supabase
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

      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter);
      }

      const { data, error } = await query;
      
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

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 }),
  });

  const handleItemClick = (item: MarketingCalendarItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentWeek(addWeeks(currentWeek, 1));
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const getDateTitle = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
    }
    return format(currentMonth, 'MMMM yyyy', { locale: es });
  };

  const filteredItems = platformFilter === 'all' 
    ? items 
    : items.filter(item => item.platform === platformFilter);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold capitalize min-w-[200px] text-center">
              {getDateTitle()}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              setCurrentMonth(new Date());
              setCurrentWeek(new Date());
            }}>
              Hoy
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('month')}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Mes
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('week')}
              >
                <List className="h-4 w-4 mr-1" />
                Semana
              </Button>
            </div>

            {/* Platform Filter */}
            <Select value={platformFilter} onValueChange={(v) => {
              setPlatformFilter(v);
              fetchCalendarItems();
            }}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AddCalendarItemDialog organizationId={organizationId} onSuccess={fetchCalendarItems} />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4">
          {['planned', 'in_progress', 'ready', 'published', 'cancelled'].map(status => {
            const count = filteredItems.filter(i => i.status === status).length;
            const labels: Record<string, string> = {
              planned: 'Planeados',
              in_progress: 'En Progreso',
              ready: 'Listos',
              published: 'Publicados',
              cancelled: 'Cancelados'
            };
            return (
              <div key={status} className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{labels[status]}</div>
              </div>
            );
          })}
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
            {viewMode === 'month' ? (
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
                            <Tooltip key={item.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
                                    getPlatformColor(item.platform),
                                    "text-white"
                                  )}
                                  onClick={() => handleItemClick(item)}
                                >
                                  <div className="flex items-center gap-1 truncate">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(item.status))} />
                                    <Icon className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{item.title}</span>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {CONTENT_TYPES.find(t => t.value === item.content_type)?.label} • {item.scheduled_time || 'Sin hora'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        
                        {dayItems.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center cursor-pointer hover:text-primary">
                            +{dayItems.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Week View */
              <div className="grid grid-cols-7">
                {weekDays.map((day) => {
                  const dayItems = getItemsForDay(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[400px] p-2 border-r last:border-r-0",
                        isToday(day) && "bg-primary/5"
                      )}
                    >
                      <div className={cn(
                        "text-center mb-3",
                        isToday(day) && "text-primary"
                      )}>
                        <div className="text-xs text-muted-foreground">
                          {format(day, 'EEE', { locale: es })}
                        </div>
                        <div className="text-lg font-semibold">
                          {format(day, 'd')}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {dayItems.map((item) => {
                          const Icon = getContentTypeIcon(item.content_type);
                          
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "text-xs p-2 rounded cursor-pointer hover:opacity-80 transition-opacity",
                                getPlatformColor(item.platform),
                                "text-white"
                              )}
                              onClick={() => handleItemClick(item)}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <span className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(item.status))} />
                                <Icon className="h-3 w-3" />
                              </div>
                              <div className="font-medium truncate">{item.title}</div>
                              {item.scheduled_time && (
                                <div className="text-[10px] opacity-80 mt-1">{item.scheduled_time}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

        {/* Detail Dialog */}
        <CalendarItemDetailDialog
          item={selectedItem}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUpdate={() => {
            fetchCalendarItems();
            setDetailOpen(false);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
