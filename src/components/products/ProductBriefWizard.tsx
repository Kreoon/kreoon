import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Package,
  Target,
  Brain,
  Users,
  Megaphone,
  FileText,
  Wand2,
  ChevronDown,
  RotateCcw,
  Save,
  Film,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { invokeProductResearch } from '@/lib/productResearch';
import { generatePrefillData, type PrefillData } from '@/services/scriptPrefillService';
import { ResearchProgressIndicator } from './ResearchProgressIndicator';
import { toast } from 'sonner';

// Comprehensive brief data structure
interface BriefData {
  // Section 0: Business Type
  businessType: 'product_service' | 'personal_brand';

  // Section 1: Product Basics
  productName: string;
  category: string;
  customCategory: string;
  currentObjective: string;
  slogan: string;
  targetMarket: string; // Country/Region for competition analysis

  // Section 2: Value & Transformation
  mainBenefit: string;
  transformation: string;
  differentiator: string;
  keyIngredients: string;
  mustCommunicate: string;

  // Section 2.5: Product Details (NEW)
  priceRange: string;
  deliveryMethod: string;
  productFormat: string;
  guarantees: string;
  socialProof: string;
  yearsInMarket: string;
  successStories: string;

  // Section 3: Problem & Desire
  problemSolved: string;
  mainDesire: string;
  consequenceOfNotBuying: string;
  competitiveAdvantage: string;
  // NEW fields for deeper understanding
  rootCause: string;
  failedSolutions: string;
  urgencyLevel: string;

  // Section 4: Neuromarketing
  reptileBrain: string[];
  limbicBrain: string[];
  cortexBrain: string;

  // Section 5: Target Audience
  targetGender: string;
  targetAgeRange: string[];
  targetOccupation: string;
  targetInterests: string[];
  targetHabits: string;
  commonObjections: string[];
  customObjections: string;
  idealScenario: string;
  // NEW fields for better avatar creation
  buyingPower: string;
  decisionInfluencers: string;
  informationSources: string;
  purchaseTriggers: string;

  // Section 6: Content Strategy
  contentTypes: string[];
  platforms: string[];
  useForAds: string;
  referenceContent: string;
  brandStrengths: string;
  brandRestrictions: string;
  expectedResult: string;
  additionalNotes: string;
  // NEW fields for content strategy
  brandVoice: string;
  competitorContent: string;
  budgetRange: string;

  // Document URL for additional context
  documentUrl: string;

  // Section 7: Video Distribution (Método ESFERA)
  creativesCount: number;
  phaseDistribution: PhaseDistribution;

  // AI-enhanced fields
  aiSuggestedAngles: string[];
  aiSuggestedHooks: string[];
}

// Esfera phase distribution
interface PhaseDistribution {
  engage: number;
  solution: number;
  remarketing: number;
  fidelize: number;
}

interface ProductBriefWizardProps {
  productId: string;
  productName: string;
  existingBrief?: Partial<BriefData>;
  onComplete: () => void;
}

const STEPS = [
  { id: 'basics', title: 'Producto', description: 'Información básica', icon: Package },
  { id: 'value', title: 'Valor', description: 'Beneficios y transformación', icon: Sparkles },
  { id: 'problem', title: 'Problema', description: 'Dolor y deseo', icon: Target },
  { id: 'neuro', title: 'Neuromarketing', description: 'Los 3 cerebros', icon: Brain },
  { id: 'audience', title: 'Avatar', description: 'Cliente ideal', icon: Users },
  { id: 'content', title: 'Contenido', description: 'Estrategia y plataformas', icon: Megaphone },
  { id: 'videos', title: 'Videos', description: 'Crear nuevos proyectos', icon: Film },
];

// Esfera phases configuration
const ESFERA_PHASES = [
  {
    key: 'engage' as const,
    label: 'ENGANCHAR',
    icon: '⚡',
    color: 'bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    description: 'Captar atención de audiencia fría',
    audience: '❄️ Audiencia FRÍA',
    metaCampaign: 'RECONOCIMIENTO o ALCANCE',
    contentExamples: 'Hooks impactantes, problemas visibles, patrones rotos',
  },
  {
    key: 'solution' as const,
    label: 'SOLUCIÓN',
    icon: '💡',
    color: 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    description: 'Mostrar tu producto como LA solución',
    audience: '🔥 Audiencia TIBIA',
    metaCampaign: 'VENTAS o CONVERSIONES',
    contentExamples: 'Demostraciones, beneficios claros, ofertas',
  },
  {
    key: 'remarketing' as const,
    label: 'REMARKETING',
    icon: '🔄',
    color: 'bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700',
    textColor: 'text-amber-700 dark:text-amber-300',
    description: 'Recuperar a quienes no compraron',
    audience: '🔥🔥 Audiencia CALIENTE',
    metaCampaign: 'RETARGETING',
    contentExamples: 'Testimonios, garantías, urgencia',
  },
  {
    key: 'fidelize' as const,
    label: 'FIDELIZAR',
    icon: '💎',
    color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-300',
    description: 'Que vuelvan a comprar y te recomienden',
    audience: '💰 CLIENTES',
    metaCampaign: 'ENGAGEMENT de clientes',
    contentExamples: 'Tips exclusivos, nuevos productos, upsells',
  },
];

// Default phase distribution
const DEFAULT_PHASE_DISTRIBUTION: PhaseDistribution = {
  engage: 0,
  solution: 0,
  remarketing: 0,
  fidelize: 0,
};

// Phase defaults for prefilling content items
const PHASE_DEFAULTS: Record<string, {
  defaultCTA: string;
  funnelStage: string;
  objective: string;
  techniques: string[];
  tone: string;
}> = {
  engage: {
    defaultCTA: 'Sígueme para más tips',
    funnelStage: 'tofu',
    objective: 'Captar atención y generar awareness',
    techniques: ['Hook disruptivo', 'Pattern interrupt', 'Curiosidad'],
    tone: 'Disruptivo, viral, llamativo',
  },
  solution: {
    defaultCTA: 'Link en la bio',
    funnelStage: 'mofu',
    objective: 'Demostrar valor y generar interés',
    techniques: ['Demostración', 'Beneficios claros', 'Testimonios'],
    tone: 'Persuasivo, confiado, directo',
  },
  remarketing: {
    defaultCTA: 'Aprovecha ahora',
    funnelStage: 'bofu',
    objective: 'Superar objeciones y cerrar venta',
    techniques: ['Objeciones', 'Garantías', 'Escasez'],
    tone: 'Urgente, resolutivo, confiable',
  },
  fidelize: {
    defaultCTA: 'Comparte con alguien',
    funnelStage: 'post',
    objective: 'Aumentar LTV y generar referidos',
    techniques: ['Comunidad', 'Exclusividad', 'Behind scenes'],
    tone: 'Cercano, exclusivo, agradecido',
  },
};

// Labels for reptile brain triggers
const REPTILE_LABELS: Record<string, string> = {
  survival: 'Supervivencia / Seguridad',
  reproduction: 'Atracción / Seducción',
  power: 'Poder / Estatus',
  scarcity: 'Escasez / Urgencia',
  territory: 'Territorio / Pertenencia',
  food: 'Placer / Recompensa',
};

