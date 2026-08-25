import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import {
  Video, Calendar, Loader2, User, Scissors, Clock, CheckCircle2,
  AlertTriangle, FileText, FileCheck, Mic, Eye, XCircle, Send,
  RefreshCw, Archive, UserCheck, Film, CircleDollarSign, ExternalLink, Package, Zap, Megaphone,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BulkGenerationDrawer } from '@/components/content/BulkGenerationDrawer';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const UnifiedProjectModal = lazy(() =>
  import('@/components/projects/UnifiedProjectModal').then(m => ({ default: m.UnifiedProjectModal }))
);

interface ContentItem {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  approved_at: string | null;
  creator_id: string | null;
  editor_id: string | null;
  product_id: string | null;
  client_package_id: string | null;
  status_changed_at?: string | null;
  creator?: { full_name: string } | null;
  editor?: { full_name: string } | null;
  product?: { id: string; name: string } | null;
}

interface ClientPackage {
  id: string;
  name: string;
  campaign_number: number;
}

// ── Mapa de estados ──────────────────────────────────────────────────────────
const STATUS_INFO: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
}> = {
  draft:          { label: 'Recién creado',      bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-500/20',   icon: <FileText className="h-3 w-3" />     },
  script_pending: { label: 'Guión pendiente',    bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20',  icon: <FileText className="h-3 w-3" />     },
  script_approved:{ label: 'Guión aprobado',     bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/20',    icon: <FileCheck className="h-3 w-3" />    },
  assigned:       { label: 'Asignado a creator', bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    icon: <UserCheck className="h-3 w-3" />    },
  recording:      { label: 'Grabando',           bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20',  icon: <Mic className="h-3 w-3" />          },
  recorded:       { label: 'Video grabado',      bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   icon: <Film className="h-3 w-3" />         },
  editing:        { label: 'En edición',         bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20',  icon: <Scissors className="h-3 w-3" />     },
  review:         { label: 'En revisión',        bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20',  icon: <Eye className="h-3 w-3" />          },
  issue:          { label: 'Con novedad',        bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     icon: <AlertTriangle className="h-3 w-3" /> },
  rejected:       { label: 'Rechazado',          bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     icon: <XCircle className="h-3 w-3" />      },
  delivered:      { label: 'Entregado',          bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/20',    icon: <Send className="h-3 w-3" />         },
  corrected:      { label: 'Corregido',          bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/20',    icon: <RefreshCw className="h-3 w-3" />    },
  approved:       { label: 'Aprobado',           bg: 'bg-green-500/10',   text: 'text-green-400',   border: 'border-green-500/20',   icon: <CheckCircle2 className="h-3 w-3" /> },
  paid:           { label: 'Completado',         bg: 'bg-green-500/10',   text: 'text-green-400',   border: 'border-green-500/20',   icon: <CircleDollarSign className="h-3 w-3" /> },
  archived:       { label: 'Archivado',          bg: 'bg-green-500/10',   text: 'text-green-400',   border: 'border-green-500/20',   icon: <Archive className="h-3 w-3" />      },
};

function getStatusInfo(status: string) {
  return STATUS_INFO[status] ?? {
    label: status, bg: 'bg-muted', text: 'text-muted-foreground',
    border: 'border-border', icon: <Video className="h-3 w-3" />,
  };
}

function isCompleted(status: string) {
  return ['approved', 'paid', 'archived'].includes(status);
}
function isDelivered(status: string) {
  return ['delivered', 'corrected'].includes(status);
}

// ── Chip de urgencia para deadline ───────────────────────────────────────────
function DeadlineChip({ deadline }: { deadline: string }) {
  const date = new Date(deadline);
  const diffDays = differenceInDays(date, new Date());

  if (isPast(date) && !isToday(date)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400">
        <AlertTriangle className="h-2.5 w-2.5" />
        Vencido hace {Math.abs(diffDays)} {Math.abs(diffDays) === 1 ? 'día' : 'días'}
      </span>
    );
  }
  if (isToday(date)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400">
        <Clock className="h-2.5 w-2.5" />
        Entrega hoy
      </span>
    );
  }
  if (isTomorrow(date)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
        <Clock className="h-2.5 w-2.5" />
        Entrega mañana
      </span>
    );
  }
  if (diffDays <= 5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
        <Clock className="h-2.5 w-2.5" />
        En {diffDays} días
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Calendar className="h-2.5 w-2.5" />
      {format(date, "d 'de' MMM", { locale: es })}
    </span>
  );
}

// ── Ordenar activos por urgencia de deadline ─────────────────────────────────
function sortByUrgency(items: ContentItem[]) {
  return [...items].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}

interface ClientVideosDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientVideosDialog({ clientId, clientName, open, onOpenChange }: ClientVideosDialogProps) {
  const { toast } = useToast();
  const [showBulkDrawer, setShowBulkDrawer] = useState(false);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filterProductId, setFilterProductId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceIdRef = useRef(crypto.randomUUID());

  const handleCampaignChange = async (contentId: string, packageId: string | null) => {
    const { error } = await supabase
      .from('content')
      .update({ client_package_id: packageId })
      .eq('id', contentId);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la campaña', variant: 'destructive' });
    } else {
      setContent(prev => prev.map(c => c.id === contentId ? { ...c, client_package_id: packageId } : c));
    }
  };

  // ── Enriquecer un array de rows con perfiles, productos e historial ──────
  const enrichItems = useCallback(async (rows: any[]): Promise<ContentItem[]> => {
    if (!rows.length) return [];

    const profileIds = [...new Set([
      ...rows.map(d => d.creator_id).filter(Boolean),
      ...rows.map(d => d.editor_id).filter(Boolean),
    ])] as string[];

    const productIds = [...new Set(rows.map(d => d.product_id).filter(Boolean))] as string[];

    const [{ data: profiles }, { data: prods }, { data: history }] = await Promise.all([
      profileIds.length
        ? supabase.from('profiles').select('id, full_name').in('id', profileIds)
        : Promise.resolve({ data: [] }),
      productIds.length
        ? supabase.from('products').select('id, name').in('id', productIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from('content_history')
        .select('content_id, new_status, created_at')
        .in('content_id', rows.map(d => d.id))
        .order('created_at', { ascending: false }),
    ]);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
    const productMap  = new Map((prods    ?? []).map(p => [p.id, p]));

    if (prods?.length) setProducts(prev => {
      const merged = new Map([...prev, ...prods].map(p => [p.id, p]));
      return [...merged.values()];
    });

    return rows.map(item => {
      const match = (history ?? []).find(h => h.content_id === item.id && h.new_status === item.status);
      return {
        ...item,
        status_changed_at: match?.created_at ?? null,
        creator: item.creator_id ? profileMap.get(item.creator_id) ?? null : null,
        editor:  item.editor_id  ? profileMap.get(item.editor_id)  ?? null : null,
        product: item.product_id ? productMap.get(item.product_id) ?? null  : null,
      };
    });
  }, []);

  // ── Carga inicial completa ───────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setFilterProductId(null);
    const { data } = await supabase
      .from('content')
      .select('id, title, status, deadline, created_at, updated_at, delivered_at, approved_at, creator_id, editor_id, product_id, client_package_id')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!data?.length) { setContent([]); setLoading(false); return; }
    const enriched = await enrichItems(data);
    setContent(enriched);
    setLoading(false);
  }, [clientId, enrichItems]);

  // ── Carga inicial cuando abre ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    loadAll();
    supabase
      .from('client_packages')
      .select('id, name, campaign_number')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('campaign_number')
      .then(({ data }) => setClientPackages((data ?? []) as ClientPackage[]));
  }, [open, loadAll, clientId]);

  // ── Suscripción Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`client-videos-dialog-${clientId}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content', filter: `client_id=eq.${clientId}` },
        async (payload: any) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'DELETE') {
            setContent(prev => prev.filter(c => c.id !== oldRow.id));
            return;
          }

          // Soft delete: llega como UPDATE con deleted_at, no como DELETE.
          // Sin esto la tarjeta seguiría mostrando un item que el kanban ya oculta.
          if (newRow?.deleted_at) {
            setContent(prev => prev.filter(c => c.id !== newRow.id));
            return;
          }

          // INSERT o UPDATE: enriquecer el item y actualizar estado
          const { data: fresh } = await supabase
            .from('content')
            .select('id, title, status, deadline, created_at, updated_at, delivered_at, approved_at, creator_id, editor_id, product_id, client_package_id')
            .eq('id', newRow.id)
            .single();

          if (!fresh) return;
          const [enriched] = await enrichItems([fresh]);

          if (eventType === 'INSERT') {
            setContent(prev => [enriched, ...prev]);
          } else {
            setContent(prev => prev.map(c => c.id === enriched.id ? enriched : c));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [open, clientId, enrichItems]);

  const filtered  = filterProductId ? content.filter(c => c.product_id === filterProductId) : content;
  const active    = sortByUrgency(filtered.filter(c => !isDelivered(c.status) && !isCompleted(c.status)));
  const delivered = filtered.filter(c => isDelivered(c.status));
  const completed = filtered.filter(c => isCompleted(c.status));

  const overdueCount = active.filter(c => c.deadline && isPast(new Date(c.deadline)) && !isToday(new Date(c.deadline))).length;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-purple-500/15 via-purple-500/8 to-transparent px-5 pt-5 pb-4 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Video className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="font-bold text-base">Videos del cliente</p>
                <p className="text-xs text-muted-foreground font-normal">{clientName}</p>
              </div>
              <button
                onClick={() => setShowBulkDrawer(true)}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Zap className="h-3.5 w-3.5" />
                Generar en lote
              </button>
            </DialogTitle>
          </DialogHeader>

          {!loading && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <div className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5',
                overdueCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-background/60 border-border',
              )}>
                <Clock className={cn('h-3.5 w-3.5', overdueCount > 0 ? 'text-red-400' : 'text-amber-400')} />
                <span className={cn('text-sm font-semibold', overdueCount > 0 && 'text-red-400')}>{active.length}</span>
                <span className="text-xs text-muted-foreground">en producción</span>
                {overdueCount > 0 && (
                  <span className="text-xs font-bold text-red-400">· {overdueCount} vencido{overdueCount > 1 ? 's' : ''}</span>
                )}
              </div>
              {delivered.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 px-3 py-1.5">
                  <Send className="h-3.5 w-3.5 text-teal-400" />
                  <span className="text-sm font-semibold text-teal-400">{delivered.length}</span>
                  <span className="text-xs text-muted-foreground">entregados</span>
                </div>
              )}
              {completed.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">{completed.length}</span>
                  <span className="text-xs text-muted-foreground">completados</span>
                </div>
              )}
            </div>
          )}

          {/* ── Filtro por producto ── */}
          {!loading && products.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                Producto:
              </span>
              <button
                onClick={() => setFilterProductId(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full border text-xs font-medium transition-all',
                  filterProductId === null
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'border-border bg-muted/40 text-muted-foreground hover:border-border/80',
                )}
              >
                Todos
              </button>
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterProductId(prev => prev === p.id ? null : p.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full border text-xs font-medium transition-all',
                    filterProductId === p.id
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-border/80',
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Lista ── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-5 pb-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
              <p className="text-sm text-muted-foreground">Cargando videos...</p>
            </div>
          ) : content.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Video className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Sin videos registrados</p>
              <p className="text-xs text-muted-foreground text-center max-w-[220px]">
                Todavía no hay videos asignados a este cliente
              </p>
            </div>
          ) : (
            <div className="space-y-6 pt-4">

              {/* ── Sección: En producción ── */}
              {active.length > 0 && (
                <section>
                  <SectionHeader
                    icon={<Clock className="h-4 w-4 text-amber-400" />}
                    label="En producción"
                    count={active.length}
                    accent="border-l-amber-400"
                    labelColor="text-amber-400"
                  />
                  <div className="space-y-3 mt-3">
                    {active.map(item => {
                      const s = getStatusInfo(item.status);
                      const isOverdue = item.deadline && isPast(new Date(item.deadline)) && !isToday(new Date(item.deadline));
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'rounded-xl border border-l-4 bg-card overflow-hidden cursor-pointer transition-shadow hover:shadow-md hover:border-purple-500/40',
                            isOverdue ? 'border-red-500/30 border-l-red-500' : 'border-border border-l-purple-500/50',
                          )}
                          onClick={() => setSelectedProjectId(item.id)}
                        >
                          {/* Título + estado */}
                          <div className={cn('px-4 pt-3 pb-2.5', isOverdue ? 'bg-red-500/5' : 'bg-purple-500/3')}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <Video className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                <p className="text-sm font-semibold leading-tight">{item.title}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex flex-col items-end gap-0.5">
                                  <div className={cn(
                                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                                    s.bg, s.text, s.border,
                                  )}>
                                    {s.icon}
                                    {s.label}
                                  </div>
                                  {item.status_changed_at && (
                                    <span className="text-[10px] text-muted-foreground/70 pr-0.5">
                                      desde {format(new Date(item.status_changed_at), "d 'de' MMM", { locale: es })}
                                    </span>
                                  )}
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Equipo + fechas */}
                          <div className="px-4 py-2.5 border-t border-border/50 flex flex-wrap gap-x-4 gap-y-2">
                            {item.creator && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <User className="h-3 w-3 text-blue-400 shrink-0" />
                                <span className="text-muted-foreground">Creator:</span>
                                <span className="font-medium text-foreground">{item.creator.full_name}</span>
                              </div>
                            )}
                            {item.editor && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Scissors className="h-3 w-3 text-purple-400 shrink-0" />
                                <span className="text-muted-foreground">Editor:</span>
                                <span className="font-medium text-foreground">{item.editor.full_name}</span>
                              </div>
                            )}
                            {!item.creator && !item.editor && (
                              <span className="text-xs text-muted-foreground italic">Sin equipo asignado</span>
                            )}
                            {item.product && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Package className="h-3 w-3 text-green-400 shrink-0" />
                                <span className="text-muted-foreground">Producto:</span>
                                <span className="font-medium text-foreground">{item.product.name}</span>
                              </div>
                            )}
                            {/* Selector de campaña */}
                            <div
                              className="flex items-center gap-1.5 text-xs"
                              onClick={e => e.stopPropagation()}
                            >
                              <Megaphone className="h-3 w-3 text-amber-400 shrink-0" />
                              <span className="text-muted-foreground">Campaña:</span>
                              <Select
                                value={item.client_package_id ?? '__none__'}
                                onValueChange={val => handleCampaignChange(item.id, val === '__none__' ? null : val)}
                              >
                                <SelectTrigger className="h-5 border-0 bg-transparent px-1 text-xs font-medium shadow-none focus:ring-0 hover:text-amber-400 transition-colors w-auto min-w-[110px]">
                                  <SelectValue placeholder="Sin campaña" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Sin campaña</SelectItem>
                                  {clientPackages.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                      #{String(p.campaign_number).padStart(4, '0')} {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Fechas clave */}
                          <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20 flex flex-wrap gap-x-4 gap-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>Creado:</span>
                              <span className="text-foreground/80">
                                {format(new Date(item.created_at), "d 'de' MMM yyyy", { locale: es })}
                              </span>
                            </div>
                            {item.deadline && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Entrega:</span>
                                <DeadlineChip deadline={item.deadline} />
                              </div>
                            )}
                            {!item.deadline && (
                              <span className="text-xs text-muted-foreground italic">Sin fecha de entrega</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Sección: Entregados ── */}
              {delivered.length > 0 && (
                <section>
                  <SectionHeader
                    icon={<Send className="h-4 w-4 text-teal-400" />}
                    label="Entregados al cliente"
                    count={delivered.length}
                    accent="border-l-teal-400"
                    labelColor="text-teal-400"
                  />
                  <div className="space-y-2 mt-3">
                    {delivered.map(item => {
                      const s = getStatusInfo(item.status);
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-l-4 border-teal-500/30 border-l-teal-500 bg-card overflow-hidden cursor-pointer transition-shadow hover:shadow-md hover:border-teal-500/50"
                          onClick={() => setSelectedProjectId(item.id)}
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            <Send className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                            <p className="text-sm font-medium flex-1 min-w-0 truncate">{item.title}</p>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium', s.bg, s.text, s.border)}>
                                {s.icon}
                                {s.label}
                              </div>
                              {item.status_changed_at && (
                                <span className="text-[10px] text-muted-foreground/70 pr-0.5">
                                  desde {format(new Date(item.status_changed_at), "d 'de' MMM", { locale: es })}
                                </span>
                              )}
                            </div>
                          </div>
                          {(item.delivered_at || item.deadline || item.client_package_id) && (
                            <div className="px-4 py-2 border-t border-teal-500/10 bg-teal-500/5 flex flex-wrap gap-x-4 gap-y-1">
                              {item.deadline && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  Fecha límite: {format(new Date(item.deadline), "d 'de' MMM yyyy", { locale: es })}
                                </span>
                              )}
                              {item.delivered_at && (
                                <span className="text-[10px] text-teal-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Entregado: {format(new Date(item.delivered_at), "d 'de' MMM yyyy", { locale: es })}
                                </span>
                              )}
                              {item.client_package_id && (() => {
                                const pkg = clientPackages.find(p => p.id === item.client_package_id);
                                return pkg ? (
                                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                    <Megaphone className="h-2.5 w-2.5" />
                                    #{String(pkg.campaign_number).padStart(4, '0')} {pkg.name}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Sección: Completados ── */}
              {completed.length > 0 && (
                <section>
                  <SectionHeader
                    icon={<CheckCircle2 className="h-4 w-4 text-green-400" />}
                    label="Completados"
                    count={completed.length}
                    accent="border-l-green-400"
                    labelColor="text-green-400"
                  />
                  <div className="space-y-2 mt-3">
                    {completed.map(item => {
                      const s = getStatusInfo(item.status);
                      const finishDate = item.approved_at || item.updated_at;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-l-4 border-green-500/20 border-l-green-500 bg-card overflow-hidden cursor-pointer transition-shadow hover:shadow-md hover:border-green-500/40"
                          onClick={() => setSelectedProjectId(item.id)}
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                            <p className="text-sm font-medium flex-1 min-w-0 truncate text-foreground/80">{item.title}</p>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium', s.bg, s.text, s.border)}>
                                {s.icon}
                                {s.label}
                              </div>
                              {item.status_changed_at && (
                                <span className="text-[10px] text-muted-foreground/70 pr-0.5">
                                  desde {format(new Date(item.status_changed_at), "d 'de' MMM", { locale: es })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="px-4 py-2 border-t border-green-500/10 bg-green-500/5 flex flex-wrap gap-x-4 gap-y-1">
                            {item.creator && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <User className="h-2.5 w-2.5" />
                                {item.creator.full_name}
                              </span>
                            )}
                            <span className="text-[10px] text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Completado {formatDistanceToNow(new Date(finishDate), { addSuffix: true, locale: es })}
                            </span>
                            {item.client_package_id && (() => {
                              const pkg = clientPackages.find(p => p.id === item.client_package_id);
                              return pkg ? (
                                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                  <Megaphone className="h-2.5 w-2.5" />
                                  #{String(pkg.campaign_number).padStart(4, '0')} {pkg.name}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <Suspense fallback={null}>
      <UnifiedProjectModal
        source="content"
        projectId={selectedProjectId ?? undefined}
        open={!!selectedProjectId}
        onOpenChange={(o) => { if (!o) setSelectedProjectId(null); }}
        onUpdate={() => {
          if (selectedProjectId) {
            // Actualizar solo el item modificado en el estado local
            supabase
              .from('content')
              .select('id, title, status, deadline, created_at, updated_at, delivered_at, approved_at, creator_id, editor_id, product_id')
              .eq('id', selectedProjectId)
              .single()
              .then(({ data }) => {
                if (!data) return;
                setContent(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
              });
          }
        }}
        onDelete={async (contentId: string) => {
          const { error } = await supabase.from('content').delete().eq('id', contentId);
          if (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar el video', variant: 'destructive' });
          } else {
            setContent(prev => prev.filter(c => c.id !== contentId));
            setSelectedProjectId(null);
            toast({ title: 'Video eliminado', description: 'El video se eliminó correctamente' });
          }
        }}
      />
    </Suspense>

    <BulkGenerationDrawer
      open={showBulkDrawer}
      onOpenChange={setShowBulkDrawer}
      clientId={clientId}
    />
    </>
  );
}

// ── Componente auxiliar: encabezado de sección ───────────────────────────────
function SectionHeader({
  icon, label, count, accent, labelColor,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  accent: string;
  labelColor: string;
}) {
  return (
    <div className={cn('flex items-center gap-2.5 border-l-4 pl-3 py-0.5', accent)}>
      {icon}
      <p className={cn('text-sm font-bold', labelColor)}>{label}</p>
      <span className="ml-auto text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
        {count} {count === 1 ? 'video' : 'videos'}
      </span>
    </div>
  );
}
