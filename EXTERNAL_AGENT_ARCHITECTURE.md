# External Agent Architecture — Kreoon MCP Integration Guide

**Versión:** 1.0  
**Fecha:** 2026-05-08  
**Audiencia:** Automatizadores, desarrolladores de integraciones, partners de agencias

---

## 1. Visión General

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL AGENTS / TOOLS                         │
│  n8n · Make.com · Claude Desktop · Zapier · Python SDK · REST API  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  HTTPS + Bearer sk-kreeon-{uuid}
┌──────────────────────────▼──────────────────────────────────────────┐
│                      MCP API GATEWAY                                │
│                   api.kreoon.com/mcp/v1                             │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────────────┐  │
│  │ Auth Layer  │  │ Rate Limiter  │  │   Audit Logger           │  │
│  │ (key hash)  │  │ (per tier)    │  │   (mcp_audit_logs)       │  │
│  └──────┬──────┘  └───────┬───────┘  └──────────────────────────┘  │
└─────────┼─────────────────┼───────────────────────────────────────  ┘
          │                 │
┌─────────▼─────────────────▼──────────────────────────────────────── ┐
│                    SUPABASE EDGE FUNCTIONS                           │
│  mcp-scripts · mcp-adn · mcp-profiles · mcp-search                 │
│  mcp-social  · mcp-finance · mcp-webhooks                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Internal (service_role context)
┌──────────────────────────▼──────────────────────────────────────────┐
│                     SUPABASE POSTGRESQL                             │
│  480+ tablas · RLS policies · 50+ Edge Functions · Bunny CDN       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Autenticación Universal

Todos los agentes externos usan el mismo esquema:

```http
POST https://api.kreoon.com/mcp/v1/{tool_name}
Authorization: Bearer sk-kreoon-{uuid-v4}
Content-Type: application/json
X-Organization-ID: {org_uuid}   (opcional: si la key es multi-org)
```

### Obtener una API Key (como admin)

```http
POST /mcp/v1/auth/create_key
{
  "name": "n8n Production Automation",
  "scopes": ["scripts:write", "adn:read", "creators:read"],
  "expires_in_days": 365
}

Response 201:
{
  "key": "sk-kreoon-a1b2c3d4-...",   // Solo se muestra UNA VEZ
  "key_id": "uuid",
  "prefix": "sk-kreoon-a1b2",
  "expires_at": "2027-05-08T00:00:00Z"
}
```

---

## 3. Integración con n8n

### 3.1 Configuración del Nodo HTTP Request

```json
{
  "node": "HTTP Request",
  "parameters": {
    "method": "POST",
    "url": "https://api.kreoon.com/mcp/v1/generate_script",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Authorization", "value": "Bearer {{ $credentials.kreoonApiKey }}" },
        { "name": "Content-Type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        { "name": "product_id", "value": "={{ $json.product_id }}" },
        { "name": "platform", "value": "instagram_reels" },
        { "name": "skills", "value": ["hooks-specialist", "virality-optimizer"] }
      ]
    }
  }
}
```

### 3.2 Credential Store en n8n

1. Ir a **Settings → Credentials → Add Credential**
2. Tipo: **HTTP Header Auth**
3. Name: `Kreoon MCP Production`
4. Header Name: `Authorization`
5. Header Value: `Bearer sk-kreoon-{tu-key}`

### 3.3 Workflow: Brief → ADN → Scripts → Programar Social

```
[Webhook Trigger]
      │
      ▼
[HTTP: start_adn_research]  ──→  product_id, organization_id
      │
      ▼
[Wait Node: 45 segundos]
      │
      ▼
[HTTP: get_adn_status]  ──→  ¿status == "completed"?
      │ No                          │ Sí
      ▼                             ▼
[IF Loop: reintento]      [HTTP: generate_script] × N plataformas
                                   │
                                   ▼
                         [HTTP: schedule_content_batch]
                                   │
                                   ▼
                         [Slack: Notificación de éxito]
```

**Nodo "start_adn_research":**
```json
{
  "tool": "start_adn_research",
  "product_id": "={{ $json.product_id }}",
  "organization_id": "={{ $json.org_id }}",
  "config": {
    "include_social_intelligence": true,
    "include_ad_intelligence": false,
    "locations": ["CO", "MX"]
  }
}
```

