import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Video, CheckCircle2,
  Handshake, Loader2, Users, Package, Zap, Plus, Pencil,
  ChevronDown, MoveRight, AlertTriangle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { type ClientPackage, type PaymentStatus, type Product } from '@/types/database';
import { ClientPackageDialog } from '@/components/clients/ClientPackageDialog';
import { cn } from '@/lib/utils';

interface ContentItem {
  id: string;
  title: string;
  status: string;
  client_package_id: string | null;
}

const STATUS_DOT: Record<string, string> = {
  draft:               'bg-gray-400',
  in_progress:         'bg-blue-400',
  review:              'bg-yellow-400',
  approved:            'bg-green-400',
  published:           'bg-purple-400',
  revision_requested:  'bg-orange-400',
  delivered:           'bg-teal-400',
};

interface ClientPackagesDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_STYLE: Record<string, {
  label: string;
  pill: string;
  bar: string;
  headerBg: string;
  dot: string;
}> = {
  pending: {
    label:    'Pago pendiente',
    pill:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
    bar:      'border-l-amber-500',
    headerBg: 'bg-amber-500/5',
    dot:      'bg-amber-400',
  },
  partial: {
    label:    'Pago parcial',
    pill:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
    bar:      'border-l-blue-500',
    headerBg: 'bg-blue-500/5',
    dot:      'bg-blue-400',
  },
  paid: {
    label:    'Pagado completo',
    pill:     'bg-green-500/15 text-green-400 border-green-500/30',
    bar:      'border-l-green-500',
    headerBg: 'bg-green-500/5',
    dot:      'bg-green-400',
  },
  overdue: {
    label:    'Vencido',
    pill:     'bg-red-500/15 text-red-400 border-red-500/30',
    bar:      'border-l-red-500',
    headerBg: 'bg-red-500/5',
    dot:      'bg-red-400',
  },
};

const BARTER_STYLE = {
  label:    'Canje',
  pill:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  bar:      'border-l-amber-400',
  headerBg: 'bg-amber-500/5',
  dot:      'bg-amber-400',
};

