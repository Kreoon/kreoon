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

// Format options per AI provider - each API has different supported sizes
const AI_MODELS = [
  { 
    value: "gemini-flash-image", 
    label: "Gemini Flash", 
    description: "Rápido y eficiente",
    provider: "gemini",
    model: "google/gemini-2.5-flash-image-preview",
    recommended: true,
    formats: [
      { value: "1080x1920", label: "Vertical 9:16", description: "1080×1920 - TikTok, Reels, Shorts", recommended: true },
      { value: "1080x1080", label: "Cuadrado 1:1", description: "1080×1080 - Feed Instagram", recommended: false },
      { value: "1920x1080", label: "Horizontal 16:9", description: "1920×1080 - YouTube", recommended: false },
      { value: "1024x1024", label: "Cuadrado HD", description: "1024×1024 - Alta calidad", recommended: false },
    ]
  },
  { 
    value: "gemini-pro-image", 
    label: "Gemini Pro", 
    description: "Próxima generación, mayor calidad",
    provider: "gemini",
    model: "google/gemini-3-pro-image-preview",
    recommended: false,
    formats: [
      { value: "1080x1920", label: "Vertical 9:16", description: "1080×1920 - TikTok, Reels, Shorts", recommended: true },
      { value: "1080x1080", label: "Cuadrado 1:1", description: "1080×1080 - Feed Instagram", recommended: false },
      { value: "1920x1080", label: "Horizontal 16:9", description: "1920×1080 - YouTube", recommended: false },
      { value: "1024x1024", label: "Cuadrado HD", description: "1024×1024 - Alta calidad", recommended: false },
    ]
  },
  { 
    value: "gpt-image", 
    label: "GPT Image", 
    description: "OpenAI - Alta calidad y control",
    provider: "openai",
    model: "gpt-image-1",
    recommended: false,
    formats: [
      { value: "1024x1536", label: "Vertical 2:3", description: "1024×1536 - Formato vertical", recommended: true },
      { value: "1024x1024", label: "Cuadrado 1:1", description: "1024×1024 - Feed", recommended: false },
      { value: "1536x1024", label: "Horizontal 3:2", description: "1536×1024 - Paisaje", recommended: false },
      { value: "auto", label: "Auto", description: "OpenAI elige el mejor tamaño", recommended: false },
    ]
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
  const [selectedAiModel, setSelectedAiModel] = useState("gemini-flash-image");
  const [outputFormat, setOutputFormat] = useState("1080x1920"); // Default to vertical
  const [contentType, setContentType] = useState("organic");

  // Get current model config and available formats
  const currentModelConfig = AI_MODELS.find(m => m.value === selectedAiModel) || AI_MODELS[0];
  const availableFormats = currentModelConfig.formats;

  // Reset format when model changes if current format is not available
  const handleModelChange = (modelValue: string) => {
    const newModel = AI_MODELS.find(m => m.value === modelValue);
    if (newModel) {
      setSelectedAiModel(modelValue);
      // Check if current format exists in new model
      const formatExists = newModel.formats.some(f => f.value === outputFormat);
      if (!formatExists) {
        // Set to first recommended format or first format
        const recommendedFormat = newModel.formats.find(f => f.recommended) || newModel.formats[0];
        setOutputFormat(recommendedFormat.value);
      }
    }
  };

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
    
    // STEP 1: DEEP CLEAN - Remove ALL noise, labels, metadata, and broken fragments
    const deepClean = (text: string): string => {
      if (!text) return "";
      return text
        // Remove HTML tags completely
        .replace(/<[^>]*>/g, ' ')
        // Remove HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/&#?\w+;/gi, ' ')
        // Remove metadata labels like [Tipo: X], [Hook A], etc.
        .replace(/\[Tipo:[^\]]*\]/gi, '')
        .replace(/\[Hook[^\]]*\]/gi, '')
        .replace(/\[Opción[^\]]*\]/gi, '')
        .replace(/\[[^\]]{0,30}\]/g, '') // Any short bracket content
        // Remove label prefixes
        .replace(/^(Hook\s*[A-C]|Opción\s*\d+|Variante\s*\d+)[:\s-]*/gim, '')
        .replace(/^(Tipo|Emoción|Visual|Escena)[:\s-]*/gim, '')
        .replace(/a transmitir[:\s]*/gi, '')
        .replace(/del video[:\s]*/gi, '')
        .replace(/qué se ve[:\s]*/gi, '')
        // Remove internal emojis (keep ones at start for parsing)
        .replace(/[🎯🧴🔥📐⚠️🎨✅❌👉🧠🏁💡📦🎤🎬🎥💰🚀✨🔴🟢🔵⭐️💎🏆🥇🥈🥉]/g, '')
        // Remove decorative characters
        .replace(/[═─│┌┐└┘├┤┬┴┼]/g, '')
        .replace(/[*_]{2,}/g, '') // Bold/italic markdown
        .replace(/^\s*[-•*]\s*/gm, '') // Bullet points
        .replace(/^\s*\d+[.)]\s*/gm, '') // Numbered lists
        // Clean truncated text indicators
        .replace(/\.{3,}$/g, '')
        .replace(/…$/g, '')
        // Normalize whitespace
        .replace(/\n{2,}/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
    };
    
    // Additional cleaner for final output (removes any remaining noise)
    const finalClean = (text: string): string => {
      return deepClean(text)
        .replace(/^[:\s-]+/, '') // Remove leading punctuation
        .replace(/[:\s-]+$/, '') // Remove trailing punctuation
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const cleanScript = deepClean(script);
    
    // STEP 2: Extract MAIN HOOK (the actual hook text, not labels)
    let mainHook = "";
    
    // Pattern 1: Look for quoted content (most reliable - actual hook text)
    const allQuotes = cleanScript.match(/"([^"]{15,150})"/g) || [];
    if (allQuotes.length > 0) {
      // Get the first good quote that's not metadata
      for (const quote of allQuotes) {
        const cleaned = quote.replace(/"/g, '').trim();
        if (cleaned.length > 15 && !cleaned.match(/^(tipo|hook|opción)/i)) {
          mainHook = cleaned;
          break;
        }
      }
    }
    
    // Pattern 2: Look for hooks section
    if (!mainHook) {
      const hooksMatch = cleanScript.match(/HOOKS?\s*([\s\S]*?)(?=GUION|FORMATO|ESCENA|$)/i);
      if (hooksMatch) {
        const hookLines = hooksMatch[1].split('\n')
          .map(l => finalClean(l))
          .filter(l => l.length > 20 && l.length < 150)
          .filter(l => !l.match(/^(hook|tipo|opción|variante|disruptivo|emocional|curiosidad)/i));
        
        if (hookLines.length > 0) {
          mainHook = hookLines[0];
        }
      }
    }
    
    // Pattern 3: Use sales angle as fallback
    if (!mainHook && scriptContext.salesAngle) {
      mainHook = finalClean(scriptContext.salesAngle).slice(0, 100);
    }
    
    // Pattern 4: Last resort - generate from product
    if (!mainHook) {
      const productName = scriptContext.productName || "este producto";
      mainHook = `Descubre por qué ${productName} está cambiando todo`;
    }
    
    // STEP 3: Extract DOMINANT EMOTION (1-3 words max, clean)
    let dominantEmotion = "";
    
    // Look for explicit emotion in script
    const emotionPatterns = [
      /emoción[:\s]+([a-záéíóúñ\s]{3,25})/i,
      /transmitir[:\s]+([a-záéíóúñ\s]{3,25})/i,
      /sentimiento[:\s]+([a-záéíóúñ\s]{3,25})/i,
    ];
    
    for (const pattern of emotionPatterns) {
      const match = cleanScript.match(pattern);
      if (match) {
        const emotion = finalClean(match[1]);
        if (emotion.length >= 3 && emotion.length <= 30) {
          dominantEmotion = emotion;
          break;
        }
      }
    }
    
    // Infer emotion from keywords if not found
    if (!dominantEmotion) {
      const emotionKeywords = [
        { pattern: /frustrac|agotad|cansad/i, emotion: "frustración" },
        { pattern: /dolor|sufr|problem/i, emotion: "dolor empático" },
        { pattern: /miedo|temo|preocup/i, emotion: "preocupación" },
        { pattern: /esperanza|ilusión|sueño/i, emotion: "esperanza" },
        { pattern: /curiosidad|intriga|descubr/i, emotion: "curiosidad" },
        { pattern: /confianza|segur|tranquil/i, emotion: "confianza" },
        { pattern: /empat[íi]a|conexi|entend/i, emotion: "empatía" },
        { pattern: /sorpresa|asombr|increíble/i, emotion: "sorpresa" },
        { pattern: /urgen|ahora|últim/i, emotion: "urgencia" },
        { pattern: /alegr|feliz|content/i, emotion: "alegría" },
      ];
      
      const foundEmotions: string[] = [];
      for (const { pattern, emotion } of emotionKeywords) {
        if (pattern.test(cleanScript)) {
          foundEmotions.push(emotion);
          if (foundEmotions.length >= 2) break;
        }
      }
      dominantEmotion = foundEmotions.length > 0 ? foundEmotions.join(" y ") : "curiosidad genuina";
    }
    
    // STEP 4: Extract KEY VISUAL SCENE (one complete, clear description)
    let keyVisualScene = "";
    
    // Look for director's format or visual descriptions
    const scenePatterns = [
      /(?:FORMATO\s*DIRECTOR|GUION\s*DIRECTOR)[:\s]*([\s\S]*?)(?=CTA|CIERRE|---|\n\n\n|$)/i,
      /(?:visual|plano|escena)[:\s]*([^\n]{30,200})/i,
      /(?:se ve|aparece|muestra)[:\s]*([^\n]{30,200})/i,
    ];
    
    for (const pattern of scenePatterns) {
      const match = cleanScript.match(pattern);
      if (match) {
        const sceneText = finalClean(match[1]);
        // Get first complete sentence/description
        const firstScene = sceneText.split(/[.\n]/).find(s => s.trim().length > 25);
        if (firstScene) {
          keyVisualScene = finalClean(firstScene).slice(0, 150);
          break;
        }
      }
    }
    
    // Create descriptive fallback based on emotion and content
    if (!keyVisualScene) {
      const hasProduct = productImage !== null;
      const productName = scriptContext.productName || "el producto";
      
      const emotionExpressions: Record<string, string> = {
        "frustración": "expresión de frustración reflexiva, ceño ligeramente fruncido",
        "dolor empático": "mirada empática y comprensiva hacia la cámara",
        "curiosidad": "expresión intrigada con una leve sonrisa",
        "confianza": "postura segura y mirada directa a cámara",
        "sorpresa": "ojos abiertos con expresión de descubrimiento",
        "urgencia": "expresión seria y enfocada",
        "esperanza": "sonrisa suave y mirada esperanzadora",
        "empatía": "expresión cálida y comprensiva",
      };
      
      const expression = emotionExpressions[dominantEmotion.split(" ")[0]] || "expresión natural y auténtica mirando a cámara";
      
      keyVisualScene = hasProduct 
        ? `Persona en home office con ${expression}, ${productName} visible en el escritorio`
        : `Persona con ${expression}, fondo de espacio de trabajo natural`;
    }
    
    // STEP 5: Extract VIDEO OBJECTIVE (clear single purpose)
    let videoObjective = "";
    
    const objectivePatterns = [
      /objetivo[:\s]+([^\n]{15,120})/i,
      /meta[:\s]+([^\n]{15,120})/i,
      /propósito[:\s]+([^\n]{15,120})/i,
      /busca(?:mos)?[:\s]+([^\n]{15,120})/i,
    ];
    
    for (const pattern of objectivePatterns) {
      const match = cleanScript.match(pattern);
      if (match) {
        const obj = finalClean(match[1]);
        if (obj.length >= 15) {
          videoObjective = obj.slice(0, 100);
          break;
        }
      }
    }
    
    if (!videoObjective) {
      videoObjective = contentType === 'ads' 
        ? "Generar interés y deseo de conocer más sobre el producto"
        : "Conectar emocionalmente y generar identificación con la audiencia";
    }
    
    // STEP 6: Determine TOPIC
    let topic = "";
    if (scriptContext.productName) {
      topic = finalClean(scriptContext.productName).slice(0, 60);
    } else if (scriptContext.salesAngle) {
      topic = finalClean(scriptContext.salesAngle).slice(0, 60);
    } else {
      topic = "el producto/servicio";
    }
    
    // BUILD FINAL CONTEXT OBJECT
    const imageContext = { 
      mainHook: finalClean(mainHook).slice(0, 120),
      dominantEmotion: finalClean(dominantEmotion).slice(0, 40),
      keyVisualScene: finalClean(keyVisualScene).slice(0, 180),
      videoObjective: finalClean(videoObjective).slice(0, 120),
      topic: finalClean(topic).slice(0, 60),
      contentType
    };
    
    // LOG FOR DEBUGGING
    console.log("🎨 IMAGE CONTEXT BUILDER - Final context:", JSON.stringify(imageContext, null, 2));
    
    return imageContext;
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
              {/* AI Model Selector */}
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
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {model.provider === 'gemini' ? 'Gemini' : 'OpenAI'}
                          </Badge>
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

              {/* Output Format Selector - Dynamic based on selected model */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">📐 Tamaño de imagen ({currentModelConfig.label})</Label>
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
              {outputFormat.includes('1920') || outputFormat === '1024x1536' ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-500/10 text-green-700 dark:text-green-400 p-2 rounded border border-green-500/20">
                  <Check className="h-3 w-3" />
                  Formato vertical optimizado para TikTok, Reels y Shorts
                </div>
              ) : null}
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
