import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Save, ExternalLink, CheckCircle2, XCircle, 
  Bot, Video, Music, Mail, Webhook, Cloud, Key, Info,
  Sparkles, Zap, MessageSquare, Image, AlertTriangle, Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface IntegrationConfig {
  key: string;
  label: string;
  description: string;
  type: "api_key" | "webhook" | "config";
  placeholder: string;
  isSecret: boolean;
  docsUrl?: string;
}

interface IntegrationCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  integrations: IntegrationConfig[];
}

// Webhooks activos del sistema que tienen versión test y producción
interface SystemWebhook {
  key: string;
  label: string;
  description: string;
  testUrl: string;
  productionUrlKey: string;
  usedIn: string[];
  docsUrl?: string;
}

const SYSTEM_WEBHOOKS: SystemWebhook[] = [
  {
    key: "n8n_script_generator",
    label: "n8n - Generador de Scripts",
    description: "Webhook de n8n para generación de scripts con IA. Usado en ScriptGenerator y StrategistScriptForm.",
    testUrl: "https://n8n.infinygroup.com/webhook-test/787fcfa6-f590-458f-94b6-7b9f0ecd1be7",
    productionUrlKey: "n8n_script_generator_prod_url",
    usedIn: ["ScriptGenerator.tsx", "StrategistScriptForm.tsx"],
    docsUrl: "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
  },
  {
    key: "n8n_drive_upload",
    label: "n8n - Notificación Drive Upload",
    description: "Webhook para notificar cuando se sube un video a Google Drive. Dispara el procesamiento automático.",
    testUrl: "",
    productionUrlKey: "n8n_drive_upload_prod_url",
    usedIn: ["notify-drive-upload (Edge Function)"],
    docsUrl: "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
  },
  {
    key: "bunny_callback",
    label: "Bunny - Callback Webhook",
    description: "URL de callback para recibir actualizaciones del procesamiento de videos desde n8n.",
    testUrl: "",
    productionUrlKey: "bunny_callback_url",
    usedIn: ["bunny-webhook (Edge Function)"],
    docsUrl: "https://docs.bunny.net/docs/stream-webhook"
  },
  {
    key: "ghl_sync",
    label: "Funnel ROI (GHL) - Sincronización",
    description: "Webhook para sincronizar datos con Funnel ROI / GoHighLevel. Sincroniza clientes, leads, contenido aprobado y pagos automáticamente.",
    testUrl: "",
    productionUrlKey: "ghl_webhook_url",
    usedIn: ["ghl-sync (Edge Function)", "Triggers automáticos en DB"],
    docsUrl: "https://highlevel.stoplight.io/docs/integrations"
  }
];

