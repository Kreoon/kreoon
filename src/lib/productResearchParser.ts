/**
 * Product Research Parser
 * Extracts structured research data from product JSON fields
 */

export interface ParsedResearchData {
  // Market Research (V1)
  pains: string[];
  desires: string[];
  objections: string[];

  // Avatar Profiles (V1)
  avatars: Array<{
    name: string;
    description: string;
    demographics?: string;
    psychographics?: string;
  }>;

  // Sales Angles (V1)
  salesAngles: Array<{
    name: string;
    description: string;
    angle_type?: string;
  }>;

  // Hooks — V1 (from sales angles) + V2 (from creative_brief)
  hooks: string[];

  // Competitors (V1)
  competitors: Array<{
    name: string;
    description?: string;
    strengths?: string;
    weaknesses?: string;
  }>;

  // Executive Summary (V1)
  executiveSummary: string;

  // JTBD (V1)
  jtbd: {
    functional?: string[];
    emotional?: string[];
    social?: string[];
  };

  // ADN V2 — ai_analysis fields
  buyingTriggers: string[];      // ai_analysis.target_audience.buying_triggers
  hookSuggestions: string[];     // ai_analysis.creative_brief.hooks_suggestions
  keyMessages: string[];         // ai_analysis.creative_brief.key_messages
  ctaRecommendations: string[];  // ai_analysis.creative_brief.cta_recommendations
  trends: string[];              // ai_analysis.market_analysis.trends
  hasV2Data: boolean;            // true when ai_analysis data is present
}

/**
 * Safely parse JSON that might be a string or already an object
 */
