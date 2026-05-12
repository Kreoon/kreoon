import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";

import { validateAPIKey, requireScope, checkRateLimit, logAudit } from "./middleware/auth.js";
import { scriptToolDefinitions, handleScriptTool } from "./tools/scripts.js";
import { adnToolDefinitions, handleADNTool } from "./tools/adn.js";
import { creatorToolDefinitions, handleCreatorTool } from "./tools/creators.js";
import { profileToolDefinitions, handleProfileTool } from "./tools/profiles.js";
import { socialToolDefinitions, handleSocialTool } from "./tools/social.js";
import { AuthScope, AuthContext } from "./types.js";

// ─── Validación de variables de entorno ─────────────────────────────────────

const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[kreoon-mcp] Error: variable de entorno ${key} no definida`);
    process.exit(1);
  }
}

// ─── Mapeo tool → scope requerido ───────────────────────────────────────────

const TOOL_SCOPES: Record<string, AuthScope> = {
  generate_script: "scripts:write",
  improve_script: "scripts:write",
  start_adn_research: "adn:write",
  get_adn_status: "adn:read",
  search_creators: "creators:read",
  score_creator_for_campaign: "creators:read",
  optimize_creator_profile: "profiles:write",
  publish_to_social: "social:write",
};

// ─── Todos los tool definitions ──────────────────────────────────────────────

const ALL_TOOLS = [
  ...scriptToolDefinitions,
  ...adnToolDefinitions,
  ...creatorToolDefinitions,
  ...profileToolDefinitions,
  ...socialToolDefinitions,
];

// ─── Rate limits por herramienta (requests/hora) ─────────────────────────────

const TOOL_RATE_LIMITS: Record<string, number> = {
  generate_script: 50,
  improve_script: 100,
  start_adn_research: 5,
  get_adn_status: 500,
  search_creators: 200,
  score_creator_for_campaign: 100,
  optimize_creator_profile: 30,
  publish_to_social: 20,
};

// ─── Dispatcher ──────────────────────────────────────────────────────────────

async function dispatchTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
) {
  if (scriptToolDefinitions.some((t) => t.name === toolName)) {
    return handleScriptTool(toolName, args, auth);
  }
  if (adnToolDefinitions.some((t) => t.name === toolName)) {
    return handleADNTool(toolName, args, auth);
  }
  if (creatorToolDefinitions.some((t) => t.name === toolName)) {
    return handleCreatorTool(toolName, args, auth);
  }
  if (profileToolDefinitions.some((t) => t.name === toolName)) {
    return handleProfileTool(toolName, args, auth);
  }
  if (socialToolDefinitions.some((t) => t.name === toolName)) {
    return handleSocialTool(toolName, args, auth);
  }
  throw new McpError(ErrorCode.MethodNotFound, `Tool no registrada: ${toolName}`);
}

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "kreoon-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: rawArgs = {} } = request.params;
  const args = rawArgs as Record<string, unknown>;
  const startTime = Date.now();

  // Extraer API key del meta del request (pasada por el cliente MCP)
  const meta = (request.params as Record<string, unknown>)._meta as Record<string, unknown> | undefined;
  const apiKey = (meta?.api_key as string | undefined) ?? process.env.KREOON_DEV_KEY;

  if (!apiKey) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Se requiere API key. Pásala en _meta.api_key o define KREOON_DEV_KEY en .env"
    );
  }

  let auth: AuthContext | null = null;

  try {
    // 1. Validar API key
    auth = await validateAPIKey(apiKey);

    // 2. Verificar scope
    const requiredScope = TOOL_SCOPES[toolName];
    if (requiredScope) {
      requireScope(auth.scopes, requiredScope);
    }

    // 3. Rate limiting por herramienta
    const rateLimit = TOOL_RATE_LIMITS[toolName] ?? 100;
    checkRateLimit(`${auth.key_id}:${toolName}`, rateLimit);

    // 4. Ejecutar tool
    const result = await dispatchTool(toolName, args, auth);

    const elapsed = Date.now() - startTime;

    // 5. Audit log asíncrono
    logAudit({
      key_id: auth.key_id,
      organization_id: auth.org_id,
      action: toolName,
      response_status: result.success ? 200 : 400,
      response_time_ms: elapsed,
      ai_tokens_used: result.tokens_used ?? 0,
    });

    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: result.error }, null, 2),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);

    if (auth) {
      logAudit({
        key_id: auth.key_id,
        organization_id: auth.org_id,
        action: toolName,
        response_status: 500,
        response_time_ms: elapsed,
        error_code: message,
      });
    }

    if (error instanceof McpError) throw error;

    throw new McpError(ErrorCode.InternalError, message);
  }
});

// ─── Inicio ──────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[kreoon-mcp] Servidor iniciado en stdio | ${ALL_TOOLS.length} tools registradas`
  );
}

main().catch((err) => {
  console.error("[kreoon-mcp] Error fatal:", err);
  process.exit(1);
});
