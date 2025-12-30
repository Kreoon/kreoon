import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, MousePointerClick, MessageCircle, TrendingUp, Radio } from 'lucide-react';
import { useStreamingRealtime } from '../hooks/useStreamingRealtime';

interface LiveMetricsCardProps {
  eventId?: string;
  compact?: boolean;
}

export function LiveMetricsCard({ eventId, compact = false }: LiveMetricsCardProps) {
  const { metrics, isLive, liveEvents } = useStreamingRealtime(eventId);

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
        <Badge variant={isLive ? 'destructive' : 'secondary'} className="gap-1">
          <Radio className="h-3 w-3" />
          {isLive ? 'EN VIVO' : 'Offline'}
        </Badge>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{metrics.currentViewers}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span>{metrics.totalViews}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span>{metrics.peakViewers} peak</span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Métricas en Tiempo Real</span>
          <Badge variant={isLive ? 'destructive' : 'secondary'} className="gap-1">
            <Radio className="h-3 w-3" />
            {isLive ? 'EN VIVO' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.currentViewers}</p>
              <p className="text-xs text-muted-foreground">Viewers Ahora</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.peakViewers}</p>
              <p className="text-xs text-muted-foreground">Peak Viewers</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-blue-500/10">
              <Eye className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.totalViews}</p>
              <p className="text-xs text-muted-foreground">Total Views</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-purple-500/10">
              <MessageCircle className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.chatMessages}</p>
              <p className="text-xs text-muted-foreground">Chat Messages</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-orange-500/10">
              <MousePointerClick className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.productClicks}</p>
              <p className="text-xs text-muted-foreground">Product Clicks</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-red-500/10">
              <Radio className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{liveEvents.length}</p>
              <p className="text-xs text-muted-foreground">Eventos Live</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
