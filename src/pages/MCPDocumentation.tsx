import { useState } from "react";
import { ArrowLeft, Copy, Check, Zap, Shield, Code2, Cpu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Markdown copiable para entrenar IAs ─────────────────────────────────────

const TRAINING_MD = `# Kreoon MCP Server — Documentación Completa

## ¿Qué es?

El Kreoon MCP Server es un servidor que implementa el Model Context Protocol (MCP) de Anthropic.
Permite a cualquier agente de IA (Claude, ChatGPT con plugins, Gemini, etc.) controlar operativamente
la plataforma Kreoon: crear campañas, gestionar creadores, aprobar guiones, manejar el content board
y administrar el marketplace.

**Endpoint principal:** https://mcp.kreoon.com
**Versión:** v3.0.0
**Herramientas disponibles:** 29

---

## Autenticación

Todas las llamadas requieren una API Key de Kreoon en el header:

\`\`\`
Authorization: Bearer sk-kreoon-{tu-api-key}
\`\`\`

Las keys se generan desde **Settings → MCP** en la app de Kreoon (https://app.kreoon.com/settings).

---

## Métodos de conexión

### 1. Claude Desktop (stdio)

Instala el cliente MCP local:
\`\`\`bash
npm install -g kreoon-mcp-client
\`\`\`

Agrega en \`claude_desktop_config.json\`:
\`\`\`json
{
  "mcpServers": {
    "kreoon": {
      "command": "kreoon-mcp-client",
      "env": {
        "KREOON_API_KEY": "sk-kreoon-tu-key-aqui"
      }
    }
  }
}
\`\`\`

### 2. Claude.ai Web (OAuth)

En Claude.ai → Settings → Connectors → Add custom connector:
- URL del servidor: \`https://mcp.kreoon.com\`
- Claude.ai detecta OAuth automáticamente y te redirige a un formulario de autorización.

### 3. REST API directo

\`\`\`bash
# Listar herramientas disponibles
curl -H "Authorization: Bearer sk-kreoon-..." https://mcp.kreoon.com/v1/tools

# Ejecutar una herramienta
curl -X POST -H "Authorization: Bearer sk-kreoon-..." \\
  -H "Content-Type: application/json" \\
  -d '{"product_id": "uuid-del-producto", "platform": "tiktok"}' \\
  https://mcp.kreoon.com/v1/tools/generate_script
\`\`\`

---

## Scopes de autorización

| Scope | Acceso |
|-------|--------|
| \`scripts:read\` | Leer guiones existentes |
| \`scripts:write\` | Generar y mejorar guiones con IA |
| \`adn:read\` | Ver estado de investigaciones ADN |
| \`adn:write\` | Iniciar investigación de ADN del producto |
| \`creators:read\` | Buscar y calificar creadores |
| \`profiles:write\` | Optimizar perfil del creador con IA |
| \`wallet:read\` | Ver saldo y transacciones |
| \`wallet:write\` | Solicitar retiros |
| \`social:write\` | Publicar en redes sociales |
| \`campaigns:read\` | Ver campañas, proyectos, contenido, clientes, miembros |
| \`campaigns:write\` | Crear/modificar campañas, proyectos, contenido, asignar equipo |

---

## Herramientas (29 en total)

### Scripts (scope: scripts:write)

**generate_script** — Genera guiones UGC optimizados para una plataforma usando el ADN del producto.
- \`product_id\` (string, required): UUID del producto
- \`platform\` (enum, required): "instagram_reels" | "tiktok" | "youtube_shorts"
- \`style\` (enum): "viral" | "professional" | "funny" | "educational"
- \`hooks_count\` (number): 1-5 variantes de hook

**improve_script** — Mejora un guión existente basado en feedback.
- \`script_id\` (string, required): UUID del guión
- \`feedback\` (string, required): Instrucciones de mejora
- \`focus\` (enum): "hook" | "cta" | "body" | "all"

---

### ADN del Producto (scope: adn:write / adn:read)

**start_adn_research** — Inicia análisis profundo de 22 pasos del producto (mercado, competencia, audiencia).
- \`product_id\` (string, required): UUID del producto

**get_adn_status** — Obtiene progreso y resultados de una investigación ADN.
- \`research_id\` (string, required): UUID retornado por start_adn_research

---

### Creadores (scope: creators:read)

**search_creators** — Busca creadores por categoría, ubicación, seguidores, engagement.
- \`category\` (string): beauty, fashion, fitness, tech, etc.
- \`location\` (string): País ISO 2 o ciudad
- \`min_followers\` / \`max_followers\` (number)
- \`min_engagement_rate\` (number): 0.0-1.0
- \`limit\` (number): máx 100

**score_creator_for_campaign** — Califica creador para campaña con score 0-100.
- \`creator_id\` (string, required)
- \`campaign_id\` (string, required)
- \`campaign_brief\` (string): contexto adicional

---

### Perfiles (scope: profiles:write)

**optimize_creator_profile** — Optimiza bio, especialidades y engagement del perfil con IA.
- \`focus_area\` (enum): "bio" | "specialties" | "engagement" | "all"

---

### Wallet (scope: wallet:read / wallet:write)

**get_wallet_overview** — Saldo disponible, pendiente, en reserva y últimas transacciones.
- \`include_history\` (boolean): incluir historial
- \`history_limit\` (number): máx 50

**request_withdrawal** — Solicita retiro de fondos (mínimo $10 USD).
- \`amount\` (number, required): monto en USD
- \`method\` (enum, required): "stripe_connect" | "mercury" | "paypal" | "manual"

---

### Social (scope: social:write)

**publish_to_social** — Publica o programa en Instagram, TikTok, YouTube, Twitter, LinkedIn.
- \`content\` (string, required): caption (máx 2200 chars)
- \`platforms\` (array, required): lista de plataformas
- \`media_url\` (string): URL del video/imagen
- \`scheduled_at\` (string): ISO 8601 para programar
- \`hashtags\` (array): sin # (máx 30)

---

### Content Board / Operaciones (scope: campaigns:read / campaigns:write)

**list_content_items** — Lista ítems de contenido con filtros por estado, campaña, cliente, creador.
- Filtros: \`campaign_id\`, \`client_id\`, \`status\`, \`creator_id\`, \`editor_id\`, \`limit\`
- Estados: draft | pending_script | script_approved | in_production | delivered | approved | published | paid

**get_content_item** — Detalles completos de un ítem: estado, equipo, pagos, scripts, deliverables.
- \`content_id\` (string, required)

**create_content_item** — Crea un nuevo ítem de contenido con brief, equipo y presupuesto.
- \`campaign_id\`, \`client_id\`, \`product_id\`, \`brief\`, \`platform\` (required)
- \`creator_id\`, \`editor_id\`, \`deadline\`, \`creator_payment\`, \`editor_payment\` (optional)

**assign_content_team** — Asigna creador y/o editor a un contenido.
- \`content_id\` (required), \`creator_id\`, \`editor_id\`, \`notify_team\`

**update_content_status** — Mueve un ítem por el pipeline de estados.
- \`content_id\` (required), \`new_status\` (required), \`notes\`

**approve_content_script** — Aprueba el script y lo marca como ready_for_creation.
- \`content_id\` (required), \`notes\`

**record_content_delivery** — Registra entrega con URL de video y assets.
- \`content_id\`, \`video_url\` (required), \`additional_assets\`, \`notes\`

**mark_content_payment** — Marca contenido como pagado al creador y editor.
- \`content_id\` (required), \`creator_payment_method\`, \`editor_payment_method\`, \`notes\`

---

### Gestión de Organización (scope: campaigns:read / campaigns:write)

**get_org_dashboard** — Dashboard completo: contenido por estado, vencidos, pagos pendientes, marketplace.
- Sin parámetros requeridos

**list_org_members** — Miembros activos con rol, nombre y UUID. Usar antes de asignar equipo.
- \`role\` (string): admin | creator | editor | strategist | trafficker | client | team_leader
- \`include_clients\` (boolean)

**list_clients** — Clientes/marcas de la organización con sus UUIDs.
- \`search\` (string), \`is_vip\` (boolean), \`limit\`

**create_client** — Crea un nuevo cliente o marca en la organización.
- \`name\` (required), \`contact_email\`, \`category\`, \`website\`, \`instagram\`, \`tiktok\`, \`country\`

---

### Campañas Marketplace (scope: campaigns:read / campaigns:write)

**list_marketplace_campaigns** — Lista campañas con filtros por estado y producto.
- \`status\`: draft | active | closed | completed

**create_marketplace_campaign** — Crea campaña donde creadores pueden ofertar.
- \`title\`, \`description\`, \`product_id\`, \`platforms\`, \`budget\` (required)
- \`application_deadline\`, \`delivery_deadline\`, \`creator_requirements\` (optional)

**manage_campaign_application** — Aprueba, rechaza o retiene aplicación de un creador.
- \`campaign_id\`, \`creator_id\`, \`action\` (approve | reject | hold), \`notes\`

---

### Proyectos Marketplace (scope: campaigns:read / campaigns:write)

**list_marketplace_projects** — Lista proyectos con filtros.
- \`status\`: pending | active | in_review | completed | cancelled

**create_marketplace_project** — Crea proyecto individual de marketplace.
- \`title\`, \`description\`, \`product_id\`, \`platform\`, \`budget\` (required)

**assign_editor_to_project** — Asigna editor a un proyecto.
- \`project_id\`, \`editor_id\` (required)

**update_project_status** — Actualiza estado del proyecto en el pipeline.
- \`project_id\`, \`new_status\` (required)

---

## Endpoints técnicos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| \`/health\` | GET | Estado del servidor y versión |
| \`/v1/tools\` | GET | Lista de herramientas disponibles (con auth) |
| \`/v1/tools/{name}\` | POST | Ejecutar herramienta (con auth) |
| \`/mcp\` | POST | MCP Streamable HTTP (JSON-RPC 2.0) |
| \`/.well-known/oauth-authorization-server\` | GET | Metadatos OAuth 2.0 |
| \`/oauth/authorize\` | GET/POST | Flujo de autorización OAuth |
| \`/oauth/token\` | POST | Intercambio de code por access_token |

---

## Flujo de trabajo recomendado

1. **Obtener contexto:** \`get_org_dashboard\` → estado general de la organización
2. **Obtener miembros:** \`list_org_members\` → UUIDs de creadores y editores disponibles
3. **Obtener clientes:** \`list_clients\` → UUIDs de clientes
4. **Crear contenido:** \`create_content_item\` con todos los UUIDs
5. **Asignar equipo:** \`assign_content_team\`
6. **Generar guión:** \`generate_script\` con el product_id
7. **Aprobar guión:** \`approve_content_script\`
8. **Registrar entrega:** \`record_content_delivery\`
9. **Cerrar pago:** \`mark_content_payment\`
`;

// ─── Componente CopyableBlock ─────────────────────────────────────────────────

function CopyableBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-[#0d0d18] border border-[#2a2a3a] text-[#c9d1d9] text-xs leading-relaxed p-5 rounded-xl overflow-x-auto max-h-80 font-mono whitespace-pre-wrap">
        {content}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#1e1e2e] hover:bg-[#2a2a3a] border border-[#3a3a4a] text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-all"
      >
        {copied ? (
          <><Check className="w-3 h-3 text-green-400" /> Copiado</>
        ) : (
          <><Copy className="w-3 h-3" /> Copiar</>
        )}
      </button>
    </div>
  );
}

