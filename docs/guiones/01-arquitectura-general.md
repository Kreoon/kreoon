# Arquitectura General - Constructor de Guiones

## Visión General

El constructor de guiones de Kreoon es un sistema multi-capa que combina generación de contenido con IA, gestión de permisos por rol, y metodologías de marketing (ESFERA + Eugene Schwartz) para producir guiones UGC estructurados por bloques.

## Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITECTURA DE ALTO NIVEL                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   FRONTEND      │───▶│   EDGE FUNCS    │───▶│   AI PROVIDERS  │         │
│  │   (React/TS)    │    │   (Deno)        │    │ Gemini/OpenAI/  │         │
│  │                 │◀───│                 │◀───│ Claude          │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│          │                      │                                           │
│          │                      ▼                                           │
│          │              ┌─────────────────┐    ┌─────────────────┐         │
│          └─────────────▶│   SUPABASE DB   │◀───│   PERPLEXITY    │         │
│                         │   (PostgreSQL)  │    │   (Research)    │         │
│                         └─────────────────┘    └─────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Componentes del Sistema

### 1. Frontend (React/TypeScript)

**Componentes Principales:**

| Componente | Ruta | Función |
|------------|------|---------|
| `ScriptGenerator.tsx` | `src/components/content/ScriptGenerator.tsx` | Generador dentro del detalle de contenido (4 pasos) |
| `StandaloneScriptGenerator.tsx` | `src/components/scripts/StandaloneScriptGenerator.tsx` | Generador independiente (2 pasos + director) |
| `ScriptPromptsConfig.tsx` | `src/components/settings/ai/ScriptPromptsConfig.tsx` | Configuración de prompts por organización |

### 2. Edge Functions (Supabase/Deno)

| Función | Ruta | Descripción |
|---------|------|-------------|
| `content-ai` | `supabase/functions/content-ai/index.ts` | Multi-acción principal |
| `generate-script` | `supabase/functions/generate-script/index.ts` | Generación simple (legacy) |
| `script-chat` | `supabase/functions/script-chat/index.ts` | Chat para refinamiento |
| `board-ai` | `supabase/functions/board-ai/index.ts` | Análisis de tableros |

### 3. Proveedores de IA

**Cadena de Fallback:**
1. **Gemini** (Google) - Principal
2. **OpenAI** (GPT-4) - Fallback primario
3. **Anthropic** (Claude) - Fallback final

**Research:**
- **Perplexity** - Investigación en tiempo real (tendencias, hooks, competencia)

### 4. Base de Datos (Supabase/PostgreSQL)

**Tablas Principales:**
- `content` - Proyectos y guiones
- `products` - Productos con configuración de avatar
- `script_permissions` - Permisos por rol
- `organization_ai_prompts` - Prompts personalizados

---

## Flujos de Generación

### ScriptGenerator.tsx (4 Pasos)

```
PASO 1: GUIÓN BASE (Creador)
   │
   ▼
PASO 2: PAUTAS DE EDICIÓN (Editor)
   │
   ▼
PASO 3: PAUTAS DE ESTRATEGA (Strategist)
   │
   ▼
PASO 4: PAUTAS DE TRAFFICKER (Trafficker)
```

### StandaloneScriptGenerator.tsx (2 Pasos)

```
PASO 1: GUIÓN COMPLETO (con Perplexity Research)
   │
   ▼
PASO 2: NOTAS DEL DIRECTOR
```

---

## Flujo de Procesamiento en Edge Function

```
REQUEST
   │
   ▼
1. CORS CHECK
   │
   ▼
2. RATE LIMIT (20 req/min por IP)
   │
   ▼
3. MODULE VALIDATION (verificar módulo activo)
   │
   ▼
4. TOKEN GUARD (verificar saldo de tokens)
   │
   ▼
5. PROMPT LOADING (cache 5 min → DB → fallback)
   │
   ▼
6. PERPLEXITY RESEARCH (opcional)
   │
   ▼
7. PROMPT CONSTRUCTION (interpolación de variables)
   │
   ▼
8. AI REQUEST (provider chain con fallback)
   │
   ▼
9. USAGE LOGGING (deducir tokens)
   │
   ▼
RESPONSE
```

---

## Archivos Críticos

| Archivo | Descripción |
|---------|-------------|
| `supabase/functions/content-ai/index.ts` | Edge function principal |
| `src/components/content/ScriptGenerator.tsx` | Componente frontend (4 pasos) |
| `src/lib/ai/prompts/scripts.ts` | Prompts por rol |
| `src/components/content/ContentDetailDialog/scripts/types.ts` | Tipos y permisos |
| `supabase/functions/_shared/prompts/db-prompts.ts` | Sistema de cache |

---

## Documentos Relacionados

- [02-prompts-sistema.md](./02-prompts-sistema.md) - Sistema de prompts
- [03-variables-interpolacion.md](./03-variables-interpolacion.md) - Variables disponibles
- [04-metodo-esfera.md](./04-metodo-esfera.md) - Metodología ESFERA
- [05-permisos-roles.md](./05-permisos-roles.md) - Sistema de permisos
- [06-estructura-guiones.md](./06-estructura-guiones.md) - Formato de salida
- [07-esquema-base-datos.md](./07-esquema-base-datos.md) - Esquema SQL
