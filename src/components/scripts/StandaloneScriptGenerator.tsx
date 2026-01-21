import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useScriptPrompts, DEFAULT_SCRIPT_PROMPTS } from "@/hooks/useScriptPrompts";
import { ProductResearchSelector } from "./ProductResearchSelector";
import { 
  Sparkles, Loader2, Target, Users, Globe, FileText, 
  Plus, X, Wand2, Settings2,
  Video, ChevronDown, CheckCircle2, 
  Package, Lightbulb, Copy, Download, AlertCircle, Database, Webhook
} from "lucide-react";
import { sanitizeHTML } from "@/lib/sanitizeHTML";

interface GeneratedContent {
  script: string;
  editor_guidelines?: string;
  strategist_guidelines?: string;
  trafficker_guidelines?: string;
  designer_guidelines?: string;
  admin_guidelines?: string;
}

interface StandaloneFormData {
  product_name: string;
  product_description: string;
  product_strategy: string;
  market_research: string;
  ideal_avatar: string;
  sales_angles: string;
  brand_name: string;
  brand_tone: string;
  cta: string;
  sales_angle: string;
  hooks_count: string;
  target_country: string;
  narrative_structure: string;
  additional_instructions: string;
  hooks: string[];
  brief_content: string;
  research_content: string;
  reference_transcription: string;
  video_strategies: string;
}

interface GenerationStep {
  key: "script" | "editor" | "strategist" | "trafficker" | "designer" | "admin";
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

interface WebhookConfig {
  script: string;
  editor: string;
  trafficker: string;
  strategist: string;
  designer: string;
  admin: string;
}

const NARRATIVE_STRUCTURES = [
  { value: "problema-solucion", label: "Problema → Solución" },
  { value: "historia-personal", label: "Historia Personal" },
  { value: "antes-despues", label: "Antes/Después" },
  { value: "tutorial", label: "Tutorial paso a paso" },
  { value: "testimonio", label: "Testimonio" },
  { value: "urgencia", label: "Urgencia/Escasez" },
  { value: "educativo", label: "Educativo/Informativo" },
  { value: "entretenimiento", label: "Entretenimiento" },
];

const COUNTRIES = [
  "México", "Colombia", "Argentina", "España", "Chile", "Perú", "Estados Unidos (Latino)", "Global", "Otro",
];

const BRAND_TONES = [
  { value: "cercano", label: "Cercano y amigable" },
  { value: "profesional", label: "Profesional y serio" },
  { value: "energico", label: "Enérgico y dinámico" },
  { value: "inspirador", label: "Inspirador y motivacional" },
  { value: "educativo", label: "Educativo y experto" },
  { value: "divertido", label: "Divertido y casual" },
  { value: "lujo", label: "Premium y exclusivo" },
];

export function StandaloneScriptGenerator() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id;
  
  const [loading, setLoading] = useState(false);
  const [newHook, setNewHook] = useState("");
  const [activeResultTab, setActiveResultTab] = useState("script");
  const [webhooks, setWebhooks] = useState<WebhookConfig>({
    script: '',
    editor: '',
    trafficker: '',
    strategist: '',
    designer: '',
    admin: '',
  });
  const [webhooksLoaded, setWebhooksLoaded] = useState(false);
  
