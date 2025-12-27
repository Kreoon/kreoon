import { Input } from '@/components/ui/input';
import { FieldRow } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { Target, FileText, Link as LinkIcon, ExternalLink } from 'lucide-react';

interface GeneralTabProps extends TabProps {
  selectedProduct: any;
  onProductChange: (productId: string) => void;
}

export function GeneralTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  selectedProduct,
  onProductChange,
  readOnly = false,
}: GeneralTabProps) {
  const canEditGeneral = permissions.can('content.general', 'edit') && !readOnly;
  const effectiveEditMode = editMode && !readOnly;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ángulo de Ventas */}
        <FieldRow label="Ángulo de Ventas" icon={Target}>
          <EditableField
            permissions={permissions}
            resource="content.general"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Input
                value={formData.sales_angle || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_angle: e.target.value }))}
                placeholder="Ej: Dolor, Beneficio, Urgencia..."
              />
            }
            viewComponent={<p className="font-medium">{formData.sales_angle || '—'}</p>}
          />
        </FieldRow>

        {/* Descripción */}
        <FieldRow label="Descripción" icon={FileText}>
          <EditableField
            permissions={permissions}
            resource="content.general"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del contenido..."
              />
            }
            viewComponent={<p className="font-medium">{formData.description || '—'}</p>}
          />
        </FieldRow>

        {/* Semana de Campaña */}
        <FieldRow label="Semana de Campaña">
          <EditableField
            permissions={permissions}
            resource="content.general"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Input
                value={formData.campaign_week || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, campaign_week: e.target.value }))}
                placeholder="Ej: Semana 1, Q1 2024..."
              />
            }
            viewComponent={<p className="font-medium">{formData.campaign_week || '—'}</p>}
          />
        </FieldRow>

        {/* URL de Referencia */}
        <FieldRow label="URL de Referencia" icon={LinkIcon}>
          <EditableField
            permissions={permissions}
            resource="content.general"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Input
                value={formData.reference_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_url: e.target.value }))}
                placeholder="https://..."
              />
            }
            viewComponent={
              formData.reference_url ? (
                <a href={formData.reference_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Ver referencia <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="font-medium">—</p>
              )
            }
          />
        </FieldRow>
      </div>
    </div>
  );
}
