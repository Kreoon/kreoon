# Prompts archivados — consultoría de negocio

Aquí viven los pasos que **salieron del research el 2026-08-13**, cuando los dos
motores se fusionaron en uno solo (ver `docs/RESEARCH_UNIFICADO.md`).

No están borrados a propósito. Funcionaban; el problema era otro: **la plataforma
genera contenido**, y esto es consultoría de negocio. El cliente nunca los validaba y
cada uno costaba entre 6.000 y 16.000 tokens por corrida.

## Qué hay archivado

| Paso | Qué generaba | Tokens que costaba |
|---|---|---:|
| `launch_strategy` | Lanzamiento en 3 fases, presupuesto, cronograma, equipo | 14.000 |
| `landing_pages` | 2 variaciones completas de landing con copy | 16.000 |
| `whatsapp_funnel` | 3 secuencias de WhatsApp listas para pegar | 14.000 |
| `paid_ads` | Estructura de cuenta Meta + TikTok, presupuestos, benchmarks | 12.000 |
| `email_marketing` | Bienvenida, lanzamiento y reactivación | 10.000 |
| `pricing_strategy` | Precios, escalera de valor, proyecciones | 7.000 |
| `kpis_dashboard` | AARRR completo, triggers, stack de herramientas | 6.000 |
| `seo_strategy` | Keywords, topic clusters, YouTube | 8.000 |
| `partnerships` | Afiliados, influencers, co-marketing, PR | 6.000 |
| `community_strategy` | Comunidad, onboarding, moderación, monetización | 7.000 |

**Total archivado: 100.000 tokens de salida por corrida.**

## Qué NO se archivó, se heredó

Dos cosas de estos pasos eran demasiado útiles para perderlas, y siguen vivas dentro
del research nuevo:

- **De `paid_ads`**: cada creativo de video conserva su `pauta_recomendada`
  (temperatura frío/tibio/caliente + una línea de nota). Lo que se fue es la
  estructura completa de cuenta publicitaria.
- **De `kpis_dashboard`**: el bloque `content_kpis` (5-6 métricas de contenido con
  disparadores del tipo *"hook con retención <3s a los 3 días → rotar hook"*). Lo que
  se fue es el framework AARRR de negocio.

## Cómo revivir uno

1. Devolver su texto de `consultoria-negocio.ts` a `getStepPrompt`.
2. Volver a declarar su schema en `SCHEMAS`.
3. Añadirlo a `TOKEN_MAP`, `STEP_SKILLS`, `RESEARCH_STEPS` y `STEP_SEQUENCE`.
4. Añadir su `case` en el switch de guardado y su pestaña en `ProductDetailDialog`.

Ojo con uno: `landing_pages` pedía testimonios *"ficticios pero creibles"*. Si vuelve,
esa instrucción tiene que cambiar — la regla del research unificado es que **nada se
inventa**: ni testimonios, ni URLs, ni datos de producto.
