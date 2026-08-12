import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2, Video, Clock, CheckCircle2, DollarSign, CreditCard,
  Clapperboard, ArrowRight, Store, AlertTriangle
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
import { ThisMonthFilter, useThisMonthFilter } from '@/components/dashboard/ThisMonthFilter';
import { NovaKpiCard, NovaVerticalVideoGrid } from '@/components/client-dashboard';
import { ClientVideoDetailSheet } from '@/components/client-dashboard/ClientVideoDetailSheet';
import { VOCABULARIO_ROL } from '@/components/studio';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'studio', label: 'Estudio', Icon: Clapperboard },
  { id: 'wallet', label: 'Mis Cobros', Icon: DollarSign },
] as const;

type DashboardTab = (typeof TABS)[number]['id'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user, profile, refetchUserData, roles } = useAuth();
  const { effectiveUserId, isImpersonating } = useImpersonation();

  const isFreelancer = !profile?.organization_id && profile?.platform_access_unlocked;
  const targetUserId = isImpersonating ? effectiveUserId : user?.id;
  const hasEditorRole = roles.some(r => ['editor', 'video_editor'].includes(r));

  const { content: creatorRaw, loading, refetch: refetchCreator } = useContent(targetUserId, 'creator');
  const { content: editorRaw, refetch: refetchEditor } = useContent(targetUserId, 'editor', false);

  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [videoViewer, setVideoViewer] = useState<Content | null>(null);
  const [thisMonthActive, setThisMonthActive] = useState(false);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>(
    TABS.some((t) => t.id === initialTab) ? (initialTab as DashboardTab) : 'studio'
  );
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean; title: string;
    studioContent: Content[]; marketplaceProjects: MarketplaceProject[];
  }>({ open: false, title: '', studioContent: [], marketplaceProjects: [] });

  const creatorFiltered = useThisMonthFilter(creatorRaw, thisMonthActive);
  const editorFiltered = useThisMonthFilter(editorRaw, thisMonthActive);

  // Merge creator + editor content (dedup by id) when user has both roles
  const content = useMemo(() => {
    if (!hasEditorRole) return creatorFiltered;
    const ids = new Set(creatorFiltered.map(c => c.id));
    return [...creatorFiltered, ...editorFiltered.filter(c => !ids.has(c.id))];
  }, [hasEditorRole, creatorFiltered, editorFiltered]);

  const refetch = () => { refetchCreator(); refetchEditor(); };

  // Fuente de verdad financiera — misma que el módulo de nómina/finanzas
  const orgId = profile?.organization_id ?? '';
  const { data: finSummary } = useContentFinancialSummary(orgId, targetUserId ?? '');
  useTalentFinanceRealtime(orgId, targetUserId ?? undefined);

  // Marketplace data para KPIs fusionados
  const { projects: mktProjects } = useMarketplaceProjects({ role: 'creator' });

  // Wallet freelancer (solo si no pertenece a org)
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
  const approvedContent = content.filter(c => {
    if (c.status !== 'approved') return false;
    const creatorUnpaid = c.creator_id === targetUserId && !c.creator_paid;
    const editorUnpaid = c.editor_id === targetUserId && !c.editor_paid;
    return creatorUnpaid || editorUnpaid;
  });
  const unpaidContent = content.filter(c => {
    const creatorUnpaid = c.creator_id === targetUserId && c.status === 'approved' && !c.creator_paid;
    const editorUnpaid = c.editor_id === targetUserId && c.status === 'approved' && !c.editor_paid;
    return creatorUnpaid || editorUnpaid;
  });
  const paidContent = content.filter(c => {
    const creatorPaid = c.creator_id === targetUserId && !!c.creator_paid;
    const editorPaid = c.editor_id === targetUserId && !!c.editor_paid;
    return creatorPaid || editorPaid;
  });

  // ── Montos Studio (COP) ───────────────────────────────────────────────
  const studioPendingCOP = content
    .filter(c => !c.is_ambassador_content)
    .reduce((s, c) => {
      let pay = 0;
      if (c.creator_id === targetUserId && c.status === 'approved' && !c.creator_paid) pay += c.creator_payment || 0;
      if (hasEditorRole && c.editor_id === targetUserId && c.status === 'approved' && !c.editor_paid) pay += c.editor_payment || 0;
      return s + pay;
    }, 0);
  const studioPaidCOP = content.reduce((s, c) => {
    let pay = 0;
    if (c.creator_id === targetUserId && c.creator_paid) pay += c.creator_payment || 0;
    if (hasEditorRole && c.editor_id === targetUserId && c.editor_paid) pay += c.editor_payment || 0;
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
    mktProjects.filter(p => p.status === 'revision'),
  [mktProjects]);
  const mktNovedades = useMemo(() => {
    const now = Date.now();
    return mktProjects.filter(p => {
      if (p.status === 'overdue') return true;
      if (['completed', 'cancelled'].includes(p.status)) return false;
      return p.deadline ? new Date(p.deadline).getTime() < now : false;
    });
  }, [mktProjects]);
  const mktApproved = useMemo(() =>
    mktProjects.filter(p => ['approved', 'completed'].includes(p.status) && p.payment_status !== 'released'),
  [mktProjects]);
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
      acc[cur] = (acc[cur] || 0) + (p.creator_payout ?? p.total_price);
      return acc;
    }, {}),
  [mktUnpaid]);
  const mktPaidByCurrency = useMemo(() =>
    mktPaid.reduce<Record<string, number>>((acc, p) => {
      const cur = p.currency || 'USD';
      acc[cur] = (acc[cur] || 0) + (p.creator_payout ?? p.total_price);
      return acc;
    }, {}),
  [mktPaid]);

  // ── KPI combinados ────────────────────────────────────────────────────
  const totalPendingCOP = studioPendingCOP + (mktPendingByCurrency['COP'] || 0);
  const totalPaidCOP = studioPaidCOP + (mktPaidByCurrency['COP'] || 0);
  const pendingUSD = mktPendingByCurrency['USD'] || 0;
  const paidUSD = mktPaidByCurrency['USD'] || 0;
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
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Creador'}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            {VOCABULARIO_ROL.creator.dashboard}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {profile?.is_ambassador && <AmbassadorBadge size="md" />}
          <ThisMonthFilter isActive={thisMonthActive} onToggle={setThisMonthActive} />
          {targetUserId && <PortfolioButton userId={targetUserId} />}
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
              talentName={profile.full_name || 'Creador'}
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
            const roleLabel = hasEditorRole ? 'Creador & Editor' : 'Creador';
            const actionLabel = hasEditorRole ? 'graba, edita y entrega' : 'graba y entrega';
            return (
              <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-zinc-900/40 p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-lg bg-purple-500/15 flex-shrink-0">
                      <Clapperboard className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full">
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
                    className="bg-purple-600 hover:bg-purple-500 text-white border-0 flex-shrink-0 self-start sm:self-center"
                  >
                    Ver tablero
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* KPI Cards — Studio + Marketplace fusionados */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <NovaKpiCard
              title="Asignados"
              value={assignedContent.length + mktAssigned.length}
              icon={Video}
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
              title="Aprobados"
              value={approvedContent.length + mktApproved.length}
              icon={CheckCircle2}
              variant="success"
              subtitle="pendientes de cobro"
              onClick={() => openKpiDialog('Aprobados', approvedContent, mktApproved)}
            />
            <NovaKpiCard
              title="Por Cobrar COP"
              value={totalPendingCOP}
              prefix="$"
              icon={DollarSign}
              variant="info"
              subtitle={`${unpaidContent.length + mktUnpaid.filter(p => p.currency === 'COP' || !p.currency?.startsWith('USD')).length} ítems`}
              onClick={() => openKpiDialog('Por Cobrar', unpaidContent, mktUnpaid)}
            />
            {pendingUSD > 0 && (
              <NovaKpiCard
                title="Por Cobrar USD"
                value={pendingUSD}
                prefix="$"
                icon={DollarSign}
                variant="info"
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
                  onClick={() => openKpiDialog('Aprobados', approvedContent, mktApproved)}
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
