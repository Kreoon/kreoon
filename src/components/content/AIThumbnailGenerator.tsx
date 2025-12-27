import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Image, Upload, Sparkles, Loader2, Wand2, Edit3, 
  Check, RefreshCw, X, Eye, Palette, Copy, 
  User, Package, ImageIcon, Plus
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScriptContext {
  script?: string | null;
  salesAngle?: string | null;
  idealAvatar?: string | null;
  hooksCount?: number;
  productName?: string | null;
  clientName?: string | null;
  // Extended context
  strategistGuidelines?: string | null;
  editorGuidelines?: string | null;
  designerGuidelines?: string | null;
  adminGuidelines?: string | null;
  traffickerGuidelines?: string | null;
}

interface AIThumbnailGeneratorProps {
  contentId: string;
  organizationId: string;
  currentThumbnail?: string | null;
  scriptContext: ScriptContext;
  onThumbnailGenerated?: (thumbnailUrl: string) => void;
}

interface ImageReference {
  alias: string;
  type: 'character' | 'product' | 'style';
  label: string;
  image: string | null;
}

const HIGHLIGHT_OPTIONS = [
  { value: "emocion", label: "Emoción", description: "Conectar emocionalmente con el espectador" },
  { value: "autoridad", label: "Autoridad", description: "Transmitir confianza y expertise" },
  { value: "curiosidad", label: "Curiosidad", description: "Generar intriga para hacer clic" },
  { value: "impacto", label: "Impacto Visual", description: "Captar atención instantánea" },
];

const TEXT_LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
];

const TEXT_ZONES = [
  { value: "superior", label: "Superior", description: "15-35% desde arriba" },
  { value: "centro", label: "Centro", description: "35-65% desde arriba" },
  { value: "inferior", label: "Inferior", description: "65-85% desde arriba" },
];

// Format options per AI provider
const AI_MODELS = [
  { 
    value: "gemini-3-pro-image", 
    label: "🥇 Gemini 3 Pro Image", 
    description: "Más avanzado - Nueva generación",
    provider: "gemini",
    model: "google/gemini-3-pro-image-preview",
    recommended: true,
    tier: "premium",
    formats: [
      { value: "1080x1920", label: "Vertical 9:16", description: "1080×1920 - TikTok, Reels, Shorts", recommended: true },
      { value: "1080x1080", label: "Cuadrado 1:1", description: "1080×1080 - Feed Instagram", recommended: false },
      { value: "1920x1080", label: "Horizontal 16:9", description: "1920×1080 - YouTube", recommended: false },
      { value: "1024x1024", label: "Cuadrado HD", description: "1024×1024 - Alta calidad", recommended: false },
    ]
  },
  { 
    value: "gemini-flash-image", 
    label: "⚡ Gemini Flash Image", 
    description: "Rápido y eficiente (Nano Banana)",
    provider: "gemini",
    model: "google/gemini-2.5-flash-image-preview",
    recommended: false,
    tier: "fast",
    formats: [
      { value: "1080x1920", label: "Vertical 9:16", description: "1080×1920 - TikTok, Reels, Shorts", recommended: true },
      { value: "1080x1080", label: "Cuadrado 1:1", description: "1080×1080 - Feed Instagram", recommended: false },
      { value: "1920x1080", label: "Horizontal 16:9", description: "1920×1080 - YouTube", recommended: false },
      { value: "1024x1024", label: "Cuadrado HD", description: "1024×1024 - Alta calidad", recommended: false },
    ]
  },
  { 
    value: "gpt-image-1", 
    label: "🎨 GPT Image 1", 
    description: "OpenAI más avanzado",
    provider: "openai",
    model: "gpt-image-1",
    recommended: false,
    tier: "premium",
    formats: [
      { value: "1024x1536", label: "Vertical 2:3", description: "1024×1536 - Formato vertical", recommended: true },
      { value: "1024x1024", label: "Cuadrado 1:1", description: "1024×1024 - Feed", recommended: false },
      { value: "1536x1024", label: "Horizontal 3:2", description: "1536×1024 - Paisaje", recommended: false },
    ]
  },
  { 
    value: "dall-e-3", 
    label: "🖼️ DALL-E 3", 
    description: "OpenAI - Excelente calidad artística",
    provider: "openai",
    model: "dall-e-3",
    recommended: false,
    tier: "quality",
    formats: [
      { value: "1024x1792", label: "Vertical", description: "1024×1792 - Formato vertical", recommended: true },
      { value: "1024x1024", label: "Cuadrado", description: "1024×1024 - Feed", recommended: false },
      { value: "1792x1024", label: "Horizontal", description: "1792×1024 - Paisaje", recommended: false },
    ]
  },
];

