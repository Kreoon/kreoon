import { useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Users, UserPlus, X, ChevronRight, DollarSign, Loader2, Check,
  ChevronDown, ChevronUp, CheckCircle2, Clock, Trash2, Pencil,
  Medal, Sparkles, Receipt, FileText,
} from 'lucide-react';
import { useUnifiedTalent } from '@/hooks/useUnifiedTalent';
import { useInternalOrgContent } from '@/hooks/useInternalOrgContent';
import { supabase } from '@/integrations/supabase/client';
import { markLocalUpdate } from '@/hooks/useContent';
import { ORG_ASSIGNABLE_ROLES, getRoleLabel, getRoleColor, getRoleBadgeColor } from '@/lib/roles';
import type { UnifiedTabProps } from '../types';
import type { ProjectAssignment, AssignmentStatus } from '@/types/unifiedProject.types';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_COLORS } from '@/types/unifiedProject.types';

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, AssignmentStatus[]> = {
  pending: ['invited', 'cancelled'],
  invited: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['delivered', 'cancelled'],
  delivered: ['in_review'],
  in_review: ['approved', 'changes_requested'],
  changes_requested: ['in_progress'],
  approved: ['paid'],
  paid: [],
  cancelled: [],
};

// Scalar field map: global role → content table fields
const SCALAR_ROLE_FIELDS: Record<string, { idField: string; paymentField?: string; paidField?: string }> = {
  creator: { idField: 'creator_id', paymentField: 'creator_payment', paidField: 'creator_paid' },
  editor: { idField: 'editor_id', paymentField: 'editor_payment', paidField: 'editor_paid' },
  strategist: { idField: 'strategist_id' },
};

