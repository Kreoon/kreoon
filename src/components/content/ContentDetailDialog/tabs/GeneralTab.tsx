import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductSelector } from '@/components/products/ProductSelector';
import { ProductDetailDialog } from '@/components/products/ProductDetailDialog';
import { ReadOnlyWrapper } from '../blocks/PermissionsGate';
import { SectionCard, FieldRow, ReadonlyField } from '../components/SectionCard';
import { useContentPermissions } from '../hooks/useContentPermissions';
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
  userRole,
  organizationId,
  selectedProduct,
  onProductChange
}: GeneralTabProps) {
  const permissions = useContentPermissions({ organizationId, role: userRole });
  const canEditGeneral = permissions.can('general', 'edit');
  const [showProductDialog, setShowProductDialog] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Producto */}
        <FieldRow>
          <Label className="text-muted-foreground text-xs flex items-center gap-2">
            <Package className="h-3 w-3" /> Producto
          </Label>
          {editMode && canEditGeneral ? (
            <ProductSelector
              clientId={formData.client_id || content?.client_id || null}
              value={formData.product_id}
              onChange={(productId) => onProductChange(productId)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-medium">{selectedProduct?.name || content?.product || "—"}</p>
              {selectedProduct && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowProductDialog(true)}
                  className="h-6 px-2 text-xs"
                >
                  Ver info
                </Button>
              )}
            </div>
          )}
        </FieldRow>

        {/* Ángulo de Ventas */}
        <FieldRow>
          <Label className="text-muted-foreground text-xs flex items-center gap-2">
            <Target className="h-3 w-3" /> Ángulo de Ventas
          </Label>
          {editMode && canEditGeneral ? (
            <Input
              value={formData.sales_angle || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, sales_angle: e.target.value }))}
              placeholder="Ej: Dolor, Beneficio, Urgencia..."
            />
          ) : (
            <ReadonlyField value={formData.sales_angle || content?.sales_angle} />
          )}
        </FieldRow>

        {/* Descripción */}
        <FieldRow className="md:col-span-2">
          <Label className="text-muted-foreground text-xs flex items-center gap-2">
            <FileText className="h-3 w-3" /> Descripción
          </Label>
          {editMode && canEditGeneral ? (
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción del contenido..."
            />
          ) : (
            <ReadonlyField value={formData.description || content?.description} />
          )}
        </FieldRow>

        {/* Semana de Campaña */}
        <FieldRow>
          <Label className="text-muted-foreground text-xs">Semana de Campaña</Label>
          {editMode && canEditGeneral ? (
            <Input
              value={formData.campaign_week || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, campaign_week: e.target.value }))}
              placeholder="Ej: Semana 1, Q1 2024..."
            />
          ) : (
            <ReadonlyField value={formData.campaign_week || content?.campaign_week} />
          )}
        </FieldRow>

        {/* URL de Referencia */}
        <FieldRow>
          <Label className="text-muted-foreground text-xs flex items-center gap-2">
            <LinkIcon className="h-3 w-3" /> URL de Referencia
          </Label>
          {editMode && canEditGeneral ? (
            <Input
              value={formData.reference_url || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, reference_url: e.target.value }))}
              placeholder="https://..."
            />
          ) : formData.reference_url ? (
            <a 
              href={formData.reference_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver referencia <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <ReadonlyField value={null} />
          )}
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
