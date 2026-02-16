/**
 * Script Prefill Service
 *
 * Generates intelligent pre-fills for the script generator form based on
 * product research data and ESFERA sphere phase. Uses AI to analyze the
 * research and select the most appropriate data for each content piece.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ResearchData {
  pains?: Array<{ pain: string; why?: string; impact?: string }>;
  desires?: Array<{ desire: string; emotion?: string; idealState?: string }>;
  objections?: Array<{ objection: string; belief?: string; counter?: string }>;
  avatars?: Array<{
    name: string;
    demographics?: Record<string, string>;
    psychographics?: Record<string, any>;
    communication?: { phrases?: string[] };
  }>;
  salesAngles?: Array<{
    angle: string;
    type?: string;
    avatar?: string;
    emotion?: string;
    hookExample?: string;
  }>;
  creatives?: Array<{
    title: string;
    angle?: string;
    avatar?: string;
    esferaPhase?: string;
    structure?: { hook?: string };
  }>;
  // DNA enrichment data
  brandTone?: string;
  brandStyle?: string;
  brandKeyMessages?: string[];
  productCreativeBrief?: {
    tone?: string;
    style?: string;
    key_messages?: string[];
    hooks_suggestions?: string[];
    cta_recommendations?: string[];
  };
  leadMagnets?: Array<{ title?: string; type?: string; description?: string }>;
  puv?: { main?: string; pillars?: any[] };
  transformation?: { before?: string; after?: string; journey?: string };
}

export interface PrefillData {
  selected_pain: string;
  selected_desire: string;
  selected_objection: string;
  target_country: string;
  narrative_structure: string;
  video_duration: string;
  ideal_avatar: string;
  sales_angle: string;
  suggested_hooks: string[];
  cta: string;
}

export interface PrefillRequest {
  productId: string;
  spherePhase: 'engage' | 'solution' | 'remarketing' | 'fidelize';
  contentIndex?: number; // For generating diverse prefills across multiple content items
  targetPlatform?: string;
}

// Mapping sphere phases to Spanish names used in research
const SPHERE_PHASE_MAP: Record<string, string> = {
  engage: 'enganchar',
  solution: 'solucion',
  remarketing: 'remarketing',
  fidelize: 'fidelizar',
};

// Default narrative structures per sphere phase
const NARRATIVE_BY_PHASE: Record<string, string[]> = {
  engage: ['problema-solucion', 'mitos-realidades', 'controversia', 'pov', 'historia-personal'],
  solution: ['tutorial', 'antes-despues', 'testimonio', 'educativo', 'comparativa'],
  remarketing: ['urgencia', 'testimonio', 'antes-despues', 'pregunta-respuesta', 'detras-camaras'],
  fidelize: ['detras-camaras', 'dia-en-vida', 'storytime', 'pregunta-respuesta', 'unboxing'],
};

// Default video durations per sphere phase
const DURATION_BY_PHASE: Record<string, string[]> = {
  engage: ['15-30s', '30-60s'],
  solution: ['30-60s', '1-3min'],
  remarketing: ['15-30s', '30-60s'],
  fidelize: ['1-3min', '30-60s'],
};

// CTA suggestions per sphere phase
const CTA_BY_PHASE: Record<string, string[]> = {
  engage: [
    'Sigue para más tips',
    'Guarda este video',
    'Comenta si te identificas',
    'Comparte con alguien que necesite esto',
  ],
  solution: [
    'Link en bio para más info',
    'Escríbeme para saber más',
    'Agenda tu cita ahora',
    'Descubre cómo en el link',
  ],
  remarketing: [
    'Últimas unidades disponibles',
    'Oferta por tiempo limitado',
    'No te quedes sin el tuyo',
    'Aprovecha antes de que termine',
  ],
  fidelize: [
    'Cuéntame tu experiencia',
    'Únete a nuestra comunidad',
    'Comparte tu historia',
    'Recomiéndanos a un amigo',
  ],
};

const sb = supabase as any;

// Parse JSON fields that may come as strings
const parseIfString = (value: any) => {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
};

/**
 * Fetches and parses research data from a product + DNA tables
 */
