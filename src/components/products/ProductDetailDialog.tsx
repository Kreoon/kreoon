import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ProductDocumentUploader } from "./ProductDocumentUploader";
import { ProductBriefWizard } from "./ProductBriefWizard";
import {
  MarketOverviewTab,
  JTBDAnalysisTab,
  AvatarSegmentationTab,
  CompetitionAnalysisTab,
  DifferentiationTab,
  NeuromarketingTab,
  ExecutiveSummaryTab,
  SalesAnglesTab,
  PUVTransformationTab,
  LeadMagnetsCreativesTab,
} from "./strategy-tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Package, FileText, Users, Target, Save, 
  File, FolderOpen, Plus, X, Sparkles, ClipboardList,
  Globe, Briefcase, Swords, Lightbulb, Brain, Trophy, Gift, Video, Download
} from "lucide-react";
import { generateProductResearchPdf } from "./productResearchPdfGenerator";

interface Product {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  strategy: string | null;
  market_research: any | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url: string | null;
  onboarding_url: string | null;
  research_url: string | null;
  brief_file_url: string | null;
  onboarding_file_url: string | null;
  research_file_url: string | null;
  brief_status?: string | null;
  brief_data?: any;
  competitor_analysis?: any | null;
  avatar_profiles?: any | null;
  sales_angles_data?: any | null;
  content_strategy?: any | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProductDetailDialogProps {
  product: Product | null;
  clientId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

export function ProductDetailDialog({ 
  product, 
  clientId,
  open, 
  onOpenChange, 
  onSave,
  readOnly = false
}: ProductDetailDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const canEdit = isAdmin && !readOnly;
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
        market_research: typeof product.market_research === 'string' ? product.market_research : "",
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

  // Extract JTBD data from ideal_avatar if it's stored as JSON
  const jtbdData = (() => {
    try {
      if (product?.ideal_avatar && typeof product.ideal_avatar === 'string') {
        const parsed = JSON.parse(product.ideal_avatar);
        return parsed.jtbd || null;
      }
    } catch {
      return null;
    }
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {isNew ? "Nuevo Producto" : formData.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={isNew ? "info" : "brief"} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Tabs en dos filas */}
          <div className="px-6 pt-4 shrink-0 space-y-1">
            <TabsList className="grid grid-cols-7 h-auto gap-1">
              <TabsTrigger value="brief" className="gap-1 text-xs py-2">
                <ClipboardList className="h-3 w-3" />
                Brief IA
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-1 text-xs py-2">
                <FileText className="h-3 w-3" />
                Conclusión
              </TabsTrigger>
              <TabsTrigger value="market" className="gap-1 text-xs py-2">
                <Globe className="h-3 w-3" />
                Mercado
              </TabsTrigger>
              <TabsTrigger value="jtbd" className="gap-1 text-xs py-2">
                <Target className="h-3 w-3" />
                JTBD
              </TabsTrigger>
              <TabsTrigger value="avatars" className="gap-1 text-xs py-2">
                <Users className="h-3 w-3" />
                Avatares
              </TabsTrigger>
              <TabsTrigger value="competition" className="gap-1 text-xs py-2">
                <Swords className="h-3 w-3" />
                Competencia
              </TabsTrigger>
              <TabsTrigger value="differentiation" className="gap-1 text-xs py-2">
                <Lightbulb className="h-3 w-3" />
                Diferenciación
              </TabsTrigger>
            </TabsList>
            <TabsList className="grid grid-cols-6 h-auto gap-1">
              <TabsTrigger value="esfera" className="gap-1 text-xs py-2">
                <Brain className="h-3 w-3" />
                Esfera
              </TabsTrigger>
              <TabsTrigger value="angles" className="gap-1 text-xs py-2">
                <Sparkles className="h-3 w-3" />
                Ángulos
              </TabsTrigger>
              <TabsTrigger value="puv" className="gap-1 text-xs py-2">
                <Trophy className="h-3 w-3" />
                PUV
              </TabsTrigger>
              <TabsTrigger value="leads" className="gap-1 text-xs py-2">
                <Gift className="h-3 w-3" />
                Leads
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs py-2">Info</TabsTrigger>
              <TabsTrigger value="files" className="text-xs py-2">Archivos</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">

          <TabsContent value="brief" className="mt-4 space-y-6">
            {/* Optional Document Uploader */}
            {product && canEdit && (
              <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Documentos del Producto (Opcional)
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Sube documentos adicionales para enriquecer la investigación con IA
                </p>
                <ProductDocumentUploader
                  label="Documento de Producto"
                  icon={<FileText className="h-4 w-4" />}
                  fileUrl={formData.research_file_url}
                  driveUrl={formData.research_url}
                  productId={product?.id}
                  productName={formData.name}
                  documentType="research"
                  onFileUrlChange={(url) => setFormData({ ...formData, research_file_url: url })}
                  onDriveUrlChange={(url) => setFormData({ ...formData, research_url: url })}
                  disabled={!canEdit}
                />
              </div>
            )}
            
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

          <TabsContent value="summary" className="mt-4">
            <ExecutiveSummaryTab 
              contentStrategy={product?.content_strategy as any} 
              productName={formData.name}
            />
          </TabsContent>

          <TabsContent value="market" className="mt-4">
            <MarketOverviewTab marketResearch={(() => {
              try {
                if (!product?.market_research) return null;
                if (typeof product.market_research === 'string') {
                  return JSON.parse(product.market_research);
                }
                return product.market_research;
              } catch {
                return null;
              }
            })()} />
          </TabsContent>

          <TabsContent value="jtbd" className="mt-4">
            <JTBDAnalysisTab jtbdData={jtbdData} />
          </TabsContent>

          <TabsContent value="avatars" className="mt-4">
            <AvatarSegmentationTab avatarProfiles={product?.avatar_profiles as any} />
          </TabsContent>

          <TabsContent value="competition" className="mt-4">
            <CompetitionAnalysisTab competitorAnalysis={product?.competitor_analysis as any} />
          </TabsContent>

          <TabsContent value="differentiation" className="mt-4">
            <DifferentiationTab differentiation={product?.competitor_analysis?.differentiation as any} />
          </TabsContent>

          <TabsContent value="esfera" className="mt-4">
            <NeuromarketingTab contentStrategy={product?.content_strategy as any} />
          </TabsContent>

          <TabsContent value="angles" className="mt-4">
            <SalesAnglesTab salesAnglesData={product?.sales_angles_data as any} />
          </TabsContent>

          <TabsContent value="puv" className="mt-4">
            <PUVTransformationTab salesAnglesData={product?.sales_angles_data as any} />
          </TabsContent>

          <TabsContent value="leads" className="mt-4">
            <LeadMagnetsCreativesTab salesAnglesData={product?.sales_angles_data as any} />
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
              <Label>Descripción del Producto</Label>
              {/* AI-Generated Description from content_strategy */}
              {(product?.content_strategy as any)?.executiveSummary?.marketSummary && (
                <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">Descripción generada por IA</span>
                  </div>
                  <p className="text-sm leading-relaxed">{(product?.content_strategy as any)?.executiveSummary?.marketSummary}</p>
                  {(product?.content_strategy as any)?.executiveSummary?.keyInsights?.slice(0, 3).map((insight: any, idx: number) => (
                    <div key={idx} className="mt-2 text-xs text-muted-foreground">
                      • <strong>{insight.insight}</strong>: {insight.action}
                    </div>
                  ))}
                </div>
              )}
              <RichTextEditor
                content={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder="Describe el producto manualmente o genera la investigación para obtener una descripción automática..."
                className="min-h-[150px]"
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Ángulos de Venta
              </Label>
              <p className="text-sm text-muted-foreground">
                Ángulos de venta generados por IA y personalizados
              </p>
              
              {/* AI Generated Angles */}
              {(product?.sales_angles_data as any)?.angles?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">🤖 Generados por IA ({(product?.sales_angles_data as any)?.angles?.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {(product?.sales_angles_data as any)?.angles?.slice(0, 10).map((angleData: any, idx: number) => (
                      <Badge key={`ai-${idx}`} variant="outline" className="text-xs">
                        {typeof angleData === 'string' ? angleData : angleData?.angle || angleData?.type || `Ángulo ${idx + 1}`}
                      </Badge>
                    ))}
                    {(product?.sales_angles_data as any)?.angles?.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{(product?.sales_angles_data as any)?.angles?.length - 10} más
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Manual Angles */}
              <div className="flex gap-2">
                <Input
                  value={newAngle}
                  onChange={(e) => setNewAngle(e.target.value)}
                  placeholder="Agregar ángulo personalizado..."
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
                {formData.sales_angles.length === 0 && !(product?.sales_angles_data as any)?.angles?.length && (
                  <p className="text-sm text-muted-foreground">No hay ángulos definidos. Genera la investigación para obtener ángulos con IA.</p>
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
              disabled={!canEdit}
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
              disabled={!canEdit}
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
              disabled={!canEdit}
            />
          </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between items-center pt-4 pb-4 border-t mt-4 shrink-0 px-6">
          {/* Export PDF Button - Always visible if product exists */}
          {product && (product.market_research || product.competitor_analysis || product.avatar_profiles || product.sales_angles_data || product.content_strategy) && (
            <Button 
              variant="outline" 
              onClick={() => generateProductResearchPdf({ product: product as any })}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          )}
          {!product && <div />}
          
          {canEdit && (
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {isNew ? "Crear Producto" : "Guardar Cambios"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
