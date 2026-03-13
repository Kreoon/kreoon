# ADN de Marca (Client DNA) - Documentación Técnica

## Resumen Ejecutivo

El **ADN de Marca** (Client DNA) es un sistema de generación de perfiles de marca basado en respuestas de audio. El cliente responde 7 preguntas grabando su voz, el sistema transcribe el audio con OpenAI Whisper y genera un perfil de marca completo usando IA (Perplexity/Gemini).

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO ADN DE MARCA                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. WIZARD DE PREGUNTAS (7 preguntas con audio)                            │
│     ├── Pregunta 1: Tu Negocio (qué vendes, por qué, diferenciador)        │
│     ├── Pregunta 2: Tu Cliente (descripción persona ideal)                  │
│     ├── Pregunta 3: Su Problema (frustración principal)                     │
│     ├── Pregunta 4: Tu Solución (resultado concreto)                        │
│     ├── Pregunta 5: Tu Oferta (producto estrella + precio)                  │
│     ├── Pregunta 6: Tus Canales (dónde vendes + audiencia)                  │
│     └── Pregunta 7: Sus Dudas (objeciones comunes)                          │
│                                                                             │
│  2. PROCESAMIENTO                                                           │
│     ├── Audio → OpenAI Whisper → Transcripción                              │
│     ├── Selector de Ubicaciones (tipo Meta Ads)                             │
│     └── Transcripción + Ubicaciones → Edge Function                         │
│                                                                             │
│  3. GENERACIÓN DE ADN                                                       │
│     ├── Perplexity sonar-pro (principal)                                    │
│     └── Gemini 2.5 Flash (fallback)                                         │
│                                                                             │
│  4. OUTPUT: 8 SECCIONES DEL PERFIL DE MARCA                                │
│     ├── business_identity (Identidad del Negocio)                           │
│     ├── value_proposition (Propuesta de Valor)                              │
│     ├── ideal_customer (Cliente Ideal)                                      │
│     ├── flagship_offer (Oferta Estrella)                                    │
│     ├── brand_identity (Identidad de Marca)                                 │
│     ├── visual_identity (Identidad Visual)                                  │
│     ├── marketing_strategy (Estrategia de Marketing)                        │
│     └── ads_targeting (Segmentación para Ads)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Las 7 Preguntas del Wizard

### Archivo: `src/lib/dna-questions.ts`

```typescript
export const DNA_QUESTIONS = [
  {
    id: 1,
    block: 'Tu Negocio',
    question: '¿Qué vendes, por qué lo creaste y qué te hace diferente a los demás?'
  },
  {
    id: 2,
    block: 'Tu Cliente',
    question: 'Describe a tu cliente ideal como UNA persona real. ¿Cómo es su día a día? ¿Qué le preocupa? ¿Qué sueña lograr?'
  },
  {
    id: 3,
    block: 'Su Problema',
    question: '¿Cuál es el problema o frustración más grande que tu cliente enfrenta antes de encontrarte?'
  },
  {
    id: 4,
    block: 'Tu Solución',
    question: '¿Qué resultado concreto obtiene tu cliente después de trabajar contigo o usar tu producto?'
  },
  {
    id: 5,
    block: 'Tu Oferta',
    question: '¿Cuál es tu producto o servicio estrella y cuánto cuesta?'
  },
  {
    id: 6,
    block: 'Tus Canales',
    question: '¿Dónde vendes actualmente y dónde está tu audiencia en redes?'
  },
  {
    id: 7,
    block: 'Sus Dudas',
    question: '¿Cuál es la excusa o duda más común que escuchas antes de que alguien te compre?'
  }
];
```

### Propósito de Cada Pregunta

