# Issues Tracker - Kreoon Platform Audit

**Fecha:** 2026-03-27
**Generado por:** QA-Integration Agent

---

## Leyenda

**Prioridad:**
- P0: Critico (Bloquea produccion)
- P1: Alto (Afecta muchos usuarios)
- P2: Medio (Mejora significativa)
- P3: Bajo (Nice to have)

**Esfuerzo:**
- XS: < 2 horas
- S: 2-8 horas (1 dia)
- M: 1-3 dias
- L: 3-5 dias
- XL: > 1 semana

---

## Issues por Area

### BACKEND (Score: 7/10)

| ID | Issue | Prioridad | Esfuerzo | Responsable | Estado |
|----|-------|-----------|----------|-------------|--------|
| BE-001 | Regenerar types.ts para eliminar `(supabase as any)` | P0 | S | Backend Lead | Pendiente |
| BE-002 | Estandarizar manejo de errores en Edge Functions | P1 | M | Backend | Pendiente |
| BE-003 | Agregar timeouts explicitos en Edge Functions AI | P1 | S | Backend | Pendiente |
| BE-004 | Paralelizar queries en useCreatorMarketplaceProfile | P2 | S | Backend | Pendiente |
| BE-005 | Centralizar getModuleAIConfig en _shared | P2 | M | Backend | Pendiente |
| BE-006 | Documentar EdgeRuntime.waitUntil | P3 | XS | Backend | Pendiente |
| BE-007 | Agregar rate limit handling uniforme | P2 | S | Backend | Pendiente |
| BE-008 | Crear metricas de latencia para Edge Functions | P3 | M | Backend | Pendiente |

### FRONTEND (Score: 7/10)

| ID | Issue | Prioridad | Esfuerzo | Responsable | Estado |
|----|-------|-----------|----------|-------------|--------|
| FE-001 | Eliminar console.log en produccion (185 instancias) | P2 | M | Frontend | Pendiente |
| FE-002 | Implementar logger centralizado con niveles | P2 | S | Frontend | Pendiente |
| FE-003 | Reducir re-renders en componentes pesados | P1 | M | Frontend | Pendiente |
| FE-004 | Optimizar bundle size (lazy loading faltante) | P2 | L | Frontend | Pendiente |
| FE-005 | Resolver TODOs criticos (44 pendientes) | P3 | L | Frontend | Pendiente |
| FE-006 | Mejorar error boundaries por modulo | P2 | M | Frontend | Pendiente |

### AI MODULES (Score: 6.5/10)

| ID | Issue | Prioridad | Esfuerzo | Responsable | Estado |
|----|-------|-----------|----------|-------------|--------|
| AI-001 | Centralizar prompts (eliminar duplicados) | P1 | M | AI Team | Pendiente |
| AI-002 | Implementar Chain of Thought en prompts criticos | P1 | M | AI Team | Pendiente |
| AI-003 | Agregar Few-Shot examples a prompts principales | P2 | M | AI Team | Pendiente |
| AI-004 | Fragmentar outputs largos (Step 08 Copywriting) | P2 | M | AI Team | Pendiente |
| AI-005 | Conectar portfolio_ai_prompts.ts con Edge Function | P2 | S | AI Team | Pendiente |
| AI-006 | Estandarizar module_key nomenclatura | P2 | M | AI Team | Pendiente |
| AI-007 | Agregar validacion JSON antes de parseo | P1 | S | AI Team | Pendiente |
| AI-008 | Especificar temperatura en todos los prompts | P3 | S | AI Team | Pendiente |

### PROMPTS (Score: 6.8/10)

| ID | Issue | Prioridad | Esfuerzo | Responsable | Estado |
|----|-------|-----------|----------|-------------|--------|
| PR-001 | Optimizar MASTER_SCRIPT_PROMPT con CoT | P1 | S | Content | Pendiente |
| PR-002 | Reducir tamano de ESFERA_CONTEXT | P2 | S | Content | Pendiente |
| PR-003 | Agregar ejemplos a ADN Research steps | P2 | M | Content | Pendiente |
| PR-004 | Calibrar umbrales en Board AI analyze_card | P2 | S | Content | Pendiente |
| PR-005 | Implementar scoring weights en Talent Matching | P2 | M | Content | Pendiente |

### DATABASE/RLS (Score: 8/10)

| ID | Issue | Prioridad | Esfuerzo | Responsable | Estado |
|----|-------|-----------|----------|-------------|--------|
| DB-001 | Verificar RLS en tablas nuevas de marketplace | P1 | S | DBA | Pendiente |
| DB-002 | Agregar indices en queries lentas | P2 | M | DBA | Pendiente |
| DB-003 | Documentar esquema de permisos por rol | P3 | M | DBA | Pendiente |

### PERFORMANCE (Score: 7/10)

| ID | Issue | Prioridad | Esfuerzo | Responsable | Estado |
|----|-------|-----------|----------|-------------|--------|
| PF-001 | Reducir queries secuenciales (N+1 patterns) | P1 | M | Backend | Pendiente |
| PF-002 | Implementar caching para datos estaticos | P2 | L | Backend | Pendiente |
| PF-003 | Optimizar imagenes/videos (lazy load) | P2 | M | Frontend | Pendiente |
| PF-004 | Revisar stale time de React Query | P3 | S | Frontend | Pendiente |

### UX/UI (Score: 7.5/10)

| ID | Issue | Prioridad | Esfuerzo | Responsable | Estado |
|----|-------|-----------|----------|-------------|--------|
| UX-001 | Mejorar feedback visual en acciones async | P2 | M | UX | Pendiente |
| UX-002 | Estandarizar estados de loading/error | P2 | M | UX | Pendiente |
| UX-003 | Revisar accesibilidad (WCAG) | P2 | L | UX | Pendiente |
| UX-004 | Optimizar mobile navigation | P2 | M | UX | Pendiente |

---

## Resumen por Prioridad

| Prioridad | Cantidad | Esfuerzo Total Estimado |
|-----------|----------|------------------------|
| P0 | 1 | 1 dia |
| P1 | 9 | 2 semanas |
| P2 | 20 | 4 semanas |
| P3 | 7 | 2 semanas |
| **Total** | **37** | **~9 semanas** |

---

## Quick Wins (< 1 dia, alto impacto)

| ID | Issue | Impacto |
|----|-------|---------|
| BE-001 | Regenerar types.ts | Elimina 150+ type casts |
| AI-007 | Validacion JSON | Reduce errores runtime |
| PR-001 | CoT en scripts | +25% calidad |
| AI-008 | Temperatura en prompts | Consistencia AI |
| BE-006 | Documentar EdgeRuntime | Mejor mantenibilidad |

---

## Issues Bloqueados

| ID | Bloqueado por | Razon |
|----|---------------|-------|
| AI-005 | Ninguno | Esperando decision de arquitectura |
| DB-002 | PF-001 | Necesita identificar queries lentas primero |

---

*Tracker generado automaticamente. Actualizar estado manualmente.*
