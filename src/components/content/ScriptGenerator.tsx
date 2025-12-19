import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Settings, Wand2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Product {
  id: string;
  name: string;
  strategy: string | null;
  market_research: string | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url: string | null;
}

interface ScriptGeneratorProps {
  product: Product | null;
  onScriptGenerated: (script: string) => void;
}

export function ScriptGenerator({ product, onScriptGenerated }: ScriptGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedAngle, setSelectedAngle] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const handleGenerate = async () => {
    if (!webhookUrl) {
      toast({
        title: "Configura el webhook",
        description: "Necesitas agregar la URL del webhook de n8n para generar guiones",
        variant: "destructive",
      });
      setShowSettings(true);
      return;
    }

    if (!product) {
      toast({
        title: "Selecciona un producto",
        description: "Primero debes asociar un producto al proyecto",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        product_name: product.name,
        strategy: product.strategy || "",
        market_research: product.market_research || "",
        ideal_avatar: product.ideal_avatar || "",
        sales_angle: selectedAngle || (product.sales_angles?.[0] || ""),
        brief_url: product.brief_url || "",
        additional_context: additionalContext,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del webhook");
      }

      const data = await response.json();
      
      // Expect the response to have a "script" field
      if (data.script) {
        onScriptGenerated(data.script);
        toast({ title: "Guión generado exitosamente" });
      } else {
        toast({
          title: "Respuesta recibida",
          description: "El webhook respondió pero no devolvió un guión. Revisa la configuración de n8n.",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error al generar",
        description: "No se pudo conectar con n8n. Verifica la URL del webhook.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Selecciona un producto para poder generar guiones con IA
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          Generar Guión con IA
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <Collapsible open={showSettings} onOpenChange={setShowSettings}>
        <CollapsibleContent className="space-y-3 pb-4 border-b">
          <div className="space-y-2">
            <Label className="text-xs">URL Webhook n8n</Label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/..."
              type="url"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Configura un workflow en n8n con un trigger de webhook para recibir los datos del producto
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Ángulo de Venta</Label>
          <Select value={selectedAngle} onValueChange={setSelectedAngle}>
            <SelectTrigger className="text-sm">
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

        <div className="space-y-2">
          <Label className="text-xs">Contexto adicional (opcional)</Label>
          <Textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Agrega indicaciones específicas para este guión..."
            rows={2}
            className="text-sm"
          />
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={loading || !webhookUrl}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generar Guión
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Se enviará la estrategia, avatar e investigación del producto a n8n
      </p>
    </div>
  );
}
