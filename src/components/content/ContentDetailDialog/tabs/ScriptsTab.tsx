import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RichTextEditor, RichTextViewer } from '@/components/ui/rich-text-editor';
import { ScriptViewer } from '@/components/content/ScriptViewer';
import { ProductSelector } from '@/components/products/ProductSelector';
import { ProductDetailDialog } from '@/components/products/ProductDetailDialog';
import { StrategistScriptForm } from '@/components/content/StrategistScriptForm';
import { PermissionsGate, ReadOnlyWrapper, ActionButton } from '../blocks/PermissionsGate';
import { RoleBlock, RoleBlocksContainer } from '../components/RoleBlock';
import { SectionCard } from '../components/SectionCard';
import { useContentPermissions } from '../hooks/useContentPermissions';
import { TabProps, SCRIPT_BLOCKS } from '../types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, Video, Megaphone, Target, Image, Calendar,
  Package, CheckCircle, Lock
} from 'lucide-react';

interface ScriptsTabProps extends TabProps {
  selectedProduct: any;
  onProductChange: (productId: string) => void;
  onShowProductDialog: () => void;
}

export function ScriptsTab({
  content,
  formData,
  setFormData,
  editMode,
  setEditMode,
  userRole,
  userId,
  organizationId,
  onUpdate,
  selectedProduct,
  onProductChange,
  onShowProductDialog
}: ScriptsTabProps) {
  const { toast } = useToast();
  const permissions = useContentPermissions({ organizationId, role: userRole });
  const [loading, setLoading] = useState(false);
  const [showProductDialogLocal, setShowProductDialogLocal] = useState(false);

  const canEditScripts = permissions.can('scripts', 'edit');
  const isReadOnly = permissions.isReadOnly('scripts');
  const isClient = userRole === 'client';

  // Handle script approval for clients
  const handleApproveScript = async () => {
    if (!content) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('content')
        .update({ 
          script_approved_at: new Date().toISOString(),
          script_approved_by: userId 
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
    setFormData((prev: any) => ({
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

  const getGuidelinesValue = (key: string): string => {
    const formDataKey = key as keyof typeof formData;
    return (formData[formDataKey] as string) || '';
  };

  const setGuidelinesValue = (key: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Product Selector and Script Generator - Only for those who can edit */}
      <PermissionsGate 
        permissions={permissions} 
        resource="scripts" 
        action="edit"
        showMessage={false}
      >
        <SectionCard 
          title="Producto Asociado" 
          icon={<Package className="h-4 w-4" />}
        >
          {editMode ? (
            <div className="max-w-md">
              <ProductSelector
                clientId={formData.client_id}
                value={formData.product_id}
                onChange={onProductChange}
                onCreateNew={() => setShowProductDialogLocal(true)}
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

      {/* Inner Tabs for the 6 blocks */}
      <Tabs defaultValue="creador" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-1 mb-4">
          {SCRIPT_BLOCKS.map((block) => (
            <TabsTrigger key={block.key} value={block.key} className="text-xs px-2 py-1.5 gap-1">
              {block.key === 'creador' && <FileText className="h-3 w-3" />}
              {block.key === 'editor' && <Video className="h-3 w-3" />}
              {block.key === 'trafficker' && <Megaphone className="h-3 w-3" />}
              {block.key === 'estratega' && <Target className="h-3 w-3" />}
              {block.key === 'disenador' && <Image className="h-3 w-3" />}
              {block.key === 'admin' && <Calendar className="h-3 w-3" />}
              <span className="hidden sm:inline">{block.title.split(' ')[0]}</span>
              <span className="sm:hidden">{block.emoji}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Block 1: Creador (Script) */}
        <TabsContent value="creador" className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" /> 🧍‍♂️ Bloque Creador (Guión)
            </h4>
            {content?.script_approved_at && (
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Aprobado {format(new Date(content.script_approved_at), "d MMM, HH:mm", { locale: es })}
              </Badge>
            )}
          </div>
          
          <ReadOnlyWrapper readOnly={!canEditScripts || !editMode}>
            {editMode && canEditScripts ? (
              <RichTextEditor
                content={formData.script || ''}
                onChange={(html) => setFormData((prev: any) => ({ ...prev, script: html }))}
                placeholder="Escribe el guión aquí..."
                className="min-h-[300px]"
              />
            ) : formData.script || content?.script ? (
              <ScriptViewer 
                content={formData.script || content?.script || ''} 
                maxHeight="max-h-[500px]"
              />
            ) : (
              <div className="min-h-[150px] rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 flex items-center justify-center">
                <div className="text-center space-y-2 p-8">
                  <div className="text-3xl">📝</div>
                  <p className="text-sm text-muted-foreground">Sin guión disponible</p>
                  <p className="text-xs text-muted-foreground/70">Genera un guión con IA o escribe uno manualmente</p>
                </div>
              </div>
            )}
          </ReadOnlyWrapper>
          
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
        </TabsContent>

        {/* Other blocks: Editor, Trafficker, Estratega, Diseñador, Admin */}
        {SCRIPT_BLOCKS.slice(1).map((block) => (
          <TabsContent key={block.key} value={block.key} className="space-y-3">
            <RoleBlock
              title={`${block.emoji} ${block.title}`}
              icon={
                block.key === 'editor' ? <Video className="h-4 w-4 text-blue-500" /> :
                block.key === 'trafficker' ? <Megaphone className="h-4 w-4 text-green-500" /> :
                block.key === 'estratega' ? <Target className="h-4 w-4 text-purple-500" /> :
                block.key === 'disenador' ? <Image className="h-4 w-4 text-pink-500" /> :
                <Calendar className="h-4 w-4 text-orange-500" />
              }
              content={getGuidelinesValue(block.guidelinesKey)}
              readOnly={!canEditScripts || !editMode}
              placeholder={block.placeholder}
              onSave={(html) => setGuidelinesValue(block.guidelinesKey, html)}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Product Dialog */}
      <ProductDetailDialog
        product={null}
        clientId={formData.client_id}
        open={showProductDialogLocal}
        onOpenChange={setShowProductDialogLocal}
        onSave={() => {}}
      />
    </div>
  );
}