**Nodo "get_adn_status" con loop:**
```javascript
// En nodo Function antes del IF
const status = $json.status;
const attempts = $node["Counter"].json.count || 0;

if (status === 'completed') {
  return [{ json: { ....$json, ready: true } }];
} else if (attempts > 10) {
  throw new Error('ADN Research timeout after 10 attempts');
} else {
  return [{ json: { ....$json, ready: false, attempts: attempts + 1 } }];
}
```

**Nodo "schedule_content_batch":**
```json
{
  "tool": "schedule_content_batch",
  "posts": [
    {
      "content": "={{ $json.script_instagram }}",
      "platform": "instagram",
      "scheduled_at": "={{ $now.plus(1, 'day').toISO() }}"
    },
    {
      "content": "={{ $json.script_tiktok }}",
      "platform": "tiktok",
      "scheduled_at": "={{ $now.plus(2, 'days').toISO() }}"
    }
  ],
  "organization_id": "={{ $json.org_id }}"
}
```

---

## 4. Integración con Make.com (ex-Integromat)

### 4.1 Módulo HTTP Genérico

Make.com no tiene módulo nativo de Kreoon — usar **HTTP → Make an API Call**:

```
Module: HTTP - Make an API Call
URL: https://api.kreoon.com/mcp/v1/{tool}
Method: POST
Headers:
  Authorization: Bearer {{apiKey}}
  Content-Type: application/json
Body type: Raw
Body content: {"product_id": "{{productId}}", ...}
```

### 4.2 Scenario: Búsqueda de Creators → Score → Envío WhatsApp

```
[Webhook] → [HTTP: search_creators] → [Iterator] → [HTTP: score_creator_for_campaign]
                                                            │
                                          [Filter: score >= 80]
                                                            │
                                          [WhatsApp Business: Enviar mensaje]
```

**Módulo search_creators:**
```json
{
  "url": "https://api.kreoon.com/mcp/v1/search_creators",
  "body": {
    "query": "{{1.search_query}}",
    "specializations": ["ugc", "video_editor"],
    "min_score": 70,
    "available_only": true,
    "limit": 20
  }
}
```

**Módulo score_creator_for_campaign:**
```json
{
  "url": "https://api.kreoon.com/mcp/v1/score_creator_for_campaign",
  "body": {
    "creator_id": "{{iterator.id}}",
    "campaign_requirements": {
      "platform": "instagram",
      "content_type": "ugc",
      "budget": 500,
      "timeline_days": 14
    }
  }
}
```

### 4.3 Manejo de Errores en Make

```
[HTTP Module] ──→ [Router]
                     ├── [Filter: status = 200] → [Continuar]
                     ├── [Filter: status = 429] → [Wait 60s] → [Reintentar]
                     ├── [Filter: status = 402] → [Slack: Tokens insuficientes]
                     └── [Filter: status >= 500] → [Email: Error crítico]
```

---

## 5. Integración con Claude (Desktop / API)

### 5.1 Tools Definition para Claude API

```typescript
// sdk de Anthropic con tools de Kreoon MCP
const tools: Tool[] = [
  {
    name: "kreoon_generate_script",
    description: "Genera un guión UGC optimizado para una plataforma específica usando el ADN del producto",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "UUID del producto en Kreoon" },
        platform: { 
          type: "string", 
          enum: ["instagram_reels", "tiktok", "youtube_shorts"] 
        },
        skills: { 
          type: "array", 
          items: { type: "string" },
          description: "Skills de IA a aplicar (hooks-specialist, virality-optimizer, etc.)" 
        }
      },
      required: ["product_id", "platform"]
    }
  },
  {
    name: "kreoon_search_creators",
    description: "Busca creadores en el marketplace de Kreoon con filtros avanzados",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        specializations: { type: "array", items: { type: "string" } },
        min_score: { type: "number", minimum: 0, maximum: 100 },
        limit: { type: "number", maximum: 50 }
      },
      required: ["query"]
    }
  }
];
```

### 5.2 Tool Executor

