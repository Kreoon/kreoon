import type { PortfolioTemplate } from "./registry";
import type { TemplateToken } from "./sampleTemplate";

/**
 * Transforma el HTML crudo de una plantilla en el documento del iframe:
 *  - elimina scripts de comportamiento (mantiene Tailwind CDN + su config)
 *  - reemplaza los hex/fuentes de los tokens por variables CSS editables
 *  - inyecta valores por defecto de tokens + estilos de la capa de edición
 */
export function prepareTemplate(
  template: PortfolioTemplate,
  tokens: TemplateToken[],
): string {
  let html = template.html;

  // 1. Quitar scripts que NO sean Tailwind (CDN o su config).
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (match) =>
    /tailwind-config|cdn\.tailwindcss\.com/i.test(match) ? match : "",
  );

  // 2. Tokens de color (el hex solo aparece en el tailwind.config).
  for (const [hex, varRef] of Object.entries(template.hexMap)) {
    html = html.split(hex).join(varRef);
  }

  // 3. Tokens de fuente (solo el config usa el nombre entre comillas).
  for (const [font, varRef] of Object.entries(template.fontMap)) {
    html = html.split(`"${font}"`).join(`"${varRef}"`);
  }

  // 4. Estilos inyectados: defaults de tokens + capa de edición.
  const rootVars = tokens
    .map((token) =>
      token.type === "font"
        ? `${token.key}: '${token.value}';`
        : `${token.key}: ${token.value};`,
    )
    .join(" ");

  const injected = `
<style id="kreoon-engine">
  :root { ${rootVars} }
  .fade-in { opacity: 1 !important; transform: none !important; }
  [data-ke-edit]:hover { outline: 1px dashed rgba(255,255,255,.5); outline-offset: 3px; cursor: pointer; }
  [data-ke-editing] { outline: 2px solid var(--c-secondary-container) !important; outline-offset: 3px; border-radius: 2px; }
  [data-ke-selected] { outline: 2px solid var(--c-secondary-container) !important; outline-offset: 2px; }
  [data-ke-section] { scroll-margin-top: 80px; }
  [data-ke-section].ke-hidden { display: none !important; }
  [data-ke-section].ke-highlight { outline: 2px dashed var(--c-primary); outline-offset: -2px; }
</style>`;

  return html.replace("</head>", `${injected}</head>`);
}