// ─── Datos de herramientas por dominio ────────────────────────────────────────

const TOOL_GROUPS = [
  {
    name: "Scripts",
    count: 2,
    tools: [
      { name: "generate_script", desc: "Genera guiones UGC con múltiples variantes de hook y CTA", scope: "scripts:write" },
      { name: "improve_script", desc: "Mejora un guión existente basado en feedback del cliente", scope: "scripts:write" },
    ],
  },
  {
    name: "ADN del Producto",
    count: 2,
    tools: [
      { name: "start_adn_research", desc: "Inicia análisis profundo de 22 pasos: mercado, competencia, audiencia", scope: "adn:write" },
      { name: "get_adn_status", desc: "Progreso y resultados de una investigación ADN en curso", scope: "adn:read" },
    ],
  },
  {
    name: "Creadores",
    count: 2,
    tools: [
      { name: "search_creators", desc: "Busca creadores por categoría, ubicación, seguidores y engagement", scope: "creators:read" },
      { name: "score_creator_for_campaign", desc: "Califica creador para campaña específica con score 0-100", scope: "creators:read" },
    ],
  },
  {
    name: "Perfiles",
    count: 1,
    tools: [
      { name: "optimize_creator_profile", desc: "Optimiza bio, especialidades y engagement del perfil con IA", scope: "profiles:write" },
    ],
  },
  {
    name: "Wallet",
    count: 2,
    tools: [
      { name: "get_wallet_overview", desc: "Saldo disponible, pendiente, en reserva y últimas transacciones", scope: "wallet:read" },
      { name: "request_withdrawal", desc: "Solicita retiro de fondos (mínimo $10 USD)", scope: "wallet:write" },
    ],
  },
  {
    name: "Social Media",
    count: 1,
    tools: [
      { name: "publish_to_social", desc: "Publica o programa en Instagram, TikTok, YouTube, Twitter, LinkedIn", scope: "social:write" },
    ],
  },
  {
    name: "Content Board",
    count: 8,
    tools: [
      { name: "list_content_items", desc: "Lista ítems de contenido con filtros por estado, cliente y equipo", scope: "campaigns:read" },
      { name: "get_content_item", desc: "Detalles completos: estado, equipo, pagos, scripts y deliverables", scope: "campaigns:read" },
      { name: "create_content_item", desc: "Crea nuevo ítem con brief, equipo asignado y presupuesto", scope: "campaigns:write" },
      { name: "assign_content_team", desc: "Asigna creador y/o editor a un ítem de contenido", scope: "campaigns:write" },
      { name: "update_content_status", desc: "Mueve el ítem por el pipeline de estados", scope: "campaigns:write" },
      { name: "approve_content_script", desc: "Aprueba el script y lo marca como ready_for_creation", scope: "campaigns:write" },
      { name: "record_content_delivery", desc: "Registra entrega con URL de video y assets adicionales", scope: "campaigns:write" },
      { name: "mark_content_payment", desc: "Marca contenido como pagado al creador y editor", scope: "campaigns:write" },
    ],
  },
  {
    name: "Organización",
    count: 4,
    tools: [
      { name: "get_org_dashboard", desc: "Dashboard completo: estados, vencidos, pagos pendientes, marketplace", scope: "campaigns:read" },
      { name: "list_org_members", desc: "Miembros activos con rol y UUID para asignaciones", scope: "campaigns:read" },
      { name: "list_clients", desc: "Clientes y marcas de la organización con UUIDs", scope: "campaigns:read" },
      { name: "create_client", desc: "Crea nuevo cliente o marca en la organización", scope: "campaigns:write" },
    ],
  },
  {
    name: "Campañas Marketplace",
    count: 3,
    tools: [
      { name: "list_marketplace_campaigns", desc: "Lista campañas con filtros por estado y producto", scope: "campaigns:read" },
      { name: "create_marketplace_campaign", desc: "Crea campaña donde creadores pueden ofertar", scope: "campaigns:write" },
      { name: "manage_campaign_application", desc: "Aprueba, rechaza o retiene aplicación de un creador", scope: "campaigns:write" },
    ],
  },
  {
    name: "Proyectos Marketplace",
    count: 4,
    tools: [
      { name: "list_marketplace_projects", desc: "Lista proyectos con filtros por estado y producto", scope: "campaigns:read" },
      { name: "create_marketplace_project", desc: "Crea proyecto individual de marketplace", scope: "campaigns:write" },
      { name: "assign_editor_to_project", desc: "Asigna editor a un proyecto específico", scope: "campaigns:write" },
      { name: "update_project_status", desc: "Actualiza estado del proyecto en el pipeline", scope: "campaigns:write" },
    ],
  },
];

