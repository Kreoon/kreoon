import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DollarSign, CheckCircle2, Clock, Medal, Sparkles, FileText, Receipt } from 'lucide-react';
import { useInternalOrgContent } from '@/hooks/useInternalOrgContent';
import { supabase } from '@/integrations/supabase/client';
import { markLocalUpdate } from '@/hooks/useContent';
import type { UnifiedTabProps } from '../types';
import { ASSIGNMENT_STATUS_LABELS } from '@/types/unifiedProject.types';
import { getRoleLabel } from '@/types/roles';

export default function PaymentsTab({ project, formData, setFormData, editMode, readOnly, typeConfig, permissions, assignmentsHook }: UnifiedTabProps) {
  const isEditing = editMode && !readOnly;
  const assignments = assignmentsHook?.assignments || [];
  const canMarkPaid = permissions.can('project.payments', 'edit');

  // Detect internal organization content (ambassador content)
  const clientId = project.source === 'content' ? (formData.client_id || project.clientId) : undefined;
  const { isInternalOrgContent } = useInternalOrgContent(clientId);

  const formatCurrency = (amount: number | undefined, currency: string = 'COP') => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
  };

  // Assignment payment totals
  const assignmentTotals = useMemo(() => {
    const active = assignments.filter(a => a.status !== 'cancelled');
    const total = active.reduce((sum, a) => sum + (a.paymentAmount || 0), 0);
    const paid = active.filter(a => a.isPaid).reduce((sum, a) => sum + (a.paymentAmount || 0), 0);
    const pending = total - paid;
    return { total, paid, pending, count: active.length, paidCount: active.filter(a => a.isPaid).length };
  }, [assignments]);

  const handleMarkPaid = (assignmentId: string) => {
    // updateStatus('paid') auto-stamps is_paid=true and paid_at
    assignmentsHook?.updateStatus(assignmentId, 'paid');
  };

  // Auto-save toggle for content fields (creator_paid, editor_paid, invoiced)
  const autoSaveContentField = (field: string, value: boolean) => {
    if (!project.id || project.source !== 'content') return;
    setFormData((prev: Record<string, any>) => ({ ...prev, [field]: value }));
    markLocalUpdate(project.id, 5 * 60 * 1000);
    supabase
      .rpc('update_content_by_id', {
        p_content_id: project.id,
        p_updates: { [field]: value },
      })
      .then(({ error }) => {
        if (error) console.error(`[PaymentsTab] Failed to auto-save ${field}:`, error);
      });
  };

  // Content source uses creator_payment / editor_payment
  if (project.source === 'content') {
    // Internal org content (ambassador): hide monetary payments, show UP rewards
    if (isInternalOrgContent) {
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-500" />
            Recompensas
          </h3>

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-amber-700 dark:text-amber-300">Contenido Interno de la Organizacion</span>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Este contenido es de la marca interna. Los participantes reciben puntos UP en lugar de pago monetario.
              Los puntos se asignan automaticamente segun las transiciones de estado.
            </p>
          </div>

          {/* Invoice toggle */}
          <ContentInvoiceSection
            invoiced={formData.invoiced}
            canEdit={canMarkPaid}
            onToggle={(val) => autoSaveContentField('invoiced', val)}
          />

          {/* Assignment payments (still show for tracking, but amounts may be zero) */}
          <AssignmentPaymentsSection
            assignments={assignments}
            totals={assignmentTotals}
            canMarkPaid={canMarkPaid}
            onMarkPaid={handleMarkPaid}
            formatCurrency={formatCurrency}
            currency="COP"
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Finanzas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PaymentField
            label="Pago Creador"
            value={formData.creator_payment}
            onChange={(val) => setFormData((prev: Record<string, any>) => ({ ...prev, creator_payment: val }))}
            editing={isEditing}
            paid={formData.creator_paid}
            canTogglePaid={canMarkPaid}
            onTogglePaid={(val) => autoSaveContentField('creator_paid', val)}
          />
          <PaymentField
            label="Pago Editor"
            value={formData.editor_payment}
            onChange={(val) => setFormData((prev: Record<string, any>) => ({ ...prev, editor_payment: val }))}
            editing={isEditing}
            paid={formData.editor_paid}
            canTogglePaid={canMarkPaid}
            onTogglePaid={(val) => autoSaveContentField('editor_paid', val)}
          />
        </div>

        {/* Invoice toggle */}
        <ContentInvoiceSection
          invoiced={formData.invoiced}
          canEdit={canMarkPaid}
          onToggle={(val) => autoSaveContentField('invoiced', val)}
        />

        {/* Assignment payments */}
        <AssignmentPaymentsSection
          assignments={assignments}
          totals={assignmentTotals}
          canMarkPaid={canMarkPaid}
          onMarkPaid={handleMarkPaid}
          formatCurrency={formatCurrency}
          currency="COP"
        />
      </div>
    );
  }

  // Marketplace source
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        Finanzas del Proyecto
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <label className="text-xs font-medium text-muted-foreground uppercase">Total</label>
          <p className="text-xl font-bold mt-1">
            {formatCurrency(formData.total_price || project.totalPrice, project.currency)}
          </p>
        </div>

        {typeConfig.roles.primary.length > 0 && (
          <>
            <div className="border rounded-lg p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase">Pago Creador</label>
              <p className="text-lg font-semibold mt-1">
                {formatCurrency(formData.creator_payout || project.creatorPayment, project.currency)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase">Pago Editor</label>
              <p className="text-lg font-semibold mt-1">
                {formatCurrency(formData.editor_payout || project.editorPayment, project.currency)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase">Comision Plataforma</label>
              <p className="text-lg font-semibold mt-1">
                {formatCurrency(formData.platform_fee || project.platformFee, project.currency)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Assignment payments */}
      <AssignmentPaymentsSection
        assignments={assignments}
        totals={assignmentTotals}
        canMarkPaid={canMarkPaid}
        onMarkPaid={handleMarkPaid}
        formatCurrency={formatCurrency}
        currency={project.currency || 'USD'}
      />
    </div>
  );
}

// ============================================================
// Content Invoice Section
// ============================================================

function ContentInvoiceSection({
  invoiced,
  canEdit,
  onToggle,
}: {
  invoiced: boolean;
  canEdit: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Receipt className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="font-medium text-sm">Factura</p>
            <p className="text-xs text-muted-foreground">
              {invoiced ? 'Este contenido tiene factura asociada' : 'Sin factura registrada'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoiced && (
            <Badge className="bg-blue-500/10 text-blue-600 text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Facturado
            </Badge>
          )}
          {canEdit && (
            <Switch
              checked={invoiced || false}
              onCheckedChange={onToggle}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Assignment Payments Section
// ============================================================

function AssignmentPaymentsSection({
  assignments,
  totals,
  canMarkPaid,
  onMarkPaid,
  formatCurrency,
  currency,
}: {
  assignments: UnifiedTabProps['assignmentsHook'] extends { assignments: infer A } ? A : any[];
  totals: { total: number; paid: number; pending: number; count: number; paidCount: number };
  canMarkPaid: boolean;
  onMarkPaid: (id: string) => void;
  formatCurrency: (amount: number | undefined, currency?: string) => string;
  currency: string;
}) {
  const active = (assignments || []).filter((a: any) => a.status !== 'cancelled');
  if (active.length === 0) return null;

  return (
    <div className="border-t pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Pagos por Asignacion
        </h4>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{totals.paidCount}/{totals.count} pagados</span>
          <Badge variant="outline" className="text-xs">
            {formatCurrency(totals.total, currency)}
          </Badge>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-bold mt-0.5">{formatCurrency(totals.total, currency)}</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-green-600">Pagado</p>
          <p className="text-sm font-bold mt-0.5 text-green-600">{formatCurrency(totals.paid, currency)}</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-amber-600">Pendiente</p>
          <p className="text-sm font-bold mt-0.5 text-amber-600">{formatCurrency(totals.pending, currency)}</p>
        </div>
      </div>

      {/* Per-assignment rows */}
      <div className="space-y-2">
        {active.map((assignment: any) => (
          <div key={assignment.id} className="border rounded-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {(assignment.user?.full_name || '?')[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">
                  {assignment.user?.full_name || 'Sin nombre'}
                </span>
                <Badge variant="outline" className="text-xs">
                  {getRoleLabel(assignment.roleId)}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold">
                {formatCurrency(assignment.paymentAmount, assignment.paymentCurrency || currency)}
              </span>
              {assignment.isPaid ? (
                <Badge className="bg-green-500/10 text-green-600 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Pagado
                </Badge>
              ) : canMarkPaid && (assignment.status === 'approved' || assignment.status === 'delivered') ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onMarkPaid(assignment.id)}
                >
                  Marcar Pagado
                </Button>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Pendiente
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Legacy Payment Field
// ============================================================

function PaymentField({
  label,
  value,
  onChange,
  editing,
  paid,
  canTogglePaid,
  onTogglePaid,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  editing: boolean;
  paid?: boolean;
  canTogglePaid?: boolean;
  onTogglePaid?: (val: boolean) => void;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          {paid ? (
            <Badge className="bg-green-500/10 text-green-600 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Pagado
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Pendiente
            </Badge>
          )}
          {canTogglePaid && onTogglePaid && (
            <Switch
              checked={paid || false}
              onCheckedChange={onTogglePaid}
            />
          )}
        </div>
      </div>
      {editing ? (
        <Input
          type="number"
          value={value || 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="text-lg font-semibold"
        />
      ) : (
        <p className="text-lg font-semibold">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0)}
        </p>
      )}
    </div>
  );
}
