import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, Loader2, Target, Users, Globe, FileText, 
  MessageSquare, ListOrdered, Plus, X, Wand2, Settings2,
  Video, ChevronDown, CheckCircle2, Bot
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  strategy: string | null;
  market_research: string | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url?: string | null;
  onboarding_url?: string | null;
  research_url?: string | null;
}

interface GeneratedContent {
  script: string;
  editor_guidelines?: string;
  strategist_guidelines?: string;
  trafficker_guidelines?: string;
}

interface ScriptGeneratorProps {
  product: Product | null;
  contentId?: string;
  onScriptGenerated: (content: GeneratedContent) => void;
}

interface ScriptFormData {
  cta: string;
  sales_angle: string;
  hooks_count: string;
  ideal_avatar: string;
  target_country: string;
  narrative_structure: string;
  additional_instructions: string;
  hooks: string[];
  script_prompt: string;
  editor_prompt: string;
  strategist_prompt: string;
  trafficker_prompt: string;
  reference_transcription: string;
  video_strategies: string;
  // AI Selection
  ai_provider: "lovable" | "openai" | "anthropic";
  ai_model: string;
}

interface GenerationStep {
  key: "script" | "editor" | "strategist" | "trafficker";
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

// AI Provider options
const AI_PROVIDERS = [
  { 
    value: "lovable", 
    label: "Lovable AI", 
    description: "Google Gemini & OpenAI GPT-5",
    models: [
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Recomendado)" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Rápido)" },
      { value: "openai/gpt-5", label: "GPT-5" },
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    ]
  },
  { 
    value: "openai", 
    label: "OpenAI GPT", 
    description: "Requiere API Key",
    models: [
      { value: "gpt-4o", label: "GPT-4o (Recomendado)" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini (Rápido)" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Económico)" },
    ]
  },
  { 
    value: "anthropic", 
    label: "Anthropic Claude", 
    description: "Requiere API Key",
    models: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (Recomendado)" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (Rápido)" },
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
  "México",
  "Colombia",
  "Argentina",
  "España",
  "Chile",
  "Perú",
  "Estados Unidos (Latino)",
  "Otro",
];

const CONTENT_AI_FUNCTION = "content-ai";

const DEFAULT_PROMPTS = {
  script: `Genera un guión de video corto (TikTok/Reels/Shorts) que sea natural, conversacional y fácil de memorizar. 
Incluye múltiples opciones de hooks de apertura.
Sigue la estructura narrativa indicada.
Integra el CTA de forma natural al final.`,
  editor: `Basándote en el guión generado, crea pautas detalladas para el editor de video:
- Estilo visual sugerido
- Ritmo de edición
- Transiciones recomendadas
- Efectos de texto/gráficos
- Música y sonidos sugeridos
- Duración de cada sección`,
  strategist: `Basándote en el guión, crea pautas para el estratega:
- Mejor horario de publicación
- Hashtags recomendados
- Caption sugerido
- Estrategia de engagement
- Métricas clave a monitorear`,
  trafficker: `Basándote en el guión, crea pautas para el trafficker:
- Audiencias objetivo sugeridas
- Objetivos de campaña recomendados
- Presupuesto sugerido
- Formatos de anuncio ideales
- Copy para anuncios`,
};

