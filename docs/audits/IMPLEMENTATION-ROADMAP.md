# Implementation Roadmap - Kreoon Platform

**Fecha:** 2026-03-27
**Periodo:** 4 Sprints (4 semanas)
**Generado por:** QA-Integration Agent

---

## Vision General

```
Sprint 1 (Semana 1): Estabilizacion - P0 + Quick Wins
Sprint 2 (Semana 2): Calidad AI - P1 AI/Prompts
Sprint 3 (Semana 3): Performance - P1 Backend + P2 prioritarios
Sprint 4 (Semana 4): Polish - P2 restantes + Documentacion
Backlog: P3 + Mejoras continuas
```

---

## Sprint 1: Estabilizacion (Semana 1)

**Objetivo:** Eliminar issues criticos y obtener quick wins de alto impacto.

### Dia 1-2: Type Safety
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Regenerar `types.ts` con Supabase CLI | Backend Lead | 2h | Acceso a Supabase |
| Verificar tablas incluidas en types | Backend Lead | 1h | types.ts regenerado |
| Actualizar 5 hooks criticos (financeService, useBrandActivation) | Backend | 4h | types.ts |
| PR + Code Review | Team | 2h | - |

**Entregable:** 0 instancias de `(supabase as any)` en servicios criticos.

### Dia 3-4: Prompts Quick Wins
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Agregar temperatura a prompts principales | AI Team | 2h | - |
| Condensar ESFERA_CONTEXT (400 -> 200 palabras) | Content | 3h | - |
| Agregar validacion JSON en Edge Functions AI | Backend | 4h | - |
| Implementar Chain of Thought en analyze_card | AI Team | 3h | - |

**Entregable:** 4 prompts optimizados, +20% calidad estimada.

### Dia 5: Estabilizacion
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Testing de regresion en modulos AI | QA | 4h | Prompts actualizados |
| Fix de bugs encontrados | Dev Team | 4h | Testing |
| Deploy a staging | DevOps | 1h | Fixes completados |

**Metricas Sprint 1:**
- Issues P0 resueltos: 1/1 (100%)
- Quick wins completados: 5/5 (100%)
- Regresiones: 0

---

## Sprint 2: Calidad AI (Semana 2)

**Objetivo:** Mejorar significativamente la calidad de outputs AI.

### Dia 1-2: Centralizacion de Prompts
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Crear `_shared/prompts/` en Edge Functions | Backend | 4h | - |
| Migrar MASTER_SCRIPT_PROMPT a _shared | Backend | 2h | _shared creado |
| Conectar portfolio_ai_prompts.ts con Edge Function | Backend | 4h | - |
| Eliminar duplicados en content-ai | Backend | 2h | _shared completado |

### Dia 3-4: Few-Shot Examples
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Crear banco de ejemplos para Scripts | Content | 4h | - |
| Agregar 2 examples a MASTER_SCRIPT_PROMPT | AI Team | 2h | Banco creado |
| Crear example para analyze_card | AI Team | 2h | - |
| Crear example para Talent Matching | AI Team | 2h | - |

### Dia 5: Fragmentacion y Testing
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Dividir Step 08 Copywriting en 3 llamadas | AI Team | 4h | - |
| A/B testing con/sin few-shot (10 casos) | QA | 4h | Examples implementados |
| Documentar mejoras medidas | Content | 2h | Testing completado |

**Metricas Sprint 2:**
- Prompts centralizados: 100%
- Calidad AI medida: +25% vs baseline
- Issues P1 AI resueltos: 4/4

---

## Sprint 3: Performance (Semana 3)

**Objetivo:** Optimizar rendimiento de backend y queries criticas.

### Dia 1-2: Queries Optimization
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Paralelizar queries en useCreatorMarketplaceProfile | Backend | 4h | - |
| Identificar queries N+1 con logging | Backend | 3h | - |
| Crear RPC optimizado para marketplace profile | Backend | 4h | Queries identificadas |
| Agregar indices a tablas de marketplace | DBA | 2h | - |

