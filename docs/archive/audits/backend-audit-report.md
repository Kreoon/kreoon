# Backend Audit Report - Kreoon

**Fecha:** 2026-03-27
**Auditor:** Backend-Auditor Agent
**Scope:** Board/Kanban, Content/Scripts, Marketplace, ADN Research

---

## Resumen Ejecutivo

| Area | Score | Estado |
|------|-------|--------|
| Edge Functions | 7/10 | Bueno con mejoras sugeridas |
| RLS Policies | 8/10 | Bien implementado |
| Queries N+1 | 7/10 | Optimizado en areas clave |
| Manejo de Errores | 6/10 | Necesita estandarización |

---

## 1. Hallazgos Criticos (Bloqueadores)

### 1.1 Funcion `kreoon_sql` NO existe
**Verificado:** La funcion RPC `kreoon_sql` mencionada en QAs anteriores **NO existe** en las migraciones actuales.
- **Impacto:** Bajo - parece que nunca fue implementada, no hay dependencias.
- **Accion:** Ninguna requerida si no se usa.

### 1.2 Tipos faltantes en Supabase Client (50+ instancias)
**Archivos afectados:**
- `src/hooks/useCreatorMatching.ts` (8 instancias)
- `src/hooks/useCampaignNotifications.ts` (5 instancias)
- `src/hooks/useCreatorMarketplaceProfile.ts` (9 instancias)
- `src/hooks/useCampaignInvitations.ts` (5 instancias)
- `src/hooks/useBrandActivation.ts` (11 instancias)
- `src/hooks/useHashtags.ts` (2 instancias)
- Y otros hooks de marketplace/campaigns

**Patron detectado:**
```typescript
await (supabase as any).from('tabla_sin_tipado')
```

**Impacto:** Alto
- Perdida de type-safety en tiempo de compilacion
- Posibles errores de runtime no detectados
- Dificulta refactoring seguro

**Accion requerida:**
1. Regenerar `src/integrations/supabase/types.ts` desde Supabase CLI
2. O agregar tipos manuales para las tablas nuevas de marketplace

---

## 2. Hallazgos Importantes (Mejorar Pronto)

### 2.1 Edge Functions - Manejo de Errores Inconsistente

#### board-ai/index.ts
**Fortalezas:**
- Try/catch global con respuesta estructurada
- Headers CORS correctos
- Manejo especifico de rate limit (429)
- Validacion de inputs basica
- Logging de uso de AI

**Debilidades:**
- Throws sin contexto suficiente: `throw new Error("Content not found")` - no incluye contentId
- Error generico para acciones desconocidas sin loguear el valor recibido

**Timeout:** No configurado explicitamente (usa default de Supabase ~150s)

#### content-ai/index.ts
**Fortalezas:**
- Sistema de fallback multi-proveedor (Gemini -> OpenAI -> Anthropic)
- Token guard para cobro de tokens AI
- Integracion con Perplexity para research

**Debilidades:**
- Funcion `sleep()` definida pero no usada en el archivo
- No hay timeout explicito para llamadas AI

#### generate-script/index.ts
**Fortalezas:**
- Metodo Esfera bien documentado con fases
- Manejo de rate limits (429, 402)
- Logging de uso

**Debilidades:**
- Sistema de fallback menos robusto que content-ai

#### adn-research-v3/index.ts
**Fortalezas:**
- Arquitectura fire-and-forget con `EdgeRuntime.waitUntil`
- Timeouts adaptativos (90s normal, 120s para pasos pesados)
- Fallback estructurado si AI falla
- Persistencia de progreso en DB

**Debilidades:**
- `// @ts-ignore` para EdgeRuntime (esperado, pero documentar)
- Pausas hardcodeadas entre pasos (1-2 segundos)

### 2.2 RLS Policies - Estado Actual

**Tablas con RLS habilitado (verificado):**
- `content` - OK
- `profiles` - OK
- `organizations` - OK
- `organization_members` - OK
- `products` - OK
- `client_dna` - OK
- `product_dna` - OK
- `board_settings` - OK
- `board_status_rules` - OK
- `board_custom_fields` - OK
- `board_permissions` - OK

**Funcion `is_platform_admin()` - EXISTE**
```sql
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
```
- Usada en 20+ policies para acceso de plataforma
- Bien implementada en migracion `20251230021950`

**Patron positivo verificado:**
- NO se encontraron instancias de `organization_id = ''` (el problema reportado anteriormente fue corregido)

### 2.3 Queries N+1 - Analisis de Hooks

#### useContent.ts (OPTIMIZADO)
**Patron positivo:**
```typescript
// Uses RPC function - checks membership ONCE instead of 18 RLS policies per row
const { data, error } = await supabase.rpc('get_org_content', {...});
```
- Usa RPC `get_org_content` para evitar 18 evaluaciones RLS por fila
- Fetch paralelo de clientes/creadores/editores con `Promise.all`
- Cache de profiles para realtime

**Score:** 9/10

#### useCreatorMarketplaceProfile.ts (MEJORABLE)
**Patron problematico:**
```typescript
// 6 queries secuenciales en queryFn:
const { data: profile } = await supabase.from('profiles')...
const { data: membership } = await supabase.from('organization_members')...
const { data: servicesData } = await (supabase as any).from('creator_services')...
const { data: availabilityData } = await (supabase as any).from('creator_availability')...
const { data: verification } = await (supabase as any).from('marketplace_verifications')...
const { data: reviewsData } = await (supabase as any).from('marketplace_reviews')...
const { count: reviewsCount } = await (supabase as any).from('marketplace_reviews')...
```