async function fetchProductResearch(productId: string): Promise<ResearchData | null> {
  const { data, error } = await supabase
    .from('products')
    .select('client_id, market_research, avatar_profiles, sales_angles_data, ideal_avatar, sales_angles, brief_data, content_strategy')
    .eq('id', productId)
    .maybeSingle();

  if (error || !data) {
    console.error('[scriptPrefillService] Error fetching product:', error);
    return null;
  }

  const marketResearch = parseIfString(data.market_research);
  const avatarProfiles = parseIfString(data.avatar_profiles);
  const salesAnglesData = parseIfString(data.sales_angles_data);
  const idealAvatar = parseIfString(data.ideal_avatar);
  const contentStrategy = parseIfString(data.content_strategy);

  // Extract research data from various possible structures
  const research: ResearchData = {};

  // Extract pains (ADN Recargado stores in market_research.jtbd.pains)
  research.pains = marketResearch?.jtbd?.pains ||
                   marketResearch?.pains ||
                   marketResearch?.pains_desires?.pains ||
                   idealAvatar?.jtbd?.pains ||
                   [];

  // Extract desires
  research.desires = marketResearch?.jtbd?.desires ||
                     marketResearch?.desires ||
                     marketResearch?.pains_desires?.desires ||
                     idealAvatar?.jtbd?.desires ||
                     [];

  // Extract objections
  research.objections = marketResearch?.jtbd?.objections ||
                        marketResearch?.objections ||
                        marketResearch?.pains_desires?.objections ||
                        idealAvatar?.jtbd?.objections ||
                        [];

  // Extract avatars
  research.avatars = avatarProfiles?.profiles ||
                     avatarProfiles?.avatars ||
                     marketResearch?.avatars?.avatars ||
                     marketResearch?.strategicAvatars ||
                     [];

  // Extract sales angles
  research.salesAngles = salesAnglesData?.angles ||
                         salesAnglesData?.salesAngles ||
                         marketResearch?.sales_angles?.salesAngles ||
                         marketResearch?.salesAngles ||
                         (data.sales_angles || []).map((a: string) => ({ angle: a }));

  // Extract video creatives
  research.creatives = salesAnglesData?.videoCreatives ||
                       marketResearch?.video_creatives?.creatives ||
                       marketResearch?.creatives ||
                       [];

  // Extract lead magnets
  research.leadMagnets = salesAnglesData?.leadMagnets || [];

  // Extract PUV and transformation
  research.puv = salesAnglesData?.puv || null;
  research.transformation = salesAnglesData?.transformation || null;

  // ── Fetch Product DNA (ai_analysis has creative_brief, hooks, etc.) ──
  const productDnaId = (data.brief_data as any)?.product_dna_id;
  if (productDnaId) {
    const { data: pdna } = await sb
      .from('product_dna')
      .select('ai_analysis, wizard_responses')
      .eq('id', productDnaId)
      .maybeSingle();

    if (pdna?.ai_analysis) {
      const analysis = parseIfString(pdna.ai_analysis);
      research.productCreativeBrief = analysis.creative_brief || analysis.creativeBrief || {};

      // Merge hooks from Product DNA creative brief
      const dnaHooks = research.productCreativeBrief?.hooks_suggestions || [];
      if (dnaHooks.length) {
        const existing = research.creatives || [];
        research.creatives = [
          ...existing,
          ...dnaHooks.map((h: string) => ({ title: h, structure: { hook: h } })),
        ];
      }

      // Merge CTA recommendations from DNA
      if (research.productCreativeBrief?.cta_recommendations?.length) {
        // Store for use in selectCTA
        (research as any)._dnaCTAs = research.productCreativeBrief.cta_recommendations;
      }
    }
  }

  // ── Fetch Client DNA (brand voice, tone, ideal customer) ──
  const clientId = data.client_id;
  if (clientId) {
    const { data: cdna } = await sb
      .from('client_dna')
      .select('dna_data, emotional_analysis')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cdna?.dna_data) {
      const dnaData = parseIfString(cdna.dna_data);
      const brand = dnaData.brand_identity || dnaData.brandIdentity || {};
      research.brandTone = brand.tone_of_voice || brand.toneOfVoice || '';
      research.brandStyle = brand.communication_style || brand.communicationStyle || '';
      research.brandKeyMessages = brand.key_messages || brand.keyMessages || [];

      // Merge Client DNA ideal customer pains/desires if product research is thin
      const idealCustomer = dnaData.ideal_customer || dnaData.idealCustomer || {};
      if (research.pains.length === 0 && idealCustomer.pain_points?.length) {
        research.pains = idealCustomer.pain_points.map((p: string) => ({ pain: p }));
      }
      if (research.desires.length === 0 && idealCustomer.desires?.length) {
        research.desires = idealCustomer.desires.map((d: string) => ({ desire: d }));
      }

      // Merge hook suggestions from ads targeting
      const adsTargeting = dnaData.ads_targeting || dnaData.adsTargeting || {};
      if (adsTargeting.hook_suggestions?.length) {
        const existing = research.creatives || [];
        research.creatives = [
          ...existing,
          ...adsTargeting.hook_suggestions.map((h: string) => ({ title: h, structure: { hook: h } })),
        ];
      }
    }

    // Use emotional analysis content recommendations for tone enrichment
    if (cdna?.emotional_analysis) {
      const ea = parseIfString(cdna.emotional_analysis);
      if (ea.content_recommendations?.suggested_tone && !research.brandTone) {
        research.brandTone = ea.content_recommendations.suggested_tone;
      }
    }
  }

  return research;
}

