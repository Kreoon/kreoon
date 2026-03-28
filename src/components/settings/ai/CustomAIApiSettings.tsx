import { useState } from "react";
import { KreoonCard } from "@/components/ui/kreoon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Key,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  Info,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useCustomAIApi } from "@/hooks/useCustomAIApi";
import { AI_PROVIDERS_CONFIG, PERPLEXITY_MODELS } from "@/hooks/useOrganizationAI";

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  gemini: <span className="text-lg">✨</span>,
  openai: <span className="text-lg">🤖</span>,
  anthropic: <span className="text-lg">🧠</span>,
  perplexity: <span className="text-lg">🔍</span>,
  xai: <span className="text-lg">⚡</span>,
};

interface CustomAIApiSettingsProps {
  organizationId: string;
}

export function CustomAIApiSettings({ organizationId }: CustomAIApiSettingsProps) {
  const {
    customApiEnabled,
    setCustomApiEnabled,
    providers,
    defaults,
    updateProviderApiKey,
    updateDefaults,
    hasValidApiKey,
    getMaskedApiKey,
    testProviderConnection,
    testingProvider,
    configuredProviders,
    CUSTOM_API_PROVIDERS,
    saving,
  } = useCustomAIApi(organizationId);

  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, "ok" | "error" | null>>({});

  const handleToggleCustomApi = async (enabled: boolean) => {
    try {
      const ok = await setCustomApiEnabled(enabled);
      if (ok) {
        toast.success(enabled ? "APIs propias activadas" : "APIs propias desactivadas");
      } else {
        toast.error("Error al actualizar la configuración");
      }
    } catch {
      toast.error("Error al actualizar la configuración");
    }
  };

  const handleSaveApiKey = async (providerKey: string) => {
    const key = apiKeyInputs[providerKey];
    if (!key?.trim()) {
      toast.error("Ingresa una API Key válida");
      return;
    }
    try {
      await updateProviderApiKey(providerKey, key.trim());
      setApiKeyInputs((p) => ({ ...p, [providerKey]: "" }));
      toast.success("API Key guardada correctamente");
    } catch {
      toast.error("Error al guardar la API Key");
    }
  };

  const handleTestConnection = async (providerKey: string) => {
    const ok = await testProviderConnection(providerKey);
    setConnectionStatus((p) => ({ ...p, [providerKey]: ok ? "ok" : "error" }));
    if (ok) {
      toast.success("Conexión exitosa");
    } else {
      toast.error("No se pudo conectar. Verifica tu API Key.");
    }
  };

  const getStatusBadge = (providerKey: string) => {
    const hasKey = hasValidApiKey(providerKey);
    const status = connectionStatus[providerKey];
    if (status === "ok") return { label: "✓ Conectado", variant: "default" as const, icon: <Check className="h-3 w-3" /> };
    if (status === "error") return { label: "⚠ Error", variant: "destructive" as const, icon: <AlertCircle className="h-3 w-3" /> };
    if (hasKey) return { label: "○ Configurado", variant: "secondary" as const, icon: null };
    return { label: "○ No configurado", variant: "outline" as const, icon: null };
  };

  return (
    <div className="space-y-6">
      {/* Toggle principal */}
      <KreoonCard className="p-6" glow>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Usar mis propias APIs de IA</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Conecta tus APIs para uso ilimitado sin gastar tokens
            </p>
          </div>
          <Switch
            checked={customApiEnabled}
            onCheckedChange={handleToggleCustomApi}
          />
        </div>
      </KreoonCard>

      {customApiEnabled && (
        <>
          {/* Cards por provider */}
          <div className="grid gap-4 sm:grid-cols-2">
            {CUSTOM_API_PROVIDERS.map((provider) => {
              const hasKey = hasValidApiKey(provider.key);
              const status = getStatusBadge(provider.key);
              const isTesting = testingProvider === provider.key;

              return (
                <KreoonCard key={provider.key} className="p-4" hover>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10">
                          {PROVIDER_ICONS[provider.key] ?? <Sparkles className="h-4 w-4" />}
                        </div>
                        <span className="font-medium">{provider.label}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          status.variant === "default"
                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                            : status.variant === "destructive"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">API Key</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showKeys[provider.key] ? "text" : "password"}
                            placeholder={
                              hasKey ? "Dejar vacío para mantener la actual" : `sk-... o pplx-...`
                            }
                            value={apiKeyInputs[provider.key] ?? ""}
                            onChange={(e) =>
                              setApiKeyInputs((p) => ({
                                ...p,
                                [provider.key]: e.target.value,
                              }))
                            }
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() =>
                              setShowKeys((p) => ({
                                ...p,
                                [provider.key]: !p[provider.key],
                              }))
                            }
                          >
                            {showKeys[provider.key] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSaveApiKey(provider.key)}
                          disabled={saving || !apiKeyInputs[provider.key]?.trim()}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                        </Button>
                      </div>
                    </div>

                    <a
                      href={provider.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {provider.key === "gemini"
                        ? "Obtener API key en Google AI Studio"
                        : provider.key === "openai"
                        ? "Obtener en platform.openai.com"
                        : provider.key === "anthropic"
                        ? "Obtener en console.anthropic.com"
                        : provider.key === "perplexity"
                        ? "Obtener en perplexity.ai/settings/api"
                        : "Obtener en x.ai"}
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleTestConnection(provider.key)}
                      disabled={!hasKey || isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Probar conexión
                    </Button>
                  </div>
                </KreoonCard>
              );
            })}
          </div>

          {/* Selector provider predeterminado */}
          {configuredProviders.length > 0 && (
            <KreoonCard className="p-4">
              <div className="space-y-2">
                <Label>Provider predeterminado</Label>
                <p className="text-xs text-muted-foreground">
                  Usar este provider cuando genere contenido con IA
                </p>
                <Select
                  value={
                    defaults?.default_provider &&
                    configuredProviders.some((p) => p.key === defaults.default_provider)
                      ? defaults.default_provider
                      : configuredProviders[0]?.key ?? "gemini"
                  }
                  onValueChange={async (value) => {
                    try {
                      const defaultModel =
                        value === "perplexity"
                          ? PERPLEXITY_MODELS[0]?.value ?? "llama-3.1-sonar-large-128k-online"
                          : (AI_PROVIDERS_CONFIG as Record<string, { models?: { value: string }[] }>)[value]?.models?.[0]?.value ?? "gemini-2.5-flash";
                      await updateDefaults({
                        default_provider: value,
                        default_model: defaultModel,
                      } as any);
                      toast.success("Provider predeterminado actualizado");
                    } catch {
                      toast.error("Error al actualizar");
                    }
                  }}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredProviders.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </KreoonCard>
          )}

          {/* Nota informativa */}
          <KreoonCard className="p-4 border-primary/20 bg-primary/5">
            <div className="flex gap-3">
              <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div className="space-y-1 text-sm">
                <p>
                  Al usar tus propias APIs, los costos se cobran directamente en
                  tu cuenta del proveedor.
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  Tus API keys se almacenan encriptadas y nunca se comparten.
                </p>
              </div>
            </div>
          </KreoonCard>
        </>
      )}
    </div>
  );
}
