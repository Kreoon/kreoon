import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign, Clock, CheckCircle, Loader2, ChevronDown, ChevronUp,
  FileText, AlertCircle, ExternalLink, Plus, Pencil, Trash2,
  Smartphone, Building2, Globe, Banknote, FolderOpen, Star, CreditCard,
  Zap, ArrowRight, ShieldCheck, Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  useContentFinancialSummary,
  useTalentPayments,
  useSignedReceiptUrl,
  useTalentFinanceRealtime,
  useMyContentByCierre,
  usePaymentAccounts,
  useCreatePaymentAccount,
  useUpdatePaymentAccount,
  useDeletePaymentAccount,
  useSetPrimaryAccount,
} from '@/hooks/useTalentPayments';
import type { ContentFinancialItem, ClosingContentGroup } from '@/hooks/useTalentPayments';
import type { TalentPayment, TalentPaymentAccount } from '@/types/talentPayments.types';
import { TalentReportsSection } from '@/components/talent/TalentReportsSection';
import { generatePaymentReceiptPDF } from '@/lib/talent-payment-receipt-pdf';
import type { PaymentReceiptContentItem } from '@/lib/talent-payment-receipt-pdf';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCOP(amount: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pendiente',        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  processing: { label: 'En transferencia', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  paid:       { label: 'Pagado',           className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  cancelled:  { label: 'Cancelado',        className: 'bg-muted text-muted-foreground' },
};

const CLOSING_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador',    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  sent:  { label: 'En proceso',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  paid:  { label: 'Pagado',      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  nequi:                      'Nequi',
  daviplata:                  'Daviplata',
  bancolombia:                'Bancolombia',
  otros_banco:                'Banco',
  paypal:                     'PayPal',
  transferencia_internacional: 'Transferencia bancaria',
  efectivo:                   'Efectivo',
};

// Emoji por tipo para la lista de cuentas guardadas
function getAccountEmoji(account: { account_type: string; bank_name?: string | null }): string {
  if (
    account.account_type === 'transferencia_internacional' &&
    (account.bank_name ?? '').toLowerCase().includes('arq')
  ) return '💳';
  const map: Record<string, string> = {
    transferencia_internacional: '🏦',
    paypal: '💙',
    nequi: '📱',
    daviplata: '📲',
    bancolombia: '🏦',
    otros_banco: '🏛️',
    efectivo: '💵',
  };
  return map[account.account_type] ?? '💳';
}

function getAccountDisplayLabel(account: { account_type: string; bank_name?: string | null; label?: string | null }): string {
  if (account.label) return account.label;
  if (
    account.account_type === 'transferencia_internacional' &&
    (account.bank_name ?? '').toLowerCase().includes('arq')
  ) return 'ARQ · Dolar App';
  if (account.bank_name && account.account_type === 'transferencia_internacional') return account.bank_name;
  return ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type;
}

// ─── Card de resumen ──────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  amount,
  count,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  amount: number;
  count: number;
  colorClass: string;
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${colorClass}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold">{formatCOP(amount)}</p>
      <p className="text-[11px] opacity-70">{count} proyecto{count !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ─── Hook: detalle de contenidos de un pago ───────────────────────────────────

interface PaymentContentItem {
  id: string;
  title: string | null;
  sequence_number: string | null;
  client_name: string | null;
  creator_id: string | null;
  editor_id: string | null;
  creator_payment: number | null;
  editor_payment: number | null;
}

function usePaymentContentItems(contentIds: string[] | null, userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['payment-content-items', contentIds, userId],
    staleTime: 60_000,
    enabled: enabled && !!contentIds && contentIds.length > 0,
    queryFn: async (): Promise<PaymentContentItem[]> => {
      const { data, error } = await supabase
        .from('content')
        .select('id, title, sequence_number, creator_id, editor_id, creator_payment, editor_payment, clients(name)')
        .in('id', contentIds!)
        .or(`creator_id.eq.${userId},editor_id.eq.${userId}`);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? null,
        sequence_number: (row as any).sequence_number ?? null,
        client_name: (row as any).clients?.name ?? null,
        creator_id: row.creator_id ?? null,
        editor_id: row.editor_id ?? null,
        creator_payment: (row as any).creator_payment != null ? Number((row as any).creator_payment) : null,
        editor_payment: (row as any).editor_payment != null ? Number((row as any).editor_payment) : null,
      }));
    },
  });
}

// ─── Fila de pago colapsible ──────────────────────────────────────────────────