/**
 * Selects the best pain based on sphere phase and content index for variety
 */
function selectPain(research: ResearchData, phase: string, index: number = 0): string {
  const pains = research.pains || [];
  if (!pains.length) return '';

  // For engage phase, prefer more emotional/relatable pains
  // For solution phase, prefer functional pains
  // Use index to rotate through different pains for variety
  const selectedIndex = index % pains.length;
  const pain = pains[selectedIndex];

  return pain?.pain || (typeof pain === 'string' ? pain : '');
}

/**
 * Selects the best desire based on sphere phase and content index
 */
function selectDesire(research: ResearchData, phase: string, index: number = 0): string {
  const desires = research.desires || [];
  if (!desires.length) return '';

  const selectedIndex = index % desires.length;
  const desire = desires[selectedIndex];

  return desire?.desire || (typeof desire === 'string' ? desire : '');
}

/**
 * Selects the best objection based on sphere phase and content index
 */
function selectObjection(research: ResearchData, phase: string, index: number = 0): string {
  const objections = research.objections || [];
  if (!objections.length) return '';

  // For remarketing, objections are especially relevant
  const selectedIndex = index % objections.length;
  const objection = objections[selectedIndex];

  return objection?.objection || (typeof objection === 'string' ? objection : '');
}

/**
 * Selects the best avatar based on sphere phase
 */
function selectAvatar(research: ResearchData, phase: string, index: number = 0): string {
  const avatars = research.avatars || [];
  if (!avatars.length) return '';

  const selectedIndex = index % avatars.length;
  const avatar = avatars[selectedIndex];

  if (!avatar) return '';

  // Build avatar description
  let description = avatar.name || '';

  if (avatar.demographics) {
    const demo = avatar.demographics;
    const parts = [demo.age, demo.occupation, demo.location].filter(Boolean);
    if (parts.length) {
      description += ` (${parts.join(', ')})`;
    }
  }

  // Add key communication phrases if available
  if (avatar.communication?.phrases?.length) {
    const phrase = avatar.communication.phrases[0];
    description += ` - "${phrase}"`;
  }

  return description.trim();
}

/**
 * Selects the best sales angle based on sphere phase
 */
function selectSalesAngle(research: ResearchData, phase: string, index: number = 0): string {
  const angles = research.salesAngles || [];
  if (!angles.length) return '';

  // Filter angles that match the sphere phase if specified
  const phaseSpanish = SPHERE_PHASE_MAP[phase] || phase;

  // First try to find creatives that match the phase
  const creatives = research.creatives || [];
  const phaseCreatives = creatives.filter(c =>
    c.esferaPhase?.toLowerCase() === phaseSpanish.toLowerCase()
  );

  if (phaseCreatives.length > 0) {
    const creative = phaseCreatives[index % phaseCreatives.length];
    return creative.angle || creative.title || '';
  }

  // Fall back to general sales angles
  const selectedIndex = index % angles.length;
  const angle = angles[selectedIndex];

  return angle?.angle || (typeof angle === 'string' ? angle : '');
}

