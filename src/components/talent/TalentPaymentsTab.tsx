import { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle, Clock, Loader2, CreditCard, Plus, Trash2, Edit2,
  Star, Upload, FileText, Eye, ChevronDown, ChevronUp,
  X, Check, Briefcase, Search, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import {
  usePaymentAccounts,
  useCreatePaymentAccount,
  useUpdatePaymentAccount,
  useDeletePaymentAccount,
  useSetPrimaryAccount,
  useTalentPayments,
  useContentFinancialSummary,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useUploadReceipt,
  usePendingContentForUser,
  useSignedReceiptUrl,
  useTalentFinanceRealtime,
} from '@/hooks/useTalentPayments';
import type {
  TalentPaymentAccount,
  TalentPayment,
  PaymentAccountType,
  PaymentStatus,
} from '@/types/talentPayments.types';
import { PAYMENT_ACCOUNT_LABELS, PAYMENT_STATUS_LABELS } from '@/types/talentPayments.types';
import type { PendingContentItem, ContentFinancialItem } from '@/hooks/useTalentPayments';

interface Props {
  userId: string;
  organizationId: string;
  memberName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const ACCOUNT_TYPE_COLORS: Record<PaymentAccountType, string> = {
  nequi: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  daviplata: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  bancolombia: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  otros_banco: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paypal: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  transferencia_internacional: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  efectivo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

// ─── PaymentRow — muestra proyectos vinculados ────────────────────────────────

function PaymentRow({
  payment,
  accounts,
  contentMap,
  onStatusChange,
  onDelete,
  onConfirmPaid,
}: {
  payment: TalentPayment;
  accounts: TalentPaymentAccount[];
  contentMap: Map<string, PendingContentItem>;
  onStatusChange: (id: string, status: PaymentStatus) => void;
  onDelete: (id: string) => void;
  onConfirmPaid: (paymentId: string, paymentUserId: string) => void;
}) {
  const { data: receiptUrl } = useSignedReceiptUrl(payment.receipt_url);
  const account = accounts.find((a) => a.id === payment.payment_account_id);
  const [showProjects, setShowProjects] = useState(false);
  const linkedProjects = (payment.content_ids ?? [])
    .map((id) => contentMap.get(id))
    .filter(Boolean) as PendingContentItem[];

  return (
    <div className="rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{formatCurrency(payment.amount, payment.currency)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[payment.status]}`}>
              {PAYMENT_STATUS_LABELS[payment.status]}
            </span>
            {account && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${ACCOUNT_TYPE_COLORS[account.account_type]}`}>
                {account.label ?? PAYMENT_ACCOUNT_LABELS[account.account_type]}
              </span>
            )}
            {payment.receipt_url && !receiptUrl && (
              <span className="text-[10px] text-muted-foreground">Cargando comprobante...</span>
            )}
            {linkedProjects.length > 0 && (
              <button
                onClick={() => setShowProjects((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Briefcase className="h-3 w-3" />
                {linkedProjects.length} proyecto{linkedProjects.length > 1 ? 's' : ''}
                {showProjects ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>
          {payment.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{payment.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {payment.payment_date
              ? format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es })
              : format(new Date(payment.created_at), 'dd MMM yyyy', { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {receiptUrl && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={receiptUrl} target="_blank" rel="noopener noreferrer" title="Ver comprobante">
                <Eye className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(['pending', 'processing', 'cancelled'] as PaymentStatus[])
                .filter((s) => s !== payment.status)
                .map((s) => (
                  <DropdownMenuItem key={s} onClick={() => onStatusChange(payment.id, s)}>
                    Marcar como {PAYMENT_STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              {payment.status !== 'paid' && (
                <DropdownMenuItem
                  onClick={() => onConfirmPaid(payment.id, payment.user_id)}
                  className="text-green-600 dark:text-green-400 font-medium"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-2" />
                  Confirmar pago + comprobante
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(payment.id)}>
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Proyectos vinculados expandibles */}
      {showProjects && linkedProjects.length > 0 && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1.5">Proyectos cubiertos</p>
          {linkedProjects.map((proj) => (
            <div key={proj.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {proj.role === 'creator' ? 'Creador' : 'Editor'}
                </Badge>
                {proj.sequence_number && (
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{proj.sequence_number}</span>
                )}
                <span className="truncate">{proj.title}</span>
              </div>
              <span className="font-medium shrink-0 ml-2">{formatCurrency(proj.payment_amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Form de cuenta ───────────────────────────────────────────────────────────

interface AccountFormState {
  account_type: PaymentAccountType;
  label: string;
  account_number: string;
  bank_name: string;
  account_holder: string;
  document_id: string;
  notes: string;
  is_primary: boolean;
}

const EMPTY_ACCOUNT_FORM: AccountFormState = {
  account_type: 'nequi',
  label: '',
  account_number: '',
  bank_name: '',
  account_holder: '',
  document_id: '',
  notes: '',
  is_primary: false,
};

function AccountForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<AccountFormState>;
  onSave: (data: AccountFormState) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<AccountFormState>({ ...EMPTY_ACCOUNT_FORM, ...initial });
  const set = (k: keyof AccountFormState, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const needsBank = ['bancolombia', 'otros_banco', 'transferencia_internacional'].includes(form.account_type);

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tipo de cuenta *</Label>
          <Select value={form.account_type} onValueChange={(v) => set('account_type', v as PaymentAccountType)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_ACCOUNT_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Alias (opcional)</Label>
          <Input className="h-8 text-xs" placeholder="Ej: Nequi personal" value={form.label} onChange={(e) => set('label', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">
            {form.account_type === 'nequi' || form.account_type === 'daviplata' ? 'Número de celular'
              : form.account_type === 'paypal' ? 'Email PayPal'
              : form.account_type === 'efectivo' ? 'Referencia' : 'Número de cuenta'}
          </Label>
          <Input className="h-8 text-xs" value={form.account_number} onChange={(e) => set('account_number', e.target.value)} />
        </div>
        {needsBank && (
          <div className="space-y-1">
            <Label className="text-xs">Banco</Label>
            <Input className="h-8 text-xs" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Titular</Label>
          <Input className="h-8 text-xs" value={form.account_holder} onChange={(e) => set('account_holder', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cédula / Documento</Label>
          <Input className="h-8 text-xs" value={form.document_id} onChange={(e) => set('document_id', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notas</Label>
        <Textarea className="text-xs min-h-[56px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="is_primary" checked={form.is_primary} onCheckedChange={(v) => set('is_primary', !!v)} />
        <Label htmlFor="is_primary" className="text-xs cursor-pointer">Marcar como cuenta principal</Label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}

// ─── Selector de proyectos (dentro del form de pago) ─────────────────────────

function ProjectSelector({
  pendingContent,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  pendingContent: PendingContentItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: (all: boolean) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => pendingContent.filter((c) =>
      !search || c.title.toLowerCase().includes(search.toLowerCase())
    ),
    [pendingContent, search],
  );

  const selectableFiltered = filtered.filter((c) => !c.already_linked);
  const allSelected = selectableFiltered.length > 0 && selectableFiltered.every((c) => selectedIds.includes(c.id));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">
          Proyectos vinculados
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[10px]">{selectedIds.length} seleccionado{selectedIds.length > 1 ? 's' : ''}</Badge>
          )}
        </Label>
        {selectableFiltered.length > 1 && (
          <button
            className="text-[10px] text-primary hover:underline"
            onClick={() => onToggleAll(!allSelected)}
          >
            {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        )}
      </div>

      {pendingContent.length === 0 ? (
        <p className="text-xs text-muted-foreground border border-dashed rounded-lg p-3 text-center">
          Sin proyectos pendientes de pago
        </p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {pendingContent.length > 4 && (
            <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-muted/30">
              <Search className="h-3 w-3 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                placeholder="Buscar proyecto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="max-h-[220px] overflow-y-auto divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Sin resultados</p>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isLinked = item.already_linked;
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                      isLinked
                        ? 'opacity-50 cursor-not-allowed bg-muted/10'
                        : isSelected
                          ? 'bg-primary/5 cursor-pointer'
                          : 'hover:bg-muted/30 cursor-pointer'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isLinked}
                      onCheckedChange={() => !isLinked && onToggle(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.sequence_number && (
                          <span className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded text-muted-foreground shrink-0">
                            {item.sequence_number}
                          </span>
                        )}
                        <p className="text-xs font-medium truncate">{item.title}</p>
                        {isLinked && (
                          <Badge variant="outline" className="text-[9px] shrink-0 border-orange-400 text-orange-500">
                            En pago
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {item.role === 'creator' ? 'Como creador' : 'Como editor'}
                        {item.delivered_at && ` · Entregado ${format(new Date(item.delivered_at), 'dd MMM', { locale: es })}`}
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0 text-green-600 dark:text-green-400">
                      {formatCurrency(item.payment_amount)}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-t border-border text-xs">
              <span className="text-muted-foreground">Subtotal proyectos</span>
              <span className="font-bold">
                {formatCurrency(
                  pendingContent
                    .filter((c) => selectedIds.includes(c.id))
                    .reduce((sum, c) => sum + c.payment_amount, 0)
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Popup de detalle financiero ─────────────────────────────────────────────

const ROLE_LABELS = { creator: 'Creador', editor: 'Editor', both: 'Creador + Editor' };

const CARD_META = {
  pagado:     { label: 'Pagado',     color: 'text-green-600 dark:text-green-400' },
  pendiente:  { label: 'Pendiente',  color: 'text-yellow-600 dark:text-yellow-400' },
  en_proceso: { label: 'En proceso', color: 'text-blue-600 dark:text-blue-400' },
} as const;

function FinancialDetailDialog({
  open,
  onClose,
  card,
  items,
}: {
  open: boolean;
  onClose: () => void;
  card: 'pagado' | 'pendiente' | 'en_proceso';
  items: ContentFinancialItem[];
}) {
  const meta = CARD_META[card];
  const total = items.reduce((s, i) => s + i.amount, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Proyectos — {meta.label}</span>
            <span className={`text-base font-bold ${meta.color}`}>{formatCurrency(total)}</span>
          </DialogTitle>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin proyectos</p>
        ) : (
          <div className="overflow-y-auto divide-y divide-border -mx-6 px-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {item.sequence_number && (
                      <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded shrink-0 text-muted-foreground">
                        {item.sequence_number}
                      </span>
                    )}
                    <p className="text-sm font-medium truncate">{item.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[item.role]}</p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${meta.color}`}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportPaymentsToCSV(
  paymentsToExport: TalentPayment[],
  accountsData: TalentPaymentAccount[],
  name: string,
) {
  const accountMap = new Map(accountsData.map((a) => [a.id, a]));
  const headers = ['Fecha', 'Descripción', 'Estado', 'Monto', 'Moneda', 'Cuenta destino', '# Proyectos', 'Notas'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = paymentsToExport.map((p) => {
    const acc = p.payment_account_id ? accountMap.get(p.payment_account_id) : null;
    return [
      p.payment_date
        ? format(new Date(p.payment_date), 'yyyy-MM-dd')
        : format(new Date(p.created_at), 'yyyy-MM-dd'),
      p.description ?? '',
      PAYMENT_STATUS_LABELS[p.status],
      p.amount,
      p.currency,
      acc ? (acc.label ?? PAYMENT_ACCOUNT_LABELS[acc.account_type]) : '',
      (p.content_ids ?? []).length,
      p.notes ?? '',
    ].map(escape).join(',');
  });
  const csv = '﻿' + [headers.map(escape).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_')}_pagos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TalentPaymentsTab({ userId, organizationId, memberName }: Props) {
  const { isAdmin } = useAuth();

  useTalentFinanceRealtime(organizationId, userId);

  // Data
  const { data: accounts = [], isLoading: loadingAccounts } = usePaymentAccounts(organizationId, userId);
  const { data: payments = [], isLoading: loadingPayments } = useTalentPayments(organizationId, userId);
  const { data: financialSummary, isLoading: summaryLoading } = useContentFinancialSummary(organizationId, userId);
  const { data: pendingContent = [] } = usePendingContentForUser(organizationId, userId);

  // Mapa de ID → item para lookup rápido en PaymentRow
  const contentMap = useMemo(
    () => new Map(pendingContent.map((c) => [c.id, c])),
    [pendingContent],
  );

  // Mutations
  const createAccount = useCreatePaymentAccount(organizationId);
  const updateAccount = useUpdatePaymentAccount(organizationId);
  const deleteAccount = useDeletePaymentAccount(organizationId);
  const setPrimary = useSetPrimaryAccount(organizationId);
  const createPayment = useCreatePayment(organizationId);
  const updatePayment = useUpdatePayment(organizationId);
  const deletePayment = useDeletePayment(organizationId);
  const uploadReceipt = useUploadReceipt(organizationId);

  // UI state
  const [activeCard, setActiveCard] = useState<'pagado' | 'pendiente' | 'en_proceso' | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TalentPaymentAccount | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [paymentPage, setPaymentPage] = useState(0);

  // Estado del dialog "Confirmar pago con comprobante"
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; payUserId: string } | null>(null);
  const [confirmReceipt, setConfirmReceipt] = useState<File | null>(null);
  const [confirmDate, setConfirmDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const confirmFileRef = useRef<HTMLInputElement>(null);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [amountManuallySet, setAmountManuallySet] = useState(false);
  const [payCurrency, setPayCurrency] = useState('COP');
  const [payAccountId, setPayAccountId] = useState('');
  const [payStatus, setPayStatus] = useState<PaymentStatus>('pending');
  const [payDesc, setPayDesc] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payReceipt, setPayReceipt] = useState<File | null>(null);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calcular monto al seleccionar proyectos (si no fue editado manualmente)
  function handleToggleProject(contentId: string) {
    const next = selectedContent.includes(contentId)
      ? selectedContent.filter((id) => id !== contentId)
      : [...selectedContent, contentId];
    setSelectedContent(next);
    if (!amountManuallySet) {
      const total = pendingContent
        .filter((c) => next.includes(c.id))
        .reduce((sum, c) => sum + c.payment_amount, 0);
      setPayAmount(total > 0 ? String(total) : '');
    }
  }

  function handleToggleAllProjects(all: boolean) {
    const next = all ? pendingContent.filter((c) => !c.already_linked).map((c) => c.id) : [];
    setSelectedContent(next);
    if (!amountManuallySet) {
      const total = pendingContent.filter((c) => next.includes(c.id)).reduce((sum, c) => sum + c.payment_amount, 0);
      setPayAmount(total > 0 ? String(total) : '');
    }
  }

  // Paginación de pagos
  const filteredPayments = statusFilter === 'all' ? payments : payments.filter((p) => p.status === statusFilter);
  const PAGE_SIZE = 10;
  const paginatedPayments = filteredPayments.slice(paymentPage * PAGE_SIZE, (paymentPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE);

  async function handleSaveAccount(data: AccountFormState) {
    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, userId, ...data });
      setEditingAccount(null);
    } else {
      await createAccount.mutateAsync({ user_id: userId, ...data });
      setShowAddAccount(false);
    }
  }

  function resetPaymentForm() {
    setPayAmount('');
    setAmountManuallySet(false);
    setPayDesc('');
    setPayNotes('');
    setPayDate('');
    setPayAccountId('');
    setPayReceipt(null);
    setSelectedContent([]);
    setShowPaymentForm(false);
  }

  async function handleRegisterPayment() {
    const amount = parseFloat(payAmount.replace(/[^0-9.]/g, ''));
    if (!amount || amount <= 0) return;

    let receipt_url: string | null = null;
    if (payReceipt) {
      const result = await uploadReceipt.mutateAsync({ file: payReceipt, userId });
      receipt_url = result.path;
    }

    await createPayment.mutateAsync({
      user_id: userId,
      amount,
      currency: payCurrency,
      status: payStatus,
      description: payDesc || null,
      notes: payNotes || null,
      payment_account_id: payAccountId || null,
      payment_date: payDate ? new Date(payDate).toISOString() : null,
      receipt_url,
      content_ids: selectedContent.length > 0 ? selectedContent : null,
      created_by: null,
    });

    resetPaymentForm();
  }

  function handleStatusChange(paymentId: string, newStatus: PaymentStatus) {
    updatePayment.mutate({
      id: paymentId,
      userId,
      status: newStatus,
    });
  }

  function openConfirmPaid(paymentId: string, paymentUserId: string) {
    setConfirmTarget({ id: paymentId, payUserId: paymentUserId });
    setConfirmDate(format(new Date(), 'yyyy-MM-dd'));
    setConfirmReceipt(null);
  }

  async function handleConfirmPaid() {
    if (!confirmTarget || !confirmReceipt) return;
    const { path } = await uploadReceipt.mutateAsync({ file: confirmReceipt, userId: confirmTarget.payUserId });
    await updatePayment.mutateAsync({
      id: confirmTarget.id,
      userId: confirmTarget.payUserId,
      status: 'paid' as PaymentStatus,
      receipt_url: path,
      payment_date: new Date(confirmDate).toISOString(),
    });
    setConfirmTarget(null);
    setConfirmReceipt(null);
  }

  return (
    <div className="space-y-5 pb-4">

      {/* ── Resumen ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              {
                key: 'pagado' as const,
                label: 'Pagado',
                icon: <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />,
                total: financialSummary?.total_pagado ?? 0,
                count: financialSummary?.count_pagado ?? 0,
                color: 'text-green-600 dark:text-green-400',
                activeBorder: 'border-green-500/50 bg-green-500/5',
              },
              {
                key: 'pendiente' as const,
                label: 'Pendiente',
                icon: <Clock className="h-4 w-4 text-yellow-500 mx-auto mb-1" />,
                total: financialSummary?.total_pendiente ?? 0,
                count: financialSummary?.count_pendiente ?? 0,
                color: 'text-yellow-600 dark:text-yellow-400',
                activeBorder: 'border-yellow-500/50 bg-yellow-500/5',
              },
              {
                key: 'en_proceso' as const,
                label: 'En proceso',
                icon: <Loader2 className="h-4 w-4 text-blue-500 mx-auto mb-1" />,
                total: financialSummary?.total_en_proceso ?? 0,
                count: financialSummary?.count_en_proceso ?? 0,
                color: 'text-blue-600 dark:text-blue-400',
                activeBorder: 'border-blue-500/50 bg-blue-500/5',
              },
            ] as const
          ).map((card) => (
            <button
              key={card.key}
              onClick={() => card.count > 0 && setActiveCard(card.key)}
              disabled={summaryLoading || card.count === 0}
              className={`rounded-lg border p-3 text-center w-full transition-colors ${
                activeCard === card.key
                  ? card.activeBorder
                  : 'border-border bg-card hover:bg-muted/30'
              } disabled:cursor-default`}
            >
              {summaryLoading
                ? <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-muted-foreground" />
                : card.icon}
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`font-bold text-sm ${card.color}`}>
                {summaryLoading ? '...' : formatCurrency(card.total)}
              </p>
              {!summaryLoading && card.count > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {card.count} proyecto{card.count > 1 ? 's' : ''}
                </p>
              )}
              {!summaryLoading && card.count > 0 && (
                <p className="text-[10px] text-primary mt-0.5">Ver proyectos →</p>
              )}
            </button>
          ))}
        </div>

      </div>

      <FinancialDetailDialog
        open={activeCard !== null}
        onClose={() => setActiveCard(null)}
        card={activeCard ?? 'pagado'}
        items={
          activeCard === 'pagado'
            ? (financialSummary?.items_pagado ?? [])
            : activeCard === 'pendiente'
              ? (financialSummary?.items_pendiente ?? [])
              : (financialSummary?.items_en_proceso ?? [])
        }
      />

      {/* ── Cuentas de cobro ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-primary" />
            Cuentas de cobro
          </h4>
          {isAdmin && !showAddAccount && !editingAccount && (
            <Button variant="outline" size="sm" onClick={() => setShowAddAccount(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          )}
        </div>

        {showAddAccount && (
          <AccountForm onSave={handleSaveAccount} onCancel={() => setShowAddAccount(false)} loading={createAccount.isPending} />
        )}

        {loadingAccounts ? (
          <p className="text-xs text-muted-foreground text-center py-2">Cargando...</p>
        ) : accounts.length === 0 && !showAddAccount ? (
          <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">Sin cuentas registradas</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) =>
              editingAccount?.id === account.id ? (
                <AccountForm key={account.id} initial={account} onSave={handleSaveAccount} onCancel={() => setEditingAccount(null)} loading={updateAccount.isPending} />
              ) : (
                <div key={account.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACCOUNT_TYPE_COLORS[account.account_type]}`}>
                        {PAYMENT_ACCOUNT_LABELS[account.account_type]}
                      </span>
                      {account.label && <span className="text-xs font-medium">{account.label}</span>}
                      {account.is_primary && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" /> Principal
                        </Badge>
                      )}
                    </div>
                    {account.account_number && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {account.account_number}{account.account_holder && ` · ${account.account_holder}`}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      {!account.is_primary && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Marcar como principal" onClick={() => setPrimary.mutate({ accountId: account.id, userId })}>
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingAccount(account)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteAccount.mutate({ id: account.id, userId })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Registrar pago ───────────────────────────────────────────── */}
      {isAdmin && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" />
              Registrar pago
              {pendingContent.length > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Clock className="h-2.5 w-2.5 text-yellow-500" />
                  {pendingContent.length} proyecto{pendingContent.length > 1 ? 's' : ''} pendiente{pendingContent.length > 1 ? 's' : ''}
                </Badge>
              )}
            </h4>
            <Button variant="outline" size="sm" onClick={() => setShowPaymentForm((v) => !v)}>
              {showPaymentForm ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {showPaymentForm && (
            <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/20">

              {/* Paso 1: Proyectos */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">1. Proyectos a liquidar</p>
                <ProjectSelector
                  pendingContent={pendingContent}
                  selectedIds={selectedContent}
                  onToggle={handleToggleProject}
                  onToggleAll={handleToggleAllProjects}
                />
              </div>

              {/* Paso 2: Monto y condiciones */}
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">2. Detalles del pago</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Monto *
                      {!amountManuallySet && selectedContent.length > 0 && (
                        <span className="ml-1 text-[10px] text-primary">(calculado)</span>
                      )}
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      placeholder="0"
                      value={payAmount}
                      onChange={(e) => {
                        setPayAmount(e.target.value);
                        setAmountManuallySet(true);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Moneda</Label>
                    <Select value={payCurrency} onValueChange={setPayCurrency}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COP">COP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cuenta destino</Label>
                    <Select value={payAccountId || 'none'} onValueChange={(v) => setPayAccountId(v === 'none' ? '' : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin cuenta específica</SelectItem>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.label ?? PAYMENT_ACCOUNT_LABELS[acc.account_type]}
                            {acc.account_number ? ` · ${acc.account_number}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Estado</Label>
                    <Select value={payStatus} onValueChange={(v) => setPayStatus(v as PaymentStatus)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="processing">En proceso</SelectItem>
                        <SelectItem value="paid">Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Descripción</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Ej: Pago semana 20"
                    value={payDesc}
                    onChange={(e) => setPayDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha de pago</Label>
                    <Input type="date" className="h-8 text-xs" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Comprobante (imagen o PDF)</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        {payReceipt ? payReceipt.name.slice(0, 12) + '…' : 'Subir'}
                      </Button>
                      {payReceipt && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPayReceipt(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => setPayReceipt(e.target.files?.[0] ?? null)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notas internas</Label>
                  <Textarea className="text-xs min-h-[56px]" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
                </div>
              </div>

              {/* Resumen antes de confirmar */}
              {(payAmount || selectedContent.length > 0) && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1 text-xs">
                  <p className="font-semibold text-primary">Resumen del pago</p>
                  {selectedContent.length > 0 && (
                    <p className="text-muted-foreground">
                      {selectedContent.length} proyecto{selectedContent.length > 1 ? 's' : ''} vinculado{selectedContent.length > 1 ? 's' : ''}
                    </p>
                  )}
                  {payAmount && (
                    <p className="text-lg font-bold">{formatCurrency(parseFloat(payAmount) || 0, payCurrency)}</p>
                  )}
                  <p className="text-muted-foreground capitalize">
                    Estado: {PAYMENT_STATUS_LABELS[payStatus]}
                    {payAccountId && accounts.find((a) => a.id === payAccountId) && (
                      <> · {accounts.find((a) => a.id === payAccountId)?.label ?? PAYMENT_ACCOUNT_LABELS[accounts.find((a) => a.id === payAccountId)!.account_type]}</>
                    )}
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={resetPaymentForm}>Cancelar</Button>
                <Button
                  size="sm"
                  onClick={handleRegisterPayment}
                  disabled={!payAmount || createPayment.isPending || uploadReceipt.isPending}
                >
                  {(createPayment.isPending || uploadReceipt.isPending)
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    : <Check className="h-3.5 w-3.5 mr-1" />}
                  Registrar pago
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Dialog: Confirmar pago con comprobante ───────────────────── */}
      <Dialog open={!!confirmTarget} onOpenChange={(v) => !v && setConfirmTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Confirmar pago
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Sube el comprobante de transferencia para registrar el pago como confirmado.
            </p>

            {/* Comprobante — obligatorio */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Comprobante de transferencia <span className="text-destructive">*</span>
              </Label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                  confirmReceipt
                    ? 'border-green-400/60 bg-green-50 dark:bg-green-900/10'
                    : 'border-border hover:border-primary/40'
                }`}
                onClick={() => !confirmReceipt && confirmFileRef.current?.click()}
              >
                {confirmReceipt ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <FileText className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="truncate text-green-700 dark:text-green-400 font-medium">
                        {confirmReceipt.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => { e.stopPropagation(); setConfirmReceipt(null); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-xs text-muted-foreground mb-2">
                      Imagen o PDF del comprobante bancario
                    </p>
                    <Button variant="outline" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); confirmFileRef.current?.click(); }}>
                      Seleccionar archivo
                    </Button>
                  </>
                )}
                <input
                  ref={confirmFileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setConfirmReceipt(e.target.files?.[0] ?? null)}
                />
              </div>
              {!confirmReceipt && (
                <p className="text-[10px] text-muted-foreground">JPG, PNG o PDF · Máx 5MB</p>
              )}
            </div>

            {/* Fecha */}
            <div className="space-y-1">
              <Label className="text-xs">Fecha de pago</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={confirmDate}
                onChange={(e) => setConfirmDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="gap-1 bg-green-600 hover:bg-green-700"
              onClick={handleConfirmPaid}
              disabled={!confirmReceipt || updatePayment.isPending || uploadReceipt.isPending}
            >
              {(updatePayment.isPending || uploadReceipt.isPending)
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle className="h-3.5 w-3.5" />}
              Confirmar pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Historial de pagos ───────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" />
            Historial de pagos
            {payments.length > 0 && <Badge variant="secondary" className="text-xs">{payments.length}</Badge>}
          </h4>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as PaymentStatus | 'all'); setPaymentPage(0); }}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="processing">En proceso</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            {filteredPayments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => exportPaymentsToCSV(filteredPayments, accounts, memberName)}
                title="Exportar CSV"
              >
                <Download className="h-3 w-3" />
                CSV
              </Button>
            )}
          </div>
        </div>

        {loadingPayments ? (
          <p className="text-xs text-muted-foreground text-center py-3">Cargando...</p>
        ) : paginatedPayments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {paginatedPayments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                accounts={accounts}
                contentMap={contentMap}
                onStatusChange={handleStatusChange}
                onDelete={(id) => deletePayment.mutate({ id, userId })}
                onConfirmPaid={openConfirmPaid}
              />
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button variant="ghost" size="sm" disabled={paymentPage === 0} onClick={() => setPaymentPage((p) => p - 1)}>Anterior</Button>
                <span className="text-xs text-muted-foreground">{paymentPage + 1} / {totalPages}</span>
                <Button variant="ghost" size="sm" disabled={paymentPage + 1 >= totalPages} onClick={() => setPaymentPage((p) => p + 1)}>Siguiente</Button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
