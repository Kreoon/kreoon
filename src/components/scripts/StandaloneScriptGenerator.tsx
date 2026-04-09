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
import { parseProductResearch, ParsedResearchData } from "@/lib/productResearchParser";
import { 
  Sparkles, Loader2, Target, Users, Globe, FileText, 
  Plus, X, Wand2, Settings2,
  Video, ChevronDown, CheckCircle2, 
  Package, Lightbulb, Copy, Download, AlertCircle, Database, Webhook,
  Clock, Monitor, Heart, Zap, ShieldX, Check, Search
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { sanitizeHTML } from "@/lib/sanitizeHTML";

interface GeneratedContent {
  script: string;
  director_notes?: string;
}

// Video duration options
const VIDEO_DURATIONS = [
  { value: "15-30s", label: "15-30 segundos (Story/Reel)" },
  { value: "30-60s", label: "30-60 segundos (Short-form)" },
  { value: "1-3min", label: "1-3 minutos (Medio)" },
  { value: "3-5min", label: "3-5 minutos (Largo)" },
  { value: "5-10min", label: "5-10 minutos (YouTube)" },
];

// Target platform options
const TARGET_PLATFORMS = [
  { value: "instagram", label: "Instagram (Reels/Stories)" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "multi", label: "Multi-plataforma" },
];

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
  // New fields for research variables
  selected_pain: string;
  selected_desire: string;
  selected_objection: string;
  video_duration: string;
  target_platform: string;
  use_perplexity: boolean;
  // Nuevos campos Esfera + Director
  sphere_phase: string;
  consciousness_level: string;
  content_type: string;
  production_level: string;
}

