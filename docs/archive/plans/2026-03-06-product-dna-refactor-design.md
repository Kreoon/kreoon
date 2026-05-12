# Product DNA Refactor - Documento de Diseno

**Fecha:** 2026-03-06
**Branch:** feature/talent-dna-profile-integration
**Archivo principal:** `supabase/functions/generate-product-dna/index.ts`

---

## Problema

1. **Contaminacion de contexto**: El sistema actual usa `client_dna` (ADN de marca) como contexto base, lo que contamina la investigacion mezclando identidad de marca con el encargo especifico. Caso real: Distrilatam - investigacion incorrecta por mezclar dos servicios.

2. **Output generico**: Las 4 secciones actuales (`market_research`, `competitor_analysis`, `strategy_recommendations`, `content_brief`) no estan orientadas a produccion de contenido ni estrategia de canal.

---

## Solucion

ADN de Producto 100% basado en:
- **Transcripcion del audio** = fuente de verdad principal
- **4 selecciones del wizard**: canal, objetivo, tipo de servicio, audiencia
- **Canal de comunicacion** determina TODA la estrategia
- **Output accionable** para produccion inmediata (organico + ads)

---

## Nuevo Pipeline

```
PASO 1: Extraccion del Audio (Gemini liviano)
   |
   v
PASO 2: Investigacion Perplexity (12k tokens)
   - Query: "que contenido funciona en [canal] para [producto] con [audiencia]"
   |
   v
PASO 3: 4 Calls Paralelos Gemini (12k tokens c/u)
   - Call 1: Seccion 1 (Contexto) + Seccion 2 (Mercado)
   - Call 2: Seccion 3 (3 Avatares)
   - Call 3: Seccion 4 (10 Angulos) + Seccion 5 (10 Ideas)
   - Call 4: Seccion 6 (Organico) + Seccion 7 (Ads) + Seccion 8 (Brief)
   |
   v
PASO 4: Ensamblar resultado y guardar en Supabase
```

---

## 8 Nuevas Secciones

| # | Seccion | Contenido |
|---|---------|-----------|
| 1 | Contexto | Extraccion del audio (servicio_exacto, objetivo_real, palabras_clave, restricciones, tono) |
| 2 | Mercado | Panorama, tendencias actuales, 5 competidores reales, gap competitivo, posicionamiento |
| 3 | Avatares | 3 buyer personas con dolor/deseo/objecion/frases textuales/trigger/nivel consciencia |
| 4 | Angulos | 10 angulos de venta (tipo, hook, desarrollo, CTA, avatar objetivo, fase ESFERA, uso org/ads) |
| 5 | Ideas | 10 ideas de contenido (3 hooks variacion, formato, duracion, fase ESFERA, uso org/ads) |
| 6 | Organico | Distribucion 4V, frecuencia, pilares tematicos, metricas, errores comunes |
| 7 | Ads | Estructura frio/tibio/rmkt, publicos, presupuesto minimo, CTR objetivo, senales escalar/pausar |
| 8 | Brief Creador | Tono, palabras usar/evitar, indicaciones visuales, specs tecnicos, CTA exacto |

---

## Mapeo a Campos Existentes

Se reusan los 4 campos actuales de la tabla `product_dna`:

```typescript
market_research: {
  seccion_1_contexto: { ... },
  seccion_2_mercado: { ... }
}

competitor_analysis: {
  competidores: [...],
  gap_competitivo: string,
  posicionamiento: string
}

strategy_recommendations: {
  seccion_3_avatares: [...],
  seccion_4_angulos: [...],
  seccion_6_organico: { ... },
  seccion_7_ads: { ... }
}

content_brief: {
  seccion_5_ideas: [...],
  seccion_8_brief_creador: { ... }
}
```

---

## Cambios Tecnicos

### Eliminar
- `buildBaseContext()` - toda la funcion
- Cualquier fetch de `client_dna` o tabla `clients`
- Referencias a datos de marca en prompts

### Mantener
- `repairJsonForParse()`, `extractJsonFromText()`
- CORS headers y manejo de OPTIONS
- Consumo de tokens via `consume_ai_tokens` RPC (600 tokens)
- Update de `status` en tabla `product_dna`
- Sistema de fallback (ahora sin client_dna)

### Actualizar
- `max_tokens` Perplexity: 8000 -> 12000
- `max_tokens` Gemini: 6000 -> 12000
- Query de Perplexity: orientado a contenido de canal especifico

---

## Estructuras de Datos