// Labels for limbic emotions
const LIMBIC_LABELS: Record<string, string> = {
  happiness: 'Felicidad',
  confidence: 'Confianza',
  freedom: 'Libertad',
  peace: 'Paz / Tranquilidad',
  pride: 'Orgullo',
  love: 'Amor / Conexión',
  excitement: 'Emoción / Aventura',
  hope: 'Esperanza',
  belonging: 'Pertenencia',
  relief: 'Alivio',
};

// Build strategist guidelines from brief data
function buildStrategistGuidelines(
  briefData: BriefData,
  phase: typeof ESFERA_PHASES[number]
): string {
  const phaseDefaults = PHASE_DEFAULTS[phase.key];

  // Map reptile brain values to labels
  const reptileLabels = briefData.reptileBrain
    .map(v => REPTILE_LABELS[v] || v)
    .join(', ') || 'No especificado';

  // Map limbic brain values to labels
  const limbicLabels = briefData.limbicBrain
    .map(v => LIMBIC_LABELS[v] || v)
    .join(', ') || 'No especificado';

  return `## Fase: ${phase.label}
**Objetivo:** ${phaseDefaults.objective}
**Audiencia:** ${phase.audience}
**Campaña Meta sugerida:** ${phase.metaCampaign}

### Contexto del Producto
- **Nombre:** ${briefData.productName}
- **Categoría:** ${briefData.category}
- **Slogan:** ${briefData.slogan}
- **Beneficio principal:** ${briefData.mainBenefit}
- **Transformación:** ${briefData.transformation}
- **Diferenciador:** ${briefData.differentiator}

### Problema que Resuelve
- **Problema:** ${briefData.problemSolved}
- **Deseo principal:** ${briefData.mainDesire}
- **Consecuencia de no comprar:** ${briefData.consequenceOfNotBuying}

### Neuromarketing
- **Cerebro Reptil:** ${reptileLabels}
- **Cerebro Límbico:** ${limbicLabels}
- **Justificación Racional:** ${briefData.cortexBrain}

### Avatar del Cliente
- **Género:** ${briefData.targetGender === 'female' ? 'Mujeres' : briefData.targetGender === 'male' ? 'Hombres' : 'Ambos'}
- **Edad:** ${briefData.targetAgeRange.join(', ')}
- **Ocupación:** ${briefData.targetOccupation}
- **Intereses:** ${briefData.targetInterests.join(', ')}
- **Objeciones comunes:** ${briefData.commonObjections.join(', ')}

### Dirección Estratégica para esta Fase
- **Tono recomendado:** ${phaseDefaults.tone}
- **Técnicas sugeridas:** ${phaseDefaults.techniques.join(', ')}
- **CTA sugerido:** ${phaseDefaults.defaultCTA}
- **Etapa del embudo:** ${phaseDefaults.funnelStage.toUpperCase()}

### Ejemplos de contenido para esta fase
${phase.contentExamples}
`.trim();
}

const CATEGORIES = [
  'Educación / Cursos Online',
  'Coaching / Mentoría',
  'Salud y Bienestar',
  'Fitness / Deportes',
  'Belleza / Cosmética',
  'Finanzas / Inversiones',
  'Marketing / Negocios',
  'Tecnología / Software',
  'E-commerce / Productos físicos',
  'Alimentación / Suplementos',
  'Desarrollo Personal',
  'Servicios Profesionales',
  'Otro',
];

const OBJECTIVES = [
  'Lanzamiento de producto nuevo',
  'Aumentar ventas',
  'Posicionamiento de marca',
  'Generar leads/prospectos',
  'Fidelizar clientes actuales',
  'Reactivar clientes inactivos',
  'Educar al mercado',
  'Validar oferta',
];

const REPTILE_TRIGGERS = [
  { value: 'survival', label: 'Supervivencia / Seguridad', desc: 'Protección, estabilidad financiera' },
  { value: 'reproduction', label: 'Atracción / Seducción', desc: 'Verse bien, atraer pareja' },
  { value: 'power', label: 'Poder / Estatus', desc: 'Dominio, reconocimiento social' },
  { value: 'scarcity', label: 'Escasez / Urgencia', desc: 'Miedo a perder, FOMO' },
  { value: 'territory', label: 'Territorio / Pertenencia', desc: 'Ser parte de algo exclusivo' },
  { value: 'food', label: 'Placer / Recompensa', desc: 'Gratificación inmediata' },
];

const LIMBIC_EMOTIONS = [
  { value: 'happiness', label: 'Felicidad', emoji: '😊' },
  { value: 'confidence', label: 'Confianza', emoji: '💪' },
  { value: 'freedom', label: 'Libertad', emoji: '🦋' },
  { value: 'peace', label: 'Paz / Tranquilidad', emoji: '🧘' },
  { value: 'pride', label: 'Orgullo', emoji: '🏆' },
  { value: 'love', label: 'Amor / Conexión', emoji: '❤️' },
  { value: 'excitement', label: 'Emoción / Aventura', emoji: '🎢' },
  { value: 'hope', label: 'Esperanza', emoji: '✨' },
  { value: 'belonging', label: 'Pertenencia', emoji: '🤝' },
  { value: 'relief', label: 'Alivio', emoji: '😌' },
];

const COMMON_OBJECTIONS = [
  'Es muy caro',
  'No tengo tiempo',
  'No sé si funcionará para mí',
  'Ya probé algo similar y no funcionó',
  'Necesito consultarlo con alguien',
  'No es el momento adecuado',
  'No confío en compras online',
  'Necesito ver más testimonios',
  'Es muy complicado',
  'No lo necesito ahora',
];

const CONTENT_TYPES = [
  { value: 'ugc', label: 'UGC (User Generated Content)' },
  { value: 'testimonial', label: 'Testimoniales' },
  { value: 'educational', label: 'Educativo / Tips' },
  { value: 'before_after', label: 'Antes y Después' },
  { value: 'unboxing', label: 'Unboxing' },
  { value: 'tutorial', label: 'Tutorial / How-to' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'talking_head', label: 'Talking Head' },
  { value: 'story', label: 'Storytelling' },
  { value: 'meme', label: 'Memes / Trends' },
  { value: 'comparison', label: 'Comparación' },
  { value: 'bts', label: 'Behind the Scenes' },
];

