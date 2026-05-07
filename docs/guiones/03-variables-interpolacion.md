# Variables e Interpolación - Constructor de Guiones

## Tabla Completa de Variables

### Variables de Producto

| Variable | Fuente | Descripción |
|----------|--------|-------------|
| `{producto_nombre}` | `products.name` | Nombre del producto |
| `{producto_descripcion}` | `products.description` | Descripción completa |
| `{producto_estrategia}` | `products.strategy` | Estrategia de marketing |
| `{producto_investigacion}` | `products.market_research` | Investigación de mercado |
| `{producto_avatar}` | `products.ideal_avatar` | Avatar ideal del cliente |
| `{producto_angulos}` | `products.sales_angles[]` | Array de ángulos de venta |

### Variables de Formulario

| Variable | Fuente | Descripción | Valores |
|----------|--------|-------------|---------|
| `{angulo_venta}` | `form.sales_angle` | Ángulo seleccionado | Texto libre |
| `{cta}` | `form.cta` | Call to action | Texto libre |
| `{cantidad_hooks}` | `form.hooks_count` | Número de hooks | 2-5 |
| `{pais_objetivo}` | `form.target_country` | País objetivo | Colombia/LATAM default |
| `{estructura_narrativa}` | `form.narrative_structure` | Tipo de historia | problema-solución, storytelling, etc. |
| `{fase_esfera}` | `form.sphere_phase` | Fase del funnel | engage, solution, remarketing, fidelize |
| `{nivel_consciencia}` | `form.consciousness_level` | Nivel de awareness | unaware → customer |
| `{contexto_adicional}` | `form.additional_context` | Notas extra | Texto libre |

### Variables de Documentos

| Variable | Fuente | Descripción |
|----------|--------|-------------|
| `{brief_content}` | URL → fetch | Contenido del brief del cliente |
| `{onboarding_content}` | URL → fetch | Documento de onboarding del producto |
| `{research_content}` | URL → fetch | Documento de investigación previa |

### Variables de Research (Perplexity)

| Variable | Fuente | Descripción |
|----------|--------|-------------|
| `{dolores}` | Perplexity/manual | Puntos de dolor del avatar |
| `{deseos}` | Perplexity/manual | Deseos y aspiraciones |
| `{objeciones}` | Perplexity/manual | Objeciones comunes |
| `{tendencias}` | Perplexity | Tendencias actuales del mercado |
| `{hooks_virales}` | Perplexity | Hooks que están funcionando |
| `{competencia}` | Perplexity | Análisis de competidores |

### Variables de Contexto (Pasos Anteriores)

| Variable | Fuente | Descripción |
|----------|--------|-------------|
| `{guion_base}` | Paso 1 | Guión generado por el creador |
| `{pautas_editor}` | Paso 2 | Pautas de edición generadas |
| `{pautas_estratega}` | Paso 3 | Pautas estratégicas generadas |
| `{transcripcion_referencia}` | form | Transcripción de video ejemplo |

---

## Proceso de Interpolación

### Función Principal

```typescript
// Ubicación: supabase/functions/_shared/prompts/db-prompts.ts

function interpolatePrompt(
  template: string, 
  variables: Record<string, any>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    // Si la variable existe, reemplazar
    // Si no existe, mantener el placeholder
    return variables[key] !== undefined 
      ? String(variables[key]) 
      : match;
  });
}
```

### Ejemplo de Uso

**Template:**
```
Genera un guión UGC para {producto_nombre}.

AVATAR: {producto_avatar}

ÁNGULO DE VENTA: {angulo_venta}

FASE ESFERA: {fase_esfera}

Genera {cantidad_hooks} hooks y un CTA de "{cta}".
```

**Variables:**
```json
{
  "producto_nombre": "Crema Anti-edad",
  "producto_avatar": "Mujeres 35-50 preocupadas por arrugas",
  "angulo_venta": "Resultados visibles en 2 semanas",
  "fase_esfera": "solution",
  "cantidad_hooks": 3,
  "cta": "Link en bio"
}
```

**Resultado:**
```
Genera un guión UGC para Crema Anti-edad.

AVATAR: Mujeres 35-50 preocupadas por arrugas

ÁNGULO DE VENTA: Resultados visibles en 2 semanas

FASE ESFERA: solution

Genera 3 hooks y un CTA de "Link en bio".
```

---

