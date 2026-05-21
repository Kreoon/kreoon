import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Camera, ShoppingBag, FolderKanban, Edit2, Trash2,
  ChevronDown, ChevronUp, DollarSign, CheckCircle, Handshake,
  Video, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useClientBillingItems, type BillingItem } from '@/hooks/useClientBilling';
import { FillmakerDialog } from '@/components/clients/FillmakerDialog';
import { formatCurrency } from '@/lib/finance-format';
import type { ClientPackage, Content } from '@/types/database';
import type { PaymentStatus } from '@/types/database';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/types/database';

interface Props {
  orgId: string;
  clientId: string;
  clientName: string;
  isAdmin: boolean;
  packages: ClientPackage[];
  loadingPackages: boolean;
  assignedContent: Content[];
  onCreatePackage: () => void;
  onEditPackage: (pkg: ClientPackage) => void;
  onDeletePackage: (id: string) => void;
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function monthKey(dateStr: string) {
  try { return format(parseISO(dateStr), 'MMMM yyyy', { locale: es }); }
  catch { return 'Sin fecha'; }
}

function groupByMonth<T>(items: T[], getDate: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = monthKey(getDate(item));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries());
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', in_closing: 'En cierre', paid: 'Pagado',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  in_closing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  paid: 'bg-green-500/15 text-green-400 border-green-500/30',
};

// ─── Sección colapsable por mes ───────────────────────────────────────────────

function MonthSection({ month, count, children, defaultOpen = false }: {
  month: string; count: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
      >
        <span className="text-sm font-medium capitalize">{month}</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs h-5">{count}</Badge>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="divide-y divide-white/5">{children}</div>}
    </div>
  );
}

// ─── Fila de ítem de facturación ─────────────────────────────────────────────