### Dia 3-4: Edge Functions Refactor
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Crear `_shared/error-response.ts` | Backend | 2h | - |
| Crear `_shared/get-module-ai-config.ts` | Backend | 3h | - |
| Refactorizar 5 Edge Functions prioritarias | Backend | 6h | _shared utilities |
| Agregar timeouts explicitos a funciones AI | Backend | 2h | - |

### Dia 5: Frontend Cleanup
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Implementar logger centralizado | Frontend | 4h | - |
| Reemplazar console.log en hooks criticos | Frontend | 4h | Logger creado |
| Revisar lazy loading de componentes pesados | Frontend | 3h | - |

**Metricas Sprint 3:**
- Latencia p95 reducida: -30%
- console.log eliminados: 50+
- Edge Functions refactorizadas: 5

---

## Sprint 4: Polish (Semana 4)

**Objetivo:** Completar issues P2 restantes y documentacion.

### Dia 1-2: UX Improvements
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Estandarizar estados loading/error | UX | 4h | - |
| Mejorar feedback visual en acciones async | UX | 4h | - |
| Revisar mobile navigation | UX | 3h | - |

### Dia 3-4: Cleanup y Documentacion
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Resolver 15 TODOs prioritarios | Team | 6h | - |
| Documentar arquitectura AI actualizada | Tech Lead | 4h | Sprint 2 completado |
| Actualizar CLAUDE.md con nuevas convenciones | Tech Lead | 2h | - |
| Crear runbook de Edge Functions | Backend | 3h | - |

### Dia 5: Validacion Final
| Task | Owner | Esfuerzo | Dependencias |
|------|-------|----------|--------------|
| Audit de seguridad (RLS nuevas tablas) | Security | 4h | - |
| Performance testing final | QA | 4h | Todos los cambios |
| Deploy a produccion | DevOps | 2h | Testing aprobado |

**Metricas Sprint 4:**
- TODOs resueltos: 15+
- Documentacion actualizada: 100%
- Score global objetivo: 8.0/10

---

## Backlog (Post-Roadmap)

### P2 Diferidos
| Issue | Razon | Estimado |
|-------|-------|----------|
| AI-006 Estandarizar module_key | Requiere migracion de datos | L |
| FE-004 Optimizar bundle size | Analisis profundo necesario | XL |
| UX-003 Revision WCAG completa | Especialista externo | XL |

### P3 Nice to Have
| Issue | Beneficio |
|-------|-----------|
| BE-008 Metricas de latencia | Observabilidad mejorada |
| DB-003 Documentar esquema permisos | Onboarding mas rapido |
| AI-008 Temperatura en todos los prompts | Consistencia total |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Regresiones en AI | Media | Alto | A/B testing, rollback rapido |
| Types.ts incompleto | Baja | Alto | Verificar tablas antes de merge |
| Conflictos de merge | Media | Medio | Feature branches cortos |
| Performance peor | Baja | Alto | Benchmarks antes/despues |

---

## Recursos Necesarios

| Rol | Dedicacion | Sprints |
|-----|-----------|---------|
| Backend Lead | 100% | 1-3 |
| Frontend Dev | 75% | 1, 3-4 |
| AI/Content Specialist | 100% | 2 |
| QA | 50% | 1-4 |
| UX | 50% | 4 |
| DBA | 25% | 1, 3 |
| DevOps | 10% | 1-4 |

---

## Criterios de Exito

| Metrica | Actual | Objetivo | Plazo |
|---------|--------|----------|-------|
| Score Global | 7.0/10 | 8.0/10 | Sprint 4 |
| Type Safety | 47 archivos con any | 0 | Sprint 1 |
| Calidad AI | 68/100 | 85/100 | Sprint 2 |
| P95 Latency | Baseline | -30% | Sprint 3 |
| Issues P0-P1 | 10 | 0 | Sprint 3 |

---

*Roadmap sujeto a ajustes basados en hallazgos durante implementacion.*
