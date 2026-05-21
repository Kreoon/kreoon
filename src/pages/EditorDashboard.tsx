import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Video, Clock, CheckCircle2, DollarSign, CreditCard,
  Film, ArrowRight, Store, Scissors, AlertTriangle
} from 'lucide-react';
import { TalentWalletView } from '@/components/talent/TalentWalletView';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useContent } from '@/hooks/useContent';
import { useContentFinancialSummary, useTalentFinanceRealtime } from '@/hooks/useTalentPayments';
import { Button } from '@/components/ui/button';
import { Content, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { UnifiedKpiDialog } from '@/components/dashboard/UnifiedKpiDialog';
import { useMarketplaceProjects } from '@/hooks/useMarketplaceProjects';
import type { MarketplaceProject } from '@/components/marketplace/types/marketplace';
import { UnifiedProjectModal } from '@/components/projects/UnifiedProjectModal';
import { PortfolioButton } from '@/components/portfolio/PortfolioButton';
import { AmbassadorBadge } from '@/components/ui/ambassador-badge';
import { RoleUPWidget } from '@/components/points/RoleUPWidget';
import { SeasonUrgencyBanner } from '@/components/points/SeasonUrgencyBanner';
import { RoleLeaderboard } from '@/components/points/RoleLeaderboard';
import { UPHistoryTable } from '@/components/points/UPHistoryTable';
import { ThisMonthFilter, useThisMonthFilter } from '@/components/dashboard/ThisMonthFilter';
import { NovaKpiCard, NovaVerticalVideoGrid } from '@/components/client-dashboard';
import { ClientVideoDetailSheet } from '@/components/client-dashboard/ClientVideoDetailSheet';
import { SeasonBanner, ProgressToNextLevel, VOCABULARIO_ROL } from '@/components/studio';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'studio', label: 'Estudio', Icon: Film },
  { id: 'wallet', label: 'Mis Cobros', Icon: DollarSign },
] as const;