```typescript
async function executeTool(toolName: string, toolInput: Record<string, unknown>) {
  const toolMap: Record<string, string> = {
    kreoon_generate_script: "generate_script",
    kreoon_search_creators: "search_creators",
    kreoon_get_adn_status: "get_adn_status",
    kreoon_check_token_balance: "check_token_balance"
  };

  const endpoint = toolMap[toolName];
  if (!endpoint) throw new Error(`Unknown tool: ${toolName}`);

  const response = await fetch(`https://api.kreoon.com/mcp/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.KREOON_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toolInput)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Kreoon API error ${response.status}: ${error.message}`);
  }

  return await response.json();
}
```

### 5.3 Conversation Loop con Tool Use

```typescript
const client = new Anthropic();

async function runKreoonAgent(userMessage: string) {
  const messages: Message[] = [{ role: "user", content: userMessage }];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools,
      messages
    });

    if (response.stop_reason === "end_turn") {
      return response.content[0].text;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults = await Promise.all(
        response.content
          .filter(b => b.type === "tool_use")
          .map(async (b) => ({
            type: "tool_result" as const,
            tool_use_id: b.id,
            content: JSON.stringify(await executeTool(b.name, b.input))
          }))
      );

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }
  }
}

// Uso:
const result = await runKreoonAgent(
  "Busca 5 creadores UGC disponibles para una campaña de cosméticos en Colombia " +
  "y genera un guión para Instagram Reels del producto con ID abc-123"
);
```

---

## 6. Integración con Zapier

### 6.1 Zap: Nuevo Brief en Notion → Iniciar ADN Research

```
Trigger: Notion - New Database Item (Brief recibido)
     │
     ▼
Action: Webhooks by Zapier - POST
  URL: https://api.kreoon.com/mcp/v1/start_adn_research
  Headers: Authorization: Bearer {{API_KEY}}
  Data: {
    "product_id": "{{notion_product_id}}",
    "organization_id": "{{org_id}}"
  }
     │
     ▼
Action: Notion - Update Database Item (status = "ADN en proceso")
```

### 6.2 Zap: Webhook Kreoon → Slack al completar ADN

```
Trigger: Webhooks by Zapier - Catch Hook
  (URL configurada en mcp_webhooks con evento adn.completed)
     │
     ▼
Filter: status = "completed"
     │
     ▼
Action: Slack - Send Channel Message
  Text: "✅ ADN completado para {{product_name}} | Confianza: {{confidence_score}}%"
```

### 6.3 Zap: Stripe Pago Exitoso → Actualizar Wallet Kreoon

```
Trigger: Stripe - New Payment (filtrado por metadata.source = "kreoon")
     │
     ▼
Action: Webhooks by Zapier - POST
  URL: https://api.kreoon.com/mcp/v1/get_wallet_overview
  (Verificar balance actualizado)
     │
     ▼
Action: Gmail - Send Email (confirmación al creator)
```

---

## 7. Flujos de Automatización Clave

### 7.1 Flujo Completo: Brief → ADN → Scripts → Social

```
1. [INPUT] Llega un brief de producto (via webhook, n8n, Make, o API directa)
2. [ADN]   start_adn_research(product_id) → research_id
3. [POLL]  get_adn_status(research_id) cada 30s hasta status="completed" (max 10 min)
4. [SCRIPTS] Para cada plataforma en [instagram, tiktok, youtube]:
             generate_script(product_id, platform, skills=[...])
