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
import { useOrganizationAI, AI_PROVIDERS_CONFIG } from "@/hooks/useOrganizationAI";
import { ProductResearchSelector } from "./ProductResearchSelector";
import { 
  Sparkles, Loader2, Target, Users, Globe, FileText, 
  MessageSquare, ListOrdered, Plus, X, Wand2, Settings2,
  Video, ChevronDown, CheckCircle2, Bot, RefreshCw, Building2,
  Package, Lightbulb, Copy, Download, FileJson, AlertCircle, Database
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
  // Información del producto/servicio/marca
  product_name: string;
  product_description: string;
  product_strategy: string;
  market_research: string;
  ideal_avatar: string;
  sales_angles: string;
  brand_name: string;
  brand_tone: string;
  // Parámetros del contenido
  cta: string;
  sales_angle: string;
  hooks_count: string;
  target_country: string;
  narrative_structure: string;
  additional_instructions: string;
  hooks: string[];
  // Documentos opcionales
  brief_content: string;
  research_content: string;
  reference_transcription: string;
  video_strategies: string;
  // Configuración IA
  ai_provider: "openai" | "gemini" | "anthropic";
  ai_model: string;
}

interface GenerationStep {
  key: "script" | "editor" | "strategist" | "trafficker" | "designer" | "admin";
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

const AI_PROVIDERS = [
  { 
    value: "openai", 
    label: "OpenAI GPT", 
    description: "Requiere API Key",
    models: [
      { value: "gpt-4o", label: "GPT-4o (Recomendado)" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini (Rápido)" },
      { value: "gpt-5", label: "GPT-5" },
      { value: "gpt-5-mini", label: "GPT-5 Mini" },
    ]
  },
  { 
    value: "gemini", 
    label: "Google Gemini", 
    description: "Requiere API Key",
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Recomendado)" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ]
  },
  { 
    value: "anthropic", 
    label: "Anthropic Claude", 
    description: "Requiere API Key",
    models: [
      { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (Recomendado)" },
      { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-5-haiku", label: "Claude 3.5 Haiku (Rápido)" },
    ]
  },
];

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

const CONTENT_AI_FUNCTION = "content-ai";

export function StandaloneScriptGenerator() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id;
  
  const [loading, setLoading] = useState(false);
  const [newHook, setNewHook] = useState("");
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState("script");
  
  // Load custom prompts from organization settings
  const { prompts: customPrompts, loading: loadingPrompts } = useScriptPrompts(organizationId);
  
  // Load enabled AI providers from organization settings
  const { getEnabledProviders, hasValidApiKey, loading: loadingAI } = useOrganizationAI(organizationId);
  
  // Filter AI_PROVIDERS to only show enabled ones (excluding lovable)
  const enabledProviders = useMemo(() => {
    const enabled = getEnabledProviders();
    return AI_PROVIDERS.filter(p => 
      enabled.some(e => e.key === p.value && p.value !== 'lovable')
    );
  }, [getEnabledProviders]);
  
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
    ai_provider: "openai",
    ai_model: "gpt-4o",
  });

  // Producto seleccionado en “Cargar Investigación de Producto”
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

  const currentProvider = enabledProviders.find(p => p.value === formData.ai_provider) || 
                         AI_PROVIDERS.find(p => p.value === formData.ai_provider);
  const availableModels = currentProvider?.models || [];

  // Update provider and model when enabled providers change
  useEffect(() => {
    if (!loadingAI && enabledProviders.length > 0) {
      const isCurrentProviderEnabled = enabledProviders.some(p => p.value === formData.ai_provider);
      if (!isCurrentProviderEnabled) {
        const firstEnabled = enabledProviders[0];
        setFormData(prev => ({
          ...prev,
          ai_provider: firstEnabled.value as "openai" | "gemini" | "anthropic",
          ai_model: firstEnabled.models[0]?.value || ""
        }));
      }
    }
  }, [loadingAI, enabledProviders, formData.ai_provider]);

  // Update model when provider changes
  useEffect(() => {
    const provider = enabledProviders.find(p => p.value === formData.ai_provider) ||
                    AI_PROVIDERS.find(p => p.value === formData.ai_provider);
    if (provider && provider.models.length > 0) {
      setFormData(prev => ({
        ...prev,
        ai_model: provider.models[0].value
      }));
    }
  }, [formData.ai_provider, enabledProviders]);

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

  const buildBaseContext = () => {
    const narrativeLabel = NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure;
    const toneLabel = BRAND_TONES.find(t => t.value === formData.brand_tone)?.label || formData.brand_tone;
    
    let context = `PRODUCTO/SERVICIO: ${formData.product_name}
MARCA: ${formData.brand_name || formData.product_name}
DESCRIPCIÓN: ${formData.product_description || 'No disponible'}
TONO DE MARCA: ${toneLabel}
CTA: ${formData.cta}
ÁNGULO DE VENTA: ${formData.sales_angle}
ESTRUCTURA NARRATIVA: ${narrativeLabel}
PAÍS OBJETIVO: ${formData.target_country}
AVATAR/CLIENTE IDEAL: ${formData.ideal_avatar}

ESTRATEGIA:
${formData.product_strategy || 'No disponible'}

INVESTIGACIÓN DE MERCADO:
${formData.market_research || 'No disponible'}

ÁNGULOS DE VENTA DISPONIBLES:
${formData.sales_angles || 'No definidos'}

HOOKS SUGERIDOS:
${formData.hooks.length > 0 ? formData.hooks.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'Generar automáticamente'}`;

    if (formData.brief_content) {
      context += `\n\n--- BRIEF ---\n${formData.brief_content.substring(0, 3000)}`;
    }
    if (formData.research_content) {
      context += `\n\n--- INVESTIGACIÓN ---\n${formData.research_content.substring(0, 3000)}`;
    }
    if (formData.reference_transcription) {
      context += `\n\nTRANSCRIPCIÓN VIDEO DE REFERENCIA:\n${formData.reference_transcription}`;
    }
    if (formData.video_strategies) {
      context += `\n\nESTRATEGIAS/ESTRUCTURAS DE VIDEO:\n${formData.video_strategies}`;
    }
    if (formData.additional_instructions) {
      context += `\n\nINSTRUCCIONES ADICIONALES:\n${formData.additional_instructions}`;
    }

    return context;
  };

