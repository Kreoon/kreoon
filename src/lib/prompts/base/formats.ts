/**
 * Reglas de formato para outputs de AI
 */

/**
 * Reglas para output en HTML (usado en guiones y contenido)
 */
export const HTML_FORMAT_RULES = `REGLAS DE FORMATO HTML:
1. Usa SOLO estos tags: h2, h3, h4, p, ul, li, strong, em
2. NUNCA uses Markdown (**, ##, -, etc.)
3. Maximo 1-2 emojis por seccion principal
4. Estructura de mayor a menor importancia
5. Cada seccion debe tener un proposito claro

ESTRUCTURA REQUERIDA:
<h2>TITULO SECCION</h2>
<h3>Subtitulo</h3>
<p>Contenido</p>
<p><strong>[ACCION]:</strong> Indicacion para el creador</p>`;

/**
 * Reglas para output en JSON (usado en APIs y estructuras de datos)
 */
export const JSON_FORMAT_RULES = `REGLAS DE OUTPUT JSON:
1. Devuelve SOLO JSON valido, sin texto antes ni despues
2. No uses \`\`\`json ni ningun markdown
3. Asegurate de que todos los strings esten correctamente escapados
4. Usa null para valores ausentes, no undefined
5. Los arrays vacios son preferibles a null cuando se esperan listas`;

/**
 * Reglas para output en Markdown (usado en documentacion)
 */
export const MARKDOWN_FORMAT_RULES = `REGLAS DE FORMATO MARKDOWN:
1. Usa ## para titulos principales, ### para subtitulos
2. Usa ** para negrita, * para italica
3. Usa - para listas
4. Usa > para citas o notas importantes
5. Usa \`codigo\` para terminos tecnicos`;

/**
 * Reglas para output de texto plano (usado en copies cortos)
 */
export const PLAIN_TEXT_RULES = `REGLAS DE TEXTO PLANO:
1. No uses ningun formato especial
2. Usa mayusculas para enfasis si es necesario
3. Separa secciones con lineas en blanco
4. Maximo 280 caracteres por parrafo (optimizado para redes)`;
