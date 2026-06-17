import {
  SAMPLE_TEMPLATE_HTML,
  TEMPLATE_TOKENS,
  TOKEN_HEX_MAP,
  TOKEN_FONT_MAP,
  FONT_OPTIONS,
  type TemplateToken,
} from "./sampleTemplate";

export interface PortfolioTemplate {
  id: string;
  name: string;
  description: string;
  /** Color de muestra para la tarjeta de la galería. */
  accent: string;
  html: string;
  tokens: TemplateToken[];
  hexMap: Record<string, string>;
  fontMap: Record<string, string>;
  fonts: string[];
}

// Registro de plantillas. Cada HTML que el dev suba se agrega aquí como una
// entrada más; el editor y la galería funcionan igual para todas.
export const TEMPLATES: PortfolioTemplate[] = [
  {
    id: "cyber-neon",
    name: "Cyber Neón",
    description: "Oscuro, glassmorphism y neón. Ideal para creadores tech/UGC.",
    accent: "#d0bcff",
    html: SAMPLE_TEMPLATE_HTML,
    tokens: TEMPLATE_TOKENS,
    hexMap: TOKEN_HEX_MAP,
    fontMap: TOKEN_FONT_MAP,
    fonts: FONT_OPTIONS,
  },
];

export function getTemplate(id: string): PortfolioTemplate | undefined {
  return TEMPLATES.find((template) => template.id === id);
}
