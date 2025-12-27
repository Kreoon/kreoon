import { Input } from '@/components/ui/input';
import { FieldRow } from '../components/SectionCard';
import { TabProps } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock } from 'lucide-react';

interface DatesTabProps extends TabProps {}

export function DatesTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions
}: DatesTabProps) {
  const canEditDates = permissions.can('content.dates', 'edit');

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Fecha Inicial */}
      <FieldRow label="Fecha Inicial" icon={Calendar}>
        {editMode && canEditDates ? (
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
          />
        ) : (
          <p className="font-medium">{formatDate(content?.start_date)}</p>
        )}
      </FieldRow>

      {/* Fecha Límite */}
      <FieldRow label="Fecha Límite" icon={Clock}>
        {editMode && canEditDates ? (
          <Input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
          />
        ) : (
          <p className="font-medium">{formatDate(content?.deadline)}</p>
        )}
      </FieldRow>

      {/* Fecha de Grabación - Read only */}
      <FieldRow label="Fecha de Grabación">
        <p className="font-medium">{formatDate(content?.recorded_at)}</p>
      </FieldRow>

      {/* Fecha Entregado - Read only */}
      <FieldRow label="Fecha Entregado">
        <p className="font-medium">{formatDate(content?.delivered_at)}</p>
      </FieldRow>

      {/* Fecha Aprobado - Read only */}
      <FieldRow label="Fecha Aprobado">
        <p className="font-medium">{formatDate(content?.approved_at)}</p>
      </FieldRow>

      {/* Creado - Read only */}
      <FieldRow label="Creado">
        <p className="font-medium">{formatDate(content?.created_at)}</p>
      </FieldRow>
    </div>
  );
}
