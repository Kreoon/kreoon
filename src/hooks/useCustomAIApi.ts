import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useOrganizationAI,
  AI_PROVIDERS_CONFIG,
  PERPLEXITY_MODELS,
} from "./useOrganizationAI";

const CUSTOM_API_PROVIDERS = [
  { key: "gemini", label: "Google Gemini", link: "https://aistudio.google.com/apikey", icon: "Gemini" },
  { key: "openai", label: "OpenAI", link: "https://platform.openai.com/api-keys", icon: "OpenAI" },
  { key: "anthropic", label: "Anthropic Claude", link: "https://console.anthropic.com/", icon: "Claude" },
  { key: "perplexity", label: "Perplexity", link: "https://www.perplexity.ai/settings/api", icon: "Perplexity" },
  { key: "xai", label: "xAI (Grok)", link: "https://console.x.ai/", icon: "Grok" },
] as const;

type ProviderKey = (typeof CUSTOM_API_PROVIDERS)[number]["key"];

const TEST_ENDPOINTS: Record<string, { url: string; body: Record<string, unknown> }> = {
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    body: { model: "gemini-2.0-flash", messages: [{ role: "user", content: "Hi" }], max_tokens: 5 },
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    body: { model: "gpt-4o-mini", messages: [{ role: "user", content: "Hi" }], max_tokens: 5 },
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    body: { model: "claude-3-5-haiku-20241022", max_tokens: 5, messages: [{ role: "user", content: "Hi" }] },
  },
  perplexity: {
    url: "https://api.perplexity.ai/chat/completions",
    body: { model: "llama-3.1-sonar-small-128k-online", messages: [{ role: "user", content: "Hi" }], max_tokens: 5 },
  },
  xai: {
    url: "https://api.x.ai/v1/chat/completions",
    body: { model: "grok-2-1212", messages: [{ role: "user", content: "Hi" }], max_tokens: 5 },
  },
};

export function useCustomAIApi(organizationId?: string) {
  const orgAI = useOrganizationAI(organizationId);
  const [customApiEnabled, setCustomApiEnabledState] = useState(false);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const fetchTokenConfig = useCallback(async () => {
    if (!organizationId) return;
    setTokensLoading(true);
    try {
      const { data } = await supabase
        .from("organization_ai_tokens")
        .select("custom_api_enabled")
        .eq("organization_id", organizationId)
        .maybeSingle();
      setCustomApiEnabledState(data?.custom_api_enabled ?? false);
    } catch {
      setCustomApiEnabledState(false);
    } finally {
      setTokensLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchTokenConfig();
  }, [fetchTokenConfig]);

  const setCustomApiEnabled = async (enabled: boolean) => {
    if (!organizationId) return;
    try {
      const { error } = await supabase.from("organization_ai_tokens").upsert(
        {
          organization_id: organizationId,
          custom_api_enabled: enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" }
      );
      if (error) throw error;
      setCustomApiEnabledState(enabled);
      return true;
    } catch {
      return false;
    }
  };

  const testProviderConnection = async (providerKey: string): Promise<boolean> => {
    const provider = orgAI.providers.find((p) => p.provider_key === providerKey);
    const apiKey = provider?.api_key_encrypted;
    if (!apiKey) return false;

    const config = TEST_ENDPOINTS[providerKey];
    if (!config) return false;

    setTestingProvider(providerKey);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      if (providerKey === "anthropic") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
        delete headers.Authorization;
      }
      const res = await fetch(config.url, {
        method: "POST",
        headers,
        body: JSON.stringify(config.body),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setTestingProvider(null);
    }
  };

  const configuredProviders = CUSTOM_API_PROVIDERS.filter((p) =>
    orgAI.hasValidApiKey(p.key)
  );

  return {
    ...orgAI,
    customApiEnabled,
    setCustomApiEnabled,
    tokensLoading,
    CUSTOM_API_PROVIDERS,
    testProviderConnection,
    testingProvider,
    configuredProviders,
  };
}