  const generateContent = async (
    type: "script" | "editor" | "strategist" | "trafficker" | "designer" | "admin",
    previousScript?: string
  ): Promise<string> => {
    const baseContext = buildBaseContext();
    
    // Use the prompts from the hook (which already has defaults), or fall back to DEFAULT_SCRIPT_PROMPTS
    const promptKey = type === "script" ? "script" : type;
    const customPrompt = customPrompts?.[promptKey] || DEFAULT_SCRIPT_PROMPTS[promptKey as keyof typeof DEFAULT_SCRIPT_PROMPTS] || "";
    
    let fullPrompt = `${customPrompt}\n\n---\nCONTEXTO:\n${baseContext}`;
    
    if (previousScript && type !== "script") {
      fullPrompt += `\n\n---\nGUIÓN GENERADO:\n${previousScript}`;
    }

    const { data, error } = await supabase.functions.invoke(CONTENT_AI_FUNCTION, {
      body: {
        action: "generate_script",
        organizationId,
        prompt: fullPrompt,
        product: {
          id: null,
          name: formData.product_name,
          description: formData.product_description,
          strategy: formData.product_strategy,
          market_research: formData.market_research,
          ideal_avatar: formData.ideal_avatar,
          sales_angles: formData.sales_angles.split(',').map(s => s.trim()),
        },
        generation_type: type,
        ai_provider: formData.ai_provider,
        ai_model: formData.ai_model,
      },
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Respuesta vacía de la IA");
    if (data.error) throw new Error(data.error);

    return data.script || data.result || "";
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

    try {
      // Step 1: Generate Script (Bloque Creador)
      updateStepStatus("script", "generating");
      content.script = await generateContent("script");
      updateStepStatus("script", "done");
      setGeneratedContent({ ...content });

      // Step 2: Generate Editor Guidelines
      updateStepStatus("editor", "generating");
      content.editor_guidelines = await generateContent("editor", content.script);
      updateStepStatus("editor", "done");
      setGeneratedContent({ ...content });

      // Step 3: Generate Trafficker Guidelines
      updateStepStatus("trafficker", "generating");
      content.trafficker_guidelines = await generateContent("trafficker", content.script);
      updateStepStatus("trafficker", "done");
      setGeneratedContent({ ...content });

      // Step 4: Generate Strategist Guidelines
      updateStepStatus("strategist", "generating");
      content.strategist_guidelines = await generateContent("strategist", content.script);
      updateStepStatus("strategist", "done");
      setGeneratedContent({ ...content });

      // Step 5: Generate Designer Guidelines
      updateStepStatus("designer", "generating");
      content.designer_guidelines = await generateContent("designer", content.script);
      updateStepStatus("designer", "done");
      setGeneratedContent({ ...content });

      // Step 6: Generate Admin/PM Guidelines
      updateStepStatus("admin", "generating");
      content.admin_guidelines = await generateContent("admin", content.script);
      updateStepStatus("admin", "done");
      setGeneratedContent({ ...content });

      toast({
        title: "Contenido generado exitosamente",
        description: "Guión y pautas generados con IA",
      });
    } catch (error) {
      console.error("Error:", error);
      const currentStep = generationSteps.find(s => s.status === "generating");
      if (currentStep) {
        updateStepStatus(currentStep.key, "error");
      }
      toast({
        title: "Error al generar",
        description: error instanceof Error ? error.message : "No se pudo generar el contenido",
        variant: "destructive",
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
                  // Guardamos todos los ángulos como texto (para contexto) y dejamos el selector para escoger 1 en “Ángulo de Venta”
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

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Configuración IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {enabledProviders.length === 0 && !loadingAI ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  No hay proveedores de IA activos. Configura al menos un proveedor en la configuración de IA de la organización.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select
                    value={formData.ai_provider}
                    onValueChange={(value: "openai" | "gemini" | "anthropic") => 
                      setFormData({ ...formData, ai_provider: value })
                    }
                    disabled={enabledProviders.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledProviders.map(provider => (
                        <SelectItem key={provider.value} value={provider.value}>
                          <div className="flex items-center gap-2">
                            <span>{provider.label}</span>
                            {!hasValidApiKey(provider.value) && (
                              <AlertCircle className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select
                    value={formData.ai_model}
                    onValueChange={(value) => setFormData({ ...formData, ai_model: value })}
                    disabled={enabledProviders.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {formData.ai_provider && !hasValidApiKey(formData.ai_provider) && enabledProviders.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>
                  Configura la API Key de {currentProvider?.label} en la configuración de IA
                </span>
              </div>
            )}

            {/* Generation Steps Progress */}
            {loading && (
              <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-3">Generando contenido...</p>
                {generationSteps.map(step => (
                  <div key={step.key} className="flex items-center gap-2 text-sm">
                    {step.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                    {step.status === "generating" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {step.status === "error" && <X className="h-4 w-4 text-destructive" />}
                    <span className={step.status === "generating" ? "text-primary font-medium" : ""}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={handleGenerate} 
              disabled={loading || !formData.product_name}
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
