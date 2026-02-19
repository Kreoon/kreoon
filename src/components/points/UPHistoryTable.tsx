import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Video, Scissors, Clock, TrendingUp, TrendingDown, CheckCircle,
  AlertCircle, RefreshCw, Award, History
} from 'lucide-react';
import { useUserEvents } from '@/hooks/useUnifiedReputation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Event types aligned with Unified Reputation Engine (reputation_events table)
const EVENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  // Delivery events
  early_delivery:      { label: 'Entrega temprana',    icon: TrendingUp,    color: 'text-emerald-500 bg-emerald-500/10' },
  on_time_delivery:    { label: 'Entrega a tiempo',    icon: CheckCircle,   color: 'text-green-500 bg-green-500/10' },
  late_delivery:       { label: 'Entrega tardía',      icon: Clock,         color: 'text-yellow-500 bg-yellow-500/10' },
  // Issue events
  issue_penalty:       { label: 'Penalización novedad',icon: AlertCircle,   color: 'text-red-500 bg-red-500/10' },
  issue_recovery:      { label: 'Recuperación',        icon: RefreshCw,     color: 'text-blue-500 bg-blue-500/10' },
  // Bonus events
  clean_approval_bonus:{ label: 'Aprobación limpia',   icon: Award,         color: 'text-primary bg-primary/10' },
  // Other
  reassignment:        { label: 'Reasignación',        icon: RefreshCw,     color: 'text-muted-foreground bg-muted' },
};

interface ReputationEvent {
  id: string;
  event_type: string;
  event_subtype?: string;
  base_points: number;
  multiplier: number;
  final_points: number;
  calculation_breakdown?: Record<string, any>;
  role_key?: string;
  reference_type?: string;
  reference_id?: string;
  event_date?: string;
  created_at: string;
}

interface HistoryEntryProps {
  event: ReputationEvent;
}

function HistoryEntry({ event }: HistoryEntryProps) {
  // event_subtype is the specific action key; fall back to event_type
  const configKey = event.event_subtype || event.event_type;
  const eventConfig = EVENT_CONFIG[configKey] || {
    label: configKey,
    icon: Clock,
    color: 'text-muted-foreground bg-muted',
  };
  const Icon = eventConfig.icon;

  // Description: prefer breakdown source, then a generic label
  const description =
    event.calculation_breakdown?.source ||
    event.calculation_breakdown?.reason ||
    null;

  const timestamp = event.event_date || event.created_at;

  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-b-0">
      <div className={cn('p-2 rounded-lg', eventConfig.color)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{eventConfig.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {description || 'Sin descripción'}
        </p>
      </div>

      <div className="text-right">
        <div
          className={cn(
            'font-bold',
            event.final_points > 0
              ? 'text-green-500'
              : event.final_points < 0
              ? 'text-red-500'
              : 'text-muted-foreground'
          )}
        >
          {event.final_points > 0 ? '+' : ''}
          {event.final_points} UP
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(timestamp), 'dd MMM HH:mm', { locale: es })}
        </div>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 border-b">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyHistory({ type }: { type: 'creator' | 'editor' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <History className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        Sin historial de puntos como {type === 'creator' ? 'creador' : 'editor'}
      </p>
    </div>
  );
}

interface UPHistoryTableProps {
  userId: string;
}

export function UPHistoryTable({ userId }: UPHistoryTableProps) {
  const [activeTab, setActiveTab] = useState<'creators' | 'editors'>('creators');

  const { events: creatorEvents, loading: loadingCreator } = useUserEvents(userId, undefined, 'creator');
  const { events: editorEvents, loading: loadingEditor }   = useUserEvents(userId, undefined, 'editor');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Historial de Puntos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'creators' | 'editors')}>
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
            <TabsTrigger value="creators" className="gap-2 rounded-none">
              <Video className="h-4 w-4" />
              Creador
            </TabsTrigger>
            <TabsTrigger value="editors" className="gap-2 rounded-none">
              <Scissors className="h-4 w-4" />
              Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="creators" className="mt-0">
            <ScrollArea className="h-[400px]">
              {loadingCreator ? (
                <HistorySkeleton />
              ) : creatorEvents.length === 0 ? (
                <EmptyHistory type="creator" />
              ) : (
                creatorEvents.map(event => (
                  <HistoryEntry key={event.id} event={event as ReputationEvent} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="editors" className="mt-0">
            <ScrollArea className="h-[400px]">
              {loadingEditor ? (
                <HistorySkeleton />
              ) : editorEvents.length === 0 ? (
                <EmptyHistory type="editor" />
              ) : (
                editorEvents.map(event => (
                  <HistoryEntry key={event.id} event={event as ReputationEvent} />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
