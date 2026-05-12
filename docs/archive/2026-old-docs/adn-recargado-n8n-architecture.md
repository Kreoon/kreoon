# ADN Recargado v3 - Arquitectura n8n

## Resumen

Migrar el backend de ADN Recargado v3 de Supabase Edge Functions a n8n para:
- Eliminar el limite de 150s de Edge Functions
- Orquestacion visual de los 22 pasos
- Reintentos automaticos por paso
- Mejor debugging y monitoreo

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  - Llama POST /adn-start                                                    │
│  - Polling cada 3s a /adn-status                                            │
│  - Muestra progreso en tiempo real                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTION (Punto de entrada)                 │
│                           adn-orchestrator-lite                              │
│                                                                              │
│  1. Verificar JWT + permisos org                                            │
│  2. Verificar tokens (2400 minimo)                                          │
│  3. Crear sesion en adn_research_sessions                                   │
│  4. Reservar tokens atomicamente                                            │
│  5. Llamar webhook n8n (fire-and-forget)                                    │
│  6. Retornar session_id                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           n8n WORKFLOW PRINCIPAL                             │
│                        "ADN Recargado v3 - Research"                         │
│                                                                              │
│  ┌─────────────┐    ┌─────────────────┐    ┌────────────────────────────┐  │
│  │  Webhook    │───▶│ Build Context   │───▶│  Intelligence Gathering    │  │
│  │  Trigger    │    │ (Cargar datos)  │    │  (Paralelo opcional)       │  │
│  └─────────────┘    └─────────────────┘    └────────────────────────────┘  │
│                                                        │                     │
│                                                        ▼                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    LOOP: 22 RESEARCH STEPS                            │  │
│  │                                                                        │  │
│  │   ┌─────────────────────────────────────────────────────────────┐    │  │
│  │   │  Para cada paso (1-22):                                      │    │  │
│  │   │                                                               │    │  │
│  │   │   1. Update Status → "running"                               │    │  │
│  │   │   2. Build Prompt (con contexto acumulado)                   │    │  │
│  │   │   3. Call Perplexity (web search)                            │    │  │
│  │   │   4. Call Gemini (formatear JSON)                            │    │  │
│  │   │   5. Parse JSON                                              │    │  │
│  │   │   6. Save to products.full_research_v3                       │    │  │
│  │   │   7. Update Status → "completed"                             │    │  │
│  │   │   8. Agregar resultado al contexto para siguiente paso       │    │  │
│  │   │                                                               │    │  │
│  │   │   [Si error: retry 2x, luego marcar error y continuar]       │    │  │
│  │   └─────────────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                        │                     │
│                                                        ▼                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────────┐      │
│  │ Update Session  │───▶│ Notify Frontend │───▶│      END           │      │
│  │ status=complete │    │ (webhook opt)   │    │                    │      │
│  └─────────────────┘    └─────────────────┘    └────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes Detallados

### 1. Edge Function: `adn-orchestrator-lite`

Simplificada - solo valida y dispara el workflow:

```typescript
// Mantiene:
// - Verificacion JWT
// - Verificacion tokens
// - Creacion de sesion
// - Reserva de tokens

// Cambia:
// - En lugar de llamar a adn-research-v3, llama al webhook de n8n
const webhookUrl = Deno.env.get("N8N_ADN_WEBHOOK_URL");
await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    session_id: sessionId,
    product_id,
    product_dna_id,
    client_dna_id,
    organization_id,
    config,
  }),
});
```

### 2. n8n Workflow: Nodos Principales

#### Nodo 1: Webhook Trigger
```json
{
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "adn-research-v3",
    "method": "POST",
    "authentication": "headerAuth",
    "headerAuth": {
      "name": "x-n8n-secret",
      "value": "={{ $env.N8N_WEBHOOK_SECRET }}"
    }
  }
}
```

#### Nodo 2: Build Master Context
```json
{
  "type": "n8n-nodes-base.supabase",
  "parameters": {
    "operation": "getAll",
    "table": "product_dna",
    "filters": [
      { "field": "id", "value": "={{ $json.product_dna_id }}" }
    ]
  }
}
```

#### Nodo 3: Update Session Status
```json
{
  "type": "n8n-nodes-base.supabase",
  "parameters": {
    "operation": "update",
    "table": "adn_research_sessions",
    "id": "={{ $json.session_id }}",
    "fieldsToUpdate": {
      "status": "researching",
      "current_step": "={{ $json.step_number }}"
    }
  }
}
```

#### Nodo 4: Research Step (Sub-workflow o Loop)