### Seccion 1: Contexto
```typescript
{
  servicio_exacto: string,
  objetivo_real: string,
  palabras_clave_cliente: string[],
  restricciones_creativas: string,
  referentes_estilo: string,
  tono_emocional_audio: string
}
```

### Seccion 2: Mercado
```typescript
{
  panorama_mercado: string,
  tendencias_actuales: string,
  competidores: [{
    nombre: string,
    promesa_principal: string,
    precio_referencial: string,
    fortaleza: string,
    debilidad: string,
    plataformas: string[]
  }],
  gap_competitivo: string,
  posicionamiento_sugerido: string
}
```

### Seccion 3: Avatares
```typescript
[{
  id: string,
  nombre_edad: string,
  situacion_actual: string,
  dolor_principal: string,
  deseo_principal: string,
  objecion_principal: string,
  como_habla: string[],
  trigger_de_compra: string,
  nivel_consciencia: "inconsciente_del_problema" | "consciente_del_problema" | "consciente_de_la_solucion" | "consciente_del_producto"
}]
```

### Seccion 4: Angulos
```typescript
[{
  id: number,
  tipo: "educativo" | "emocional" | "aspiracional" | "prueba_social" | "anti_objecion" | "transformacion" | "urgencia" | "comparativo" | "testimonial" | "error_comun",
  hook_apertura: string,
  desarrollo: string,
  cta: string,
  avatar_objetivo: string,
  fase_esfera: "enganche" | "solucion" | "remarketing" | "fidelizacion",
  uso_recomendado: "organico" | "ads" | "ambos"
}]
```

### Seccion 5: Ideas
```typescript
[{
  id: number,
  titulo: string,
  formato: "testimonial_selfie" | "antes_despues" | "tutorial" | "unboxing" | "broll" | "educativo" | "reto" | "pov",
  hook_variacion_1: string,
  hook_variacion_2: string,
  hook_variacion_3: string,
  desarrollo: string,
  cta: string,
  duracion_recomendada: string,
  fase_esfera: string,
  uso_recomendado: string
}]
```

### Seccion 6: Estrategia Organica
```typescript
{
  objetivo_organico: string,
  distribucion_contenido: {
    viral: number,
    valor: number,
    venta: number,
    personal: number,
    justificacion: string
  },
  frecuencia_publicacion: string,
  tipo_contenido_organico: string,
  pilares_tematicos: string[],
  tono_organico: string,
  metricas_organico: {
    retencion_objetivo: string,
    interacciones_clave: string,
    frecuencia_revision: string
  },
  errores_comunes_organico: string[]
}
```

### Seccion 7: Estrategia Ads
```typescript
{
  objetivo_campana: "conversiones" | "trafico" | "reconocimiento",
  estructura_campana: {
    frio: string,
    tibio: string,
    remarketing: string
  },
  publico_frio: {
    intereses: string[],
    comportamientos: string[],
    caracteristicas: string
  },
  publico_remarketing: string,
  presupuesto_minimo_sugerido: string,
  ideas_para_ads: string,
  estructura_creativo_ad: {
    hook: string,
    problema: string,
    solucion: string,
    cta: string
  },
  variaciones_recomendadas: string,
  ctr_objetivo: string,
  senales_de_escalar: string,
  senales_de_pausar: string
}
```

### Seccion 8: Brief Creador
```typescript
{
  tono_de_voz: string,
  palabras_usar: string[],
  palabras_evitar: string[],
  indicaciones_visuales: string,
  especificaciones_tecnicas: string,
  cta_recomendado: string,
  restricciones_del_cliente: string
}
```

---

## Caso de Prueba

**Inputs:**
- service_types: ['video_ugc', 'reels']
- goals: ['vender']
- platforms: ['tiktok', 'meta_ads']
- audiences: ['25-34']

**Transcripcion:**
"Tenemos unas capsulas de Sacha Inchi, un omega natural para mejorar piel y cabello. La gente siempre duda del precio porque no conoce el ingrediente. Queremos algo autentico, nada de produccion medica o farmaceutica. Que se vea natural y cercano."

**Resultado esperado:**
- Seccion 2: competidores de suplementos naturales LATAM (NO abarrotes, NO genericos)
- Seccion 3: avatares de mujeres 25-34 interesadas en bienestar natural
- Seccion 7: estructura de ads para TikTok y Meta con CTR objetivo correcto
- Sin ninguna referencia al ADN de marca del cliente

---

## Siguiente Paso

Implementar los cambios en `supabase/functions/generate-product-dna/index.ts`