/**
 * Generates suggested hooks based on research and sphere phase.
 * Uses a global index offset to ensure each content item gets different hooks.
 */
function generateHooks(research: ResearchData, phase: string, count: number = 3, globalIndex: number = 0): string[] {
  const allHooks: string[] = [];
  const phaseSpanish = SPHERE_PHASE_MAP[phase] || phase;

  // Get hooks from video creatives that match the phase
  const creatives = research.creatives || [];
  const phaseCreatives = creatives.filter(c =>
    c.esferaPhase?.toLowerCase() === phaseSpanish.toLowerCase()
  );

  for (const creative of phaseCreatives) {
    const hook = creative.structure?.hook || creative.title;
    if (hook) allHooks.push(hook);
  }

  // Add hooks from sales angles
  const angles = research.salesAngles || [];
  for (const angle of angles) {
    if (angle.hookExample) allHooks.push(angle.hookExample);
  }

  // Add hooks from DNA creative brief
  const dnaHookSuggestions = research.productCreativeBrief?.hooks_suggestions || [];
  for (const h of dnaHookSuggestions) {
    if (h && !allHooks.includes(h)) allHooks.push(h);
  }

  if (allHooks.length === 0) return [];

  // Offset by globalIndex to give each content item different hooks
  const offset = (globalIndex * count) % allHooks.length;
  const result: string[] = [];
  for (let i = 0; i < count && i < allHooks.length; i++) {
    result.push(allHooks[(offset + i) % allHooks.length]);
  }

  return result;
}

/**
 * Selects narrative structure based on sphere phase
 */
function selectNarrativeStructure(phase: string, index: number = 0): string {
  const structures = NARRATIVE_BY_PHASE[phase] || NARRATIVE_BY_PHASE.engage;
  return structures[index % structures.length];
}

/**
 * Selects video duration based on sphere phase
 */
function selectVideoDuration(phase: string, index: number = 0): string {
  const durations = DURATION_BY_PHASE[phase] || DURATION_BY_PHASE.engage;
  return durations[index % durations.length];
}

/**
 * Selects CTA based on sphere phase + DNA recommendations
 */
function selectCTA(research: ResearchData, phase: string, index: number = 0): string {
  // Prefer DNA CTA recommendations if available
  const dnaCTAs = (research as any)?._dnaCTAs || research.productCreativeBrief?.cta_recommendations || [];
  const phaseCTAs = CTA_BY_PHASE[phase] || CTA_BY_PHASE.engage;
  const allCTAs = dnaCTAs.length > 0 ? [...dnaCTAs, ...phaseCTAs] : phaseCTAs;
  return allCTAs[index % allCTAs.length];
}

/**
 * Main function to generate prefill data for a content item
 */
export async function generatePrefillData(request: PrefillRequest): Promise<PrefillData | null> {
  const { productId, spherePhase, contentIndex = 0 } = request;

  // Fetch research data
  const research = await fetchProductResearch(productId);
  if (!research) {
    console.warn('[scriptPrefillService] No research data available for product:', productId);
    return null;
  }

  // Generate prefill data based on research and sphere phase
  const prefillData: PrefillData = {
    selected_pain: selectPain(research, spherePhase, contentIndex),
    selected_desire: selectDesire(research, spherePhase, contentIndex),
    selected_objection: selectObjection(research, spherePhase, contentIndex),
    target_country: 'México',
    narrative_structure: selectNarrativeStructure(spherePhase, contentIndex),
    video_duration: selectVideoDuration(spherePhase, contentIndex),
    ideal_avatar: selectAvatar(research, spherePhase, contentIndex),
    sales_angle: selectSalesAngle(research, spherePhase, contentIndex),
    suggested_hooks: generateHooks(research, spherePhase, 3, contentIndex),
    cta: selectCTA(research, spherePhase, contentIndex),
  };

  return prefillData;
}

/**
 * Batch generate prefills for multiple content items
 */
export async function generateBatchPrefills(
  productId: string,
  spherePhase: 'engage' | 'solution' | 'remarketing' | 'fidelize',
  count: number
): Promise<PrefillData[]> {
  const prefills: PrefillData[] = [];

  for (let i = 0; i < count; i++) {
    const prefill = await generatePrefillData({
      productId,
      spherePhase,
      contentIndex: i,
    });

    if (prefill) {
      prefills.push(prefill);
    }
  }

  return prefills;
}