interface GenerationStep {
  key: "script" | "director";
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

interface WebhookConfig {
  script: string;
  director: string;
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

// Método Esfera + Niveles de Conciencia de Eugene Schwartz
const ESFERA_PHASES = [
  {
    value: "engage",
    label: "🎣 ENGANCHAR",
    color: "bg-blue-500",
    description: "Viralidad, educar, generar curiosidad",
    audience: "Audiencia FRÍA",
    consciousnessLevels: ["unaware", "problem_aware"],
    objective: "Que conozcan el problema y la marca",
    tone: "Disruptivo, viral, sorprendente",
    techniques: ["Pattern interrupt", "Hooks potentes", "Controversia", "Preguntas curiosas"],
    ctaStyle: "Suave: seguir, guardar, comentar"
  },
  {
    value: "solution",
    label: "💡 SOLUCIÓN",
    color: "bg-green-500",
    description: "Demostrar que somos LA solución",
    audience: "Audiencia TIBIA",
    consciousnessLevels: ["solution_aware", "product_aware"],
    objective: "Convencer que el producto resuelve su problema",
    tone: "Persuasivo, empático, demostrativo",
    techniques: ["Demos", "Testimonios", "Comparativas", "Antes/Después"],
    ctaStyle: "Directo: comprar, probar, agendar"
  },
  {
    value: "remarketing",
    label: "🔥 REMARKETING",
    color: "bg-orange-500",
    description: "Urgencia, FOMO, cierre",
    audience: "Audiencia CALIENTE",
    consciousnessLevels: ["most_aware"],
    objective: "Empujar al cierre con urgencia",
    tone: "Urgente, escasez, confianza",
    techniques: ["Ofertas limitadas", "Garantías", "Social proof", "Últimas unidades"],
    ctaStyle: "Urgente: ahora, hoy, últimos cupos"
  },
  {
    value: "fidelize",
    label: "💎 FIDELIZAR",
    color: "bg-purple-500",
    description: "Retención, recompra, referidos",
    audience: "CLIENTES existentes",
    consciousnessLevels: ["customer"],
    objective: "Mantener relación, generar recompra y referidos",
    tone: "Cercano, exclusivo, premium",
    techniques: ["Tips avanzados", "UGC de clientes", "Programa referidos", "Contenido exclusivo"],
    ctaStyle: "Comunidad: invitar amigos, dejar reseña"
  }
];

// Niveles de Conciencia (Eugene Schwartz - Breakthrough Advertising)
const CONSCIOUSNESS_LEVELS = [
  {
    value: "unaware",
    label: "😶 Inconsciente",
    description: "No sabe que tiene un problema",
    approach: "Educar sobre el problema, no vender",
    contentType: "Contenido educativo, revelador"
  },
  {
    value: "problem_aware",
    label: "😟 Consciente del Problema",
    description: "Sabe que tiene un problema pero no busca solución",
    approach: "Agitar el dolor, mostrar consecuencias",
    contentType: "Contenido de dolor, consecuencias"
  },
  {
    value: "solution_aware",
    label: "🔍 Consciente de Soluciones",
    description: "Busca soluciones pero no conoce tu producto",
    approach: "Posicionar tu solución como la mejor",
    contentType: "Comparativas, demos, diferenciadores"
  },
  {
    value: "product_aware",
    label: "🤔 Consciente del Producto",
    description: "Conoce tu producto pero no está seguro",
    approach: "Resolver objeciones, dar garantías",
    contentType: "Testimonios, garantías, FAQ"
  },
  {
    value: "most_aware",
    label: "🎯 Muy Consciente",
    description: "Sabe todo, solo necesita el empujón",
    approach: "Oferta irresistible, urgencia",
    contentType: "Ofertas, escasez, CTA directo"
  },
  {
    value: "customer",
    label: "⭐ Cliente",
    description: "Ya compró, buscar retención",
    approach: "Mantener relación, upsell, referidos",
    contentType: "Tips exclusivos, comunidad, referidos"
  }
];

// Tipos de contenido UGC
const CONTENT_TYPES = [
  { value: "ugc_ad", label: "UGC Ad", description: "Publicidad estilo creador" },
  { value: "tutorial", label: "Tutorial", description: "Paso a paso educativo" },
  { value: "storytime", label: "Storytime", description: "Historia personal" },
  { value: "testimonial", label: "Testimonio", description: "Experiencia real" },
  { value: "unboxing", label: "Unboxing", description: "Descubrimiento del producto" },
  { value: "behind_scenes", label: "Behind Scenes", description: "Detrás de cámaras" },
  { value: "reaction", label: "Reacción", description: "Respuesta espontánea" },
  { value: "day_in_life", label: "Día en la Vida", description: "Rutina con producto" },
];

// Nivel de producción (afecta indicaciones de cámara/iluminación)
const PRODUCTION_LEVELS = [
  { value: "smartphone", label: "📱 Smartphone", description: "Grabación casual" },
  { value: "ring_light", label: "💡 Ring Light", description: "Celular + luz básica" },
  { value: "basic_kit", label: "🎬 Kit Básico", description: "Cámara + mic + luz" },
  { value: "studio", label: "🎥 Estudio", description: "Setup profesional" },
];

export function StandaloneScriptGenerator() {
  const { toast } = useToast();
  const { profile, roles } = useAuth();
  const organizationId = profile?.current_organization_id;

  // Detect freelancer: no org, unlocked via referral gate
  const isFreelancer = roles.length === 0 && !organizationId && profile?.platform_access_unlocked === true;
  
  const [loading, setLoading] = useState(false);
  const [newHook, setNewHook] = useState("");
  const [activeResultTab, setActiveResultTab] = useState("script");
  const [webhooks, setWebhooks] = useState<WebhookConfig>({
    script: '',
    director: '',
  });
  const [webhooksLoaded, setWebhooksLoaded] = useState(false);
  
  // Load custom prompts from organization settings
  const { prompts: customPrompts } = useScriptPrompts(organizationId);
  
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { key: "script", label: "📝 Bloque Creador (Guión)", status: "pending" },
    { key: "director", label: "🎬 Bloque Director (Escenas)", status: "pending" },
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
    selected_pain: "",
    selected_desire: "",
    selected_objection: "",
    video_duration: "",
    target_platform: "",
    use_perplexity: false,
    // Nuevos campos Esfera + Director
    sphere_phase: "",
    consciousness_level: "",
    content_type: "ugc_ad",
    production_level: "smartphone",
  });

  // Perplexity research options
  const [perplexityQueries, setPerplexityQueries] = useState({
    trends: true,
    hooks: true,
    competitors: false,
    audience: false,
  });
  const [customPerplexityQuery, setCustomPerplexityQuery] = useState("");

