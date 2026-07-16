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
**Versión:** v3.2.0
**Herramientas disponibles:** 43

---

## 🗣️ Cómo hablarle al MCP en lenguaje natural

Este servidor está optimizado para que el usuario escriba en lenguaje natural y el LLM elija la tool correcta. Los descriptions de cada tool incluyen frases típicas que disparan su uso. Además, en cada \`initialize\` el servidor envía instrucciones globales que el cliente LLM lee antes de operar.

### Casos de uso típicos

| Lo que dice el usuario | Tools que se invocan |
|---|---|
| "Muéstrame las marcas / clientes" | \`list_clients\` |
| "Busca el cliente Digitalex / Ñam Ñam" | \`list_clients\` con \`search\` |
| "Dame los productos de esta marca" | \`list_products\` con \`client_id\` |
| "Trae el ADN de la marca X" | \`get_brand_dna\` |
| "Genera el ADN de la marca / del producto" | \`generate_brand_dna\` / \`generate_product_dna_v1\` |
| "Muéstrame los guiones del producto Y" | \`list_content_items\` con \`product_id\` |
| "Enséñame este ítem / guion v3" | \`get_content_item\` |
| "Crea un anuncio UGC para venta directa" | \`create_content_item\` + \`generate_content_block\` (×5 bloques) |
| "Hazme un guion para Reels" | \`generate_content_block\` con \`block_type=script\` |
| "Genera director / B-roll / captions / marketing" | \`generate_content_block\` con el \`block_type\` correspondiente |
| "Cambia esta frase del guion" | \`get_content_item\` + \`update_content_item\` (edición quirúrgica) |
| "Quita la mención a X / corrige el componente Y" | \`update_content_item\` con \`replace_all=false\` |
| "Asígnale un creador / editor" | \`assign_content_team\` |
| "Aprueba el guion / Pide cambios" | \`approve_content_script\` |
| "Registra la entrega" | \`record_content_delivery\` |
| "Marca el pago al creador" | \`mark_content_payment\` |

### ⚠️ Regla de oro — el MCP nunca inventa

Si el usuario no especifica algo importante, el LLM cliente DEBE preguntar antes de actuar. Cosas que SIEMPRE deben quedar claras:

- **Qué marca / cliente exacto** (si hay varios candidatos)
- **Qué producto** (si la marca tiene más de uno)
- **Qué item específico** de contenido
- **Qué tipo de bloque** (\`script\` / \`director\` / \`broll\` / \`captions\` / \`marketing\`)
- **Qué plataforma** (\`instagram_reels\` / \`tiktok\` / \`youtube_shorts\` / \`instagram_post\`)
- **Qué etapa de funnel** (\`tofu\` / \`mofu\` / \`bofu\`)
- **Datos del producto** que no estén en el ADN (componentes, ingredientes, precios, garantías)
- **Posicionamiento o ángulos** específicos del cliente

El \`initialize\` del servidor envía estas reglas como \`instructions\` al cliente MCP. Cualquier LLM bien implementado las respetará automáticamente.

### Reglas de edición de guiones

- **"Ajusta esta frase"** → edición quirúrgica con \`update_content_item\`. NO regenerar.
- **"Rediseña / haz uno nuevo"** → \`generate_content_block\` (reemplaza el campo completo aplicando las skills).
- **Modificás un bloque** (script, director_output, broll_output, captions, marketing_output) → conservá los demás bloques intactos.
- **Guiones realistas**: hablar humano = ~150 palabras/minuto = ~2.5 palabras/segundo. Un Reel de 30s = MAX ~75 palabras de diálogo.

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
| \`scripts:write\` | Generar y mejorar guiones con IA |
| \`creators:read\` | Buscar y calificar creadores |
| \`profiles:write\` | Optimizar perfil del creador con IA |
| \`social:write\` | Publicar en redes sociales |
| \`campaigns:read\` | Ver campañas, proyectos, contenido, clientes, productos, miembros, ADN |
| \`campaigns:write\` | Crear/modificar campañas, proyectos, contenido, productos, ADN, asignar equipo |

---

## Herramientas (35 en total)

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

### Generación de Contenido IA (scope: campaigns:write)

**generate_content_block** — Genera un bloque de producción UGC con las Skills IA de KREOON: guión, tabla de producción, B-roll, captions o estrategia de pauta. Output HTML listo para renderizar.
- \`block_type\` (enum, required): "script" | "director" | "broll" | "captions" | "marketing"
- \`content_id\` (string): UUID del ítem — si se provee, extrae contexto y guarda automáticamente
- \`brand_name\` (string): Nombre de la marca (requerido sin content_id)
- \`platform\` (enum): "tiktok" | "instagram_reels" | "youtube_shorts"
- \`funnel_stage\` (enum): "tofu" | "mofu" | "bofu"

---

### ADN de Marca (scope: campaigns:write / campaigns:read)

**generate_brand_dna** — Genera el ADN de marca de un cliente usando Perplexity + Gemini: posicionamiento, arquetipos, propuesta de valor, audiencia, competencia y estrategia de contenido. Reemplaza el wizard de audio del cliente.
- \`client_id\` (string, required): UUID del cliente
- \`brand_description\` (string, required): Descripción completa de la marca/negocio (qué hace, para quién, diferenciadores, tono)
- \`locations\` (array): Países objetivo, ej: ["CO", "MX", "US"]

**get_brand_dna** — Consulta el ADN de marca activo de un cliente.
- \`client_id\` (string, required): UUID del cliente

---

### ADN de Producto V1 (scope: campaigns:write / campaigns:read)

**generate_product_dna_v1** — Crea el ADN V1 de un producto/servicio: market_research, competitor_analysis, strategy_recommendations y content_brief. Equivale al wizard pero desde texto.
- \`client_id\` (string, required): UUID del cliente al que pertenece el producto
- \`product_description\` (string, required): Descripción completa del producto/servicio
- \`target_audience\` (string): Cliente ideal
- \`service_group\` (enum): "content_creation" | "post_production" | "strategy_marketing" | "technology" | "education" | "general"

**get_product_dna_status** — Consulta el estado y resultados de un análisis ADN de producto.
- \`product_dna_id\` (string, required): UUID retornado por generate_product_dna_v1

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

### Portafolio del Marketplace (scope: profiles:write)

Solo talento (su propio portafolio) y admin (el de cualquier miembro de su organización). \`creator_id\` se ignora si quien llama es talento — siempre opera sobre su propia cuenta.

**get_my_portfolio** — Ve el perfil, items, servicios y bloques de diseño actuales.
- \`creator_id\` (string, opcional, solo admin)

**generate_portfolio** — Genera el portafolio COMPLETO con IA (bloques con diseño rico: gradientes, tipografía, sombras) usando datos reales del creador. Se guarda como borrador. Nunca inventa datos.
- \`creator_id\` (string, opcional, solo admin)
- \`vibe\` (string): estilo pedido, ej. "minimalista oscuro", "colorido y juvenil"

**update_portfolio_block** — Edita un bloque puntual (texto, color, estilo, visibilidad) sin regenerar el resto.
- \`block_id\` (string, required)
- \`config\` / \`styles\` / \`content\` (object, opcionales)
- \`is_visible\` (boolean, opcional)

**publish_portfolio** — Publica el borrador y activa el perfil en el marketplace.
- \`creator_id\` (string, opcional, solo admin)

**add_portfolio_item** — Registra un trabajo (video/imagen) con una URL ya hosteada. No sube archivos.
- \`media_url\` (string, required)
- \`media_type\`, \`title\`, \`description\`, \`thumbnail_url\`, \`category\`, \`tags\` (opcionales)

**list_portfolio_items** — Lista los trabajos actuales del portafolio.
- \`creator_id\` (string, opcional, solo admin), \`limit\` (number, opcional)

**import_external_design** — Importa un diseño externo como bloque del portafolio (borrador): un link de Figma (se embebe de forma segura) o una imagen ya exportada de Gamma/Stitch/Canva. No acepta HTML ni links genéricos — solo figma.com o una URL de imagen real (se verifica el content-type).
- \`source_url\` (string, required): URL de Figma o de una imagen
- \`title\` (string, opcional)

---

### Webhooks Salientes (scope: campaigns:read / campaigns:write) — solo admin

Conectá n8n/Make/Zapier: KREOON hace un POST firmado (HMAC-SHA256) a tu URL cada vez que ocurre un evento suscrito.

**register_webhook** — Registra un webhook. El secreto para validar la firma se muestra UNA sola vez.
- \`name\`, \`url\` (HTTPS), \`events\` (array: "portfolio.published" | "script.generated")

**list_webhooks** — Lista los webhooks de la organización (sin exponer el secreto).

**revoke_webhook** — Desactiva un webhook.
- \`webhook_id\` (string, required)

Cada entrega incluye headers \`X-Kreoon-Event\` y \`X-Kreoon-Signature: sha256=<hmac>\` — validá la firma con el secreto antes de confiar en el payload.

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

**update_content_item** — Actualiza los campos de metadata de un ítem existente (cliente, producto, brief, equipo, plazos, pagos) sin cambiar su estado en el pipeline.
- \`content_id\` (required), más cualquier campo editable opcional

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

**create_product** — Registra un producto o servicio vinculado a un cliente existente.
- \`client_id\` (required), \`name\` (required), \`description\`, \`ideal_avatar\`, \`sales_angles\` (array), \`strategy\`

**list_products** — Lista los productos registrados para un cliente o todos los de la organización.
- \`client_id\` (string, optional), \`search\` (string), \`limit\`

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
| \`/oauth/register\` | POST | Registro dinámico de cliente OAuth (RFC 7591) |
| \`/oauth/authorize\` | GET/POST | Flujo de autorización OAuth (con PKCE) |
| \`/oauth/token\` | POST | Intercambio de code de un solo uso por access_token |

---

## Flujo de trabajo recomendado

1. **Obtener contexto:** \`get_org_dashboard\` → estado general de la organización
2. **Obtener miembros:** \`list_org_members\` → UUIDs de creadores y editores disponibles
3. **Obtener clientes:** \`list_clients\` → UUIDs de clientes
4. **Obtener productos:** \`list_products\` con client_id → UUIDs de productos (o \`create_product\` si no existe)
5. **Generar ADN de marca** (opcional): \`generate_brand_dna\` con client_id + descripción
6. **Generar ADN de producto** (opcional): \`generate_product_dna_v1\` con client_id + descripción del producto
7. **Crear contenido:** \`create_content_item\` con todos los UUIDs
8. **Asignar equipo:** \`assign_content_team\`
9. **Generar guión:** \`generate_script\` con el product_id (o \`generate_content_block\` para más bloques)
10. **Aprobar guión:** \`approve_content_script\`
11. **Registrar entrega:** \`record_content_delivery\`
12. **Cerrar pago:** \`mark_content_payment\`
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
    name: "Generación de Contenido IA",
    count: 1,
    tools: [
      { name: "generate_content_block", desc: "Genera bloque UGC con Skills IA: guión, tabla de producción, B-roll, captions o estrategia de pauta", scope: "campaigns:write" },
    ],
  },
  {
    name: "ADN de Marca",
    count: 2,
    tools: [
      { name: "generate_brand_dna", desc: "ADN de marca del cliente: posicionamiento, arquetipos, audiencia, competencia y estrategia", scope: "campaigns:write" },
      { name: "get_brand_dna", desc: "Consulta el ADN de marca activo de un cliente", scope: "campaigns:read" },
    ],
  },
  {
    name: "ADN de Producto V1",
    count: 2,
    tools: [
      { name: "generate_product_dna_v1", desc: "ADN V1 del producto: market_research, competitor_analysis, strategy_recommendations y content_brief", scope: "campaigns:write" },
      { name: "get_product_dna_status", desc: "Consulta estado y resultados de un análisis ADN de producto", scope: "campaigns:read" },
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
    name: "Portafolio del Marketplace",
    count: 7,
    tools: [
      { name: "get_my_portfolio", desc: "Ve el perfil, items, servicios y bloques de diseño actuales (talento: el propio; admin: el de un miembro)", scope: "profiles:write" },
      { name: "generate_portfolio", desc: "Genera el portafolio completo con IA (diseño rico según un 'vibe' pedido) usando solo datos reales, guarda como borrador", scope: "profiles:write" },
      { name: "update_portfolio_block", desc: "Edita un bloque puntual (texto, color, estilo, visibilidad) sin regenerar el resto", scope: "profiles:write" },
      { name: "publish_portfolio", desc: "Publica el borrador y activa el perfil en el marketplace", scope: "profiles:write" },
      { name: "add_portfolio_item", desc: "Registra un trabajo (video/imagen) con una URL ya hosteada", scope: "profiles:write" },
      { name: "list_portfolio_items", desc: "Lista los trabajos actuales del portafolio", scope: "profiles:write" },
      { name: "import_external_design", desc: "Importa un diseño externo (Figma embebido o imagen de Gamma/Stitch/Canva) como bloque del portafolio", scope: "profiles:write" },
    ],
  },
  {
    name: "Webhooks Salientes",
    count: 3,
    tools: [
      { name: "register_webhook", desc: "Registra un webhook HTTPS con firma HMAC-SHA256 para conectar n8n/Make/Zapier (solo admin)", scope: "campaigns:write" },
      { name: "list_webhooks", desc: "Lista los webhooks de la organización sin exponer el secreto (solo admin)", scope: "campaigns:read" },
      { name: "revoke_webhook", desc: "Desactiva un webhook (solo admin)", scope: "campaigns:write" },
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
    count: 9,
    tools: [
      { name: "list_content_items", desc: "Lista ítems de contenido con filtros por estado, cliente y equipo", scope: "campaigns:read" },
      { name: "get_content_item", desc: "Detalles completos: estado, equipo, pagos, scripts y deliverables", scope: "campaigns:read" },
      { name: "create_content_item", desc: "Crea nuevo ítem con brief, equipo asignado y presupuesto", scope: "campaigns:write" },
      { name: "update_content_item", desc: "Actualiza metadata de un ítem existente sin cambiar su estado en el pipeline", scope: "campaigns:write" },
      { name: "assign_content_team", desc: "Asigna creador y/o editor a un ítem de contenido", scope: "campaigns:write" },
      { name: "update_content_status", desc: "Mueve el ítem por el pipeline de estados", scope: "campaigns:write" },
      { name: "approve_content_script", desc: "Aprueba el script y lo marca como ready_for_creation", scope: "campaigns:write" },
      { name: "record_content_delivery", desc: "Registra entrega con URL de video y assets adicionales", scope: "campaigns:write" },
      { name: "mark_content_payment", desc: "Marca contenido como pagado al creador y editor", scope: "campaigns:write" },
    ],
  },
  {
    name: "Organización",
    count: 6,
    tools: [
      { name: "get_org_dashboard", desc: "Dashboard completo: estados, vencidos, pagos pendientes, marketplace", scope: "campaigns:read" },
      { name: "list_org_members", desc: "Miembros activos con rol y UUID para asignaciones", scope: "campaigns:read" },
      { name: "list_clients", desc: "Clientes y marcas de la organización con UUIDs", scope: "campaigns:read" },
      { name: "create_client", desc: "Crea nuevo cliente o marca en la organización", scope: "campaigns:write" },
      { name: "create_product", desc: "Registra un producto o servicio vinculado a un cliente existente", scope: "campaigns:write" },
      { name: "list_products", desc: "Lista productos registrados para un cliente o todos los de la organización", scope: "campaigns:read" },
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
  { scope: "scripts:write", desc: "Generar y mejorar guiones UGC con IA" },
  { scope: "creators:read", desc: "Buscar y calificar creadores" },
  { scope: "profiles:write", desc: "Optimizar perfil del creador con IA" },
  { scope: "social:write", desc: "Publicar en redes sociales" },
  { scope: "campaigns:read", desc: "Ver campañas, proyectos, contenido, clientes, productos, miembros y ADN" },
  { scope: "campaigns:write", desc: "Crear y modificar campañas, proyectos, contenido, productos, ADN y asignaciones" },
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
          v3.2.0
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
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">43 herramientas</span>
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">OAuth 2.0</span>
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">Claude Desktop</span>
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">Claude.ai Web</span>
            <span className="bg-[#1e1e2e] border border-[#2a2a3a] text-gray-300 text-sm px-4 py-1.5 rounded-full">REST API</span>
          </div>
        </section>

        {/* Lenguaje natural — Casos de uso */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-400" />
            Hablale en lenguaje natural
          </h2>
          <p className="text-gray-400 leading-relaxed">
            Este MCP está optimizado para que escribas como hablás. El LLM cliente lee las instrucciones del servidor en cada <code className="bg-[#1e1e2e] px-1 py-0.5 rounded text-purple-300">initialize</code> y elige las tools correctas. Algunos ejemplos:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3a]">
                  <th className="px-4 py-3 text-left text-gray-500 font-normal text-xs uppercase tracking-wider">Lo que dice el usuario</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-normal text-xs uppercase tracking-wider">Tools que se invocan</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { say: '"Muéstrame las marcas / clientes"', tools: 'list_clients' },
                  { say: '"Busca el cliente Digitalex / Ñam Ñam"', tools: 'list_clients(search)' },
                  { say: '"Dame los productos de esta marca"', tools: 'list_products(client_id)' },
                  { say: '"Trae el ADN de la marca"', tools: 'get_brand_dna' },
                  { say: '"Genera el ADN de la marca"', tools: 'generate_brand_dna' },
                  { say: '"Muéstrame los guiones del producto"', tools: 'list_content_items(product_id)' },
                  { say: '"Enséñame este ítem / guion"', tools: 'get_content_item' },
                  { say: '"Crea un anuncio UGC para venta directa"', tools: 'create_content_item + generate_content_block ×5' },
                  { say: '"Hazme un guion para Reels"', tools: 'generate_content_block(block_type=script)' },
                  { say: '"Genera director / B-roll / captions / marketing"', tools: 'generate_content_block(block_type=...)' },
                  { say: '"Cambia esta frase del guion"', tools: 'get_content_item + update_content_item' },
                  { say: '"Quita la mención a X / corrige el componente Y"', tools: 'update_content_item (quirúrgico)' },
                  { say: '"Asígnale un creador / editor"', tools: 'assign_content_team' },
                  { say: '"Aprueba el guion / Pide cambios"', tools: 'approve_content_script' },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-[#1e1e2e] ${i % 2 === 0 ? "bg-[#13131a]" : "bg-[#0f0f1a]"}`}>
                    <td className="px-4 py-3 text-gray-300 text-xs">{row.say}</td>
                    <td className="px-4 py-3 font-mono text-purple-300 text-xs">{row.tools}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Regla "no inventar" */}
          <div className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/30 rounded-xl p-5 mt-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-500/20 p-2 rounded-lg mt-0.5">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-semibold text-base">⚠️ El MCP nunca inventa</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Si algo no está claro (qué marca, qué producto, qué plataforma, qué etapa de funnel, qué componentes del producto…) el LLM cliente <strong className="text-white">debe preguntar antes de actuar</strong>. Nunca asume datos. Nunca inventa UUIDs ni ingredientes. Esta regla viaja en el <code className="bg-[#1e1e2e] px-1 py-0.5 rounded text-purple-300">initialize</code> del servidor.
                </p>
                <p className="text-gray-400 text-xs leading-relaxed pt-1">
                  Reglas de edición de guiones: <strong className="text-white">"ajusta esta frase"</strong> → edición quirúrgica con <code className="text-purple-300">update_content_item</code>. <strong className="text-white">"Rediseña"</strong> → <code className="text-purple-300">generate_content_block</code> (reemplaza el bloque con las skills internas).
                </p>
              </div>
            </div>
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
              { icon: <Zap className="w-4 h-4" />, title: "Acceso completo", desc: "43 herramientas que cubren todo el flujo operativo de una agencia UGC" },
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
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 ml-2">43 tools</Badge>
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
          <p className="text-gray-400 text-sm">Los scopes se derivan automáticamente de tu rol en la organización en cada request — no se eligen al crear la key. Si tu rol cambia (o dejas la organización), la key se ajusta o se invalida en la siguiente llamada. Las herramientas verifican el scope y el rol antes de ejecutar.</p>
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
              { step: "1", title: "Descubrimiento", desc: "Claude.ai lee /.well-known/oauth-authorization-server (incluye registration_endpoint)" },
              { step: "2", title: "Registro", desc: "POST /oauth/register — Claude.ai obtiene un client_id automáticamente" },
              { step: "3", title: "Autorización", desc: "Formulario HTML de Kreoon — client_id, redirect_uri y PKCE (S256) son obligatorios y se validan contra el registro" },
              { step: "4", title: "Redirección", desc: "Servidor genera un code opaco de un solo uso y redirige SOLO al redirect_uri registrado" },
              { step: "5", title: "Token", desc: "POST /oauth/token con code + code_verifier → access_token = tu API key" },
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
          <p>Kreoon MCP Server v3.2.0 — <a href="https://mcp.kreoon.com/health" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">mcp.kreoon.com</a></p>
          <p className="mt-1">Genera tu API key en <a href="https://app.kreoon.com/settings" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">app.kreoon.com/settings</a></p>
        </footer>

      </div>
    </div>
  );
}