const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  {
    id: "system",
    title: "Webhooks del Sistema",
    description: "Webhooks activos en la plataforma con toggle test/producción",
    icon: Settings2,
    integrations: []
  },
  {
    id: "ai",
    title: "Inteligencia Artificial",
    description: "Proveedores de modelos de IA para generación de contenido",
    icon: Bot,
    integrations: [
      {
        key: "openai_api_key",
        label: "OpenAI API Key",
        description: "Para GPT-4, GPT-5, DALL-E y Whisper. Modelos de OpenAI.",
        type: "api_key",
        placeholder: "sk-...",
        isSecret: true,
        docsUrl: "https://platform.openai.com/api-keys"
      },
      {
        key: "anthropic_api_key",
        label: "Anthropic API Key (Claude)",
        description: "Para Claude 3.5 Sonnet, Claude 3 Opus y otros modelos de Anthropic.",
        type: "api_key",
        placeholder: "sk-ant-...",
        isSecret: true,
        docsUrl: "https://console.anthropic.com/settings/keys"
      },
      {
        key: "google_ai_api_key",
        label: "Google AI API Key (Gemini)",
        description: "Para Gemini Pro, Gemini Flash y otros modelos de Google.",
        type: "api_key",
        placeholder: "AIza...",
        isSecret: true,
        docsUrl: "https://aistudio.google.com/app/apikey"
      },
      {
        key: "replicate_api_key",
        label: "Replicate API Key",
        description: "Para modelos de imagen como Flux, Stable Diffusion y más.",
        type: "api_key",
        placeholder: "r8_...",
        isSecret: true,
        docsUrl: "https://replicate.com/account/api-tokens"
      },
      {
        key: "huggingface_token",
        label: "Hugging Face Token",
        description: "Para modelos de Hugging Face Hub.",
        type: "api_key",
        placeholder: "hf_...",
        isSecret: true,
        docsUrl: "https://huggingface.co/settings/tokens"
      },
      {
        key: "lovable_ai_enabled",
        label: "Lovable AI (Integrado)",
        description: "IA integrada en la plataforma. No requiere API Key. Soporta Gemini, GPT-5 y más.",
        type: "config",
        placeholder: "Habilitado por defecto",
        isSecret: false
      }
    ]
  },
  {
    id: "video",
    title: "Video y Almacenamiento",
    description: "Servicios de video, CDN y almacenamiento de archivos",
    icon: Video,
    integrations: [
      {
        key: "bunny_api_key",
        label: "Bunny.net API Key",
        description: "API Key principal de Bunny.net para gestión de videos.",
        type: "api_key",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        isSecret: true,
        docsUrl: "https://panel.bunny.net/account"
      },
      {
        key: "bunny_library_id",
        label: "Bunny Library ID",
        description: "ID de la biblioteca de videos en Bunny Stream.",
        type: "config",
        placeholder: "123456",
        isSecret: false
      },
      {
        key: "bunny_storage_zone",
        label: "Bunny Storage Zone",
        description: "Nombre de la zona de almacenamiento.",
        type: "config",
        placeholder: "my-storage-zone",
        isSecret: false
      },
      {
        key: "bunny_storage_password",
        label: "Bunny Storage Password",
        description: "Contraseña de la zona de almacenamiento.",
        type: "api_key",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx",
        isSecret: true
      },
      {
        key: "bunny_cdn_hostname",
        label: "Bunny CDN Hostname",
        description: "Hostname del CDN (ej: my-zone.b-cdn.net).",
        type: "config",
        placeholder: "my-zone.b-cdn.net",
        isSecret: false
      },
      {
        key: "google_drive_folder_id",
        label: "Google Drive Folder ID",
        description: "ID de la carpeta de Google Drive para subir videos raw.",
        type: "config",
        placeholder: "1abc123...",
        isSecret: false
      }
    ]
  },
  {
    id: "audio",
    title: "Audio y Música",
    description: "Servicios de audio, música y text-to-speech",
    icon: Music,
    integrations: [
      {
        key: "spotify_client_id",
        label: "Spotify Client ID",
        description: "Client ID de la aplicación de Spotify.",
        type: "config",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        isSecret: false,
        docsUrl: "https://developer.spotify.com/dashboard"
      },
      {
        key: "spotify_client_secret",
        label: "Spotify Client Secret",
        description: "Client Secret de la aplicación de Spotify.",
        type: "api_key",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        isSecret: true
      },
      {
        key: "elevenlabs_api_key",
        label: "ElevenLabs API Key",
        description: "Para generación de voz con IA (text-to-speech).",
        type: "api_key",
        placeholder: "xi-...",
        isSecret: true,
        docsUrl: "https://elevenlabs.io/docs/api-reference"
      }
    ]
  },
  {
    id: "communication",
    title: "Comunicación",
    description: "Servicios de email, SMS y notificaciones",
    icon: Mail,
    integrations: [
      {
        key: "resend_api_key",
        label: "Resend API Key",
        description: "Para envío de emails transaccionales (invitaciones, recordatorios).",
        type: "api_key",
        placeholder: "re_...",
        isSecret: true,
        docsUrl: "https://resend.com/api-keys"
      },
      {
        key: "resend_from_email",
        label: "Resend From Email",
        description: "Email remitente verificado en Resend.",
        type: "config",
        placeholder: "noreply@tudominio.com",
        isSecret: false
      },
      {
        key: "twilio_account_sid",
        label: "Twilio Account SID",
        description: "SID de cuenta de Twilio para SMS.",
        type: "config",
        placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        isSecret: false,
        docsUrl: "https://console.twilio.com/"
      },
      {
        key: "twilio_auth_token",
        label: "Twilio Auth Token",
        description: "Token de autenticación de Twilio.",
        type: "api_key",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        isSecret: true
      },
      {
        key: "push_notification_key",
        label: "Push Notification Key (VAPID)",
        description: "Clave pública VAPID para notificaciones push web.",
        type: "config",
        placeholder: "BEl62i...",
        isSecret: false
      }
    ]
  },
  {
    id: "webhooks",
    title: "Webhooks Externos",
    description: "Webhooks de terceros, n8n, Zapier y automatizaciones",
    icon: Webhook,
    integrations: [
      {
        key: "n8n_base_url",
        label: "n8n Base URL",
        description: "URL base de tu instancia de n8n.",
        type: "config",
        placeholder: "https://n8n.tudominio.com",
        isSecret: false,
        docsUrl: "https://docs.n8n.io/"
      },
      {
        key: "n8n_webhook_url",
        label: "n8n Webhook URL (General)",
        description: "URL del webhook general de n8n para automatizaciones.",
        type: "webhook",
        placeholder: "https://n8n.tudominio.com/webhook/xxxxx",
        isSecret: false,
        docsUrl: "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
      },
      {
        key: "zapier_webhook_url",
        label: "Zapier Webhook URL",
        description: "URL del webhook de Zapier para integraciones.",
        type: "webhook",
        placeholder: "https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx/",
        isSecret: false,
        docsUrl: "https://zapier.com/apps/webhook/integrations"
      },
      {
        key: "make_webhook_url",
        label: "Make (Integromat) Webhook URL",
        description: "URL del webhook de Make para automatizaciones.",
        type: "webhook",
        placeholder: "https://hook.us1.make.com/xxxxx",
        isSecret: false,
        docsUrl: "https://www.make.com/en/help/tools/webhooks"
      },
      {
        key: "custom_webhook_url",
        label: "Webhook Personalizado",
        description: "URL de webhook personalizado para notificaciones.",
        type: "webhook",
        placeholder: "https://api.tuservicio.com/webhook",
        isSecret: false
      }
    ]
  },
  {
    id: "analytics",
    title: "Analytics y Seguimiento",
    description: "Herramientas de análisis y seguimiento",
    icon: Sparkles,
    integrations: [
      {
        key: "google_analytics_id",
        label: "Google Analytics ID",
        description: "ID de medición de Google Analytics 4.",
        type: "config",
        placeholder: "G-XXXXXXXXXX",
        isSecret: false,
        docsUrl: "https://analytics.google.com/"
      },
      {
        key: "meta_pixel_id",
        label: "Meta Pixel ID",
        description: "ID del píxel de Facebook/Meta para tracking.",
        type: "config",
        placeholder: "1234567890123456",
        isSecret: false,
        docsUrl: "https://business.facebook.com/events_manager"
      },
      {
        key: "tiktok_pixel_id",
        label: "TikTok Pixel ID",
        description: "ID del píxel de TikTok para tracking.",
        type: "config",
        placeholder: "XXXXXXXXXXXXXXXXX",
        isSecret: false,
        docsUrl: "https://ads.tiktok.com/help/article/tiktok-pixel"
      },
      {
        key: "hotjar_id",
        label: "Hotjar ID",
        description: "ID de Hotjar para heatmaps y grabaciones.",
        type: "config",
        placeholder: "1234567",
        isSecret: false,
        docsUrl: "https://www.hotjar.com/"
      }
    ]
  }
];

