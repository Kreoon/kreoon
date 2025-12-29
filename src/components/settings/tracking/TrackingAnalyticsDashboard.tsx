import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Users, Activity, MousePointer, Eye, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { EventCategory } from '@/types/tracking';

interface TrackingAnalyticsDashboardProps {
  organizationId: string;
}

interface KPI {
  label: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
}

interface EventsByCategory {
  category: string;
  count: number;
  color: string;
}

interface EventsByDay {
  date: string;
  count: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  user: '#3b82f6',
  organization: '#a855f7',
  content: '#22c55e',
  project: '#f97316',
  board: '#eab308',
  portfolio: '#ec4899',
  chat: '#06b6d4',
  ai: '#8b5cf6',
  navigation: '#64748b',
  interaction: '#10b981',
  system: '#ef4444',
};

const CATEGORY_LABELS: Record<string, string> = {
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

export function TrackingAnalyticsDashboard({ organizationId }: TrackingAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [totalEvents, setTotalEvents] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [topEvents, setTopEvents] = useState<{ event_name: string; count: number }[]>([]);
  const [eventsByCategory, setEventsByCategory] = useState<EventsByCategory[]>([]);
  const [eventsByDay, setEventsByDay] = useState<EventsByDay[]>([]);
  const [previousPeriodEvents, setPreviousPeriodEvents] = useState(0);
  const [previousPeriodUsers, setPreviousPeriodUsers] = useState(0);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());
      const previousStartDate = startOfDay(subDays(startDate, days));

      // Current period events
      const { data: eventsData, error: eventsError } = await supabase
        .from('tracking_events')
        .select('id, event_name, event_category, user_id, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (eventsError) throw eventsError;

      // Previous period events for comparison
      const { data: prevEventsData } = await supabase
        .from('tracking_events')
        .select('id, user_id')
        .eq('organization_id', organizationId)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      // Calculate KPIs
      const events = eventsData || [];
      setTotalEvents(events.length);
      
      const uniqueUserIds = new Set(events.filter(e => e.user_id).map(e => e.user_id));
      setUniqueUsers(uniqueUserIds.size);

      const prevEvents = prevEventsData || [];
      setPreviousPeriodEvents(prevEvents.length);
      const prevUniqueUsers = new Set(prevEvents.filter(e => e.user_id).map(e => e.user_id));
      setPreviousPeriodUsers(prevUniqueUsers.size);

      // Top events
      const eventCounts: Record<string, number> = {};
      events.forEach(e => {
        eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
      });
      const sortedEvents = Object.entries(eventCounts)
        .map(([event_name, count]) => ({ event_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopEvents(sortedEvents);

      // Events by category
      const categoryCounts: Record<string, number> = {};
      events.forEach(e => {
        categoryCounts[e.event_category] = (categoryCounts[e.event_category] || 0) + 1;
      });
      const categoryData = Object.entries(categoryCounts).map(([category, count]) => ({
        category: CATEGORY_LABELS[category] || category,
        count,
        color: CATEGORY_COLORS[category] || '#64748b',
      }));
      setEventsByCategory(categoryData);

      // Events by day
      const dayCounts: Record<string, number> = {};
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dayCounts[date] = 0;
      }
      events.forEach(e => {
        const date = format(new Date(e.created_at), 'yyyy-MM-dd');
        if (dayCounts[date] !== undefined) {
          dayCounts[date]++;
        }
      });
      const dayData = Object.entries(dayCounts).map(([date, count]) => ({
        date: format(new Date(date), 'dd MMM', { locale: es }),
        count,
      }));
      setEventsByDay(dayData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [organizationId, dateRange]);

  const calculateChange = (current: number, previous: number): { value: number; type: 'increase' | 'decrease' | 'neutral' } => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, type: current > 0 ? 'increase' : 'neutral' };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change)),
      type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
    };
  };

  const eventsChange = calculateChange(totalEvents, previousPeriodEvents);
  const usersChange = calculateChange(uniqueUsers, previousPeriodUsers);

  const kpis: KPI[] = [
    {
      label: 'Total Eventos',
      value: totalEvents,
      change: eventsChange.value,
      changeType: eventsChange.type,
      icon: <Activity className="h-5 w-5 text-blue-500" />,
    },
    {
      label: 'Usuarios Únicos',
      value: uniqueUsers,
      change: usersChange.value,
      changeType: usersChange.type,
      icon: <Users className="h-5 w-5 text-green-500" />,
    },
    {
      label: 'Eventos/Usuario',
      value: uniqueUsers > 0 ? Math.round(totalEvents / uniqueUsers) : 0,
      change: 0,
      changeType: 'neutral',
      icon: <MousePointer className="h-5 w-5 text-purple-500" />,
    },
    {
      label: 'Promedio Diario',
      value: Math.round(totalEvents / parseInt(dateRange)),
      change: 0,
      changeType: 'neutral',
      icon: <Eye className="h-5 w-5 text-orange-500" />,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Métricas y tendencias de eventos
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="14">Últimos 14 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                {kpi.icon}
                {kpi.changeType !== 'neutral' && (
                  <div className={`flex items-center gap-1 text-xs ${
                    kpi.changeType === 'increase' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {kpi.changeType === 'increase' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {kpi.change}%
                  </div>
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{kpi.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Events over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos por Día</CardTitle>
            <CardDescription>Tendencia de eventos en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={eventsByDay}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorEvents)"
                  name="Eventos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Events by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos por Categoría</CardTitle>
            <CardDescription>Distribución por tipo de evento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={eventsByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="category"
                >
                  {eventsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 Eventos</CardTitle>
          <CardDescription>Eventos más frecuentes en el período</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topEvents} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                type="category"
                dataKey="event_name"
                tick={{ fontSize: 11 }}
                width={150}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Eventos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