## Construcción del Payload

### Frontend (ScriptGenerator.tsx)

```typescript
const buildPayload = async () => {
  // 1. Cargar documentos si hay URLs
  const briefContent = product.brief_url 
    ? await fetchDocument(product.brief_url) 
    : '';
  const onboardingContent = product.onboarding_url 
    ? await fetchDocument(product.onboarding_url) 
    : '';
  const researchContent = product.research_url 
    ? await fetchDocument(product.research_url) 
    : '';

  // 2. Construir objeto de variables
  return {
    action: 'generate_script',
    organizationId,
    
    // Variables de producto
    producto_nombre: product.name,
    producto_descripcion: product.description,
    producto_estrategia: product.strategy,
    producto_investigacion: product.market_research,
    producto_avatar: product.ideal_avatar,
    producto_angulos: product.sales_angles?.join(', '),
    
    // Variables de formulario
    angulo_venta: formData.sales_angle,
    cta: formData.cta,
    cantidad_hooks: formData.hooks_count,
    pais_objetivo: formData.target_country || 'Colombia',
    estructura_narrativa: formData.narrative_structure,
    fase_esfera: formData.sphere_phase,
    nivel_consciencia: formData.consciousness_level,
    contexto_adicional: formData.additional_context,
    
    // Variables de documentos
    brief_content: briefContent,
    onboarding_content: onboardingContent,
    research_content: researchContent,
    
    // Opciones
    usePerplexity: formData.use_research,
  };
};
```

### Edge Function (content-ai)

```typescript
// Recibir payload
const {
  action,
  organizationId,
  producto_nombre,
  producto_descripcion,
  // ... resto de variables
  usePerplexity,
} = await req.json();

// Cargar prompt template
const promptConfig = await getPrompt(supabase, 'scripts', 'creator');

// Construir variables
const variables = {
  producto_nombre,
  producto_descripcion,
  producto_estrategia,
  producto_investigacion,
  producto_avatar,
  producto_angulos,
  angulo_venta,
  cta,
  cantidad_hooks,
  pais_objetivo,
  estructura_narrativa,
  fase_esfera,
  nivel_consciencia,
  contexto_adicional,
  brief_content,
  onboarding_content,
  research_content,
};

// Agregar research si está habilitado
if (usePerplexity) {
  const research = await performPerplexityResearch(producto_nombre, producto_avatar);
  variables.dolores = research.pains;
  variables.deseos = research.desires;
  variables.objeciones = research.objections;
  variables.tendencias = research.trends;
  variables.hooks_virales = research.viral_hooks;
  variables.competencia = research.competitors;
}

// Interpolar prompts
const systemPrompt = interpolatePrompt(promptConfig.systemPrompt, variables);
const userPrompt = interpolatePrompt(promptConfig.userPromptTemplate, variables);
```

---

## Variables por Bloque/Rol

### Bloque 1: Creador

Variables utilizadas:
- Todas las de producto
- Todas las de formulario
- Todas las de documentos
- Research (opcional)

### Bloque 2: Editor

Variables adicionales:
- `{guion_base}` - Guión del paso 1

### Bloque 3: Strategist

Variables adicionales:
- `{guion_base}` - Guión del paso 1
- `{pautas_editor}` - Pautas del paso 2

### Bloque 4: Trafficker

Variables adicionales:
- `{guion_base}` - Guión del paso 1
- `{pautas_editor}` - Pautas del paso 2
- `{pautas_estratega}` - Pautas del paso 3

---

## Validación de Variables

### Variables Requeridas

```typescript
const REQUIRED_VARIABLES = [
  'producto_nombre',
  'angulo_venta',
  'fase_esfera',
  'cta',
];

function validateVariables(variables: Record<string, any>): boolean {
  for (const key of REQUIRED_VARIABLES) {
    if (!variables[key] || variables[key].trim() === '') {
      throw new Error(`Variable requerida faltante: ${key}`);
    }
  }
  return true;
}
```

### Variables con Valores por Defecto

```typescript
const DEFAULT_VALUES = {
  pais_objetivo: 'Colombia',
  cantidad_hooks: 3,
  nivel_consciencia: 'problem_aware',
  estructura_narrativa: 'problema-solución',
};

function applyDefaults(variables: Record<string, any>): Record<string, any> {
  return {
    ...DEFAULT_VALUES,
    ...variables,
  };
}
```