export default function TeamTab({ project, formData, setFormData, editMode, readOnly, permissions, typeConfig, assignmentsHook }: UnifiedTabProps) {
  const canEdit = permissions.can('project.team', 'edit');
  const canEditPayments = permissions.can('project.payments', 'edit');
  const assignments = assignmentsHook?.assignments || [];

  const orgId = project.organizationId || project.contentData?.organization_id || '';
  const { data: orgMembers, isLoading: loadingMembers } = useUnifiedTalent(orgId || undefined);

  // Detect internal organization content (ambassador content)
  const clientId = project.source === 'content' ? (formData.client_id || project.clientId) : undefined;
  const { isInternalOrgContent } = useInternalOrgContent(clientId);

  // Step 1: Selected roles for this project
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showRolePicker, setShowRolePicker] = useState(false);

  // Step 2: User + payment per selected role
  const [roleAssignments, setRoleAssignments] = useState<Record<string, { userId: string; payment: string }>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);

  // Editing state for existing members
  const [editingPayment, setEditingPayment] = useState<Record<string, string>>({});

  // Roles already assigned (from DB assignments OR scalar fields)
  const assignedRoleIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of assignments) set.add(a.roleId);
    if (project.source === 'content') {
      if (formData.creator_id) set.add('creator');
      if (formData.editor_id) set.add('editor');
      if (formData.strategist_id) set.add('strategist');
    }
    return set;
  }, [assignments, project.source, formData.creator_id, formData.editor_id, formData.strategist_id]);

  // Get users available for a specific global role
  const getUsersForRole = useCallback((roleId: string) => {
    if (!orgMembers) return [];
    return orgMembers.filter(m => {
      const roles = m.all_roles || [];
      const orgRole = m.org_role || '';
      return roles.includes(roleId) || orgRole === roleId;
    });
  }, [orgMembers]);

  // Already assigned user+role combos
  const assignedCombos = useMemo(() => {
    const set = new Set<string>();
    for (const a of assignments) set.add(`${a.userId}:${a.roleId}`);
    return set;
  }, [assignments]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
    if (selectedRoles.includes(roleId)) {
      setRoleAssignments(prev => { const next = { ...prev }; delete next[roleId]; return next; });
    }
  };

  const updateRoleAssignment = (roleId: string, field: 'userId' | 'payment', value: string) => {
    setRoleAssignments(prev => ({
      ...prev,
      [roleId]: { ...prev[roleId] || { userId: '', payment: '' }, [field]: value },
    }));
  };

  const handleAssignRole = async (roleId: string) => {
    const data = roleAssignments[roleId];
    if (!data?.userId || !data?.payment || Number(data.payment) <= 0) return;
    if (!assignmentsHook?.createAssignment) return;

    setSavingRole(roleId);
    try {
      await assignmentsHook.createAssignment({
        userId: data.userId,
        roleId,
        paymentAmount: Number(data.payment),
        paymentCurrency: 'COP',
        paymentMethod: 'payment',
      });

      // También actualizar campos escalares para content (creator_id, editor_id, strategist_id)
      // Esto permite que las tarjetas del tablero muestren los asignados
      if (project.source === 'content' && project.id) {
        const scalarFields = SCALAR_ROLE_FIELDS[roleId];
        if (scalarFields) {
          const updates: Record<string, any> = {
            [scalarFields.idField]: data.userId,
          };
          if (scalarFields.paymentField) {
            updates[scalarFields.paymentField] = Number(data.payment);
          }
          setFormData((prev: Record<string, any>) => ({ ...prev, ...updates }));
          markLocalUpdate(project.id, 5 * 60 * 1000);
          supabase
            .rpc('update_content_by_id', { p_content_id: project.id, p_updates: updates })
            .then(({ error }) => {
              if (error) console.error(`[TeamTab] Failed to sync ${roleId} to content:`, error);
            });
        }
      }

      setSelectedRoles(prev => prev.filter(r => r !== roleId));
      setRoleAssignments(prev => { const next = { ...prev }; delete next[roleId]; return next; });
    } finally {
      setSavingRole(null);
    }
  };

  // Roles that are selected but not yet assigned
  const pendingRoles = selectedRoles.filter(r => !assignedRoleIds.has(r));

  // Auto-save content field (for scalar toggles like creator_paid, editor_paid, invoiced)
  const autoSaveContentField = (field: string, value: any) => {
    if (!project.id || project.source !== 'content') return;
    setFormData((prev: Record<string, any>) => ({ ...prev, [field]: value }));
    markLocalUpdate(project.id, 5 * 60 * 1000);
    supabase
      .rpc('update_content_by_id', { p_content_id: project.id, p_updates: { [field]: value } })
      .then(({ error }) => {
        if (error) console.error(`[TeamTab] Failed to auto-save ${field}:`, error);
      });
  };

  // Remove scalar member (clear creator_id/editor_id/strategist_id)
  const removeScalarMember = (roleId: string) => {
    const fields = SCALAR_ROLE_FIELDS[roleId];
    if (!fields || !project.id || project.source !== 'content') return;

    const updates: Record<string, any> = { [fields.idField]: null };
    if (fields.paymentField) updates[fields.paymentField] = 0;
    if (fields.paidField) updates[fields.paidField] = false;

    setFormData((prev: Record<string, any>) => ({ ...prev, ...updates }));
    markLocalUpdate(project.id, 5 * 60 * 1000);
    supabase
      .rpc('update_content_by_id', { p_content_id: project.id, p_updates: updates })
      .then(({ error }) => {
        if (error) console.error(`[TeamTab] Failed to remove ${roleId}:`, error);
      });
  };

  // Save edited payment for assignment
  const saveAssignmentPayment = async (assignmentId: string) => {
    const val = editingPayment[assignmentId];
    if (val == null || !assignmentsHook?.updatePayment) return;
    await assignmentsHook.updatePayment(assignmentId, { paymentAmount: Number(val) });
    setEditingPayment(prev => { const next = { ...prev }; delete next[assignmentId]; return next; });
  };

  // Resolve user name by ID from orgMembers (fallback for when RPC doesn't join profiles)
  const resolveUserName = useCallback((userId: string | undefined | null, fallbackName?: string): string => {
    if (fallbackName) return fallbackName;
    if (!userId || !orgMembers) return 'Sin nombre';
    const member = orgMembers.find(m => m.id === userId);
    return member?.full_name || member?.email || 'Sin nombre';
  }, [orgMembers]);

  // Roles que ya tienen asignación en project_assignments (evitar duplicados)
  const assignmentRoleIds = useMemo(() => {
    return new Set(assignments.map(a => a.roleId));
  }, [assignments]);

  // Existing team members from scalar fields (solo si NO hay asignación en project_assignments)
  const scalarMembers = useMemo(() => {
    const members: { roleLabel: string; roleId: string; name: string; userId: string; payment?: number; paid?: boolean }[] = [];
    if (project.source === 'content') {
      // Solo mostrar scalar si NO existe asignación para ese rol
      if (formData.creator_id && !assignmentRoleIds.has('creator')) {
        members.push({
          roleLabel: getRoleLabel('creator'), roleId: 'creator',
          name: resolveUserName(formData.creator_id, project.contentData?.creator?.full_name),
          userId: formData.creator_id,
          payment: formData.creator_payment, paid: formData.creator_paid,
        });
      }
      if (formData.editor_id && !assignmentRoleIds.has('editor')) {
        members.push({
          roleLabel: getRoleLabel('editor'), roleId: 'editor',
          name: resolveUserName(formData.editor_id, project.contentData?.editor?.full_name),
          userId: formData.editor_id,
          payment: formData.editor_payment, paid: formData.editor_paid,
        });
      }
      if (formData.strategist_id && !assignmentRoleIds.has('strategist')) {
        members.push({
          roleLabel: getRoleLabel('strategist'), roleId: 'strategist',
          name: resolveUserName(formData.strategist_id, project.contentData?.strategist?.full_name),
          userId: formData.strategist_id,
        });
      }
    } else {
      // Marketplace: también evitar duplicados con project_assignments
      if (project.creatorName && !assignmentRoleIds.has('creator')) members.push({ roleLabel: getRoleLabel('creator'), roleId: 'creator', name: project.creatorName, userId: '' });
      if (project.editorName && !assignmentRoleIds.has('editor')) members.push({ roleLabel: getRoleLabel('editor'), roleId: 'editor', name: project.editorName, userId: '' });
      if (project.clientName && !assignmentRoleIds.has('client')) members.push({ roleLabel: getRoleLabel('client'), roleId: 'client', name: project.clientName, userId: '' });
    }
    return members;
  }, [project, formData.creator_id, formData.editor_id, formData.strategist_id,
      formData.creator_payment, formData.editor_payment, formData.creator_paid, formData.editor_paid, resolveUserName, assignmentRoleIds]);

  const hasAnyMembers = scalarMembers.length > 0 || assignments.length > 0;

  // Payment totals (scalar + assignments)
  const paymentTotals = useMemo(() => {
    let total = 0, paid = 0;
    // Scalar payments
    for (const m of scalarMembers) {
      total += m.payment || 0;
      if (m.paid) paid += m.payment || 0;
    }
    // Assignment payments
    const active = assignments.filter(a => a.status !== 'cancelled');
    for (const a of active) {
      total += a.paymentAmount || 0;
      if (a.isPaid) paid += a.paymentAmount || 0;
    }
    return { total, paid, pending: total - paid };
  }, [scalarMembers, assignments]);

  // Group assignments by phase
  const phaseGroups = useMemo(() => {
    const groups = new Map<number, ProjectAssignment[]>();
    for (const a of assignments) {
      const list = groups.get(a.phase) || [];
      list.push(a);
      groups.set(a.phase, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [assignments]);

  const formatCurrency = (amount: number | undefined, currency: string = 'COP') => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Equipo y Finanzas
        </h3>
        <Badge variant="secondary" className="text-xs">{typeConfig.label}</Badge>
      </div>

      {/* Ambassador / internal org banner */}
      {project.source === 'content' && isInternalOrgContent && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-amber-700 dark:text-amber-300">Contenido Interno</span>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Los participantes reciben puntos UP en lugar de pago monetario.
          </p>
        </div>
      )}

      {/* ============ STEP 1: SELECT ROLES ============ */}
      {canEdit && project.id && (
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRolePicker(!showRolePicker)}
            className="w-full justify-between h-9"
          >
            <span className="flex items-center gap-2 text-sm">
              <UserPlus className="h-4 w-4" />
              Agregar miembro al equipo
            </span>
            {showRolePicker ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showRolePicker && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-3">Selecciona los roles que necesitas:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ORG_ASSIGNABLE_ROLES.map(roleId => {
                  const isAssigned = assignedRoleIds.has(roleId);
                  const isSelected = selectedRoles.includes(roleId);
                  const badgeColor = getRoleBadgeColor(roleId);

                  return (
                    <label
                      key={roleId}
                      className={`
                        flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors text-sm
                        ${isAssigned
                          ? 'bg-green-500/5 border-green-500/20 opacity-60 cursor-default'
                          : isSelected
                            ? 'bg-primary/5 border-primary/30'
                            : 'hover:bg-muted/50 border-border'}
                      `}
                    >
                      <Checkbox
                        checked={isSelected || isAssigned}
                        disabled={isAssigned}
                        onCheckedChange={() => !isAssigned && toggleRole(roleId)}
                        className="shrink-0"
                      />
                      <span className={`text-xs truncate ${badgeColor.split(' ')[1] || ''}`}>
                        {getRoleLabel(roleId)}
                      </span>
                      {isAssigned && <Check className="h-3 w-3 text-green-500 shrink-0 ml-auto" />}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ STEP 2: ASSIGN USERS PER ROLE ============ */}
      {pendingRoles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Asignar personas ({pendingRoles.length} rol{pendingRoles.length > 1 ? 'es' : ''})
          </h4>
          {pendingRoles.map(roleId => {
            const colorClass = getRoleBadgeColor(roleId);
            const usersForRole = getUsersForRole(roleId);
            const userOptions = usersForRole
              .filter(u => !assignedCombos.has(`${u.id}:${roleId}`))
              .map(u => ({ value: u.id, label: u.full_name || u.email || u.id }));

            const data = roleAssignments[roleId] || { userId: '', payment: '' };
            const isValid = data.userId && data.payment && Number(data.payment) > 0;
            const isSaving = savingRole === roleId;

            return (
              <div key={roleId} className="border rounded-lg p-4 space-y-3 bg-background">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`${colorClass} text-sm`}>
                    {getRoleLabel(roleId)}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => toggleRole(roleId)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Persona</label>
                  {loadingMembers ? (
                    <div className="space-y-2 py-2">
                      {[1, 2].map(i => (
                        <div key={i} className="flex items-center gap-2">
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      ))}
                    </div>
                  ) : userOptions.length > 0 ? (
                    <SearchableSelect
                      value={data.userId}
                      onValueChange={(val) => updateRoleAssignment(roleId, 'userId', val)}
                      options={userOptions}
                      placeholder="Seleccionar persona..."
                      triggerClassName="h-9 text-sm"
                    />
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400 py-2">
                      No hay miembros con este rol. Asigna el rol primero en Configuracion &gt; Equipo.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Pago COP (obligatorio)
                  </label>
                  <Input
                    type="number"
                    value={data.payment}
                    onChange={(e) => updateRoleAssignment(roleId, 'payment', e.target.value)}
                    placeholder="Monto en COP..."
                    className="h-9 text-sm"
                    min={0}
                  />
                </div>

                <Button size="sm" className="w-full" disabled={!isValid || isSaving} onClick={() => handleAssignRole(roleId)}>
                  {isSaving
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Guardando...</>
                    : <><UserPlus className="h-3.5 w-3.5 mr-1.5" />Asignar</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ TEAM MEMBERS WITH FINANCES ============ */}
      {hasAnyMembers && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Miembros del equipo</h4>
          <div className="grid grid-cols-1 gap-2">
            {/* Scalar members (creator_id, editor_id, strategist_id) */}
            {scalarMembers.map((m, i) => (
              <ScalarMemberCard
                key={`scalar-${i}`}
                member={m}
                canEdit={canEdit}
                canEditPayments={canEditPayments}
                isAmbassador={isInternalOrgContent}
                onRemove={() => removeScalarMember(m.roleId)}
                onPaymentChange={(val) => {
                  const fields = SCALAR_ROLE_FIELDS[m.roleId];
                  if (fields?.paymentField) autoSaveContentField(fields.paymentField, val);
                }}
                onPaidToggle={(val) => {
                  const fields = SCALAR_ROLE_FIELDS[m.roleId];
                  if (fields?.paidField) autoSaveContentField(fields.paidField, val);
                }}
                formatCurrency={formatCurrency}
              />
            ))}

            {/* Project assignments */}
            {phaseGroups.map(([phase, group]) => (
              <div key={phase} className="space-y-2">
                {phaseGroups.length > 1 && (
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2">
                    <ChevronRight className="h-3 w-3" />
                    Fase {phase}
                    <span className="text-muted-foreground/60">({group.length})</span>
                  </div>
                )}
                {group.map(assignment => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    canEdit={canEdit}
                    canEditPayments={canEditPayments}
                    editingPayment={editingPayment[assignment.id]}
                    onEditPaymentStart={() => setEditingPayment(prev => ({ ...prev, [assignment.id]: String(assignment.paymentAmount || 0) }))}
                    onEditPaymentChange={(val) => setEditingPayment(prev => ({ ...prev, [assignment.id]: val }))}
                    onEditPaymentSave={() => saveAssignmentPayment(assignment.id)}
                    onEditPaymentCancel={() => setEditingPayment(prev => { const next = { ...prev }; delete next[assignment.id]; return next; })}
                    onStatusChange={(status) => assignmentsHook?.updateStatus(assignment.id, status)}
                    onCancel={() => assignmentsHook?.cancelAssignment(assignment.id)}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ PAYMENT SUMMARY ============ */}
      {hasAnyMembers && paymentTotals.total > 0 && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Resumen Financiero
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-bold mt-0.5">{formatCurrency(paymentTotals.total)}</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-green-600">Pagado</p>
              <p className="text-sm font-bold mt-0.5 text-green-600">{formatCurrency(paymentTotals.paid)}</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-amber-600">Pendiente</p>
              <p className="text-sm font-bold mt-0.5 text-amber-600">{formatCurrency(paymentTotals.pending)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ============ INVOICE (content only) ============ */}
      {project.source === 'content' && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Receipt className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Factura</p>
                <p className="text-xs text-muted-foreground">
                  {formData.invoiced ? 'Este contenido tiene factura asociada' : 'Sin factura registrada'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {formData.invoiced && (
                <Badge className="bg-blue-500/10 text-blue-600 text-xs">
                  <FileText className="h-3 w-3 mr-1" /> Facturado
                </Badge>
              )}
              {canEditPayments && (
                <Switch checked={formData.invoiced || false} onCheckedChange={(val) => autoSaveContentField('invoiced', val)} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ MARKETPLACE FINANCE SUMMARY ============ */}
      {project.source === 'marketplace' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Desglose Marketplace</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold mt-0.5">{formatCurrency(formData.total_price || project.totalPrice, project.currency)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Pago Creador</p>
              <p className="text-sm font-semibold mt-0.5">{formatCurrency(formData.creator_payout || project.creatorPayment, project.currency)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Pago Editor</p>
              <p className="text-sm font-semibold mt-0.5">{formatCurrency(formData.editor_payout || project.editorPayment, project.currency)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Comision</p>
              <p className="text-sm font-semibold mt-0.5">{formatCurrency(formData.platform_fee || project.platformFee, project.currency)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ============ EMPTY STATE ============ */}
      {!hasAnyMembers && pendingRoles.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay miembros asignados</p>
          {canEdit && project.id && (
            <p className="text-xs mt-1">Usa "Agregar miembro" arriba para armar el equipo</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Scalar Member Card (creator_id, editor_id, strategist_id)
// ============================================================

function ScalarMemberCard({
  member,
  canEdit,
  canEditPayments,
  isAmbassador,
  onRemove,
  onPaymentChange,
  onPaidToggle,
  formatCurrency,
}: {
  member: { roleLabel: string; roleId: string; name: string; userId: string; payment?: number; paid?: boolean };
  canEdit: boolean;
  canEditPayments: boolean;
  isAmbassador: boolean;
  onRemove: () => void;
  onPaymentChange: (val: number) => void;
  onPaidToggle: (val: boolean) => void;
  formatCurrency: (amount: number | undefined, currency?: string) => string;
}) {
  const [editingAmount, setEditingAmount] = useState(false);
  const [localAmount, setLocalAmount] = useState(String(member.payment || 0));
  const color = getRoleColor(member.roleId);
  const badgeColor = getRoleBadgeColor(member.roleId);
  const hasPaymentField = !!SCALAR_ROLE_FIELDS[member.roleId]?.paymentField;

  return (
    <div className="border rounded-lg p-3 space-y-2 transition-all duration-200 hover:border-primary/20">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
          {(member.name || '?')[0]}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{member.name}</span>
            <Badge variant="outline" className={`text-xs ${badgeColor}`}>{member.roleLabel}</Badge>
          </div>
        </div>
        {canEdit && member.userId && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={onRemove} title="Quitar del proyecto">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Payment row */}
      {hasPaymentField && !isAmbassador && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pl-0 sm:pl-12">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />
          {editingAmount ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="number"
                value={localAmount}
                onChange={(e) => setLocalAmount(e.target.value)}
                className="h-8 text-sm w-full sm:w-32"
                min={0}
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-8 w-8 px-2" onClick={() => {
                onPaymentChange(Number(localAmount) || 0);
                setEditingAmount(false);
              }}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 px-2" onClick={() => setEditingAmount(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0 sm:hidden" />
              <span className="text-sm font-medium">{formatCurrency(member.payment)}</span>
              {canEditPayments && (
                <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => { setLocalAmount(String(member.payment || 0)); setEditingAmount(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Paid toggle */}
          {SCALAR_ROLE_FIELDS[member.roleId]?.paidField && (
            <div className="flex items-center gap-2 shrink-0">
              {member.paid ? (
                <Badge className="text-xs bg-green-500/10 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Pagado</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>
              )}
              {canEditPayments && (
                <Switch checked={member.paid || false} onCheckedChange={onPaidToggle} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Ambassador badge */}
      {hasPaymentField && isAmbassador && (
        <div className="flex items-center gap-2 pl-0 sm:pl-12 text-xs text-amber-600">
          <Medal className="h-3.5 w-3.5" />
          Puntos UP
        </div>
      )}
    </div>
  );
}

// ============================================================
// Assignment Card
// ============================================================

function AssignmentCard({
  assignment,
  canEdit,
  canEditPayments,
  editingPayment,
  onEditPaymentStart,
  onEditPaymentChange,
  onEditPaymentSave,
  onEditPaymentCancel,
  onStatusChange,
  onCancel,
  formatCurrency,
}: {
  assignment: ProjectAssignment;
  canEdit: boolean;
  canEditPayments: boolean;
  editingPayment: string | undefined;
  onEditPaymentStart: () => void;
  onEditPaymentChange: (val: string) => void;
  onEditPaymentSave: () => void;
  onEditPaymentCancel: () => void;
  onStatusChange: (status: AssignmentStatus) => void;
  onCancel: () => void;
  formatCurrency: (amount: number | undefined, currency?: string) => string;
}) {
  const transitions = STATUS_TRANSITIONS[assignment.status] || [];
  const statusColor = ASSIGNMENT_STATUS_COLORS[assignment.status] || '';
  const color = getRoleColor(assignment.roleId);
  const badgeColor = getRoleBadgeColor(assignment.roleId);
  const isEditing = editingPayment != null;

  return (
    <div className="border rounded-lg p-3 space-y-2 transition-all duration-200 hover:border-primary/20">
      {/* Row 1: Avatar + Name + Role + Status */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
            {(assignment.user?.full_name || '?')[0]}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{assignment.user?.full_name || 'Sin nombre'}</span>
              <Badge className={`text-xs ${statusColor}`}>{ASSIGNMENT_STATUS_LABELS[assignment.status]}</Badge>
            </div>
            <Badge variant="outline" className={`text-xs ${badgeColor}`}>{getRoleLabel(assignment.roleId)}</Badge>
          </div>
        </div>

        {/* Actions: status dropdown + cancel */}
        <div className="flex items-center gap-1 sm:ml-auto shrink-0">
          {canEdit && transitions.length > 0 && (
            <SearchableSelect
              value=""
              onValueChange={(val) => onStatusChange(val as AssignmentStatus)}
              options={transitions.map(t => ({ value: t, label: ASSIGNMENT_STATUS_LABELS[t] }))}
              placeholder="Accion..."
              triggerClassName="h-8 min-w-[100px] text-xs"
            />
          )}
          {canEdit && assignment.status !== 'paid' && assignment.status !== 'approved' && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={onCancel} title="Cancelar asignacion">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Payment + Paid status */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pl-0 sm:pl-12">
        <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              value={editingPayment}
              onChange={(e) => onEditPaymentChange(e.target.value)}
              className="h-8 text-sm w-full sm:w-32"
              min={0}
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-8 w-8 px-2" onClick={onEditPaymentSave}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 px-2" onClick={onEditPaymentCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0 sm:hidden" />
            <span className="text-sm font-medium">
              {formatCurrency(assignment.paymentAmount, assignment.paymentCurrency)}
            </span>
            {canEditPayments && (
              <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={onEditPaymentStart}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Paid status */}
        <div className="flex items-center gap-2 shrink-0">
          {assignment.isPaid ? (
            <Badge className="text-xs bg-green-500/10 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Pagado</Badge>
          ) : canEditPayments && (assignment.status === 'approved' || assignment.status === 'delivered') ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onStatusChange('paid')}
            >
              Marcar Pagado
            </Button>
          ) : (
            <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
