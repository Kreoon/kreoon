/**
 * StreamingSessionList - Lista de sesiones con filtros
 */

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Search, Plus, Radio, Calendar, CheckCircle, LayoutGrid, List } from 'lucide-react';
import { StreamingSessionCard } from './StreamingSessionCard';
import type { StreamingSession, StreamingSessionStatus } from '@/types/streaming.types';

interface StreamingSessionListProps {
  sessions: StreamingSession[];
  isLoading?: boolean;
  onCreateSession?: () => void;
  onStartSession?: (sessionId: string) => void;
  onPauseSession?: (sessionId: string) => void;
  onStopSession?: (sessionId: string) => void;
  onEditSession?: (session: StreamingSession) => void;
  onDuplicateSession?: (session: StreamingSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onSelectSession?: (session: StreamingSession) => void;
  className?: string;
}

type FilterTab = 'all' | 'live' | 'scheduled' | 'ended';
type ViewMode = 'grid' | 'list';

export function StreamingSessionList({
  sessions,
  isLoading,
  onCreateSession,
  onStartSession,
  onPauseSession,
  onStopSession,
  onEditSession,
  onDuplicateSession,
  onDeleteSession,
  onSelectSession,
  className,
}: StreamingSessionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let result = sessions;

    // Filter by tab
    if (activeTab !== 'all') {
      const statusMap: Record<FilterTab, StreamingSessionStatus[]> = {
        all: [],
        live: ['live', 'paused', 'preparing'],
        scheduled: ['scheduled', 'draft'],
        ended: ['ended'],
      };
      result = result.filter((s) => statusMap[activeTab].includes(s.status));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
      );
    }

    // Sort: live first, then by date
    result = [...result].sort((a, b) => {
      // Live sessions first
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;

      // Then by scheduled/created date
      const dateA = new Date(a.scheduled_at || a.created_at).getTime();
      const dateB = new Date(b.scheduled_at || b.created_at).getTime();
      return dateB - dateA;
    });

    return result;
  }, [sessions, activeTab, searchQuery]);

  // Count by status
  const counts = useMemo(() => {
    return {
      all: sessions.length,
      live: sessions.filter((s) => ['live', 'paused', 'preparing'].includes(s.status)).length,
      scheduled: sessions.filter((s) => ['scheduled', 'draft'].includes(s.status)).length,
      ended: sessions.filter((s) => s.status === 'ended').length,
    };
  }, [sessions]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar sesiones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 rounded-sm border p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {onCreateSession && (
            <Button onClick={onCreateSession}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Sesión
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="gap-2">
            Todas
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {counts.all}
            </span>
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2">
            <Radio className="h-3 w-3" />
            En Vivo
            {counts.live > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                {counts.live}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Calendar className="h-3 w-3" />
            Programadas
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {counts.scheduled}
            </span>
          </TabsTrigger>
          <TabsTrigger value="ended" className="gap-2">
            <CheckCircle className="h-3 w-3" />
            Finalizadas
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {counts.ended}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Sessions grid/list */}
      {filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Radio className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No hay sesiones</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery
              ? 'No se encontraron sesiones con ese criterio'
              : activeTab === 'live'
              ? 'No hay sesiones en vivo actualmente'
              : 'Crea tu primera sesión de streaming'}
          </p>
          {onCreateSession && !searchQuery && activeTab === 'all' && (
            <Button className="mt-4" onClick={onCreateSession}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Sesión
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
              : 'space-y-4'
          )}
        >
          {filteredSessions.map((session) => (
            <StreamingSessionCard
              key={session.id}
              session={session}
              onStart={onStartSession}
              onPause={onPauseSession}
              onStop={onStopSession}
              onEdit={onEditSession}
              onDuplicate={onDuplicateSession}
              onDelete={onDeleteSession}
              onClick={onSelectSession}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default StreamingSessionList;
