export interface PromptConfig {
  id: string;
  moduleKey: string;
  name: string;
  description: string;

  systemPrompt: string;
  userPromptTemplate?: string;

  variables: PromptVariable[];

  outputFormat: "json" | "html" | "text" | "markdown";
  outputSchema?: Record<string, unknown>;

  defaults?: {
    temperature?: number;
    maxTokens?: number;
  };

  category:
    | "research"
    | "scripts"
    | "board"
    | "talent"
    | "portfolio"
    | "up"
    | "streaming"
    | "general";
}

export interface PromptVariable {
  key: string;
  description: string;
  required: boolean;
  type: "string" | "number" | "boolean" | "array" | "object";
  defaultValue?: unknown;
  // Sintaxis unificada: siempre usar {variable}
  // La función replaceVariables manejará conversión desde {{var}} o ${var}
}

export type PromptVariables = Record<string, unknown>;