const PLATFORMS = [
  { value: 'meta', label: 'Meta (Facebook/Instagram)', icon: '📱' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'youtube', label: 'YouTube', icon: '▶️' },
  { value: 'youtube_shorts', label: 'YouTube Shorts', icon: '📺' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'twitter', label: 'X (Twitter)', icon: '𝕏' },
  { value: 'pinterest', label: 'Pinterest', icon: '📌' },
  { value: 'email', label: 'Email Marketing', icon: '📧' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
];

const AGE_RANGES = [
  '18-24 años',
  '25-34 años',
  '35-44 años',
  '45-54 años',
  '55-64 años',
  '65+ años',
];

const INTERESTS = [
  'Emprendimiento',
  'Desarrollo personal',
  'Fitness y salud',
  'Moda y belleza',
  'Tecnología',
  'Finanzas personales',
  'Viajes',
  'Familia y hogar',
  'Arte y creatividad',
  'Deportes',
  'Gastronomía',
  'Espiritualidad',
];

const TARGET_MARKETS = [
  'México',
  'Colombia',
  'Argentina',
  'España',
  'Chile',
  'Perú',
  'Estados Unidos (Hispano)',
  'Latinoamérica (LATAM)',
  'Centroamérica',
  'Sudamérica',
  'Europa (Hispano)',
  'Global (Español)',
];

const DEFAULT_BRIEF: BriefData = {
  businessType: 'product_service',
  productName: '',
  category: '',
  customCategory: '',
  currentObjective: '',
  slogan: '',
  targetMarket: '',
  mainBenefit: '',
  transformation: '',
  differentiator: '',
  keyIngredients: '',
  mustCommunicate: '',
  // Product Details (new)
  priceRange: '',
  deliveryMethod: '',
  productFormat: '',
  guarantees: '',
  socialProof: '',
  yearsInMarket: '',
  successStories: '',
  // Problem & Desire
  problemSolved: '',
  mainDesire: '',
  consequenceOfNotBuying: '',
  competitiveAdvantage: '',
  rootCause: '',
  failedSolutions: '',
  urgencyLevel: '',
  // Neuromarketing
  reptileBrain: [],
  limbicBrain: [],
  cortexBrain: '',
  // Target Audience
  targetGender: '',
  targetAgeRange: [],
  targetOccupation: '',
  targetInterests: [],
  targetHabits: '',
  commonObjections: [],
  customObjections: '',
  idealScenario: '',
  buyingPower: '',
  decisionInfluencers: '',
  informationSources: '',
  purchaseTriggers: '',
  // Content Strategy
  contentTypes: [],
  platforms: [],
  useForAds: '',
  referenceContent: '',
  brandStrengths: '',
  brandRestrictions: '',
  expectedResult: '',
  additionalNotes: '',
  brandVoice: '',
  competitorContent: '',
  budgetRange: '',
  // Document
  documentUrl: '',
  // Video Distribution
  creativesCount: 0,
  phaseDistribution: DEFAULT_PHASE_DISTRIBUTION,
  aiSuggestedAngles: [],
  aiSuggestedHooks: [],
};

export function ProductBriefWizard({ 
  productId, 
  productName, 
  existingBrief,
  onComplete 
}: ProductBriefWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingContent, setIsCreatingContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [briefData, setBriefData] = useState<BriefData>({
    ...DEFAULT_BRIEF,
    productName: productName || '',
    ...existingBrief,
  });

  // Save brief to database (usa Edge Function para evitar 500 por RLS)
  const saveBrief = useCallback(async (showToast = true) => {
    if (isSaving) return;

    setIsSaving(true);
    const sanitizeBusinessType = (v: string) =>
      (v === 'personal_brand' || v === 'product_service') ? v : 'product_service';
    const completed = isAllStepsComplete();
    const payload = {
      productId,
      briefData: JSON.parse(JSON.stringify(briefData)),
      briefStatus: completed ? 'completed' : 'in_progress',
      briefCompletedAt: completed ? new Date().toISOString() : null,
      businessType: sanitizeBusinessType(briefData.businessType || 'product_service'),
    };

    const saveViaFunction = async () => {
      const { data, error } = await supabase.functions.invoke('save-product-brief', {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return !data?.error;
    };

    const saveViaDirect = async () => {
      const { error } = await supabase
        .from('products')
        .update({
          brief_data: payload.briefData,
          brief_status: payload.briefStatus,
          brief_completed_at: payload.briefCompletedAt,
          business_type: payload.businessType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select('id');
      if (error) throw error;
    };

    try {
      try {
        await saveViaDirect();
      } catch {
        await new Promise((r) => setTimeout(r, 600));
        await saveViaFunction();
      }
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
      if (showToast) toast.success('Brief guardado correctamente');
    } catch (error) {
      console.error('Error saving brief:', error);
      const msg = error instanceof Error ? error.message : 'Error de conexión';
      if (showToast) toast.error('Error al guardar el brief', { description: msg });
    } finally {
      setIsSaving(false);
    }
  }, [briefData, productId, isSaving]);

  // Check if all steps are complete
  const isAllStepsComplete = useCallback(() => {
    for (let i = 0; i < STEPS.length; i++) {
      if (!isStepCompleteCheck(i)) return false;
    }
    return true;
  }, [briefData]);

  // Separate validation function to avoid dependency issues
  const isStepCompleteCheck = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(
          briefData.productName.trim() &&
          briefData.category &&
          briefData.currentObjective &&
          briefData.slogan.trim() &&
          briefData.targetMarket
        );
      case 1:
        return !!(
          briefData.mainBenefit.trim() &&
          briefData.transformation.trim() &&
          briefData.differentiator.trim() &&
          briefData.keyIngredients.trim() &&
          briefData.mustCommunicate.trim()
        );
      case 2:
        return !!(
          briefData.problemSolved.trim() &&
          briefData.mainDesire.trim() &&
          briefData.consequenceOfNotBuying.trim() &&
          briefData.competitiveAdvantage.trim()
        );
      case 3:
        return !!(
          briefData.reptileBrain.length > 0 &&
          briefData.limbicBrain.length > 0 &&
          briefData.cortexBrain.trim()
        );
      case 4:
        return !!(
          briefData.targetGender &&
          briefData.targetAgeRange.length > 0 &&
          briefData.targetOccupation.trim() &&
          briefData.targetInterests.length > 0 &&
          briefData.targetHabits.trim() &&
          briefData.commonObjections.length > 0 &&
          briefData.idealScenario.trim()
        );
      case 5:
        return !!(
          briefData.contentTypes.length > 0 &&
          briefData.platforms.length > 0 &&
          briefData.useForAds &&
          briefData.brandStrengths.trim() &&
          briefData.expectedResult.trim()
        );
      case 6:
        // Videos step is optional - always complete
        return true;
      default:
        return false;
    }
  };

  // Auto-save when changing steps
  useEffect(() => {
    if (hasUnsavedChanges) {
      saveBrief(false);
    }
  }, [currentStep]);

  // Auto-save debounced (every 30 seconds if there are changes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges && !isSaving) {
        saveBrief(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [hasUnsavedChanges, isSaving, saveBrief]);

  const updateField = <K extends keyof BriefData>(field: K, value: BriefData[K]) => {
    setBriefData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const toggleArrayField = (field: keyof BriefData, value: string) => {
    const current = briefData[field] as string[];
    if (current.includes(value)) {
      updateField(field, current.filter(v => v !== value) as any);
    } else {
      updateField(field, [...current, value] as any);
    }
  };

  const isStepComplete = (step: number): boolean => isStepCompleteCheck(step);

  const canProceed = isStepComplete(currentStep);
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const enhanceWithAI = async (field: string, mode: 'append' | 'replace' = 'append') => {
    setEnhancingField(field);
    try {
      const fieldLabels: Record<string, string> = {
        slogan: 'slogan o frase de venta',
        mainBenefit: 'beneficio principal',
        transformation: 'transformación que produce',
        differentiator: 'diferenciador único',
        problemSolved: 'problema que resuelve',
        mainDesire: 'deseo principal',
        consequenceOfNotBuying: 'consecuencia de no comprar',
        competitiveAdvantage: 'ventaja competitiva',
        cortexBrain: 'argumento racional de compra',
        idealScenario: 'escenario ideal post-compra',
      };

      const currentValue = ((briefData as any)[field] || '').toString();
      const base = currentValue.trim();
      const fieldLabel = fieldLabels[field] || field;
      const shouldAppend = mode === 'append' && !!base;

      const systemPrompt = shouldAppend
        ? `Eres un experto en copywriting y estrategia de marketing. Tu tarea es COMPLEMENTAR el texto del usuario para un brief de producto.

Producto: ${briefData.productName}
Categoría: ${briefData.category}
Objetivo: ${briefData.currentObjective || 'No especificado'}

REGLAS CRÍTICAS:
- NO reescribas, NO reemplaces y NO parafrasees el texto original.
- Devuelve ÚNICAMENTE un complemento (1-2 frases) para agregar DESPUÉS del texto.
- No repitas el texto original.
- Español latinoamericano.
- Responde SOLO con el complemento, sin comillas ni explicaciones.`
        : `Eres un experto en copywriting y estrategia de marketing. Tu tarea es GENERAR una versión mejor del campo del brief.

Producto: ${briefData.productName}
Categoría: ${briefData.category}
Objetivo: ${briefData.currentObjective || 'No especificado'}

REGLAS:
- Entrega una versión final lista para pegar.
- Español latinoamericano.
- Máximo 2-3 oraciones.
- Responde SOLO con el texto final, sin comillas ni explicaciones.`;

      const userPrompt = shouldAppend
        ? `Texto actual del usuario (${fieldLabel}): ${base}

Escribe 1-2 frases de complemento para agregar al final.`
        : base
          ? `Reescribe y mejora este ${fieldLabel} (puedes cambiar lo necesario, pero mantén la intención): ${base}`
          : `Crea un ${fieldLabel} impactante para este producto (2-3 oraciones).`;

      const { data, error } = await supabase.functions.invoke('multi-ai', {
        body: {
          provider: 'gemini',
          model: 'google/gemini-2.5-flash',
          mode: 'first',
          models: ['gemini'],
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        },
      });

      if (error) throw error;

      const aiText = (data?.content || data?.response || data?.result || '').toString().trim();
      if (!aiText) {
        if (data?.error) throw new Error(data.error);
        throw new Error('Respuesta vacía de IA');
      }

      const nextValue = shouldAppend
        ? `${base}${base.endsWith('.') ? '' : '.'} ${aiText}`
        : aiText;

      updateField(field as keyof BriefData, nextValue);
      toast.success(shouldAppend ? 'Texto complementado con IA' : 'Texto generado con IA');
    } catch (error) {
      console.error('AI enhancement error:', error);
      toast.error('Error al mejorar con IA');
    } finally {
      setEnhancingField(null);
    }
  };

  const handleGenerateResearch = async () => {
    console.log('[Brief] Generar Investigación: clic recibido');
    if (!isStepComplete(0) || !isStepComplete(1) || !isStepComplete(2)) {
      console.log('[Brief] Generar Investigación: pasos incompletos, abortando');
      toast.error('Completa al menos las primeras 3 secciones del brief');
      return;
    }

    setIsGenerating(true);
    console.log('[Brief] Generar Investigación: iniciando, productId=', productId);
    try {
      const payload = { brief_status: 'in_progress', brief_data: JSON.parse(JSON.stringify(briefData)) };
      let updateErr: any = null;
      for (let i = 0; i < 2; i++) {
        const { error } = await supabase.from('products').update(payload).eq('id', productId).select('id');
        if (!error) { updateErr = null; break; }
        updateErr = error;
        if (i < 1) await new Promise(r => setTimeout(r, 800));
      }
      if (updateErr) {
        console.error('[Brief] Generar Investigación: error al actualizar producto', updateErr);
        throw updateErr;
      }
      console.log('[Brief] Generar Investigación: producto actualizado OK, invocando product-research (Kreoon)...');

      const { data, error } = await invokeProductResearch({ productId, briefData });

      console.log('[Brief] Generar Investigación: respuesta product-research', { data, error });

      if (error) throw error;

      if (data?.success) {
        toast.success('¡Investigación completada!', {
          description: 'Se ha generado el análisis de mercado, competencia y avatares.'
        });
        onComplete();
      } else {
        throw new Error(data?.error || 'Error al generar la investigación');
      }
    } catch (error) {
      console.error('Research generation error:', error);
      toast.error('Error al generar la investigación', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo más tarde'
      });
      
      await supabase
        .from('products')
        .update({ brief_status: 'pending' })
        .eq('id', productId);
    } finally {
      setIsGenerating(false);
    }
  };

  // Create content items based on phase distribution
  const handleCreateContentItems = async () => {
    const totalVideos = Object.values(briefData.phaseDistribution).reduce((a, b) => a + b, 0);
    if (totalVideos === 0) {
      toast.error('Selecciona al menos un video para crear');
      return;
    }

    setIsCreatingContent(true);
    try {
      // Get product info to find client
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('client_id')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const clientId = productData?.client_id;

      // Get organization_id from clients table if client exists
      let organizationId: string | null = null;
      if (clientId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('organization_id')
          .eq('id', clientId)
          .single();
        organizationId = clientData?.organization_id || null;
      }

      // Build content items array with prefill data
      const contentItems: Array<{
        title: string;
        client_id: string | null;
        product_id: string;
        status: 'draft';
        organization_id: string | null;
        sphere_phase: string;
        funnel_stage: string;
        content_objective: string;
        cta: string;
        hooks_count: number;
        target_platform: string;
        description: string;
        strategist_guidelines: string;
        // Prefill fields
        selected_pain?: string;
        selected_desire?: string;
        selected_objection?: string;
        target_country?: string;
        narrative_structure?: string;
        video_duration?: string;
        ideal_avatar?: string;
        sales_angle?: string;
        suggested_hooks?: string[];
        ai_prefilled?: boolean;
        ai_prefilled_at?: string;
      }> = [];

      // Track content index per phase for prefill variety
      const phaseIndexes: Record<string, number> = {};

      // For each phase with videos, create content items with AI prefills
      for (const phase of ESFERA_PHASES) {
        const count = briefData.phaseDistribution[phase.key] || 0;
        const phaseDefaults = PHASE_DEFAULTS[phase.key];
        phaseIndexes[phase.key] = 0;

        for (let i = 0; i < count; i++) {
          // Generate AI prefill data for this content item
          let prefillData: PrefillData | null = null;
          try {
            prefillData = await generatePrefillData({
              productId,
              spherePhase: phase.key as 'engage' | 'solution' | 'remarketing' | 'fidelize',
              contentIndex: phaseIndexes[phase.key],
            });
            phaseIndexes[phase.key]++;
          } catch (prefillError) {
            console.warn('[ProductBriefWizard] Error generating prefill:', prefillError);
            // Continue without prefill if it fails
          }

          contentItems.push({
            title: `${briefData.productName} - ${phase.label} ${i + 1}`,
            client_id: clientId,
            product_id: productId,
            status: 'draft' as const,
            organization_id: organizationId,
            sphere_phase: phase.key,
            funnel_stage: phaseDefaults.funnelStage,
            content_objective: phaseDefaults.objective,
            cta: prefillData?.cta || phaseDefaults.defaultCTA,
            hooks_count: 3,
            target_platform: briefData.platforms[0] || 'instagram',
            description: `Contenido para fase ${phase.label}: ${phase.description}. Objetivo: ${briefData.currentObjective}. Audiencia: ${phase.audience}.`,
            strategist_guidelines: buildStrategistGuidelines(briefData, phase),
            // Include AI prefill data if available
            ...(prefillData && {
              selected_pain: prefillData.selected_pain,
              selected_desire: prefillData.selected_desire,
              selected_objection: prefillData.selected_objection,
              target_country: prefillData.target_country,
              narrative_structure: prefillData.narrative_structure,
              video_duration: prefillData.video_duration,
              ideal_avatar: prefillData.ideal_avatar,
              sales_angle: prefillData.sales_angle,
              suggested_hooks: prefillData.suggested_hooks,
              ai_prefilled: true,
              ai_prefilled_at: new Date().toISOString(),
            }),
          });
        }
      }

      // Insert all content items
      const { error: insertError } = await supabase
        .from('content')
        .insert(contentItems);

      if (insertError) throw insertError;

      toast.success(`¡${contentItems.length} proyectos creados!`, {
        description: 'Los proyectos están listos para generar guiones con 1 clic.',
      });

      // Reset phase distribution after creation
      updateField('phaseDistribution', DEFAULT_PHASE_DISTRIBUTION);

      onComplete();
    } catch (error) {
      console.error('Error creating content items:', error);
      toast.error('Error al crear los proyectos', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo',
      });
    } finally {
      setIsCreatingContent(false);
    }
  };

  const renderEnhanceButton = (field: string) => {
    const hasValue = !!((briefData as any)[field] || '').toString().trim();
    const isThisFieldEnhancing = enhancingField === field;

    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => enhanceWithAI(field, 'append')}
          disabled={!!enhancingField}
          className="gap-1 text-xs h-7"
          title={hasValue ? 'Complementar lo que ya escribiste' : 'Generar texto con IA'}
        >
          {isThisFieldEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          {hasValue ? 'Complementar' : 'Generar'}
        </Button>

        {hasValue && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!!enhancingField}
                className="h-7 w-7"
                title="Más opciones"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => enhanceWithAI(field, 'append')}>
                <Wand2 className="h-4 w-4 mr-2" />
                Complementar (agregar)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const ok = window.confirm('Esto reemplazará el texto actual. ¿Deseas continuar?');
                  if (ok) enhanceWithAI(field, 'replace');
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Generar nuevo (reemplazar)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basics
        return (
          <div className="space-y-5">
            {/* Business Type Selector */}
            <div className="p-4 bg-muted/50 rounded-sm border">
              <Label className="text-base font-semibold">¿Qué tipo de negocio es? *</Label>
              <p className="text-sm text-muted-foreground mb-3">Esto nos ayuda a personalizar los guiones</p>
              <RadioGroup 
                value={briefData.businessType} 
                onValueChange={(v: 'product_service' | 'personal_brand') => updateField('businessType', v)}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <div className={`flex items-start space-x-3 p-4 rounded-sm border-2 cursor-pointer transition-all ${
                  briefData.businessType === 'product_service' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="product_service" id="edit_product_service" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="edit_product_service" className="text-base font-medium cursor-pointer flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      Producto o Servicio
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vendes un producto físico, digital, curso, mentoría, servicio, etc.
                      <br />
                      <span className="text-xs">Los creadores externos crearán el contenido.</span>
                    </p>
                  </div>
                </div>
                <div className={`flex items-start space-x-3 p-4 rounded-sm border-2 cursor-pointer transition-all ${
                  briefData.businessType === 'personal_brand' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="personal_brand" id="edit_personal_brand" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="edit_personal_brand" className="text-base font-medium cursor-pointer flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Marca Personal
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tú eres la marca. Coach, influencer, experto, profesional.
                      <br />
                      <span className="text-xs">Tú mismo crearás el contenido.</span>
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">
                {briefData.businessType === 'personal_brand' 
                  ? '¿Cuál es tu nombre o el de tu marca personal? *' 
                  : 'Nombre del producto o servicio *'}
              </Label>
              <Input
                id="productName"
                value={briefData.productName}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder={briefData.businessType === 'personal_brand' 
                  ? 'Ej: María García, Coach María, Dr. García...' 
                  : 'Ej: Método de Ventas High Ticket'}
              />
            </div>

            <div className="space-y-2">
              <Label>¿A qué categoría o línea pertenece? *</Label>
              <Select value={briefData.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {briefData.category === 'Otro' && (
                <Input
                  value={briefData.customCategory}
                  onChange={(e) => updateField('customCategory', e.target.value)}
                  placeholder="Especifica la categoría"
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>¿Cuál es el objetivo actual con este producto? *</Label>
              <RadioGroup value={briefData.currentObjective} onValueChange={(v) => updateField('currentObjective', v)}>
                <div className="grid grid-cols-2 gap-2">
                  {OBJECTIVES.map(obj => (
                    <div key={obj} className="flex items-center space-x-2">
                      <RadioGroupItem value={obj} id={obj} />
                      <Label htmlFor={obj} className="text-sm cursor-pointer">{obj}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>¿En qué mercado/región vendes principalmente? *</Label>
              <p className="text-xs text-muted-foreground">
                Esto enfoca el análisis de competencia en tu mercado objetivo
              </p>
              <Select value={briefData.targetMarket} onValueChange={(v) => updateField('targetMarket', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el mercado objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_MARKETS.map(market => (
                    <SelectItem key={market} value={market}>{market}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="slogan">¿Hay un slogan o frase de venta que lo represente? *</Label>
                {renderEnhanceButton('slogan')}
              </div>
              <Input
                id="slogan"
                value={briefData.slogan}
                onChange={(e) => updateField('slogan', e.target.value)}
                placeholder="Ej: Vende más, trabaja menos"
              />
            </div>

            {/* Document Upload for additional context */}
            <div className="space-y-2 p-4 bg-muted/30 rounded-sm border border-dashed">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <Label>Documento del producto (Opcional)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Sube un documento con información adicional del producto. La IA lo leerá para enriquecer la investigación.
              </p>
              <div className="flex gap-2">
                <Input
                  value={briefData.documentUrl || ''}
                  onChange={(e) => updateField('documentUrl', e.target.value)}
                  placeholder="https://drive.google.com/... o URL del documento"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos soportados: PDF, Google Docs, archivos de texto. La IA extraerá el contenido automáticamente.
              </p>
            </div>
          </div>
        );

      case 1: // Value
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>¿Qué beneficio principal entrega al cliente? *</Label>
                {renderEnhanceButton('mainBenefit')}
              </div>
              <Textarea
                value={briefData.mainBenefit}
                onChange={(e) => updateField('mainBenefit', e.target.value)}
                placeholder="El resultado más importante que obtiene el cliente..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>¿Qué transformación produce en la vida del cliente? *</Label>
                {renderEnhanceButton('transformation')}
              </div>
              <Textarea
                value={briefData.transformation}
                onChange={(e) => updateField('transformation', e.target.value)}
                placeholder="Describe el cambio: De [situación actual] a [situación deseada]..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>¿Qué lo hace diferente de productos similares?</Label>
                {renderEnhanceButton('differentiator')}
              </div>
              <Textarea
                value={briefData.differentiator}
                onChange={(e) => updateField('differentiator', e.target.value)}
                placeholder="Tu propuesta única de valor..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>¿Qué materiales, ingredientes o componentes debemos resaltar?</Label>
              <Textarea
                value={briefData.keyIngredients}
                onChange={(e) => updateField('keyIngredients', e.target.value)}
                placeholder="Características técnicas, ingredientes especiales, metodologías..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>¿Qué debes mostrar o decir SIEMPRE en la comunicación?</Label>
              <Textarea
                value={briefData.mustCommunicate}
                onChange={(e) => updateField('mustCommunicate', e.target.value)}
                placeholder="Mensajes obligatorios, claims, disclaimers..."
                rows={2}
              />
            </div>

            {/* NEW: Product Details Section */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-primary mb-4">📦 Detalles del Producto/Servicio</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rango de precio</Label>
                  <Input
                    value={briefData.priceRange || ''}
                    onChange={(e) => updateField('priceRange', e.target.value)}
                    placeholder="Ej: $197-$497 USD, $50/mes"
                  />
                </div>

                <div className="space-y-2">
                  <Label>¿Cuánto tiempo llevas en el mercado?</Label>
                  <Select value={briefData.yearsInMarket || ''} onValueChange={(v) => updateField('yearsInMarket', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo">Nuevo (menos de 1 año)</SelectItem>
                      <SelectItem value="1-3">1-3 años</SelectItem>
                      <SelectItem value="3-5">3-5 años</SelectItem>
                      <SelectItem value="5+">Más de 5 años</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>¿Cómo se entrega el producto/servicio?</Label>
                <Input
                  value={briefData.deliveryMethod || ''}
                  onChange={(e) => updateField('deliveryMethod', e.target.value)}
                  placeholder="Ej: Plataforma online, sesiones 1:1, envío físico, descarga digital..."
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>¿Qué formato tiene? (para servicios: estructura)</Label>
                <Textarea
                  value={briefData.productFormat || ''}
                  onChange={(e) => updateField('productFormat', e.target.value)}
                  placeholder="Ej: 8 módulos + 12 sesiones grupales + comunidad privada"
                  rows={2}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>¿Qué garantías ofreces?</Label>
                <Input
                  value={briefData.guarantees || ''}
                  onChange={(e) => updateField('guarantees', e.target.value)}
                  placeholder="Ej: 30 días de devolución, garantía de resultados..."
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>Prueba social existente (testimonios, casos de éxito, números)</Label>
                <Textarea
                  value={briefData.socialProof || ''}
                  onChange={(e) => updateField('socialProof', e.target.value)}
                  placeholder="Ej: +500 alumnos, 4.8 estrellas, testimonios de expertos..."
                  rows={2}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>Casos de éxito o transformaciones reales (opcional pero muy útil)</Label>
                <Textarea
                  value={briefData.successStories || ''}
                  onChange={(e) => updateField('successStories', e.target.value)}
                  placeholder="Ej: Juan pasó de $2K a $15K/mes en 3 meses usando el método..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 2: // Problem & Desire
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>¿Qué problema real resuelve este producto? *</Label>
                {renderEnhanceButton('problemSolved')}
              </div>
              <Textarea
                value={briefData.problemSolved}
                onChange={(e) => updateField('problemSolved', e.target.value)}
                placeholder="El dolor o frustración principal del cliente..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>¿Cuál es el deseo o aspiración principal que ayuda a cumplir? *</Label>
                {renderEnhanceButton('mainDesire')}
              </div>
              <Textarea
                value={briefData.mainDesire}
                onChange={(e) => updateField('mainDesire', e.target.value)}
                placeholder="Lo que el cliente sueña lograr..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>¿Qué pasa si el cliente NO compra? ¿Qué pierde o sigue sufriendo?</Label>
                {renderEnhanceButton('consequenceOfNotBuying')}
              </div>
              <Textarea
                value={briefData.consequenceOfNotBuying}
                onChange={(e) => updateField('consequenceOfNotBuying', e.target.value)}
                placeholder="Las consecuencias de no tomar acción..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>¿Qué hace a este producto mejor frente a otros similares?</Label>
                {renderEnhanceButton('competitiveAdvantage')}
              </div>
              <Textarea
                value={briefData.competitiveAdvantage}
                onChange={(e) => updateField('competitiveAdvantage', e.target.value)}
                placeholder="Tu ventaja competitiva real..."
                rows={2}
              />
            </div>

            {/* NEW: Deeper Problem Understanding */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-primary mb-4">🔍 Profundizando en el problema</p>

              <div className="space-y-2">
                <Label>¿Cuál es la RAÍZ del problema? (no el síntoma)</Label>
                <Textarea
                  value={briefData.rootCause || ''}
                  onChange={(e) => updateField('rootCause', e.target.value)}
                  placeholder="Ej: No es que no tengan tiempo, es que no saben priorizar. No es que no vendan, es que no tienen un sistema..."
                  rows={3}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>¿Qué soluciones han INTENTADO antes y por qué fallaron?</Label>
                <Textarea
                  value={briefData.failedSolutions || ''}
                  onChange={(e) => updateField('failedSolutions', e.target.value)}
                  placeholder="Ej: Cursos genéricos (no personalizados), coaches sin experiencia real, apps que no dan seguimiento..."
                  rows={3}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>¿Qué tan URGENTE es resolver este problema para el cliente?</Label>
                <Select value={briefData.urgencyLevel || ''} onValueChange={(v) => updateField('urgencyLevel', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nivel de urgencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Crítico - Les está costando dinero/salud/relaciones ahora</SelectItem>
                    <SelectItem value="high">🟠 Alto - Lo necesitan resolver pronto</SelectItem>
                    <SelectItem value="medium">🟡 Medio - Les gustaría resolverlo pero no es urgente</SelectItem>
                    <SelectItem value="low">🟢 Bajo - Es un "nice to have"</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3: // Neuromarketing
        return (
          <div className="space-y-6">
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  🦎 Cerebro Reptil (Instinto / Acción) *
                </CardTitle>
                <CardDescription>¿Qué urgencia o supervivencia activa este producto?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {REPTILE_TRIGGERS.map(trigger => (
                    <div
                      key={trigger.value}
                      className={`p-3 rounded-sm border cursor-pointer transition-all ${
                        briefData.reptileBrain.includes(trigger.value)
                          ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                          : 'border-border hover:border-red-300'
                      }`}
                      onClick={() => toggleArrayField('reptileBrain', trigger.value)}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox checked={briefData.reptileBrain.includes(trigger.value)} />
                        <div>
                          <p className="font-medium text-sm">{trigger.label}</p>
                          <p className="text-xs text-muted-foreground">{trigger.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-pink-200 bg-pink-50/50 dark:bg-pink-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  💗 Cerebro Límbico (Emoción / Pertenencia) *
                </CardTitle>
                <CardDescription>¿Qué emoción busca generar el producto?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {LIMBIC_EMOTIONS.map(emotion => (
                    <Badge
                      key={emotion.value}
                      variant={briefData.limbicBrain.includes(emotion.value) ? 'default' : 'outline'}
                      className={`cursor-pointer text-sm py-1.5 px-3 ${
                        briefData.limbicBrain.includes(emotion.value)
                          ? 'bg-pink-500 hover:bg-pink-600'
                          : 'hover:bg-pink-100'
                      }`}
                      onClick={() => toggleArrayField('limbicBrain', emotion.value)}
                    >
                      {emotion.emoji} {emotion.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  🧠 Cerebro Córtex (Lógica)
                </CardTitle>
                <CardDescription>¿Qué argumento racional justifica su compra?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Justificación lógica</span>
                  {renderEnhanceButton('cortexBrain')}
                </div>
                <Textarea
                  value={briefData.cortexBrain}
                  onChange={(e) => updateField('cortexBrain', e.target.value)}
                  placeholder="Ej: Garantía de 30 días, estudios que lo respaldan, ROI comprobado..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        );

      case 4: // Audience
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Género del cliente ideal *</Label>
                <RadioGroup value={briefData.targetGender} onValueChange={(v) => updateField('targetGender', v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Mujeres</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Hombres</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">Ambos</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Rango de edad * (puedes elegir varios)</Label>
                <div className="flex flex-wrap gap-2">
                  {AGE_RANGES.map(age => (
                    <Badge
                      key={age}
                      variant={briefData.targetAgeRange.includes(age) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayField('targetAgeRange', age)}
                    >
                      {age}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ocupación / Profesión</Label>
              <Input
                value={briefData.targetOccupation}
                onChange={(e) => updateField('targetOccupation', e.target.value)}
                placeholder="Ej: Emprendedores, profesionales de marketing, mamás..."
              />
            </div>

            <div className="space-y-2">
              <Label>Intereses principales</Label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <Badge
                    key={interest}
                    variant={briefData.targetInterests.includes(interest) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleArrayField('targetInterests', interest)}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hábitos y comportamientos</Label>
              <Textarea
                value={briefData.targetHabits}
                onChange={(e) => updateField('targetHabits', e.target.value)}
                placeholder="¿Dónde pasan tiempo? ¿Qué consumen? ¿Cómo toman decisiones?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Objeciones comunes antes de comprar</Label>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_OBJECTIONS.map(obj => (
                  <div key={obj} className="flex items-center space-x-2">
                    <Checkbox
                      checked={briefData.commonObjections.includes(obj)}
                      onCheckedChange={() => toggleArrayField('commonObjections', obj)}
                    />
                    <Label className="text-sm cursor-pointer">{obj}</Label>
                  </div>
                ))}
              </div>
              <Input
                value={briefData.customObjections}
                onChange={(e) => updateField('customObjections', e.target.value)}
                placeholder="Otras objeciones específicas..."
                className="mt-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>¿Qué pasaría si el producto le funciona perfecto? (Escenario ideal)</Label>
                {renderEnhanceButton('idealScenario')}
              </div>
              <Textarea
                value={briefData.idealScenario}
                onChange={(e) => updateField('idealScenario', e.target.value)}
                placeholder="Visualiza la vida del cliente después de usar tu producto..."
                rows={3}
              />
            </div>

            {/* NEW: Deeper Audience Understanding */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-primary mb-4">💰 Comportamiento de compra</p>

              <div className="space-y-2">
                <Label>Capacidad de pago del cliente ideal</Label>
                <Select value={briefData.buyingPower || ''} onValueChange={(v) => updateField('buyingPower', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bajo - Buscan lo más económico</SelectItem>
                    <SelectItem value="medium">Medio - Invierten si ven valor</SelectItem>
                    <SelectItem value="high">Alto - Pagan por calidad y resultados</SelectItem>
                    <SelectItem value="premium">Premium - El precio no es objeción si es lo mejor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 mt-4">
                <Label>¿Quién influye en su decisión de compra?</Label>
                <Textarea
                  value={briefData.decisionInfluencers || ''}
                  onChange={(e) => updateField('decisionInfluencers', e.target.value)}
                  placeholder="Ej: Su pareja, su coach, amigos emprendedores, reviews de YouTube..."
                  rows={2}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>¿Dónde buscan información antes de comprar?</Label>
                <Textarea
                  value={briefData.informationSources || ''}
                  onChange={(e) => updateField('informationSources', e.target.value)}
                  placeholder="Ej: Google, YouTube, Instagram, grupos de Facebook, podcasts..."
                  rows={2}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>¿Qué evento o situación los llevaría a comprar HOY?</Label>
                <Textarea
                  value={briefData.purchaseTriggers || ''}
                  onChange={(e) => updateField('purchaseTriggers', e.target.value)}
                  placeholder="Ej: Perdieron un cliente importante, su competencia los superó, un diagnóstico médico..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 5: // Content
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>¿Qué tipo de contenido quieres crear? *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CONTENT_TYPES.map(type => (
                  <div
                    key={type.value}
                    className={`p-3 rounded-sm border cursor-pointer transition-all text-center ${
                      briefData.contentTypes.includes(type.value)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleArrayField('contentTypes', type.value)}
                  >
                    <Checkbox checked={briefData.contentTypes.includes(type.value)} className="sr-only" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>¿En qué plataformas se usará? *</Label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(platform => (
                  <div
                    key={platform.value}
                    className={`p-3 rounded-sm border cursor-pointer transition-all ${
                      briefData.platforms.includes(platform.value)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleArrayField('platforms', platform.value)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{platform.icon}</span>
                      <span className="text-sm">{platform.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>¿Usarás este contenido para publicidad (Ads)?</Label>
              <RadioGroup value={briefData.useForAds} onValueChange={(v) => updateField('useForAds', v)}>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="ads-yes" />
                    <Label htmlFor="ads-yes">Sí, Meta Ads / TikTok Ads</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="ads-no" />
                    <Label htmlFor="ads-no">No, solo orgánico</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="ads-both" />
                    <Label htmlFor="ads-both">Ambos</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>¿Tienes ejemplos de contenido que te gustaría replicar?</Label>
              <Textarea
                value={briefData.referenceContent}
                onChange={(e) => updateField('referenceContent', e.target.value)}
                placeholder="Links a videos, cuentas de referencia, estilos que te gustan..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Puntos fuertes a reforzar SIEMPRE</Label>
              <Textarea
                value={briefData.brandStrengths}
                onChange={(e) => updateField('brandStrengths', e.target.value)}
                placeholder="Lo que siempre debe estar presente en la comunicación..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Restricciones de marca, lenguaje o estilo</Label>
              <Textarea
                value={briefData.brandRestrictions}
                onChange={(e) => updateField('brandRestrictions', e.target.value)}
                placeholder="Lo que NUNCA debemos decir o hacer..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>¿Cuál es el resultado exacto que esperas de este contenido?</Label>
              <Textarea
                value={briefData.expectedResult}
                onChange={(e) => updateField('expectedResult', e.target.value)}
                placeholder="Ventas, leads, awareness, engagement..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>¿Algo más que debamos saber?</Label>
              <Textarea
                value={briefData.additionalNotes}
                onChange={(e) => updateField('additionalNotes', e.target.value)}
                placeholder="Información adicional relevante..."
                rows={2}
              />
            </div>

            {/* NEW: Content Strategy Details */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-primary mb-4">🎨 Personalidad de marca</p>

              <div className="space-y-2">
                <Label>¿Cuál es la voz/personalidad de tu marca?</Label>
                <Select value={briefData.brandVoice || ''} onValueChange={(v) => updateField('brandVoice', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tono principal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Profesional y autoritativo</SelectItem>
                    <SelectItem value="friendly">Cercano y amigable</SelectItem>
                    <SelectItem value="inspirational">Inspiracional y motivacional</SelectItem>
                    <SelectItem value="edgy">Directo y provocador</SelectItem>
                    <SelectItem value="educational">Educativo y didáctico</SelectItem>
                    <SelectItem value="luxurious">Exclusivo y premium</SelectItem>
                    <SelectItem value="fun">Divertido y entretenido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 mt-4">
                <Label>¿Qué contenido hace tu competencia? (para diferenciarnos)</Label>
                <Textarea
                  value={briefData.competitorContent || ''}
                  onChange={(e) => updateField('competitorContent', e.target.value)}
                  placeholder="Ej: Hacen muchos talking heads aburridos, solo promocionan, no educan..."
                  rows={2}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>Presupuesto aproximado para producción de contenido</Label>
                <Select value={briefData.budgetRange || ''} onValueChange={(v) => updateField('budgetRange', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona rango" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bajo - Solo celular y edición básica</SelectItem>
                    <SelectItem value="medium">Medio - Equipo básico, editor dedicado</SelectItem>
                    <SelectItem value="high">Alto - Producción profesional, equipo completo</SelectItem>
                    <SelectItem value="premium">Premium - Sin límites, máxima calidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 6: // Videos - Phase Distribution
        return (
          <div className="space-y-6">
            {/* Phase Distribution Info */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-sm p-4 border border-primary/20">
              <div className="flex items-start gap-3">
                <Film className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-primary">Distribución por Fases ESFERA</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Distribuye tus videos según la etapa del embudo de ventas.
                    Cada fase tiene un objetivo específico para mover a tu audiencia hacia la compra.
                  </p>
                </div>
              </div>
            </div>

            {/* Phase Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ESFERA_PHASES.map((phase) => {
                const count = briefData.phaseDistribution[phase.key] || 0;
                const phaseDefaults = PHASE_DEFAULTS[phase.key];

                return (
                  <Card key={phase.key} className={`${phase.color} border-2 transition-all`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className={`text-base flex items-center gap-2 ${phase.textColor}`}>
                          <span className="text-xl">{phase.icon}</span>
                          {phase.label}
                        </CardTitle>
                        <Badge variant="secondary" className="font-mono">
                          {phaseDefaults.funnelStage.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {phase.audience} • {phase.metaCampaign}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">{phase.description}</p>

                      {/* Counter */}
                      <div className="flex items-center justify-center gap-4 py-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => {
                            if (count > 0) {
                              updateField('phaseDistribution', {
                                ...briefData.phaseDistribution,
                                [phase.key]: count - 1,
                              });
                            }
                          }}
                          disabled={count <= 0}
                        >
                          <span className="text-lg font-bold">−</span>
                        </Button>
                        <span className="text-2xl font-bold min-w-[40px] text-center">{count}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => {
                            updateField('phaseDistribution', {
                              ...briefData.phaseDistribution,
                              [phase.key]: count + 1,
                            });
                          }}
                        >
                          <span className="text-lg font-bold">+</span>
                        </Button>
                      </div>

                      {/* Phase details */}
                      <div className="text-xs space-y-1 pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Técnicas:</span>
                          <span className="font-medium">{phaseDefaults.techniques[0]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CTA:</span>
                          <span className="font-medium">{phaseDefaults.defaultCTA}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Summary */}
            {(() => {
              const totalVideos = Object.values(briefData.phaseDistribution).reduce((a, b) => a + b, 0);
              return totalVideos > 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Total de proyectos a crear: {totalVideos}</p>
                        <p className="text-sm text-muted-foreground">
                          {ESFERA_PHASES.map(p => {
                            const c = briefData.phaseDistribution[p.key] || 0;
                            return c > 0 ? `${p.icon} ${c}` : null;
                          }).filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-primary">
                        Prellenado con guión
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Los proyectos se crearán con los datos del brief para generar guiones con 1 clic.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Selecciona cuántos videos crear por cada fase</p>
                </div>
              );
            })()}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Paso {currentStep + 1} de {STEPS.length}</span>
          <span>{Math.round(progress)}% completado</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps */}
      <div className="flex justify-between overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep || isStepComplete(index);
          
          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`flex flex-col items-center gap-1 p-2 rounded-sm transition-colors min-w-[70px] ${
                isActive ? 'bg-primary/10 text-primary' : isComplete ? 'text-primary/70' : 'text-muted-foreground'
              }`}
            >
              <div className={`p-2 rounded-full ${
                isActive ? 'bg-primary text-primary-foreground' : isComplete ? 'bg-primary/20' : 'bg-muted'
              }`}>
                {isComplete && index < currentStep ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
              </div>
              <span className="text-[10px] font-medium">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {(() => { const I = STEPS[currentStep].icon; return <I className="h-5 w-5" />; })()}
            {STEPS[currentStep].title}
          </CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
        </Button>

        <div className="flex items-center gap-2">
          {/* Save indicator */}
          {lastSavedAt && !hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">
              Guardado {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs text-warning">
              Sin guardar
            </span>
          )}
          
          {/* Save button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => saveBrief(true)}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Guardar</>
            )}
          </Button>
        </div>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={() => setCurrentStep(prev => prev + 1)} disabled={!canProceed}>
            Siguiente <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <div className="flex gap-2">
            {/* Create content items button (only on Videos step with videos selected) */}
            {(() => {
              const totalVideos = Object.values(briefData.phaseDistribution).reduce((a, b) => a + b, 0);
              return totalVideos > 0 && (
                <Button
                  onClick={handleCreateContentItems}
                  disabled={isCreatingContent}
                  variant="default"
                  className="gap-2"
                >
                  {isCreatingContent ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creando...</>
                  ) : (
                    <><Film className="h-4 w-4" /> Crear {totalVideos} Proyectos</>
                  )}
                </Button>
              );
            })()}
            {/* Generate research button */}
            <Button
              onClick={handleGenerateResearch}
              disabled={isGenerating || !isStepComplete(0) || !isStepComplete(1) || !isStepComplete(2)}
              variant={Object.values(briefData.phaseDistribution).reduce((a, b) => a + b, 0) > 0 ? 'outline' : 'default'}
              className="gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generar Investigación</>
              )}
            </Button>
          </div>
        )}
      </div>

      <ResearchProgressIndicator productId={productId} isGenerating={isGenerating} />

      {isCreatingContent && (
        <Card className="border-emerald-500/50 bg-emerald-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <Film className="h-4 w-4 text-emerald-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <p className="font-medium">Creando proyectos...</p>
                <p className="text-sm text-muted-foreground">Configurando proyectos con datos del guionizador prellenados.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
