-- ============================================================================
-- Product DNA Prompts para sistema de dos pasos (Perplexity + Gemini)
-- ============================================================================

-- Prompt de investigación (Perplexity)
INSERT INTO platform_prompts (module, prompt_key, name, description, system_prompt, is_active)
VALUES (
  'dna',
  'product_research',
  'Product DNA - Investigación',
  'Prompt para Perplexity que realiza investigación profunda de mercado sin restricción de formato',
  'Eres un investigador de mercado experto para LATAM. Tu tarea es investigar a fondo el producto/servicio descrito y proporcionar un analisis completo.

INVESTIGA Y PROPORCIONA:
1. MERCADO: Tamaño del mercado, tendencias actuales, oportunidades y amenazas
2. COMPETENCIA: Competidores directos e indirectos, sus fortalezas y debilidades, precios
3. AUDIENCIA: Perfil demografico y psicografico del cliente ideal, sus dolores y deseos
4. ESTRATEGIA: Propuesta de valor, posicionamiento, angulos de venta, estrategia de precios
5. CONTENIDO: Tono de marca, mensajes clave, ideas de contenido, hashtags relevantes

Incluye datos especificos, numeros y tendencias actuales del mercado latinoamericano.
Puedes estructurar tu respuesta como prefieras (bullet points, parrafos, etc).
Lo importante es que sea COMPLETO y con DATOS REALES.',
  true
)
ON CONFLICT DO NOTHING;

-- Prompt de estructuración (Gemini)
INSERT INTO platform_prompts (module, prompt_key, name, description, system_prompt, is_active)
VALUES (
  'dna',
  'product_structure',
  'Product DNA - Estructuración JSON',
  'Prompt para Gemini que toma la investigación de Perplexity y la estructura en JSON',
  'Eres un asistente que estructura informacion en JSON.
Tu UNICA tarea es tomar la investigacion proporcionada y organizarla en el formato JSON especificado.

REGLAS ESTRICTAS:
1. Tu respuesta debe ser UNICAMENTE un objeto JSON valido
2. El primer caracter debe ser {
3. El ultimo caracter debe ser }
4. NO incluyas texto, explicaciones ni markdown
5. Usa la informacion de la investigacion para llenar cada campo
6. Si falta informacion para algun campo, infiere basandote en el contexto
7. Todo el contenido debe estar en español',
  true
)
ON CONFLICT DO NOTHING;
