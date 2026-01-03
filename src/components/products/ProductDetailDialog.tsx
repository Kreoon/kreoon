import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ProductDocumentUploader } from "./ProductDocumentUploader";
import { ProductBriefWizard } from "./ProductBriefWizard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Package, FileText, Users, Target, Save, 
  File, FolderOpen, Plus, X, Sparkles, ClipboardList
} from "lucide-react";

interface Product {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  strategy: string | null;
  market_research: string | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url: string | null;
  onboarding_url: string | null;
  research_url: string | null;
  brief_file_url: string | null;
  onboarding_file_url: string | null;
  research_file_url: string | null;
  brief_status?: string | null;
  brief_data?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProductDetailDialogProps {
  product: Product | null;
  clientId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function ProductDetailDialog({ 
  product, 
  clientId,
  open, 
  onOpenChange, 
  onSave 
}: ProductDetailDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newAngle, setNewAngle] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    strategy: "",
    market_research: "",
    ideal_avatar: "",
    sales_angles: [] as string[],
    brief_url: "",
    onboarding_url: "",
    research_url: "",
    brief_file_url: "",
    onboarding_file_url: "",
    research_file_url: "",
  });

  const isNew = !product;

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        strategy: product.strategy || "",
        market_research: product.market_research || "",
        ideal_avatar: product.ideal_avatar || "",
        sales_angles: product.sales_angles || [],
        brief_url: product.brief_url || "",
        onboarding_url: product.onboarding_url || "",
        research_url: product.research_url || "",
        brief_file_url: product.brief_file_url || "",
        onboarding_file_url: product.onboarding_file_url || "",
        research_file_url: product.research_file_url || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        strategy: "",
        market_research: "",
        ideal_avatar: "",
        sales_angles: [],
        brief_url: "",
        onboarding_url: "",
        research_url: "",
        brief_file_url: "",
        onboarding_file_url: "",
        research_file_url: "",
      });
    }
  }, [product, open]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }

    const targetClientId = product?.client_id || clientId;
    if (!targetClientId) {
      toast({ title: "Falta el cliente", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        strategy: formData.strategy || null,
        market_research: formData.market_research || null,
        ideal_avatar: formData.ideal_avatar || null,
        sales_angles: formData.sales_angles.length > 0 ? formData.sales_angles : null,
        brief_url: formData.brief_url || null,
        onboarding_url: formData.onboarding_url || null,
        research_url: formData.research_url || null,
        brief_file_url: formData.brief_file_url || null,
        onboarding_file_url: formData.onboarding_file_url || null,
        research_file_url: formData.research_file_url || null,
        client_id: targetClientId,
      };

      if (isNew) {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
        toast({ title: "Producto creado" });
      } else {
        const { error } = await supabase
          .from('products')
          .update(data)
          .eq('id', product.id);
        if (error) throw error;
        toast({ title: "Producto actualizado" });
      }

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addSalesAngle = () => {
    if (newAngle.trim() && !formData.sales_angles.includes(newAngle.trim())) {
      setFormData({
        ...formData,
        sales_angles: [...formData.sales_angles, newAngle.trim()]
      });
      setNewAngle("");
    }
  };

  const removeSalesAngle = (angle: string) => {
    setFormData({
      ...formData,
      sales_angles: formData.sales_angles.filter(a => a !== angle)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto pb-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {isNew ? "Nuevo Producto" : formData.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={isNew ? "info" : "brief"} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="brief" className="gap-1">
              <ClipboardList className="h-3 w-3" />
              Brief IA
            </TabsTrigger>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="strategy">Estrategia</TabsTrigger>
            <TabsTrigger value="avatar">Avatar & Ángulos</TabsTrigger>
            <TabsTrigger value="files">Archivos</TabsTrigger>
          </TabsList>

          <TabsContent value="brief" className="mt-4">
            {product ? (
              <ProductBriefWizard
                productId={product.id}
                productName={formData.name}
                existingBrief={product.brief_data as any}
                onComplete={() => {
                  toast({ title: "Investigación generada", description: "Los datos del producto han sido actualizados con IA" });
                  onSave?.();
                }}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Guarda el producto primero para acceder al Brief con IA</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nombre del Producto *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Curso de Marketing Digital"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <RichTextEditor
                content={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder="Describe el producto..."
                className="min-h-[150px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" /> Estrategia de Contenido
              </Label>
              <RichTextEditor
                content={formData.strategy}
                onChange={(html) => setFormData({ ...formData, strategy: html })}
                placeholder="Define la estrategia de contenido para este producto..."
                className="min-h-[200px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Investigación de Mercado
              </Label>
              <RichTextEditor
                content={formData.market_research}
                onChange={(html) => setFormData({ ...formData, market_research: html })}
                placeholder="Información de la investigación de mercado..."
                className="min-h-[200px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="avatar" className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Avatar Ideal
              </Label>
              <RichTextEditor
                content={formData.ideal_avatar}
                onChange={(html) => setFormData({ ...formData, ideal_avatar: html })}
                placeholder="Describe el cliente ideal: demografía, dolores, deseos, objeciones..."
                className="min-h-[200px]"
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Ángulos de Venta
              </Label>
              <p className="text-sm text-muted-foreground">
                Define los diferentes ángulos de venta que se pueden usar en los guiones
              </p>
              
              <div className="flex gap-2">
                <Input
                  value={newAngle}
                  onChange={(e) => setNewAngle(e.target.value)}
                  placeholder="Ej: Urgencia, Escasez, Transformación..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSalesAngle())}
                />
                <Button type="button" onClick={addSalesAngle} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.sales_angles.map((angle, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                    {angle}
                    <button
                      type="button"
                      onClick={() => removeSalesAngle(angle)}
                      className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {formData.sales_angles.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay ángulos definidos</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-6 mt-4">
            <p className="text-sm text-muted-foreground">
              Sube documentos directamente o agrega enlaces de Google Drive
            </p>

            <ProductDocumentUploader
              label="Brief / Onboarding"
              icon={<File className="h-4 w-4" />}
              fileUrl={formData.brief_file_url}
              driveUrl={formData.brief_url}
              productId={product?.id}
              productName={formData.name}
              documentType="brief"
              onFileUrlChange={(url) => setFormData({ ...formData, brief_file_url: url })}
              onDriveUrlChange={(url) => setFormData({ ...formData, brief_url: url })}
              disabled={!isAdmin}
            />

            <ProductDocumentUploader
              label="Documentos de Onboarding"
              icon={<FolderOpen className="h-4 w-4" />}
              fileUrl={formData.onboarding_file_url}
              driveUrl={formData.onboarding_url}
              productId={product?.id}
              productName={formData.name}
              documentType="onboarding"
              onFileUrlChange={(url) => setFormData({ ...formData, onboarding_file_url: url })}
              onDriveUrlChange={(url) => setFormData({ ...formData, onboarding_url: url })}
              disabled={!isAdmin}
            />

            <ProductDocumentUploader
              label="Investigación / Recursos"
              icon={<FileText className="h-4 w-4" />}
              fileUrl={formData.research_file_url}
              driveUrl={formData.research_url}
              productId={product?.id}
              productName={formData.name}
              documentType="research"
              onFileUrlChange={(url) => setFormData({ ...formData, research_file_url: url })}
              onDriveUrlChange={(url) => setFormData({ ...formData, research_url: url })}
              disabled={!isAdmin}
            />
          </TabsContent>
        </Tabs>

        {isAdmin && (
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {isNew ? "Crear Producto" : "Guardar Cambios"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