  // Producto seleccionado en "Cargar Investigación de Producto"
  const [researchProduct, setResearchProduct] = useState<any | null>(null);

  // Parsed research data from selected product
  const parsedResearch = useMemo<ParsedResearchData | null>(() => {
    if (!researchProduct) return null;
    return parseProductResearch({
      market_research: researchProduct.market_research,
      avatar_profiles: researchProduct.avatar_profiles,
      sales_angles: researchProduct.sales_angles,
      sales_angles_data: researchProduct.sales_angles_data,
      competitor_analysis: researchProduct.competitor_analysis,
      brief_data: researchProduct.brief_data,
    });
  }, [researchProduct]);

  // Load webhook configuration from app_settings
  useEffect(() => {
    const fetchWebhooks = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', [
            'kreoon_ia_webhook_script',
            'kreoon_ia_webhook_director',
          ]);

        if (error) throw error;

        const config: WebhookConfig = {
          script: '',
          director: '',
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

  // Auto-fill sales_angle and narrative_structure from research when available
  useEffect(() => {
    if (!researchProduct) return;
    
    setFormData(prev => {
      const updates: Partial<typeof prev> = {};
      
      // Auto-fill first sales angle if empty
      if (!prev.sales_angle) {
        const angles = researchProduct?.sales_angles_data?.angles;
        if (Array.isArray(angles) && angles.length > 0) {
          const firstAngle = angles[0];
          const angleText = firstAngle?.angle || firstAngle?.salesAngle || firstAngle?.name || "";
          if (angleText) updates.sales_angle = angleText;
        }
      }
      
      // Auto-fill narrative structure if empty
      if (!prev.narrative_structure) {
        const angles = researchProduct?.sales_angles_data?.angles;
        if (Array.isArray(angles) && angles.length > 0) {
          const type = (angles[0]?.type || "").toLowerCase();
          if (type.includes("problema") || type.includes("dolor")) updates.narrative_structure = "problema-solucion";
          else if (type.includes("transform")) updates.narrative_structure = "antes-despues";
          else if (type.includes("testimon")) updates.narrative_structure = "testimonio";
          else updates.narrative_structure = "problema-solucion";
        }
      }
      
      // Auto-suggest CTA if empty
      if (!prev.cta) {
        const puv = researchProduct?.sales_angles_data?.puv;
        if (puv?.tangibleResult) updates.cta = "Descubre cómo lograrlo";
      }
      
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, [researchProduct]);

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
      { key: "script", label: "📝 Bloque Creador (Guión)", status: "pending" },
      { key: "director", label: "🎬 Bloque Director (Escenas)", status: "pending" },
    ]);
  };

  const buildPayload = () => {
    const narrativeLabel = NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure;
    const toneLabel = BRAND_TONES.find(t => t.value === formData.brand_tone)?.label || formData.brand_tone;
    const durationLabel = VIDEO_DURATIONS.find(d => d.value === formData.video_duration)?.label || formData.video_duration;
    const platformLabel = TARGET_PLATFORMS.find(p => p.value === formData.target_platform)?.label || formData.target_platform;

    // Obtener contexto de Esfera
    const spherePhase = ESFERA_PHASES.find(p => p.value === formData.sphere_phase);
    const consciousnessLevel = CONSCIOUSNESS_LEVELS.find(l => l.value === formData.consciousness_level);
    const contentTypeInfo = CONTENT_TYPES.find(t => t.value === formData.content_type);
    const productionLevelInfo = PRODUCTION_LEVELS.find(l => l.value === formData.production_level);

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
        video_duration: durationLabel,
        target_platform: platformLabel,
        content_type: contentTypeInfo?.label || formData.content_type,
        production_level: productionLevelInfo?.label || formData.production_level,
      },
      // Avatar/Audience
      avatar: {
        ideal_avatar: formData.ideal_avatar,
      },
      // Método Esfera + Niveles de Conciencia
      esfera: spherePhase ? {
        phase: spherePhase.value,
        phase_label: spherePhase.label,
        objective: spherePhase.objective,
        audience: spherePhase.audience,
        tone: spherePhase.tone,
        techniques: spherePhase.techniques,
        cta_style: spherePhase.ctaStyle,
      } : null,
      consciousness: consciousnessLevel ? {
        level: consciousnessLevel.value,
        level_label: consciousnessLevel.label,
        description: consciousnessLevel.description,
        approach: consciousnessLevel.approach,
        content_type_hint: consciousnessLevel.contentType,
      } : null,
      // Director mode info
      director: {
        content_type: formData.content_type,
        content_type_description: contentTypeInfo?.description,
        production_level: formData.production_level,
        production_level_description: productionLevelInfo?.description,
      },
      // Research variables (pains, desires, objections)
      research_variables: {
        selected_pain: formData.selected_pain,
        selected_desire: formData.selected_desire,
        selected_objection: formData.selected_objection,
        all_pains: parsedResearch?.pains || [],
        all_desires: parsedResearch?.desires || [],
        all_objections: parsedResearch?.objections || [],
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
      // Perplexity research (for n8n workflows that support it)
      perplexity: formData.use_perplexity ? {
        use_perplexity: true,
        perplexity_queries: perplexityQueries,
        custom_perplexity_query: customPerplexityQuery.trim() || undefined,
      } : undefined,
      // Research product data if selected
      research_data: researchProduct ? {
        avatars: researchAvatars,
        angles: researchAngles,
        full_research: researchProduct.market_research,
        parsed: parsedResearch,
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

  // Estado para auto-sugerencia de parámetros
  const [suggestingParams, setSuggestingParams] = useState(false);

  // Auto-sugerir parámetros del contenido con IA
  const handleAutoSuggestParams = async () => {
    if (!formData.product_name || !formData.ideal_avatar) {
      toast({
        title: "Información requerida",
        description: "Completa el nombre del producto y el avatar ideal primero",
        variant: "destructive",
      });
      return;
    }

    setSuggestingParams(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-ai', {
        body: {
          action: 'suggest_params',
          product_name: formData.product_name,
          product_description: formData.product_description,
          ideal_avatar: formData.ideal_avatar,
          sphere_phase: formData.sphere_phase,
          consciousness_level: formData.consciousness_level,
          content_type: formData.content_type,
          target_platform: formData.target_platform,
        },
      });

      if (error) throw error;

      // Actualizar formulario con sugerencias
      if (data?.suggestions) {
        setFormData(prev => ({
          ...prev,
          cta: data.suggestions.cta || prev.cta,
          sales_angle: data.suggestions.sales_angle || prev.sales_angle,
          narrative_structure: data.suggestions.narrative_structure || prev.narrative_structure,
          hooks: data.suggestions.hooks || prev.hooks,
        }));
        toast({
          title: "Parámetros sugeridos",
          description: "Los campos han sido completados con recomendaciones de IA",
        });
      }
    } catch (error) {
      console.error("Error sugiriendo parámetros:", error);
      toast({
        title: "Error al sugerir",
        description: "No se pudieron generar las sugerencias. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSuggestingParams(false);
    }
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
      director_notes: "",
    };

    const payload = buildPayload();

    try {
      // Generar Bloque Creador (Script) - Usar webhook si existe, sino content-ai
      updateStepStatus("script", "generating");

      let scriptResponse;
      if (webhooks.script) {
        // Usar webhook de n8n
        scriptResponse = await callWebhook(webhooks.script, {
          ...payload,
          generation_type: "script",
        });
      } else {
        // Usar content-ai directamente
        const { data, error } = await supabase.functions.invoke('content-ai', {
          body: {
            action: 'generate_script',
            ...payload,
            generation_type: "creator",
          },
        });
        if (error) throw error;
        scriptResponse = data;
      }

      const scriptData = Array.isArray(scriptResponse) ? scriptResponse[0] : scriptResponse;

      // Handle different response formats
      if (scriptData?.bloques_html?.guion) {
        content.script = scriptData.bloques_html.guion;
        if (scriptData.bloques_html.pautas_director) {
          content.director_notes = scriptData.bloques_html.pautas_director;
        }
      } else {
        content.script = scriptData?.script || scriptData?.result || scriptData?.guion || scriptData?.content || scriptData?.html || '';
      }

      updateStepStatus("script", content.script ? "done" : "error");
      setGeneratedContent({ ...content });

      // Generar Bloque Director
      if (!content.director_notes) {
        updateStepStatus("director", "generating");

        let directorResponse;
        if (webhooks.director) {
          directorResponse = await callWebhook(webhooks.director, {
            ...payload,
            script_generated: content.script,
            generation_type: "director",
          });
        } else {
          const { data, error } = await supabase.functions.invoke('content-ai', {
            body: {
              action: 'generate_script',
              ...payload,
              script_generated: content.script,
              generation_type: "director",
            },
          });
          if (error) throw error;
          directorResponse = data;
        }

        const directorData = Array.isArray(directorResponse) ? directorResponse[0] : directorResponse;
        content.director_notes = directorData?.result || directorData?.content || directorData?.director || directorData?.html || '';
        updateStepStatus("director", content.director_notes ? "done" : "error");
        setGeneratedContent({ ...content });
      } else {
        updateStepStatus("director", "done");
      }

      toast({
        title: "Contenido generado",
        description: "Guión y notas de dirección generados exitosamente",
      });
    } catch (error) {
      console.error("Error:", error);
      const currentStep = generationSteps.find(s => s.status === "generating");
      if (currentStep) {
        updateStepStatus(currentStep.key, "error");
      }

      const errorMessage = error instanceof Error ? error.message : "No se pudo generar el contenido";

      toast({
        title: "Error al generar",
        description: errorMessage,
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
    .director-section { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 30px; }
  </style>
</head>
<body>
  <h1>Guión: ${formData.product_name}</h1>
  <div class="script-section">
    ${generatedContent.script}
  </div>
  ${generatedContent.director_notes ? `
  <div class="director-section">
    <h2>🎬 Notas del Director</h2>
    ${generatedContent.director_notes}
  </div>
  ` : ''}
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
    { key: "script", label: "📝 Creador", icon: FileText, content: generatedContent?.script },
    { key: "director", label: "🎬 Director", icon: Video, content: generatedContent?.director_notes },
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
                placeholder="Describe a tu cliente ideal: edad, género, problemas, deseos... (Selecciona un producto con investigación para autocompletar)"
                value={formData.ideal_avatar}
                onChange={(e) => setFormData({ ...formData, ideal_avatar: e.target.value })}
                rows={3}
                className={formData.ideal_avatar ? "border-green-500/30 bg-green-500/5" : ""}
              />
              {formData.ideal_avatar && (
                <p className="text-xs text-green-600 dark:text-green-400">✓ Avatar cargado</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_country">País Objetivo *</Label>
                <Select
                  value={formData.target_country}
                  onValueChange={(value) => setFormData({ ...formData, target_country: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar país" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
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
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar tono" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
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

        {/* Método Esfera + Nivel de Conciencia */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Método Esfera
            </CardTitle>
            <CardDescription>Define la fase del embudo y nivel de conciencia del avatar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Fase Esfera */}
              <div className="space-y-2">
                <Label>Fase del Embudo</Label>
                <Select
                  value={formData.sphere_phase}
                  onValueChange={(v) => {
                    const phase = ESFERA_PHASES.find(p => p.value === v);
                    setFormData({
                      ...formData,
                      sphere_phase: v,
                      consciousness_level: phase?.consciousnessLevels[0] || ""
                    });
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar fase" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
                    {ESFERA_PHASES.map(phase => (
                      <SelectItem key={phase.value} value={phase.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${phase.color}`} />
                          <span>{phase.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.sphere_phase && (
                  <p className="text-xs text-muted-foreground">
                    {ESFERA_PHASES.find(p => p.value === formData.sphere_phase)?.description}
                  </p>
                )}
              </div>

              {/* Nivel de Conciencia */}
              <div className="space-y-2">
                <Label>Nivel de Conciencia</Label>
                <Select
                  value={formData.consciousness_level}
                  onValueChange={(v) => setFormData({ ...formData, consciousness_level: v })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar nivel" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
                    {CONSCIOUSNESS_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.consciousness_level && (
                  <p className="text-xs text-muted-foreground">
                    {CONSCIOUSNESS_LEVELS.find(l => l.value === formData.consciousness_level)?.description}
                  </p>
                )}
              </div>
            </div>

            {/* Info contextual de la fase seleccionada */}
            {formData.sphere_phase && (
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border text-sm space-y-1">
                {(() => {
                  const phase = ESFERA_PHASES.find(p => p.value === formData.sphere_phase);
                  return phase ? (
                    <>
                      <p><strong>Audiencia:</strong> {phase.audience}</p>
                      <p><strong>Tono:</strong> {phase.tone}</p>
                      <p><strong>Técnicas:</strong> {phase.techniques.slice(0, 3).join(", ")}</p>
                      <p><strong>CTA:</strong> {phase.ctaStyle}</p>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Research Variables Section - Only visible when product with research is selected */}
        {parsedResearch && (parsedResearch.pains.length > 0 || parsedResearch.desires.length > 0 || parsedResearch.objections.length > 0) && (
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-amber-500" />
                Variables de Investigación
              </CardTitle>
              <CardDescription>
                Selecciona insights del research para enfocar el guión
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pains / Dolores */}
              {parsedResearch.pains.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Dolor/Problema principal
                  </Label>
                  <Select
                    value={formData.selected_pain}
                    onValueChange={(value) => setFormData({ ...formData, selected_pain: value })}
                  >
                    <SelectTrigger className={`bg-background ${formData.selected_pain ? 'border-red-500/30 bg-red-500/5' : ''}`}>
                      <SelectValue placeholder="Seleccionar un dolor..." />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover max-h-[300px]" position="popper" sideOffset={4}>
                      {parsedResearch.pains.filter(p => p && p.trim()).map((pain, idx) => (
                        <SelectItem key={idx} value={pain} className="py-2">
                          <span className="line-clamp-2">{pain}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.selected_pain && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Dolor seleccionado
                    </p>
                  )}
                </div>
              )}

              {/* Desires / Deseos */}
              {parsedResearch.desires.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    Deseo/Aspiración principal
                  </Label>
                  <Select
                    value={formData.selected_desire}
                    onValueChange={(value) => setFormData({ ...formData, selected_desire: value })}
                  >
                    <SelectTrigger className={`bg-background ${formData.selected_desire ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
                      <SelectValue placeholder="Seleccionar un deseo..." />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover max-h-[300px]" position="popper" sideOffset={4}>
                      {parsedResearch.desires.filter(d => d && d.trim()).map((desire, idx) => (
                        <SelectItem key={idx} value={desire} className="py-2">
                          <span className="line-clamp-2">{desire}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.selected_desire && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Deseo seleccionado
                    </p>
                  )}
                </div>
              )}

              {/* Objections / Objeciones */}
              {parsedResearch.objections.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ShieldX className="h-4 w-4 text-orange-500" />
                    Objeción a romper
                  </Label>
                  <Select
                    value={formData.selected_objection}
                    onValueChange={(value) => setFormData({ ...formData, selected_objection: value })}
                  >
                    <SelectTrigger className={`bg-background ${formData.selected_objection ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
                      <SelectValue placeholder="Seleccionar una objeción..." />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover max-h-[300px]" position="popper" sideOffset={4}>
                      {parsedResearch.objections.filter(o => o && o.trim()).map((objection, idx) => (
                        <SelectItem key={idx} value={objection} className="py-2">
                          <span className="line-clamp-2">{objection}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.selected_objection && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Objeción seleccionada
                    </p>
                  )}
                </div>
              )}

              {/* Show summary of selected variables */}
              {(formData.selected_pain || formData.selected_desire || formData.selected_objection) && (
                <div className="p-3 rounded-sm bg-muted/50 border border-muted">
                  <p className="text-xs font-medium mb-2">Variables seleccionadas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.selected_pain && (
                      <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30">
                        😰 Dolor
                      </Badge>
                    )}
                    {formData.selected_desire && (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30">
                        ✨ Deseo
                      </Badge>
                    )}
                    {formData.selected_objection && (
                      <Badge variant="outline" className="text-xs bg-orange-500/10 border-orange-500/30">
                        🚫 Objeción
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Parámetros del Contenido
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoSuggestParams}
                disabled={suggestingParams || !formData.product_name}
                className="gap-2"
              >
                {suggestingParams ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sugiriendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Sugerir con IA
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Completa manualmente o usa IA para sugerir los parámetros basados en tu producto y avatar
            </CardDescription>
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
                  placeholder="Ej: Transformación de vida (selecciona desde investigación)"
                  value={formData.sales_angle}
                  onChange={(e) => setFormData({ ...formData, sales_angle: e.target.value })}
                  className={formData.sales_angle ? "border-green-500/30 bg-green-500/5" : ""}
                />
                {formData.sales_angle && (
                  <p className="text-xs text-green-600 dark:text-green-400">✓ Ángulo seleccionado</p>
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
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar estructura" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
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
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* New: Duration and Platform */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Duración del video
                </Label>
                <Select
                  value={formData.video_duration}
                  onValueChange={(value) => setFormData({ ...formData, video_duration: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar duración" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
                    {VIDEO_DURATIONS.map(duration => (
                      <SelectItem key={duration.value} value={duration.value}>
                        {duration.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  Plataforma destino
                </Label>
                <Select
                  value={formData.target_platform}
                  onValueChange={(value) => setFormData({ ...formData, target_platform: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar plataforma" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
                    {TARGET_PLATFORMS.map(platform => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo de Contenido y Nivel de Producción */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  Tipo de Contenido
                </Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
                    {CONTENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  Nivel de Producción
                </Label>
                <Select
                  value={formData.production_level}
                  onValueChange={(value) => setFormData({ ...formData, production_level: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar nivel" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
                    {PRODUCTION_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{level.label}</span>
                          <span className="text-xs text-muted-foreground">{level.description}</span>
                        </div>
                      </SelectItem>
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

            {/* Toggle Perplexity Research - Only for organizations (requires n8n workflow) */}
            {!isFreelancer && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-sm border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-sm">
                      <Search className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Investigación en tiempo real</p>
                      <p className="text-xs text-muted-foreground">
                        Usa Perplexity para buscar tendencias y hooks actuales (requiere workflow n8n configurado)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.use_perplexity}
                    onCheckedChange={(checked) => setFormData({ ...formData, use_perplexity: checked })}
                  />
                </div>

                {formData.use_perplexity && (
                  <div className="ml-4 space-y-2 animate-in slide-in-from-top-2">
                    <p className="text-sm font-medium text-muted-foreground">¿Qué investigar?</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={perplexityQueries.trends ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setPerplexityQueries((q) => ({ ...q, trends: !q.trends }))}
                      >
                        📈 Tendencias actuales
                      </Badge>
                      <Badge
                        variant={perplexityQueries.hooks ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setPerplexityQueries((q) => ({ ...q, hooks: !q.hooks }))}
                      >
                        🎣 Hooks efectivos
                      </Badge>
                      <Badge
                        variant={perplexityQueries.competitors ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setPerplexityQueries((q) => ({ ...q, competitors: !q.competitors }))}
                      >
                        🏢 Competencia
                      </Badge>
                      <Badge
                        variant={perplexityQueries.audience ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setPerplexityQueries((q) => ({ ...q, audience: !q.audience }))}
                      >
                        👥 Audiencia
                      </Badge>
                    </div>

                    <Collapsible>
                      <CollapsibleTrigger className="text-sm text-purple-400 hover:text-purple-300">
                        + Agregar búsqueda personalizada
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Textarea
                          placeholder="Ej: ¿Cuáles son los challenges virales de TikTok esta semana relacionados con skincare?"
                          value={customPerplexityQuery}
                          onChange={(e) => setCustomPerplexityQuery(e.target.value)}
                          className="mt-2"
                          rows={2}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Card className="sticky bottom-4 shadow-lg border-primary/20">
          <CardContent className="pt-4 pb-4 space-y-4">
            {/* Generation Steps Progress */}
            {loading && (
              <div className="space-y-2 p-3 rounded-sm bg-muted/50">
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
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Error en la generación. Contacta al administrador.</span>
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
                    <ScrollArea className="h-[500px] rounded-sm border p-4">
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
