# Sistema de Prompts - Constructor de Guiones

## Jerarquía de Prompts (5 Niveles)

El sistema de prompts utiliza una jerarquía de 5 niveles que permite personalización a nivel de organización mientras mantiene valores por defecto robustos.

```
NIVEL 1: BASE
    │
    ▼
NIVEL 2: MÓDULO
    │
    ▼
NIVEL 3: ROL
    │
    ▼
NIVEL 4: ORGANIZACIÓN (DB)
    │
    ▼
NIVEL 5: CONTEXTO DINÁMICO
```

---

## Nivel 1: Prompts Base

**Archivo:** `src/lib/ai/prompts/base.ts`

### KREOON_IDENTITY
```
Identidad del asistente de IA:
- Nombre: Asistente de Kreoon
- Especialidad: Marketing de contenido UGC
- Principios: Claridad, persuasión, conversión
- Contexto: Plataforma SaaS para creadores LATAM
```

### ESFERA_CONTEXT
```
Marco metodológico ESFERA:
- 4 fases del funnel (TOFU → BOFU → Post-venta)
- Objetivos por fase
- Tonos recomendados
- Técnicas de persuasión
```

### HTML_FORMAT_RULES
```
Tags permitidos: h2, h3, h4, p, ul, li, strong, em
Reglas:
- Máximo 1-2 emojis por sección
- Acciones [ENTRE CORCHETES]
- NO usar Markdown
- Estructura jerárquica clara
```

### JSON_OUTPUT_RULES
```
Reglas para outputs estructurados cuando se requiere JSON
```

---

## Nivel 2: Prompts de Módulo

**Archivo:** `supabase/functions/_shared/prompts/scripts.ts`

### MASTER_SCRIPT_SYSTEM_PROMPT_V2

Prompt maestro que incluye:

1. **Chain of Thought (6 pasos):**
   - Análisis del producto
   - Identificación del avatar
   - Selección de fase ESFERA
   - Construcción de hooks
   - Desarrollo del guión
   - Optimización final

2. **Reglas de Output:**
   - Formato HTML estricto
   - Duración 30-60 segundos
   - Estructura por bloques

3. **Proceso de Pensamiento:**
   - Análisis antes de generar
   - Validación de coherencia
   - Ajuste al nivel de consciencia

### FEW_SHOT_EXAMPLES

2 ejemplos de referencia completos:

**Ejemplo 1: Skincare**
- Producto de cuidado facial
- Fase: Solución
- Audiencia: Mujeres 25-40

**Ejemplo 2: Curso Online**
- Infoproducto educativo
- Fase: Enganchar
- Audiencia: Emprendedores

---

## Nivel 3: Prompts por Rol

**Archivo:** `src/lib/ai/prompts/scripts.ts`

### SCRIPT_ROLE_PROMPTS

```typescript
export const SCRIPT_ROLE_PROMPTS = {
  creator: `
    Genera un guión UGC con:
    - Hooks múltiples (A, B, C...)
    - Escenas con timecodes
    - Acciones del creador [ENTRE CORCHETES]
    - Diálogos naturales
    - CTA al final
  `,
  
  editor: `
    Genera pautas de edición:
    - Ritmo y cortes recomendados
    - Efectos visuales sugeridos
    - Música y audio
    - Textos en pantalla
    - Transiciones
  `,
  
  strategist: `
    Genera análisis estratégico:
    - Alineación con fase ESFERA
    - Puntos fuertes del guión
    - Áreas de mejora
    - Recomendaciones
    - Variantes sugeridas
  `,
  
  trafficker: `
    Genera pautas de pauta:
    - Objetivo de campaña
    - Audiencias sugeridas
    - Copy para anuncios
    - Creativos recomendados
    - Presupuesto y duración
  `,
  
  designer: `
    Genera pautas de diseño:
    - Paleta de colores
    - Tipografía
    - Recursos gráficos
    - Motion graphics
    - Thumbnails
  `,
  
  admin: `
    Genera notas del PM:
    - Timeline de producción
    - Recursos necesarios
    - Dependencias
    - Checklist de entrega
    - Notas para cliente
  `,
  
  director: `
    Genera notas de dirección:
    - Visión creativa
    - Mood/estética
    - Referencias visuales
    - Indicaciones de actuación
    - Detalles de producción
  `
};
```

