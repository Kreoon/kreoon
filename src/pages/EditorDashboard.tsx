import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useContent } from '@/hooks/useContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Content, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { KpiContentDialog } from '@/components/dashboard/KpiContentDialog';
import { TechKpiDialog } from '@/components/dashboard/TechKpiDialog';
import { ContentDetailDialog } from '@/components/content/ContentDetailDialog/index';
import { PortfolioButton } from '@/components/portfolio/PortfolioButton';
import { AmbassadorBadge } from '@/components/ui/ambassador-badge';
import { RoleUPWidget } from '@/components/points/RoleUPWidget';
import { RoleLeaderboard } from '@/components/points/RoleLeaderboard';
import { UPHistoryTable } from '@/components/points/UPHistoryTable';
import { ThisMonthFilter, useThisMonthFilter } from '@/components/dashboard/ThisMonthFilter';
import { TechKpiCard } from '@/components/dashboard/TechKpiCard';
import { TechGrid, TechParticles, TechOrb } from '@/components/ui/tech-effects';
import { 
  Scissors, 
  Clock, 
  CheckCircle2, 
  Loader2,
  DollarSign,
  Video,
  CreditCard,
  TrendingUp,
  Play,
  ArrowRight,
  Hammer
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';

export default function EditorDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { effectiveUserId, isImpersonating } = useImpersonation();
  
  const targetUserId = isImpersonating ? effectiveUserId : user?.id;
  
  const { content: allContent, loading, refetch } = useContent(targetUserId, 'editor');
  const { toast } = useToast();
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [thisMonthActive, setThisMonthActive] = useState(false);
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean;
    title: string;
    content: Content[];
  }>({ open: false, title: '', content: [] });

  const content = useThisMonthFilter(allContent, thisMonthActive);

  const openKpiDialog = (title: string, contentList: Content[]) => {
    setKpiDialog({ open: true, title, content: contentList });
  };

  // Métricas
  const toEditContent = content.filter(c => c.status === 'recorded');
  const editingContent = content.filter(c => c.status === 'editing');
  const approvedContent = content.filter(c => c.status === 'approved');
  const unpaidContent = content.filter(c => c.status === 'approved' && !c.editor_paid);
  const paidContent = content.filter(c => c.status === 'paid' || c.editor_paid);
  
  const pendingPayment = unpaidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);
  
  const totalPaid = paidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);

  // Progreso
  const totalAssigned = content.length;
  const completedCount = content.filter(c => ['approved', 'paid', 'delivered'].includes(c.status)).length;
  const progressPercent = totalAssigned > 0 ? (completedCount / totalAssigned) * 100 : 0;

  // Chart data for sparklines
  const chartData = [totalAssigned, toEditContent.length, editingContent.length, approvedContent.length, paidContent.length];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={15} />
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-10 h-10 text-[hsl(270,100%,60%)]" />
          </motion.div>
          <motion.span
            className="text-[hsl(270,100%,70%)] text-sm font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Cargando panel...
          </motion.span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Tech Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={25} />
        <TechOrb size="lg" position="top-right" />
        <TechOrb size="md" position="bottom-left" delay={1} />
      </div>

      <div className="relative z-10 space-y-4 p-4 md:p-6">
        {/* Page Header */}
        <PageHeader
          icon={Hammer}
          title="KREOON Board"
          subtitle={`Bienvenido, ${profile?.full_name}`}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <ThisMonthFilter isActive={thisMonthActive} onToggle={setThisMonthActive} />
              {profile?.is_ambassador && (
                <AmbassadorBadge size="md" variant="glow" />
              )}
              <motion.div 
                className="flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(160 100% 45% / 0.15), hsl(160 100% 45% / 0.05))',
                  borderColor: 'hsl(160 100% 45% / 0.3)',
                  boxShadow: '0 0 20px hsl(160 100% 45% / 0.2)',
                }}
                whileHover={{ scale: 1.02 }}
              >
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-400 text-lg">
                  ${pendingPayment.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-400/70 hidden sm:inline">pendiente</span>
              </motion.div>
              {user && <PortfolioButton userId={user.id} />}
            </div>
          }
        />

        {/* Stats Grid - Tech Style */}
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ staggerChildren: 0.1 }}
        >
          <TechKpiCard
            title="Total Asignados"
            value={content.length}
            icon={Scissors}
            color="violet"
            chartType="sparkline"
            chartData={chartData}
            onClick={() => openKpiDialog('Total Asignados', content)}
            size="sm"
          />
          <TechKpiCard
            title="Por Editar"
            value={toEditContent.length}
            icon={Clock}
            color="cyan"
            chartType="radial"
            goalValue={content.length}
            onClick={() => openKpiDialog('Por Editar', toEditContent)}
            size="sm"
          />
          <TechKpiCard
            title="En Edición"
            value={editingContent.length}
            icon={Video}
            color="amber"
            chartType="bar"
            onClick={() => openKpiDialog('En Edición', editingContent)}
            size="sm"
          />
          <TechKpiCard
            title="Aprobados"
            value={approvedContent.length}
            icon={CheckCircle2}
            color="emerald"
            chartType="radial"
            goalValue={content.length}
            onClick={() => openKpiDialog('Aprobados', approvedContent)}
            size="sm"
          />
          <TechKpiCard
            title="Por Pagar"
            value={unpaidContent.length}
            icon={DollarSign}
            color="amber"
            subtitle={`$${pendingPayment.toLocaleString()}`}
            chartType="bar"
            onClick={() => openKpiDialog('Por Pagar', unpaidContent)}
            size="sm"
          />
          <TechKpiCard
            title="Pagados"
            value={paidContent.length}
            icon={CreditCard}
            color="emerald"
            subtitle={`$${totalPaid.toLocaleString()}`}
            chartType="sparkline"
            onClick={() => openKpiDialog('Pagados', paidContent)}
            size="sm"
          />
        </motion.div>

        {/* UGC Points Widget + Progress */}
        {targetUserId && (
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <RoleUPWidget userId={targetUserId} role="editor" />
            <div className="lg:col-span-2">
              <Card className="border-[hsl(270,100%,60%,0.15)] bg-gradient-to-br from-[hsl(250,20%,6%)] to-[hsl(250,20%,4%)] h-full overflow-hidden relative">
                {/* Card glow effect */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, hsl(270 100% 60% / 0.1), transparent 50%)',
                  }}
                />
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="p-2 rounded-lg"
                        style={{
                          background: 'hsl(270 100% 60% / 0.15)',
                          border: '1px solid hsl(270 100% 60% / 0.3)',
                        }}
                        animate={{
                          boxShadow: [
                            '0 0 10px hsl(270 100% 60% / 0.2)',
                            '0 0 20px hsl(270 100% 60% / 0.4)',
                            '0 0 10px hsl(270 100% 60% / 0.2)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <TrendingUp className="w-4 h-4 text-[hsl(270,100%,60%)]" />
                      </motion.div>
                      <h3 className="font-semibold text-sm text-[hsl(270,100%,70%)]">Progreso General</h3>
                    </div>
                    <span className="text-xs text-[hsl(270,30%,60%)]">
                      {completedCount} de {totalAssigned} completados
                    </span>
                  </div>
                  
                  {/* Custom Tech Progress Bar */}
                  <div className="h-3 bg-[hsl(250,20%,10%)] rounded-full overflow-hidden border border-[hsl(270,100%,60%,0.2)]">
                    <motion.div
                      className="h-full relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(90deg, hsl(270 100% 60%), hsl(300 100% 60%))',
                        boxShadow: '0 0 20px hsl(270 100% 60% / 0.5)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                  </div>
                  
                  <p className="text-xs text-[hsl(270,30%,60%)] mt-3">
                    <span className="text-[hsl(270,100%,70%)] font-bold">{progressPercent.toFixed(0)}%</span> de tu contenido ha sido aprobado o entregado
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Pending Edit Alert */}
        {toEditContent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-[hsl(190,100%,50%,0.3)] bg-gradient-to-r from-[hsl(190,100%,50%,0.1)] to-transparent overflow-hidden relative">
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, hsl(190 100% 50% / 0.05), transparent)',
                }}
              />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="p-3 rounded-xl"
                      style={{
                        background: 'hsl(190 100% 50% / 0.15)',
                        border: '1px solid hsl(190 100% 50% / 0.3)',
                      }}
                      animate={{
                        boxShadow: [
                          '0 0 10px hsl(190 100% 50% / 0.3)',
                          '0 0 25px hsl(190 100% 50% / 0.5)',
                          '0 0 10px hsl(190 100% 50% / 0.3)',
                        ],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Clock className="h-5 w-5 text-cyan-400" />
                    </motion.div>
                    <div>
                      <p className="font-semibold text-cyan-300">Tienes {toEditContent.length} video(s) por editar</p>
                      <p className="text-xs text-cyan-400/70">Revisa tu cola de edición</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/board')}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30"
                  >
                    Ver tablero
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[hsl(270,100%,70%)]">Contenido Reciente</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/board')}
              className="text-[hsl(270,100%,60%)] hover:text-[hsl(270,100%,70%)] hover:bg-[hsl(270,100%,60%,0.1)]"
            >
              Ver todo
            </Button>
          </div>
          <div className="space-y-2">
            {content.slice(0, 5).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <Card 
                  className="hover:border-[hsl(270,100%,60%,0.3)] transition-all cursor-pointer group"
                  onClick={() => setSelectedContent(item)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[hsl(250,20%,10%)] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[hsl(270,100%,60%,0.2)]">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Play className="h-4 w-4 text-[hsl(270,100%,60%)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-white group-hover:text-[hsl(270,100%,70%)] transition-colors">{item.title}</p>
                      <p className="text-xs text-[hsl(270,30%,50%)]">{item.creator?.full_name || 'Sin creador'}</p>
                    </div>
                    <Badge className={cn("text-xs", STATUS_COLORS[item.status])} variant="secondary">
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {content.length === 0 && (
              <Card className="border-[hsl(270,100%,60%,0.2)]">
                <CardContent className="p-8 text-center">
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Scissors className="w-12 h-12 mx-auto text-[hsl(270,100%,60%)] mb-4" />
                  </motion.div>
                  <h4 className="font-semibold mb-2 text-white">Sin proyectos asignados</h4>
                  <p className="text-sm text-[hsl(270,30%,60%)]">Cuando te asignen proyectos aparecerán aquí</p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>

        {/* Ranking y Historial de Puntos */}
        {targetUserId && (
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <RoleLeaderboard role="editor" currentUserId={targetUserId} maxItems={5} />
            <UPHistoryTable userId={targetUserId} />
          </motion.div>
        )}

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

        {/* KPI Content Dialog - Now using TechKpiDialog */}
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
