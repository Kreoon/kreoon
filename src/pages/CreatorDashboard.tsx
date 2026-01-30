import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useContent } from '@/hooks/useContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Content, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { KpiContentDialog } from '@/components/dashboard/KpiContentDialog';
import { ContentDetailDialog } from '@/components/content/ContentDetailDialog/index';
import { PortfolioButton } from '@/components/portfolio/PortfolioButton';
import { AmbassadorBadge } from '@/components/ui/ambassador-badge';
import { RoleUPWidget } from '@/components/points/RoleUPWidget';
import { RoleLeaderboard } from '@/components/points/RoleLeaderboard';
import { UPHistoryTable } from '@/components/points/UPHistoryTable';
import { ThisMonthFilter, useThisMonthFilter } from '@/components/dashboard/ThisMonthFilter';
import { TechStatsCard } from '@/components/dashboard/TechStatsCard';
import { TechPageHeader } from '@/components/layout/TechPageHeader';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
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
  Play,
  Sword,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { effectiveUserId, isImpersonating } = useImpersonation();
  
  // Use effective user ID for impersonation, otherwise real user ID
  const targetUserId = isImpersonating ? effectiveUserId : user?.id;
  
  const { content: allContent, loading, refetch } = useContent(targetUserId, 'creator');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [thisMonthActive, setThisMonthActive] = useState(false);
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean;
    title: string;
    content: Content[];
  }>({ open: false, title: '', content: [] });

  // Filtrar por mes actual
  const content = useThisMonthFilter(allContent, thisMonthActive);

  const openKpiDialog = (title: string, contentList: Content[]) => {
    setKpiDialog({ open: true, title, content: contentList });
  };

  const showAmbassadorBadge = !!profile?.is_ambassador;
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
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-6 p-4 md:p-6">
        {/* Tech Page Header */}
        <TechPageHeader
          icon={Sword}
          title="Creator Dashboard"
          subtitle={`Bienvenido, ${profile?.full_name}`}
          badge={showAmbassadorBadge ? <AmbassadorBadge size="md" variant="glow" /> : undefined}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <ThisMonthFilter isActive={thisMonthActive} onToggle={setThisMonthActive} />
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success/20 to-success/10 border border-success/30 rounded-xl shadow-lg shadow-success/10">
                <DollarSign className="w-4 h-4 text-success" />
                <span className="font-bold text-success">
                  ${pendingPayment.toLocaleString()}
                </span>
                <span className="text-xs text-success/70 hidden sm:inline">pendiente</span>
              </div>
              {targetUserId && <PortfolioButton userId={targetUserId} />}
            </div>
          }
        />

        {/* Dashboard Content */}
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <TechStatsCard
              title="Total Asignados"
              value={content.length}
              icon={Video}
              color="primary"
              onClick={() => openKpiDialog('Total Asignados', content)}
              size="sm"
            />
            <TechStatsCard
              title="En Progreso"
              value={inProgressContent.length}
              icon={Clock}
              color="info"
              onClick={() => openKpiDialog('En Progreso', inProgressContent)}
              size="sm"
            />
            <TechStatsCard
              title="Aprobados"
              value={approvedContent.length}
              icon={CheckCircle2}
              color="success"
              onClick={() => openKpiDialog('Aprobados', approvedContent)}
              size="sm"
            />
            <TechStatsCard
              title="Embajador"
              value={ambassadorContent.length}
              icon={Star}
              color="violet"
              onClick={() => openKpiDialog('Contenido Embajador', ambassadorContent)}
              size="sm"
            />
            <TechStatsCard
              title="Por Pagar"
              value={unpaidContent.length}
              icon={DollarSign}
              color="warning"
              subtitle={`$${pendingPayment.toLocaleString()}`}
              onClick={() => openKpiDialog('Por Pagar', unpaidContent)}
              size="sm"
            />
            <TechStatsCard
              title="Pagados"
              value={paidContent.length}
              icon={CreditCard}
              color="success"
              subtitle={`$${totalPaid.toLocaleString()}`}
              onClick={() => openKpiDialog('Pagados', paidContent)}
              size="sm"
            />
          </div>

          {/* UGC Points Widget */}
          {targetUserId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <RoleUPWidget userId={targetUserId} role="creator" />
              <div className="lg:col-span-2">
                <TechCard variant="glass" className="h-full">
                  <TechCardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-sm">Progreso General</h3>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {completedCount} de {totalAssigned} completados
                      </span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {progressPercent.toFixed(0)}% de tu contenido ha sido aprobado o entregado
                    </p>
                  </TechCardContent>
                </TechCard>
              </div>
            </div>
          )}

          {/* Pending Work Alert */}
          {inProgressContent.length > 0 && (
            <TechCard variant="glow" glowColor="info" className="border-info/30">
              <TechCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-info/20 border border-info/30">
                      <Clock className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Tienes {inProgressContent.length} proyecto(s) en progreso</p>
                      <p className="text-xs text-muted-foreground">Continúa con tus grabaciones</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/board')}
                    className="bg-info/20 hover:bg-info/30 text-info border border-info/30"
                  >
                    Ver tablero
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </TechCardContent>
            </TechCard>
          )}

          {/* Recent Content */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Contenido Reciente
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/board')}>
                Ver todo
              </Button>
            </div>
            <div className="space-y-2">
              {content.slice(0, 5).map(item => (
                <TechCard 
                  key={item.id} 
                  variant="glass"
                  className="cursor-pointer hover:scale-[1.01]" 
                  onClick={() => setSelectedContent(item)}
                >
                  <TechCardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
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
                      <Badge className={cn("text-xs", STATUS_COLORS[item.status])} variant="secondary">
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                  </TechCardContent>
                </TechCard>
              ))}
              {content.length === 0 && (
                <TechCard variant="glass">
                  <TechCardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <Video className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-2">Sin proyectos asignados</h4>
                    <p className="text-sm text-muted-foreground">Cuando te asignen proyectos aparecerán aquí</p>
                  </TechCardContent>
                </TechCard>
              )}
            </div>
          </div>

          {/* Ranking y Historial de Puntos */}
          {targetUserId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RoleLeaderboard role="creator" currentUserId={targetUserId} maxItems={5} />
              <UPHistoryTable userId={targetUserId} />
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
    </div>
  );
}