Para cada uno de los 22 pasos:

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP EXECUTOR (repetir 22 veces o usar Loop)                    │
│                                                                   │
│  ┌─────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────┐ │
│  │ Build   │──▶│ Perplexity  │──▶│   Gemini    │──▶│  Parse   │ │
│  │ Prompt  │   │ HTTP Request│   │ HTTP Request│   │  JSON    │ │
│  └─────────┘   └─────────────┘   └─────────────┘   └──────────┘ │
│                                                          │        │
│                                                          ▼        │
│  ┌─────────────────┐   ┌──────────────────────────────────────┐ │
│  │ Update Progress │◀──│ Save to products.full_research_v3   │ │
│  │ in Session      │   │ (Supabase Update)                    │ │
│  └─────────────────┘   └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

#### Nodo 5: HTTP Request - Perplexity

```json
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://api.perplexity.ai/chat/completions",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "headers": {
      "Authorization": "Bearer {{ $credentials.perplexityApiKey }}"
    },
    "body": {
      "model": "sonar-pro",
      "messages": [
        { "role": "system", "content": "={{ $json.systemPrompt }}" },
        { "role": "user", "content": "={{ $json.userPrompt }}" }
      ],
      "max_tokens": 4000,
      "temperature": 0.3
    },
    "options": {
      "timeout": 120000,
      "retry": {
        "maxTries": 3,
        "waitBetweenTries": 5000
      }
    }
  }
}
```

#### Nodo 6: HTTP Request - Gemini

```json
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    "qs": {
      "key": "={{ $credentials.geminiApiKey }}"
    },
    "body": {
      "contents": [{
        "role": "user",
        "parts": [{
          "text": "={{ $json.systemPrompt + '\\n\\n' + $json.perplexityData + '\\n\\nFormatea como JSON:' }}"
        }]
      }],
      "generationConfig": {
        "temperature": 0.3,
        "maxOutputTokens": 4000
      }
    },
    "options": {
      "timeout": 90000,
      "retry": {
        "maxTries": 2,
        "waitBetweenTries": 3000
      }
    }
  }
}
```

---

## Configuracion de los 22 Pasos

Crear un nodo "Code" o "Set" con la configuracion de cada paso:

```javascript
const RESEARCH_STEPS = [
  { number: 1,  key: "market_overview",    name: "Panorama de Mercado",     webSearch: true  },
  { number: 2,  key: "competition",        name: "Analisis Competencia",    webSearch: true  },
  { number: 3,  key: "jtbd",               name: "Jobs To Be Done",         webSearch: false },
  { number: 4,  key: "avatars",            name: "Avatares Ideales",        webSearch: false },
  { number: 5,  key: "psychology",         name: "Psicologia Profunda",     webSearch: false },
  { number: 6,  key: "neuromarketing",     name: "Neuromarketing",          webSearch: false },
  { number: 7,  key: "positioning",        name: "Posicionamiento",         webSearch: false },
  { number: 8,  key: "copy_angles",        name: "Angulos de Copy",         webSearch: false },
  { number: 9,  key: "offer",              name: "Oferta Irresistible",     webSearch: false },
  { number: 11, key: "calendar",           name: "Calendario 30 Dias",      webSearch: false },
  { number: 12, key: "lead_magnets",       name: "Lead Magnets",            webSearch: false },
  { number: 13, key: "social_media",       name: "Redes Sociales",          webSearch: true  },
  { number: 14, key: "meta_ads",           name: "Meta Ads",                webSearch: true  },
  { number: 15, key: "tiktok_ads",         name: "TikTok Ads",              webSearch: true  },
  { number: 16, key: "google_ads",         name: "Google Ads",              webSearch: true  },
  { number: 17, key: "email_marketing",    name: "Email Marketing",         webSearch: false },
  { number: 18, key: "landing_pages",      name: "Landing Pages",           webSearch: false },
  { number: 19, key: "launch_strategy",    name: "Estrategia Lanzamiento",  webSearch: false },
  { number: 20, key: "kpis",               name: "KPIs y Metricas",         webSearch: false },
  { number: 21, key: "organic_content",    name: "Contenido Organico",      webSearch: false },
  { number: 22, key: "executive_summary",  name: "Resumen Ejecutivo",       webSearch: false },
];
```

---

## Prompts por Paso

Los prompts se pueden almacenar en:

### Opcion A: Nodos "Set" individuales
- Un nodo Set por cada paso con el prompt hardcodeado
- Mas visual pero mas nodos

### Opcion B: Supabase Table `adn_prompts`
```sql
CREATE TABLE adn_prompts (
  step_key TEXT PRIMARY KEY,
  system_prompt TEXT,
  user_prompt_template TEXT,
  output_schema JSONB
);
```
- n8n carga el prompt desde DB
- Facil de editar sin tocar el workflow

### Opcion C: Archivo JSON en GitHub
- Cargar via HTTP Request al inicio
- Versionado con el codigo

**Recomendacion:** Opcion B (Supabase) para facilidad de edicion.

