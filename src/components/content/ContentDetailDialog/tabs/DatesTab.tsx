import { Input } from '@/components/ui/input';
import { FieldRow } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { Calendar, Clock, CheckCircle, AlertCircle, Play, Edit3, Eye, Send, CreditCard, Sparkles } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS } from '@/types/database';

interface StatusTimestamp {
  status: string;
  label: string;
  field: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const STATUS_TIMESTAMPS: StatusTimestamp[] = [
  { status: 'draft', label: 'Borrador', field: 'draft_at', icon: Edit3, color: 'text-gray-500' },
  { status: 'script_pending', label: 'Guión Pendiente', field: 'script_pending_at', icon: Clock, color: 'text-amber-500' },
  { status: 'script_approved', label: 'Guión Aprobado', field: 'script_approved_at_v2', icon: CheckCircle, color: 'text-green-500' },
  { status: 'assigned', label: 'Asignado', field: 'assigned_at', icon: Send, color: 'text-blue-500' },
  { status: 'recording', label: 'En Grabación', field: 'recording_at', icon: Play, color: 'text-orange-500' },
  { status: 'recorded', label: 'Grabado', field: 'recorded_at', icon: CheckCircle, color: 'text-emerald-500' },
  { status: 'editing', label: 'En Edición', field: 'editing_at', icon: Edit3, color: 'text-purple-500' },
  { status: 'review', label: 'En Revisión', field: 'review_at', icon: Eye, color: 'text-cyan-500' },
  { status: 'issue', label: 'Con Problema', field: 'issue_at', icon: AlertCircle, color: 'text-red-500' },
  { status: 'approved', label: 'Aprobado', field: 'approved_at_v2', icon: CheckCircle, color: 'text-green-600' },
  { status: 'delivered', label: 'Entregado', field: 'delivered_at', icon: Send, color: 'text-blue-600' },
  { status: 'published', label: 'Publicado', field: 'published_at', icon: Sparkles, color: 'text-pink-500' },
  { status: 'paid', label: 'Pagado', field: 'paid_at_v2', icon: CreditCard, color: 'text-emerald-600' },
];

export function DatesTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  readOnly = false,
}: TabProps) {
  const canEditDates = permissions.can('content.dates', 'edit') && !readOnly;
  const effectiveEditMode = editMode && !readOnly;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Sin fecha';
    return format(new Date(date), "d 'de' MMMM, yyyy HH:mm", { locale: es });
  };

  const formatDateShort = (date: string | null | undefined) => {
    if (!date) return null;
    return format(new Date(date), "d MMM, HH:mm", { locale: es });
  };

  const getRelativeTime = (date: string | null | undefined) => {
    if (!date) return null;
    return formatDistanceToNow(new Date(date), { locale: es, addSuffix: true });
  };

  // Get status timestamps from content
  const getStatusTimestamps = () => {
    return STATUS_TIMESTAMPS.map(st => ({
      ...st,
      timestamp: (content as any)?.[st.field] || null
    })).filter(st => st.timestamp);
  };

  const statusTimestamps = getStatusTimestamps();

  // Calculate time between states
  const calculateDuration = (startField: string, endField: string) => {
    const startDate = (content as any)?.[startField];
    const endDate = (content as any)?.[endField];
    if (!startDate || !endDate) return null;
    
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Primary Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deadline */}
        <FieldRow label="Fecha de Entrega" icon={Calendar}>
          <EditableField
            permissions={permissions}
            resource="content.dates"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Input
                type="date"
                value={formData.deadline || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              />
            }
            viewComponent={<p className="font-medium">{formatDate(formData.deadline || content?.deadline)}</p>}
          />
        </FieldRow>

        {/* Created At (read-only) */}
        <FieldRow label="Fecha de Creación">
          <p className="font-medium">{formatDate(content?.created_at)}</p>
        </FieldRow>
      </div>

      {/* Status Timeline */}
      {statusTimestamps.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historial de Estados
          </h3>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-3">
              {statusTimestamps.map((st, index) => {
                const Icon = st.icon;
                const isLast = index === statusTimestamps.length - 1;
                const prevTimestamp = index > 0 ? statusTimestamps[index - 1] : null;
                const duration = prevTimestamp 
                  ? calculateDuration(prevTimestamp.field, st.field)
                  : null;

                return (
                  <div key={st.field} className="relative flex items-start gap-3 pl-1">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-background border-2 ${isLast ? 'border-primary' : 'border-border'}`}>
                      <Icon className={`h-3.5 w-3.5 ${st.color}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={isLast ? 'default' : 'secondary'} className="text-xs">
                          {st.label}
                        </Badge>
                        {duration && (
                          <span className="text-xs text-muted-foreground">
                            +{duration}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {formatDateShort(st.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          ({getRelativeTime(st.timestamp)})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {content?.created_at && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(content as any)?.draft_at && content?.recorded_at && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Tiempo a Grabación</p>
              <p className="text-lg font-semibold text-foreground">
                {calculateDuration('draft_at', 'recorded_at') || '-'}
              </p>
            </div>
          )}
          
          {content?.recorded_at && (content as any)?.delivered_at && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Tiempo de Edición</p>
              <p className="text-lg font-semibold text-foreground">
                {calculateDuration('recorded_at', 'delivered_at') || '-'}
              </p>
            </div>
          )}

          {(content as any)?.draft_at && (content as any)?.approved_at_v2 && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Tiempo Total</p>
              <p className="text-lg font-semibold text-foreground">
                {calculateDuration('draft_at', 'approved_at_v2') || '-'}
              </p>
            </div>
          )}

          {(content as any)?.issue_at && (
            <div className="bg-destructive/10 rounded-lg p-3 text-center">
              <p className="text-xs text-destructive mb-1">Última Corrección</p>
              <p className="text-sm font-medium text-destructive">
                {formatDateShort((content as any).issue_at)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}