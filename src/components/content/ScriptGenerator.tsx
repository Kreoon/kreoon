import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, Loader2, Target, Users, Globe, FileText, 
  MessageSquare, ListOrdered, Plus, X, Wand2 
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
  "México",
  "Colombia",
  "Argentina",
  "España",
  "Chile",
  "Perú",
  "Estados Unidos (Latino)",
  "Otro",
];

// n8n Webhook URL - Production
const N8N_WEBHOOK_URL = "https://n8n.infinygroup.com/webhook/Creartorstudioguionizadorproyectos";

export function ScriptGenerator({ product, contentId, onScriptGenerated }: ScriptGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newHook, setNewHook] = useState("");
  
  const [formData, setFormData] = useState<ScriptFormData>({
    cta: "",
    sales_angle: "",
    hooks_count: "3",
    ideal_avatar: "",
    target_country: "",
    narrative_structure: "",
    additional_instructions: "",
    hooks: [],
  });

  // Pre-fill avatar from product if available
  useEffect(() => {
    if (product?.ideal_avatar) {
      // Strip HTML tags for display
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

  const buildPrompt = () => {
    return `Genera un guión de video para el siguiente contexto:

PRODUCTO: ${product?.name}
DESCRIPCIÓN: ${product?.description || 'No disponible'}
CTA (Llamado a la acción): ${formData.cta}
ÁNGULO DE VENTA: ${formData.sales_angle}
ESTRUCTURA NARRATIVA: ${NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure}
PAÍS OBJETIVO: ${formData.target_country}
AVATAR/CLIENTE IDEAL: ${formData.ideal_avatar}

HOOKS SUGERIDOS (${formData.hooks_count}):
${formData.hooks.length > 0 ? formData.hooks.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'Generar hooks automáticamente'}

INSTRUCCIONES ADICIONALES:
${formData.additional_instructions || 'Ninguna'}

ESTRATEGIA DEL PRODUCTO:
${product?.strategy || 'No disponible'}

INVESTIGACIÓN DE MERCADO:
${product?.market_research || 'No disponible'}

ÁNGULOS DE VENTA DISPONIBLES:
${product?.sales_angles?.join(', ') || 'No definidos'}

Por favor genera un guión completo con:
1. ${formData.hooks_count} opciones de hooks de apertura
2. Desarrollo del contenido siguiendo la estructura ${NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label}
3. Cierre con el CTA: ${formData.cta}

El guión debe ser natural, conversacional y optimizado para video corto (TikTok/Reels/Shorts).`;
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
    try {
      // Prepare complete payload for n8n webhook - same format as StrategistScriptForm
      const payload = {
        // Content info
        content_id: contentId || null,
        timestamp: new Date().toISOString(),
        
        // Product information (complete)
        product: {
          id: product.id,
          name: product.name,
          description: product.description || null,
          strategy: product.strategy || null,
          market_research: product.market_research || null,
          ideal_avatar: product.ideal_avatar || null,
          sales_angles: product.sales_angles || [],
          brief_url: product.brief_url || null,
          onboarding_url: product.onboarding_url || null,
          research_url: product.research_url || null,
        },
        
        // Script parameters from the form
        script_params: {
          cta: formData.cta,
          sales_angle: formData.sales_angle,
          hooks_count: parseInt(formData.hooks_count),
          ideal_avatar: formData.ideal_avatar,
          target_country: formData.target_country,
          narrative_structure: formData.narrative_structure,
          narrative_structure_label: NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure,
          additional_instructions: formData.additional_instructions,
          hooks: formData.hooks,
        },
        
        // Pre-built prompt for convenience
        prompt: buildPrompt(),
      };

      console.log("Sending to n8n webhook:", payload);

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error en webhook: ${response.status}`);
      }

      // Get the response from n8n - handle segmented JSON response
      const contentType = response.headers.get("content-type") || "";
      let generatedContent: GeneratedContent = { script: "" };
      
      if (contentType.includes("application/json")) {
        const data = await response.json();
        console.log("n8n JSON response:", data);
        
        // Handle the segmented response structure from n8n
        // Response comes as array: [{ bloques_html: { guion, pautas_editor, pautas_trafficker, pautas_estratega } }]
        const responseData = Array.isArray(data) ? data[0] : data;
        
        if (responseData?.bloques_html) {
          generatedContent = {
            script: responseData.bloques_html.guion || "",
            editor_guidelines: responseData.bloques_html.pautas_editor || "",
            strategist_guidelines: responseData.bloques_html.pautas_estratega || "",
            trafficker_guidelines: responseData.bloques_html.pautas_trafficker || "",
          };
        } else if (typeof data === "string") {
          generatedContent.script = data;
        } else if (data.script) {
          generatedContent.script = data.script;
        } else if (data.guion) {
          generatedContent.script = data.guion;
        } else {
          generatedContent.script = JSON.stringify(data, null, 2);
        }
      } else {
        // Response is plain text - only script
        generatedContent.script = await response.text();
        console.log("n8n text response:", generatedContent.script);
      }

      if (generatedContent.script) {
        onScriptGenerated(generatedContent);
        toast({ 
          title: "Contenido generado exitosamente",
          description: "Guión y pautas asignados a sus respectivos bloques"
        });
      } else {
        throw new Error("No se recibió respuesta del webhook");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error al generar",
        description: error instanceof Error ? error.message : "No se pudo conectar con n8n. Intenta de nuevo.",
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
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
            n8n
          </Badge>
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
              <SelectItem value="1">1 Hook</SelectItem>
              <SelectItem value="2">2 Hooks</SelectItem>
              <SelectItem value="3">3 Hooks</SelectItem>
              <SelectItem value="4">4 Hooks</SelectItem>
              <SelectItem value="5">5 Hooks</SelectItem>
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

      {/* Botón Generar */}
      <Button 
        onClick={handleGenerate} 
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generando guión via n8n...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generar Guión con IA
          </>
        )}
      </Button>
    </div>
  );
}
