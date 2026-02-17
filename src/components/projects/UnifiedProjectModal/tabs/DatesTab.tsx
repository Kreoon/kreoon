import { Input } from '@/components/ui/input';
import { Calendar, Clock } from 'lucide-react';
import type { UnifiedTabProps } from '../types';

export default function DatesTab({ project, formData, setFormData, editMode, readOnly }: UnifiedTabProps) {
  const isEditing = editMode && !readOnly;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData((prev: Record<string, any>) => ({
                    ...prev,
                    [field.key]: e.target.value ? new Date(e.target.value).toISOString() : null,
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

      {/* Timestamps */}
      <div className="border-t pt-4 space-y-2 text-xs text-muted-foreground">
        <p>Creado: {formatDate(project.createdAt)}</p>
        <p>Actualizado: {formatDate(project.updatedAt)}</p>
      </div>
    </div>
  );
}
