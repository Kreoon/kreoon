# Método ESFERA - Constructor de Guiones

## Visión General

El método ESFERA es el marco metodológico de marketing que guía la generación de guiones en Kreoon. Combina el modelo de funnel tradicional (TOFU/MOFU/BOFU) con los niveles de consciencia de Eugene Schwartz.

```
ENGANCHAR (TOFU)
    │
    ▼
SOLUCIÓN (MOFU)
    │
    ▼
REMARKETING (BOFU)
    │
    ▼
FIDELIZAR (Post-venta)
```

---

## Las 4 Fases ESFERA

### FASE 1: ENGANCHAR (TOFU - Top of Funnel)

**Enum value:** `engage`

| Aspecto | Descripción |
|---------|-------------|
| **Objetivo** | Viralidad, enganche, disrupción, educar |
| **Audiencia** | FRÍA - no conocen la marca ni el problema |
| **Tono** | Disruptivo, viral, llamativo, sorprendente |
| **Técnicas** | Hooks ultra potentes, pattern interrupts, controversia |
| **Keywords** | "Sabías que...", "Lo que nadie te cuenta", "Error #1" |
| **CTA** | Suave - seguir, comentar, guardar. **NO vender** |

**Características del guión:**
- Hooks muy fuertes que captan atención inmediata
- Contenido educativo o entretenido
- Sin mencionar producto directamente
- Enfocado en el problema o curiosidad
- Máximo engagement, mínima fricción

**Ejemplo de Hook:**
```
"El error #1 que comete el 90% de las personas 
con piel grasa... y nadie te lo dice"
```

---

### FASE 2: SOLUCIÓN (MOFU - Middle of Funnel)

**Enum value:** `solution`

| Aspecto | Descripción |
|---------|-------------|
| **Objetivo** | Venta directa, persuadir, demostrar valor |
| **Audiencia** | TIBIA - saben del problema, buscan soluciones |
| **Tono** | Persuasivo, confiado, demostrativo |
| **Técnicas** | Demos, antes/después, testimonios, comparaciones |
| **Keywords** | "La solución es", "Esto cambió todo", "Finalmente" |
| **CTA** | Directo - comprar, probar, registrarse, link en bio |

**Características del guión:**
- Presentación clara del producto como solución
- Demostración de beneficios concretos
- Prueba social (testimonios, resultados)
- Diferenciación de competencia
- CTA claro y directo

**Ejemplo de Hook:**
```
"Después de probar 15 cremas, finalmente encontré 
la única que realmente funciona para piel grasa"
```

---

### FASE 3: REMARKETING (BOFU - Bottom of Funnel)

**Enum value:** `remarketing`

| Aspecto | Descripción |
|---------|-------------|
| **Objetivo** | Cerrar venta, superar objeciones, FOMO |
| **Audiencia** | CALIENTE - visitaron, agregaron al carrito, no compraron |
| **Tono** | Urgente, resolutivo, enfocado en pérdida |
| **Técnicas** | Escasez, social proof, garantías, precio vs valor |
| **Keywords** | "Últimas unidades", "Se acaba en", "Otros ya lo tienen" |
| **CTA** | Urgente - comprar ahora, última oportunidad |

**Características del guión:**
- Sentido de urgencia real
- Superar objeciones específicas
- Mostrar qué se pierde al no actuar
- Reforzar garantías y seguridad
- CTA con urgencia

**Ejemplo de Hook:**
```
"Si sigues dudando, alguien más se lo va a llevar.
Quedan menos de 50 unidades..."
```

---

### FASE 4: FIDELIZAR (Post-venta)

**Enum value:** `fidelize`

| Aspecto | Descripción |
|---------|-------------|
| **Objetivo** | Retener, recompra, referidos, comunidad |
| **Audiencia** | CLIENTES - ya compraron |
| **Tono** | Cercano, exclusivo, comunitario |
| **Técnicas** | Tips exclusivos, behind scenes, programas referidos |
| **Keywords** | "Para ti que ya eres cliente", "Tip exclusivo" |
| **CTA** | Comunitario - compartir, etiquetar, dejar reseña |

**Características del guión:**
- Contenido exclusivo para clientes
- Maximizar valor del producto comprado
- Incentivar reseñas y testimonios
- Programa de referidos
- Construir comunidad

**Ejemplo de Hook:**
```
"Un tip que solo comparto con mis clientes: 
cómo duplicar los resultados de tu crema..."
```

---

## Niveles de Consciencia (Eugene Schwartz)

