import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, RefreshCw, Search, Filter, ChevronDown, Clock, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { EventCategory } from '@/types/tracking';

interface TrackingEventsLogProps {
  organizationId: string;
}

interface TrackingEvent {
  id: string;
  event_name: string;
  event_category: EventCategory;
  user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  context: Record<string, unknown>;
  created_at: string;
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  user: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  organization: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  content: 'bg-green-500/20 text-green-400 border-green-500/30',
  project: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  board: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  portfolio: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  chat: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  ai: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  navigation: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  interaction: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  system: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  user: 'Usuario',
  organization: 'Organización',
  content: 'Contenido',
  project: 'Proyecto',
  board: 'Board',
  portfolio: 'Portfolio',
  chat: 'Chat',
  ai: 'IA',
  navigation: 'Navegación',
  interaction: 'Interacción',
  system: 'Sistema',
};

export function TrackingEventsLog({ organizationId }: TrackingEventsLogProps) {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async () => {
    try {
      let query = supabase
        .from('tracking_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (categoryFilter !== 'all') {
        query = query.eq('event_category', categoryFilter);
      }

      if (searchQuery) {
        query = query.ilike('event_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data || []) as TrackingEvent[]);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [organizationId, categoryFilter, searchQuery]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('tracking-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tracking_events',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newEvent = payload.new as TrackingEvent;
          if (categoryFilter === 'all' || newEvent.event_category === categoryFilter) {
            setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, categoryFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Log de Eventos
            </CardTitle>
            <CardDescription>
              Eventos capturados en tiempo real
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Events list */}
        <ScrollArea className="h-[500px] rounded-md border">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Skeleton className="h-6 w-20" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay eventos</p>
              <p className="text-sm">Los eventos aparecerán aquí cuando se capturen</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Badge 
                    variant="outline" 
                    className={`${CATEGORY_COLORS[event.event_category]} text-xs shrink-0`}
                  >
                    {CATEGORY_LABELS[event.event_category]}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {event.event_name}
                      </span>
                      {event.entity_type && (
                        <Badge variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {event.entity_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: es })}
                      </span>
                      {event.user_id && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {event.user_id.slice(0, 8)}...
                        </span>
                      )}
                      {event.context && typeof event.context === 'object' && 'page' in event.context && (
                        <span className="truncate max-w-[200px]">
                          {String(event.context.page)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(event.created_at), 'HH:mm:ss')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Stats footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <span>{events.length} eventos mostrados</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Escuchando en tiempo real
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