type DashboardTab = (typeof TABS)[number]['id'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function EditorDashboard() {
  const navigate = useNavigate();
  const { user, profile, roles } = useAuth();
  const { effectiveUserId, isImpersonating } = useImpersonation();

  const targetUserId = isImpersonating ? effectiveUserId : user?.id;
  const hasCreatorRole = roles.some(r => ['creator', 'content_creator'].includes(r));

  const { content: editorRaw, loading, refetch: refetchEditor } = useContent(targetUserId, 'editor');
  const { content: creatorRaw, refetch: refetchCreator } = useContent(targetUserId, 'creator', false);

  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [videoViewer, setVideoViewer] = useState<Content | null>(null);
  const [thisMonthActive, setThisMonthActive] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('studio');
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean; title: string;
    studioContent: Content[]; marketplaceProjects: MarketplaceProject[];
  }>({ open: false, title: '', studioContent: [], marketplaceProjects: [] });

  const editorFiltered = useThisMonthFilter(editorRaw, thisMonthActive);
  const creatorFiltered = useThisMonthFilter(creatorRaw, thisMonthActive);

  // Merge editor + creator content (dedup by id) when user has both roles
  const content = useMemo(() => {
    if (!hasCreatorRole) return editorFiltered;
    const ids = new Set(editorFiltered.map(c => c.id));
    return [...editorFiltered, ...creatorFiltered.filter(c => !ids.has(c.id))];
  }, [hasCreatorRole, editorFiltered, creatorFiltered]);

  const refetch = () => { refetchEditor(); refetchCreator(); };

  // Fuente de verdad financiera — misma que el módulo de nómina/finanzas
  const orgId = profile?.organization_id ?? '';
  const { data: finSummary } = useContentFinancialSummary(orgId, targetUserId ?? '');
  useTalentFinanceRealtime(orgId, targetUserId ?? undefined);

  // Marketplace data para KPIs fusionados
  const { projects: mktProjects } = useMarketplaceProjects({ role: 'editor' });

  // Wallet freelancer (solo si no pertenece a org)
  const isFreelancer = !profile?.organization_id && !!profile?.platform_access_unlocked;
  const { data: wallet } = useQuery({
    queryKey: ['wallet', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('unified_wallets')
        .select('available_balance, pending_balance')
        .eq('user_id', targetUserId!)
        .maybeSingle();
      return data;
    },
    enabled: !!targetUserId && isFreelancer,
  });

  const openKpiDialog = (title: string, studio: Content[], marketplace: MarketplaceProject[] = []) =>
    setKpiDialog({ open: true, title, studioContent: studio, marketplaceProjects: marketplace });

  // ── Filtros Studio ────────────────────────────────────────────────────
  const issueContent = content.filter(c => c.status === 'issue');
  const assignedContent = content.filter(c => c.status === 'assigned');
  const inProgressContent = content.filter(c => ['recording', 'recorded', 'editing'].includes(c.status));
  const deliveredContent = content.filter(c => ['delivered', 'corrected'].includes(c.status));
  const approvedContent = content.filter(c => c.status === 'approved');
  const unpaidContent = content.filter(c => {
    const editorUnpaid = c.editor_id === targetUserId && c.status === 'approved' && !c.editor_paid;
    const creatorUnpaid = c.creator_id === targetUserId && c.status === 'approved' && !c.creator_paid;
    return editorUnpaid || creatorUnpaid;
  });
  const paidContent = content.filter(c => {
    const editorPaid = c.editor_id === targetUserId && !!c.editor_paid;
    const creatorPaid = c.creator_id === targetUserId && !!c.creator_paid;
    return editorPaid || creatorPaid;
  });

  // ── Montos Studio (COP) ───────────────────────────────────────────────
  const studioPendingCOP = content
    .filter(c => !c.is_ambassador_content)
    .reduce((s, c) => {
      let pay = 0;
      if (c.editor_id === targetUserId && c.status === 'approved' && !c.editor_paid) pay += c.editor_payment || 0;
      if (hasCreatorRole && c.creator_id === targetUserId && c.status === 'approved' && !c.creator_paid) pay += c.creator_payment || 0;
      return s + pay;
    }, 0);
  const studioPaidCOP = content.reduce((s, c) => {
    let pay = 0;
    if (c.editor_id === targetUserId && c.editor_paid) pay += c.editor_payment || 0;
    if (hasCreatorRole && c.creator_id === targetUserId && c.creator_paid) pay += c.creator_payment || 0;
    return s + pay;
  }, 0);

  // ── Filtros Marketplace ────────────────────────────────────────────────
  const mktAssigned = useMemo(() =>
    mktProjects.filter(p => ['pending', 'briefing'].includes(p.status)),
  [mktProjects]);
  const mktInProgress = useMemo(() =>
    mktProjects.filter(p => p.status === 'in_progress'),
  [mktProjects]);
  const mktDelivered = useMemo(() =>
    mktProjects.filter(p => ['revision', 'approved', 'completed'].includes(p.status) && p.payment_status !== 'released'),
  [mktProjects]);
  const mktNovedades = useMemo(() => {
    const now = Date.now();
    return mktProjects.filter(p => {
      if (p.status === 'overdue') return true;
      if (['completed', 'cancelled'].includes(p.status)) return false;
      return p.deadline ? new Date(p.deadline).getTime() < now : false;
    });
  }, [mktProjects]);
  const mktUnpaid = useMemo(() =>
    mktProjects.filter(p => p.payment_method === 'payment' && p.payment_status !== 'released' && p.status !== 'cancelled'),
  [mktProjects]);
  const mktPaid = useMemo(() =>
    mktProjects.filter(p => p.payment_status === 'released'),
  [mktProjects]);

  // ── Montos Marketplace por moneda ─────────────────────────────────────
  const mktPendingByCurrency = useMemo(() =>
    mktUnpaid.reduce<Record<string, number>>((acc, p) => {
      const cur = p.currency || 'USD';
      acc[cur] = (acc[cur] || 0) + (p.editor_payout ?? p.creator_payout ?? p.total_price);
      return acc;
    }, {}),
  [mktUnpaid]);
  const mktPaidByCurrency = useMemo(() =>
    mktPaid.reduce<Record<string, number>>((acc, p) => {
      const cur = p.currency || 'USD';
      acc[cur] = (acc[cur] || 0) + (p.editor_payout ?? p.creator_payout ?? p.total_price);
      return acc;
    }, {}),
  [mktPaid]);

  // ── KPI combinados ────────────────────────────────────────────────────
  const totalPendingCOP = studioPendingCOP + (mktPendingByCurrency['COP'] || 0);
  const totalPaidCOP = studioPaidCOP + (mktPaidByCurrency['COP'] || 0);
  const pendingUSD = mktPendingByCurrency['USD'] || 0;
  const paidUSD = mktPaidByCurrency['USD'] || 0;
  // Alias para compatibilidad con ProgressToNextLevel
  const pendingPayment = studioPendingCOP;
  const totalPaid = studioPaidCOP;
  const approvedVideos = useMemo(() =>
    [...content]
      .filter(c => ['approved', 'paid', 'archived'].includes(c.status))
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .slice(0, 6),
  [content]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Editor'}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            {VOCABULARIO_ROL.editor.dashboard}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {profile?.is_ambassador && <AmbassadorBadge size="md" />}
          <ThisMonthFilter isActive={thisMonthActive} onToggle={setThisMonthActive} />
          {user && <PortfolioButton userId={user.id} />}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-lg w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setDashboardTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              dashboardTab === id
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Wallet tab */}
      {dashboardTab === 'wallet' && (
        profile?.current_organization_id && user?.id ? (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14141f] p-4 md:p-6">
            <TalentWalletView
              userId={targetUserId ?? user.id}
              organizationId={profile.current_organization_id}
              talentName={profile.full_name || 'Editor'}
            />
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Función no disponible para tu tipo de cuenta.
          </div>
        )
      )}

      {/* Studio tab */}
      {dashboardTab === 'studio' && (
        <div className="space-y-6">
          {/* Banner de actividad — rol + en proceso + por cobrar */}
          {(inProgressContent.length + mktInProgress.length > 0 || totalPendingCOP > 0 || pendingUSD > 0) && (() => {
            const totalInProgress = inProgressContent.length + mktInProgress.length;
            const roleLabel = hasCreatorRole ? 'Editor & Creador' : 'Editor';
            const actionLabel = hasCreatorRole ? 'edita, graba y entrega' : 'edita y entrega';
            return (
              <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-zinc-900/60 to-zinc-900/40 p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-lg bg-blue-500/15 flex-shrink-0">
                      <Scissors className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">
                          {roleLabel}
                        </span>
                        {totalInProgress > 0 && (
                          <p className="text-sm font-semibold text-white">
                            {totalInProgress} {totalInProgress === 1 ? 'proyecto' : 'proyectos'} en proceso
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {totalInProgress > 0 && (
                          <p className="text-xs text-zinc-400">Es hora de {actionLabel}</p>
                        )}
                        {totalPendingCOP > 0 && (
                          <p className="text-xs font-semibold text-green-400">
                            ${totalPendingCOP.toLocaleString()} COP por cobrar
                          </p>
                        )}
                        {pendingUSD > 0 && (
                          <p className="text-xs font-semibold text-cyan-400">
                            ${pendingUSD.toLocaleString()} USD por cobrar
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate('/board')}
                    className="bg-blue-600 hover:bg-blue-500 text-white border-0 flex-shrink-0 self-start sm:self-center"
                  >
                    Ver tablero
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Banners de temporada */}
          <SeasonUrgencyBanner />
          <SeasonBanner variant="compact" showMetas={false} />
          <ProgressToNextLevel
            creditosActuales={totalPaid + (approvedContent.length * 50)}
            size="md"
          />

          {/* KPI Cards — Studio + Marketplace fusionados */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <NovaKpiCard
              title="Asignados"
              value={assignedContent.length + mktAssigned.length}
              icon={Scissors}
              variant="primary"
              subtitle="sin iniciar"
              onClick={() => openKpiDialog('Asignados', assignedContent, mktAssigned)}
            />
            <NovaKpiCard
              title="En Proceso"
              value={inProgressContent.length + mktInProgress.length}
              icon={Clock}
              variant="warning"
              subtitle="antes de entrega"
              onClick={() => openKpiDialog('En Proceso', inProgressContent, mktInProgress)}
            />
            <NovaKpiCard
              title="Entregados"
              value={deliveredContent.length + mktDelivered.length}
              icon={CheckCircle2}
              variant="success"
              subtitle="entregados y corregidos"
              onClick={() => openKpiDialog('Entregados', deliveredContent, mktDelivered)}
            />
            <NovaKpiCard
              title="Novedades"
              value={issueContent.length + mktNovedades.length}
              icon={AlertTriangle}
              variant="danger"
              subtitle="requieren atención"
              onClick={() => openKpiDialog('Novedades', issueContent, mktNovedades)}
            />
            <NovaKpiCard
              title="Por Cobrar COP"
              value={totalPendingCOP}
              prefix="$"
              icon={DollarSign}
              variant="warning"
              subtitle={`${unpaidContent.length + mktUnpaid.filter(p => (p.currency || 'USD') !== 'USD').length} ítems`}
              onClick={() => openKpiDialog('Por Cobrar', unpaidContent, mktUnpaid)}
            />
            {pendingUSD > 0 && (
              <NovaKpiCard
                title="Por Cobrar USD"
                value={pendingUSD}
                prefix="$"
                icon={DollarSign}
                variant="warning"
                subtitle={`${mktUnpaid.filter(p => p.currency === 'USD').length} ítems`}
                onClick={() => openKpiDialog('Por Cobrar USD', [], mktUnpaid.filter(p => p.currency === 'USD'))}
              />
            )}
            <NovaKpiCard
              title="Cobrado COP"
              value={totalPaidCOP}
              prefix="$"
              icon={CreditCard}
              variant="success"
              subtitle={`${paidContent.length + mktPaid.filter(p => (p.currency || 'USD') !== 'USD').length} pagados`}
              onClick={() => openKpiDialog('Cobrado', paidContent, mktPaid)}
            />
            {paidUSD > 0 && (
              <NovaKpiCard
                title="Cobrado USD"
                value={paidUSD}
                prefix="$"
                icon={CreditCard}
                variant="success"
                subtitle={`${mktPaid.filter(p => p.currency === 'USD').length} pagados`}
                onClick={() => openKpiDialog('Cobrado USD', [], mktPaid.filter(p => p.currency === 'USD'))}
              />
            )}
            {isFreelancer && wallet && (
              <NovaKpiCard
                title="Balance Wallet"
                value={wallet.available_balance || 0}
                prefix="$"
                icon={CreditCard}
                variant="success"
                subtitle={(wallet.pending_balance ?? 0) > 0 ? `+ $${(wallet.pending_balance ?? 0).toLocaleString()} pendiente` : 'disponible'}
              />
            )}
          </div>

          {/* UGC Points */}
          {targetUserId && (
            <RoleUPWidget
              userId={targetUserId}
              role="editor"
              roles={hasCreatorRole ? ['creator', 'editor'] : undefined}
            />
          )}



          {/* Videos aprobados */}
          {approvedVideos.length > 0 && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14141f] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Últimos Aprobados
                  </h3>
                  <span className="text-xs text-zinc-500">({approvedVideos.length})</span>
                </div>
                <button
                  onClick={() => openKpiDialog('Aprobados', approvedContent, mktDelivered)}
                  className="text-xs text-purple-500 hover:text-purple-400 transition-colors"
                >
                  Ver todos
                </button>
              </div>
              <NovaVerticalVideoGrid
                videos={approvedVideos}
                onVideoClick={setVideoViewer}
                maxItems={6}
              />
            </div>
          )}

          {/* Ranking e historial de puntos */}
          {targetUserId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RoleLeaderboard role="editor" currentUserId={targetUserId} maxItems={5} />
              <UPHistoryTable userId={targetUserId} />
            </div>
          )}

        </div>
      )}

      {/* Modals */}
      <UnifiedProjectModal
        source="content"
        projectId={selectedContent?.id}
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
        onUpdate={() => { refetch(); setSelectedContent(null); }}
      />
      <UnifiedKpiDialog
        title={kpiDialog.title}
        studioContent={kpiDialog.studioContent}
        marketplaceProjects={kpiDialog.marketplaceProjects}
        open={kpiDialog.open}
        onOpenChange={(open) => setKpiDialog(prev => ({ ...prev, open }))}
        onSelectContent={setSelectedContent}
        userId={user?.id}
      />
      <ClientVideoDetailSheet
        content={videoViewer}
        userId={user?.id}
        open={!!videoViewer}
        onClose={() => setVideoViewer(null)}
        onUpdate={refetch}
      />
    </div>
  );
}
