import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Users, UserPlus, X, ChevronRight } from 'lucide-react';
import type { UnifiedTabProps } from '../types';
import type { ProjectAssignment, AssignmentStatus } from '@/types/unifiedProject.types';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_COLORS } from '@/types/unifiedProject.types';
import { getRoleLabel, getRoleGroupConfig } from '@/types/roles';

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

export default function TeamTab({ project, formData, permissions, typeConfig, assignmentsHook }: UnifiedTabProps) {
  const canEdit = permissions.can('project.team', 'edit');
  const assignments = assignmentsHook?.assignments || [];

  // Legacy team members (from scalar fields)
  const legacyMembers = useMemo(() => {
    if (project.source === 'content') {
      return [
        { role: 'Creador', name: project.contentData?.creator?.full_name, id: formData.creator_id },
        { role: 'Editor', name: project.contentData?.editor?.full_name, id: formData.editor_id },
        { role: 'Estratega', name: project.contentData?.strategist?.full_name, id: formData.strategist_id },
      ].filter(m => m.name || m.id);
    }
    return [
      { role: 'Marca', name: project.clientName },
      { role: 'Creador', name: project.creatorName },
      { role: 'Editor', name: project.editorName },
    ].filter(m => m.name);
  }, [project, formData.creator_id, formData.editor_id, formData.strategist_id]);

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
    if (amount == null) return '';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Equipo del Proyecto
        </h3>
        <Badge variant="secondary" className="text-xs">{typeConfig.label}</Badge>
      </div>

      {/* ============ LEGACY TEAM SECTION ============ */}
      {legacyMembers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Equipo base</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {legacyMembers.map((m, i) => (
              <div key={i} className="border rounded-lg p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {(m.name || '?')[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{m.name || 'Sin asignar'}</p>
                  <Badge variant="secondary" className="text-xs">{m.role}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ ASSIGNMENTS BY PHASE ============ */}
      {phaseGroups.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Asignaciones</h4>
          {phaseGroups.map(([phase, group]) => (
            <div key={phase} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <ChevronRight className="h-3 w-3" />
                Fase {phase}
                <span className="text-muted-foreground/60">({group.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {group.map(assignment => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    canEdit={canEdit}
                    onStatusChange={(status) => assignmentsHook?.updateStatus(assignment.id, status)}
                    onCancel={() => assignmentsHook?.cancelAssignment(assignment.id)}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ EMPTY STATE ============ */}
      {legacyMembers.length === 0 && assignments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay miembros asignados</p>
        </div>
      )}

      {/* ============ AVAILABLE ROLES ============ */}
      <div className="border-t pt-4 space-y-3">
        {typeConfig.roles.primary.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Roles principales</h4>
            <div className="flex flex-wrap gap-1">
              {typeConfig.roles.primary.slice(0, 8).map(role => {
                const gc = getRoleGroupConfig(role);
                return (
                  <Badge key={role} variant="outline" className={`text-xs ${gc.color}`}>
                    {getRoleLabel(role)}
                  </Badge>
                );
              })}
              {typeConfig.roles.primary.length > 8 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  +{typeConfig.roles.primary.length - 8} mas
                </Badge>
              )}
            </div>
          </div>
        )}
        {typeConfig.roles.support.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Soporte</h4>
            <div className="flex flex-wrap gap-1">
              {typeConfig.roles.support.map(role => {
                const gc = getRoleGroupConfig(role);
                return (
                  <Badge key={role} variant="outline" className={`text-xs ${gc.color}`}>
                    {getRoleLabel(role)}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Assignment Card
// ============================================================

function AssignmentCard({
  assignment,
  canEdit,
  onStatusChange,
  onCancel,
  formatCurrency,
}: {
  assignment: ProjectAssignment;
  canEdit: boolean;
  onStatusChange: (status: AssignmentStatus) => void;
  onCancel: () => void;
  formatCurrency: (amount: number | undefined, currency?: string) => string;
}) {
  const transitions = STATUS_TRANSITIONS[assignment.status] || [];
  const statusColor = ASSIGNMENT_STATUS_COLORS[assignment.status] || '';
  const paymentLabel = formatCurrency(assignment.paymentAmount, assignment.paymentCurrency);
  const groupConfig = getRoleGroupConfig(assignment.roleId);

  return (
    <div className="border rounded-lg p-3 flex items-start gap-3">
      {/* Avatar with group color */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${groupConfig.bgColor} ${groupConfig.color}`}>
        {(assignment.user?.full_name || '?')[0]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">
            {assignment.user?.full_name || 'Sin nombre'}
          </span>
          <Badge className={`text-xs ${statusColor}`}>
            {ASSIGNMENT_STATUS_LABELS[assignment.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Badge variant="outline" className={`text-xs ${groupConfig.color}`}>
            {getRoleLabel(assignment.roleId)}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {groupConfig.label}
          </Badge>
          <span className="text-muted-foreground/60">|</span>
          <span>Fase {assignment.phase}</span>
          {paymentLabel && (
            <>
              <span className="text-muted-foreground/60">|</span>
              <span className="font-medium">{paymentLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {canEdit && transitions.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <SearchableSelect
            value=""
            onValueChange={(val) => onStatusChange(val as AssignmentStatus)}
            options={transitions.map(t => ({ value: t, label: ASSIGNMENT_STATUS_LABELS[t] }))}
            placeholder="Accion..."
            triggerClassName="h-7 min-w-[100px] text-xs"
          />
          {assignment.status !== 'paid' && assignment.status !== 'approved' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onCancel}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