function safeParseJson(data: unknown): Record<string, unknown> | null {
  if (!data) return null;
  if (typeof data === 'object') return data as Record<string, unknown>;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Stringify an item from a research array — handles both strings and objects
 */
function stringifyItem(item: unknown): string {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  const o = item as Record<string, unknown>;
  // Try common object shapes from research data
  return String(
    o.pain || o.desire || o.objection || // jtbd nested objects
    o.name || o.nombre || o.description || o.descripcion || o.title || o.titulo ||
    o.text || o.label || o.value || ''
  );
}

/**
 * Extract array from various possible structures, including nested paths
 */
function extractArray(data: unknown, ...keys: string[]): string[] {
  const parsed = safeParseJson(data);
  if (!parsed) return [];

  // 1. Check top-level keys
  for (const key of keys) {
    const value = parsed[key];
    if (Array.isArray(value)) {
      return value.map(stringifyItem).filter(Boolean);
    }
  }

  // 2. Check nested under jtbd (actual research structure)
  const jtbd = safeParseJson(parsed.jtbd || parsed.jobs_to_be_done || null);
  if (jtbd) {
    for (const key of keys) {
      const value = jtbd[key];
      if (Array.isArray(value)) {
        return value.map(stringifyItem).filter(Boolean);
      }
    }
  }

  return [];
}

/**
 * Extract avatars from various structures
 */
function extractAvatars(avatarProfiles: unknown): ParsedResearchData['avatars'] {
  const parsed = safeParseJson(avatarProfiles);
  if (!parsed) return [];
  
  // Check different possible structures
  const avatarsArray = parsed.avatars || parsed.avatar_profiles || parsed.profiles || parsed;
  
  if (Array.isArray(avatarsArray)) {
    return avatarsArray.map((avatar: Record<string, unknown>) => ({
      name: String(avatar.nombre || avatar.name || avatar.title || 'Avatar'),
      description: String(avatar.descripcion || avatar.description || avatar.perfil || ''),
      demographics: String(avatar.demograficos || avatar.demographics || avatar.edad || ''),
      psychographics: String(avatar.psicograficos || avatar.psychographics || avatar.intereses || ''),
    }));
  }
  
  return [];
}

/**
 * Extract sales angles from various structures
 */
function extractSalesAngles(salesAnglesData: unknown, salesAnglesArray?: string[] | null): ParsedResearchData['salesAngles'] {
  const angles: ParsedResearchData['salesAngles'] = [];
  
  // First, add any simple string array angles
  if (Array.isArray(salesAnglesArray)) {
    salesAnglesArray.forEach(angle => {
      if (typeof angle === 'string') {
        angles.push({ name: angle, description: '' });
      }
    });
  }
  
  // Then parse structured angles
  const parsed = safeParseJson(salesAnglesData);
  if (parsed) {
    const anglesArray = parsed.angles || parsed.sales_angles || parsed.angulos || parsed;
    
    if (Array.isArray(anglesArray)) {
      anglesArray.forEach((angle: Record<string, unknown>) => {
        if (typeof angle === 'string') {
          if (!angles.some(a => a.name === angle)) {
            angles.push({ name: angle, description: '' });
          }
        } else {
          const name = String(angle.nombre || angle.name || angle.title || angle.angulo || angle.angle || '');
          // Use hookExample as a short label if the angle text is too long
          const shortName = name.length > 80
            ? String(angle.hookExample || angle.hook_example || angle.hook || name.slice(0, 80) + '…')
            : name;
          if (shortName && !angles.some(a => a.name === shortName)) {
            angles.push({
              name: shortName,
              description: String(angle.descripcion || angle.description || angle.explicacion || angle.angle || ''),
              angle_type: String(angle.tipo || angle.type || angle.category || angle.funnelPhase || ''),
            });
          }
        }
      });
    }
  }
  
  return angles;
}

/**
 * Extract competitors from various structures
 */
function extractCompetitors(competitorAnalysis: unknown): ParsedResearchData['competitors'] {
  const parsed = safeParseJson(competitorAnalysis);
  if (!parsed) return [];
  
  const competitorsArray = parsed.competitors || parsed.competidores || parsed.competition || parsed;
  
  if (Array.isArray(competitorsArray)) {
    return competitorsArray.map((comp: Record<string, unknown>) => ({
      name: String(comp.nombre || comp.name || comp.brand || ''),
      description: String(comp.descripcion || comp.description || ''),
      strengths: String(comp.fortalezas || comp.strengths || ''),
      weaknesses: String(comp.debilidades || comp.weaknesses || ''),
    }));
  }
  
  return [];
}

/**
 * Extract executive summary from market research
 */
function extractExecutiveSummary(marketResearch: unknown): string {
  const parsed = safeParseJson(marketResearch);
  if (!parsed) {
    // If it's a plain string, return it
    if (typeof marketResearch === 'string') return marketResearch;
    return '';
  }
  
  // Check top-level first, then nested under market_overview
  const overview = safeParseJson(parsed.market_overview || null);
  return String(
    parsed.executive_summary ||
    parsed.resumen_ejecutivo ||
    parsed.summary ||
    parsed.resumen ||
    overview?.summary ||
    overview?.resumen ||
    ''
  );
}

/**
 * Flatten a JTBD sub-category that might be an array of strings,
 * an object with nested arrays, or an object with string values.
 */
function flattenJTBDCategory(raw: unknown): string[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw.map(stringifyItem).filter(Boolean);
  if (typeof raw === 'object') {
    // Might be { goals: [...], needs: [...] } or { before: "...", after: "..." }
    const items: string[] = [];
    for (const val of Object.values(raw as Record<string, unknown>)) {
      if (Array.isArray(val)) items.push(...val.map(stringifyItem).filter(Boolean));
      else if (typeof val === 'string' && val.length > 5) items.push(val);
    }
    return items.length ? items : undefined;
  }
  return undefined;
}

/**
 * Extract JTBD (Jobs To Be Done) from market research
 */
function extractJTBD(marketResearch: unknown): ParsedResearchData['jtbd'] {
  const parsed = safeParseJson(marketResearch);
  if (!parsed) return {};

  const jtbdData = safeParseJson(parsed.jtbd || parsed.jobs_to_be_done || {});
  if (!jtbdData) return {};

  return {
    functional: flattenJTBDCategory(jtbdData.functional || jtbdData.funcionales),
    emotional: flattenJTBDCategory(jtbdData.emotional || jtbdData.emocionales),
    social: flattenJTBDCategory(jtbdData.social || jtbdData.sociales),
  };
}

/**
 * Extract a flat string array from a nested ai_analysis path.
 * Handles strings, objects with common text fields, or nested arrays.
 */
function extractV2Array(data: Record<string, unknown> | null, ...path: string[]): string[] {
  if (!data) return [];
  let current: unknown = data;
  for (const key of path) {
    if (!current || typeof current !== 'object') return [];
    current = (current as Record<string, unknown>)[key];
  }
  if (!Array.isArray(current)) return [];
  return current.map(stringifyItem).filter(Boolean);
}

/**
 * Deduplicate two string arrays (case-insensitive on first 40 chars).
 */
function mergeUnique(base: string[], extra: string[]): string[] {
  const seen = new Set(base.map(s => s.slice(0, 40).toLowerCase()));
  const result = [...base];
  for (const item of extra) {
    const key = item.slice(0, 40).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/**
 * Main parser function to extract all research data from a product.
 * Merges V1 fields (market_research, avatar_profiles, sales_angles_data)
 * with V2 fields (ai_analysis) when available.
 */
export function parseProductResearch(product: {
  market_research?: unknown;
  avatar_profiles?: unknown;
  sales_angles?: string[] | null;
  sales_angles_data?: unknown;
  competitor_analysis?: unknown;
  brief_data?: unknown;
  ai_analysis?: unknown;
}): ParsedResearchData {
  const salesAngles = extractSalesAngles(product.sales_angles_data, product.sales_angles);

  // Extract hooks from sales_angles_data (V1)
  const hooksV1: string[] = [];
  const sadParsed = safeParseJson(product.sales_angles_data);
  if (sadParsed) {
    const anglesArr = sadParsed.angles || sadParsed.sales_angles || sadParsed.angulos;
    if (Array.isArray(anglesArr)) {
      anglesArr.forEach((a: Record<string, unknown>) => {
        const hook = String(a.hookExample || a.hook_example || a.hook || '');
        if (hook && hook !== 'undefined') hooksV1.push(hook);
      });
    }
  }

  // V2 — parse ai_analysis
  const aiAnalysis = safeParseJson(product.ai_analysis);
  const targetAudience = aiAnalysis ? safeParseJson(aiAnalysis.target_audience ?? null) : null;
  const creativeBrief = aiAnalysis ? safeParseJson(aiAnalysis.creative_brief ?? null) : null;
  const marketAnalysis = aiAnalysis ? safeParseJson(aiAnalysis.market_analysis ?? null) : null;

  const painsV2 = extractV2Array(targetAudience, 'pain_points');
  const desiresV2 = extractV2Array(targetAudience, 'desires');
  const buyingTriggers = extractV2Array(targetAudience, 'buying_triggers');
  const hookSuggestions = extractV2Array(creativeBrief, 'hooks_suggestions');
  const keyMessages = extractV2Array(creativeBrief, 'key_messages');
  const ctaRecommendations = extractV2Array(creativeBrief, 'cta_recommendations');
  const trends = extractV2Array(marketAnalysis, 'trends');

  const hasV2Data = painsV2.length > 0 || hookSuggestions.length > 0 || keyMessages.length > 0;

  return {
    pains: mergeUnique(
      extractArray(product.market_research, 'pains', 'dolores', 'problems', 'pain_points'),
      painsV2
    ),
    desires: mergeUnique(
      extractArray(product.market_research, 'desires', 'deseos', 'wants', 'aspirations'),
      desiresV2
    ),
    objections: extractArray(product.market_research, 'objections', 'objeciones', 'barriers', 'blockers'),
    avatars: extractAvatars(product.avatar_profiles),
    salesAngles,
    hooks: mergeUnique(hooksV1, hookSuggestions),
    competitors: extractCompetitors(product.competitor_analysis),
    executiveSummary: extractExecutiveSummary(product.market_research),
    jtbd: extractJTBD(product.market_research),
    buyingTriggers,
    hookSuggestions,
    keyMessages,
    ctaRecommendations,
    trends,
    hasV2Data,
  };
}

/**
 * Format research data into a string for AI prompts
 */
export function formatResearchForPrompt(research: ParsedResearchData, businessType: 'product_service' | 'personal_brand' = 'product_service'): string {
  const sections: string[] = [];
  
  // Business type context
  if (businessType === 'personal_brand') {
    sections.push(`📌 TIPO DE NEGOCIO: MARCA PERSONAL
⚠️ IMPORTANTE: Este es un proyecto de marca personal. El dueño de la marca será quien cree el contenido.
Los guiones deben estar escritos en primera persona, como si el dueño de la marca hablara directamente a su audiencia.
No usar lenguaje de "creador externo" sino de "yo soy la marca".`);
  }
  
  // Executive Summary
  if (research.executiveSummary) {
    sections.push(`📋 RESUMEN EJECUTIVO:\n${research.executiveSummary}`);
  }
  
  // Pains/Dolores
  if (research.pains.length > 0) {
    sections.push(`😰 DOLORES/PROBLEMAS DEL CLIENTE:\n${research.pains.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
  }
  
  // Desires/Deseos
  if (research.desires.length > 0) {
    sections.push(`✨ DESEOS/ASPIRACIONES:\n${research.desires.map((d, i) => `${i + 1}. ${d}`).join('\n')}`);
  }
  
  // Objections
  if (research.objections.length > 0) {
    sections.push(`🚫 OBJECIONES COMUNES:\n${research.objections.map((o, i) => `${i + 1}. ${o}`).join('\n')}`);
  }
  
  // Avatars
  if (research.avatars.length > 0) {
    const avatarText = research.avatars.map((a, i) => 
      `${i + 1}. ${a.name}${a.description ? `: ${a.description}` : ''}${a.demographics ? ` | Demografía: ${a.demographics}` : ''}`
    ).join('\n');
    sections.push(`👥 AVATARES/PERFILES DE CLIENTE:\n${avatarText}`);
  }
  
  // Sales Angles
  if (research.salesAngles.length > 0) {
    const anglesText = research.salesAngles.map((a, i) => 
      `${i + 1}. ${a.name}${a.description ? `: ${a.description}` : ''}${a.angle_type ? ` (${a.angle_type})` : ''}`
    ).join('\n');
    sections.push(`🎯 ÁNGULOS DE VENTA INVESTIGADOS:\n${anglesText}`);
  }
  
  // Competitors
  if (research.competitors.length > 0) {
    const compText = research.competitors.map((c, i) => 
      `${i + 1}. ${c.name}${c.description ? `: ${c.description}` : ''}`
    ).join('\n');
    sections.push(`🏢 COMPETIDORES IDENTIFICADOS:\n${compText}`);
  }
  
  // JTBD
  if (research.jtbd.functional?.length || research.jtbd.emotional?.length || research.jtbd.social?.length) {
    let jtbdText = '🎯 JOBS TO BE DONE:';
    if (research.jtbd.functional?.length) {
      jtbdText += `\n  Funcionales: ${research.jtbd.functional.join(', ')}`;
    }
    if (research.jtbd.emotional?.length) {
      jtbdText += `\n  Emocionales: ${research.jtbd.emotional.join(', ')}`;
    }
    if (research.jtbd.social?.length) {
      jtbdText += `\n  Sociales: ${research.jtbd.social.join(', ')}`;
    }
    sections.push(jtbdText);
  }

  // ADN V2 exclusive data
  if (research.buyingTriggers.length > 0) {
    sections.push(`⚡ DISPARADORES DE COMPRA (ADN V2):\n${research.buyingTriggers.map((t, i) => `${i + 1}. ${t}`).join('\n')}`);
  }

  if (research.keyMessages.length > 0) {
    sections.push(`💬 MENSAJES CLAVE (ADN V2):\n${research.keyMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}`);
  }

  if (research.ctaRecommendations.length > 0) {
    sections.push(`📢 CTAs RECOMENDADOS (ADN V2):\n${research.ctaRecommendations.map((c, i) => `${i + 1}. ${c}`).join('\n')}`);
  }

  if (research.trends.length > 0) {
    sections.push(`📈 TENDENCIAS DE MERCADO (ADN V2):\n${research.trends.map((t, i) => `${i + 1}. ${t}`).join('\n')}`);
  }

  return sections.join('\n\n');
}
