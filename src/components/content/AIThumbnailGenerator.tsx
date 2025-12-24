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
  
  // Generation state
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [step, setStep] = useState<"config" | "prompt" | "result">("config");

  // Extract script info for prompt
  const extractScriptInfo = () => {
    const script = scriptContext.script || "";
    
    // Try to extract hooks from script
    const hooksMatch = script.match(/🔥\s*HOOKS?.*?(?=🎥|$)/is);
    const hooks = hooksMatch ? hooksMatch[0] : "";
    
    // Try to extract main emotion
    const emotionMatch = script.match(/emoción[^:]*:\s*([^\n]+)/i);
    const emotion = emotionMatch ? emotionMatch[1].trim() : "impacto";
    
    // Get main topic
    const topicMatch = script.match(/trata sobre[^:]*:\s*([^\n]+)/i) || 
                       script.match(/tema[^:]*:\s*([^\n]+)/i);
    const topic = topicMatch ? topicMatch[1].trim() : scriptContext.productName || "el producto";
    
    return { hooks, emotion, topic };
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

  const generatePrompt = () => {
    const { hooks, emotion, topic } = extractScriptInfo();
    const highlight = HIGHLIGHT_OPTIONS.find(h => h.value === highlightStyle);
    const zone = TEXT_ZONES.find(z => z.value === textZone);
    const format = OUTPUT_FORMATS.find(f => f.value === outputFormat);
    const role = PRODUCT_ROLES.find(r => r.value === productRole);
    const visibility = PRODUCT_VISIBILITY.find(v => v.value === productVisibility);
    
    // Get resolution based on format
    const resolutions: Record<string, { w: number; h: number }> = {
      "9:16": { w: 1080, h: 1920 },
      "1:1": { w: 1080, h: 1080 },
      "16:9": { w: 1920, h: 1080 },
    };
    const res = resolutions[outputFormat] || resolutions["9:16"];
    
    // Validate and format text - auto-split if too long
    let formattedText = thumbnailText;
    if (includeText && thumbnailText) {
      const words = thumbnailText.trim().split(/\s+/);
      if (words.length > 5) {
        const midpoint = Math.ceil(words.length / 2);
        formattedText = words.slice(0, midpoint).join(' ') + '\n' + words.slice(midpoint).join(' ');
      }
    }

    // Determine composition percentages based on product role
    const getCompositionRules = () => {
      if (!productImage) return '';
      
      if (productRole === 'protagonist') {
        return `
COMBINED COMPOSITION (PERSON + PRODUCT):
- Product is PROTAGONIST → Product occupies 40-60% of the frame
- Person occupies 20-30% of the frame (supporting role)
- Product is the main focal point
- Avoid visual competition between face and product
- Clear hierarchy: product first, person second`;
      } else if (productRole === 'secondary') {
        return `
COMBINED COMPOSITION (PERSON + PRODUCT):
- Person is PROTAGONIST → Person occupies 50-60% of the frame
- Product occupies 15-30% of the frame (secondary role)
- Person is the main focal point
- Product visible but not competing for attention
- Clear hierarchy: person first, product second`;
      } else {
        return `
COMBINED COMPOSITION (PERSON + PRODUCT):
- Product is CONTEXTUAL → Product in background or environment
- Person occupies 60-70% of the frame (main focus)
- Product visible as context/environment element
- Product should be recognizable but not prominent
- Clear hierarchy: person only focal point`;
      }
    };
    
    // Structured prompt following professional prompt engineering
    let prompt = `═══════════════════════════════════════
1️⃣ OUTPUT FORMAT (MANDATORY API PARAMETERS)
═══════════════════════════════════════
Aspect ratio: ${outputFormat}
Resolution: ${res.w}x${res.h}
Orientation: ${outputFormat === "16:9" ? "Horizontal" : outputFormat === "1:1" ? "Square" : "Vertical"}
Usage: Mobile-first (TikTok, Reels, Shorts)
Safe area: ${forceSafeZone ? "10-15% internal margin on all edges" : "Standard margins"}
No cropping of text or main subject allowed.

═══════════════════════════════════════
2️⃣ CONTENT CONTEXT
═══════════════════════════════════════
Thumbnail for a short-form social media video.
Topic: ${topic}${scriptContext.salesAngle ? ` - Sales angle: ${scriptContext.salesAngle}` : ''}
Emotion to transmit: ${emotion} → identification → ${highlight?.label.toLowerCase() || 'curiosity'}
Target audience: ${scriptContext.idealAvatar || 'Digital entrepreneur LATAM (27-40 years)'}
Content type: ${contentType === 'ads' ? 'Paid advertisement' : 'Organic content'}

═══════════════════════════════════════
3️⃣ CHARACTER / VISUAL REFERENCE
═══════════════════════════════════════
${referenceImage ? `Main character based on user reference image.
- Maintain general physical traits, posture and style.
- Do NOT replicate exact identity.
- Facial expression aligned with the emotion: ${emotion}
- Looking at camera or toward the main element of interest.` : `Main character:
- Person that represents the target avatar.
- Expression matching the emotion: ${emotion}
- Authentic look, NOT stock photo style.
- Natural lighting on face.`}

${productImage ? `═══════════════════════════════════════
🧴 PRODUCT / OBJECT REFERENCE (CRITICAL)
═══════════════════════════════════════
Product reference:
- Use the EXACT product image provided by the user as visual reference
- Maintain product shape, proportions and main visual identity
- Do NOT redesign or alter the product
- No fictional variations or inventions

Product placement rules:
- Role: ${role?.label.toUpperCase()} (${role?.description})
- Visibility: ${visibility?.label.toUpperCase()} (${visibility?.description})
- Position according to rule of thirds
${productVisibility === 'full' ? '- Product must be FULLY visible, no cropping' : '- Partial view acceptable, but product must be recognizable'}
${showBrand ? '- Brand/logo must be visible if present on product' : '- Brand/logo can be partially obscured or not emphasized'}

Lighting and focus:
- Product must be sharp and clearly visible
- Lighting consistent with the main subject
- Avoid reflections, blur or distortion on product

CRITICAL PRODUCT RULES:
- Do NOT invent products
- Do NOT alter real product colors
- Do NOT change logos or branding
- Do NOT use generic stock products
- Use ONLY the provided product reference
${getCompositionRules()}` : ''}

═══════════════════════════════════════
4️⃣ VISUAL COMPOSITION
═══════════════════════════════════════
${productImage && productRole === 'protagonist' ? 
  `- Product is the main focal point (40-60% of frame)
- Person in supporting role (20-30% of frame)` : 
  `- Subject occupies 60-70% of the frame`}
- Background slightly blurred or contextual (related to topic)
- High contrast lighting on main subject
- Clear focal point (ONE main element)
- Rule of thirds composition
${forceSafeZone ? '- ALL important elements within 10-15% safe margin' : ''}
- Avoid visual competition between elements

═══════════════════════════════════════
5️⃣ TEXT OVERLAY ${includeText && formattedText ? '(CRITICAL - FOLLOW EXACTLY)' : '(NONE)'}
═══════════════════════════════════════
${includeText && formattedText ? `Text overlay MANDATORY rules:
- Exact text: "${formattedText}"
- Language: ${TEXT_LANGUAGES.find(l => l.value === textLanguage)?.label || 'Spanish'}
- Maximum 3-5 words per line
- Display inside a solid or semi-transparent text box
- Centered horizontally
- Position: ${zone?.label.toUpperCase()} zone (${zone?.description})
${forceSafeZone ? '- Text MUST be inside safe area (10-15% margin from edges)' : ''}
- Bold/heavy typography, high contrast
- White or bright yellow color with soft black shadow
- Must be 100% visible and readable on mobile screens
- DO NOT cut any letters under any circumstance` : `No text overlay in this image.
DO NOT add any text to the thumbnail.`}

═══════════════════════════════════════
6️⃣ VISUAL STYLE
═══════════════════════════════════════
- UGC style (User Generated Content)
- Professional but natural/authentic
- Scroll-stopper thumbnail aesthetic
- Realistic professional lighting
- No stock photo look
- High contrast colors
- Vibrant but natural tones

═══════════════════════════════════════
7️⃣ NEGATIVE PROMPT (STRICTLY AVOID)
═══════════════════════════════════════
AVOID:
- Horizontal format (unless specifically requested)
- Cropped or cut text
- Text touching or near edges
- Small typography
- Overloaded/cluttered elements
- Flyer, banner or corporate style
- Plain white backgrounds
- Generic stock photo aesthetics
- Multiple text blocks
- Watermarks or logos (unless specified)
- Low contrast images
- Blurry main subject
${productImage ? `- Invented or altered products
- Generic product mockups
- Changed product colors
- Cropped products (if visibility is "full")` : ''}

═══════════════════════════════════════
🎯 GOLDEN RULE
═══════════════════════════════════════
The thumbnail must be understood in 1 second, work without additional context, and provoke immediate curiosity. It should stop the scroll.${productImage ? ' Person + product + text must work together strategically.' : ''}`;

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

      // Call edge function to generate thumbnail
      const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
        body: { 
          prompt: generatedPrompt,
          referenceImage: referenceImage,
          contentId
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
