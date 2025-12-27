import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductSelector } from '@/components/products/ProductSelector';
import { ProductDetailDialog } from '@/components/products/ProductDetailDialog';
import { StrategistScriptForm } from '@/components/content/StrategistScriptForm';
import { TeleprompterMode } from '@/components/content/TeleprompterMode';
import { ScriptBlocksContainer } from '../components/ScriptBlock';
import { SectionCard, FieldRow } from '../components/SectionCard';
import { PermissionsGate, EditableField } from '../components/PermissionsGate';
import { TabProps, SCRIPT_BLOCKS } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
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
  selectedProduct,
  onProductChange,
}: ScriptsTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterContent, setTeleprompterContent] = useState('');

  const canEditScripts = permissions.can('content.scripts', 'edit');
  const hasScript = !!formData.script?.trim();

  // Approve script (for clients)
  const handleApproveScript = async () => {
    if (!content?.id) return;
    try {
      const { error } = await supabase
        .from('content')
        .update({
          script_approved_at: new Date().toISOString(),
          script_approved_by: user?.id,
        })
        .eq('id', content.id);

      if (error) throw error;
      toast({ title: 'Guión aprobado' });
      onUpdate?.();
    } catch (err) {
      toast({ title: 'Error al aprobar', variant: 'destructive' });
    }
  };

  // Handle script generation from StrategistScriptForm
  const handleScriptGenerated = (generated: {
    script: string;
    editor_guidelines: string;
    trafficker_guidelines: string;
    strategist_guidelines: string;
    designer_guidelines: string;
    admin_guidelines: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      script: generated.script,
      editor_guidelines: generated.editor_guidelines,
      trafficker_guidelines: generated.trafficker_guidelines,
      strategist_guidelines: generated.strategist_guidelines,
      designer_guidelines: generated.designer_guidelines,
      admin_guidelines: generated.admin_guidelines,
    }));
    if (!editMode) setEditMode(true);
    toast({ title: 'Guión generado', description: 'Revisa y edita los bloques' });
  };

  // Open teleprompter
  const handleTeleprompter = (scriptContent: string) => {
    setTeleprompterContent(scriptContent);
    setShowTeleprompter(true);
  };

  return (
    <div className="space-y-6">
      {/* Product Selection + Script Generator */}
      <PermissionsGate
        permissions={permissions}
        resource="content.scripts"
        action="edit"
        showLockOnReadOnly={false}
      >
        <SectionCard title="Producto y Generador" iconEmoji="📦">
          <div className="space-y-4">
            <FieldRow label="Producto asociado" icon={Package}>
              {editMode && canEditScripts ? (
                <ProductSelector
                  clientId={formData.client_id || content?.client_id || null}
                  value={formData.product_id}
                  onChange={onProductChange}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {selectedProduct?.name || content?.product || '—'}
                  </span>
                  {selectedProduct && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowProductDialog(true)}
                    >
                      Ver info
                    </Button>
                  )}
                </div>
              )}
            </FieldRow>

            {/* Script Generator */}
            {canEditScripts && selectedProduct && content?.id && (
              <StrategistScriptForm
                product={selectedProduct}
                contentId={content.id}
                onScriptGenerated={handleScriptGenerated}
              />
            )}
          </div>
        </SectionCard>
      </PermissionsGate>

      {/* Read-only notice */}
      {!canEditScripts && editMode && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
          <Lock className="h-4 w-4 text-warning" />
          <span>Solo puedes ver estos bloques, no editarlos</span>
        </div>
      )}

      {/* Script Blocks by Role */}
      <ScriptBlocksContainer
        blocks={SCRIPT_BLOCKS}
        formData={formData}
        setFormData={setFormData}
        editMode={editMode}
        permissions={permissions}
        onTeleprompter={handleTeleprompter}
      />

      {/* Script Approval (for clients) */}
      <PermissionsGate
        permissions={permissions}
        resource="content.status"
        action="approve"
        showLockOnReadOnly={false}
      >
        {hasScript && !content?.script_approved_at ? (
          <SectionCard title="Aprobación de Guión" variant="highlight">
            <p className="text-sm text-muted-foreground mb-3">
              ¿El guión está listo para producción?
            </p>
            <Button onClick={handleApproveScript} className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar Guión
            </Button>
          </SectionCard>
        ) : content?.script_approved_at ? (
          <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm">Guión aprobado</span>
            <Badge variant="secondary" className="ml-auto">
              {new Date(content.script_approved_at).toLocaleDateString()}
            </Badge>
          </div>
        ) : null}
      </PermissionsGate>

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

      {/* Teleprompter Modal */}
      <TeleprompterMode
        content={teleprompterContent}
        isOpen={showTeleprompter}
        onClose={() => setShowTeleprompter(false)}
      />
    </div>
  );
}