export function ScriptGenerator({ product, contentId, onScriptGenerated }: ScriptGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newHook, setNewHook] = useState("");
  const [promptsOpen, setPromptsOpen] = useState(false);
  
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { key: "script", label: "Guión", status: "pending" },
    { key: "editor", label: "Pautas Editor", status: "pending" },
    { key: "strategist", label: "Pautas Estratega", status: "pending" },
    { key: "trafficker", label: "Pautas Trafficker", status: "pending" },
  ]);

  const [formData, setFormData] = useState<ScriptFormData>({
    cta: "",
    sales_angle: "",
    hooks_count: "3",
    ideal_avatar: "",
    target_country: "",
    narrative_structure: "",
    additional_instructions: "",
    hooks: [],
    script_prompt: DEFAULT_PROMPTS.script,
    editor_prompt: DEFAULT_PROMPTS.editor,
    strategist_prompt: DEFAULT_PROMPTS.strategist,
    trafficker_prompt: DEFAULT_PROMPTS.trafficker,
    reference_transcription: "",
    video_strategies: "",
    ai_provider: "lovable",
    ai_model: "google/gemini-2.5-flash",
  });

  const currentProvider = AI_PROVIDERS.find(p => p.value === formData.ai_provider);
  const availableModels = currentProvider?.models || [];

  // Update model when provider changes
  useEffect(() => {
    const provider = AI_PROVIDERS.find(p => p.value === formData.ai_provider);
    if (provider && provider.models.length > 0) {
      setFormData(prev => ({
        ...prev,
        ai_model: provider.models[0].value
      }));
    }
  }, [formData.ai_provider]);

  // Pre-fill avatar from product if available
  useEffect(() => {
    if (product?.ideal_avatar) {
      const strippedAvatar = product.ideal_avatar.replace(/<[^>]*>/g, '').substring(0, 200);
      setFormData(prev => ({
        ...prev,
        ideal_avatar: strippedAvatar
      }));
    }
  }, [product]);

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
      { key: "script", label: "Guión", status: "pending" },
      { key: "editor", label: "Pautas Editor", status: "pending" },
      { key: "strategist", label: "Pautas Estratega", status: "pending" },
      { key: "trafficker", label: "Pautas Trafficker", status: "pending" },
    ]);
  };

  const buildBaseContext = () => {
    const narrativeLabel = NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure;
    
    return `PRODUCTO: ${product?.name}
DESCRIPCIÓN: ${product?.description || 'No disponible'}
CTA: ${formData.cta}
ÁNGULO DE VENTA: ${formData.sales_angle}
ESTRUCTURA NARRATIVA: ${narrativeLabel}
PAÍS OBJETIVO: ${formData.target_country}
AVATAR/CLIENTE IDEAL: ${formData.ideal_avatar}

ESTRATEGIA DEL PRODUCTO:
${product?.strategy || 'No disponible'}

INVESTIGACIÓN DE MERCADO:
${product?.market_research || 'No disponible'}

ÁNGULOS DE VENTA DISPONIBLES:
${product?.sales_angles?.join(', ') || 'No definidos'}

HOOKS SUGERIDOS:
${formData.hooks.length > 0 ? formData.hooks.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'Generar automáticamente'}

${formData.reference_transcription ? `TRANSCRIPCIÓN VIDEO DE REFERENCIA:\n${formData.reference_transcription}\n` : ''}
${formData.video_strategies ? `ESTRATEGIAS/ESTRUCTURAS DE VIDEO A USAR:\n${formData.video_strategies}\n` : ''}
${formData.additional_instructions ? `INSTRUCCIONES ADICIONALES:\n${formData.additional_instructions}` : ''}

DOCUMENTOS DEL PRODUCTO:
${product?.brief_url ? `- Brief: ${product.brief_url}` : ''}
${product?.onboarding_url ? `- Onboarding: ${product.onboarding_url}` : ''}
${product?.research_url ? `- Research: ${product.research_url}` : ''}`;
  };

  const generateContent = async (
    type: "script" | "editor" | "strategist" | "trafficker",
    customPrompt: string,
    previousScript?: string
  ): Promise<string> => {
    const baseContext = buildBaseContext();
    
    let fullPrompt = `${customPrompt}\n\n---\nCONTEXTO:\n${baseContext}`;
    
    if (previousScript && type !== "script") {
      fullPrompt += `\n\n---\nGUIÓN GENERADO:\n${previousScript}`;
    }

    const { data, error } = await supabase.functions.invoke(CONTENT_AI_FUNCTION, {
      body: {
        action: "generate_script",
        prompt: fullPrompt,
        product: {
          id: product?.id,
          name: product?.name,
          description: product?.description,
          strategy: product?.strategy,
          market_research: product?.market_research,
          ideal_avatar: product?.ideal_avatar,
          sales_angles: product?.sales_angles,
          brief_url: product?.brief_url,
          onboarding_url: product?.onboarding_url,
          research_url: product?.research_url,
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
    if (!product) {
      toast({
        title: "Selecciona un producto",
        description: "Primero debes asociar un producto al proyecto",
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

    const generatedContent: GeneratedContent = {
      script: "",
      editor_guidelines: "",
      strategist_guidelines: "",
      trafficker_guidelines: "",
    };

    try {
      // Step 1: Generate Script
      updateStepStatus("script", "generating");
      generatedContent.script = await generateContent("script", formData.script_prompt);
      updateStepStatus("script", "done");

      // Step 2: Generate Editor Guidelines (based on script)
      updateStepStatus("editor", "generating");
      generatedContent.editor_guidelines = await generateContent(
        "editor", 
        formData.editor_prompt, 
        generatedContent.script
      );
      updateStepStatus("editor", "done");

      // Step 3: Generate Strategist Guidelines (based on script)
      updateStepStatus("strategist", "generating");
      generatedContent.strategist_guidelines = await generateContent(
        "strategist", 
        formData.strategist_prompt, 
        generatedContent.script
      );
      updateStepStatus("strategist", "done");

      // Step 4: Generate Trafficker Guidelines (based on script)
      updateStepStatus("trafficker", "generating");
      generatedContent.trafficker_guidelines = await generateContent(
        "trafficker", 
        formData.trafficker_prompt, 
        generatedContent.script
      );
      updateStepStatus("trafficker", "done");

      onScriptGenerated(generatedContent);
      
      toast({
        title: "Contenido generado exitosamente",
        description: `Guión y pautas generados con ${currentProvider?.label}`,
      });
    } catch (error) {
      console.error("Error:", error);
      const currentStep = generationSteps.find(s => s.status === "generating");
      if (currentStep) {
        updateStepStatus(currentStep.key, "error");
      }
      toast({
        title: "Error al generar",
        description: error instanceof Error ? error.message : "No se pudo completar la generación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="p-6 border rounded-lg bg-muted/50 text-center">
        <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Selecciona un producto para poder crear el brief del guión
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2 text-lg">
          <Wand2 className="h-5 w-5 text-primary" />
          Formulario de Guión
        </h4>
        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
          {currentProvider?.label}
        </Badge>
      </div>

      {/* AI Provider Selection */}
      <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <Label className="text-sm font-medium">Seleccionar IA</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Proveedor</Label>
            <Select 
              value={formData.ai_provider} 
              onValueChange={(v: "lovable" | "openai" | "anthropic") => setFormData({ ...formData, ai_provider: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex flex-col">
                      <span>{provider.label}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Modelo</Label>
            <Select 
              value={formData.ai_model} 
              onValueChange={(v) => setFormData({ ...formData, ai_model: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CTA */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" /> CTA (Llamado a la acción) *
          </Label>
          <Input
            value={formData.cta}
            onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
            placeholder="Ej: Haz clic en el link de la bio"
          />
        </div>

        {/* Ángulo de Venta */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Ángulo de Venta *
          </Label>
          <Select 
            value={formData.sales_angle} 
            onValueChange={(v) => setFormData({ ...formData, sales_angle: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar ángulo..." />
            </SelectTrigger>
            <SelectContent>
              {product.sales_angles?.map((angle, idx) => (
                <SelectItem key={idx} value={angle}>
                  {angle}
                </SelectItem>
              ))}
              {(!product.sales_angles || product.sales_angles.length === 0) && (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  No hay ángulos definidos en el producto
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Número de Hooks */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Cantidad de Hooks
          </Label>
          <Select 
            value={formData.hooks_count} 
            onValueChange={(v) => setFormData({ ...formData, hooks_count: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(n => (
                <SelectItem key={n} value={String(n)}>{n} Hook{n > 1 ? 's' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* País Objetivo */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> País Objetivo
          </Label>
          <Select 
            value={formData.target_country} 
            onValueChange={(v) => setFormData({ ...formData, target_country: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar país..." />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estructura Narrativa */}
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Estructura Narrativa *
          </Label>
          <Select 
            value={formData.narrative_structure} 
            onValueChange={(v) => setFormData({ ...formData, narrative_structure: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estructura..." />
            </SelectTrigger>
            <SelectContent>
              {NARRATIVE_STRUCTURES.map((structure) => (
                <SelectItem key={structure.value} value={structure.value}>
                  {structure.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Avatar Ideal */}
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Avatar / Cliente Ideal
          </Label>
          <Textarea
            value={formData.ideal_avatar}
            onChange={(e) => setFormData({ ...formData, ideal_avatar: e.target.value })}
            placeholder="Describe al cliente ideal: edad, género, dolores, deseos..."
            rows={2}
          />
        </div>
      </div>

      {/* Video Strategies Section */}
      <div className="space-y-2 pt-4 border-t">
        <Label className="flex items-center gap-2">
          <Video className="h-4 w-4" /> Estrategias / Estructuras de Video
        </Label>
        <Textarea
          value={formData.video_strategies}
          onChange={(e) => setFormData({ ...formData, video_strategies: e.target.value })}
          placeholder="Ej: POV, Storytime, ASMR, Unboxing, Tutorial rápido, Trend de TikTok..."
          rows={2}
        />
      </div>

      {/* Reference Transcription Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" /> Transcripción Video de Referencia (opcional)
        </Label>
        <Textarea
          value={formData.reference_transcription}
          onChange={(e) => setFormData({ ...formData, reference_transcription: e.target.value })}
          placeholder="Pega aquí la transcripción de un video de referencia que quieras usar como inspiración..."
          rows={3}
        />
      </div>

      {/* Hooks personalizados */}
      <div className="space-y-3 pt-4 border-t">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Hooks Sugeridos (opcional)
        </Label>
        <p className="text-xs text-muted-foreground">
          Agrega ideas de hooks específicos o déjalo vacío para que la IA los genere
        </p>
        
        <div className="flex gap-2">
          <Input
            value={newHook}
            onChange={(e) => setNewHook(e.target.value)}
            placeholder="Ej: ¿Sabías que el 80% de las personas...?"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHook())}
            disabled={formData.hooks.length >= parseInt(formData.hooks_count)}
          />
          <Button 
            type="button" 
            onClick={addHook} 
            variant="outline"
            disabled={formData.hooks.length >= parseInt(formData.hooks_count)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {formData.hooks.length > 0 && (
          <div className="space-y-2">
            {formData.hooks.map((hook, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
                <span className="flex-1 text-sm">{hook}</span>
                <button
                  type="button"
                  onClick={() => removeHook(idx)}
                  className="p-1 hover:bg-destructive/20 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instrucciones adicionales */}
      <div className="space-y-2">
        <Label>Instrucciones adicionales</Label>
        <Textarea
          value={formData.additional_instructions}
          onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
          placeholder="Agrega cualquier indicación especial para este guión..."
          rows={2}
        />
      </div>

      {/* Custom Prompts Section */}
      <Collapsible open={promptsOpen} onOpenChange={setPromptsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Personalizar Prompts de IA
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${promptsOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Script Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Guión</Label>
            <Textarea
              value={formData.script_prompt}
              onChange={(e) => setFormData({ ...formData, script_prompt: e.target.value })}
              placeholder="Instrucciones para generar el guión..."
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Editor Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Pautas del Editor</Label>
            <Textarea
              value={formData.editor_prompt}
              onChange={(e) => setFormData({ ...formData, editor_prompt: e.target.value })}
              placeholder="Instrucciones para generar pautas de edición..."
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Strategist Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Pautas del Estratega</Label>
            <Textarea
              value={formData.strategist_prompt}
              onChange={(e) => setFormData({ ...formData, strategist_prompt: e.target.value })}
              placeholder="Instrucciones para generar pautas de estrategia..."
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Trafficker Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Pautas del Trafficker</Label>
            <Textarea
              value={formData.trafficker_prompt}
              onChange={(e) => setFormData({ ...formData, trafficker_prompt: e.target.value })}
              placeholder="Instrucciones para generar pautas de tráfico pagado..."
              rows={3}
              className="text-sm"
            />
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFormData(prev => ({
              ...prev,
              script_prompt: DEFAULT_PROMPTS.script,
              editor_prompt: DEFAULT_PROMPTS.editor,
              strategist_prompt: DEFAULT_PROMPTS.strategist,
              trafficker_prompt: DEFAULT_PROMPTS.trafficker,
            }))}
          >
            Restaurar prompts por defecto
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Generation Progress */}
      {loading && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-3">Progreso de generación ({currentProvider?.label}):</p>
          {generationSteps.map((step) => (
            <div key={step.key} className="flex items-center gap-3">
              {step.status === "pending" && (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
              )}
              {step.status === "generating" && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              {step.status === "done" && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {step.status === "error" && (
                <X className="h-5 w-5 text-destructive" />
              )}
              <span className={`text-sm ${step.status === "generating" ? "text-primary font-medium" : ""}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Generate Button */}
      <Button 
        onClick={handleGenerate} 
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generando con {currentProvider?.label}...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generar Todo con IA
          </>
        )}
      </Button>
    </div>
  );
}
