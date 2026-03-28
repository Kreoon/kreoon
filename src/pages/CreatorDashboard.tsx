import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store } from 'lucide-react';
import { MarketplaceDashboardTab } from '@/components/marketplace/dashboard/MarketplaceDashboardTab';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useContent } from '@/hooks/useContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Content, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { TechKpiDialog } from '@/components/dashboard/TechKpiDialog';
import { UnifiedProjectModal } from '@/components/projects/UnifiedProjectModal';
import { PortfolioButton } from '@/components/portfolio/PortfolioButton';
import { AmbassadorBadge } from '@/components/ui/ambassador-badge';
import { RoleUPWidget } from '@/components/points/RoleUPWidget';
import { SeasonUrgencyBanner } from '@/components/points/SeasonUrgencyBanner';
import { RoleLeaderboard } from '@/components/points/RoleLeaderboard';
import { UPHistoryTable } from '@/components/points/UPHistoryTable';
import { ThisMonthFilter, useThisMonthFilter } from '@/components/dashboard/ThisMonthFilter';
import { TechKpiCard } from '@/components/dashboard/TechKpiCard';
import { TechPageHeader } from '@/components/layout/TechPageHeader';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import {
  TechGrid,
  TechParticles,
  TechOrb,
  StaggerContainer,
  StaggerItem,
  DataFlowLines,
  NeonText
} from '@/components/ui/tech-effects';
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
  Sparkles,
  Zap,
  Clapperboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Importar componentes del sistema Kreoon IA
