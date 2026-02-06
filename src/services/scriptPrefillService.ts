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

/**
 * Fetches and parses research data from a product
 */
async function fetchProductResearch(productId: string): Promise<ResearchData | null> {
  const { data, error } = await supabase
    .from('products')
    .select('market_research, avatar_profiles, sales_angles_data, ideal_avatar, sales_angles')
    .eq('id', productId)
    .maybeSingle();

  if (error || !data) {
    console.error('[scriptPrefillService] Error fetching product:', error);
    return null;
  }

  // Parse JSON fields if they are strings
  const parseIfString = (value: any) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  const marketResearch = parseIfString(data.market_research);
  const avatarProfiles = parseIfString(data.avatar_profiles);
  const salesAnglesData = parseIfString(data.sales_angles_data);
  const idealAvatar = parseIfString(data.ideal_avatar);

  // Extract research data from various possible structures
  const research: ResearchData = {};

  // Extract pains
  research.pains = marketResearch?.pains ||
                   marketResearch?.pains_desires?.pains ||
                   idealAvatar?.jtbd?.pains ||
                   [];

  // Extract desires
  research.desires = marketResearch?.desires ||
                     marketResearch?.pains_desires?.desires ||
                     idealAvatar?.jtbd?.desires ||
                     [];

  // Extract objections
  research.objections = marketResearch?.objections ||
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
  research.creatives = marketResearch?.video_creatives?.creatives ||
                       marketResearch?.creatives ||
                       [];

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
 * Generates suggested hooks based on research and sphere phase
 */
function generateHooks(research: ResearchData, phase: string, count: number = 3): string[] {
  const hooks: string[] = [];
  const phaseSpanish = SPHERE_PHASE_MAP[phase] || phase;

  // Get hooks from video creatives that match the phase
  const creatives = research.creatives || [];
  const phaseCreatives = creatives.filter(c =>
    c.esferaPhase?.toLowerCase() === phaseSpanish.toLowerCase()
  );

  for (const creative of phaseCreatives.slice(0, count)) {
    const hook = creative.structure?.hook || creative.title;
    if (hook) hooks.push(hook);
  }

  // Add hooks from sales angles
  const angles = research.salesAngles || [];
  for (const angle of angles.slice(0, count - hooks.length)) {
    if (angle.hookExample) {
      hooks.push(angle.hookExample);
    }
  }

  return hooks.slice(0, count);
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
 * Selects CTA based on sphere phase
 */
function selectCTA(phase: string, index: number = 0): string {
  const ctas = CTA_BY_PHASE[phase] || CTA_BY_PHASE.engage;
  return ctas[index % ctas.length];
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
    target_country: 'México', // Default, can be customized based on product data
    narrative_structure: selectNarrativeStructure(spherePhase, contentIndex),
    video_duration: selectVideoDuration(spherePhase, contentIndex),
    ideal_avatar: selectAvatar(research, spherePhase, contentIndex),
    sales_angle: selectSalesAngle(research, spherePhase, contentIndex),
    suggested_hooks: generateHooks(research, spherePhase, 3),
    cta: selectCTA(spherePhase, contentIndex),
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