5. [REVIEW] Scripts guardados en BD → notificación al estratega para aprobación
6. [SCHEDULE] Al aprobar: schedule_content_batch(posts, scheduled_dates)
7. [NOTIFY] Webhook evento content.scheduled → Slack/WhatsApp del equipo
```

**Tiempo estimado total:** 5–12 minutos (dominado por ADN research ~45s–3min)  
**Costo en tokens:** 2400 (ADN) + 150 (3 scripts × 50) = 2550 tokens

### 7.2 Flujo: Búsqueda de Creator → Score → Contacto

```
1. [INPUT] Requerimientos de campaña (plataforma, tipo contenido, presupuesto, plazo)
2. [SEARCH] search_creators(query, specializations, min_score=70, limit=20)
3. [SCORE]  Para cada creator: score_creator_for_campaign(creator_id, requirements)
4. [FILTER] Mantener creators con score >= 80
5. [RANK]   Ordenar por score DESC, tomar top 5
6. [CONTACT] Para cada creator top: get_creator_public_profile → WhatsApp/email
7. [LOG]    Registrar outreach en CRM (tabla campaign_creator_contacts)
```

**Tiempo estimado:** 30–60 segundos  
**Costo en tokens:** 40 tokens × N creators evaluados

### 7.3 Flujo: Optimización de Perfil → Publicación

```
1. [ANALYZE] get_creator_public_profile(creator_id) → score actual
2. [GAPS]    optimize_creator_profile(creator_id) → recomendaciones priorizadas
3. [APPLY]   Para cada recomendación HIGH priority:
             update_creator_profile(field, new_value)
4. [VERIFY]  get_creator_public_profile(creator_id) → comparar score nuevo vs anterior
5. [GENERATE] generate_portfolio_description(creator_id)
6. [REPORT]  Guardar reporte en Google Drive / Notion
```

### 7.4 Flujo: Monitoreo Financiero → Pago Automático

```
1. [CRON]   Ejecutar diariamente a las 9 AM UTC
2. [CHECK]  check_token_balance(org_id) → alertar si available < 500
3. [WALLET] get_wallet_overview(user_id) → verificar pending_amount
4. [PENDING] get_transaction_history(status="escrow_released", not_withdrawn=true)
5. [THRESHOLD] Si pending_amount >= $100:
              request_withdrawal(amount, method="stripe_connect")
6. [NOTIFY] Webhook finance.withdrawal_requested → contabilidad
```

---

## 8. SDK TypeScript (Referencia)

```typescript
// kreoon-mcp-sdk/index.ts
export class KreoonMCPClient {
  private baseUrl = "https://api.kreoon.com/mcp/v1";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async call<T>(tool: string, params: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${tool}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new KreoonAPIError(data.error, data.code, res.status);
    }

    return data as T;
  }

  // Scripts
  async generateScript(params: GenerateScriptParams) {
    return this.call<ScriptResult>("generate_script", params);
  }

  async improveScript(params: ImproveScriptParams) {
    return this.call<ScriptResult>("improve_script", params);
  }

  // ADN
  async startADNResearch(params: ADNResearchParams) {
    return this.call<{ research_id: string; estimated_time_seconds: number }>(
      "start_adn_research", params
    );
  }

  async getADNStatus(researchId: string) {
    return this.call<ADNStatusResult>("get_adn_status", { research_id: researchId });
  }

  async waitForADN(researchId: string, timeoutMs = 600000): Promise<ADNStatusResult> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const status = await this.getADNStatus(researchId);
      if (status.status === "completed" || status.status === "failed") {
        return status;
      }
      await new Promise(r => setTimeout(r, 10000)); // Poll cada 10s
    }
    throw new Error(`ADN research timeout after ${timeoutMs}ms`);
  }

  // Creators
  async searchCreators(params: SearchCreatorsParams) {
    return this.call<CreatorSearchResult>("search_creators", params);
  }

  async scoreCreator(params: ScoreCreatorParams) {
    return this.call<CreatorScoreResult>("score_creator_for_campaign", params);
  }

  // Finance
  async getWalletOverview(userId: string) {
    return this.call<WalletOverview>("get_wallet_overview", { user_id: userId });
  }

  async checkTokenBalance(orgId: string) {
    return this.call<TokenBalance>("check_token_balance", { organization_id: orgId });
  }
}

