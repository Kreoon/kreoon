# QA Warnings Status - Kreoon

**Fecha:** 2026-03-27
**Auditor:** QA-Integration Agent (Claude Opus 4.5)
**Tipo:** Verificacion de warnings anteriores + nuevos hallazgos

---

## 1. WARNINGS ANTERIORES - ESTADO

### 1.1 `is_platform_admin()` debe existir

| Campo | Valor |
|-------|-------|
| **Estado** | RESUELTO |
| **Evidencia** | Encontrado en 34 archivos de migraciones |
| **Ubicacion principal** | `supabase/migrations/20251230021950_*.sql` |
| **Uso actual** | 20+ RLS policies para acceso de plataforma |

**Verificacion:**
```sql
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
```
La funcion existe y esta correctamente implementada.

---

### 1.2 `(supabase as any)` en servicios

| Campo | Valor |
|-------|-------|
| **Estado** | PENDIENTE - CRITICO |
| **Archivos afectados** | 47 archivos |
| **Total instancias** | 150+ usos de `(supabase as any)` |
| **Impacto** | Alto - perdida de type-safety |

**Archivos mas afectados:**
| Archivo | Instancias |
|---------|------------|
| `src/services/finance/financeService.ts` | 18 |
| `src/hooks/useBrandActivation.ts` | 11 |
| `src/hooks/useCreatorMarketplaceProfile.ts` | 9 |
| `src/hooks/useCreatorMatching.ts` | 8 |
| `src/hooks/useCampaignNotifications.ts` | 5 |

**Causa raiz:** El archivo `types.ts` (31,095 lineas) no incluye tipos para tablas nuevas de:
- Marketplace/campaigns
- Finance system
- Brand activation
- Wallet module

**Accion requerida:**
```bash
npx supabase gen types typescript --project-id wjkbqcrxwsmvtxmqgiqc > src/integrations/supabase/types.ts
```

---

### 1.3 `EMBEDDING_DIMENSIONS` hardcoded

| Campo | Valor |
|-------|-------|
| **Estado** | NO ENCONTRADO |
| **Busqueda** | Grep en todo el proyecto |
| **Conclusion** | No existe esta constante - posiblemente nunca fue implementada |

**Nota:** El sistema de embeddings no parece estar activo. Si se implementa en el futuro, considerar usar configuracion dinamica.

---

### 1.4 RPC `kreoon_sql` existencia

| Campo | Valor |
|-------|-------|
| **Estado** | PARCIAL - Solo en documentacion |
| **Ubicacion** | `docs/audits/backend-audit-report.md` (referencia) |
| **En migraciones** | NO existe |
| **En codigo** | NO se invoca |

**Conclusion:** La funcion fue mencionada en auditorias anteriores pero nunca fue implementada. No hay dependencias, no requiere accion.

---

### 1.5 `organization_id = ''` vs `IS NULL`

| Campo | Valor |
|-------|-------|
| **Estado** | RESUELTO |
| **Busqueda en src/** | 0 resultados para `organization_id = ''` |
| **Busqueda en migraciones** | 18 archivos usan `organization_id IS NULL` (correcto) |

**Ejemplos de uso correcto encontrados:**
```sql
-- En RLS policies
WHERE organization_id IS NULL OR organization_id = auth.uid()

-- En funciones RPC
AND (organization_id IS NULL)
```

El patron incorrecto `organization_id = ''` ha sido corregido en todo el codebase.

---

## 2. NUEVOS WARNINGS DETECTADOS

### 2.1 console.log() en produccion

| Campo | Valor |
|-------|-------|
| **Severidad** | MEDIA |
| **Total** | 185 ocurrencias en 50+ archivos |
| **Impacto** | Performance, seguridad (leaks de datos) |

**Archivos criticos con console.log:**
- `src/hooks/useLiveStream.ts` - 49 logs (excesivo)
- `src/hooks/useAuth.tsx` - 8 logs
- `src/hooks/useOnboardingGate.ts` - 8 logs
- `src/hooks/useUPStatusHandler.ts` - 7 logs

**Recomendacion:** Implementar logger centralizado con niveles (debug/info/warn/error) y desactivar en produccion.

---

### 2.2 TODO/FIXME sin resolver

| Campo | Valor |
|-------|-------|
| **Severidad** | BAJA |
| **Total** | 44 ocurrencias en 30 archivos |
| **Antiguedad** | Algunos desde 2025 |

**Ejemplos notables:**
- `src/components/content/StrategistScriptForm.tsx` - 7 TODOs
- `src/modules/wallet/services/marketplace.service.ts` - 4 TODOs
- `src/modules/booking/hooks/useCalendarIntegrations.ts` - 4 TODOs

---

### 2.3 Prompts duplicados AI

| Campo | Valor |
|-------|-------|
| **Severidad** | MEDIA |
| **Ubicaciones** | Frontend + Edge Functions |
| **Impacto** | Inconsistencias, mantenimiento dificil |

**Duplicaciones detectadas:**
1. `MASTER_SYSTEM_PROMPT` en content-ai vs `DEFAULT_MASTER_PROMPT` en ScriptPromptsConfig
2. `portfolio_ai_prompts.ts` (frontend) vs `portfolio-ai/index.ts` (no sincronizados)
3. `getModuleAIConfig` replicado en 6 edge functions

---

### 2.4 Edge Functions sin _shared utilities

| Campo | Valor |
|-------|-------|
| **Severidad** | BAJA |
| **Cantidad** | 156 edge functions |
| **Sin usar _shared** | ~40% |

Muchas funciones replican:
- Headers CORS
- Config de proveedores AI
- Manejo de errores
- Creacion de cliente Supabase

---

## 3. RESUMEN DE ESTADOS

| Warning | Estado | Prioridad | Esfuerzo |
|---------|--------|-----------|----------|
| `is_platform_admin()` | RESUELTO | - | - |
| `(supabase as any)` | PENDIENTE | P0 | S (1 dia) |
| `EMBEDDING_DIMENSIONS` | N/A | - | - |
| `kreoon_sql` RPC | N/A | - | - |
| `organization_id = ''` | RESUELTO | - | - |
| console.log produccion | PENDIENTE | P2 | M (2 dias) |
| TODO/FIXME | PENDIENTE | P3 | L (5 dias) |
| Prompts duplicados AI | PENDIENTE | P1 | M (3 dias) |
| Edge Functions _shared | PENDIENTE | P2 | L (5 dias) |

---

## 4. ACCIONES INMEDIATAS RECOMENDADAS

### Esta semana (P0):
1. **Regenerar types.ts** - Comando supabase gen types
2. **Verificar tablas faltantes** - marketplace_*, finance_*, wallet_*, brand_*

### Proxima semana (P1):
3. **Centralizar prompts AI** - Un solo origen de verdad
4. **Crear logger centralizado** - Reemplazar console.log

### Sprint 3 (P2):
5. **Refactorizar edge functions** - Usar _shared utilities
6. **Resolver TODOs criticos** - Priorizar por modulo

---

*Verificacion realizada por QA-Integration Agent*
