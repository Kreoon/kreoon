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
  Sparkles, Zap, MessageSquare, Image
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
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
        description: "Para generación de voz y text-to-speech.",
        type: "api_key",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        isSecret: true,
        docsUrl: "https://elevenlabs.io/app/settings/api-keys"
      }
    ]
  },
  {
    id: "communication",
    title: "Comunicación",
    description: "Email, SMS y notificaciones",
    icon: Mail,
    integrations: [
      {
        key: "resend_api_key",
        label: "Resend API Key",
        description: "Para envío de emails transaccionales.",
        type: "api_key",
        placeholder: "re_...",
        isSecret: true,
        docsUrl: "https://resend.com/api-keys"
      },
      {
        key: "resend_from_email",
        label: "Email Remitente",
        description: "Email verificado desde donde se envían los correos.",
        type: "config",
        placeholder: "noreply@tudominio.com",
        isSecret: false
      },
      {
        key: "twilio_account_sid",
        label: "Twilio Account SID",
        description: "Para SMS y WhatsApp Business.",
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
      }
    ]
  },
  {
    id: "webhooks",
    title: "Webhooks y Automatización",
    description: "Webhooks, n8n, Zapier y automatizaciones",
    icon: Webhook,
    integrations: [
      {
        key: "n8n_webhook_url",
        label: "n8n Webhook URL",
        description: "URL del webhook de n8n para automatizaciones.",
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
      }
    ]
  }
];

export function IntegrationsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("ai");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allKeys = INTEGRATION_CATEGORIES.flatMap(cat => 
        cat.integrations.filter(i => !i.isSecret).map(i => i.key)
      );

      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", allKeys);

      if (error) throw error;

      const loadedSettings: Record<string, string> = {};
      data?.forEach((item) => {
        loadedSettings[item.key] = item.value;
      });
      setSettings(loadedSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const nonSecretSettings = Object.entries(settings).filter(([key]) => {
        const integration = INTEGRATION_CATEGORIES
          .flatMap(cat => cat.integrations)
          .find(i => i.key === key);
        return integration && !integration.isSecret;
      });

      for (const [key, value] of nonSecretSettings) {
        const integration = INTEGRATION_CATEGORIES
          .flatMap(cat => cat.integrations)
          .find(i => i.key === key);

        const { error } = await supabase
          .from("app_settings")
          .upsert({
            key,
            value: value || "",
            description: integration?.label || key,
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

  const testWebhook = async (url: string, label: string) => {
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
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
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

        {INTEGRATION_CATEGORIES.map((category) => (
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
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {INTEGRATION_CATEGORIES.flatMap(cat => cat.integrations)
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