import {
  LevelBadge,
  CreditsDisplay,
  ProgressToNextLevel,
  QuickActions,
  SeasonBanner,
  VOCABULARIO_ROL
} from '@/components/studio';

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { effectiveUserId, isImpersonating } = useImpersonation();
  
  // Use effective user ID for impersonation, otherwise real user ID
  const targetUserId = isImpersonating ? effectiveUserId : user?.id;
  
  const { content: allContent, loading, refetch } = useContent(targetUserId, 'creator');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [thisMonthActive, setThisMonthActive] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'studio' | 'marketplace'>('studio');
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
          <motion.div 
            className="absolute inset-0 rounded-full bg-primary/30 blur-xl"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-primary relative z-10" />
          </motion.div>
          <motion.p
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-primary whitespace-nowrap"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Cargando dashboard...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Tech Background */}
      <div className="fixed inset-0 pointer-events-none">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={30} />
        <TechOrb size="lg" position="top-right" delay={0} />
        <TechOrb size="md" position="bottom-left" delay={1} />
        <DataFlowLines />
      </div>

      <div className="relative z-10 space-y-6 p-4 md:p-6">
        {/* Header del Camerino - El Estudio */}
        <TechPageHeader
          icon={Clapperboard}
          title={VOCABULARIO_ROL.creator.dashboard}
          subtitle={VOCABULARIO_ROL.creator.bienvenida.replace('tu Camerino', `tu Camerino, ${profile?.full_name ?? ''}`)}
          badge={
            <div className="flex items-center gap-3">
              {showAmbassadorBadge && <AmbassadorBadge size="md" variant="glow" />}
              <LevelBadge creditos={totalPaid + (approvedContent.length * 50)} size="md" />
            </div>
          }
          action={
            <div className="flex flex-wrap items-center gap-3">
              <ThisMonthFilter isActive={thisMonthActive} onToggle={setThisMonthActive} />
              <CreditsDisplay creditos={totalPaid + (approvedContent.length * 50)} size="sm" />
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success/20 to-success/10 border border-success/30 rounded-sm shadow-lg shadow-success/10">
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

        {/* Dashboard Mode Toggle */}
        <div className="flex gap-2 bg-white/5 p-1 rounded-sm w-fit">
          <button
            onClick={() => setDashboardTab('studio')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
              dashboardTab === 'studio' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clapperboard className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
            Estudio
          </button>
          <button
            onClick={() => setDashboardTab('marketplace')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
              dashboardTab === 'marketplace' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Store className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
            Marketplace
          </button>
        </div>

        {dashboardTab === 'marketplace' ? (
          <MarketplaceDashboardTab role="creator" />
        ) : (
        <>
        {/* Season Urgency Banner */}
        <SeasonUrgencyBanner />

        {/* Banner de Temporada - El Estudio */}
        <SeasonBanner variant="compact" showMetas={false} />

        {/* Progreso al Siguiente Nivel */}
        <ProgressToNextLevel
          creditosActuales={totalPaid + (approvedContent.length * 50)}
          size="md"
        />

        {/* Acciones Rápidas del Camerino */}
        <QuickActions
          rol="creator"
          stats={{
            pendientes: inProgressContent.length,
            urgentes: inProgressContent.filter(c => c.status === 'recording').length,
          }}
          onAction={(action) => {
            switch (action) {
              case 'ver_llamados':
                navigate('/board');
                break;
              case 'ir_rodaje':
                navigate('/board');
                break;
              case 'entregar':
                navigate('/board');
                break;
              case 'ver_reel':
                if (targetUserId) navigate(`/portfolio/${targetUserId}`);
                break;
            }
          }}
          variant="grid"
        />

        {/* Dashboard Content */}
        <div className="space-y-6">
          {/* Stats Grid with Charts */}
          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.08}>
            <StaggerItem>
              <TechKpiCard
                title="Total Asignados"
                value={content.length}
                icon={Video}
                onClick={() => openKpiDialog('Total Asignados', content)}
                chartType="sparkline"
                chartData={[12, 18, 15, 22, 19, 28, content.length]}
                color="violet"
                size="md"
              />
            </StaggerItem>
            <StaggerItem>
              <TechKpiCard
                title="En Progreso"
                value={inProgressContent.length}
                icon={Clock}
                onClick={() => openKpiDialog('En Progreso', inProgressContent)}
                chartType="bar"
                chartData={[3, 5, 2, 7, 4, 6, inProgressContent.length]}
                color="amber"
                size="md"
              />
            </StaggerItem>
            <StaggerItem>
              <TechKpiCard
                title="Aprobados"
                value={approvedContent.length}
                icon={CheckCircle2}
                onClick={() => openKpiDialog('Aprobados', approvedContent)}
                chartType="radial"
                goalValue={content.length || 1}
                goalLabel="Del total"
                color="emerald"
                size="md"
              />
            </StaggerItem>
            <StaggerItem>
              <TechKpiCard
                title="Embajador"
                value={ambassadorContent.length}
                icon={Star}
                onClick={() => openKpiDialog('Contenido Embajador', ambassadorContent)}
                chartType="sparkline"
                chartData={[1, 2, 1, 3, 2, 4, ambassadorContent.length]}
                color="rose"
                size="md"
              />
            </StaggerItem>
            <StaggerItem>
              <TechKpiCard
                title="Por Pagar"
                value={unpaidContent.length}
                icon={DollarSign}
                subtitle={`$${pendingPayment.toLocaleString()}`}
                onClick={() => openKpiDialog('Por Pagar', unpaidContent)}
                chartType="bar"
                chartData={[5, 8, 4, 10, 6, 9, unpaidContent.length]}
                color="cyan"
                size="md"
              />
            </StaggerItem>
            <StaggerItem>
              <TechKpiCard
                title="Pagados"
                value={paidContent.length}
                icon={CreditCard}
                subtitle={`$${totalPaid.toLocaleString()}`}
                onClick={() => openKpiDialog('Pagados', paidContent)}
                chartType="radial"
                goalValue={approvedContent.length + paidContent.length || 1}
                goalLabel="Completados"
                color="violet"
                size="md"
              />
            </StaggerItem>
          </StaggerContainer>

          {/* UGC Points Widget */}
          {targetUserId && (
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-3 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <RoleUPWidget userId={targetUserId} role="creator" />
              <div className="lg:col-span-2">
                <TechCard variant="glass" className="h-full overflow-hidden">
                  <TechCardContent className="p-4 relative">
                    {/* Animated background */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <motion.div 
                            className="p-2 rounded-sm bg-primary/10 border border-primary/20"
                            animate={{ boxShadow: ["0 0 0 0 hsl(270 100% 60% / 0)", "0 0 20px 5px hsl(270 100% 60% / 0.3)", "0 0 0 0 hsl(270 100% 60% / 0)"] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <TrendingUp className="w-4 h-4 text-primary" />
                          </motion.div>
                          <h3 className="font-semibold text-sm">
                            <NeonText>Progreso General</NeonText>
                          </h3>
                        </div>
                        <motion.span 
                          className="text-xs text-[hsl(270,60%,60%)] font-medium"
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {completedCount} de {totalAssigned} completados
                        </motion.span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden border border-[hsl(270,100%,60%,0.2)]">
                        <motion.div 
                          className="h-full rounded-full relative overflow-hidden"
                          style={{ 
                            background: "linear-gradient(90deg, hsl(270 100% 50%), hsl(280 100% 60%))",
                            boxShadow: "0 0 20px hsl(270 100% 60% / 0.5)",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                          />
                        </motion.div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {progressPercent.toFixed(0)}% de tu contenido ha sido aprobado o entregado
                        </p>
                        <motion.div
                          className="flex items-center gap-1 text-xs text-primary"
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Zap className="w-3 h-3" />
                          <span>En curso</span>
                        </motion.div>
                      </div>
                    </div>
                  </TechCardContent>
                </TechCard>
              </div>
            </motion.div>
          )}

          {/* Pending Work Alert - Animated */}
          {inProgressContent.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <TechCard variant="neon" className="border-[hsl(260,80%,60%,0.3)] overflow-hidden">
                <TechCardContent className="p-4 relative">
                  {/* Animated pulse background */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="p-2.5 rounded-sm bg-[hsl(270,100%,60%,0.15)] border border-[hsl(270,100%,60%,0.25)]"
                        animate={{ 
                          boxShadow: [
                            "0 0 0 0 hsl(270 100% 60% / 0)",
                            "0 0 15px 3px hsl(270 100% 60% / 0.4)",
                            "0 0 0 0 hsl(270 100% 60% / 0)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Clock className="h-5 w-5 text-primary" />
                      </motion.div>
                      <div>
                        <p className="font-medium text-sm">
                          Tienes <NeonText>{inProgressContent.length}</NeonText> proyecto(s) en progreso
                        </p>
                        <p className="text-xs text-muted-foreground">Continúa con tus grabaciones</p>
                      </div>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        size="sm" 
                        onClick={() => navigate('/board')}
                        className="bg-[hsl(270,100%,60%,0.15)] hover:bg-[hsl(270,100%,60%,0.25)] text-[hsl(270,100%,75%)] border border-[hsl(270,100%,60%,0.3)] hover:border-[hsl(270,100%,60%,0.5)]"
                      >
                        Ver tablero
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </motion.div>
                      </Button>
                    </motion.div>
                  </div>
                </TechCardContent>
              </TechCard>
            </motion.div>
          )}

          {/* Recent Content - Animated List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </motion.div>
                <NeonText>Contenido Reciente</NeonText>
              </h3>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Button variant="ghost" size="sm" onClick={() => navigate('/board')}>
                  Ver todo
                </Button>
              </motion.div>
            </div>
            <StaggerContainer className="space-y-2" staggerDelay={0.1}>
              {content.slice(0, 5).map((item, index) => (
                <StaggerItem key={item.id}>
                  <motion.div whileHover={{ scale: 1.01, x: 4 }}>
                    <TechCard 
                      variant="glass"
                      className="cursor-pointer" 
                      onClick={() => setSelectedContent(item)}
                    >
                      <TechCardContent className="p-3 flex items-center gap-3">
                        <motion.div 
                          className="h-10 w-10 rounded-sm bg-muted border border-[hsl(270,100%,60%,0.2)] flex items-center justify-center flex-shrink-0 overflow-hidden"
                          whileHover={{ borderColor: "hsl(270 100% 60% / 0.5)" }}
                        >
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                            >
                              <Play className="h-4 w-4 text-primary" />
                            </motion.div>
                          )}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.client?.name || 'Sin cliente'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.is_ambassador_content && (
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            >
                              <Star className="w-3 h-3 text-primary fill-primary" />
                            </motion.div>
                          )}
                          <Badge className={cn("text-xs", STATUS_COLORS[item.status])} variant="secondary">
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </div>
                      </TechCardContent>
                    </TechCard>
                  </motion.div>
                </StaggerItem>
              ))}
              {content.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <TechCard variant="glass">
                    <TechCardContent className="p-8 text-center">
                      <motion.div 
                        className="w-16 h-16 mx-auto rounded-sm bg-muted border border-[hsl(270,100%,60%,0.2)] flex items-center justify-center mb-4"
                        animate={{ 
                          boxShadow: [
                            "0 0 0 0 hsl(270 100% 60% / 0)",
                            "0 0 30px 10px hsl(270 100% 60% / 0.2)",
                            "0 0 0 0 hsl(270 100% 60% / 0)"
                          ]
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Video className="w-8 h-8 text-primary" />
                      </motion.div>
                      <h4 className="font-semibold mb-2">
                        <NeonText>Sin proyectos asignados</NeonText>
                      </h4>
                      <p className="text-sm text-muted-foreground">Cuando te asignen proyectos aparecerán aquí</p>
                    </TechCardContent>
                  </TechCard>
                </motion.div>
              )}
            </StaggerContainer>
          </motion.div>

          {/* Ranking y Historial de Puntos - Animated */}
          {targetUserId && (
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <RoleLeaderboard role="creator" currentUserId={targetUserId} maxItems={5} />
              <UPHistoryTable userId={targetUserId} />
            </motion.div>
          )}
        </div>
        </>
        )}

        {/* Content Detail Modal */}
        <UnifiedProjectModal
          source="content"
          projectId={selectedContent?.id}
          open={!!selectedContent}
          onOpenChange={(open) => !open && setSelectedContent(null)}
          onUpdate={() => {
            refetch();
            setSelectedContent(null);
          }}
        />

        {/* KPI Content Dialog - New Tech Version */}
        <TechKpiDialog
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
