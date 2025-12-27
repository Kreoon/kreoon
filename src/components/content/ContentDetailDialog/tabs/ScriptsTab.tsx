import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductSelector } from '@/components/products/ProductSelector';
import { ProductDetailDialog } from '@/components/products/ProductDetailDialog';
import { StrategistScriptForm } from '@/components/content/StrategistScriptForm';
import { PermissionsGate } from '../blocks/PermissionsGate';
import { RoleBlock, RoleBlocksContainer } from '../components/RoleBlock';
import { SectionCard } from '../components/SectionCard';
import { TabProps, SCRIPT_BLOCKS } from '../types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, CheckCircle, Lock } from 'lucide-react';

interface ScriptsTabProps extends TabProps {
  selectedProduct: any;
  onProductChange: (productId: string) => void;
}

export function ScriptsTab({
  content,
  formData,
  setFormData,
  editMode,
  setEditMode,
  permissions,
  onUpdate,
  loading,
  setLoading,
  selectedProduct,
  onProductChange
}: ScriptsTabProps) {
  const { toast } = useToast();
  const { user, isClient } = useAuth();
  const [showProductDialog, setShowProductDialog] = useState(false);

  const canEditScripts = permissions.can('content.scripts', 'edit');
  const isReadOnly = permissions.isReadOnly('content.scripts');

  // Handle script approval for clients
  const handleApproveScript = async () => {
    if (!content) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('content')
        .update({ 
          script_approved_at: new Date().toISOString(),
          script_approved_by: user?.id 
        })
        .eq('id', content.id);
      if (error) throw error;
      toast({ 
        title: 'Guión aprobado', 
        description: 'El contenido ahora está en estado "Guión Aprobado"' 
      });
      onUpdate?.();
    } catch (error) {
      toast({ title: 'Error al aprobar guión', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Handle script generated callback
  const handleScriptGenerated = (generatedContent: any) => {
    setFormData((prev) => ({
      ...prev,
      ...(generatedContent.script ? { script: generatedContent.script } : {}),
      ...(generatedContent.editor_guidelines ? { editor_guidelines: generatedContent.editor_guidelines } : {}),
      ...(generatedContent.strategist_guidelines ? { strategist_guidelines: generatedContent.strategist_guidelines } : {}),
      ...(generatedContent.trafficker_guidelines ? { trafficker_guidelines: generatedContent.trafficker_guidelines } : {}),
      ...(generatedContent.designer_guidelines ? { designer_guidelines: generatedContent.designer_guidelines } : {}),
      ...(generatedContent.admin_guidelines ? { admin_guidelines: generatedContent.admin_guidelines } : {}),
    }));
    setEditMode(true);
    toast({
      title: 'Contenido generado',
      description: 'Se actualizó el contenido en sus campos a medida que se generaba',
    });
  };

  return (
    <div className="space-y-6">
      {/* Product Selector and Script Generator - Only for those who can edit */}
      <PermissionsGate 
        permissions={permissions} 
        resource="content.scripts" 
        action="edit"
      >
        <SectionCard title="Producto Asociado" iconEmoji="📦">
          {editMode ? (
            <div className="max-w-md">
              <ProductSelector
                clientId={formData.client_id}
                value={formData.product_id}
                onChange={onProductChange}
                onCreateNew={() => setShowProductDialog(true)}
              />
            </div>
          ) : selectedProduct ? (
            <div className="p-3 rounded-lg border bg-muted/50 inline-flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">{selectedProduct.name}</span>
              {formData.sales_angle && (
                <Badge variant="secondary">{formData.sales_angle}</Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin producto asociado</p>
          )}
        </SectionCard>

        {/* Strategist Script Form */}
        <StrategistScriptForm
          product={selectedProduct}
          contentId={content?.id || ''}
          onScriptGenerated={handleScriptGenerated}
        />
      </PermissionsGate>

      {/* Read-only mode notice */}
      {isReadOnly && editMode && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
          <Lock className="h-4 w-4 text-warning" />
          <span>Solo el estratega asignado o un admin pueden editar esta sección</span>
        </div>
      )}

      {/* Script Blocks Container */}
      <RoleBlocksContainer
        blocks={SCRIPT_BLOCKS}
        formData={formData}
        setFormData={setFormData}
        editMode={editMode}
        canEdit={canEditScripts}
      />

      {/* Script Approval for Clients */}
      {isClient && content?.script && !content?.script_approved_at && (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-success/5 to-success/10 mt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="font-medium">Aprobar Guión</p>
              <p className="text-xs text-muted-foreground">
                Al aprobar, el contenido pasará automáticamente al estado "Guión Aprobado"
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            className="bg-success hover:bg-success/90"
            onClick={handleApproveScript}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Aprobar
          </Button>
        </div>
      )}
      
      {isClient && content?.script_approved_at && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Guión aprobado el {format(new Date(content.script_approved_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}</span>
        </div>
      )}

      {/* Product Dialog */}
      <ProductDetailDialog
        product={null}
        clientId={formData.client_id}
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        onSave={() => {}}
      />
    </div>
  );
}