/**
 * Builds strategist guidelines enriched with DNA + research data for a content item.
 * Each item gets unique combinations via contentIndex rotation.
 */
export async function buildDNAEnrichedGuidelines(
  productId: string,
  phase: { key: string; label: string; description: string; audience: string; metaCampaign: string; contentExamples: string },
  phaseDefaults: { objective: string; techniques: string[]; tone: string; defaultCTA: string },
  contentIndex: number = 0
): Promise<string> {
  const research = await fetchProductResearch(productId);

  const pain = research ? selectPain(research, phase.key, contentIndex) : '';
  const desire = research ? selectDesire(research, phase.key, contentIndex) : '';
  const objection = research ? selectObjection(research, phase.key, contentIndex) : '';
  const avatar = research ? selectAvatar(research, phase.key, contentIndex) : '';
  const angle = research ? selectSalesAngle(research, phase.key, contentIndex) : '';
  const hooks = research ? generateHooks(research, phase.key, 3, contentIndex) : [];
  const puv = research?.puv?.main || '';
  const transformation = research?.transformation;

  let guidelines = `## Fase: ${phase.label}
**Objetivo:** ${phaseDefaults.objective}
**Audiencia:** ${phase.audience}
**Tono recomendado:** ${phaseDefaults.tone}`;

  // Add brand DNA tone if available
  if (research?.brandTone) {
    guidelines += `\n**Tono de marca (ADN):** ${research.brandTone}`;
  }
  if (research?.brandStyle) {
    guidelines += `\n**Estilo de comunicacion:** ${research.brandStyle}`;
  }

  guidelines += `\n\n### Investigacion Asignada (unico para este creativo)`;
  if (pain) guidelines += `\n- **Dolor:** ${pain}`;
  if (desire) guidelines += `\n- **Deseo:** ${desire}`;
  if (objection) guidelines += `\n- **Objecion a superar:** ${objection}`;
  if (avatar) guidelines += `\n- **Avatar ideal:** ${avatar}`;
  if (angle) guidelines += `\n- **Angulo de venta:** ${angle}`;
  if (puv) guidelines += `\n- **PUV:** ${puv}`;
  if (transformation) {
    guidelines += `\n- **Transformacion:** De "${transformation.before || '...'}" a "${transformation.after || '...'}"`;
  }

  if (hooks.length) {
    guidelines += `\n\n### Hooks Sugeridos`;
    hooks.forEach((h, i) => { guidelines += `\n${i + 1}. ${h}`; });
  }

  if (research?.brandKeyMessages?.length) {
    guidelines += `\n\n### Mensajes Clave de Marca`;
    research.brandKeyMessages.forEach(m => { guidelines += `\n- ${m}`; });
  }

  guidelines += `\n\n### Direccion Estrategica
- **Tecnicas recomendadas:** ${phaseDefaults.techniques.join(', ')}
- **CTA sugerido:** ${phaseDefaults.defaultCTA}
- **Tipo de campana Meta:** ${phase.metaCampaign}
- **Ejemplos de contenido:** ${phase.contentExamples}`;

  return guidelines.trim();
}

/**
 * Updates a content item with prefill data
 */
export async function updateContentWithPrefill(
  contentId: string,
  prefillData: PrefillData
): Promise<boolean> {
  const { error } = await supabase
    .from('content')
    .update({
      selected_pain: prefillData.selected_pain,
      selected_desire: prefillData.selected_desire,
      selected_objection: prefillData.selected_objection,
      target_country: prefillData.target_country,
      narrative_structure: prefillData.narrative_structure,
      video_duration: prefillData.video_duration,
      ideal_avatar: prefillData.ideal_avatar,
      sales_angle: prefillData.sales_angle,
      suggested_hooks: prefillData.suggested_hooks,
      cta: prefillData.cta,
      ai_prefilled: true,
      ai_prefilled_at: new Date().toISOString(),
    })
    .eq('id', contentId);

  if (error) {
    console.error('[scriptPrefillService] Error updating content:', error);
    return false;
  }

  return true;
}