El sistema complementa las fases ESFERA con los 6 niveles de consciencia del cliente:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ESCALA DE CONSCIENCIA                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  UNAWARE ──▶ PROBLEM_AWARE ──▶ SOLUTION_AWARE ──▶ PRODUCT_AWARE ──▶ MOST_AWARE ──▶ CUSTOMER │
│                                                                             │
│  "No sé      "Tengo un       "Hay soluciones   "Conozco tu      "Estoy        "Ya            │
│   que tengo   problema"       pero no sé        producto"        convencido"   compré"        │
│   problema"                   cuál elegir"                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detalle por Nivel

| Nivel | Descripción | Enfoque del Contenido |
|-------|-------------|----------------------|
| **UNAWARE** | No sabe que tiene el problema | Educación, despertar consciencia |
| **PROBLEM_AWARE** | Sabe del problema, no de soluciones | Agitar el dolor, mostrar consecuencias |
| **SOLUTION_AWARE** | Conoce soluciones, no tu producto | Diferenciación, posicionamiento |
| **PRODUCT_AWARE** | Conoce tu producto, no está convencido | Testimonios, demos, prueba social |
| **MOST_AWARE** | Convencido, necesita el empujón final | Urgencia, ofertas, garantías |
| **CUSTOMER** | Ya es cliente | Reafirmación, upsell, fidelización |

---

## Matriz ESFERA × Consciencia

| Fase | Niveles Típicos | Objetivo Principal |
|------|-----------------|-------------------|
| **ENGANCHAR** | unaware, problem_aware | Captar atención, educar |
| **SOLUCIÓN** | problem_aware, solution_aware, product_aware | Persuadir, demostrar valor |
| **REMARKETING** | product_aware, most_aware | Cerrar venta, superar objeciones |
| **FIDELIZAR** | customer | Retener, maximizar LTV |

---

## Implementación en el Sistema

### Enum en Base de Datos

```sql
CREATE TYPE sphere_phase AS ENUM (
  'engage',
  'solution',
  'remarketing',
  'fidelize'
);
```

### Uso en Content

```sql
ALTER TABLE content ADD COLUMN sphere_phase sphere_phase;
```

### Configuración en Prompts

```typescript
const SPHERE_PHASE_DETAILS = {
  engage: {
    objective: "Viralidad y enganche",
    audience: "Fría",
    tone: "Disruptivo, viral",
    techniques: ["Pattern interrupts", "Controversia", "Curiosidad"],
    cta_type: "Suave (seguir, comentar)",
  },
  solution: {
    objective: "Venta directa",
    audience: "Tibia",
    tone: "Persuasivo, confiado",
    techniques: ["Demos", "Antes/después", "Testimonios"],
    cta_type: "Directo (comprar, link en bio)",
  },
  remarketing: {
    objective: "Cerrar venta",
    audience: "Caliente",
    tone: "Urgente, resolutivo",
    techniques: ["Escasez", "FOMO", "Garantías"],
    cta_type: "Urgente (comprar ahora)",
  },
  fidelize: {
    objective: "Retener y fidelizar",
    audience: "Clientes",
    tone: "Cercano, exclusivo",
    techniques: ["Tips exclusivos", "Behind scenes", "Referidos"],
    cta_type: "Comunitario (compartir, reseña)",
  },
};
```

### Selector en UI

```typescript
const SPHERE_PHASES_OPTIONS = [
  { 
    value: 'engage', 
    label: 'Enganchar (TOFU)', 
    description: 'Captar atención de audiencia fría' 
  },
  { 
    value: 'solution', 
    label: 'Solución (MOFU)', 
    description: 'Persuadir con el producto como solución' 
  },
  { 
    value: 'remarketing', 
    label: 'Remarketing (BOFU)', 
    description: 'Cerrar venta con urgencia' 
  },
  { 
    value: 'fidelize', 
    label: 'Fidelizar (Post-venta)', 
    description: 'Retener y maximizar LTV' 
  },
];
```

---

## Guía de Selección

### ¿Cuándo usar cada fase?

| Situación | Fase Recomendada |
|-----------|-----------------|
| Lanzamiento de producto nuevo | ENGANCHAR |
| Producto conocido, buscar ventas | SOLUCIÓN |
| Carritos abandonados | REMARKETING |
| Black Friday / ofertas | REMARKETING |
| Contenido para clientes existentes | FIDELIZAR |
| Construir audiencia | ENGANCHAR |
| Webinar / lead magnet | SOLUCIÓN |
| Email de seguimiento | REMARKETING |

### Flujo Típico de Campaña

```
Semana 1-2: ENGANCHAR
   │
   ▼
Semana 3-4: SOLUCIÓN
   │
   ▼
Semana 5: REMARKETING
   │
   ▼
Continuo: FIDELIZAR (para clientes)
```