function PaymentRow({ payment, userId, talentName, orgName }: {
  payment: TalentPayment;
  userId: string;
  talentName: string;
  orgName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(false);

  const hasItems = !!payment.content_ids && payment.content_ids.length > 0;
  const { data: contentItems = [], isLoading: loadingItems } = usePaymentContentItems(
    payment.content_ids,
    userId,
    expanded && hasItems || pendingDownload && hasItems,
  );
  const { data: receiptUrl, isLoading: loadingUrl } = useSignedReceiptUrl(showDialog ? payment.receipt_url : null);

  useEffect(() => {
    if (pendingDownload && !loadingItems) {
      const items: PaymentReceiptContentItem[] = contentItems.map((item) => {
        const isCreator = item.creator_id === userId;
        const amount = isCreator ? (item.creator_payment ?? 0) : (item.editor_payment ?? 0);
        return {
          content_id: item.id,
          title: item.title ?? 'Sin título',
          sequence_number: item.sequence_number,
          client_name: item.client_name,
          amount,
          currency: payment.currency ?? 'COP',
        };
      });
      generatePaymentReceiptPDF({ payment, contentItems: items, talentName, orgName });
      setPendingDownload(false);
    }
  }, [pendingDownload, loadingItems, contentItems]);

  function handleDownloadPdf(e: React.MouseEvent) {
    e.stopPropagation();
    if (!hasItems) {
      generatePaymentReceiptPDF({ payment, contentItems: [], talentName, orgName });
      return;
    }
    if (!loadingItems && (expanded || contentItems.length > 0)) {
      const items: PaymentReceiptContentItem[] = contentItems.map((item) => {
        const isCreator = item.creator_id === userId;
        const amount = isCreator ? (item.creator_payment ?? 0) : (item.editor_payment ?? 0);
        return {
          content_id: item.id,
          title: item.title ?? 'Sin título',
          sequence_number: item.sequence_number,
          client_name: item.client_name,
          amount,
          currency: payment.currency ?? 'COP',
        };
      });
      generatePaymentReceiptPDF({ payment, contentItems: items, talentName, orgName });
    } else {
      setPendingDownload(true);
    }
  }

  const badge = STATUS_BADGE[payment.status] ?? { label: payment.status, className: 'bg-muted text-muted-foreground' };

  return (
    <>
      {/* ── Cabecera del pago ── */}
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${hasItems ? 'cursor-pointer hover:bg-muted/30 transition-colors select-none' : ''}`}
        onClick={hasItems ? () => setExpanded((v) => !v) : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasItems && (
            <span className="text-muted-foreground shrink-0">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          )}
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium truncate">
              {payment.description ?? (hasItems ? `${payment.content_ids!.length} video${payment.content_ids!.length !== 1 ? 's' : ''}` : 'Pago')}
            </p>
            {payment.payment_date && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(payment.payment_date), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
            {badge.label}
          </span>
          {payment.receipt_url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Ver comprobante"
              onClick={(e) => { e.stopPropagation(); setShowDialog(true); }}
            >
              <FileText className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Descargar comprobante PDF"
            onClick={handleDownloadPdf}
            disabled={pendingDownload}
          >
            {pendingDownload ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          </Button>
          <span className="font-bold text-sm">{formatCOP(payment.amount)}</span>
        </div>
      </div>

      {/* ── Detalle expandido: items del pago ── */}
      {expanded && hasItems && (
        <div className="border-t border-border bg-muted/20 px-4 py-2">
          {loadingItems ? (
            <div className="flex items-center gap-2 py-2 text-muted-foreground text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando videos...
            </div>
          ) : contentItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No se encontraron detalles.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {contentItems.map((item) => {
                const isCreator = item.creator_id === userId;
                const myAmount = isCreator ? item.creator_payment : item.editor_payment;
                const role = isCreator ? 'Creador' : 'Editor';
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                        {item.sequence_number ?? '—'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-foreground">{item.title ?? 'Sin título'}</p>
                        {item.client_name && (
                          <p className="text-[10px] text-muted-foreground">{item.client_name} · {role}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold shrink-0 text-foreground">
                      {myAmount != null ? formatCOP(myAmount) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Dialog comprobante ── */}
      {payment.receipt_url && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Comprobante de pago</DialogTitle>
            </DialogHeader>
            <div className="mt-2 flex items-center justify-center min-h-40">
              {loadingUrl ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : receiptUrl ? (
                <img
                  src={receiptUrl}
                  alt="Comprobante"
                  className="max-w-full max-h-96 rounded-lg object-contain"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No se pudo cargar el comprobante.</p>
              )}
            </div>
            {receiptUrl && (
              <DialogFooter>
                <Button variant="outline" size="sm" asChild>
                  <a href={receiptUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" /> Abrir en nueva pestaña
                  </a>
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── Tabla de proyectos ───────────────────────────────────────────────────────

function ContentTable({
  items,
  title,
  colorClass,
}: {
  items: ContentFinancialItem[];
  title: string;
  colorClass?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <button
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={colorClass}>{title}</span>
        <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {expanded && (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {item.role === 'creator' ? 'Creador' : 'Editor'}
                  </Badge>
                  {item.sequence_number && (
                    <span className="font-mono text-muted-foreground shrink-0">{item.sequence_number}</span>
                  )}
                  <span className="truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-0.5">
                  {item.client_name && <span className="truncate">{item.client_name}</span>}
                  {item.client_name && item.approved_at && <span className="opacity-40">·</span>}
                  {item.approved_at && (
                    <span className="shrink-0">
                      Aprobado {format(new Date(item.approved_at), "d MMM yyyy", { locale: es })}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-semibold shrink-0 mt-0.5">{formatCOP(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Accordion de cierre ──────────────────────────────────────────────────────

function ClosingAccordionCard({ group }: { group: ClosingContentGroup }) {
  const [open, setOpen] = useState(false);
  const badge = CLOSING_STATUS_BADGE[group.closing.status] ?? CLOSING_STATUS_BADGE.draft;
  const dateToShow = group.closing.paid_at || group.closing.payment_date;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{group.closing.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dateToShow && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {format(new Date(dateToShow), "d MMM yyyy", { locale: es })}
            </span>
          )}
          <span className="font-bold text-sm">{formatCOP(group.myTotal, group.closing.currency)}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border bg-muted/10">
          {group.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {item.role === 'creator' ? 'Creador' : 'Editor'}
                </Badge>
                {item.sequence_number && (
                  <span className="font-mono text-muted-foreground shrink-0">{item.sequence_number}</span>
                )}
                <span className="truncate">{item.title ?? 'Sin título'}</span>
                {item.client_name && (
                  <span className="text-muted-foreground truncate hidden sm:block">— {item.client_name}</span>
                )}
              </div>
              <span className="font-semibold shrink-0">{formatCOP(item.myAmount, group.closing.currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recomendación ARQ ───────────────────────────────────────────────────────

const ARQ_REFERRAL_URL = 'https://www.arqfinance.com/referrals/general?referralCode=alexanderkast_Fmq';

function ArqRecommendationCard() {
  return (
    <a
      href={ARQ_REFERRAL_URL}
      target="_blank"
      rel="noreferrer noopener"
      className="block rounded-xl overflow-hidden border border-indigo-500/40 hover:border-indigo-400/70 transition-all duration-300 group shadow-lg hover:shadow-indigo-500/20"
    >
      {/* Imagen de fondo generada con IA */}
      <div
        className="relative p-4"
        style={{
          backgroundImage: 'url(/arq-banner.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
        }}
      >
        {/* Overlay oscuro para legibilidad del texto */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a081f]/95 via-[#0f0c29]/85 to-[#0f0c29]/60 pointer-events-none" />

        {/* Contenido (encima del overlay) */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold tracking-widest text-indigo-300 uppercase">ARQ · Dolar App</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-medium border border-indigo-400/40 backdrop-blur-sm">
                  Recomendado por Kreoon
                </span>
              </div>
              <p className="text-sm font-semibold text-white leading-tight">
                Recibe pagos globales sin comisiones
              </p>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                La herramienta de elección para finanzas globales
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-indigo-300 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Beneficios */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            {[
              { icon: Zap,         text: '$0 comisión',           sub: 'vs transferencia bancaria' },
              { icon: Globe,       text: 'Cambio sin fricción',    sub: 'USD → COP al instante'     },
              { icon: ShieldCheck, text: 'ARQ Card física gratis', sub: 'Con tu registro'           },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex items-start gap-2 bg-white/8 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                <Icon className="h-3.5 w-3.5 text-indigo-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-white leading-tight">{text}</p>
                  <p className="text-[10px] text-indigo-200/70 leading-tight">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-300 font-medium group-hover:text-white transition-colors">
              Obtener ARQ Card gratuita →
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

// ─── Gestor de métodos de cobro ───────────────────────────────────────────────

// Tarjetas visuales de selección de tipo (3 opciones)
// 'arq' es virtual: se guarda en DB como transferencia_internacional con bank_name = 'ARQ (Dolar App)'
const ACCOUNT_TYPE_CARDS = [
  { value: 'transferencia_internacional', emoji: '🏦', label: 'Transferencia bancaria', desc: 'Cualquier banco del mundo',    color: 'border-indigo-500 bg-indigo-500/10', selectedRing: 'ring-indigo-500' },
  { value: 'paypal',                      emoji: '💙', label: 'PayPal',                 desc: 'Con tu correo de PayPal',      color: 'border-sky-500 bg-sky-500/10',       selectedRing: 'ring-sky-500'    },
  { value: 'arq',                         emoji: '💳', label: 'ARQ · Dolar App',         desc: 'Sin comisión internacional',   color: 'border-violet-500 bg-violet-500/10', selectedRing: 'ring-violet-500' },
] as const;

type AccountTypeValue = typeof ACCOUNT_TYPE_CARDS[number]['value'];

// Qué campos mostrar y cómo, por tipo de cuenta
type FieldCfg = {
  numberLabel: string;
  numberPlaceholder: string;
  showNumber: boolean;
  showBank: boolean;
  showSwift: boolean;
  showRouting: boolean;
  showCountry: boolean;
  showAddress: boolean;
  showCity: boolean;
  showAccountSubtype: boolean;
  showDocument: boolean;
  showCurrency: boolean;
  showReference: boolean;
  bankLabel: string;
  bankPlaceholder: string;
};

const ACCOUNT_FIELD_CONFIG: Record<string, FieldCfg> = {
  // Transferencia bancaria a cualquier banco del mundo (incluye Colombia)
  transferencia_internacional: {
    numberLabel: '¿Cuál es tu número de cuenta o IBAN?', numberPlaceholder: 'Ej: DE89 3704... o 123-456789-12',
    showNumber: true, showBank: true, showSwift: true, showRouting: true,
    showCountry: true, showAddress: true, showCity: true,
    showAccountSubtype: true, showDocument: true, showCurrency: true, showReference: true,
    bankLabel: '¿En qué banco? (cualquier país)', bankPlaceholder: 'Ej: Bancolombia, Wise, Bank of America, BBVA...',
  },
  // PayPal
  paypal: {
    numberLabel: '¿Cuál es tu correo de PayPal?', numberPlaceholder: 'tu@correo.com',
    showNumber: true, showBank: false, showSwift: false, showRouting: false,
    showCountry: false, showAddress: false, showCity: false,
    showAccountSubtype: false, showDocument: false, showCurrency: true, showReference: false,
    bankLabel: '', bankPlaceholder: '',
  },
  // ARQ (Dolar App) — formulario simplificado, se guarda como transferencia_internacional
  arq: {
    numberLabel: '¿Cuál es tu correo o teléfono en ARQ?', numberPlaceholder: 'tu@correo.com o +57 300...',
    showNumber: true, showBank: false, showSwift: false, showRouting: false,
    showCountry: false, showAddress: false, showCity: false,
    showAccountSubtype: false, showDocument: false, showCurrency: false, showReference: false,
    bankLabel: '', bankPlaceholder: '',
  },
};

type AccountFormData = {
  account_type: string;
  account_holder: string;
  account_number: string;
  bank_name: string;
  label: string;
  // campos extra (se serializan en notes)
  country: string;
  swift_bic: string;
  routing_number: string;
  address: string;
  city: string;
  account_subtype: string;  // ahorros | corriente | checking | savings
  document_number: string;
  currency: string;
  reference_memo: string;
};

const EMPTY_FORM: AccountFormData = {
  account_type: 'transferencia_internacional',
  account_holder: '',
  account_number: '',
  bank_name: '',
  label: '',
  country: '',
  swift_bic: '',
  routing_number: '',
  address: '',
  city: '',
  account_subtype: '',
  document_number: '',
  currency: '',
  reference_memo: '',
};

// Serializa todos los campos extra en notes (key: value | key: value)
function buildNotes(f: AccountFormData): string | null {
  const pairs: [string, string][] = [
    ['País', f.country],
    ['SWIFT/BIC', f.swift_bic],
    ['Routing/ABA', f.routing_number],
    ['Dirección', f.address],
    ['Ciudad', f.city],
    ['Tipo cuenta', f.account_subtype],
    ['Documento', f.document_number],
    ['Moneda', f.currency],
    ['Referencia', f.reference_memo],
  ];
  const parts = pairs.filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v.trim()}`);
  return parts.length ? parts.join(' | ') : null;
}

function extractNote(notes: string | null, key: string): string {
  if (!notes) return '';
  return notes.match(new RegExp(`${key}:\\s*([^|]+)`))?.[1]?.trim() ?? '';
}

function parseNotes(notes: string | null): Omit<AccountFormData, 'account_type'|'account_holder'|'account_number'|'bank_name'|'label'> {
  return {
    country:        extractNote(notes, 'País'),
    swift_bic:      extractNote(notes, 'SWIFT/BIC'),
    routing_number: extractNote(notes, 'Routing/ABA'),
    address:        extractNote(notes, 'Dirección'),
    city:           extractNote(notes, 'Ciudad'),
    account_subtype:extractNote(notes, 'Tipo cuenta'),
    document_number:extractNote(notes, 'Documento'),
    currency:       extractNote(notes, 'Moneda'),
    reference_memo: extractNote(notes, 'Referencia'),
  };
}

function PaymentAccountsManager({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const { data: accounts = [], isLoading } = usePaymentAccounts(organizationId, userId);
  const createMutation = useCreatePaymentAccount(organizationId);
  const updateMutation = useUpdatePaymentAccount(organizationId);
  const deleteMutation = useDeletePaymentAccount(organizationId);
  const setPrimaryMutation = useSetPrimaryAccount(organizationId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TalentPaymentAccount | null>(null);
  const [step, setStep] = useState<0 | 1>(0); // 0 = elegir tipo, 1 = llenar datos
  const [form, setForm] = useState<AccountFormData>(EMPTY_FORM);

  const fieldCfg = ACCOUNT_FIELD_CONFIG[form.account_type] ?? ACCOUNT_FIELD_CONFIG.otros_banco;
  const selectedCard = ACCOUNT_TYPE_CARDS.find((c) => c.value === form.account_type);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setStep(0);
    setDialogOpen(true);
  }

  // Detecta si una cuenta guardada en DB es ARQ
  function isArqAccount(account: TalentPaymentAccount): boolean {
    return (
      account.account_type === 'transferencia_internacional' &&
      (account.bank_name ?? '').toLowerCase().includes('arq')
    );
  }

  function openEdit(account: TalentPaymentAccount) {
    setEditing(account);
    const extra = parseNotes((account as any).notes ?? null);
    // Si es ARQ, mostramos el tipo visual 'arq' en lugar de 'transferencia_internacional'
    const visualType = isArqAccount(account) ? 'arq' : account.account_type;
    setForm({
      account_type: visualType,
      account_holder: account.account_holder ?? '',
      // Para ARQ, bank_name está pre-fijo → no lo mostramos en el campo editable
      account_number: account.account_number ?? '',
      bank_name: isArqAccount(account) ? '' : (account.bank_name ?? ''),
      label: account.label ?? '',
      ...extra,
    });
    setStep(1);
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      // ARQ es virtual → guardar como transferencia_internacional con bank_name pre-fijo
      const dbType: TalentPaymentAccount['account_type'] =
        form.account_type === 'arq' ? 'transferencia_internacional' : form.account_type as TalentPaymentAccount['account_type'];
      const dbBankName =
        form.account_type === 'arq' ? 'ARQ (Dolar App)' :
        fieldCfg.showBank ? (form.bank_name || null) : null;

      const common = {
        account_type: dbType,
        account_holder: form.account_holder || null,
        account_number: fieldCfg.showNumber ? (form.account_number || null) : null,
        bank_name: dbBankName,
        label: form.label || null,
        notes: buildNotes(form),
      };
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, userId, ...common });
      } else {
        await createMutation.mutateAsync({
          user_id: userId,
          is_primary: accounts.length === 0,
          document_id: null,
          ...common,
        });
      }
      setDialogOpen(false);
    } catch {
      // Error handled by the hook's onError toast
    }
  }

  function handleDelete(account: TalentPaymentAccount) {
    if (!window.confirm('¿Eliminar este método de cobro?')) return;
    deleteMutation.mutate({ id: account.id, userId });
  }

  function handleSetPrimary(account: TalentPaymentAccount) {
    setPrimaryMutation.mutate({ accountId: account.id, userId });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Métodos de Cobro</span>
        </div>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <Plus className="h-3 w-3 mr-1" /> Agregar
        </Button>
      </div>

      <ArqRecommendationCard />

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-muted-foreground justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Cargando métodos...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 flex flex-col items-center gap-3 text-muted-foreground">
          <span className="text-4xl">💳</span>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Aún no tienes cuentas registradas</p>
            <p className="text-xs mt-0.5">Agrega dónde quieres recibir tus pagos</p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-3 w-3 mr-1" /> Agregar mi primera cuenta
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {accounts.map((account) => {
            const parsedNotes = parseNotes((account as any).notes ?? null);
            const emoji = getAccountEmoji(account);
            const displayLabel = getAccountDisplayLabel(account);
            return (
              <div key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border border-border bg-muted/40">
                    {emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{displayLabel}</span>
                      {account.is_primary && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Star className="h-2.5 w-2.5" /> Principal
                        </Badge>
                      )}
                    </div>
                    {account.account_holder && (
                      <p className="text-xs text-muted-foreground truncate">{account.account_holder}</p>
                    )}
                    {account.bank_name && (
                      <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                    )}
                    {account.account_number && (
                      <p className="text-xs font-mono text-muted-foreground">{account.account_number}</p>
                    )}
                    {parsedNotes.country && (
                      <p className="text-xs text-muted-foreground">
                        {parsedNotes.country}{parsedNotes.swift_bic ? ` · SWIFT: ${parsedNotes.swift_bic}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!account.is_primary && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Hacer principal"
                      disabled={setPrimaryMutation.isPending} onClick={() => handleSetPrimary(account)}>
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(account)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Eliminar" disabled={deleteMutation.isPending} onClick={() => handleDelete(account)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Diálogo wizard ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">

          {/* Ilustración + header */}
          <div className="relative h-28 overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
            <img
              src="/wallet-illustration.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div>
                <p className="text-[10px] text-indigo-300 font-medium uppercase tracking-widest mb-0.5">
                  {editing ? 'Editando cuenta' : step === 0 ? 'Paso 1 de 2' : 'Paso 2 de 2'}
                </p>
                <h2 className="text-base font-bold text-white leading-tight">
                  {editing
                    ? '✏️ ¿Qué quieres cambiar?'
                    : step === 0
                      ? '👋 ¿Dónde quieres recibir tu plata?'
                      : `${selectedCard?.emoji ?? '💳'} ¡Cuéntanos más!`}
                </h2>
              </div>
              {/* Dots de progreso */}
              {!editing && (
                <div className="flex gap-1.5 pb-0.5">
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors ${step === 0 ? 'bg-white' : 'bg-white/40'}`} />
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors ${step === 1 ? 'bg-white' : 'bg-white/40'}`} />
                </div>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">

            {/* ── PASO 0: Elegir tipo (tarjetas visuales) ── */}
            {step === 0 && (
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPE_CARDS.map((card) => {
                  const isSelected = form.account_type === card.value;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => setForm((_f) => ({ ...EMPTY_FORM, account_type: card.value }))}
                      className={`
                        relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center
                        transition-all duration-150 cursor-pointer
                        ${isSelected
                          ? `${card.color} ring-2 ${card.selectedRing} ring-offset-1 ring-offset-background`
                          : 'border-border bg-muted/30 hover:bg-muted/60'}
                      `}
                    >
                      <span className="text-2xl">{card.emoji}</span>
                      <span className={`text-xs font-semibold leading-tight ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                        {card.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{card.desc}</span>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── PASO 1: Formulario ── */}
            {(step === 1 || editing) && (
              <div className="space-y-5">

                {/* Aviso comisión */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-lg shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <p className="text-xs font-bold text-amber-300 mb-1">Ojo con las comisiones 💸</p>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed mb-2">
                        Nuestros pagos salen desde un banco en <strong>EE.UU.</strong> Las transferencias bancarias tradicionales cobran hasta <strong>$15 USD</strong>. Con <strong>ARQ (Dolar App)</strong> recibes todo — <strong>$0 comisión</strong>.
                      </p>
                      <a href={ARQ_REFERRAL_URL} target="_blank" rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 transition-colors underline underline-offset-2">
                        <ExternalLink className="h-3 w-3" /> Obtener ARQ Card gratis →
                      </a>
                    </div>
                  </div>
                </div>

                {/* ── Sección: Titular ── */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">👤 Sobre ti</p>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Nombre completo del titular</Label>
                    <Input className="h-10" placeholder="Como aparece en tu documento"
                      value={form.account_holder}
                      onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))} />
                  </div>

                  {fieldCfg.showDocument && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Número de documento <span className="text-muted-foreground font-normal text-xs">(cédula / pasaporte)</span>
                      </Label>
                      <Input className="h-10" placeholder="Ej: 1012345678"
                        value={form.document_number}
                        onChange={(e) => setForm((f) => ({ ...f, document_number: e.target.value }))} />
                    </div>
                  )}

                  {fieldCfg.showAddress && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Dirección <span className="text-muted-foreground font-normal text-xs">(requerida por algunos bancos)</span>
                      </Label>
                      <Input className="h-10" placeholder="Ej: 123 Main St, Apt 4B"
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                    </div>
                  )}

                  {fieldCfg.showCity && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Ciudad / Estado / Código postal</Label>
                      <Input className="h-10" placeholder="Ej: Miami, FL 33101"
                        value={form.city}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                    </div>
                  )}

                  {fieldCfg.showCountry && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">País</Label>
                      <Input className="h-10" placeholder="Ej: Estados Unidos, Colombia, México..."
                        value={form.country}
                        onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                    </div>
                  )}
                </div>

                {/* ── Sección: Cuenta bancaria ── */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">🏦 Tu cuenta</p>

                  {fieldCfg.showBank && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">{fieldCfg.bankLabel}</Label>
                      <Input className="h-10" placeholder={fieldCfg.bankPlaceholder}
                        value={form.bank_name}
                        onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} />
                    </div>
                  )}

                  {fieldCfg.showAccountSubtype && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Tipo de cuenta</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Ahorros', 'Corriente', 'Checking', 'Savings'] as const).map((t) => (
                          <button key={t} type="button"
                            onClick={() => setForm((f) => ({ ...f, account_subtype: f.account_subtype === t ? '' : t }))}
                            className={`h-9 rounded-lg border text-sm font-medium transition-colors
                              ${form.account_subtype === t
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {fieldCfg.showNumber && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">{fieldCfg.numberLabel}</Label>
                      <Input className="h-10" placeholder={fieldCfg.numberPlaceholder}
                        value={form.account_number}
                        onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))} />
                    </div>
                  )}

                  {fieldCfg.showSwift && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Código SWIFT / BIC <span className="text-muted-foreground font-normal text-xs">(del banco receptor)</span>
                      </Label>
                      <Input className="h-10 font-mono tracking-widest" placeholder="Ej: CHASUS33"
                        value={form.swift_bic}
                        onChange={(e) => setForm((f) => ({ ...f, swift_bic: e.target.value.toUpperCase() }))} />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        🔍 Código de 8–11 letras que identifica a tu banco internacionalmente. Lo encuentras en tu app bancaria, en el estado de cuenta o preguntándole al banco.
                      </p>
                    </div>
                  )}

                  {fieldCfg.showRouting && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Número de Routing / ABA <span className="text-muted-foreground font-normal text-xs">(solo bancos en EE.UU.)</span>
                      </Label>
                      <Input className="h-10 font-mono" placeholder="Ej: 021000021"
                        value={form.routing_number}
                        onChange={(e) => setForm((f) => ({ ...f, routing_number: e.target.value }))} />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        🔍 Son 9 dígitos. Lo encuentras en los cheques de tu banco o en la app, en la sección de "datos para transferencias".
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Sección: Extras ── */}
                {(fieldCfg.showCurrency || fieldCfg.showReference) && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">✨ Preferencias</p>

                    {fieldCfg.showCurrency && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">¿En qué moneda quieres recibir?</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['USD', 'COP', 'EUR', 'MXN'] as const).map((c) => (
                            <button key={c} type="button"
                              onClick={() => setForm((f) => ({ ...f, currency: f.currency === c ? '' : c }))}
                              className={`h-9 rounded-lg border text-sm font-bold transition-colors
                                ${form.currency === c
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'}`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {fieldCfg.showReference && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Referencia o memo <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                        </Label>
                        <Input className="h-10" placeholder="Ej: Tu nombre o un código identificador"
                          value={form.reference_memo}
                          onChange={(e) => setForm((f) => ({ ...f, reference_memo: e.target.value }))} />
                        <p className="text-[10px] text-muted-foreground">
                          Algunos bancos lo necesitan para identificar a quién va el pago.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Apodo */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    🏷️ ¿Cómo quieres llamarla? <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </Label>
                  <Input className="h-10" placeholder='Ej: "Mi Nequi principal" o "Cuenta Wise USD"'
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* Footer navegación */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/20">
            {step === 0 && !editing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => setStep(1)}>
                  Continuar → {selectedCard?.emoji}
                </Button>
              </>
            ) : (
              <>
                {!editing && (
                  <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                    ← Cambiar tipo
                  </Button>
                )}
                {editing && (
                  <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  {editing ? '💾 Guardar cambios' : '✅ ¡Listo, agregar!'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Vista principal

type WalletTab = 'resumen' | 'reportes' | 'cuentas';

interface TalentWalletViewProps {
  userId: string;
  organizationId: string;
  talentName?: string;
}

export function TalentWalletView({ userId, organizationId, talentName = 'Mi reporte' }: TalentWalletViewProps) {
  const [activeTab, setActiveTab] = useState<WalletTab>('resumen');

  const { data: summary, isLoading: loadingSummary } = useContentFinancialSummary(organizationId, userId);
  const { data: payments = [], isLoading: loadingPayments } = useTalentPayments(organizationId, userId);
  const { data: groups = [], isLoading: loadingGroups } = useMyContentByCierre(organizationId, userId);

  useTalentFinanceRealtime(organizationId, userId);

  const isLoading = loadingSummary || loadingPayments || loadingGroups;

  const TABS: { key: WalletTab; label: string }[] = [
    { key: 'resumen',  label: 'Resumen'  },
    { key: 'reportes', label: 'Reportes' },
    { key: 'cuentas',  label: 'Cuentas'  },
  ];

  return (
    <div className="space-y-6">

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {activeTab === 'resumen' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando finanzas...</span>
            </div>
          ) : (
            (() => {
              const s = summary ?? {
                total_en_proceso: 0, total_pendiente: 0, total_pagado: 0,
                count_en_proceso: 0, count_pendiente: 0, count_pagado: 0,
                items_pagado: [], items_pendiente: [], items_en_proceso: [],
              };
              return (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <SummaryCard
                      icon={CheckCircle}
                      label="Total cobrado"
                      amount={s.total_pagado}
                      count={s.count_pagado}
                      colorClass="border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10"
                    />
                    <SummaryCard
                      icon={DollarSign}
                      label="Por cobrar"
                      amount={s.total_pendiente}
                      count={s.count_pendiente}
                      colorClass="border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10"
                    />
                    <SummaryCard
                      icon={Clock}
                      label="En proceso"
                      amount={s.total_en_proceso}
                      count={s.count_en_proceso}
                      colorClass="border-border text-muted-foreground bg-muted/30"
                    />
                  </div>

                  {/* Mis Pagos Recibidos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Mis Pagos Recibidos</span>
                      {payments.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">{payments.length}</Badge>
                      )}
                    </div>
                    {payments.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border py-6 flex flex-col items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-8 w-8 opacity-40" />
                        <p className="text-xs">Sin pagos registrados aun</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                        {payments.map((payment) => (
                          <PaymentRow key={payment.id} payment={payment} userId={userId} talentName={talentName} orgName="Kreoon" />
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Por Cierre */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Por Cierre</span>
                      {groups.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">{groups.length}</Badge>
                      )}
                    </div>
                    {groups.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border py-6 flex flex-col items-center gap-2 text-muted-foreground">
                        <FolderOpen className="h-8 w-8 opacity-40" />
                        <p className="text-xs">Sin cierres registrados aun</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groups.map((group) => (
                          <ClosingAccordionCard key={group.closingId} group={group} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pendiente de Cobro */}
                  {s.total_pendiente > 0 && (
                    <>
                      <Separator />
                      <div className="rounded-lg border border-yellow-300/40 bg-yellow-50/50 dark:bg-yellow-900/5 p-3 space-y-3">
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">
                            Tienes {formatCOP(s.total_pendiente)} aprobados pendientes de pago
                          </span>
                        </div>
                        <ContentTable
                          items={s.items_pendiente}
                          title="Proyectos aprobados"
                          colorClass="text-yellow-600 dark:text-yellow-400"
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })()
          )}
        </>
      )}

      {/* Tab: Reportes */}
      {activeTab === 'reportes' && (
        <TalentReportsSection
          organizationId={organizationId}
          userId={userId}
          talentName={talentName}
        />
      )}

      {/* Tab: Cuentas */}
      {activeTab === 'cuentas' && (
        <PaymentAccountsManager organizationId={organizationId} userId={userId} />
      )}

    </div>
  );
}