---

## Nivel 4: Prompts de Organización

**Tabla:** `organization_ai_prompts`

```sql
CREATE TABLE organization_ai_prompts (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  module_key TEXT NOT NULL,       -- 'scripts'
  prompt_config JSONB NOT NULL,   -- Configuración completa
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, module_key)
);
```

**Estructura de prompt_config:**
```json
{
  "master_prompt": "...",
  "role_prompts": {
    "creator": "...",
    "editor": "...",
    "strategist": "...",
    "trafficker": "...",
    "designer": "...",
    "admin": "..."
  },
  "format_rules": "...",
  "output_rules": "..."
}
```

---

## Nivel 5: Contexto Dinámico

Variables inyectadas en tiempo de ejecución:

### SPHERE_PHASE_DETAILS
```
Detalles de la fase ESFERA seleccionada:
- Objetivo específico
- Tono recomendado
- Técnicas aplicables
- Keywords sugeridas
- Tipo de CTA
```

### CONSCIOUSNESS_LEVELS
```
Nivel de consciencia del avatar:
- unaware → problem_aware → solution_aware
- product_aware → most_aware → customer
```

### Perplexity Research
```
Resultados de investigación en tiempo real:
- Tendencias del mercado
- Hooks virales actuales
- Análisis de competencia
- Insights de audiencia
```

### Documentos Cargados
```
Contenido de URLs:
- brief_content (Brief del cliente)
- onboarding_content (Onboarding del producto)
- research_content (Investigación previa)
```

---

## Sistema de Cache

**Archivo:** `supabase/functions/_shared/prompts/db-prompts.ts`

### Flujo de Carga

```
getPrompt(supabase, "scripts", "creator")
   │
   ▼
1. CHECK MEMORY CACHE
   - Key: "scripts:creator"
   - TTL: 5 minutos (300,000 ms)
   - HIT → return cached
   │
   ▼ (MISS)
2. QUERY DATABASE
   - SELECT prompt_config FROM organization_ai_prompts
   - WHERE module_key = 'scripts' AND is_active = true
   - FOUND → cache + return
   │
   ▼ (NOT FOUND)
3. FALLBACK TO HARDCODED
   - MASTER_SCRIPT_SYSTEM_PROMPT_V2
   - FEW_SHOT_EXAMPLES
   - SCRIPT_ROLE_PROMPTS[roleKey]
   │
   ▼
RETURN: {
  systemPrompt,
  userPromptTemplate,
  variables,
  outputFormat
}
```

### Función de Interpolación

```typescript
function interpolatePrompt(
  template: string, 
  variables: Record<string, any>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined 
      ? String(variables[key]) 
      : match;
  });
}
```

---

## Configuración de Prompts (UI)

**Componente:** `src/components/settings/ai/ScriptPromptsConfig.tsx`

**Acceso:** Settings > AI > Script Prompts

### Tabs Disponibles

1. **Master Prompt**
   - Prompt principal del sistema
   - Chain of Thought
   - Reglas generales

2. **By Role**
   - Prompts específicos por rol
   - creator, editor, strategist, trafficker, designer, admin

3. **Format**
   - Reglas de formato HTML
   - Tags permitidos
   - Estructura requerida

4. **Rules**
   - Reglas de output
   - Validaciones
   - Restricciones

### Variables de Template Documentadas

El UI muestra las variables disponibles para uso en prompts personalizados:

```
PRODUCTO:
- {producto_nombre}
- {producto_descripcion}
- {producto_estrategia}
- {producto_investigacion}
- {producto_avatar}
- {producto_angulos}

FORMULARIO:
- {angulo_venta}
- {cta}
- {cantidad_hooks}
- {pais_objetivo}
- {estructura_narrativa}
- {fase_esfera}
- {nivel_consciencia}
- {contexto_adicional}

DOCUMENTOS:
- {brief_content}
- {onboarding_content}
- {research_content}
```
