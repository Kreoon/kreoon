import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldRow, ReadonlyField } from '../components/SectionCard';
import { useContentPermissions } from '../hooks/useContentPermissions';
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
  userRole,
  organizationId
}: DatesTabProps) {
  const permissions = useContentPermissions({ organizationId, role: userRole });
  const canEditDates = permissions.can('dates', 'edit');

  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Fecha Inicial */}
      <FieldRow>
        <Label className="text-muted-foreground text-xs flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Fecha Inicial
        </Label>
        {editMode && canEditDates ? (
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, start_date: e.target.value }))}
          />
        ) : (
          <p className="font-medium">{formatDate(content?.start_date)}</p>
        )}
      </FieldRow>

      {/* Fecha Límite */}
      <FieldRow>
        <Label className="text-muted-foreground text-xs flex items-center gap-1">
          <Clock className="h-3 w-3" /> Fecha Límite
        </Label>
        {editMode && canEditDates ? (
          <Input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, deadline: e.target.value }))}
          />
        ) : (
          <p className="font-medium">{formatDate(content?.deadline)}</p>
        )}
      </FieldRow>

      {/* Fecha de Grabación - Read only */}
      <FieldRow>
        <Label className="text-muted-foreground text-xs">Fecha de Grabación</Label>
        <p className="font-medium">{formatDate(content?.recorded_at)}</p>
      </FieldRow>

      {/* Fecha Entregado - Read only */}
      <FieldRow>
        <Label className="text-muted-foreground text-xs">Fecha Entregado</Label>
        <p className="font-medium">{formatDate(content?.delivered_at)}</p>
      </FieldRow>

      {/* Fecha Aprobado - Read only */}
      <FieldRow>
        <Label className="text-muted-foreground text-xs">Fecha Aprobado</Label>
        <p className="font-medium">{formatDate(content?.approved_at)}</p>
      </FieldRow>

      {/* Creado - Read only */}
      <FieldRow>
        <Label className="text-muted-foreground text-xs">Creado</Label>
        <p className="font-medium">{formatDate(content?.created_at)}</p>
      </FieldRow>
    </div>
  );
}
