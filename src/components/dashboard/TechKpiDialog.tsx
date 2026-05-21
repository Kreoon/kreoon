import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Content, STATUS_LABELS, STATUS_COLORS } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, DollarSign, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { NeonText } from "@/components/ui/tech-effects";

const STATUS_ORDER = ['issue', 'assigned', 'recording', 'recorded', 'editing', 'delivered', 'corrected', 'paid'];
const EXCLUDED_STATUSES = new Set<string>();

const STATUS_COLOR_MAP: Record<string, string> = {
  approved: "var(--nova-success)",
  paid: "var(--nova-accent-primary)",
  delivered: "var(--nova-accent-secondary)",
  recording: "var(--nova-warning)",
  assigned: "var(--nova-info)",
  editing: "var(--nova-aurora-2)",
  issue: "var(--nova-error)",
  archived: "var(--nova-text-secondary)",
};

const ROLE_CONFIG = {
  creator: { label: 'Creador', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  editor: { label: 'Editor', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  both: { label: 'Creador + Editor', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
} as const;

function getMyPayment(item: Content, userId?: string): number {
  if (!userId) return item.creator_payment || 0;
  let pay = 0;
  if (item.creator_id === userId) pay += item.creator_payment || 0;
  if (item.editor_id === userId) pay += item.editor_payment || 0;
  return pay;
}

function getMyRole(item: Content, userId?: string): 'creator' | 'editor' | 'both' | null {
  if (!userId) return null;
  const isCreator = item.creator_id === userId;
  const isEditor = item.editor_id === userId;
  if (isCreator && isEditor) return 'both';
  if (isCreator) return 'creator';
  if (isEditor) return 'editor';
  return null;
}

function isMyItemPaid(item: Content, userId?: string): boolean {
  if (!userId) return !!item.creator_paid;
  const isCreator = item.creator_id === userId;
  const isEditor = item.editor_id === userId;
  if (isCreator && isEditor) return !!item.creator_paid && !!item.editor_paid;
  if (isCreator) return !!item.creator_paid;
  if (isEditor) return !!item.editor_paid;
  return false;
}

function StatsPanel({ content, userId }: { content: Content[]; userId?: string }) {
  const totalValue = content.reduce((sum, c) => sum + getMyPayment(c, userId), 0);
  const avgPayment = content.length > 0 ? totalValue / content.length : 0;

  const stats = [
    { label: "Total", value: content.length, icon: Play, color: "var(--nova-accent-primary)" },
    { label: "Valor Total", value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: "var(--nova-success)" },
    { label: "Promedio", value: `$${Math.round(avgPayment).toLocaleString()}`, icon: Star, color: "var(--nova-warning)" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className="p-3 rounded-sm bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-default)] text-center hover:border-[var(--nova-border-accent)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ boxShadow: "var(--nova-shadow-glow)" }}
        >
          <stat.icon className="w-4 h-4 mx-auto mb-1" style={{ color: stat.color }} />
          <p className="text-lg font-bold text-[var(--nova-text-bright)]">{stat.value}</p>
          <p className="text-[10px] text-[var(--nova-text-secondary)] uppercase tracking-wider">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}


interface TechKpiDialogProps {
  title: string;
  content: Content[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContent?: (content: Content) => void;
  userId?: string;
}

export function TechKpiDialog({
  title,
  content,
  open,
  onOpenChange,
  onSelectContent,
  userId,
}: TechKpiDialogProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, Content[]> = {};
    content.forEach(c => {
      if (EXCLUDED_STATUSES.has(c.status)) return;
      if (!groups[c.status]) groups[c.status] = [];
      groups[c.status].push(c);
    });
    return groups;
  }, [content]);

  const sortedStatuses = useMemo(() => [
    ...STATUS_ORDER.filter(s => grouped[s]),
    ...Object.keys(grouped).filter(s => !STATUS_ORDER.includes(s)),
  ], [grouped]);

  const visibleContent = useMemo(
    () => sortedStatuses.flatMap(s => grouped[s] ?? []),
    [sortedStatuses, grouped],
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleStatus = (status: string) =>
    setCollapsed(prev => ({ ...prev, [status]: !prev[status] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-4xl max-h-[90dvh] sm:max-h-[90vh] bg-[var(--nova-bg-surface)] border-[var(--nova-border-default)] overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[100px]"
            style={{ background: "radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full blur-[80px]"
            style={{ background: "radial-gradient(circle, rgba(6, 182, 212, 0.15), transparent 70%)" }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          />
        </div>

        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(var(--nova-accent-primary) 1px, transparent 1px),
                             linear-gradient(90deg, var(--nova-accent-primary) 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }}
        />

        <DialogHeader className="relative z-10">
          <DialogTitle className="flex items-center gap-3">
            <motion.div
              className="p-2 rounded-sm bg-[rgba(139,92,246,0.15)] border border-[var(--nova-border-accent)]"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(139, 92, 246, 0)",
                  "0 0 20px 5px rgba(139, 92, 246, 0.3)",
                  "0 0 0 0 rgba(139, 92, 246, 0)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Play className="w-5 h-5 text-[var(--nova-accent-primary)]" />
            </motion.div>
            <NeonText className="text-xl font-bold">{title}</NeonText>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Badge className="bg-[rgba(139,92,246,0.2)] text-[var(--nova-accent-primary)] border-[var(--nova-border-accent)]">
                {visibleContent.length} videos
              </Badge>
            </motion.div>
          </DialogTitle>
        </DialogHeader>

        <div className="relative z-10">
          <StatsPanel content={visibleContent} userId={userId} />

          <ScrollArea className="h-[45vh] pr-4">
            <AnimatePresence>
              {content.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-32 text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="w-16 h-16 rounded-sm bg-muted border border-[hsl(270,100%,60%,0.2)] flex items-center justify-center mb-4"
                    animate={{
                      boxShadow: [
                        "0 0 0 0 hsl(270 100% 60% / 0)",
                        "0 0 30px 10px hsl(270 100% 60% / 0.2)",
                        "0 0 0 0 hsl(270 100% 60% / 0)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Play className="w-6 h-6 text-[hsl(270,100%,60%)]" />
                  </motion.div>
                  <p>No hay contenido en esta categoría</p>
                </motion.div>
              ) : (
                <div className="space-y-5">
                  {sortedStatuses.map(status => (
                    <div key={status}>
                      {/* Status group header — collapsible */}
                      <button
                        onClick={() => toggleStatus(status)}
                        className="w-full flex items-center gap-2 mb-2 pb-1 border-b border-[var(--nova-border-subtle)] hover:border-[var(--nova-border-accent)] transition-colors group"
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_COLOR_MAP[status] || "var(--nova-accent-primary)" }}
                        />
                        <span className="text-xs font-semibold text-[var(--nova-text-secondary)] uppercase tracking-wider group-hover:text-[var(--nova-text-primary)] transition-colors">
                          {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
                        </span>
                        <span
                          className="text-xs font-bold"
                          style={{ color: STATUS_COLOR_MAP[status] || "var(--nova-accent-primary)" }}
                        >
                          ({grouped[status].length})
                        </span>
                        <ChevronDown
                          className="w-3.5 h-3.5 ml-auto text-[var(--nova-text-secondary)] transition-transform duration-200"
                          style={{ transform: collapsed[status] ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                        />
                      </button>

                      {/* Items in group */}
                      <AnimatePresence initial={false}>
                      {!collapsed[status] && <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                      <div className="space-y-2">
                        {grouped[status].map((item, index) => {
                          const myRole = getMyRole(item, userId);
                          const myPayment = getMyPayment(item, userId);
                          const myPaid = isMyItemPaid(item, userId);
                          // Only show values for roles the current user is actually assigned to
                          const isMyCreator = !userId || item.creator_id === userId;
                          const isMyEditor = !userId || item.editor_id === userId;
                          const showCreator = isMyCreator && (item.creator_payment || 0) > 0;
                          const showEditor = isMyEditor && (item.editor_payment || 0) > 0;
                          const shortCode = `#${item.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
                          return (
                            <motion.div
                              key={item.id}
                              onClick={() => {
                                onSelectContent?.(item);
                                onOpenChange(false);
                              }}
                              className={cn(
                                "p-3 rounded-sm cursor-pointer transition-all",
                                "bg-card border border-[hsl(270,100%,60%,0.1)]",
                                "hover:border-[hsl(270,100%,60%,0.3)] hover:bg-muted"
                              )}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.04 }}
                              whileHover={{
                                x: 4,
                                boxShadow: "0 0 20px hsl(270 100% 60% / 0.15)",
                              }}
                            >
                              {/* Row 1: code + badges */}
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10px] font-mono text-[var(--nova-text-secondary)] tracking-wider">
                                  {shortCode}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {myRole && (
                                    <Badge className={cn('text-[10px] px-1.5 border', ROLE_CONFIG[myRole].className)}>
                                      {ROLE_CONFIG[myRole].label}
                                    </Badge>
                                  )}
                                  {item.is_ambassador_content && (
                                    <Star className="w-3.5 h-3.5 text-[hsl(270,100%,60%)] fill-[hsl(270,100%,60%)]" />
                                  )}
                                  {myPaid && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 border-[hsl(160,100%,45%,0.5)] text-[hsl(160,100%,45%)]">
                                      Pagado
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: title */}
                              <h4 className="font-semibold text-sm text-white line-clamp-2 mb-1">
                                {item.title}
                              </h4>

                              {/* Row 3: client */}
                              {item.client?.name && (
                                <p className="text-xs text-[var(--nova-text-secondary)] mb-2.5">
                                  {item.client.name}
                                </p>
                              )}

                              {/* Row 4: values */}
                              <div className="flex items-center gap-3 pt-2 border-t border-[hsl(270,100%,60%,0.08)] text-xs">
                                {showCreator && (
                                  <div className="flex flex-col items-start">
                                    <span className="text-[9px] text-[var(--nova-text-secondary)] uppercase tracking-wider mb-0.5">Creación</span>
                                    <span className="font-semibold text-amber-400">
                                      ${(item.creator_payment || 0).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {showCreator && showEditor && (
                                  <div className="w-px h-7 bg-[hsl(270,100%,60%,0.15)]" />
                                )}
                                {showEditor && (
                                  <div className="flex flex-col items-start">
                                    <span className="text-[9px] text-[var(--nova-text-secondary)] uppercase tracking-wider mb-0.5">Edición</span>
                                    <span className="font-semibold text-blue-400">
                                      ${(item.editor_payment || 0).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                <div className="w-px h-7 bg-[hsl(270,100%,60%,0.15)] ml-auto" />
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] text-[var(--nova-text-secondary)] uppercase tracking-wider mb-0.5">Total</span>
                                  <span className="font-bold text-[var(--nova-success)]">
                                    ${myPayment.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                      </motion.div>}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
