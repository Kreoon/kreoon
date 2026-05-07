# Constructor de Guiones - Documentación Técnica

## Descripción

El constructor de guiones de Kreoon es un sistema multi-capa que combina generación de contenido con IA, gestión de permisos por rol, y metodologías de marketing (ESFERA + Eugene Schwartz) para producir guiones UGC estructurados por bloques.

## Índice de Documentación

| # | Documento | Descripción |
|---|-----------|-------------|
| 01 | [Arquitectura General](./01-arquitectura-general.md) | Visión general del sistema, componentes y flujos |
| 02 | [Sistema de Prompts](./02-prompts-sistema.md) | Jerarquía de prompts, cache y personalización |
| 03 | [Variables e Interpolación](./03-variables-interpolacion.md) | Variables disponibles y proceso de interpolación |
| 04 | [Método ESFERA](./04-metodo-esfera.md) | Las 4 fases y niveles de consciencia |
| 05 | [Permisos por Rol](./05-permisos-roles.md) | Sistema de permisos y matriz por rol |
| 06 | [Estructura de Guiones](./06-estructura-guiones.md) | Los 6 bloques y formato HTML |
| 07 | [Esquema de Base de Datos](./07-esquema-base-datos.md) | Tablas, relaciones y políticas RLS |

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
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

## Archivos Críticos

| Archivo | Descripción |
|---------|-------------|
| `supabase/functions/content-ai/index.ts` | Edge function principal |
| `src/components/content/ScriptGenerator.tsx` | Componente frontend (4 pasos) |
| `src/lib/ai/prompts/scripts.ts` | Prompts por rol |
| `src/components/content/ContentDetailDialog/scripts/types.ts` | Tipos y permisos |
| `supabase/functions/_shared/prompts/db-prompts.ts` | Sistema de cache |

## Flujo de Generación (4 Pasos)

```
PASO 1: Guión Base (Creador)
    │
    ▼
PASO 2: Pautas de Edición (Editor)
    │
    ▼
PASO 3: Pautas de Estratega (Strategist)
    │
    ▼
PASO 4: Pautas de Trafficker (Trafficker)
```

## Método ESFERA

| Fase | Objetivo | Audiencia | CTA |
|------|----------|-----------|-----|
| **ENGANCHAR** | Viralidad | Fría | Suave |
| **SOLUCIÓN** | Venta | Tibia | Directo |
| **REMARKETING** | Cerrar | Caliente | Urgente |
| **FIDELIZAR** | Retener | Clientes | Comunitario |

## Los 6 Bloques del Guión

1. **Creador** - Guión con hooks, desarrollo y CTA
2. **Editor** - Pautas de edición técnica
3. **Trafficker** - Configuración de campañas
4. **Estratega** - Análisis y recomendaciones
5. **Diseñador** - Pautas visuales
6. **Admin/PM** - Timeline y recursos

## Proveedores de IA

- **Gemini** (Principal)
- **OpenAI** (Fallback 1)
- **Anthropic** (Fallback 2)
- **Perplexity** (Research)

---

*Documentación generada: Mayo 2026*
*Versión: 2.0*
