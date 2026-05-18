import type { CostCategory } from '@/hooks/useFinance';

interface CategoryRule {
  category: CostCategory;
  keywords: string[];
}

// Diccionario mantenible de palabras clave por categoría.
// Si una palabra del concepto matchea, sugiere esa categoría.
const RULES: CategoryRule[] = [
  {
    category: 'plataforma',
    keywords: [
      'netflix', 'spotify', 'youtube', 'capcut', 'premiere', 'adobe', 'canva',
      'chatgpt', 'openai', 'claude', 'gemini', 'midjourney', 'figma',
      'slack', 'notion', 'monday', 'asana', 'trello',
      'aws', 'gcp', 'azure', 'vercel', 'supabase', 'cloudflare', 'hetzner',
      'bunny', 'cloudinary', 'mailchimp', 'resend', 'twilio',
      'suscripción', 'suscripcion', 'plan mensual', 'plan anual', 'membresía',
      'github', 'gitlab', 'sentry', 'datadog',
      'hosting', 'dominio', 'ssl',
    ],
  },
  {
    category: 'equipo',
    keywords: [
      'cámara', 'camara', 'lente', 'trípode', 'tripode', 'micrófono', 'microfono',
      'iluminación', 'iluminacion', 'luces', 'softbox', 'ring light',
      'computador', 'laptop', 'macbook', 'pc', 'monitor', 'tablet', 'ipad',
      'disco duro', 'ssd', 'memoria', 'tarjeta sd',
      'audífonos', 'audifonos', 'parlante', 'estabilizador', 'gimbal',
      'drone', 'gopro', 'cable', 'cargador', 'batería', 'bateria',
    ],
  },
  {
    category: 'operativo',
    keywords: [
      'arriendo', 'alquiler', 'renta', 'oficina', 'coworking',
      'agua', 'luz', 'electricidad', 'internet', 'wifi', 'teléfono', 'telefono',
      'aseo', 'limpieza', 'mantenimiento', 'reparación', 'reparacion',
      'parqueadero', 'transporte', 'taxi', 'uber', 'didi', 'gasolina',
      'papelería', 'papeleria', 'café', 'cafe', 'almuerzo',
    ],
  },
  {
    category: 'agencia',
    keywords: [
      'meta ads', 'facebook ads', 'google ads', 'tiktok ads', 'instagram ads',
      'linkedin ads', 'twitter ads', 'youtube ads',
      'campaña', 'campana', 'pauta', 'publicidad', 'ads', 'marketing',
      'influencer', 'colaboración', 'colaboracion', 'sponsorship',
      'pr', 'agencia', 'consultor', 'consultoría', 'consultoria',
    ],
  },
  {
    category: 'impuesto',
    keywords: [
      'iva', 'retención', 'retencion', 'reteiva', 'reteica', 'rete',
      'impuesto', 'impuestos', 'dian', 'cámara comercio', 'camara comercio',
      'predial', 'industria comercio', 'renta',
      'contador', 'contadora', 'contabilidad', 'tributario',
    ],
  },
  {
    category: 'talento',
    keywords: [
      'creator', 'creador', 'creadora', 'editor', 'editora',
      'fotógrafo', 'fotografo', 'modelo', 'actor', 'actriz', 'locutor',
      'voiceover', 'voz en off', 'freelancer', 'freelance',
      'colaborador externo', 'gestor', 'community manager', 'community',
    ],
  },
];

/**
 * Sugiere la categoría más probable para un concepto de costo basado en
 * keywords. Retorna null si no hay match claro.
 */
export function suggestCategory(name: string, notes?: string | null): CostCategory | null {
  const text = (name + ' ' + (notes ?? '')).toLowerCase();
  if (!text.trim()) return null;

  let bestMatch: { category: CostCategory; hits: number } | null = null;

  for (const rule of RULES) {
    const hits = rule.keywords.reduce((count, kw) => {
      // Match palabra completa o como substring si es ≥4 chars
      const re = new RegExp(
        kw.length >= 4 ? `\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b|${kw}` : `\\b${kw}\\b`,
        'i',
      );
      return count + (re.test(text) ? 1 : 0);
    }, 0);

    if (hits > 0 && (!bestMatch || hits > bestMatch.hits)) {
      bestMatch = { category: rule.category, hits };
    }
  }

  return bestMatch?.category ?? null;
}