---

## Manejo de Errores

### Nivel Paso Individual
```
┌─────────────┐
│   Try       │
│  (AI Call)  │
└──────┬──────┘
       │
       ▼
┌──────────────┐     ┌─────────────┐
│  Success?    │─NO─▶│   Retry     │
└──────┬───────┘     │  (max 2x)   │
       │             └──────┬──────┘
      YES                   │
       │                    ▼
       │             ┌─────────────┐
       │             │ Still Fail? │
       │             └──────┬──────┘
       │                    │
       ▼                   YES
┌──────────────┐            │
│ Save Result  │            ▼
└──────────────┘     ┌─────────────────┐
                     │ Save Error JSON │
                     │ Continue Next   │
                     └─────────────────┘
```

### Nivel Workflow
- Si falla critico (DB, auth): Marcar sesion como "error"
- Enviar notificacion (Slack/Email opcional)

---

## Guardar Resultados

Nodo Supabase para guardar cada tab:

```javascript
// Funcion que se ejecuta despues de cada paso
const currentResult = $json.parsedResult;
const tabKey = $json.step.key;
const tokensUsed = $json.tokensUsed;

// Cargar full_research_v3 actual
const { data: product } = await supabase
  .from('products')
  .select('full_research_v3')
  .eq('id', productId)
  .single();

const current = product?.full_research_v3 || {
  version: 3,
  generated_at: new Date().toISOString(),
  tabs: {},
  metadata: { total_tokens: 0, completed_tabs: 0 },
};

// Agregar nueva tab
current.tabs[tabKey] = {
  ...currentResult,
  _generated_at: new Date().toISOString(),
  _tokens_used: tokensUsed,
};

current.metadata.total_tokens += tokensUsed;
current.metadata.completed_tabs = Object.keys(current.tabs).length;

// Guardar
await supabase
  .from('products')
  .update({ full_research_v3: current })
  .eq('id', productId);
```

---

## Variables de Entorno n8n

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# AI Providers
PERPLEXITY_API_KEY=pplx-xxx
GEMINI_API_KEY=AIza...

# Seguridad
N8N_WEBHOOK_SECRET=random-secret-string
```

---

## Ventajas de Esta Arquitectura

| Aspecto | Antes (Edge Functions) | Despues (n8n) |
|---------|------------------------|---------------|
| Timeout | 150s (workaround) | Sin limite |
| Debugging | Logs texto | Visual + historico |
| Reintentos | Manual | Automatico |
| Modificar prompts | Deploy codigo | Editar en DB/UI |
| Paralelizacion | Complejo | Drag & drop |
| Monitoreo | Logs Supabase | Dashboard n8n |
| Costo pasos | ~$0.002/invocacion | Incluido en hosting |

---

## Plan de Migracion

### Fase 1: Preparacion (1 dia)
- [ ] Crear tabla `adn_prompts` con todos los prompts
- [ ] Configurar credenciales en n8n
- [ ] Crear webhook de prueba

### Fase 2: Workflow Base (2-3 dias)
- [ ] Nodo webhook trigger
- [ ] Nodo cargar contexto
- [ ] Nodo update session status
- [ ] Loop de 22 pasos (estructura)

### Fase 3: Integracion AI (2 dias)
- [ ] Nodo Perplexity
- [ ] Nodo Gemini
- [ ] Nodo parse JSON
- [ ] Manejo de errores

### Fase 4: Persistencia (1 dia)
- [ ] Guardar resultados en products.full_research_v3
- [ ] Update progress en adn_research_sessions
- [ ] Notificacion final

### Fase 5: Testing (2 dias)
- [ ] Test completo con producto real
- [ ] Verificar frontend polling
- [ ] Verificar regeneracion de tabs
- [ ] Load testing (2-3 concurrentes)

### Fase 6: Cutover (1 dia)
- [ ] Actualizar adn-orchestrator para usar webhook n8n
- [ ] Deploy a produccion
- [ ] Monitorear primeras ejecuciones

---

## Consideraciones Adicionales

### Concurrencia
- n8n maneja bien multiples workflows simultaneos
- Considerar queue si hay mas de 5 concurrentes

### Costos
- n8n Cloud: ~$20-50/mes para este volumen
- Self-hosted: Costo servidor (~$20-40/mes VPS)

### Backup
- Exportar workflow como JSON
- Guardar en repositorio Git

### Regenerar Tab Individual
- Crear segundo workflow "ADN Regen Single Tab"
- Recibe: session_id, tab_key
- Ejecuta solo ese paso

---

## Siguiente Paso

1. Configurar n8n (cloud o self-hosted)
2. Crear workflow vacio con webhook
3. Probar conexion desde Edge Function
4. Implementar paso por paso

Listo para empezar?
