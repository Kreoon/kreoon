import { Input } from '@/components/ui/input';
import { FieldRow } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function DatesTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
}: TabProps) {
  const canEditDates = permissions.can('content.dates', 'edit');

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Sin fecha';
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fecha de Inicio */}
        <FieldRow label="Fecha de Inicio" icon={Calendar}>
          <EditableField
            permissions={permissions}
            resource="content.dates"
            editMode={editMode}
            editComponent={
              <Input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            }
            viewComponent={<p className="font-medium">{formatDate(formData.start_date || content?.start_date)}</p>}
          />
        </FieldRow>

        {/* Deadline */}
        <FieldRow label="Fecha de Entrega" icon={Calendar}>
          <EditableField
            permissions={permissions}
            resource="content.dates"
            editMode={editMode}
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

        {/* Recorded At (read-only) */}
        <FieldRow label="Fecha de Grabación">
          <p className="font-medium">{formatDate(content?.recorded_at)}</p>
        </FieldRow>

        {/* Delivered At (read-only) */}
        <FieldRow label="Fecha de Entrega Real">
          <p className="font-medium">{formatDate(content?.delivered_at)}</p>
        </FieldRow>

        {/* Approved At (read-only) */}
        <FieldRow label="Fecha de Aprobación">
          <p className="font-medium">{formatDate(content?.approved_at)}</p>
        </FieldRow>

        {/* Created At (read-only) */}
        <FieldRow label="Fecha de Creación">
          <p className="font-medium">{formatDate(content?.created_at)}</p>
        </FieldRow>
      </div>
    </div>
  );
}
