import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Content, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { KpiContentDialog } from '@/components/dashboard/KpiContentDialog';
import { ContentDetailDialog } from '@/components/content/ContentDetailDialog';
import { PortfolioButton } from '@/components/portfolio/PortfolioButton';
import { AmbassadorBadge } from '@/components/ui/ambassador-badge';
import { UPWidget } from '@/components/points/UPWidget';
import { Leaderboard } from '@/components/points/Leaderboard';
import { PointsHistory } from '@/components/points/PointsHistory';
import { 
  Video, 
  Clock, 
  CheckCircle2, 
  Star,
  ArrowRight,
  Loader2,
  DollarSign,
  CreditCard,
  TrendingUp,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Premium Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "primary",
  onClick,
  subtitle,
  prefix = "",
  suffix = ""
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color?: "primary" | "success" | "warning" | "info" | "destructive" | "purple";
  onClick?: () => void;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
}) => {
  const colorClasses = {
    primary: "from-primary/20 to-primary/5 border-primary/30",
    success: "from-success/20 to-success/5 border-success/30",
    warning: "from-warning/20 to-warning/5 border-warning/30",
    info: "from-info/20 to-info/5 border-info/30",
    destructive: "from-destructive/20 to-destructive/5 border-destructive/30",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
  };

  const iconColors = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    destructive: "text-destructive",
    purple: "text-purple-500",
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 p-4",
        "bg-gradient-to-br backdrop-blur-xl",
        "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        colorClasses[color],
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg bg-background/50", iconColors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{prefix}{value.toLocaleString()}{suffix}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user, profile, isAmbassador } = useAuth();
  const { content, loading, refetch } = useContent(user?.id, 'creator');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean;
    title: string;
    content: Content[];
  }>({ open: false, title: '', content: [] });

  const openKpiDialog = (title: string, contentList: Content[]) => {
    setKpiDialog({ open: true, title, content: contentList });
  };

  const showAmbassadorBadge = isAmbassador || !!profile?.is_ambassador;
  const inProgressContent = content.filter(c => ['assigned', 'recording'].includes(c.status));
  const approvedContent = content.filter(c => c.status === 'approved');
  const ambassadorContent = content.filter(c => c.is_ambassador_content);
  const unpaidContent = content.filter(c => c.status === 'approved' && !c.creator_paid);
  const paidContent = content.filter(c => c.status === 'paid' || c.creator_paid);
  
  const pendingPayment = unpaidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.creator_payment || 0), 0);
  
  const totalPaid = paidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.creator_payment || 0), 0);

  // Progreso
  const totalAssigned = content.length;
  const completedCount = content.filter(c => ['approved', 'paid', 'delivered'].includes(c.status)).length;
  const progressPercent = totalAssigned > 0 ? (completedCount / totalAssigned) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Panel de Creador</h1>
          <p className="text-sm text-muted-foreground">Bienvenido, {profile?.full_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showAmbassadorBadge && (
            <AmbassadorBadge size="md" variant="glow" />
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="font-semibold text-success text-sm">
              ${pendingPayment.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">pendiente</span>
          </div>

          {user && <PortfolioButton userId={user.id} />}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatsCard
            title="Total Asignados"
            value={content.length}
            icon={Video}
            color="primary"
            onClick={() => openKpiDialog('Total Asignados', content)}
          />
          <StatsCard
            title="En Progreso"
            value={inProgressContent.length}
            icon={Clock}
            color="info"
            onClick={() => openKpiDialog('En Progreso', inProgressContent)}
          />
          <StatsCard
            title="Aprobados"
            value={approvedContent.length}
            icon={CheckCircle2}
            color="success"
            onClick={() => openKpiDialog('Aprobados', approvedContent)}
          />
          <StatsCard
            title="Embajador"
            value={ambassadorContent.length}
            icon={Star}
            color="purple"
            onClick={() => openKpiDialog('Contenido Embajador', ambassadorContent)}
          />
          <StatsCard
            title="Por Pagar"
            value={unpaidContent.length}
            icon={DollarSign}
            color="warning"
            subtitle={`$${pendingPayment.toLocaleString()}`}
            onClick={() => openKpiDialog('Por Pagar', unpaidContent)}
          />
          <StatsCard
            title="Pagados"
            value={paidContent.length}
            icon={CreditCard}
            color="success"
            subtitle={`$${totalPaid.toLocaleString()}`}
            onClick={() => openKpiDialog('Pagados', paidContent)}
          />
        </div>

        {/* UGC Points Widget */}
        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <UPWidget userId={user.id} />
            <div className="lg:col-span-2">
              <Card className="border-border/50 h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm">Progreso General</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {completedCount} de {totalAssigned} completados
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {progressPercent.toFixed(0)}% de tu contenido ha sido aprobado o entregado
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Pending Work Alert */}
        {inProgressContent.length > 0 && (
          <Card className="border-info/30 bg-info/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-info/20">
                    <Clock className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Tienes {inProgressContent.length} proyecto(s) en progreso</p>
                    <p className="text-xs text-muted-foreground">Continúa con tus grabaciones</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/board')}>
                  Ver tablero
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Content */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Contenido Reciente</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/board')}>
              Ver todo
            </Button>
          </div>
          <div className="space-y-2">
            {content.slice(0, 5).map(item => (
              <Card key={item.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedContent(item)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <Play className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.client?.name || 'Sin cliente'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.is_ambassador_content && (
                      <Star className="w-3 h-3 text-primary fill-primary" />
                    )}
                    <Badge className={`text-xs ${STATUS_COLORS[item.status]}`} variant="secondary">
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {content.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-semibold mb-2">Sin proyectos asignados</h4>
                  <p className="text-sm text-muted-foreground">Cuando te asignen proyectos aparecerán aquí</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Ranking y Historial de Puntos */}
        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Leaderboard currentUserId={user.id} maxItems={5} />
            <PointsHistory userId={user.id} maxItems={10} />
          </div>
        )}
      </div>

      {/* Content Detail Dialog */}
      <ContentDetailDialog
        content={selectedContent}
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
        onUpdate={() => {
          refetch();
          setSelectedContent(null);
        }}
      />

      {/* KPI Content Dialog */}
      <KpiContentDialog
        title={kpiDialog.title}
        content={kpiDialog.content}
        open={kpiDialog.open}
        onOpenChange={(open) => setKpiDialog(prev => ({ ...prev, open }))}
        onSelectContent={setSelectedContent}
      />
    </div>
  );
}