const SCOPES = [
  { scope: "scripts:write", desc: "Generar y mejorar guiones con IA" },
  { scope: "adn:read", desc: "Ver estado de investigaciones ADN" },
  { scope: "adn:write", desc: "Iniciar análisis ADN del producto" },
  { scope: "creators:read", desc: "Buscar y calificar creadores" },
  { scope: "profiles:write", desc: "Optimizar perfil del creador con IA" },
  { scope: "wallet:read", desc: "Ver saldo y transacciones" },
  { scope: "wallet:write", desc: "Solicitar retiros de fondos" },
  { scope: "social:write", desc: "Publicar en redes sociales" },
  { scope: "campaigns:read", desc: "Ver campañas, proyectos, contenido, clientes y miembros" },
  { scope: "campaigns:write", desc: "Crear y modificar campañas, proyectos, contenido y asignaciones" },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MCPDocumentation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200 font-sans">

      {/* Header sticky */}
      <div className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur border-b border-[#1e1e2e] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold tracking-tight">KREOON</span>
          <span className="text-purple-400 font-bold">MCP</span>
        </div>
        <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-300 bg-purple-500/10">
          v3.0.0
        </Badge>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">

        {/* Hero */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full mb-2">
            <Zap className="w-3 h-3" />
            Model Context Protocol — Production Ready
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Kreoon MCP Server
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Conecta cualquier agente de IA con Kreoon. Control operativo completo: guiones, creadores, campañas, content board y marketplace.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">29 herramientas</span>
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">OAuth 2.0</span>
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">Claude Desktop</span>
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">Claude.ai Web</span>
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">REST API</span>
          </div>
        </section>

        {/* ¿Qué es? */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-purple-400" />
            ¿Qué es el MCP de Kreoon?
          </h2>
          <p className="text-gray-400 leading-relaxed">
            MCP (Model Context Protocol) es el estándar abierto de Anthropic para conectar agentes de IA con herramientas externas. El servidor MCP de Kreoon expone el control operativo completo de la plataforma como herramientas que cualquier IA puede invocar: crear campañas, buscar creadores, generar guiones, aprobar scripts, registrar entregas y gestionar pagos, todo desde una conversación.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <Zap className="w-4 h-4" />, title: "Acceso completo", desc: "29 herramientas que cubren todo el flujo operativo de una agencia UGC" },
              { icon: <Shield className="w-4 h-4" />, title: "Multi-tenant seguro", desc: "Cada API key está vinculada a una organización. RLS en toda la base de datos." },
              { icon: <Code2 className="w-4 h-4" />, title: "Estándar abierto", desc: "Compatible con Claude, ChatGPT, Gemini y cualquier agente que soporte MCP o REST." },
            ].map((item) => (
              <div key={item.title} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4 space-y-2">
                <div className="text-purple-400">{item.icon}</div>
                <p className="text-white text-sm font-semibold">{item.title}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo conectar */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Code2 className="w-6 h-6 text-purple-400" />
            Cómo conectar
          </h2>

          {/* Claude Desktop */}
          <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-300 text-xs font-mono px-2 py-0.5 rounded">01</span>
              <h3 className="text-white font-semibold">Claude Desktop</h3>
            </div>
            <p className="text-gray-400 text-sm">Instala el cliente MCP y agrégalo a la configuración de Claude Desktop:</p>
            <CopyableBlock content={`npm install -g kreoon-mcp-client`} />
            <p className="text-gray-500 text-xs mt-1">Luego en <code className="bg-[#1e1e2e] px-1 py-0.5 rounded text-purple-300">claude_desktop_config.json</code>:</p>
            <CopyableBlock content={`{
  "mcpServers": {
    "kreoon": {
      "command": "kreoon-mcp-client",
      "env": {
        "KREOON_API_KEY": "sk-kreoon-tu-api-key-aqui"
      }
    }
  }
}`} />
          </div>

          {/* Claude.ai web */}
          <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-300 text-xs font-mono px-2 py-0.5 rounded">02</span>
              <h3 className="text-white font-semibold">Claude.ai Web (OAuth)</h3>
            </div>
            <p className="text-gray-400 text-sm">En <strong className="text-white">Claude.ai → Settings → Connectors → Add custom connector</strong>, ingresa:</p>
            <CopyableBlock content={`https://mcp.kreoon.com`} />
            <p className="text-gray-400 text-sm">Claude.ai detecta OAuth automáticamente y te redirige al formulario de Kreoon donde ingresas tu API key. No necesitas poner la key en la URL.</p>
          </div>

          {/* REST API */}
          <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-300 text-xs font-mono px-2 py-0.5 rounded">03</span>
              <h3 className="text-white font-semibold">REST API directo</h3>
            </div>
            <p className="text-gray-400 text-sm">Para integrar con cualquier herramienta o agente personalizado:</p>
            <CopyableBlock content={`# Listar herramientas
curl -H "Authorization: Bearer sk-kreoon-..." \\
  https://mcp.kreoon.com/v1/tools

# Ejecutar herramienta
curl -X POST \\
  -H "Authorization: Bearer sk-kreoon-..." \\
  -H "Content-Type: application/json" \\
  -d '{"product_id":"uuid","platform":"tiktok"}' \\
  https://mcp.kreoon.com/v1/tools/generate_script`} />
          </div>
        </section>

        {/* Tabla de herramientas */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-400" />
            Herramientas disponibles
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 ml-2">29 tools</Badge>
          </h2>

          {TOOL_GROUPS.map((group) => (
            <div key={group.name} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">{group.name}</h3>
                <span className="text-gray-600 text-xs">({group.count})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {group.tools.map((tool, i) => (
                      <tr
                        key={tool.name}
                        className={`border-b border-[#1e1e2e] ${i % 2 === 0 ? "bg-[#13131a]" : "bg-[#0f0f1a]"}`}
                      >
                        <td className="px-4 py-3 font-mono text-purple-300 text-xs whitespace-nowrap">{tool.name}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{tool.desc}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="bg-[#1e1e2e] text-gray-400 text-xs font-mono px-2 py-0.5 rounded">{tool.scope}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* Scopes */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Scopes de autorización
          </h2>
          <p className="text-gray-400 text-sm">Cada API key tiene scopes configurados desde Settings → MCP. Las herramientas verifican el scope antes de ejecutar.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3a]">
                  <th className="px-4 py-3 text-left text-gray-500 font-normal text-xs uppercase tracking-wider">Scope</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-normal text-xs uppercase tracking-wider">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {SCOPES.map((s, i) => (
                  <tr key={s.scope} className={`border-b border-[#1e1e2e] ${i % 2 === 0 ? "bg-[#13131a]" : "bg-[#0f0f1a]"}`}>
                    <td className="px-4 py-3 font-mono text-purple-300 text-xs whitespace-nowrap">{s.scope}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{s.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* OAuth Flow */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Flujo OAuth 2.0
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { step: "1", title: "Descubrimiento", desc: "Claude.ai lee /.well-known/oauth-authorization-server" },
              { step: "2", title: "Autorización", desc: "Formulario HTML de Kreoon — ingresas tu API key" },
              { step: "3", title: "Redirección", desc: "Servidor valida la key y redirige con ?code=key" },
              { step: "4", title: "Token", desc: "POST /oauth/token → access_token = tu API key" },
            ].map((item) => (
              <div key={item.step} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4 space-y-2">
                <span className="text-purple-400 font-mono text-xs font-bold">Paso {item.step}</span>
                <p className="text-white text-sm font-semibold">{item.title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs">Después del OAuth, todas las llamadas a <code className="bg-[#1e1e2e] px-1 rounded text-purple-300">/mcp</code> van con <code className="bg-[#1e1e2e] px-1 rounded text-purple-300">Authorization: Bearer sk-kreoon-...</code></p>
        </section>

        {/* Bloque markdown para entrenar IAs */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg mt-0.5">
                <Copy className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Entrena tu IA con esta documentación</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Copia este bloque Markdown y pégalo en el contexto de ChatGPT, Gemini, o cualquier IA para que entienda cómo conectar y usar el MCP de Kreoon.
                </p>
              </div>
            </div>
            <CopyableBlock content={TRAINING_MD} />
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-xs pt-8 pb-4 border-t border-[#1e1e2e]">
          <p>Kreoon MCP Server v3.0.0 — <a href="https://mcp.kreoon.com/health" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">mcp.kreoon.com</a></p>
          <p className="mt-1">Genera tu API key en <a href="https://app.kreoon.com/settings" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">app.kreoon.com/settings</a></p>
        </footer>

      </div>
    </div>
  );
}
