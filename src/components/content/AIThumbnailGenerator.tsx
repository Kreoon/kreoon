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
  Check, RefreshCw, Download, X, Eye, Palette, Package
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ScriptContext {
  script?: string | null;
  salesAngle?: string | null;
  idealAvatar?: string | null;
  hooksCount?: number;
  productName?: string | null;
  clientName?: string | null;
}

interface AIThumbnailGeneratorProps {
  contentId: string;
  currentThumbnail?: string | null;
  scriptContext: ScriptContext;
  onThumbnailGenerated?: (thumbnailUrl: string) => void;
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

const OUTPUT_FORMATS = [
  { value: "9:16", label: "Vertical 9:16", description: "1080x1920 - Recomendado para TikTok, Reels, Shorts", recommended: true },
  { value: "1:1", label: "Cuadrado 1:1", description: "1080x1080 - Feed de Instagram", recommended: false },
  { value: "16:9", label: "Horizontal 16:9", description: "1920x1080 - YouTube thumbnails", recommended: false },
];

const AI_MODELS = [
  { 
    value: "gemini-flash-image", 
    label: "Gemini Flash (Rápido)", 
    description: "google/gemini-2.5-flash-image-preview - Rápido y eficiente",
    provider: "gemini",
    model: "google/gemini-2.5-flash-image-preview",
    recommended: true 
  },
  { 
    value: "gemini-pro-image", 
    label: "Gemini Pro", 
    description: "google/gemini-3-pro-image-preview - Próxima generación",
    provider: "gemini",
    model: "google/gemini-3-pro-image-preview",
    recommended: false 
  },
  { 
    value: "gpt-image", 
    label: "GPT Image", 
    description: "gpt-image-1 - Alta calidad y control",
    provider: "openai",
    model: "gpt-image-1",
    recommended: false 
  },
];

const CONTENT_TYPES = [
  { value: "organic", label: "Orgánico", description: "Contenido natural para feed" },
  { value: "ads", label: "Ads/Paid", description: "Anuncios pagados" },
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
  currentThumbnail, 
  scriptContext,
  onThumbnailGenerated 
}: AIThumbnailGeneratorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exampleInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [exampleImage, setExampleImage] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productRole, setProductRole] = useState("secondary");
  const [productVisibility, setProductVisibility] = useState("full");
  const [showBrand, setShowBrand] = useState(true);
  const [includeText, setIncludeText] = useState(false);
  const [thumbnailText, setThumbnailText] = useState("");
  const [textLanguage, setTextLanguage] = useState("es");
  const [highlightStyle, setHighlightStyle] = useState("emocion");
  const [textZone, setTextZone] = useState("superior");
  const [forceSafeZone, setForceSafeZone] = useState(true);
  const [outputFormat, setOutputFormat] = useState("9:16");
  const [contentType, setContentType] = useState("organic");
  const [selectedAiModel, setSelectedAiModel] = useState("gemini-flash-image");

  // Generation state
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [step, setStep] = useState<"config" | "prompt" | "result">("config");

  // ========================================
  // IMAGE CONTEXT BUILDER - Normalizes script data for thumbnail generation
  // ========================================
  const buildImageContext = () => {
    const script = scriptContext.script || "";
    
    // STEP 1: Deep clean the script - remove ALL HTML, entities, and noise
    const deepClean = (text: string): string => {
      return text
        .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
        .replace(/&nbsp;/g, ' ')            // Remove &nbsp;
        .replace(/&[a-z]+;/gi, ' ')         // Remove other entities
        .replace(/\[Tipo:[^\]]*\]/gi, '')   // Remove [Tipo: X] labels
        .replace(/\[Hook[^\]]*\]/gi, '')    // Remove [Hook X] labels
        .replace(/^(Hook\s*[A-C]|Opción\s*\d+)[:\s]*/gim, '') // Remove "Hook A:", "Opción 1:"
        .replace(/✅|❌|⚠️/g, '')            // Remove checkmarks/warnings
        .replace(/\s{2,}/g, ' ')            // Collapse whitespace
        .trim();
    };
    
    const cleanScript = deepClean(script);
    
    // STEP 2: Extract MAIN HOOK (the actual hook text, not labels)
    let mainHook = "";
    
    // Pattern 1: Look for hooks section with emojis
    const hooksMatch = cleanScript.match(/🔥\s*HOOKS?\s*([\s\S]*?)(?=🎥|🎬|GUION|FORMATO|$)/i);
    if (hooksMatch) {
      const hooksText = hooksMatch[1];
      // Find quoted content first (most reliable)
      const quotedHooks = hooksText.match(/"([^"]{15,150})"/g);
      if (quotedHooks && quotedHooks.length > 0) {
        mainHook = quotedHooks[0].replace(/"/g, '').trim();
      } else {
        // Find lines that look like actual hooks (start with action words or emotional statements)
        const hookLines = hooksText.split('\n')
          .map(l => l.replace(/^[-•*\d.)\s]+/, '').trim())
          .filter(l => l.length > 15 && l.length < 150)
          .filter(l => !l.match(/^(hook|tipo|opción|variante)/i));
        
        if (hookLines.length > 0) {
          mainHook = hookLines[0];
        }
      }
    }
    
    // Pattern 2: Fallback - any quoted sentence
    if (!mainHook) {
      const anyQuote = cleanScript.match(/"([^"]{15,150})"/);
      if (anyQuote) mainHook = anyQuote[1];
    }
    
    // Pattern 3: Last resort - first substantial sentence
    if (!mainHook && scriptContext.salesAngle) {
      mainHook = deepClean(scriptContext.salesAngle).slice(0, 100);
    }
    
    // STEP 3: Extract DOMINANT EMOTION (1-3 words max)
    let dominantEmotion = "";
    const emotionKeywords = [
      { pattern: /frustrac/i, emotion: "frustración" },
      { pattern: /dolor|sufr/i, emotion: "dolor" },
      { pattern: /miedo|temo/i, emotion: "miedo" },
      { pattern: /esperanza|ilusión/i, emotion: "esperanza" },
      { pattern: /emocion/i, emotion: "emoción" },
      { pattern: /curiosidad|intriga/i, emotion: "curiosidad" },
      { pattern: /confianza|segur/i, emotion: "confianza" },
      { pattern: /empat[íi]a|conexi/i, emotion: "empatía" },
      { pattern: /sorpresa|asombr/i, emotion: "sorpresa" },
      { pattern: /urgen/i, emotion: "urgencia" },
    ];
    
    // Check for explicit emotion mentions
    const emotionMatch = cleanScript.match(/emoci[óo]n(?:\s+dominante)?[:\s]+([^\n,.]{3,30})/i);
    if (emotionMatch) {
      dominantEmotion = deepClean(emotionMatch[1]).slice(0, 30);
    } else {
      // Infer from keywords in script
      const foundEmotions: string[] = [];
      for (const { pattern, emotion } of emotionKeywords) {
        if (pattern.test(cleanScript)) {
          foundEmotions.push(emotion);
          if (foundEmotions.length >= 2) break;
        }
      }
      dominantEmotion = foundEmotions.length > 0 ? foundEmotions.join(" + ") : "curiosidad";
    }
    
    // STEP 4: Extract KEY VISUAL SCENE (one clear scene description)
    let keyVisualScene = "";
    
    // Look for director's format section
    const directorMatch = cleanScript.match(/(?:🎬|FORMATO\s*DIRECTOR|GUION\s*DIRECTOR)\s*([\s\S]*?)(?=🎤|CTA|CIERRE|---|\n\n|$)/i);
    if (directorMatch) {
      const directorText = directorMatch[1];
      // Find "visual" or "qué se ve" descriptions
      const visualMatch = directorText.match(/(?:visual|qué\s*se\s*ve|plano)[:\s]*([^\n🎤]{20,200})/i);
      if (visualMatch) {
        keyVisualScene = deepClean(visualMatch[1]).slice(0, 150);
      } else {
        // Take first substantial line from director section
        const firstLine = directorText.split('\n')
          .map(l => deepClean(l))
          .find(l => l.length > 25 && !l.match(/^(escena|bloque|\d+)/i));
        if (firstLine) keyVisualScene = firstLine.slice(0, 150);
      }
    }
    
    // Fallback: Create scene from context
    if (!keyVisualScene) {
      const hasProduct = productImage !== null;
      const productName = scriptContext.productName || "el producto";
      keyVisualScene = hasProduct 
        ? `Persona mirando a cámara con expresión de ${dominantEmotion}, ${productName} visible sobre la mesa`
        : `Persona mirando directamente a cámara con expresión de ${dominantEmotion}`;
    }
    
    // STEP 5: Extract VIDEO OBJECTIVE (clear, single purpose)
    let videoObjective = "";
    
    const objectiveMatch = cleanScript.match(/(?:objetivo|meta|propósito|intención)[:\s]+([^\n]{15,150})/i);
    if (objectiveMatch) {
      // Clean truncated text like "del video: Cambiar..."
      let obj = objectiveMatch[1].replace(/^del\s*video[:\s]*/i, '').trim();
      videoObjective = deepClean(obj).slice(0, 100);
    } else {
      // Infer from content type
      videoObjective = contentType === 'ads' 
        ? "Generar intención de compra y curiosidad por el producto"
        : "Conectar emocionalmente y generar engagement";
    }
    
    // STEP 6: Determine TOPIC (what the video is about)
    let topic = "";
    if (scriptContext.productName) {
      topic = deepClean(scriptContext.productName).slice(0, 60);
    } else if (scriptContext.salesAngle) {
      topic = deepClean(scriptContext.salesAngle).slice(0, 60);
    } else {
      topic = "el producto/servicio";
    }
    
    // Return normalized, clean context
    return { 
      mainHook: mainHook || `Descubre ${topic}`,
      dominantEmotion: dominantEmotion || "curiosidad",
      keyVisualScene,
      videoObjective,
      topic 
    };
  };

  const handleImageUpload = (file: File, type: "reference" | "example" | "product") => {
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
      if (type === "reference") {
        setReferenceImage(reader.result as string);
      } else if (type === "product") {
        setProductImage(reader.result as string);
      } else {
        setExampleImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Determine product role based on script context
  const determineAutoProductRole = () => {
    const script = scriptContext.script || "";
    const lowerScript = script.toLowerCase();
    
    // Pain/problem hook → person first, product secondary
    if (lowerScript.includes("dolor") || lowerScript.includes("problema") || lowerScript.includes("frustración")) {
      return "secondary";
    }
    // Solution hook → product protagonist
    if (lowerScript.includes("solución") || lowerScript.includes("descubrí") || lowerScript.includes("esto funciona")) {
      return "protagonist";
    }
    // Educational → product contextual
    if (lowerScript.includes("educativo") || lowerScript.includes("tutorial") || lowerScript.includes("cómo")) {
      return "contextual";
    }
    return productRole;
  };

  // Summarize avatar to 1 line
  const summarizeAvatar = (avatar: string | null | undefined): string => {
    if (!avatar) return "Digital entrepreneur LATAM (27-40 years)";
    // Clean HTML and extract first sentence
    const cleaned = avatar.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    const firstSentence = cleaned.split(/[.!?]/)[0];
    return firstSentence.slice(0, 100).trim();
  };

  const generatePrompt = () => {
    // Use the IMAGE CONTEXT BUILDER to get clean, normalized data
    const { mainHook, dominantEmotion, keyVisualScene, videoObjective, topic } = buildImageContext();
    
    const zone = TEXT_ZONES.find(z => z.value === textZone);
    const role = PRODUCT_ROLES.find(r => r.value === productRole);
    const visibility = PRODUCT_VISIBILITY.find(v => v.value === productVisibility);
    
    // Validate and format text - auto-split if too long (max 5 words per line)
    let formattedText = thumbnailText.toUpperCase();
    if (includeText && thumbnailText) {
      const words = thumbnailText.trim().split(/\s+/);
      if (words.length > 5) {
        const midpoint = Math.ceil(words.length / 2);
        formattedText = words.slice(0, midpoint).join(' ').toUpperCase() + '\n' + words.slice(midpoint).join(' ').toUpperCase();
      }
    }

    // Summarize avatar for cleaner prompt
    const cleanAvatar = summarizeAvatar(scriptContext.idealAvatar);

    // Determine product composition based on role
    const getProductComposition = () => {
      if (!productImage) return '- Subject occupies 60-70% of the frame';
      if (productRole === 'protagonist') return '- Product is PROTAGONIST (40-60% of frame)\n- Person is secondary (20-30% of frame)';
      if (productRole === 'secondary') return '- Person is PROTAGONIST (50-60% of frame)\n- Product is secondary (15-30% of frame)';
      return '- Person is main focus (60-70% of frame)\n- Product is contextual (in background)';
    };

    // BUILD CLEAN PROMPT - Creative instructions only, no format specs (handled by backend)
    let prompt = `Create a social media thumbnail composed for a mobile-first experience.

SCRIPT CONTEXT:
- Main hook: "${mainHook}"
- Core emotion: ${dominantEmotion}
- Video intent: ${videoObjective}
- Content type: ${contentType === 'ads' ? 'paid social ad' : 'organic content'}

CHARACTER:
${referenceImage ? `- Based on reference image provided
- Maintain general physical traits, do not replicate exact identity` : `- Person representing: ${cleanAvatar}`}
- Facial expression: ${dominantEmotion}
- Natural UGC aesthetic
- Looking at camera

COMPOSITION:
${getProductComposition()}
- Scene: "${keyVisualScene}"
- Background: contextual environment (home office, workspace, daily setting)
- Strong lighting on face
- One clear focal point
- Rule of thirds
- Safe margins (10-15%)

${productImage ? `PRODUCT:
- Use EXACT product image provided
- Role: ${role?.label} (${role?.description})
- Visibility: ${visibility?.label}
- Maintain original shape, colors and branding
- ${showBrand ? 'Show brand/logo if visible' : 'Brand/logo can be partially obscured'}
- Do NOT modify or stylize the product` : ''}

${includeText && formattedText ? `TEXT OVERLAY:
- Exact text: "${formattedText}"
- Language: ${TEXT_LANGUAGES.find(l => l.value === textLanguage)?.label || 'Spanish'}
- Bold heavy typography
- Inside solid or semi-transparent black text box
- Position: ${zone?.label.toLowerCase()} safe area
- Centered horizontally
- 10-15% margin from edges
- Must be fully visible and readable on mobile` : `TEXT OVERLAY:
- NONE - Do NOT add any text`}

STYLE:
- UGC aesthetic
- High contrast
- Scroll-stopper composition
- Realistic lighting
- Professional but authentic

AVOID:
- Cropped subjects
- Visual clutter
- Stock photo look
- Plain white backgrounds
${productImage ? `- Altered product colors or shapes` : ''}`;

    setGeneratedPrompt(prompt);
    setIsPromptVisible(true);
    setStep("prompt");
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

      // Get selected model config
      const modelConfig = AI_MODELS.find(m => m.value === selectedAiModel) || AI_MODELS[0];

      // Call edge function with ALL parameters including format and model
      const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
        body: { 
          prompt: generatedPrompt,
          referenceImage: referenceImage,
          productImage: productImage,
          contentId,
          outputFormat: outputFormat,
          aiProvider: modelConfig.provider,
          aiModel: modelConfig.model
        }
      });

      if (error) throw error;

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
      // Update content with new thumbnail
      const { error } = await supabase
        .from('content')
        .update({ thumbnail_url: generatedThumbnail })
        .eq('id', contentId);

      if (error) throw error;

      onThumbnailGenerated?.(generatedThumbnail);
      toast({ title: "Miniatura guardada", description: "La miniatura se guardó correctamente" });
      
      // Reset to allow generating another
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
    setGeneratedThumbnail(null);
    setIsPromptVisible(false);
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-primary/10">
          <Wand2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="font-medium">Generador de Miniaturas con IA</h4>
          <p className="text-xs text-muted-foreground">
            Crea miniaturas coherentes con el guion usando NanoBanana
          </p>
        </div>
      </div>

      {/* Step 1: Configuration */}
      {step === "config" && (
        <div className="space-y-4">
          {/* Section 1: Visual References */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-primary transition-colors">
              <Image className="h-4 w-4" />
              Referencias Visuales (Opcional)
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reference Image */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Imagen de referencia principal
                  </Label>
                  <p className="text-xs text-muted-foreground/70">
                    Persona, creador, estilo visual
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "reference")}
                  />
                  {referenceImage ? (
                    <div className="relative w-full aspect-[9/16] max-w-[120px] rounded-lg overflow-hidden border">
                      <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setReferenceImage(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Subir imagen
                    </Button>
                  )}
                </div>

                {/* Example Image */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Ejemplo de miniatura (Opcional)
                  </Label>
                  <p className="text-xs text-muted-foreground/70">
                    Estilo, colores, composición
                  </p>
                  <input
                    ref={exampleInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "example")}
                  />
                  {exampleImage ? (
                    <div className="relative w-full aspect-[9/16] max-w-[120px] rounded-lg overflow-hidden border">
                      <img src={exampleImage} alt="Example" className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setExampleImage(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exampleInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Subir ejemplo
                    </Button>
                  )}
                </div>
              </div>

              {/* Product Image */}
              <div className="space-y-2 col-span-full">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  🧴 Foto del producto (Opcional)
                </Label>
                <p className="text-xs text-muted-foreground/70">
                  Imagen real del producto para incluir en la miniatura
                </p>
                <input
                  ref={productInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "product")}
                />
                {productImage ? (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-square max-w-[120px] rounded-lg overflow-hidden border border-primary/30">
                      <img src={productImage} alt="Product" className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setProductImage(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Product Role Selector */}
                    <div className="space-y-2">
                      <Label className="text-xs">Rol del producto en la miniatura</Label>
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

                    {/* Product Visibility */}
                    <div className="space-y-2">
                      <Label className="text-xs">¿El producto debe verse:</Label>
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

                    {/* Show Brand Toggle */}
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <Label className="text-xs">¿Mostrar marca/logo?</Label>
                      <Switch
                        checked={showBrand}
                        onCheckedChange={setShowBrand}
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => productInputRef.current?.click()}
                    className="w-full border-dashed border-primary/30"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Subir foto de producto
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 2: Thumbnail Content */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-primary transition-colors">
              <Edit3 className="h-4 w-4" />
              Contenido de la Miniatura
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
              {/* Text Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">¿La miniatura lleva texto?</Label>
                  <p className="text-xs text-muted-foreground">Texto superpuesto en la imagen</p>
                </div>
                <Switch
                  checked={includeText}
                  onCheckedChange={setIncludeText}
                />
              </div>

              {/* Text Options */}
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
                  <div className="space-y-1">
                    <Label className="text-xs">Idioma del texto</Label>
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

                  {/* Text Zone Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs">📐 Zona de texto</Label>
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
                    <p className="text-[10px] text-muted-foreground">
                      {TEXT_ZONES.find(z => z.value === textZone)?.description}
                    </p>
                  </div>

                  {/* Force Safe Zone Toggle */}
                  <div className="flex items-center justify-between p-2 bg-primary/5 rounded-md border border-primary/20">
                    <div>
                      <Label className="text-xs font-medium">✅ Forzar zona segura</Label>
                      <p className="text-[10px] text-muted-foreground">Mejor visibilidad en móvil</p>
                    </div>
                    <Switch
                      checked={forceSafeZone}
                      onCheckedChange={setForceSafeZone}
                    />
                  </div>
                </div>
              )}

              {/* Highlight Style */}
              <div className="space-y-2">
                <Label className="text-sm">¿Qué desea resaltar?</Label>
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

          {/* Section 3: Output Format */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-primary transition-colors">
              <Palette className="h-4 w-4" />
              📐 Formato de Salida
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {/* Output Format Selector */}
              <div className="space-y-2">
                <Label className="text-xs">Formato de imagen</Label>
                <RadioGroup
                  value={outputFormat}
                  onValueChange={setOutputFormat}
                  className="space-y-2"
                >
                  {OUTPUT_FORMATS.map(format => (
                    <div key={format.value} className={`flex items-center space-x-2 p-2 rounded-md border ${format.recommended ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                      <RadioGroupItem value={format.value} id={`format-${format.value}`} />
                      <Label htmlFor={`format-${format.value}`} className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{format.label}</span>
                          {format.recommended && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">Recomendado</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{format.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Content Type Selector */}
              <div className="space-y-2">
                <Label className="text-xs">Tipo de contenido</Label>
                <div className="flex gap-2">
                  {CONTENT_TYPES.map(type => (
                    <Button
                      key={type.value}
                      variant={contentType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType(type.value)}
                      className="flex-1"
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Safe Zone Info */}
              {outputFormat === "9:16" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-500/10 text-green-700 dark:text-green-400 p-2 rounded border border-green-500/20">
                  <Check className="h-3 w-3" />
                  Formato optimizado para TikTok, Reels y Shorts
                </div>
              )}

              {/* AI Model Selector */}
              <div className="space-y-2 pt-3 border-t border-border/50">
                <Label className="text-xs font-medium flex items-center gap-1">
                  🤖 Modelo de IA
                </Label>
                <RadioGroup
                  value={selectedAiModel}
                  onValueChange={setSelectedAiModel}
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
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {model.provider === 'gemini' ? 'Gemini' : 'GPT'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{model.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Context Info Badge */}
          {scriptContext.script && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <Check className="h-3 w-3 text-green-500" />
              Contexto del guion detectado automáticamente
            </div>
          )}

          {/* Generate Prompt Button */}
          <Button
            onClick={generatePrompt}
            className="w-full"
            variant="secondary"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generar Prompt
          </Button>
        </div>
      )}

      {/* Step 2: Review Prompt */}
      {step === "prompt" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Prompt generado</Label>
              <Badge variant="secondary" className="text-xs">Editable</Badge>
            </div>
            <Textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              className="min-h-[200px] text-xs font-mono"
            />
          </div>

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
                  Generando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generar Miniatura con IA
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
              Guardar Miniatura
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