function ServiceItemRow({ item }: { item: BillingItem }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {item.item_type === 'fillmaker'
        ? <Camera className="h-4 w-4 text-violet-400 shrink-0" />
        : <FolderKanban className="h-4 w-4 text-blue-400 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
      <Badge className={`text-xs shrink-0 ${STATUS_COLOR[item.billing_status] ?? ''}`}>
        {STATUS_LABEL[item.billing_status] ?? item.billing_status}
      </Badge>
      <span className="text-sm font-semibold text-green-400 whitespace-nowrap shrink-0">
        {formatCurrency(item.price_client, item.currency)}
      </span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ClientServicesTab({
  orgId, clientId, isAdmin,
  packages, loadingPackages, assignedContent,
  onCreatePackage, onEditPackage, onDeletePackage,
}: Props) {
  const [fillmakerOpen, setFillmakerOpen] = useState(false);
  const { data: billingItems = [], isLoading: loadingItems } = useClientBillingItems(orgId, clientId);

  const fillmakers = useMemo(() => billingItems.filter(i => i.item_type === 'fillmaker'), [billingItems]);
  const projects = useMemo(() => billingItems.filter(i => i.item_type === 'project'), [billingItems]);

  const fillmakersByMonth = useMemo(() => groupByMonth(fillmakers, i => i.item_date), [fillmakers]);
  const projectsByMonth = useMemo(() => groupByMonth(projects, i => i.item_date), [projects]);

  const totalServices = packages.length + fillmakers.length + projects.length;

  return (
    <div className="space-y-6">
      {/* ─── KPI resumen ─────────────────────────────── */}
      {totalServices > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Campañas', value: packages.length, icon: ShoppingBag, color: 'text-primary' },
            { label: 'Grabaciones', value: fillmakers.length, icon: Camera, color: 'text-violet-400' },
            { label: 'Proyectos', value: projects.length, icon: FolderKanban, color: 'text-blue-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-3 rounded border border-white/10 bg-white/[0.02] text-center">
              <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Sección 1: Campañas (paquetes) ──────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Campañas
            {packages.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5">{packages.length}</Badge>
            )}
          </h3>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={onCreatePackage} className="h-7 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Nueva campaña
            </Button>
          )}
        </div>

        {loadingPackages ? (
          <div className="space-y-2">
            <Skeleton className="h-24 rounded" />
            <Skeleton className="h-24 rounded" />
          </div>
        ) : packages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-white/10 rounded">
            Sin campañas registradas
          </p>
        ) : (
          <div className="space-y-2">
            {packages.map(pkg => {
              const pending = pkg.total_value - pkg.paid_amount;
              const delivered = assignedContent.filter(c => c.client_package_id === pkg.id && ['approved', 'paid'].includes(c.status)).length;
              const owed = pkg.content_quantity - delivered;
              return (
                <Card key={pkg.id} className="p-4 bg-card border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-xs font-mono text-muted-foreground">
                          #{String(pkg.campaign_number).padStart(4, '0')}
                        </span>
                        <span className="font-semibold text-sm truncate">{pkg.name}</span>
                        {(pkg as any).is_barter ? (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs gap-1">
                            <Handshake className="h-3 w-3" />
                            Canje
                          </Badge>
                        ) : (
                          <Badge className={`text-xs ${PAYMENT_STATUS_COLORS[pkg.payment_status as PaymentStatus]}`}>
                            {PAYMENT_STATUS_LABELS[pkg.payment_status as PaymentStatus]}
                          </Badge>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{pkg.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{pkg.content_quantity}</span> videos ·&nbsp;
                          <span className="font-medium text-foreground">{pkg.creators_count}</span> creators
                        </span>
                        {!(pkg as any).is_barter && (
                          <span className="text-green-400 font-medium">
                            {formatCurrency(pkg.total_value, (pkg as any).currency ?? 'COP')}
                          </span>
                        )}
                        {!(pkg as any).is_barter && pkg.payment_status !== 'paid' && pending > 0 && (
                          <span className="text-amber-400">
                            pendiente {formatCurrency(pending, (pkg as any).currency ?? 'COP')}
                          </span>
                        )}
                        {owed > 0 && pkg.payment_status === 'paid' && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <Video className="h-3 w-3" />
                            {owed} por entregar
                          </span>
                        )}
                        {pkg.payment_status === 'paid' && owed === 0 && (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Completa
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditPackage(pkg)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar campaña?</AlertDialogTitle>
                              <AlertDialogDescription>Esta acción eliminará "{pkg.name}" permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeletePackage(pkg.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Sección 2: Servicios Fillmaker ──────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4 text-violet-400" />
            Grabaciones Fillmaker
            {fillmakers.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5">{fillmakers.length}</Badge>
            )}
          </h3>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setFillmakerOpen(true)} className="h-7 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Nueva grabación
            </Button>
          )}
        </div>

        {loadingItems ? (
          <Skeleton className="h-16 rounded" />
        ) : fillmakers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-white/10 rounded">
            Sin grabaciones registradas
          </p>
        ) : (
          <div className="space-y-2">
            {fillmakersByMonth.map(([month, items], idx) => (
              <MonthSection key={month} month={month} count={items.length} defaultOpen={idx < 2}>
                {items.map(item => <ServiceItemRow key={item.id} item={item} />)}
              </MonthSection>
            ))}
          </div>
        )}
      </section>

      {/* ─── Sección 3: Proyectos sueltos ────────────── */}
      {(loadingItems || projects.length > 0) && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-blue-400" />
              Proyectos sueltos
              {projects.length > 0 && (
                <Badge variant="secondary" className="text-xs h-5">{projects.length}</Badge>
              )}
            </h3>
            <span className="text-xs text-muted-foreground">(sin paquete)</span>
          </div>

          {loadingItems ? (
            <Skeleton className="h-16 rounded" />
          ) : (
            <div className="space-y-2">
              {projectsByMonth.map(([month, items], idx) => (
                <MonthSection key={month} month={month} count={items.length} defaultOpen={idx < 2}>
                  {items.map(item => <ServiceItemRow key={item.id} item={item} />)}
                </MonthSection>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Dialog Fillmaker ─────────────────────────── */}
      <FillmakerDialog
        open={fillmakerOpen}
        onOpenChange={setFillmakerOpen}
        orgId={orgId}
        clientId={clientId}
      />
    </div>
  );
}
