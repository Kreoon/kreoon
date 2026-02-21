import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, AlertCircle, Play, Edit3, Eye, Send, CreditCard, Sparkles, User } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedTabProps } from '../types';

// Status icon/color mapping for content projects
const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  draft: { label: 'Borrador', icon: Edit3, color: 'text-gray-500' },
  script_pending: { label: 'Guión Pendiente', icon: Clock, color: 'text-amber-500' },
  script_approved: { label: 'Guión Aprobado', icon: CheckCircle, color: 'text-green-500' },
  assigned: { label: 'Asignado', icon: Send, color: 'text-blue-500' },
  recording: { label: 'En Grabación', icon: Play, color: 'text-orange-500' },
  recorded: { label: 'Grabado', icon: CheckCircle, color: 'text-emerald-500' },
  editing: { label: 'En Edición', icon: Edit3, color: 'text-purple-500' },
  review: { label: 'En Revisión', icon: Eye, color: 'text-cyan-500' },
  issue: { label: 'Con Problema', icon: AlertCircle, color: 'text-red-500' },
  approved: { label: 'Aprobado', icon: CheckCircle, color: 'text-green-600' },
  delivered: { label: 'Entregado', icon: Send, color: 'text-blue-600' },
  published: { label: 'Publicado', icon: Sparkles, color: 'text-pink-500' },
  paid: { label: 'Pagado', icon: CreditCard, color: 'text-emerald-600' },
};

interface HistoryRecord {
  id: string;
  old_status: string | null;
  new_status: string;
  user_id: string | null;
  created_at: string;
  userName?: string;
}

export default function DatesTab({ project, formData, setFormData, editMode, readOnly }: UnifiedTabProps) {
  const isEditing = editMode && !readOnly;
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  // Fetch content_history with user profiles for content projects
  const contentId = project.source === 'content' ? project.id : null;

  useEffect(() => {
    if (!contentId) return;

    const fetchHistory = async () => {
      const { data: history } = await supabase
        .from('content_history')
        .select('id, old_status, new_status, user_id, created_at')
        .eq('content_id', contentId)
        .order('created_at', { ascending: true });

      if (!history?.length) {
        setHistoryRecords([]);
        return;
      }

      // Collect unique user IDs and fetch profiles
      const userIds = [...new Set(history.map(h => h.user_id).filter(Boolean))] as string[];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Usuario']));
        }
      }

      setHistoryRecords(
        history.map(h => ({
          ...h,
          userName: h.user_id ? profileMap[h.user_id] || 'Usuario' : undefined,
        }))
      );
    };

    fetchHistory();
  }, [contentId]);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateShort = (date: string | null | undefined) => {
    if (!date) return null;
    return format(new Date(date), "d MMM, HH:mm", { locale: es });
  };

  const getRelativeTime = (date: string | null | undefined) => {
    if (!date) return null;
    return formatDistanceToNow(new Date(date), { locale: es, addSuffix: true });
  };

  const calculateDurationBetween = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  /** Extract YYYY-MM-DD from an ISO string or date string without UTC conversion. */
  const toInputDate = (val: string | null | undefined): string => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dateFields = [
    {
      key: project.source === 'content' ? 'start_date' : 'started_at',
      label: 'Fecha de inicio',
      icon: Calendar,
      value: formData.start_date || formData.started_at || project.startDate,
    },
    {
      key: 'deadline',
      label: 'Fecha de entrega',
      icon: Clock,
      value: formData.deadline || project.deadline,
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Fechas
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dateFields.map(field => {
          const Icon = field.icon;
          return (
            <div key={field.key} className="border rounded-lg p-4">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                <Icon className="h-4 w-4" />
                {field.label}
              </label>

              {isEditing ? (
                <Input
                  type="date"
                  value={toInputDate(field.value)}
                  onChange={(e) => setFormData((prev: Record<string, any>) => ({
                    ...prev,
                    [field.key]: e.target.value || null,
                  }))}
                  className="text-sm"
                />
              ) : (
                <p className="text-sm font-medium">{formatDate(field.value)}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Status History Timeline (content projects only) */}
      {historyRecords.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historial de Estados
          </h3>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-3">
              {historyRecords.map((record, index) => {
                const config = STATUS_CONFIG[record.new_status];
                const Icon = config?.icon || Edit3;
                const color = config?.color || 'text-gray-500';
                const label = config?.label || record.new_status.replace(/_/g, ' ');
                const isLast = index === historyRecords.length - 1;
                const prevRecord = index > 0 ? historyRecords[index - 1] : null;
                const duration = prevRecord
                  ? calculateDurationBetween(prevRecord.created_at, record.created_at)
                  : null;

                return (
                  <div key={record.id} className="relative flex items-start gap-3 pl-1">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-background border-2 ${isLast ? 'border-primary' : 'border-border'}`}>
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                    </div>

                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={isLast ? 'default' : 'secondary'} className="text-xs">
                          {label}
                        </Badge>
                        {duration && (
                          <span className="text-xs text-muted-foreground">
                            +{duration}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {formatDateShort(record.created_at)}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          ({getRelativeTime(record.created_at)})
                        </span>
                      </div>
                      {/* User who made the change */}
                      {record.userName && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <User className="h-3 w-3 text-muted-foreground/70" />
                          <span className="text-xs text-muted-foreground">
                            {record.userName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="border-t pt-4 space-y-2 text-xs text-muted-foreground">
        <p>Creado: {formatDate(project.createdAt)}</p>
        <p>Actualizado: {formatDate(project.updatedAt)}</p>
      </div>
    </div>
  );
}