**Impacto:** Medio - Son queries a tablas diferentes, no es N+1 clasico pero podrian paralelizarse

**Sugerencia:** Agrupar queries independientes con `Promise.all`:
```typescript
const [servicesData, availabilityData, verification] = await Promise.all([
  supabase.from('creator_services')...,
  supabase.from('creator_availability')...,
  supabase.from('marketplace_verifications')...
]);
```

#### useBoardAI.ts (BIEN ESTRUCTURADO)
- No hace queries directas, delega a edge function
- Usa `invokeAIWithTokens` para gate de tokens
- Manejo limpio de errores con toast

**Score:** 8/10

### 2.4 Validacion de Inputs en Edge Functions

| Funcion | Validacion | Estado |
|---------|-----------|--------|
| board-ai | `organizationId`, `contentId` cuando requerido | OK |
| content-ai | `organizationId`, `action` | OK |
| generate-script | `organizationId` | OK |
| adn-research-v3 | `session_id`, `product_id`, `product_dna_id` | OK |

### 2.5 CORS Headers

Todas las funciones auditadas tienen headers CORS correctos:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

---

## 3. Sugerencias (Nice to Have)

### 3.1 Estandarizar Errores de Edge Functions
Crear un helper compartido:
```typescript
// _shared/error-response.ts
export function errorResponse(
  error: unknown,
  context?: { action?: string; resourceId?: string }
) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  console.error(`[${context?.action}] Error:`, message, context);
  return new Response(
    JSON.stringify({ error: message, ...context }),
    { status: getStatusFromError(error), headers: corsHeaders }
  );
}
```

### 3.2 Agregar Metricas de Latencia
Las funciones ya loguean duracion en algunos casos, pero seria util:
- Enviar metricas a tabla `edge_function_metrics`
- Alertas automaticas si p95 > threshold

### 3.3 Documentar EdgeRuntime
En `adn-research-v3`, el `// @ts-ignore` para `EdgeRuntime.waitUntil` deberia tener un comentario explicativo:
```typescript
// EdgeRuntime.waitUntil es una API de Deno Deploy/Supabase para fire-and-forget
// Ver: https://supabase.com/docs/guides/functions/background-tasks
// @ts-ignore - Global de Supabase Edge Functions
EdgeRuntime.waitUntil(runResearchProcess(input, supabase))
```

### 3.4 Rate Limiting en Edge Functions
Solo `board-ai` maneja explicitamente el 429. Otras funciones deberian tener el mismo patron:
```typescript
if (status === 429) {
  return new Response(
    JSON.stringify({ error: "Rate limit", retry_after_seconds: ... }),
    { status: 429, headers: corsHeaders }
  );
}
```

---

## 4. Scores por Area

### Edge Functions: 7/10
- (+) Arquitectura solida con fallbacks AI
- (+) Fire-and-forget bien implementado en ADN v3
- (+) Headers CORS correctos
- (-) Errores sin contexto suficiente
- (-) No hay timeout explicito en algunas funciones

### RLS Policies: 8/10
- (+) `is_platform_admin()` bien implementada
- (+) Tablas principales con RLS
- (+) No se encontro el bug `organization_id = ''`
- (-) Algunas tablas de marketplace sin RLS explicito visible

### Queries N+1: 7/10
- (+) `useContent` usa RPC optimizado
- (+) `fetchContentData` hace Promise.all
- (-) `useCreatorMarketplaceProfile` hace queries secuenciales
- (-) Hooks de marketplace con `(supabase as any)`

### Manejo de Errores: 6/10
- (+) Try/catch globales
- (+) Logging de errores
- (-) Mensajes de error sin contexto
- (-) Sin estandarizacion entre funciones

---

## Acciones Recomendadas (Priorizadas)

1. **ALTA** - Regenerar tipos de Supabase para eliminar `(supabase as any)`
2. **ALTA** - Agregar contexto a errores (IDs, accion, timestamp)
3. **MEDIA** - Paralelizar queries en `useCreatorMarketplaceProfile`
4. **MEDIA** - Estandarizar manejo de rate limits en todas las funciones
5. **BAJA** - Documentar uso de EdgeRuntime
6. **BAJA** - Agregar metricas de latencia

---

## Archivos Auditados

### Edge Functions
- `supabase/functions/board-ai/index.ts`
- `supabase/functions/content-ai/index.ts`
- `supabase/functions/generate-script/index.ts`
- `supabase/functions/adn-research-v3/index.ts`

### Hooks Frontend
- `src/hooks/useContent.ts`
- `src/hooks/useBoardAI.ts`
- `src/hooks/useCreatorMarketplaceProfile.ts`
- `src/hooks/useMarketplaceCampaigns.ts`

### Migraciones Revisadas
- `supabase/migrations/20251218213528_*.sql` (RLS inicial)
- `supabase/migrations/20251230021950_*.sql` (is_platform_admin)
- `supabase/migrations/20260211*_client_dna.sql`
- `supabase/migrations/20260211*_product_dna_wizard_v2.sql`

---

*Reporte generado automaticamente por Backend-Auditor Agent*
