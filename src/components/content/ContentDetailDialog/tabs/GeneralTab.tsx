import { Input } from '@/components/ui/input';
import { ProductSelector } from '@/components/products/ProductSelector';
import { ProductDetailDialog } from '@/components/products/ProductDetailDialog';
import { FieldRow } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { useState } from 'react';
import { Package, Target, FileText, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  // Combine permissions with readOnly prop for effective edit capability
  const canEditGeneral = permissions.can('content.general', 'edit') && !readOnly;
  const effectiveEditMode = editMode && !readOnly;
  const [showProductDialog, setShowProductDialog] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Producto */}
        <FieldRow label="Producto" icon={Package}>
          <EditableField
            permissions={permissions}
            resource="content.general"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <ProductSelector
                clientId={formData.client_id || content?.client_id || null}
                value={formData.product_id}
                onChange={onProductChange}
              />
            }
            viewComponent={
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedProduct?.name || content?.product || '—'}</span>
                {selectedProduct && (
                  <Button variant="ghost" size="sm" onClick={() => setShowProductDialog(true)} className="h-6 px-2 text-xs">
                    Ver info
                  </Button>
                )}
              </div>
            }
          />
        </FieldRow>

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
        <FieldRow label="Descripción" icon={FileText} className="md:col-span-2">
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

      {/* Product Dialog */}
      {selectedProduct && (
        <ProductDetailDialog
          product={selectedProduct}
          clientId={formData.client_id}
          open={showProductDialog}
          onOpenChange={setShowProductDialog}
          onSave={() => {}}
        />
      )}
    </div>
  );
}