const CONTENT_TYPES = [
  { value: "organic", label: "Orgánico", description: "Contenido natural para feed" },
  { value: "ads", label: "Ads/Paid", description: "Anuncios pagados" },
  { value: "internal_brand", label: "Marca Interna", description: "Contenido de marca propia" },
];

const PRODUCT_ROLES = [
  { value: "protagonist", label: "Protagonista", description: "Producto ocupa 40-60% del encuadre" },
  { value: "secondary", label: "Secundario", description: "Producto ocupa 15-30% del encuadre" },
  { value: "contextual", label: "Contextual", description: "Producto en background" },
];

const PRODUCT_VISIBILITY = [
  { value: "full", label: "Completo", description: "Producto 100% visible" },
  { value: "partial", label: "Parcial", description: "Parte del producto visible" },
];

export function AIThumbnailGenerator({ 
  contentId,
  organizationId,
  currentThumbnail, 
  scriptContext,
  onThumbnailGenerated 
}: AIThumbnailGeneratorProps) {
  const { toast } = useToast();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Image references with aliases
  const [imageReferences, setImageReferences] = useState<ImageReference[]>([
    { alias: "@img1", type: "character", label: "Personaje / Creador", image: null },
    { alias: "@img2", type: "product", label: "Producto", image: null },
  ]);

  // Form state
  const [productRole, setProductRole] = useState("secondary");
  const [productVisibility, setProductVisibility] = useState("full");
  const [showBrand, setShowBrand] = useState(true);
  const [includeText, setIncludeText] = useState(false);
  const [thumbnailText, setThumbnailText] = useState("");
  const [textLanguage, setTextLanguage] = useState("es");
  const [highlightStyle, setHighlightStyle] = useState("emocion");
  const [textZone, setTextZone] = useState("superior");
  const [selectedAiModel, setSelectedAiModel] = useState("gemini-3-pro-image");
  const [outputFormat, setOutputFormat] = useState("1080x1920");
  const [contentType, setContentType] = useState<"organic" | "ads" | "internal_brand">("organic");

  // Get current model config
  const currentModelConfig = AI_MODELS.find(m => m.value === selectedAiModel) || AI_MODELS[0];
  const availableFormats = currentModelConfig.formats;

  // Generation state
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [promptJson, setPromptJson] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBuildingPrompt, setIsBuildingPrompt] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [step, setStep] = useState<"config" | "prompt" | "result">("config");
  const [activeJsonTab, setActiveJsonTab] = useState("prompt");

  const handleModelChange = (modelValue: string) => {
    const newModel = AI_MODELS.find(m => m.value === modelValue);
    if (newModel) {
      setSelectedAiModel(modelValue);
      const formatExists = newModel.formats.some(f => f.value === outputFormat);
      if (!formatExists) {
        const recommendedFormat = newModel.formats.find(f => f.recommended) || newModel.formats[0];
        setOutputFormat(recommendedFormat.value);
      }
    }
  };

  const handleImageUpload = (file: File, alias: string) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo no válido", description: "Solo se permiten imágenes", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageReferences(prev => 
        prev.map(ref => ref.alias === alias ? { ...ref, image: reader.result as string } : ref)
      );
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (alias: string) => {
    setImageReferences(prev => 
      prev.map(ref => ref.alias === alias ? { ...ref, image: null } : ref)
    );
  };

  const addStyleReference = () => {
    const nextNumber = imageReferences.filter(r => r.type === 'style').length + 3;
    setImageReferences(prev => [
      ...prev,
      { alias: `@img${nextNumber}`, type: "style", label: `Referencia de estilo ${nextNumber - 2}`, image: null }
    ]);
  };

  const removeStyleReference = (alias: string) => {
    setImageReferences(prev => prev.filter(ref => ref.alias !== alias));
  };

  const generatePrompt = async () => {
    setIsBuildingPrompt(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Debes iniciar sesión", variant: "destructive" });
        return;
      }

      // Build image references for API
      const imageRefsForApi = imageReferences.map(ref => ({
        alias: ref.alias,
        type: ref.type,
        hasImage: !!ref.image
      }));

      // Call GPT to build the prompt with all context
      const { data, error } = await supabase.functions.invoke('build-image-prompt', {
        body: {
          // Script context
          script: scriptContext.script,
          salesAngle: scriptContext.salesAngle,
          idealAvatar: scriptContext.idealAvatar,
          productName: scriptContext.productName,
          clientName: scriptContext.clientName,
          hooksCount: scriptContext.hooksCount,
          
          // Extended context
          strategistGuidelines: scriptContext.strategistGuidelines,
          editorGuidelines: scriptContext.editorGuidelines,
          designerGuidelines: scriptContext.designerGuidelines,
          adminGuidelines: scriptContext.adminGuidelines,
          traffickerGuidelines: scriptContext.traffickerGuidelines,
          
          // Form inputs
          contentType,
          productRole,
          productVisibility,
          showBrand,
          includeText,
          thumbnailText,
          textLanguage,
          textZone,
          highlightStyle,
          
          // Format
          outputFormat,
          
          // Image references with aliases
          imageReferences: imageRefsForApi
        }
      });

      if (error) throw error;

      if (data?.final_prompt) {
        setGeneratedPrompt(data.final_prompt);
        setPromptJson(data);
        setStep("prompt");
        
        console.log("🎨 GPT PROMPT BUILDER - Full JSON:", JSON.stringify(data, null, 2));
        toast({ title: "Prompt generado por IA", description: "Revisa el JSON y edita si es necesario" });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error building prompt:', error);
      toast({ 
        title: "Error al generar prompt", 
        description: error instanceof Error ? error.message : "No se pudo generar el prompt",
        variant: "destructive" 
      });
    } finally {
      setIsBuildingPrompt(false);
    }
  };

  const generateThumbnail = async () => {
    if (!generatedPrompt) {
      toast({ title: "Genera el prompt primero", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Debes iniciar sesión", variant: "destructive" });
        return;
      }

      const modelConfig = AI_MODELS.find(m => m.value === selectedAiModel) || AI_MODELS[0];

      // Get character and product images
      const characterImage = imageReferences.find(r => r.type === 'character')?.image || null;
      const productImage = imageReferences.find(r => r.type === 'product')?.image || null;

      const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
        body: { 
          prompt: generatedPrompt,
          referenceImage: characterImage,
          productImage: productImage,
          contentId,
          organizationId,
          outputFormat: outputFormat,
          aiProvider: modelConfig.provider,
          aiModel: modelConfig.model
        }
      });

      if (error) throw error;

      if (data?.error === 'MODULE_INACTIVE') {
        toast({ 
          title: "IA no habilitada", 
          description: "El módulo de IA 'Generación de Miniaturas' no está activado.",
          variant: "destructive" 
        });
        return;
      }

      if (data?.thumbnail_url) {
        setGeneratedThumbnail(data.thumbnail_url);
        setStep("result");
        toast({ title: "Miniatura generada", description: "Revisa el resultado y guárdalo si te gusta" });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      toast({ 
        title: "Error al generar", 
        description: error instanceof Error ? error.message : "No se pudo generar la miniatura",
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveThumbnail = async () => {
    if (!generatedThumbnail) return;

    try {
      const { error } = await supabase
        .from('content')
        .update({ thumbnail_url: generatedThumbnail })
        .eq('id', contentId);

      if (error) throw error;

      onThumbnailGenerated?.(generatedThumbnail);
      toast({ title: "Miniatura guardada", description: "La miniatura se guardó correctamente" });
      
      setStep("config");
      setGeneratedThumbnail(null);
    } catch (error) {
      console.error('Error saving thumbnail:', error);
      toast({ 
        title: "Error al guardar", 
        description: "No se pudo guardar la miniatura",
        variant: "destructive" 
      });
    }
  };

  const resetGenerator = () => {
    setStep("config");
    setGeneratedPrompt("");
    setPromptJson(null);
    setGeneratedThumbnail(null);
  };

  const copyJsonToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(promptJson, null, 2));
    toast({ title: "JSON copiado", description: "El JSON se copió al portapapeles" });
  };

  const getImageIcon = (type: string) => {
    switch (type) {
      case 'character': return <User className="h-4 w-4" />;
      case 'product': return <Package className="h-4 w-4" />;
      default: return <ImageIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-primary/10">
          <Wand2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="font-medium">Generador de Imágenes IA (Project-Aware)</h4>
          <p className="text-xs text-muted-foreground">
            Crea imágenes profesionales con todo el contexto del proyecto
          </p>
        </div>
      </div>

      {/* Step 1: Configuration */}
      {step === "config" && (
        <div className="space-y-4">
          {/* Section 1: Image References with Aliases */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-primary transition-colors">
              <Image className="h-4 w-4" />
              🖼️ Referencias Visuales (Aliases)
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                Las imágenes se referencian por alias (@img1, @img2...). La IA inferirá rasgos automáticamente.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {imageReferences.map((ref) => (
                  <div key={ref.alias} className="space-y-2 p-3 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getImageIcon(ref.type)}
                        <div>
                          <code className="text-xs font-mono bg-primary/10 px-1.5 py-0.5 rounded text-primary">
                            {ref.alias}
                          </code>
                          <p className="text-xs text-muted-foreground">{ref.label}</p>
                        </div>
                      </div>
                      {ref.type === 'style' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeStyleReference(ref.alias)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <input
                      ref={(el) => { fileInputRefs.current[ref.alias] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], ref.alias)}
                    />
                    
                    {ref.image ? (
                      <div className="relative w-full aspect-square max-h-[100px] rounded-lg overflow-hidden border">
                        <img src={ref.image} alt={ref.label} className="w-full h-full object-cover" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeImage(ref.alias)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Badge className="absolute bottom-1 left-1 text-[9px]" variant="secondary">
                          {ref.alias}
                        </Badge>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[ref.alias]?.click()}
                        className="w-full h-[60px] border-dashed"
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Subir
                      </Button>
                    )}
                  </div>
                ))}
                
                {/* Add style reference button */}
                <div className="p-3 border rounded-lg bg-card/50 border-dashed flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addStyleReference}
                    className="w-full h-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir referencia de estilo
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 2: Product Configuration */}
          {imageReferences.some(r => r.type === 'product' && r.image) && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-primary transition-colors">
                <Package className="h-4 w-4" />
                🧴 Configuración del Producto
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Rol del producto en la imagen</Label>
                  <RadioGroup
                    value={productRole}
                    onValueChange={setProductRole}
                    className="space-y-1"
                  >
                    {PRODUCT_ROLES.map(role => (
                      <div key={role.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={role.value} id={`role-${role.value}`} />
                        <Label htmlFor={`role-${role.value}`} className="cursor-pointer text-xs">
                          <span className="font-medium">{role.label}</span>
                          <span className="text-muted-foreground ml-1">- {role.description}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Visibilidad del producto</Label>
                  <RadioGroup
                    value={productVisibility}
                    onValueChange={setProductVisibility}
                    className="flex gap-4"
                  >
                    {PRODUCT_VISIBILITY.map(vis => (
                      <div key={vis.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={vis.value} id={`vis-${vis.value}`} />
                        <Label htmlFor={`vis-${vis.value}`} className="cursor-pointer text-xs">
                          {vis.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <Label className="text-xs">¿Mostrar marca/logo?</Label>
                  <Switch checked={showBrand} onCheckedChange={setShowBrand} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Section 3: Text Overlay */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-primary transition-colors">
              <Edit3 className="h-4 w-4" />
              📝 Texto en la Imagen
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">¿Incluir texto?</Label>
                  <p className="text-xs text-muted-foreground">Texto superpuesto en la imagen</p>
                </div>
                <Switch checked={includeText} onCheckedChange={setIncludeText} />
              </div>

              {includeText && (
                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-1">
                    <Label className="text-xs">Texto exacto (máx. 3-5 palabras)</Label>
                    <Input
                      value={thumbnailText}
                      onChange={(e) => setThumbnailText(e.target.value)}
                      placeholder="Ej: ¡Esto cambió todo!"
                      maxLength={40}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Idioma</Label>
                      <Select value={textLanguage} onValueChange={setTextLanguage}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEXT_LANGUAGES.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Posición</Label>
                      <Select value={textZone} onValueChange={setTextZone}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEXT_ZONES.map(zone => (
                            <SelectItem key={zone.value} value={zone.value}>
                              {zone.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Highlight Style */}
              <div className="space-y-2">
                <Label className="text-sm">Estilo a resaltar</Label>
                <RadioGroup
                  value={highlightStyle}
                  onValueChange={setHighlightStyle}
                  className="grid grid-cols-2 gap-2"
                >
                  {HIGHLIGHT_OPTIONS.map(option => (
                    <div key={option.value} className="flex items-start space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <Label htmlFor={option.value} className="cursor-pointer">
                        <span className="text-sm font-medium">{option.label}</span>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 4: Output Format */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-primary transition-colors">
              <Palette className="h-4 w-4" />
              📐 Formato de Salida
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {/* Content Type */}
              <div className="space-y-2">
                <Label className="text-xs">Tipo de contenido</Label>
                <div className="flex gap-2">
                  {CONTENT_TYPES.map(type => (
                    <Button
                      key={type.value}
                      variant={contentType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType(type.value as any)}
                      className="flex-1"
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* AI Model */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">🤖 Modelo de IA</Label>
                <RadioGroup
                  value={selectedAiModel}
                  onValueChange={handleModelChange}
                  className="space-y-2"
                >
                  {AI_MODELS.map(model => (
                    <div key={model.value} className={`flex items-center space-x-2 p-2 rounded-md border ${model.recommended ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                      <RadioGroupItem value={model.value} id={`model-${model.value}`} />
                      <Label htmlFor={`model-${model.value}`} className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{model.label}</span>
                          {model.recommended && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">Recomendado</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{model.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Output Format */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">📐 Tamaño de imagen</Label>
                <RadioGroup
                  value={outputFormat}
                  onValueChange={setOutputFormat}
                  className="space-y-2"
                >
                  {availableFormats.map(format => (
                    <div key={format.value} className={`flex items-center space-x-2 p-2 rounded-md border ${format.recommended ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                      <RadioGroupItem value={format.value} id={`format-${format.value}`} />
                      <Label htmlFor={`format-${format.value}`} className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{format.label}</span>
                          <code className="text-[10px] bg-muted px-1 rounded">{format.value}</code>
                        </div>
                        <p className="text-xs text-muted-foreground">{format.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Context Info */}
          {scriptContext.script && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <Check className="h-3 w-3 text-green-500" />
              Contexto del proyecto detectado (guion, estrategia, etc.)
            </div>
          )}

          {/* Generate Prompt Button */}
          <Button
            onClick={generatePrompt}
            className="w-full"
            variant="secondary"
            disabled={isBuildingPrompt}
          >
            {isBuildingPrompt ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Construyendo prompt con IA...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Prompt Estructurado
              </>
            )}
          </Button>
        </div>
      )}

      {/* Step 2: Review JSON Prompt */}
      {step === "prompt" && promptJson && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">JSON Estructurado (Editable)</h4>
            <Button variant="ghost" size="sm" onClick={copyJsonToClipboard}>
              <Copy className="h-3 w-3 mr-1" />
              Copiar
            </Button>
          </div>

          <Tabs value={activeJsonTab} onValueChange={setActiveJsonTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="prompt" className="text-xs">Prompt Final</TabsTrigger>
              <TabsTrigger value="composition" className="text-xs">Composición</TabsTrigger>
              <TabsTrigger value="context" className="text-xs">Contexto</TabsTrigger>
              <TabsTrigger value="full" className="text-xs">JSON Completo</TabsTrigger>
            </TabsList>
            
            <TabsContent value="prompt" className="mt-2">
              <Textarea
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                className="min-h-[250px] text-xs font-mono"
                placeholder="El prompt final aparecerá aquí..."
              />
            </TabsContent>
            
            <TabsContent value="composition" className="mt-2">
              <ScrollArea className="h-[250px] rounded-md border p-3">
                <div className="space-y-3 text-xs">
                  {promptJson.references && (
                    <div>
                      <h5 className="font-semibold text-primary mb-1">Referencias:</h5>
                      <pre className="bg-muted/50 p-2 rounded text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(promptJson.references, null, 2)}
                      </pre>
                    </div>
                  )}
                  {promptJson.composition && (
                    <div>
                      <h5 className="font-semibold text-primary mb-1">Composición:</h5>
                      <pre className="bg-muted/50 p-2 rounded text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(promptJson.composition, null, 2)}
                      </pre>
                    </div>
                  )}
                  {promptJson.visual_style && (
                    <div>
                      <h5 className="font-semibold text-primary mb-1">Estilo Visual:</h5>
                      <pre className="bg-muted/50 p-2 rounded text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(promptJson.visual_style, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="context" className="mt-2">
              <ScrollArea className="h-[250px] rounded-md border p-3">
                <div className="space-y-3 text-xs">
                  {promptJson.meta && (
                    <div>
                      <h5 className="font-semibold text-primary mb-1">Meta:</h5>
                      <pre className="bg-muted/50 p-2 rounded text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(promptJson.meta, null, 2)}
                      </pre>
                    </div>
                  )}
                  {promptJson.scene_context && (
                    <div>
                      <h5 className="font-semibold text-primary mb-1">Contexto de Escena:</h5>
                      <pre className="bg-muted/50 p-2 rounded text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(promptJson.scene_context, null, 2)}
                      </pre>
                    </div>
                  )}
                  {promptJson.text_overlay && (
                    <div>
                      <h5 className="font-semibold text-primary mb-1">Texto Overlay:</h5>
                      <pre className="bg-muted/50 p-2 rounded text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(promptJson.text_overlay, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="full" className="mt-2">
              <ScrollArea className="h-[250px] rounded-md border">
                <pre className="p-3 text-[10px] font-mono whitespace-pre-wrap">
                  {JSON.stringify(promptJson, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {promptJson.negative_prompt && promptJson.negative_prompt.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2">
              <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Evitar:</h5>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                {promptJson.negative_prompt.join(" • ")}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetGenerator}
              disabled={isGenerating}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Volver
            </Button>
            <Button
              onClick={generateThumbnail}
              disabled={isGenerating || !generatedPrompt}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando imagen...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generar Imagen
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && generatedThumbnail && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative w-full max-w-[200px] aspect-[9/16] rounded-lg overflow-hidden border-2 border-primary/30 shadow-lg">
              <img 
                src={generatedThumbnail} 
                alt="Generated thumbnail" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetGenerator}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Regenerar
            </Button>
            <Button
              onClick={saveThumbnail}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Guardar Imagen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
