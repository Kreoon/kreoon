import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ProductDocumentUploader } from "./ProductDocumentUploader";
import ProductDNADisplay from "@/components/product-dna/ProductDNADisplay";
import type { ProductDNARecord } from "@/components/product-dna/ProductDNADisplay";
import {
  generateFullResearch,
  pollResearchProgress,
  updateProductDNA,
} from "@/lib/services/product-dna.service";
import {
  MarketOverviewTab,
  JTBDAnalysisTab,
  AvatarSegmentationTab,
  CompetitionAnalysisTab,
  DifferentiationTab,
  StrategicPlaybookTab,
  ExecutiveSummaryTab,
  SalesAnglesTab,
  PUVTransformationTab,
  LeadMagnetsCreativesTab,
  ContentCalendarTab,
  LaunchStrategyTab,
} from "./strategy-tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUnifiedTokens } from "@/hooks/useUnifiedTokens";
import { useSubscription } from "@/hooks/useSubscription";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { AI_TOKEN_COSTS, getPlanById } from "@/lib/finance/constants";
import {
  Package, FileText, Users, Target, Save,
  File, FolderOpen, Plus, X, Sparkles, Dna,
  Globe, Swords, Lightbulb, Brain, Trophy, Gift, Download, Calendar, Rocket, ExternalLink,
  RefreshCw, Mic, Check, Coins, AlertTriangle
} from "lucide-react";
import { generateProductResearchPdf } from "./productResearchPdfGenerator";
import { CreateContentFromResearchDialog } from "./CreateContentFromResearchDialog";

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
  business_type?: 'product_service' | 'personal_brand' | null;
  competitor_analysis?: any | null;
  avatar_profiles?: any | null;
  sales_angles_data?: any | null;
  content_strategy?: any | null;
  content_calendar?: any | null;
  launch_strategy?: any | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProductDetailDialogProps {
  product: Product | null;
  clientId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  /** Llamado cuando la investigación IA termina - refresca el producto sin cerrar */
  onResearchComplete?: (updatedProduct: Product) => void;
  readOnly?: boolean;
}