export class KreoonAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "KreoonAPIError";
  }
}
```

---

## 9. Manejo de Errores y Retry

### 9.1 Códigos de Error

| Código HTTP | Error Code | Acción recomendada |
|-------------|------------|--------------------|
| 400 | `INVALID_PARAMS` | Corregir payload, no reintentar |
| 401 | `INVALID_API_KEY` | Verificar key, no reintentar |
| 401 | `KEY_EXPIRED` | Renovar key, no reintentar |
| 403 | `INSUFFICIENT_SCOPE` | Solicitar scope adicional |
| 402 | `INSUFFICIENT_AI_TOKENS` | Recargar tokens o esperar renovación |
| 404 | `RESOURCE_NOT_FOUND` | Verificar IDs, no reintentar |
| 409 | `RESEARCH_ALREADY_RUNNING` | Usar `get_adn_status` para el research existente |
| 429 | `RATE_LIMIT_EXCEEDED` | Esperar `Retry-After` header |
| 500 | `INTERNAL_ERROR` | Reintentar con backoff exponencial |
| 503 | `SERVICE_UNAVAILABLE` | Reintentar en 60 segundos |

### 9.2 Retry Logic Universal

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options = { maxAttempts: 3, baseDelayMs: 1000 }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // No reintentar errores del cliente
      if (error instanceof KreoonAPIError) {
        if ([400, 401, 402, 403, 404].includes(error.statusCode)) {
          throw error;
        }
      }

      if (attempt < options.maxAttempts) {
        const delay = options.baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError!;
}

// Uso:
const script = await withRetry(() =>
  kreoon.generateScript({ product_id: "abc", platform: "tiktok" })
);
```

---

## 10. Webhooks: Recepción y Verificación

### 10.1 Servidor de Webhooks (Express/Node.js)

```typescript
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.raw({ type: "application/json" }));

function verifyKreoonSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

app.post("/webhooks/kreoon", (req, res) => {
  const signature = req.headers["x-kreoon-signature"] as string;
  const secret = process.env.KREOON_WEBHOOK_SECRET!;

  if (!verifyKreoonSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body.toString());
  res.status(200).json({ received: true }); // Responder antes de procesar

  // Procesar asíncronamente
  handleKreoonEvent(event).catch(console.error);
});

async function handleKreoonEvent(event: KreoonWebhookEvent) {
  switch (event.event_type) {
    case "adn.completed":
      await onADNCompleted(event.data);
      break;
    case "script.generated":
      await onScriptGenerated(event.data);
      break;
    case "finance.withdrawal_requested":
      await onWithdrawalRequested(event.data);
      break;
    case "creator.profile_updated":
      await onProfileUpdated(event.data);
      break;
  }
}
```

### 10.2 Servidor de Webhooks (n8n Webhook Node)

```
Trigger: Webhook
  Path: /kreoon-events
  Method: POST
  Authentication: None (verificar manualmente)
     │
     ▼
Function: Verificar firma HMAC
  const rawBody = $binary.data.toString();
  const signature = $headers['x-kreoon-signature'];
  const expected = 'sha256=' + require('crypto')
    .createHmac('sha256', process.env.KREOON_SECRET)
    .update(rawBody).digest('hex');
  
  if (signature !== expected) throw new Error('Invalid signature');
  return [$json];
     │
     ▼
Switch: event_type
  ├── adn.completed → [Continuar workflow ADN]
  ├── script.generated → [Notificar Slack]
  └── finance.* → [Actualizar contabilidad]
```

---

## 11. Ambientes

| Ambiente | URL Base | API Key Prefix |
|----------|----------|----------------|
| Producción | `https://api.kreoon.com/mcp/v1` | `sk-kreeon-` |
| Staging | `https://staging.kreoon.com/mcp/v1` | `sk-kreeon-staging-` |
| Local Dev | `http://localhost:54321/functions/v1` | `sk-kreeon-test-` |

### Variables de Entorno Recomendadas

```env
# .env (nunca commitear)
KREEON_API_KEY=sk-kreeon-a1b2c3d4-...
KREEON_WEBHOOK_SECRET=whsec_...
KREEON_BASE_URL=https://api.kreeon.com/mcp/v1
KREEON_ORG_ID=uuid-de-tu-organizacion
```

---

## 12. Límites de Payload

| Campo | Límite |
|-------|--------|
| Request body | 1 MB máximo |
| Array de skills | 10 elementos |
| Array de posts en batch | 50 elementos |
| Texto de script generado | 5000 caracteres |
| Query de búsqueda | 500 caracteres |
| Tags/filtros en búsqueda | 20 elementos |

---

*Para soporte técnico de integraciones: dev@kreoon.com*