  // Load custom prompts from organization settings
  const { prompts: customPrompts } = useScriptPrompts(organizationId);
  
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { key: "script", label: "🧍‍♂️ Bloque Creador (Guión)", status: "pending" },
    { key: "editor", label: "🎬 Bloque Editor", status: "pending" },
    { key: "trafficker", label: "💰 Bloque Trafficker", status: "pending" },
    { key: "strategist", label: "🧠 Bloque Estratega", status: "pending" },
    { key: "designer", label: "🎨 Bloque Diseñador", status: "pending" },
    { key: "admin", label: "📋 Bloque Admin/PM", status: "pending" },
  ]);

  const [formData, setFormData] = useState<StandaloneFormData>({
    product_name: "",
    product_description: "",
    product_strategy: "",
    market_research: "",
    ideal_avatar: "",
    sales_angles: "",
    brand_name: "",
    brand_tone: "cercano",
    cta: "",
    sales_angle: "",
    hooks_count: "3",
    target_country: "",
    narrative_structure: "",
    additional_instructions: "",
    hooks: [],
    brief_content: "",
    research_content: "",
    reference_transcription: "",
    video_strategies: "",
  });

  // Load webhook configuration from app_settings
  useEffect(() => {
    const fetchWebhooks = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', [
            'kreoon_ia_webhook_script',
            'kreoon_ia_webhook_editor',
            'kreoon_ia_webhook_trafficker',
            'kreoon_ia_webhook_strategist',
            'kreoon_ia_webhook_designer',
            'kreoon_ia_webhook_admin',
          ]);

        if (error) throw error;

        const config: WebhookConfig = {
          script: '',
          editor: '',
          trafficker: '',
          strategist: '',
          designer: '',
          admin: '',
        };

        data?.forEach(setting => {
          const key = setting.key.replace('kreoon_ia_webhook_', '') as keyof WebhookConfig;
          if (key in config) {
            config[key] = setting.value || '';
          }
        });

        setWebhooks(config);
        setWebhooksLoaded(true);
      } catch (error) {
        console.error('Error loading webhooks:', error);
        setWebhooksLoaded(true);
      }
    };

    fetchWebhooks();
  }, []);

  // Producto seleccionado en "Cargar Investigación de Producto"
  const [researchProduct, setResearchProduct] = useState<any | null>(null);

  const extractResearchAvatars = (product: any): any[] => {
    if (!product) return [];
    if (product.avatar_profiles?.profiles?.length) return product.avatar_profiles.profiles;
    if (product.market_research?.strategicAvatars?.length) return product.market_research.strategicAvatars;
    return [];
  };

  const extractResearchAngles = (product: any): any[] => {
    if (!product) return [];
    if (product.sales_angles_data?.angles?.length) return product.sales_angles_data.angles;
    if (product.market_research?.salesAngles?.length) return product.market_research.salesAngles;
    if (Array.isArray(product.sales_angles) && product.sales_angles.length)
      return product.sales_angles.map((a: string) => ({ angle: a }));
    return [];
  };

  const researchAvatars = useMemo(() => extractResearchAvatars(researchProduct), [researchProduct]);
  const researchAngles = useMemo(() => extractResearchAngles(researchProduct), [researchProduct]);

  // Check if the primary webhook (script) is configured
  const hasConfiguredWebhook = useMemo(() => {
    return webhooks.script && webhooks.script.trim() !== '';
  }, [webhooks]);

  const addHook = () => {
    if (newHook.trim() && formData.hooks.length < parseInt(formData.hooks_count)) {
      setFormData({
        ...formData,
        hooks: [...formData.hooks, newHook.trim()]
      });
      setNewHook("");
    }
  };

  const removeHook = (index: number) => {
    setFormData({
      ...formData,
      hooks: formData.hooks.filter((_, i) => i !== index)
    });
  };

  const updateStepStatus = (key: string, status: GenerationStep["status"]) => {
    setGenerationSteps(prev => 
      prev.map(step => step.key === key ? { ...step, status } : step)
    );
  };

  const resetSteps = () => {
    setGenerationSteps([
      { key: "script", label: "🧍‍♂️ Bloque Creador (Guión)", status: "pending" },
      { key: "editor", label: "🎬 Bloque Editor", status: "pending" },
      { key: "trafficker", label: "💰 Bloque Trafficker", status: "pending" },
      { key: "strategist", label: "🧠 Bloque Estratega", status: "pending" },
      { key: "designer", label: "🎨 Bloque Diseñador", status: "pending" },
      { key: "admin", label: "📋 Bloque Admin/PM", status: "pending" },
    ]);
  };

  const buildPayload = () => {
    const narrativeLabel = NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure;
    const toneLabel = BRAND_TONES.find(t => t.value === formData.brand_tone)?.label || formData.brand_tone;
    
    return {
      // Product/Service Info
      product: {
        name: formData.product_name,
        description: formData.product_description,
        brand: formData.brand_name || formData.product_name,
        strategy: formData.product_strategy,
        market_research: formData.market_research,
        sales_angles: formData.sales_angles,
      },
      // Content Parameters
      content: {
        cta: formData.cta,
        sales_angle: formData.sales_angle,
        narrative_structure: narrativeLabel,
        brand_tone: toneLabel,
        target_country: formData.target_country,
        hooks_count: parseInt(formData.hooks_count),
        suggested_hooks: formData.hooks,
      },
      // Avatar/Audience
      avatar: {
        ideal_avatar: formData.ideal_avatar,
      },
      // Additional Documents
      documents: {
        brief_content: formData.brief_content,
        research_content: formData.research_content,
        reference_transcription: formData.reference_transcription,
        video_strategies: formData.video_strategies,
        additional_instructions: formData.additional_instructions,
      },
      // Organization context
      organization: {
        id: organizationId,
        custom_prompts: customPrompts,
      },
      // Research product data if selected
      research_data: researchProduct ? {
        avatars: researchAvatars,
        angles: researchAngles,
        full_research: researchProduct.market_research,
      } : null,
    };
  };

  const parseN8nError = (error: any): string => {
    const errorStr = typeof error === 'string' ? error : error?.message || JSON.stringify(error);
    
    // Common n8n errors with user-friendly messages
    if (errorStr.includes('No Respond to Webhook node found')) {
      return 'El workflow de n8n necesita un nodo "Respond to Webhook" para devolver respuestas. Configúralo en tu flujo de n8n.';
    }
    if (errorStr.includes('not registered for POST')) {
      return 'El webhook no acepta solicitudes POST. Verifica que el nodo Webhook en n8n esté configurado para recibir POST.';
    }
    if (errorStr.includes('404')) {
      return 'Webhook no encontrado. Verifica que la URL sea correcta y el workflow esté activo en n8n.';
    }
    if (errorStr.includes('401') || errorStr.includes('403')) {
      return 'Acceso denegado. Verifica la autenticación del webhook en n8n.';
    }
    if (errorStr.includes('500')) {
      return 'Error interno en n8n. Revisa los logs del workflow para más detalles.';
    }
    if (errorStr.includes('timeout') || errorStr.includes('ETIMEDOUT')) {
      return 'Tiempo de espera agotado. El workflow de n8n tardó demasiado en responder.';
    }
    
    return errorStr;
  };

  const callWebhook = async (webhookUrl: string, payload: any): Promise<any> => {
    const { data, error } = await supabase.functions.invoke('n8n-proxy', {
      body: {
        webhookUrl,
        payload,
      },
    });

    if (error) throw new Error(parseN8nError(error.message));
    if (!data) throw new Error("Respuesta vacía del webhook");
    if (data.error) {
      const details = data.details ? ` - ${parseN8nError(data.details)}` : '';
      throw new Error(parseN8nError(data.error) + details);
    }

    return data;
  };

  const handleGenerate = async () => {
    if (!formData.product_name) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa el nombre del producto o servicio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cta || !formData.sales_angle || !formData.narrative_structure) {
      toast({
        title: "Campos requeridos",
        description: "Completa CTA, Ángulo de venta y Estructura narrativa",
        variant: "destructive",
      });
      return;
    }

    if (!hasConfiguredWebhook) {
      toast({
        title: "Webhook no configurado",
        description: "Configura al menos el webhook de guión en Configuración de Plataforma → Webhooks",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    resetSteps();
    setGeneratedContent(null);

    const content: GeneratedContent = {
      script: "",
      editor_guidelines: "",
      strategist_guidelines: "",
      trafficker_guidelines: "",
      designer_guidelines: "",
      admin_guidelines: "",
    };

    const payload = buildPayload();

    try {
      // Call each webhook that is configured
      const webhookCalls: { key: keyof GeneratedContent; webhookKey: keyof WebhookConfig; stepKey: GenerationStep['key'] }[] = [
        { key: 'script', webhookKey: 'script', stepKey: 'script' },
        { key: 'editor_guidelines', webhookKey: 'editor', stepKey: 'editor' },
        { key: 'trafficker_guidelines', webhookKey: 'trafficker', stepKey: 'trafficker' },
        { key: 'strategist_guidelines', webhookKey: 'strategist', stepKey: 'strategist' },
        { key: 'designer_guidelines', webhookKey: 'designer', stepKey: 'designer' },
        { key: 'admin_guidelines', webhookKey: 'admin', stepKey: 'admin' },
      ];

      // Mark all configured webhooks as generating
      for (const call of webhookCalls) {
        if (webhooks[call.webhookKey]) {
          updateStepStatus(call.stepKey, "generating");
        }
      }

      // Try to get all blocks from the script webhook (single request returning all blocks)
      if (webhooks.script) {
        try {
          const response = await callWebhook(webhooks.script, payload);
          
          // Handle response format: { bloques_html: { guion, pautas_editor, ... } }
          // Or handle array response like the project webhook
          const responseData = Array.isArray(response) ? response[0] : response;
          
          if (responseData?.bloques_html) {
            const blocks = responseData.bloques_html;
            
            // Map response blocks to content
            if (blocks.guion) {
              content.script = blocks.guion;
              updateStepStatus("script", "done");
            }
            if (blocks.pautas_editor) {
              content.editor_guidelines = blocks.pautas_editor;
              updateStepStatus("editor", "done");
            }
            if (blocks.pautas_trafficker) {
              content.trafficker_guidelines = blocks.pautas_trafficker;
              updateStepStatus("trafficker", "done");
            }
            if (blocks.pautas_estratega) {
              content.strategist_guidelines = blocks.pautas_estratega;
              updateStepStatus("strategist", "done");
            }
            if (blocks.pautas_disenador) {
              content.designer_guidelines = blocks.pautas_disenador;
              updateStepStatus("designer", "done");
            }
            if (blocks.pautas_admin) {
              content.admin_guidelines = blocks.pautas_admin;
              updateStepStatus("admin", "done");
            }
          } else if (responseData?.script || responseData?.result || responseData?.guion) {
            // Fallback: single block response
            content.script = responseData.script || responseData.result || responseData.guion || '';
            updateStepStatus("script", "done");
          }

          setGeneratedContent({ ...content });
        } catch (scriptError) {
          console.error("Error calling script webhook:", scriptError);
          updateStepStatus("script", "error");
          throw scriptError;
        }
      }

      // If we didn't get all blocks from the script webhook, call individual webhooks
      const needsIndividualCalls = [
        { key: 'editor_guidelines', webhookKey: 'editor', stepKey: 'editor' },
        { key: 'trafficker_guidelines', webhookKey: 'trafficker', stepKey: 'trafficker' },
        { key: 'strategist_guidelines', webhookKey: 'strategist', stepKey: 'strategist' },
        { key: 'designer_guidelines', webhookKey: 'designer', stepKey: 'designer' },
        { key: 'admin_guidelines', webhookKey: 'admin', stepKey: 'admin' },
      ] as const;

      for (const call of needsIndividualCalls) {
        const webhookUrl = webhooks[call.webhookKey];
        const contentKey = call.key as keyof GeneratedContent;
        
        // Only call if webhook is configured and we don't already have content
        if (webhookUrl && !content[contentKey]) {
          try {
            updateStepStatus(call.stepKey, "generating");
            const response = await callWebhook(webhookUrl, {
              ...payload,
              script_generated: content.script, // Include generated script as context
              generation_type: call.webhookKey,
            });
            
            const responseData = Array.isArray(response) ? response[0] : response;
            content[contentKey] = responseData?.result || responseData?.content || responseData?.html || '';
            updateStepStatus(call.stepKey, "done");
            setGeneratedContent({ ...content });
          } catch (error) {
            console.error(`Error calling ${call.webhookKey} webhook:`, error);
            updateStepStatus(call.stepKey, "error");
          }
        } else if (!webhookUrl) {
          // No webhook configured, skip
          updateStepStatus(call.stepKey, "done");
        }
      }

      toast({
        title: "Contenido generado exitosamente",
        description: "Guión y pautas generados via n8n",
      });
    } catch (error) {
      console.error("Error:", error);
      const currentStep = generationSteps.find(s => s.status === "generating");
      if (currentStep) {
        updateStepStatus(currentStep.key, "error");
      }
      
      const errorMessage = error instanceof Error ? error.message : "No se pudo generar el contenido";
      const isN8nConfigError = errorMessage.includes('n8n') || errorMessage.includes('workflow') || errorMessage.includes('Webhook');
      
      toast({
        title: isN8nConfigError ? "Error de configuración n8n" : "Error al generar",
        description: errorMessage,
        variant: "destructive",
        duration: isN8nConfigError ? 10000 : 5000, // Show longer for config errors
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/<[^>]*>/g, ''));
    toast({
      title: "Copiado",
      description: `${label} copiado al portapapeles`,
    });
  };

  const downloadAsHtml = () => {
    if (!generatedContent) return;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Guión - ${formData.product_name}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h3 { color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
    blockquote { background: #f5f5f5; padding: 15px; border-left: 4px solid #333; }
  </style>
</head>
<body>
  <h1>Guión: ${formData.product_name}</h1>
  ${generatedContent.script}
  ${generatedContent.editor_guidelines || ''}
  ${generatedContent.trafficker_guidelines || ''}
  ${generatedContent.strategist_guidelines || ''}
  ${generatedContent.designer_guidelines || ''}
  ${generatedContent.admin_guidelines || ''}
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guion-${formData.product_name.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
  };

  const resultTabs = [
    { key: "script", label: "Creador", icon: FileText, content: generatedContent?.script },
    { key: "editor", label: "Editor", icon: Video, content: generatedContent?.editor_guidelines },
    { key: "trafficker", label: "Trafficker", icon: Target, content: generatedContent?.trafficker_guidelines },
    { key: "strategist", label: "Estratega", icon: Lightbulb, content: generatedContent?.strategist_guidelines },
    { key: "designer", label: "Diseñador", icon: Package, content: generatedContent?.designer_guidelines },
    { key: "admin", label: "Admin", icon: Users, content: generatedContent?.admin_guidelines },
  ];

  // Check if any webhook has issues (we can detect this from step errors)
  const hasStepErrors = generationSteps.some(step => step.status === 'error');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-6">
        {/* Product Research Selector */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5 text-primary" />
              Cargar Investigación de Producto
            </CardTitle>
            <CardDescription>
              Selecciona un producto con investigación de mercado para autocompletar los campos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductResearchSelector
              onSelectProduct={(product) => {
                setResearchProduct(product);

                if (!product) return;

                const angles = (product?.sales_angles_data?.angles || [])
                  .map((a: any) => a?.angle)
                  .filter(Boolean);

                setFormData(prev => ({
                  ...prev,
                  product_name: product.name || prev.product_name,
                  product_description: product.description || prev.product_description,
                  sales_angles: angles.length ? angles.join(", ") : prev.sales_angles,
                }));
              }}
              onSelectAvatar={(avatar) => setFormData(prev => ({ ...prev, ideal_avatar: avatar }))}
              onSelectSalesAngle={(angle) => setFormData(prev => ({ ...prev, sales_angle: angle }))}
              onSelectStrategy={(strategy) => setFormData(prev => ({ ...prev, product_strategy: strategy }))}
              onSelectMarketResearch={(research) => setFormData(prev => ({ ...prev, market_research: research }))}
              onSelectHooks={(hooks) => setFormData(prev => ({ ...prev, hooks }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Información del Producto/Servicio
            </CardTitle>
            <CardDescription>
              Describe el producto, servicio o marca para la cual generar el guión
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product_name">Nombre del Producto *</Label>
                <Input
                  id="product_name"
                  placeholder="Ej: Curso de Marketing Digital"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_name">Marca</Label>
                <Input
                  id="brand_name"
                  placeholder="Ej: Academia XYZ"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_description">Descripción</Label>
              <Textarea
                id="product_description"
                placeholder="¿Qué es y qué hace el producto o servicio?"
                value={formData.product_description}
                onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ideal_avatar">Avatar / Cliente Ideal *</Label>
              <Textarea
                id="ideal_avatar"
                placeholder="Describe a tu cliente ideal: edad, género, problemas, deseos..."
                value={formData.ideal_avatar}
                onChange={(e) => setFormData({ ...formData, ideal_avatar: e.target.value })}
                rows={3}
              />

              {researchAvatars.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Elegir avatar de la investigación ({Math.min(5, researchAvatars.length)})
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-2">
                      {researchAvatars.slice(0, 5).map((a: any, idx: number) => {
                        const name = a?.name || a?.avatarName || `Avatar ${idx + 1}`;
                        const situation = a?.situation || a?.currentSituation || "";
                        const awareness = a?.awarenessLevel || a?.awareness || "";
                        const drivers = Array.isArray(a?.drivers) ? a.drivers.join(", ") : (a?.drivers || a?.emotionalDrivers || "");
                        const objections = Array.isArray(a?.objections) ? a.objections.join(", ") : (a?.objections || a?.mainObjections || "");
                        const phrases = Array.isArray(a?.phrases) ? a.phrases : (Array.isArray(a?.typicalPhrases) ? a.typicalPhrases : []);

                        const formatted = [
                          `AVATAR: ${name}`,
                          situation ? `SITUACIÓN: ${situation}` : "",
                          awareness ? `NIVEL DE CONSCIENCIA: ${awareness}` : "",
                          drivers ? `DRIVERS: ${drivers}` : "",
                          objections ? `OBJECIONES: ${objections}` : "",
                          phrases?.length ? `FRASES TEXTUALES: ${phrases.join(" | ")}` : "",
                        ].filter(Boolean).join("\n");

                        return (
                          <button
                            key={idx}
                            type="button"
                            className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            onClick={() => setFormData(prev => ({ ...prev, ideal_avatar: formatted }))}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm">{name}</span>
                              <Badge variant="secondary" className="text-xs">Usar</Badge>
                            </div>
                            {(situation || awareness) && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {situation || awareness}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_country">País Objetivo *</Label>
                <Select
                  value={formData.target_country}
                  onValueChange={(value) => setFormData({ ...formData, target_country: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar país" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_tone">Tono de Marca</Label>
                <Select
                  value={formData.brand_tone}
                  onValueChange={(value) => setFormData({ ...formData, brand_tone: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tono" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAND_TONES.map(tone => (
                      <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Información avanzada
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Estrategia del producto</Label>
                  <Textarea
                    placeholder="Estrategia de posicionamiento, diferenciadores..."
                    value={formData.product_strategy}
                    onChange={(e) => setFormData({ ...formData, product_strategy: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Investigación de mercado</Label>
                  <Textarea
                    placeholder="Insights del mercado, competencia, tendencias..."
                    value={formData.market_research}
                    onChange={(e) => setFormData({ ...formData, market_research: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ángulos de venta disponibles</Label>
                  <Textarea
                    placeholder="Lista de ángulos separados por coma: precio, calidad, exclusividad..."
                    value={formData.sales_angles}
                    onChange={(e) => setFormData({ ...formData, sales_angles: e.target.value })}
                    rows={2}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Parámetros del Contenido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cta">CTA Principal *</Label>
                <Input
                  id="cta"
                  placeholder="Ej: Inscríbete ahora con 50% OFF"
                  value={formData.cta}
                  onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales_angle">Ángulo de Venta *</Label>
                <Input
                  id="sales_angle"
                  placeholder="Ej: Transformación de vida"
                  value={formData.sales_angle}
                  onChange={(e) => setFormData({ ...formData, sales_angle: e.target.value })}
                />

                {researchAngles.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Elegir ángulo de venta ({researchAngles.length})
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <ScrollArea className="max-h-60">
                        <div className="space-y-2 p-1">
                          {researchAngles.map((a: any, idx: number) => {
                            const angleText = a?.angle || a?.salesAngle || a?.name || "";
                            if (!angleText) return null;
                            const avatar = a?.avatar || a?.targetAvatar;
                            const type = a?.type || a?.category;

                            return (
                              <button
                                key={idx}
                                type="button"
                                className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                onClick={() => setFormData(prev => ({ ...prev, sales_angle: angleText }))}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  {type && <Badge variant="outline" className="text-xs">{type}</Badge>}
                                  {avatar && <Badge variant="secondary" className="text-xs">{avatar}</Badge>}
                                </div>
                                <p className="text-sm font-medium mt-1">{angleText}</p>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="narrative_structure">Estructura Narrativa *</Label>
                <Select
                  value={formData.narrative_structure}
                  onValueChange={(value) => setFormData({ ...formData, narrative_structure: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estructura" />
                  </SelectTrigger>
                  <SelectContent>
                    {NARRATIVE_STRUCTURES.map(structure => (
                      <SelectItem key={structure.value} value={structure.value}>
                        {structure.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hooks_count">Cantidad de Hooks</Label>
                <Select
                  value={formData.hooks_count}
                  onValueChange={(value) => setFormData({ ...formData, hooks_count: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hooks */}
            <div className="space-y-2">
              <Label>Hooks Sugeridos (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Escribe un hook y presiona +"
                  value={newHook}
                  onChange={(e) => setNewHook(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHook())}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={addHook}
                  disabled={formData.hooks.length >= parseInt(formData.hooks_count)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.hooks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.hooks.map((hook, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 pr-1">
                      {hook.substring(0, 30)}...
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeHook(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Contenido adicional
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Brief del cliente</Label>
                  <Textarea
                    placeholder="Pega aquí el brief o documento del cliente..."
                    value={formData.brief_content}
                    onChange={(e) => setFormData({ ...formData, brief_content: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transcripción de video de referencia</Label>
                  <Textarea
                    placeholder="Transcripción de un video que quieras usar como referencia..."
                    value={formData.reference_transcription}
                    onChange={(e) => setFormData({ ...formData, reference_transcription: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instrucciones adicionales</Label>
                  <Textarea
                    placeholder="Cualquier instrucción especial para la IA..."
                    value={formData.additional_instructions}
                    onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
                    rows={3}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Card className="sticky bottom-4 shadow-lg border-primary/20">
          <CardContent className="pt-4 pb-4 space-y-4">
            {/* Generation Steps Progress */}
            {loading && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Generando contenido...</p>
                <div className="grid grid-cols-2 gap-2">
                  {generationSteps.map(step => (
                    <div key={step.key} className="flex items-center gap-2 text-xs">
                      {step.status === "pending" && <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />}
                      {step.status === "generating" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      {step.status === "done" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      {step.status === "error" && <X className="h-3 w-3 text-destructive" />}
                      <span className={step.status === "generating" ? "text-primary font-medium" : "text-muted-foreground"}>
                        {step.label.replace(/^[^\s]+\s/, '')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasStepErrors && !loading && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Error en la generación. Contacta al administrador.</span>
              </div>
            )}


            <Button 
              onClick={handleGenerate} 
              disabled={loading || !formData.product_name || !hasConfiguredWebhook}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generar Guión Completo
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right: Results */}
      <div className="space-y-4">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Resultado
              </CardTitle>
              {generatedContent && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `${generatedContent.script}\n\n${generatedContent.editor_guidelines}\n\n${generatedContent.trafficker_guidelines}\n\n${generatedContent.strategist_guidelines}\n\n${generatedContent.designer_guidelines}\n\n${generatedContent.admin_guidelines}`,
                      "Todo el contenido"
                    )}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar todo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAsHtml}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Descargar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!generatedContent ? (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                <Wand2 className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-center">
                  Completa el formulario y genera el guión
                  <br />
                  <span className="text-sm">Los 6 bloques aparecerán aquí</span>
                </p>
              </div>
            ) : (
              <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
                <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                  {resultTabs.map(tab => {
                    const Icon = tab.icon;
                    const hasContent = !!tab.content;
                    return (
                      <TabsTrigger
                        key={tab.key}
                        value={tab.key}
                        className="flex-1 gap-1.5"
                        disabled={!hasContent}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {resultTabs.map(tab => (
                  <TabsContent key={tab.key} value={tab.key} className="mt-4">
                    <div className="flex justify-end mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(tab.content || '', tab.label)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <ScrollArea className="h-[500px] rounded-lg border p-4">
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(tab.content || '') }}
                      />
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
