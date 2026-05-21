import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clapperboard, Store, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Content, STATUS_LABELS } from '@/types/database';
import type { MarketplaceProject } from '@/components/marketplace/types/marketplace';
import { useNavigate } from 'react-router-dom';

const MKT_STATUS_LABELS: Record<string, string> = {
  pending: 'Nueva oferta',
  briefing: 'En brief',
  in_progress: 'En producción',
  revision: 'Entregado',
  approved: 'Aprobado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  overdue: 'Vencido',
};

const MKT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-purple-500/20 text-purple-400',
  briefing: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  revision: 'bg-pink-500/20 text-pink-400',
  approved: 'bg-green-500/20 text-green-400',
  completed: 'bg-cyan-500/20 text-cyan-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
  overdue: 'bg-red-500/20 text-red-400',
};

function getStudioPayment(item: Content, userId?: string): number {
  if (!userId) return item.creator_payment || 0;
  let pay = 0;
  if (item.creator_id === userId) pay += item.creator_payment || 0;
  if (item.editor_id === userId) pay += item.editor_payment || 0;
  return pay;
}

function getMktPayout(project: MarketplaceProject): number {
  return project.creator_payout ?? project.editor_payout ?? project.total_price;
}

// ── Stats header ────────────────────────────────────────────────────────
function StatsHeader({
  studioContent,
  marketplaceProjects,
  userId,
}: {
  studioContent: Content[];
  marketplaceProjects: MarketplaceProject[];
  userId?: string;
}) {
  const studioCOP = studioContent.reduce((s, c) => s + getStudioPayment(c, userId), 0);

  const mktByCurrency = marketplaceProjects
    .filter(p => p.payment_method === 'payment')
    .reduce<Record<string, number>>((acc, p) => {
      const cur = p.currency || 'USD';
      acc[cur] = (acc[cur] || 0) + getMktPayout(p);
      return acc;
    }, {});

  const hasFinancial = studioCOP > 0 || Object.keys(mktByCurrency).length > 0;
  const total = studioContent.length + marketplaceProjects.length;

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 mb-4 rounded-sm bg-zinc-900/60 dark:bg-zinc-900/80 border border-zinc-700/40">
      <div className="flex items-center gap-3 divide-x divide-zinc-700/40">
        <div className="text-center pr-3">
          <p className="text-base font-bold text-white">{total}</p>
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Total</p>
        </div>
        <div className="text-center px-3">
          <p className="text-sm font-semibold text-amber-400">{studioContent.length}</p>
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Clapperboard className="w-2.5 h-2.5" /> Estudio
          </p>
        </div>
        <div className="text-center pl-3">
          <p className="text-sm font-semibold text-purple-400">{marketplaceProjects.length}</p>
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Store className="w-2.5 h-2.5" /> Marketplace
          </p>
        </div>
      </div>

      {hasFinancial && (
        <div className="ml-auto flex flex-col items-end gap-0.5">
          {studioCOP > 0 && (
            <p className="text-xs font-semibold text-green-400">
              ${studioCOP.toLocaleString()} COP <span className="font-normal text-zinc-500">estudio</span>
            </p>
          )}
          {Object.entries(mktByCurrency).map(([cur, amt]) => (
            <p key={cur} className="text-xs font-semibold text-cyan-400">
              ${amt.toLocaleString()} {cur} <span className="font-normal text-zinc-500">mkt</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Collapsible section ─────────────────────────────────────────────────
function Section({
  label,
  count,
  color,
  icon: Icon,
  collapsed,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  color: string;
  icon: typeof Clapperboard;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 mb-2 pb-1 border-b transition-colors group',
          color,
        )}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label} ({count})
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 ml-auto text-zinc-400 transition-transform duration-200"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        />
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden space-y-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export interface UnifiedKpiDialogProps {
  title: string;
  studioContent: Content[];
  marketplaceProjects: MarketplaceProject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContent?: (content: Content) => void;
  userId?: string;
}

export function UnifiedKpiDialog({
  title,
  studioContent,
  marketplaceProjects,
  open,
  onOpenChange,
  onSelectContent,
  userId,
}: UnifiedKpiDialogProps) {
  const navigate = useNavigate();
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [mktCollapsed, setMktCollapsed] = useState(false);
  const total = studioContent.length + marketplaceProjects.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[90dvh] bg-[#0f0f1a] border-zinc-800 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-base font-bold text-white">{title}</span>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              {total}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <StatsHeader
          studioContent={studioContent}
          marketplaceProjects={marketplaceProjects}
          userId={userId}
        />

        <ScrollArea className="h-[50vh] pr-2">
          <div className="space-y-5">
            {/* Studio section */}
            {studioContent.length > 0 && (
              <Section
                label="Estudio"
                count={studioContent.length}
                color="border-amber-500/20 hover:border-amber-500/40 text-amber-400"
                icon={Clapperboard}
                collapsed={studioCollapsed}
                onToggle={() => setStudioCollapsed(v => !v)}
              >
                {studioContent.map(item => {
                  const myPay = getStudioPayment(item, userId);
                  return (
                    <div
                      key={item.id}
                      onClick={() => { onSelectContent?.(item); onOpenChange(false); }}
                      className="p-3 rounded-sm cursor-pointer bg-card border border-amber-500/10 hover:border-amber-500/30 hover:bg-muted transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white line-clamp-1">{item.title}</p>
                          <p className="text-xs text-zinc-500">{item.client?.name || 'Sin cliente'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700/50 text-zinc-300">
                            {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}
                          </span>
                          {myPay > 0 && (
                            <span className="text-xs font-semibold text-green-400">
                              ${myPay.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Section>
            )}

            {/* Marketplace section */}
            {marketplaceProjects.length > 0 && (
              <Section
                label="Marketplace"
                count={marketplaceProjects.length}
                color="border-purple-500/20 hover:border-purple-500/40 text-purple-400"
                icon={Store}
                collapsed={mktCollapsed}
                onToggle={() => setMktCollapsed(v => !v)}
              >
                {marketplaceProjects.map(project => {
                  const isExchange = project.payment_method === 'exchange';
                  const payout = getMktPayout(project);
                  return (
                    <div
                      key={project.id}
                      onClick={() => { navigate('/board?view=marketplace'); onOpenChange(false); }}
                      className="p-3 rounded-sm cursor-pointer bg-card border border-purple-500/10 hover:border-purple-500/30 hover:bg-muted transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white line-clamp-1">
                            {project.brief?.product_name || 'Sin título'}
                          </p>
                          <p className="text-xs text-zinc-500">{project.brand_name || 'Sin marca'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full',
                            MKT_STATUS_COLORS[project.status] || 'bg-zinc-700/50 text-zinc-300',
                          )}>
                            {MKT_STATUS_LABELS[project.status] || project.status}
                          </span>
                          {isExchange ? (
                            <span className="text-xs font-semibold text-pink-400">Canje</span>
                          ) : payout > 0 ? (
                            <span className="text-xs font-semibold text-cyan-400">
                              ${payout.toLocaleString()} {project.currency}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Section>
            )}

            {total === 0 && (
              <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
                No hay elementos en esta categoría
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