export function ClientPackagesDialog({ clientId, clientName, open, onOpenChange }: ClientPackagesDialogProps) {
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ClientPackage | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [expandedPkgs, setExpandedPkgs] = useState<Set<string>>(new Set());
  const [movingId, setMovingId] = useState<string | null>(null);

  const loadPackages = useCallback(() => {
    setLoading(true);
    supabase
      .from('client_packages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPackages((data || []) as ClientPackage[]);
        setLoading(false);
      });
  }, [clientId]);

  const loadContent = useCallback(() => {
    supabase
      .from('content')
      .select('id, title, status, client_package_id')
      .eq('client_id', clientId)
      .then(({ data }) => setContentItems((data || []) as ContentItem[]));
  }, [clientId]);

  useEffect(() => {
    if (!open) return;
    loadPackages();
    loadContent();
    supabase
      .from('products')
      .select('*')
      .eq('client_id', clientId)
      .then(({ data }) => setProducts((data || []) as Product[]));
  }, [open, clientId, loadPackages, loadContent]);

  function toggleExpanded(pkgId: string) {
    setExpandedPkgs(prev => {
      const next = new Set(prev);
      next.has(pkgId) ? next.delete(pkgId) : next.add(pkgId);
      return next;
    });
  }

  async function moveItem(contentId: string, newPkgId: string) {
    setMovingId(contentId);
    const { error } = await supabase
      .from('content')
      .update({ client_package_id: newPkgId })
      .eq('id', contentId);
    if (!error) {
      setContentItems(prev =>
        prev.map(c => c.id === contentId ? { ...c, client_package_id: newPkgId } : c),
      );
    }
    setMovingId(null);
  }

  function handleNew() {
    setEditingPackage(null);
    setFormOpen(true);
  }

  function handleEdit(pkg: ClientPackage) {
    setEditingPackage(pkg);
    setFormOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl w-full h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">

          {/* Header fijo */}
          <div className="bg-gradient-to-r from-blue-500/15 via-blue-500/8 to-transparent px-5 pt-5 pb-4 border-b border-border shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base">Campañas contratadas</p>
                  <p className="text-xs text-muted-foreground font-normal">{clientName}</p>
                </div>
                <Button size="sm" onClick={handleNew} className="shrink-0 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Nueva campaña
                </Button>
              </DialogTitle>
            </DialogHeader>

            {!loading && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 rounded-full bg-background/60 border border-border px-3 py-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold">{packages.length}</span>
                  <span className="text-xs text-muted-foreground">
                    {packages.length === 1 ? 'campaña' : 'campañas'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Lista con scroll nativo */}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 pt-4 space-y-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
                <p className="text-sm text-muted-foreground">Cargando campañas...</p>
              </div>
            ) : packages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Sin campañas registradas</p>
                <p className="text-xs text-muted-foreground text-center max-w-[220px]">
                  Todavía no hay campañas contratadas para este cliente
                </p>
                <Button size="sm" variant="outline" onClick={handleNew} className="gap-1.5 mt-1">
                  <Plus className="h-3.5 w-3.5" />
                  Crear primera campaña
                </Button>
              </div>
            ) : packages.map((pkg, idx) => {
              const isBarter = (pkg as any).is_barter;
              const s = isBarter ? BARTER_STYLE : (PAYMENT_STYLE[pkg.payment_status as PaymentStatus] ?? PAYMENT_STYLE.pending);
              const pendingAmount = pkg.total_value - pkg.paid_amount;
              const paidPct = pkg.total_value > 0 ? Math.min(100, Math.round((pkg.paid_amount / pkg.total_value) * 100)) : 0;
              const productCount = pkg.product_ids?.length ?? (pkg as any).products_count ?? 0;

              return (
                <div
                  key={pkg.id}
                  className={cn(
                    'rounded-xl border border-border border-l-4 bg-card overflow-hidden shadow-sm',
                    s.bar,
                  )}
                >
                  {/* ── Encabezado campaña ── */}
                  <div className={cn('px-4 pt-4 pb-3', s.headerBg)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Número único de campaña */}
                        <span className="shrink-0 font-medium opacity-50 text-sm">
                          #{String(pkg.campaign_number).padStart(4, '0')}
                        </span>
                        <p className="font-bold text-sm leading-tight truncate">{pkg.name}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Píldora de estado */}
                        <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', s.pill)}>
                          {isBarter
                            ? <Handshake className="h-3 w-3" />
                            : <div className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                          }
                          {s.label}
                        </div>

                        {/* Botón editar */}
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                          title="Editar campaña"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{pkg.description}</p>
                    )}
                  </div>

                  {/* ── Qué incluye ── */}
                  <div className="grid grid-cols-4 gap-1.5 px-4 py-3 border-t border-border/60">
                    {[
                      { icon: Video,   value: pkg.content_quantity, label: 'Videos',      color: 'text-purple-400' },
                      { icon: Zap,     value: pkg.hooks_per_video,  label: 'Hooks/video', color: 'text-yellow-400' },
                      { icon: Users,   value: pkg.creators_count,   label: 'Creadores',   color: 'text-blue-400'   },
                      { icon: Package, value: productCount,          label: 'Productos',   color: 'text-green-400'  },
                    ].map(({ icon: Icon, value, label, color }) => (
                      <div key={label} className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-muted/50">
                        <Icon className={cn('h-3.5 w-3.5', color)} />
                        <span className="font-bold text-sm leading-none">{value}</span>
                        <p className="text-[10px] text-muted-foreground text-center leading-tight">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── Sección financiera ── */}
                  {!isBarter ? (
                    <div className="border-t border-border/60 bg-muted/20 px-4 py-3 space-y-2.5">
                      {/* Fila de montos */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Valor total</p>
                          <p className="text-sm font-bold text-foreground">${pkg.total_value.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Pagado</p>
                          <p className="text-sm font-bold text-green-400">${pkg.paid_amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Pendiente</p>
                          {pendingAmount > 0 ? (
                            <p className="text-sm font-bold text-amber-400">${pendingAmount.toLocaleString()}</p>
                          ) : (
                            <p className="text-sm font-bold text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />Nada
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Barra de progreso de pago */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-muted-foreground">Progreso de pago</p>
                          <p className="text-[10px] font-semibold text-foreground">{paidPct}%</p>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', paidPct === 100 ? 'bg-green-500' : 'bg-blue-500')}
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-2">
                      <Handshake className="h-4 w-4 text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-400 font-medium">
                        Campaña sin cobro — se paga con productos o servicios en especie
                      </p>
                    </div>
                  )}

                  {/* ── Proyectos asignados ── */}
                  {(() => {
                    const pkgItems = contentItems.filter(c => c.client_package_id === pkg.id);
                    const assigned = pkgItems.length;
                    const capacity = pkg.content_quantity;
                    const overflow = assigned > capacity;
                    const isExpanded = expandedPkgs.has(pkg.id);
                    const otherPkgs = packages.filter(p => p.id !== pkg.id);

                    return (
                      <div className="border-t border-border/60">
                        <button
                          onClick={() => toggleExpanded(pkg.id)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className={cn(
                              'text-xs font-semibold',
                              overflow ? 'text-red-400' : 'text-muted-foreground',
                            )}>
                              {assigned}/{capacity} proyectos
                            </span>
                            {overflow && (
                              <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                {assigned - capacity} excedente{assigned - capacity > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <ChevronDown className={cn(
                            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                            isExpanded && 'rotate-180',
                          )} />
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-1">
                            {pkgItems.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-1 text-center">Sin proyectos asignados</p>
                            ) : pkgItems.map(item => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors"
                              >
                                <div className={cn(
                                  'h-1.5 w-1.5 rounded-full shrink-0',
                                  STATUS_DOT[item.status] ?? 'bg-gray-400',
                                )} />
                                <span className="text-xs text-foreground truncate flex-1 min-w-0">
                                  {item.title || 'Sin título'}
                                </span>
                                {movingId === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                                ) : otherPkgs.length > 0 ? (
                                  <select
                                    className="shrink-0 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5 bg-background hover:border-border cursor-pointer transition-colors"
                                    title="Mover a campaña"
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) moveItem(item.id, e.target.value);
                                    }}
                                  >
                                    <option value="" disabled>Mover →</option>
                                    {otherPkgs.map(op => {
                                      const opCount = contentItems.filter(c => c.client_package_id === op.id).length;
                                      const opFree = op.content_quantity - opCount;
                                      return (
                                        <option key={op.id} value={op.id}>
                                          #{String(op.campaign_number).padStart(4, '0')} {op.name} ({opFree > 0 ? `${opFree} libre${opFree > 1 ? 's' : ''}` : 'lleno'})
                                        </option>
                                      );
                                    })}
                                  </select>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Formulario crear / editar — fuera del Dialog principal para evitar z-index */}
      <ClientPackageDialog
        clientId={clientId}
        package_={editingPackage}
        products={products}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={loadPackages}
      />
    </>
  );
}
