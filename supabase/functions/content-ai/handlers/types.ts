export interface ContentAIRequest {
  action: "generate_script" | "analyze_content" | "chat" | "improve_script" | "research_and_generate" | "generate_with_skills";
  organizationId: string;
  ai_provider?: "gemini" | "openai" | "anthropic";
  ai_model?: string;
  use_perplexity?: boolean; // Enable pre-research with Perplexity
  use_skills?: boolean; // Enable Skills system (agents)
  stream?: boolean;    // false = JSON response (MCP/n8n); true/undefined = SSE streaming (UI)
  perplexity_queries?: {
    trends?: boolean;
    hooks?: boolean;
    competitors?: boolean;
    audience?: boolean;
  };
  custom_perplexity_query?: string;
  data?: {
    client_name?: string;
    product?: string;
    objective?: string;
    duration?: string;
    tone?: string;
    script?: string;
    video_url?: string;
    messages?: Array<{ role: string; content: string }>;
    original_script?: string;
    feedback?: string;
  };
  prompt?: string;
  product?: {
    id?: string;
    name?: string;
    description?: string;
    strategy?: string;
    market_research?: string;
    ideal_avatar?: string;
    sales_angles?: string[];
  };
  script_params?: any;
  generation_type?: string;
}

// Contexto compartido que arma index.ts una sola vez y le pasa a cada handler
// de accion (antes eran closures implicitas dentro de un switch gigante).
export interface ContentAIContext {
  supabase: any;
  body: ContentAIRequest;
  organizationId: string;
  callerUserId: string;
  product?: ContentAIRequest['product'];
  data?: ContentAIRequest['data'];
  prompt?: string;
  generation_type?: string;
  aiConfig: { provider: string; apiKey: string; model: string };
  fallbacks: Array<{ provider: string; model: string; apiKey: string }>;
}
