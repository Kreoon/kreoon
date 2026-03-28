import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Content, STATUS_LABELS, STATUS_COLORS } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, DollarSign, Play, Star, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { NeonText } from "@/components/ui/tech-effects";

interface TechKpiDialogProps {
  title: string;
  content: Content[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContent?: (content: Content) => void;
}

// Mini stats summary - Nova Design System
function StatsPanel({ content }: { content: Content[] }) {
  const totalValue = content.reduce((sum, c) => sum + (c.creator_payment || 0), 0);
  const paidCount = content.filter(c => c.creator_paid).length;
  const avgPayment = content.length > 0 ? totalValue / content.length : 0;

  const stats = [
    { label: "Total", value: content.length, icon: Play, color: "var(--nova-accent-primary)" },
    { label: "Valor Total", value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: "var(--nova-success)" },
    { label: "Pagados", value: paidCount, icon: TrendingUp, color: "var(--nova-accent-secondary)" },
    { label: "Promedio", value: `$${avgPayment.toFixed(0)}`, icon: Star, color: "var(--nova-warning)" },
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
          whileHover={{
            boxShadow: "var(--nova-shadow-glow)",
          }}
        >
          <stat.icon className="w-4 h-4 mx-auto mb-1" style={{ color: stat.color }} />
          <p className="text-lg font-bold text-[var(--nova-text-bright)]">{stat.value}</p>
          <p className="text-[10px] text-[var(--nova-text-secondary)] uppercase tracking-wider">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

// Distribution chart - Nova Design System
function DistributionChart({ content }: { content: Content[] }) {
  const statusCounts: Record<string, number> = {};
  content.forEach(c => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

  const entries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...Object.values(statusCounts));

  // Nova color mapping for statuses
  const statusColors: Record<string, string> = {
    approved: "var(--nova-success)",
    paid: "var(--nova-accent-primary)",
    delivered: "var(--nova-accent-secondary)",
    recording: "var(--nova-warning)",
    assigned: "var(--nova-info)",
    editing: "var(--nova-aurora-2)",
    issue: "var(--nova-error)",
  };

  if (entries.length === 0) return null;

  return (
    <div className="mb-4 p-4 rounded-sm bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-subtle)]">
      <p className="text-xs text-[var(--nova-accent-primary)] uppercase tracking-wider mb-3 font-semibold">
        Distribucion por Estado
      </p>
      <div className="space-y-2">
        {entries.map(([status, count], index) => (
          <motion.div
            key={status}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <span className="text-xs w-20 text-[var(--nova-text-secondary)] capitalize">
              {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
            </span>
            <div className="flex-1 h-2 bg-[var(--nova-bg-surface)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: statusColors[status] || "var(--nova-accent-primary)",
                  boxShadow: "var(--nova-shadow-glow)",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${(count / max) * 100}%` }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
              />
            </div>
            <span
              className="text-sm font-bold w-8 text-right"
              style={{ color: statusColors[status] || "var(--nova-accent-primary)" }}
            >
              {count}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function TechKpiDialog({ 
  title, 
  content, 
  open, 
  onOpenChange,
  onSelectContent 
}: TechKpiDialogProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[85dvh] sm:max-h-[85vh] bg-[var(--nova-bg-surface)] border-[var(--nova-border-default)] overflow-hidden">
        {/* Background effects - Nova */}
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

        {/* Grid pattern - Nova */}
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
              <Badge
                className="bg-[rgba(139,92,246,0.2)] text-[var(--nova-accent-primary)] border-[var(--nova-border-accent)]"
              >
                {content.length} videos
              </Badge>
            </motion.div>
          </DialogTitle>
        </DialogHeader>

        <div className="relative z-10">
          {/* Stats Panel */}
          <StatsPanel content={content} />

          {/* Distribution Chart */}
          <DistributionChart content={content} />

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
                <div className="space-y-2">
                  {content.map((item, index) => (
                    <motion.div
                      key={item.id}
                      onClick={() => {
                        onSelectContent?.(item);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "p-4 rounded-sm cursor-pointer transition-all",
                        "bg-card border border-[hsl(270,100%,60%,0.1)]",
                        "hover:border-[hsl(270,100%,60%,0.3)] hover:bg-muted"
                      )}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ 
                        x: 4,
                        boxShadow: "0 0 20px hsl(270 100% 60% / 0.15)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <motion.div 
                            className="h-10 w-10 rounded-sm bg-muted border border-[hsl(270,100%,60%,0.2)] flex items-center justify-center overflow-hidden"
                            whileHover={{ borderColor: "hsl(270 100% 60% / 0.5)" }}
                          >
                            {item.thumbnail_url ? (
                              <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Play className="h-4 w-4 text-primary" />
                            )}
                          </motion.div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm truncate text-white">{item.title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.client?.name || 'Sin cliente'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.is_ambassador_content && (
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            >
                              <Star className="w-4 h-4 text-[hsl(270,100%,60%)] fill-[hsl(270,100%,60%)]" />
                            </motion.div>
                          )}
                          <Badge className={cn("text-xs", STATUS_COLORS[item.status])}>
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                        {item.creator?.full_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-[hsl(270,100%,60%)]" />
                            <span>{item.creator.full_name}</span>
                          </div>
                        )}
                        {item.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-[hsl(190,100%,50%)]" />
                            <span>{formatDate(item.deadline)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-[hsl(160,100%,45%)]" />
                          <span>
                            ${item.creator_payment?.toLocaleString() || 0}
                            {item.creator_paid && (
                              <Badge variant="outline" className="ml-1 text-[10px] px-1 border-[hsl(160,100%,45%,0.5)] text-[hsl(160,100%,45%)]">
                                Pagado
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
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