export function IntegrationsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [webhookModes, setWebhookModes] = useState<Record<string, "test" | "production">>({});
  const [activeTab, setActiveTab] = useState("system");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Get all non-secret keys from categories
      const allKeys = INTEGRATION_CATEGORIES.flatMap(cat => 
        cat.integrations.filter(i => !i.isSecret).map(i => i.key)
      );

      // Add system webhook production URLs
      const webhookProdKeys = SYSTEM_WEBHOOKS.map(w => w.productionUrlKey);
      const webhookModeKeys = SYSTEM_WEBHOOKS.map(w => `${w.key}_mode`);
      
      // Add GHL specific keys
      const ghlKeys = ['ghl_webhook_url', 'ghl_location_id'];
      
      const allSettingsKeys = [...allKeys, ...webhookProdKeys, ...webhookModeKeys, ...ghlKeys];

      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", allSettingsKeys);

      if (error) throw error;

      const loadedSettings: Record<string, string> = {};
      const loadedModes: Record<string, "test" | "production"> = {};
      
      data?.forEach((item) => {
        if (item.key.endsWith("_mode")) {
          const webhookKey = item.key.replace("_mode", "");
          loadedModes[webhookKey] = item.value as "test" | "production";
        } else {
          loadedSettings[item.key] = item.value;
        }
      });
      
      // Default all webhooks to test mode if not set
      SYSTEM_WEBHOOKS.forEach(w => {
        if (!loadedModes[w.key]) {
          loadedModes[w.key] = "test";
        }
      });
      
      setSettings(loadedSettings);
      setWebhookModes(loadedModes);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save regular integration settings
      const nonSecretSettings = Object.entries(settings).filter(([key]) => {
        const integration = INTEGRATION_CATEGORIES
          .flatMap(cat => cat.integrations)
          .find(i => i.key === key);
        // Include if it's a regular integration OR a system webhook production URL
        const isSystemWebhookProdUrl = SYSTEM_WEBHOOKS.some(w => w.productionUrlKey === key);
        return (integration && !integration.isSecret) || isSystemWebhookProdUrl;
      });

      for (const [key, value] of nonSecretSettings) {
        const integration = INTEGRATION_CATEGORIES
          .flatMap(cat => cat.integrations)
          .find(i => i.key === key);
        const systemWebhook = SYSTEM_WEBHOOKS.find(w => w.productionUrlKey === key);

        const { error } = await supabase
          .from("app_settings")
          .upsert({
            key,
            value: value || "",
            description: integration?.label || systemWebhook?.label || key,
            updated_at: new Date().toISOString()
          }, { onConflict: "key" });

        if (error) throw error;
      }

      // Save webhook modes
      for (const [key, mode] of Object.entries(webhookModes)) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({
            key: `${key}_mode`,
            value: mode,
            description: `Modo de webhook: ${key}`,
            updated_at: new Date().toISOString()
          }, { onConflict: "key" });

        if (error) throw error;
      }

      toast.success("Configuración guardada correctamente");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleWebhookMode = (webhookKey: string) => {
    setWebhookModes(prev => ({
      ...prev,
      [webhookKey]: prev[webhookKey] === "test" ? "production" : "test"
    }));
  };

  const getActiveWebhookUrl = (webhook: SystemWebhook) => {
    const mode = webhookModes[webhook.key] || "test";
    if (mode === "test") {
      return webhook.testUrl;
    }
    return settings[webhook.productionUrlKey] || "";
  };

  const testWebhook = async (url: string, label: string, webhookKey?: string) => {
    // Special handling for GHL webhook - use edge function
    if (webhookKey === "ghl_sync") {
      const webhookUrl = settings["ghl_webhook_url"];
      const locationId = settings["ghl_location_id"];

      if (!webhookUrl) {
        toast.error("Ingresa la URL del webhook de Funnel ROI primero");
        return;
      }

      try {
        toast.loading("Enviando prueba a Funnel ROI...");
        
        const { data, error } = await supabase.functions.invoke("ghl-sync", {
          body: { 
            event_type: "test", 
            data: {},
            webhook_url: webhookUrl,
            location_id: locationId || ""
          }
        });

        toast.dismiss();

        if (error) throw error;

        if (data?.success) {
          toast.success(data.message || "Conexión exitosa con Funnel ROI (GHL)");
        } else {
          toast.error(data?.error || "Error al conectar con GHL");
        }
      } catch (error: any) {
        toast.dismiss();
        console.error("GHL test error:", error);
        toast.error("Error al probar webhook: " + error.message);
      }
      return;
    }

    if (!url) {
      toast.error("Ingresa una URL de webhook primero");
      return;
    }

    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: "UGC Colombia - Test"
        })
      });
      
      toast.success(`Webhook enviado a ${label}. Verifica en tu servicio que llegó correctamente.`);
    } catch (error) {
      toast.error("Error al enviar webhook de prueba");
    }
  };

  const renderGHLWebhook = () => {
    const webhookUrl = settings["ghl_webhook_url"] || "";
    const locationId = settings["ghl_location_id"] || "";
    const isConfigured = Boolean(webhookUrl);

    return (
      <div className="border rounded-lg p-4 space-y-4 border-primary/30 bg-primary/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-sm font-medium">Funnel ROI (GHL) - Sincronización</Label>
              {isConfigured ? (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Configurado
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Sin configurar
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sincroniza automáticamente clientes, leads, contenido aprobado y pagos con tu CRM.
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="outline" className="text-xs font-mono">ghl-sync (Edge Function)</Badge>
              <Badge variant="outline" className="text-xs font-mono">Triggers automáticos en DB</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <a href="https://highlevel.stoplight.io/docs/integrations" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Configuration Fields */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              URL del Webhook Entrante
            </Label>
            <p className="text-xs text-muted-foreground">
              Crea un workflow en Funnel ROI con trigger "Webhook Entrante" y pega la URL aquí
            </p>
            <Input
              value={webhookUrl}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                ghl_webhook_url: e.target.value 
              }))}
              placeholder="https://services.leadconnectorhq.com/hooks/..."
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              Location ID (opcional)
            </Label>
            <p className="text-xs text-muted-foreground">
              ID de la ubicación en Funnel ROI. Se incluye en cada payload enviado.
            </p>
            <Input
              value={locationId}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                ghl_location_id: e.target.value 
              }))}
              placeholder="ej: abc123xyz..."
              className="font-mono text-xs"
            />
          </div>
        </div>

        {/* Test Button */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">
            {isConfigured ? "Webhook configurado y listo" : "Configura la URL para habilitar"}
          </div>
          <Button 
            variant={isConfigured ? "default" : "outline"}
            size="sm"
            onClick={() => testWebhook("", "Funnel ROI", "ghl_sync")}
            disabled={!isConfigured}
          >
            <Zap className="h-4 w-4 mr-1" />
            Probar conexión
          </Button>
        </div>

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Eventos sincronizados automáticamente:</strong>
            <ul className="mt-1 list-disc list-inside">
              <li>Nuevos clientes → Contacto en CRM</li>
              <li>Nuevos usuarios/leads → Contacto en CRM</li>
              <li>Contenido aprobado → Nota en contacto</li>
              <li>Contenido entregado → Nota en contacto</li>
              <li>Pagos creados → Oportunidad en CRM</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  const renderSystemWebhook = (webhook: SystemWebhook) => {
    const mode = webhookModes[webhook.key] || "test";
    const isProduction = mode === "production";
    const productionUrl = settings[webhook.productionUrlKey] || "";
    const activeUrl = getActiveWebhookUrl(webhook);
    const hasProductionUrl = Boolean(productionUrl);

    return (
      <div key={webhook.key} className="border rounded-lg p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-sm font-medium">{webhook.label}</Label>
              <Badge 
                variant={isProduction ? "default" : "secondary"}
                className={isProduction ? "bg-green-600" : "bg-amber-500"}
              >
                {isProduction ? "Producción" : "Test"}
              </Badge>
              {isProduction && !hasProductionUrl && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Sin URL
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{webhook.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {webhook.usedIn.map((file, idx) => (
                <Badge key={idx} variant="outline" className="text-xs font-mono">
                  {file}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {webhook.docsUrl && (
              <Button variant="ghost" size="icon" asChild>
                <a href={webhook.docsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${!isProduction ? "font-medium" : "text-muted-foreground"}`}>
              Test
            </span>
            <Switch 
              checked={isProduction}
              onCheckedChange={() => toggleWebhookMode(webhook.key)}
            />
            <span className={`text-sm ${isProduction ? "font-medium" : "text-muted-foreground"}`}>
              Producción
            </span>
          </div>
          {(activeUrl || webhook.key === "ghl_sync") && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testWebhook(activeUrl, webhook.label, webhook.key)}
            >
              <Zap className="h-4 w-4 mr-1" />
              Test
            </Button>
          )}
        </div>

        {/* URLs */}
        <div className="space-y-3">
          {/* Test URL (read-only) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">URL de Test (hardcoded)</Label>
            <div className="flex gap-2">
              <Input
                value={webhook.testUrl || "(No configurado en código)"}
                readOnly
                disabled={isProduction}
                className={`flex-1 font-mono text-xs ${isProduction ? "opacity-50" : ""}`}
              />
            </div>
          </div>

          {/* Production URL (editable) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">URL de Producción</Label>
            <Input
              value={productionUrl}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                [webhook.productionUrlKey]: e.target.value 
              }))}
              placeholder="https://n8n.tudominio.com/webhook/production-xxxxx"
              className={`font-mono text-xs ${!isProduction ? "opacity-50" : ""}`}
            />
          </div>
        </div>

        {/* Active URL Display */}
        <div className="p-2 bg-primary/5 rounded border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">URL Activa:</p>
          <code className="text-xs font-mono break-all">
            {activeUrl || "(Sin URL configurada)"}
          </code>
        </div>
      </div>
    );
  };

  const renderIntegration = (integration: IntegrationConfig) => {
    const value = settings[integration.key] || "";
    const isConfigured = Boolean(value);

    return (
      <div key={integration.key} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">{integration.label}</Label>
              {integration.isSecret && (
                <Badge variant="outline" className="text-xs">
                  <Key className="h-3 w-3 mr-1" />
                  Secreto
                </Badge>
              )}
              {isConfigured && !integration.isSecret && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{integration.description}</p>
          </div>
          {integration.docsUrl && (
            <Button variant="ghost" size="icon" asChild>
              <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        {integration.isSecret ? (
          <div className="space-y-2">
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Las API keys se configuran como secretos de Supabase por seguridad
            </p>
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://supabase.com/dashboard/project/_/settings/vault/secrets" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Key className="h-4 w-4 mr-2" />
                Configurar en Supabase Vault
              </a>
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => setSettings(prev => ({ ...prev, [integration.key]: e.target.value }))}
              placeholder={integration.placeholder}
              type={integration.type === "api_key" ? "password" : "text"}
              className="flex-1"
            />
            {integration.type === "webhook" && value && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => testWebhook(value, integration.label)}
              >
                <Zap className="h-4 w-4 mr-1" />
                Test
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Integraciones</h2>
        <p className="text-sm text-muted-foreground">
          Configura las conexiones con servicios externos, APIs y webhooks
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Seguridad:</strong> Las API keys sensibles deben configurarse como secretos en Supabase Vault. 
          Los webhooks y configuraciones no sensibles se guardan aquí.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
          {INTEGRATION_CATEGORIES.map((category) => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="flex flex-col items-center gap-1 py-2 px-1 text-xs"
            >
              <category.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{category.title.split(" ")[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* System Webhooks Tab - Special rendering */}
        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Webhooks del Sistema
              </CardTitle>
              <CardDescription>
                Webhooks activos en la plataforma. Alterna entre modo Test y Producción fácilmente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Importante:</strong> Los webhooks en modo Test usan URLs hardcodeadas en el código. 
                  Para producción, configura las URLs correspondientes y activa el modo Producción.
                </AlertDescription>
              </Alert>
              
              {/* Render GHL with special component */}
              {renderGHLWebhook()}
              
              <Separator className="my-4" />
              
              {/* Render other webhooks */}
              {SYSTEM_WEBHOOKS.filter(w => w.key !== "ghl_sync").map(renderSystemWebhook)}

              <Separator className="my-6" />

              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-sm mb-2">¿Cómo funciona?</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Modo Test:</strong> Usa la URL hardcodeada en el código (ideal para desarrollo)</li>
                  <li>• <strong>Modo Producción:</strong> Usa la URL configurada aquí (para ambiente productivo)</li>
                  <li>• Los cambios se guardan al hacer clic en "Guardar Configuración"</li>
                  <li>• Los componentes que usan estos webhooks leerán automáticamente la URL activa</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other category tabs */}
        {INTEGRATION_CATEGORIES.filter(cat => cat.id !== "system").map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="h-5 w-5" />
                  {category.title}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.integrations.map(renderIntegration)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado de Integraciones</CardTitle>
          <CardDescription>Resumen rápido de servicios configurados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Webhooks Status */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Webhooks del Sistema</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SYSTEM_WEBHOOKS.map(webhook => {
                const mode = webhookModes[webhook.key] || "test";
                const isProduction = mode === "production";
                const hasProductionUrl = Boolean(settings[webhook.productionUrlKey]);
                const isReady = !isProduction || hasProductionUrl;
                
                return (
                  <div 
                    key={webhook.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${
                      isReady 
                        ? isProduction 
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                          : "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
                        : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                    }`}
                  >
                    {isReady ? (
                      isProduction ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      )
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <span className="truncate flex-1">{webhook.label.replace("n8n - ", "")}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {isProduction ? "Prod" : "Test"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Other Integrations Status */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Otras Integraciones</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {INTEGRATION_CATEGORIES.filter(cat => cat.id !== "system")
                .flatMap(cat => cat.integrations)
                .filter(i => !i.isSecret)
                .slice(0, 8)
                .map(integration => {
                  const isConfigured = Boolean(settings[integration.key]);
                  return (
                    <div 
                      key={integration.key}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${
                        isConfigured ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : "bg-muted/50"
                      }`}
                    >
                      {isConfigured ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate">{integration.label.split(" ")[0]}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-4">
        <Button onClick={saveSettings} disabled={saving} size="lg" className="shadow-lg">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