| # | Bloque | Objetivo | Genera Sección |
|---|--------|----------|----------------|
| 1 | Tu Negocio | Entender el core del negocio y diferenciador | business_identity |
| 2 | Tu Cliente | Perfil psicográfico del cliente ideal | ideal_customer |
| 3 | Su Problema | Pain points y frustraciones | value_proposition |
| 4 | Tu Solución | Transformación y resultados | value_proposition |
| 5 | Tu Oferta | Producto estrella y pricing | flagship_offer |
| 6 | Tus Canales | Presencia digital y audiencia | marketing_strategy |
| 7 | Sus Dudas | Objeciones para contenido | marketing_strategy |

---

## 2. Estructura de Datos del ADN

### Archivo: `src/types/client-dna.ts`

```typescript
export interface DNAData {
  business_identity: {
    company_name: string;
    industry: string;
    business_model: string;
    origin_story: string;
    unique_differentiator: string;
    core_values: string[];
    mission_statement: string;
  };

  value_proposition: {
    main_problem_solved: string;
    key_benefits: string[];
    transformation_promise: string;
    proof_points: string[];
    competitive_advantages: string[];
  };

  ideal_customer: {
    demographics: {
      age_range: string;
      gender: string;
      location: string;
      income_level: string;
      occupation: string;
    };
    psychographics: {
      values: string[];
      interests: string[];
      lifestyle: string;
      personality_traits: string[];
    };
    pain_points: string[];
    desires: string[];
    objections: string[];
    buying_triggers: string[];
  };

  flagship_offer: {
    name: string;
    description: string;
    price_point: string;
    key_features: string[];
    included_deliverables: string[];
    ideal_for: string;
    results_timeline: string;
  };

  brand_identity: {
    brand_personality: string[];
    tone_of_voice: string;
    communication_style: string;
    key_messages: string[];
    tagline_options: string[];
    brand_story: string;
  };

  visual_identity: {
    color_psychology: string;
    recommended_colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    imagery_style: string;
    font_recommendations: {
      headlines: string;
      body: string;
    };
    visual_mood: string[];
  };

  marketing_strategy: {
    primary_channels: string[];
    content_pillars: string[];
    content_formats: string[];
    posting_frequency: string;
    engagement_tactics: string[];
    campaign_ideas: string[];
  };

  ads_targeting: {
    platforms: string[];
    audience_segments: {
      name: string;
      description: string;
      targeting_criteria: string[];
    }[];
    ad_angles: string[];
    hook_ideas: string[];
    cta_options: string[];
    budget_recommendation: string;
  };
}

export interface ClientDNA {
  id: string;
  client_id: string;
  organization_id: string;
  transcription: string;
  emotional_analysis?: string;
  audience_locations?: string[];
  dna_data: DNAData;
  version: number;
  status: 'draft' | 'processing' | 'completed' | 'error';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## 3. Hook de Cliente (Frontend)

### Archivo: `src/hooks/useClientDNA.ts`

```typescript
export function useClientDNA(clientId: string) {
  // Obtener ADN activo del cliente
  const { data: activeDNA, isLoading } = useQuery({
    queryKey: ['client-dna', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_dna')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as ClientDNA;
    },
    enabled: !!clientId
  });

  // Procesar ADN desde audio
  const processDNA = async (audioBlob: Blob, locations: string[]) => {
    // 1. Transcribir audio con Whisper
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const transcriptionResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/transcribe-audio`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      }
    );

    const { transcription } = await transcriptionResponse.json();

    // 2. Generar ADN con la transcripción
    const dnaResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-client-dna`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          transcription,
          audience_locations: locations
        })
      }
    );

    return await dnaResponse.json();
  };

  // Historial de versiones
  const { data: history } = useQuery({
    queryKey: ['client-dna-history', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_dna')
        .select('id, version, status, created_at')
        .eq('client_id', clientId)
        .order('version', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId
  });

  return {
    activeDNA,
    isLoading,
    processDNA,
    history
  };
}
```

---

## 4. Edge Function: Generación de ADN

### Archivo: `supabase/functions/generate-client-dna/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const DNA_SYSTEM_PROMPT = `Eres un estratega de marca experto con más de 20 años de experiencia ayudando a empresas a definir su identidad y posicionamiento. Tu tarea es analizar la transcripción de una entrevista con un emprendedor/empresario y generar un ADN de marca completo.

CONTEXTO DE LA ENTREVISTA:
El emprendedor respondió 7 preguntas sobre su negocio:
1. Qué vende, por qué lo creó y qué lo hace diferente
2. Descripción de su cliente ideal
3. El problema principal que resuelve
4. El resultado concreto que obtiene el cliente
5. Su producto/servicio estrella y precio
6. Dónde vende y dónde está su audiencia
7. Las dudas/objeciones más comunes

INSTRUCCIONES:
1. Analiza la transcripción extrayendo información clave de cada respuesta
2. Identifica patrones, tono emocional y personalidad de marca
3. Genera un ADN de marca completo y accionable
4. Usa las ubicaciones proporcionadas para la segmentación de ads

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "business_identity": { ... },
  "value_proposition": { ... },
  "ideal_customer": { ... },
  "flagship_offer": { ... },
  "brand_identity": { ... },
  "visual_identity": { ... },
  "marketing_strategy": { ... },
  "ads_targeting": { ... }
}`;

async function generateWithPerplexity(transcription: string, locations: string[]) {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: DNA_SYSTEM_PROMPT },
        {
          role: "user",
          content: `TRANSCRIPCIÓN DE LA ENTREVISTA:\n${transcription}\n\nUBICACIONES DE LA AUDIENCIA:\n${locations.join(", ")}`
        }
      ],
      temperature: 0.3,
      max_tokens: 8000
    })
  });

  if (!response.ok) {
    throw new Error(`Perplexity error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateWithGemini(transcription: string, locations: string[]) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: DNA_SYSTEM_PROMPT }] },
        contents: [{
          parts: [{
            text: `TRANSCRIPCIÓN DE LA ENTREVISTA:\n${transcription}\n\nUBICACIONES DE LA AUDIENCIA:\n${locations.join(", ")}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8000,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

Deno.serve(async (req) => {
  try {
    const { client_id, transcription, audience_locations } = await req.json();

    // Obtener contexto de autenticación
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generar ADN con fallback
    let dnaData;
    try {
      dnaData = await generateWithPerplexity(transcription, audience_locations);
    } catch (perplexityError) {
      console.warn("Perplexity failed, trying Gemini:", perplexityError);
      dnaData = await generateWithGemini(transcription, audience_locations);
    }

    // Obtener organization_id del cliente
    const { data: client } = await supabase
      .from('clients')
      .select('organization_id')
      .eq('id', client_id)
      .single();

    // Desactivar versiones anteriores
    await supabase
      .from('client_dna')
      .update({ is_active: false })
      .eq('client_id', client_id);

    // Obtener número de versión
    const { count } = await supabase
      .from('client_dna')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client_id);

    // Guardar nuevo ADN
    const { data: newDNA, error } = await supabase
      .from('client_dna')
      .insert({
        client_id,
        organization_id: client.organization_id,
        transcription,
        audience_locations,
        dna_data: dnaData,
        version: (count || 0) + 1,
        status: 'completed',
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(newDNA), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error generating DNA:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## 5. Schema de Base de Datos

### Archivo: `supabase/migrations/20260211000000_client_dna.sql`

```sql
-- Tabla principal de ADN de marca
CREATE TABLE client_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Datos de entrada
  transcription TEXT NOT NULL,
  emotional_analysis TEXT,
  audience_locations TEXT[],

  -- ADN generado (JSON completo)
  dna_data JSONB NOT NULL DEFAULT '{}',

  -- Versionamiento
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'error')),
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_client_dna_client_id ON client_dna(client_id);
CREATE INDEX idx_client_dna_org_id ON client_dna(organization_id);
CREATE INDEX idx_client_dna_active ON client_dna(client_id, is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE client_dna ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven ADN de su organización
CREATE POLICY "Users can view client DNA from their organization"
  ON client_dna FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Solo miembros pueden crear ADN
CREATE POLICY "Members can create client DNA"
  ON client_dna FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Solo miembros pueden actualizar ADN
CREATE POLICY "Members can update client DNA"
  ON client_dna FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER set_client_dna_updated_at
  BEFORE UPDATE ON client_dna
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. Componentes UI

### Wizard de Preguntas

```
src/components/clients/dna/
├── DNAWizard.tsx           # Componente principal del wizard
├── DNAQuestionCard.tsx     # Card de cada pregunta
├── AudioRecorder.tsx       # Grabador de audio
├── LocationSelector.tsx    # Selector de ubicaciones tipo Meta Ads
├── DNAProgressBar.tsx      # Barra de progreso
├── DNAPreview.tsx          # Vista previa del ADN generado
└── DNASectionCard.tsx      # Card para cada sección del ADN
```

### Flujo de Usuario

1. **Inicio**: Usuario accede al perfil del cliente → "Generar ADN de Marca"
2. **Preguntas**: Se muestran las 7 preguntas una por una
3. **Grabación**: Usuario graba su respuesta en audio para cada pregunta
4. **Ubicaciones**: Al final, selecciona ubicaciones de su audiencia (estilo Meta Ads)
5. **Procesamiento**: Sistema transcribe audio y genera ADN (~30-60 segundos)
6. **Resultado**: Se muestra el ADN completo con las 8 secciones

---

## 7. Output: Las 8 Secciones del ADN

### 1. Business Identity (Identidad del Negocio)
```json
{
  "company_name": "Nombre de la empresa",
  "industry": "Industria/sector",
  "business_model": "B2B SaaS, E-commerce, Servicios, etc.",
  "origin_story": "Historia de cómo surgió el negocio",
  "unique_differentiator": "Lo que hace único al negocio",
  "core_values": ["Valor 1", "Valor 2", "Valor 3"],
  "mission_statement": "Declaración de misión"
}
```

### 2. Value Proposition (Propuesta de Valor)
```json
{
  "main_problem_solved": "El problema principal que resuelve",
  "key_benefits": ["Beneficio 1", "Beneficio 2", "Beneficio 3"],
  "transformation_promise": "La transformación que promete",
  "proof_points": ["Prueba social 1", "Caso de éxito 2"],
  "competitive_advantages": ["Ventaja 1", "Ventaja 2"]
}
```

### 3. Ideal Customer (Cliente Ideal)
```json
{
  "demographics": {
    "age_range": "25-45",
    "gender": "Mixto",
    "location": "LATAM",
    "income_level": "Medio-Alto",
    "occupation": "Emprendedores, Freelancers"
  },
  "psychographics": {
    "values": ["Libertad", "Crecimiento"],
    "interests": ["Marketing digital", "Negocios online"],
    "lifestyle": "Trabaja desde casa, busca balance",
    "personality_traits": ["Ambicioso", "Autodidacta"]
  },
  "pain_points": ["Falta de tiempo", "No sabe por dónde empezar"],
  "desires": ["Escalar su negocio", "Automatizar"],
  "objections": ["Es muy caro", "No tengo tiempo"],
  "buying_triggers": ["Ofertas limitadas", "Casos de éxito"]
}
```

### 4. Flagship Offer (Oferta Estrella)
```json
{
  "name": "Nombre del producto/servicio",
  "description": "Descripción completa",
  "price_point": "$997 USD",
  "key_features": ["Feature 1", "Feature 2"],
  "included_deliverables": ["Entregable 1", "Entregable 2"],
  "ideal_for": "Para quién es ideal",
  "results_timeline": "Resultados en 90 días"
}
```

### 5. Brand Identity (Identidad de Marca)
```json
{
  "brand_personality": ["Profesional", "Cercano", "Innovador"],
  "tone_of_voice": "Profesional pero accesible",
  "communication_style": "Directo, con ejemplos prácticos",
  "key_messages": ["Mensaje 1", "Mensaje 2"],
  "tagline_options": ["Opción 1", "Opción 2"],
  "brand_story": "Historia de la marca en formato narrativo"
}
```

### 6. Visual Identity (Identidad Visual)
```json
{
  "color_psychology": "Azul transmite confianza y profesionalismo",
  "recommended_colors": {
    "primary": "#2563EB",
    "secondary": "#1E40AF",
    "accent": "#F59E0B"
  },
  "imagery_style": "Fotografía real, personas trabajando",
  "font_recommendations": {
    "headlines": "Montserrat Bold",
    "body": "Inter Regular"
  },
  "visual_mood": ["Profesional", "Moderno", "Limpio"]
}
```

### 7. Marketing Strategy (Estrategia de Marketing)
```json
{
  "primary_channels": ["Instagram", "LinkedIn", "YouTube"],
  "content_pillars": ["Educativo", "Inspiracional", "Promocional"],
  "content_formats": ["Reels", "Carruseles", "Lives"],
  "posting_frequency": "5 veces por semana",
  "engagement_tactics": ["Responder comentarios", "DMs proactivos"],
  "campaign_ideas": ["Reto de 7 días", "Webinar gratuito"]
}
```

### 8. Ads Targeting (Segmentación para Ads)
```json
{
  "platforms": ["Meta Ads", "Google Ads"],
  "audience_segments": [
    {
      "name": "Emprendedores digitales",
      "description": "Personas con negocio online buscando escalar",
      "targeting_criteria": ["Interés: Marketing digital", "Comportamiento: Compradores online"]
    }
  ],
  "ad_angles": ["Pain point: Falta de tiempo", "Aspiracional: Libertad"],
  "hook_ideas": ["¿Cansado de...?", "La verdad sobre..."],
  "cta_options": ["Agenda tu llamada", "Descarga gratis"],
  "budget_recommendation": "$500-1000 USD/mes para empezar"
}
```

---

## 8. Diferencias con Product DNA

| Aspecto | ADN de Marca (Client DNA) | ADN de Producto (Product DNA) |
|---------|---------------------------|-------------------------------|
| **Input** | 7 preguntas en audio | 12 pasos de investigación |
| **Sujeto** | La marca/empresa del cliente | Un producto específico |
| **Propósito** | Identidad y posicionamiento de marca | Research de mercado para lanzamiento |
| **IA Principal** | Perplexity sonar-pro | Perplexity sonar-pro con web search |
| **Web Search** | No | Sí (datos de mercado en tiempo real) |
| **Duración** | ~30-60 segundos | ~5-10 minutos (12 llamadas) |
| **Resultado** | Perfil de marca completo | Research de mercado completo |

---

## 9. Configuración

### Variables de Entorno (Edge Functions)

```env
PERPLEXITY_API_KEY=pplx-xxxxx
GEMINI_API_KEY=AIza-xxxxx
OPENAI_API_KEY=sk-xxxxx  # Para Whisper (transcripción)
```

### Configuración JWT

```toml
# supabase/config.toml
[functions.generate-client-dna]
verify_jwt = true

[functions.transcribe-audio]
verify_jwt = true
```

---

## 10. Casos de Uso

1. **Onboarding de Clientes**: Generar ADN al inicio de la relación para entender la marca
2. **Estrategia de Contenido**: Usar pillares y formatos para planificación
3. **Campañas de Ads**: Usar segmentación y hooks pre-generados
4. **Branding**: Guía de identidad visual y tono de voz
5. **Ventas**: Entender objeciones y triggers de compra

---

## 11. Limitaciones y Consideraciones

- **Calidad del Audio**: La transcripción depende de la calidad de grabación
- **Respuestas Cortas**: Si el cliente da respuestas muy breves, el ADN será menos detallado
- **Versionamiento**: Se mantiene historial de versiones para comparar evolución
- **Idioma**: Optimizado para español (LATAM)