export function ProductDetailDialog({ 
  product, 
  clientId,
  open, 
  onOpenChange, 
  onSave,
  onResearchComplete,
  readOnly = false
}: ProductDetailDialogProps) {
  const { toast } = useToast();
  const { user, profile, isAdmin, isClient } = useAuth();
  const { isOrgOwner, isPlatformRoot } = useOrgOwner();
  const canEdit = isAdmin && !readOnly;
  const [loading, setLoading] = useState(false);
  const [newAngle, setNewAngle] = useState("");

  // ── Obtener organización del cliente del producto ──
  const productClientId = product?.client_id || clientId;
  const { data: clientOrg } = useQuery({
    queryKey: ['client-org', productClientId],
    queryFn: async () => {
      if (!productClientId) return null;
      const { data } = await supabase
        .from('clients')
        .select('organization_id')
        .eq('id', productClientId)
        .single();
      return data?.organization_id || null;
    },
    enabled: !!productClientId && !isClient,
    staleTime: 10 * 60 * 1000, // 10 min
  });

  // ── Token access control for ADN Recargado ──
  // Para admins: usar organización del cliente del producto
  // Para clientes: usar undefined (busca por user_id)
  const effectiveOrgId = isClient ? undefined : (clientOrg || profile?.current_organization_id || undefined);
  const { balance, checkCanConsume, balanceLoading } = useUnifiedTokens(effectiveOrgId);
  const { subscription } = useSubscription(effectiveOrgId);
  const RESEARCH_COST = AI_TOKEN_COSTS["research.full"]; // 600

  // Monthly usage count for clients (count research.full transactions this month)
  const { data: monthlyUsageCount } = useQuery({
    queryKey: ['adn-monthly-usage', user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('unified_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('action_type', 'research.full')
        .eq('executed_by', user!.id)
        .gte('created_at', startOfMonth.toISOString());

      return count || 0;
    },
    enabled: !!user?.id && isClient,
    staleTime: 2 * 60 * 1000,
  });

  // Determine plan limits for clients
  const planDef = getPlanById(subscription?.tier || 'marcas-free');
  const monthlyLimit = planDef?.adnRecargadosPerMonth;
  const limitReached = isClient && monthlyLimit !== null && monthlyLimit !== undefined
    && (monthlyUsageCount || 0) >= monthlyLimit;
  const planDisabled = isClient && monthlyLimit === 0;

  // Token sufficiency check
  const totalTokens = balance
    ? (balance.subscription_tokens ?? 0) + (balance.purchased_tokens ?? 0) + (balance.bonus_tokens ?? 0)
    : 0;
  const hasEnoughTokens = totalTokens >= RESEARCH_COST;

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

  // Product DNA record (fetched from product_dna table)
  const [dnaRecord, setDnaRecord] = useState<ProductDNARecord | null>(null);
  const [dnaLoading, setDnaLoading] = useState(false);

  // Full research generation state
  const [researchGenerating, setResearchGenerating] = useState(false);
  const [researchProgress, setResearchProgress] = useState<{
    step: number;
    total: number;
    label: string;
  } | null>(null);
  const [researchStartTime, setResearchStartTime] = useState<number | null>(null);
  const [researchElapsed, setResearchElapsed] = useState(0);
  const lastRefetchedStepRef = useRef(0);

  // Content creation dialog state
  const [showContentDialog, setShowContentDialog] = useState(false);

  const isNew = !product;

  // Fetch product_dna when dialog opens with a product that has a DNA id
  useEffect(() => {
    const dnaId = (product?.brief_data as any)?.product_dna_id;
    if (!dnaId || !open) {
      setDnaRecord(null);
      return;
    }
    let cancelled = false;
    setDnaLoading(true);
    (supabase as any)
      .from('product_dna')
      .select('*')
      .eq('id', dnaId)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (cancelled) return;
        if (error) console.error('[ProductDNA] fetch error:', error);
        setDnaRecord(data || null);
        setDnaLoading(false);
      });
    return () => { cancelled = true; };
  }, [product?.brief_data, open]);

  // Elapsed timer while generating research
  useEffect(() => {
    if (!researchStartTime) return;
    const timer = setInterval(() => {
      setResearchElapsed(Math.floor((Date.now() - researchStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [researchStartTime]);

  // Reset research state when dialog closes
  useEffect(() => {
    if (!open) {
      setResearchGenerating(false);
      setResearchProgress(null);
      setResearchStartTime(null);
      setResearchElapsed(0);
      lastRefetchedStepRef.current = 0;
    }
  }, [open]);

  const handleGenerateResearch = async (includeClientDna: boolean = true, forceRegenerate: boolean = false) => {
    if (!product?.id || !user?.id) return;

    // Pre-validation: check tokens
    if (!hasEnoughTokens) {
      toast({ title: 'Tokens insuficientes', description: `Necesitas ${RESEARCH_COST} tokens para ADN Recargado.`, variant: 'destructive' });
      return;
    }

    // Pre-validation: check monthly limit for clients
    if (limitReached || planDisabled) {
      toast({ title: 'Límite alcanzado', description: 'Has alcanzado el límite mensual de ADN Recargado de tu plan.', variant: 'destructive' });
      return;
    }

    // Double-check via server
    const canConsume = await checkCanConsume('research.full', isClient ? undefined : effectiveOrgId || undefined);
    if (!canConsume) {
      toast({ title: 'Tokens insuficientes', description: 'No hay tokens disponibles para esta acción.', variant: 'destructive' });
      return;
    }

    setResearchGenerating(true);
    setResearchProgress(null);
    setResearchStartTime(Date.now());
    lastRefetchedStepRef.current = 0;

    // Clear previous research timestamp so polling doesn't think it's already done
    await supabase
      .from('products')
      .update({ research_generated_at: null, research_progress: { step: 0, total: 12, label: 'Iniciando...' } })
      .eq('id', product.id);

    // Small delay to ensure DB update is propagated before polling starts
    await new Promise(r => setTimeout(r, 1000));

    // Start polling progress
    const cancelPoll = pollResearchProgress(
      product.id,
      (progress, done) => {
        setResearchProgress(progress);

        // Check for error from edge function
        if ((progress as any)?.error) {
          setResearchGenerating(false);
          setResearchStartTime(null);
          toast({
            title: 'Error en investigación',
            description: progress?.label || 'Error desconocido',
            variant: 'destructive',
          });
          return;
        }

        // Refetch product on each NEW step to populate tabs live
        if (progress && progress.step > lastRefetchedStepRef.current) {
          lastRefetchedStepRef.current = progress.step;
          (async () => {
            const { data } = await supabase
              .from('products')
              .select('*')
              .eq('id', product.id)
              .single();
            if (data && onResearchComplete) {
              onResearchComplete(data as any);
            }
          })();
        }

        if (done) {
          setResearchGenerating(false);
          setResearchStartTime(null);
          toast({
            title: 'Investigación completada',
            description: 'Se han generado todas las pestañas de estrategia.',
          });
        }
      },
      3000,
      200,
    );

    // Fire the edge function with token context
    console.log('[handleGenerateResearch] Calling with:', { includeClientDna, forceRegenerate });
    const result = await generateFullResearch(product.id, {
      userId: user.id,
      organizationId: effectiveOrgId || undefined,
      isClientUser: isClient,
      includeClientDna,
      forceRegenerate,
    });
    if (!result.success) {
      toast({ title: 'Error al generar investigación', description: result.error, variant: 'destructive' });
      setResearchGenerating(false);
      setResearchStartTime(null);
      cancelPoll();
    }
  };

  const handleDnaSaveSection = async (section: string, data: any): Promise<boolean> => {
    if (!dnaRecord) return false;
    try {
      const result = await updateProductDNA(dnaRecord.id, { [section]: data });
      if (result.success && result.data) {
        setDnaRecord(result.data);
        toast({ title: 'ADN actualizado', description: `Sección "${section}" guardada.` });
        return true;
      }
      toast({ title: 'Error', description: result.error || 'No se pudo guardar', variant: 'destructive' });
      return false;
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
      return false;
    }
  };

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
      // Try ideal_avatar first (stored as JSON string)
      if (product?.ideal_avatar && typeof product.ideal_avatar === 'string') {
        const parsed = JSON.parse(product.ideal_avatar);
        if (parsed?.jtbd) return parsed.jtbd;
      }
    } catch { /* ignore parse error */ }
    // Fallback: try market_research.jtbd
    try {
      const mr = typeof product?.market_research === 'string'
        ? JSON.parse(product.market_research)
        : product?.market_research;
      if (mr?.jtbd) return mr.jtbd;
    } catch { /* ignore */ }
    return null;
  })();

  return (<>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {isNew ? "Nuevo Producto" : (
              <>
                {product?.product_code && <span className="text-primary">#{product.product_code}</span>}
                {' '}{formData.name}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={isNew ? "info" : "brief"} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Tabs en dos filas */}
          <div className="px-6 pt-4 shrink-0 space-y-1">
            {/* Row 1: ADN + steps 1-6 (in research invocation order) */}
            <TabsList className="grid grid-cols-4 sm:grid-cols-7 h-auto gap-1">
              <TabsTrigger value="brief" className="gap-1 text-xs py-2">
                {dnaRecord ? <Check className="h-3 w-3 text-emerald-400" /> : <Dna className="h-3 w-3" />}
                ADN
              </TabsTrigger>
              <TabsTrigger value="market" className="gap-1 text-xs py-2">
                {product?.market_research?.market_overview ? <Check className="h-3 w-3 text-emerald-400" /> : <Globe className="h-3 w-3" />}
                Mercado
              </TabsTrigger>
              <TabsTrigger value="jtbd" className="gap-1 text-xs py-2">
                {product?.market_research?.jtbd ? <Check className="h-3 w-3 text-emerald-400" /> : <Target className="h-3 w-3" />}
                JTBD
              </TabsTrigger>
              <TabsTrigger value="competition" className="gap-1 text-xs py-2">
                {product?.competitor_analysis?.competitors ? <Check className="h-3 w-3 text-emerald-400" /> : <Swords className="h-3 w-3" />}
                Competencia
              </TabsTrigger>
              <TabsTrigger value="avatars" className="gap-1 text-xs py-2">
                {product?.avatar_profiles?.profiles ? <Check className="h-3 w-3 text-emerald-400" /> : <Users className="h-3 w-3" />}
                Avatares
              </TabsTrigger>
              <TabsTrigger value="differentiation" className="gap-1 text-xs py-2">
                {product?.competitor_analysis?.differentiation ? <Check className="h-3 w-3 text-emerald-400" /> : <Lightbulb className="h-3 w-3" />}
                Diferenciación
              </TabsTrigger>
              <TabsTrigger value="esfera" className="gap-1 text-xs py-2">
                {product?.content_strategy?.esferaInsights ? <Check className="h-3 w-3 text-emerald-400" /> : <Brain className="h-3 w-3" />}
                Playbook
              </TabsTrigger>
            </TabsList>
            {/* Row 2: steps 7-12 + utilities */}
            <TabsList className="grid grid-cols-4 sm:grid-cols-8 h-auto gap-1">
              <TabsTrigger value="summary" className="gap-1 text-xs py-2">
                {product?.content_strategy?.executiveSummary ? <Check className="h-3 w-3 text-emerald-400" /> : <FileText className="h-3 w-3" />}
                Conclusión
              </TabsTrigger>
              <TabsTrigger value="angles" className="gap-1 text-xs py-2">
                {product?.sales_angles_data?.angles ? <Check className="h-3 w-3 text-emerald-400" /> : <Sparkles className="h-3 w-3" />}
                Ángulos
              </TabsTrigger>
              <TabsTrigger value="puv" className="gap-1 text-xs py-2">
                {product?.sales_angles_data?.puv ? <Check className="h-3 w-3 text-emerald-400" /> : <Trophy className="h-3 w-3" />}
                PUV
              </TabsTrigger>
              <TabsTrigger value="leads" className="gap-1 text-xs py-2">
                {product?.sales_angles_data?.leadMagnets ? <Check className="h-3 w-3 text-emerald-400" /> : <Gift className="h-3 w-3" />}
                Leads
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1 text-xs py-2">
                {product?.content_calendar ? <Check className="h-3 w-3 text-emerald-400" /> : <Calendar className="h-3 w-3" />}
                Parrilla
              </TabsTrigger>
              <TabsTrigger value="launch" className="gap-1 text-xs py-2">
                {product?.launch_strategy ? <Check className="h-3 w-3 text-emerald-400" /> : <Rocket className="h-3 w-3" />}
                Lanzamiento
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs py-2">Info</TabsTrigger>
              <TabsTrigger value="files" className="text-xs py-2">Archivos</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">

          {/* TabsContent ordered by research invocation flow */}
          <TabsContent value="brief" className="mt-4 space-y-6">
            {product ? (
              dnaLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
                  <p className="text-sm">Cargando ADN de Producto...</p>
                </div>
              ) : dnaRecord ? (
                <>
                  <ProductDNADisplay
                    productDna={dnaRecord}
                    editable={canEdit}
                    onSaveSection={handleDnaSaveSection}
                  />

                  {/* Generate Full Research — KIRO Branded (Solo admins de org pueden activar) */}
                  {dnaRecord.status === 'ready' && (isAdmin || isClient) && (
                    researchGenerating ? (
                      <KiroResearchProgress
                        progress={researchProgress}
                        elapsed={researchElapsed}
                      />
                    ) : (
                      <KiroResearchButton
                        onClick={handleGenerateResearch}
                        tokenCost={RESEARCH_COST}
                        hasEnoughTokens={hasEnoughTokens}
                        balanceLoading={balanceLoading}
                        isClient={isClient}
                        isAdmin={isAdmin || isOrgOwner || isPlatformRoot}
                        monthlyUsageCount={monthlyUsageCount || 0}
                        monthlyLimit={monthlyLimit}
                        limitReached={limitReached || planDisabled}
                        isRegenerate={!!product?.research_generated_at}
                      />
                    )
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Dna className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Sin ADN de Producto</p>
                  <p className="text-sm">
                    Este producto no tiene un ADN generado. Crea uno desde la vista del cliente.
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Dna className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Guarda el producto primero para ver el ADN</p>
              </div>
            )}
          </TabsContent>

          {/* Step 1: Panorama de Mercado */}
          <TabsContent value="market" className="mt-4">
            <MarketOverviewTab marketResearch={(() => {
              try {
                if (!product?.market_research) return null;
                const mr = typeof product.market_research === 'string'
                  ? JSON.parse(product.market_research)
                  : product.market_research;
                return mr?.market_overview || mr;
              } catch {
                return null;
              }
            })()} />
          </TabsContent>

          {/* Steps 2-3: JTBD + Dolores y Deseos */}
          <TabsContent value="jtbd" className="mt-4">
            <JTBDAnalysisTab jtbdData={jtbdData} />
          </TabsContent>

          {/* Step 4: Competencia */}
          <TabsContent value="competition" className="mt-4">
            <CompetitionAnalysisTab competitorAnalysis={product?.competitor_analysis as any} />
          </TabsContent>

          {/* Step 5: Avatares */}
          <TabsContent value="avatars" className="mt-4">
            <AvatarSegmentationTab avatarProfiles={product?.avatar_profiles as any} />
          </TabsContent>

          {/* Step 6: Diferenciación + ESFERA + Conclusión */}
          <TabsContent value="differentiation" className="mt-4">
            <DifferentiationTab differentiation={product?.competitor_analysis?.differentiation as any} />
          </TabsContent>

          <TabsContent value="esfera" className="mt-4">
            <StrategicPlaybookTab
              contentStrategy={product?.content_strategy as any}
              avatarProfiles={product?.avatar_profiles as any}
              salesAnglesData={product?.sales_angles_data as any}
              marketResearch={product?.market_research as any}
            />
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <ExecutiveSummaryTab
              contentStrategy={product?.content_strategy as any}
              productName={formData.name}
            />
          </TabsContent>

          {/* Step 7: Ángulos de Venta */}
          <TabsContent value="angles" className="mt-4">
            <SalesAnglesTab salesAnglesData={product?.sales_angles_data as any} />
          </TabsContent>

          {/* Step 8: PUV y Transformación */}
          <TabsContent value="puv" className="mt-4">
            <PUVTransformationTab salesAnglesData={product?.sales_angles_data as any} />
          </TabsContent>

          {/* Steps 9-10: Lead Magnets + Creativos */}
          <TabsContent value="leads" className="mt-4">
            <LeadMagnetsCreativesTab salesAnglesData={product?.sales_angles_data as any} />
          </TabsContent>

          {/* Step 11: Parrilla de Contenido */}
          <TabsContent value="calendar" className="mt-4">
            <ContentCalendarTab contentCalendar={product?.content_calendar as any} />
          </TabsContent>

          {/* Step 12: Estrategia de Lanzamiento */}
          <TabsContent value="launch" className="mt-4">
            <LaunchStrategyTab launchStrategy={product?.launch_strategy as any} />
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
                  {Array.isArray((product?.content_strategy as any)?.executiveSummary?.keyInsights) && (product?.content_strategy as any)?.executiveSummary?.keyInsights?.slice(0, 3).map((insight: any, idx: number) => (
                    <div key={idx} className="mt-2 text-xs text-muted-foreground">
                      • <strong>{insight.insight || insight.title || ''}</strong>: {insight.action || insight.explanation || ''}
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
              {Array.isArray((product?.sales_angles_data as any)?.angles) && (product?.sales_angles_data as any)?.angles?.length > 0 && (
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
          {/* Research buttons - visible if product has research data */}
          {product && (product.market_research || product.competitor_analysis || product.avatar_profiles || product.sales_angles_data || product.content_strategy) ? (
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={() => window.open(`/research/${product.id}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Investigacion
              </Button>
              <Button
                variant="outline"
                onClick={() => generateProductResearchPdf({ product: product as any })}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                onClick={() => setShowContentDialog(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Crear Contenidos
              </Button>
            </div>
          ) : (
            <div />
          )}

          {canEdit && (
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {isNew ? "Crear Producto" : "Guardar Cambios"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Content creation dialog (from research + DNA) */}
    {product && (
      <CreateContentFromResearchDialog
        open={showContentDialog}
        onOpenChange={setShowContentDialog}
        productId={product.id}
        productName={product.name || 'Producto'}
        clientId={product.client_id || clientId || ''}
        onCreated={(count) => {
          toast({
            title: `${count} creativos creados`,
            description: 'Se han creado en el board con datos del ADN.',
          });
        }}
      />
    )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// KIRO Research — Step definitions for the 12-step progress
// ════════════════════════════════════════════════════════════════════

const KIRO_STEPS = [
  { icon: Globe,     label: 'Mercado' },
  { icon: Target,    label: 'JTBD' },
  { icon: Brain,     label: 'Dolores' },
  { icon: Swords,    label: 'Competencia' },
  { icon: Users,     label: 'Avatares' },
  { icon: Lightbulb, label: 'ESFERA' },
  { icon: Sparkles,  label: 'Ángulos' },
  { icon: Trophy,    label: 'PUV' },
  { icon: Gift,      label: 'Leads' },
  { icon: Rocket,    label: 'Creativos' },
  { icon: Calendar,  label: 'Parrilla' },
  { icon: FileText,  label: 'Lanzamiento' },
];

// ════════════════════════════════════════════════════════════════════
// KIRO Research Button — Idle state with KIRO eye CTA
// ════════════════════════════════════════════════════════════════════

function KiroResearchButton({
  onClick,
  tokenCost,
  hasEnoughTokens,
  balanceLoading,
  isClient,
  isAdmin,
  monthlyUsageCount,
  monthlyLimit,
  limitReached,
  isRegenerate = false,
}: {
  onClick: (includeClientDna: boolean, forceRegenerate: boolean) => void;
  tokenCost: number;
  hasEnoughTokens: boolean;
  balanceLoading: boolean;
  isClient: boolean;
  isAdmin?: boolean;
  monthlyUsageCount: number;
  monthlyLimit?: number | null;
  limitReached: boolean;
  isRegenerate?: boolean;
}) {
  const [includeClientDna, setIncludeClientDna] = useState(true);

  // Admins, propietarios de organización, o clientes pueden activar (clientes tienen límites mensuales)
  const canActivate = isAdmin || isClient;
  const disabled = !canActivate || !hasEnoughTokens || limitReached || balanceLoading;

  const tooltipMessage = balanceLoading
    ? 'Verificando Kreoon Coins...'
    : !canActivate
      ? 'Solo administradores de la organización pueden activar ADN Recargado'
      : limitReached
        ? monthlyLimit === 0
          ? 'Tu plan no incluye ADN Recargado'
          : `Límite mensual alcanzado (${monthlyUsageCount}/${monthlyLimit})`
        : !hasEnoughTokens
          ? `Kreoon Coins insuficientes (necesitas ${tokenCost})`
          : '';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/60 via-black/40 to-pink-950/60 p-6">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex items-center gap-5">
        {/* KIRO eye icon */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 -m-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-black/80 backdrop-blur-xl flex items-center justify-center border border-white/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                <Dna className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            ADN Recargado
          </h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            KIRO combina ADN de Marca + ADN de Producto para generar la investigación completa de 12 pasos.
          </p>
          {/* Checkbox para incluir ADN de Marca */}
          <label className="flex items-center gap-2 mt-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeClientDna}
              onChange={(e) => setIncludeClientDna(e.target.checked)}
              className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/30 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0"
            />
            <span className="text-[11px] text-gray-400 group-hover:text-gray-300 transition-colors">
              Incluir ADN de Marca (Client DNA)
            </span>
          </label>
          {/* Kreoon Coins cost + monthly usage info */}
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-300/80 bg-purple-500/10 px-2 py-0.5 rounded-full">
              <Coins className="w-3 h-3" />
              {tokenCost} Kreoon Coins
            </span>
            {isClient && monthlyLimit !== null && monthlyLimit !== undefined && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                limitReached
                  ? 'text-red-300 bg-red-500/10'
                  : 'text-emerald-300/80 bg-emerald-500/10'
              }`}>
                {monthlyUsageCount}/{monthlyLimit === 0 ? 0 : monthlyLimit} este mes
              </span>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <button
                  onClick={disabled ? undefined : () => onClick(includeClientDna, isRegenerate)}
                  disabled={disabled}
                  className={`relative group flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-300 flex items-center gap-2
                    ${disabled
                      ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:scale-105'
                    }`}
                >
                  {disabled ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : isRegenerate ? (
                    <RefreshCw className="w-4 h-4 group-hover:animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4 group-hover:animate-bounce" />
                  )}
                  {isRegenerate ? 'Recrear' : 'Activar'}
                </button>
              </div>
            </TooltipTrigger>
            {disabled && tooltipMessage && (
              <TooltipContent side="top" className="bg-gray-900 text-gray-200 border-gray-700">
                <p>{tooltipMessage}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Step preview dots */}
      <div className="relative mt-4 flex items-center justify-between gap-1 px-1">
        {KIRO_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex flex-col items-center gap-1 opacity-30">
              <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Icon className="w-3 h-3 text-gray-500" />
              </div>
              <span className="text-[8px] text-gray-600 hidden sm:block">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// KIRO Research Progress — Animated progress with KIRO branding
// ════════════════════════════════════════════════════════════════════

function KiroResearchProgress({
  progress,
  elapsed,
}: {
  progress: { step: number; total: number; label: string } | null;
  elapsed: number;
}) {
  const currentStep = progress?.step ?? 0;
  const totalSteps = progress?.total ?? 12;
  const pct = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 3;
  const minutes = Math.floor(elapsed / 60);
  const seconds = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/80 via-black/60 to-pink-950/80">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 w-80 h-80 -translate-x-1/2 -translate-y-1/2"
          style={{ animation: 'kiroOrbit 8s linear infinite' }}
        >
          <div className="absolute top-0 left-1/2 w-2 h-2 rounded-full bg-purple-400/40 blur-[1px]" />
          <div className="absolute bottom-0 right-1/3 w-1.5 h-1.5 rounded-full bg-pink-400/30 blur-[1px]" />
          <div className="absolute top-1/3 right-0 w-1 h-1 rounded-full bg-purple-300/50" />
        </div>
        <div className="absolute top-4 right-8 w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
        <div className="absolute bottom-6 left-12 w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative p-6 space-y-5">
        {/* Header: KIRO eye + status */}
        <div className="flex items-center gap-4">
          {/* Pulsing KIRO eye */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 -m-2 rounded-full bg-purple-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-0 -m-1 rounded-full bg-purple-500/10 animate-pulse" />
            <div
              className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-[2px]"
              style={{ animation: 'kiroBreath 3s ease-in-out infinite' }}
            >
              <div className="w-full h-full rounded-full bg-black/80 backdrop-blur-xl flex items-center justify-center border border-white/10">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.6)]">
                    <Mic className="w-3.5 h-3.5 text-white" />
                  </div>
                  {/* Reflection */}
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-1 bg-gradient-to-b from-white/50 to-transparent rounded-full blur-[0.5px]" />
                </div>
              </div>
            </div>
          </div>

          {/* Status text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              KIRO está investigando
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-purple-400"
                    style={{ animation: `kiroDots 1.4s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </span>
            </p>
            <p className="text-xs text-purple-300/80 mt-0.5 truncate">
              {progress?.label || 'Preparando análisis de mercado...'}
            </p>
            <p className="text-[10px] text-gray-500 mt-1 font-mono">
              {minutes}:{seconds}
            </p>
          </div>

          {/* Percentage badge */}
          <div className="flex-shrink-0 text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {Math.round(pct)}%
            </div>
            <p className="text-[10px] text-gray-500">
              {currentStep}/{totalSteps}
            </p>
          </div>
        </div>

        {/* Segmented progress bar */}
        <div className="flex gap-1">
          {KIRO_STEPS.map((_, i) => {
            const isDone = i < currentStep;
            const isActive = i === currentStep;
            return (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/5"
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isDone
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 w-full'
                      : isActive
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 w-1/2 animate-pulse'
                        : 'w-0'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Step icons row */}
        <div className="flex items-center justify-between gap-1">
          {KIRO_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isDone = i < currentStep;
            const isActive = i === currentStep;

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isDone
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                      : isActive
                        ? 'bg-gradient-to-br from-purple-500/80 to-pink-500/80 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                        : 'bg-white/5 border border-white/10'
                  }`}
                  style={isActive ? { animation: 'kiroStepPulse 2s ease-in-out infinite' } : undefined}
                >
                  {isDone ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <Icon className={`w-3 h-3 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  )}
                </div>
                <span className={`text-[8px] transition-colors duration-300 hidden sm:block ${
                  isDone ? 'text-purple-400' : isActive ? 'text-white font-medium' : 'text-gray-600'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
