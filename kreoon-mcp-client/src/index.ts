#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.KREOON_API_KEY;
const SERVER  = (process.env.KREOON_SERVER ?? "https://mcp.kreoon.com").replace(/\/$/, "");

if (!API_KEY) {
  process.stderr.write("Error: KREOON_API_KEY no configurado\n");
  process.exit(1);
}

// ─── REST helper ─────────────────────────────────────────────────────────────

async function apiFetch(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${SERVER}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data;
}

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "kreoon", version: "3.0.0" },
  { capabilities: { tools: {} } }
);

// Lista de tools — se obtiene dinámicamente del REST API
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const data = await apiFetch("/v1/tools") as { tools: { name: string; description: string; inputSchema: object }[] };
  return {
    tools: data.tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

// Ejecución de tool — proxy al REST API
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await apiFetch(`/v1/tools/${name}`, "POST", args ?? {});
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
      isError: true,
    };
  }
});

// ─── Arranque ────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
