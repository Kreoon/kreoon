/**
 * StreamingRecapPage - Resumen post-live
 * Muestra métricas y permite exportar datos
 */

import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Download,
  Share2,
  Eye,
  Users,
  MessageSquare,
  ShoppingBag,
  Clock,
  TrendingUp,
  Calendar,
  Copy,
  CheckCircle,
} from 'lucide-react';

// Hooks
import { useStreamingSession } from '@/hooks/useStreamingSession';
import { useStreamingAnalytics } from '@/hooks/useStreamingAnalytics';

// Components
import { LiveAnalyticsDashboard } from '@/components/streaming-v2';

export function StreamingRecapPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id || '';

  // Get session
  const { sessions } = useStreamingSession(organizationId);
  const session = sessions.find((s) => s.id === sessionId);

  // Get analytics
  const { analytics } = useStreamingAnalytics(sessionId || '');

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando resumen...</p>
        </div>
      </div>
    );
  }

  // Calculate duration
  const duration = session.started_at && session.ended_at
    ? Math.round(
        (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000
      )
    : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/streaming')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{session.title}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {session.started_at &&
                format(new Date(session.started_at), "d 'de' MMMM, yyyy • HH:mm", { locale: es })}
              {session.ended_at && (
                <span> — {format(new Date(session.ended_at), 'HH:mm', { locale: es })}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Compartir
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Success banner */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-green-400">
              ¡Live completado exitosamente!
            </h2>
            <p className="text-sm text-muted-foreground">
              Tu transmisión duró {duration} minutos y alcanzó {session.peak_viewers || 0} viewers
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Duración total"
          value={`${duration} min`}
          icon={Clock}
          color="blue"
        />
        <StatCard
          label="Pico de viewers"
          value={session.peak_viewers || 0}
          icon={Eye}
          color="purple"
        />
        <StatCard
          label="Total mensajes"
          value={session.total_messages || 0}
          icon={MessageSquare}
          color="green"
        />
        {session.is_shopping_enabled && (
          <StatCard
            label="Ventas totales"
            value={`$${session.total_revenue_usd?.toFixed(0) || 0}`}
            icon={ShoppingBag}
            color="yellow"
          />
        )}
      </div>

      {/* Detailed analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics Detallado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LiveAnalyticsDashboard
            analytics={analytics}
            currentViewers={0}
            peakViewers={session.peak_viewers || 0}
            totalMessages={session.total_messages || 0}
            totalRevenue={session.total_revenue_usd || 0}
          />
        </CardContent>
      </Card>

      {/* Session details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la sesión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo de sesión</span>
              <Badge variant="secondary" className="capitalize">
                {session.session_type}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Live Shopping</span>
              <Badge variant={session.is_shopping_enabled ? 'default' : 'secondary'}>
                {session.is_shopping_enabled ? 'Habilitado' : 'Deshabilitado'}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Canales transmitidos</span>
              <span className="font-medium">{session.channels?.length || 0}</span>
            </div>
            <Separator />
            {session.is_shopping_enabled && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Productos vendidos</span>
                  <span className="font-medium">{session.total_products_sold || 0}</span>
                </div>
                <Separator />
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID de sesión</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {session.id.slice(0, 8)}...
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => navigator.clipboard.writeText(session.id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos pasos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Descargar reporte PDF
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Share2 className="mr-2 h-4 w-4" />
              Compartir resumen en redes
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Copy className="mr-2 h-4 w-4" />
              Duplicar sesión para nuevo live
            </Button>
            <Separator />
            <Button
              className="w-full"
              onClick={() => navigate('/streaming')}
            >
              Volver al hub
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stat card component
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'green' | 'yellow';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className={cn('rounded-sm p-2', colorClasses[color])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default StreamingRecapPage;
