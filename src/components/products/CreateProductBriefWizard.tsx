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
  Wand2,
  ChevronDown,
  RotateCcw,
  Save,
  Film,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fireProductResearch, pollProductResearchProgress } from '@/lib/productResearch';
import { invokeAIWithTokens } from '@/lib/ai/token-gate';
import { ResearchProgressIndicator } from './ResearchProgressIndicator';
import { toast } from 'sonner';

// Esfera phase distribution
interface PhaseDistribution {
  engage: number;
  solution: number;
  remarketing: number;
  fidelize: number;
}

// Comprehensive brief data structure (unified with ProductBriefWizard)
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
  // Deeper problem understanding
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
  // Deeper audience understanding
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
  creativesCount: number;
  phaseDistribution: PhaseDistribution;
  // Content strategy details
  brandVoice: string;
  competitorContent: string;
  budgetRange: string;

  // Document URL for additional context
  documentUrl: string;

  // AI-enhanced fields
  aiSuggestedAngles: string[];
  aiSuggestedHooks: string[];
}

// Esfera phases configuration with Meta campaign types
const ESFERA_PHASES = [
  {
    key: 'engage' as const,
    label: 'ENGANCHAR',
    icon: '⚡',
    color: 'bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    description: 'Captar atención de audiencia fría',
    details: 'Videos disruptivos para personas que NO conocen tu marca. El objetivo es hacer que dejen de hacer scroll y generar curiosidad sobre quién eres.',
    audience: '❄️ Audiencia FRÍA: Nunca han visto tu marca',
    metaCampaign: '📢 Meta: Campañas de RECONOCIMIENTO o ALCANCE',
    contentExamples: 'Hooks impactantes, problemas visibles, patrones rotos, contenido viral',
    objective: 'Métricas clave: Alcance, Impresiones, CPM bajo',
  },
  {
    key: 'solution' as const,
    label: 'SOLUCIÓN',
    icon: '💡',
    color: 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    description: 'Venta directa - Mostrar tu producto como LA solución',
    details: 'Videos de VENTA DIRECTA para quienes ya reconocen tener un problema. Aquí muestras cómo tu producto elimina su dolor y los llevas a comprar.',
    audience: '🔥 Audiencia TIBIA: Saben que tienen un problema',
    metaCampaign: '🛒 Meta: Campañas de VENTAS o CONVERSIONES',
    contentExamples: 'Demostraciones, beneficios claros, ofertas, llamados a la acción directos',
    objective: 'Métricas clave: Conversiones, ROAS, CPA, Ventas',
  },
  {
    key: 'remarketing' as const,
    label: 'REMARKETING',
    icon: '🔄',
    color: 'bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700',
    textColor: 'text-amber-700 dark:text-amber-300',
    description: 'Recuperar a quienes no compraron',
    details: 'Videos para personas que ya visitaron tu web, vieron productos o agregaron al carrito pero NO compraron. El objetivo es superar sus objeciones y crear urgencia.',
    audience: '🔥🔥 Audiencia CALIENTE: Ya interactuaron contigo',
    metaCampaign: '🎯 Meta: Campañas de RETARGETING (públicos personalizados)',
    contentExamples: 'Testimonios, garantías, urgencia, comparativas, respuesta a objeciones',
    objective: 'Métricas clave: Conversión final, Recuperación de carrito, CPA',
  },
  {
    key: 'fidelize' as const,
    label: 'FIDELIZAR',
    icon: '💎',
    color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-300',
    description: 'Que vuelvan a comprar y te recomienden',
    details: 'Videos para CLIENTES que ya compraron. El objetivo es que compren más, con mayor frecuencia, y que te recomienden a otros.',
    audience: '💰 CLIENTES: Ya te compraron antes',
    metaCampaign: '👥 Meta: Campañas de ENGAGEMENT o público de clientes',
    contentExamples: 'Tips exclusivos, nuevos productos, upsells, programa de referidos',
    objective: 'Métricas clave: LTV, Recompra, Referidos, Engagement',
  },
];

// Defaults for prefilling content items per phase
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

// Function to build strategist guidelines based on brief data and phase
function buildStrategistGuidelines(
  briefData: BriefData,
  phase: typeof ESFERA_PHASES[number]
): string {
  const phaseDefaults = PHASE_DEFAULTS[phase.key];

  // Map reptile brain values to labels
  const reptileLabels: Record<string, string> = {
    survival: 'Seguridad/Supervivencia',
    reproduction: 'Atracción/Verse bien',
    power: 'Éxito/Reconocimiento',
    scarcity: 'No perderse nada (FOMO)',
    territory: 'Pertenecer a un grupo',
    food: 'Placer/Recompensa',
  };

  // Map limbic brain values to labels
  const limbicLabels: Record<string, string> = {
    happiness: 'Felicidad',
    confidence: 'Confianza',
    freedom: 'Libertad',
    peace: 'Paz/Tranquilidad',
    pride: 'Orgullo',
    love: 'Amor/Conexión',
    excitement: 'Emoción/Aventura',
    hope: 'Esperanza',
    belonging: 'Pertenencia',
    relief: 'Alivio',
  };

  const reptileText = briefData.reptileBrain
    .map(v => reptileLabels[v] || v)
    .join(', ') || 'No especificado';

  const limbicText = briefData.limbicBrain
    .map(v => limbicLabels[v] || v)
    .join(', ') || 'No especificado';

  return `## Fase: ${phase.label}
**Objetivo:** ${phaseDefaults.objective}
**Audiencia:** ${phase.audience}
**Tono recomendado:** ${phaseDefaults.tone}

### Contexto del Producto
- **Nombre:** ${briefData.productName}
- **Categoría:** ${briefData.category}
- **Objetivo actual:** ${briefData.currentObjective}
- **Slogan:** ${briefData.slogan}

### Propuesta de Valor
- **Beneficio principal:** ${briefData.mainBenefit}
- **Transformación:** ${briefData.transformation}
- **Diferenciador:** ${briefData.differentiator}

### Problema y Deseo
- **Problema que resuelve:** ${briefData.problemSolved}
- **Deseo principal:** ${briefData.mainDesire}
- **Consecuencia de no comprar:** ${briefData.consequenceOfNotBuying}

### Neuromarketing
- **Cerebro Reptil (instinto):** ${reptileText}
- **Cerebro Límbico (emoción):** ${limbicText}
- **Cerebro Córtex (lógica):** ${briefData.cortexBrain || 'No especificado'}

### Avatar del Cliente
- **Género:** ${briefData.targetGender || 'No especificado'}
- **Edad:** ${briefData.targetAgeRange.join(', ') || 'No especificado'}
- **Ocupación:** ${briefData.targetOccupation || 'No especificado'}
- **Intereses:** ${briefData.targetInterests.join(', ') || 'No especificado'}

### Objeciones a Superar
${briefData.commonObjections.map(o => `- ${o}`).join('\n') || '- No especificadas'}

### Dirección Estratégica para esta Fase
- **Técnicas recomendadas:** ${phaseDefaults.techniques.join(', ')}
- **CTA sugerido:** ${phaseDefaults.defaultCTA}
- **Tipo de campaña Meta:** ${phase.metaCampaign}
- **Ejemplos de contenido:** ${phase.contentExamples}
`.trim();
}

interface ClientPackage {
  id: string;
  name: string;
  content_quantity: number;
  is_active: boolean;
}

interface CreateProductBriefWizardProps {
  clientId: string;
  onComplete: (productId: string) => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 'basics', title: 'Tu Producto', description: 'Cuéntanos qué vendes', icon: Package },
  { id: 'value', title: 'Lo Bueno', description: '¿Qué gana tu cliente?', icon: Sparkles },
  { id: 'problem', title: 'El Problema', description: '¿Qué dolor resuelves?', icon: Target },
  { id: 'neuro', title: 'Emociones', description: '¿Qué sienten al comprarte?', icon: Brain },
  { id: 'audience', title: 'Tu Cliente', description: '¿A quién le vendes?', icon: Users },
  { id: 'content', title: 'Contenido', description: '¿Dónde y cómo publicar?', icon: Megaphone },
  { id: 'videos', title: 'Videos', description: '¿Cuántos videos crear?', icon: Film },
];

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
  'Lanzar algo nuevo al mercado',
  'Vender más',
  'Que más gente conozca mi marca',
  'Conseguir personas interesadas',
  'Mantener felices a mis clientes actuales',
  'Recuperar clientes que dejaron de comprar',
  'Enseñar sobre mi producto/servicio',
  'Probar si mi idea funciona',
];

const REPTILE_TRIGGERS = [
  { value: 'survival', label: '🛡️ Seguridad', desc: 'Sentirse protegido, estable económicamente' },
  { value: 'reproduction', label: '✨ Verse bien', desc: 'Lucir atractivo, gustar a otros' },
  { value: 'power', label: '👑 Éxito y reconocimiento', desc: 'Ser admirado, tener estatus' },
  { value: 'scarcity', label: '⏰ No perderse nada', desc: 'Aprovechar antes que se acabe' },
  { value: 'territory', label: '🎯 Pertenecer', desc: 'Ser parte de un grupo especial' },
  { value: 'food', label: '🎁 Darse un gusto', desc: 'Disfrutar, premiarse' },
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
  { value: 'ugc', label: 'Videos de clientes reales' },
  { value: 'testimonial', label: 'Historias de éxito' },
  { value: 'educational', label: 'Tips y consejos' },
  { value: 'before_after', label: 'Antes y Después' },
  { value: 'unboxing', label: 'Abriendo el producto' },
  { value: 'tutorial', label: 'Cómo se usa' },
  { value: 'lifestyle', label: 'Estilo de vida' },
  { value: 'talking_head', label: 'Hablando a cámara' },
  { value: 'story', label: 'Contando una historia' },
  { value: 'meme', label: 'Memes y tendencias' },
  { value: 'comparison', label: 'Comparando opciones' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'facebook', label: 'Facebook', icon: '👥' },
  { value: 'youtube', label: 'YouTube', icon: '▶️' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'whatsapp', label: 'WhatsApp Status', icon: '💬' },
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

const DEFAULT_PHASE_DISTRIBUTION: PhaseDistribution = {
  engage: 0,
  solution: 0,
  remarketing: 0,
  fidelize: 0,
};

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
  // Product Details
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
  creativesCount: 0,
  phaseDistribution: DEFAULT_PHASE_DISTRIBUTION,
  brandVoice: '',
  competitorContent: '',
  budgetRange: '',
  // Document
  documentUrl: '',
  aiSuggestedAngles: [],
  aiSuggestedHooks: [],
};

// LocalStorage key for auto-save
const DRAFT_STORAGE_KEY = 'kreoon_product_brief_draft';
const DRAFT_STEP_KEY = 'kreoon_product_brief_step';

// Helper to load draft from localStorage
const loadDraft = (clientId: string): BriefData | null => {
  try {
    const stored = localStorage.getItem(`${DRAFT_STORAGE_KEY}_${clientId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if draft is less than 24 hours old
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
      // Clear old draft
      localStorage.removeItem(`${DRAFT_STORAGE_KEY}_${clientId}`);
    }
  } catch (e) {
    console.error('Error loading draft:', e);
  }
  return null;
};

// Helper to save draft to localStorage
const saveDraft = (clientId: string, data: BriefData, step: number) => {
  try {
    localStorage.setItem(`${DRAFT_STORAGE_KEY}_${clientId}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    localStorage.setItem(`${DRAFT_STEP_KEY}_${clientId}`, String(step));
  } catch (e) {
    console.error('Error saving draft:', e);
  }
};

// Helper to clear draft from localStorage
const clearDraft = (clientId: string) => {
  try {
    localStorage.removeItem(`${DRAFT_STORAGE_KEY}_${clientId}`);
    localStorage.removeItem(`${DRAFT_STEP_KEY}_${clientId}`);
  } catch (e) {
    console.error('Error clearing draft:', e);
  }
};

// Helper to load step from localStorage
const loadStep = (clientId: string): number => {
  try {
    const stored = localStorage.getItem(`${DRAFT_STEP_KEY}_${clientId}`);
    return stored ? parseInt(stored, 10) : 0;
  } catch (e) {
    return 0;
  }
};

export function CreateProductBriefWizard({ 
  clientId, 
  onComplete,
  onCancel 
}: CreateProductBriefWizardProps) {
  // Load initial state from localStorage
  const [currentStep, setCurrentStep] = useState(() => loadStep(clientId));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProductId, setGeneratingProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [briefData, setBriefData] = useState<BriefData>(() => loadDraft(clientId) || DEFAULT_BRIEF);
  const [draftRestored, setDraftRestored] = useState(() => loadDraft(clientId) !== null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Client packages state
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [videosOwed, setVideosOwed] = useState(0);
  const [videosUsed, setVideosUsed] = useState(0);
  const [loadingPackages, setLoadingPackages] = useState(true);

  // Fetch client packages and calculate videos owed
  useEffect(() => {
    const fetchClientVideos = async () => {
      setLoadingPackages(true);
      try {
        // Get active packages for this client
        const { data: packages, error: packagesError } = await supabase
          .from('client_packages')
          .select('id, name, content_quantity, is_active')
          .eq('client_id', clientId)
          .eq('is_active', true);

        if (packagesError) throw packagesError;

        // Get existing content for this client (to calculate used videos)
        const { count: usedCount, error: countError } = await supabase
          .from('content')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId);

        if (countError) throw countError;

        const totalOwed = (packages || []).reduce((sum, pkg) => sum + (pkg.content_quantity || 0), 0);
        const used = usedCount || 0;
        
        setClientPackages(packages || []);
        setVideosOwed(totalOwed);
        setVideosUsed(used);
      } catch (error) {
        console.error('Error fetching client packages:', error);
        toast.error('Error al cargar los paquetes del cliente');
      } finally {
        setLoadingPackages(false);
      }
    };

    if (clientId) {
      fetchClientVideos();
    }
  }, [clientId]);

  // Auto-save to localStorage whenever briefData or currentStep changes
  useEffect(() => {
    // Debounce the save to avoid excessive writes
    const timeoutId = setTimeout(() => {
      saveDraft(clientId, briefData, currentStep);
      setLastSaved(new Date());
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [briefData, currentStep, clientId]);

  // Handle draft restored notification
  useEffect(() => {
    if (draftRestored) {
      toast.success('Borrador restaurado', {
        description: 'Continúa donde lo dejaste. Tu progreso se guarda automáticamente.',
        duration: 5000,
      });
      setDraftRestored(false);
    }
  }, [draftRestored]);

  // Calculate available videos
  const videosAvailable = Math.max(0, videosOwed - videosUsed);

  // Calculate total from phase distribution
  const totalFromPhases = Object.values(briefData.phaseDistribution).reduce((sum, val) => sum + val, 0);

  // Update phase distribution helper
  const updatePhaseCount = (phase: keyof PhaseDistribution, value: number) => {
    const newValue = Math.max(0, value);
    const otherPhasesTotal = totalFromPhases - briefData.phaseDistribution[phase];
    const maxForThisPhase = videosAvailable - otherPhasesTotal;
    const clampedValue = Math.min(newValue, maxForThisPhase);
    
    setBriefData(prev => ({
      ...prev,
      phaseDistribution: {
        ...prev.phaseDistribution,
        [phase]: clampedValue,
      },
      creativesCount: otherPhasesTotal + clampedValue,
    }));
  };

  // Validation function
  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(
          briefData.productName.trim() &&
          briefData.category &&
          briefData.currentObjective &&
          briefData.slogan.trim()
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
        return totalFromPhases >= 1;
      default:
        return false;
    }
  };

  const isAllStepsComplete = () => {
    for (let i = 0; i < STEPS.length; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  };

  const updateField = <K extends keyof BriefData>(field: K, value: BriefData[K]) => {
    setBriefData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: keyof BriefData, value: string) => {
    const current = briefData[field] as string[];
    if (current.includes(value)) {
      updateField(field, current.filter(v => v !== value) as any);
    } else {
      updateField(field, [...current, value] as any);
    }
  };

  const canProceed = isStepComplete(currentStep);
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const enhanceWithAI = async (field: string, mode: 'append' | 'replace' = 'append') => {
    // Validation: require product name to generate AI content
    if (!briefData.productName.trim()) {
      toast.error('Primero ingresa el nombre del producto', {
        description: 'La IA necesita contexto para generar contenido relevante.'
      });
      return;
    }

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
        ? `Eres un experto en copywriting. COMPLEMENTA el texto del usuario para un brief de producto.
Producto: ${briefData.productName}
Categoría: ${briefData.category || 'No especificada'}
REGLAS: NO reescribas el texto original. Devuelve SOLO un complemento (1-2 frases) para agregar DESPUÉS.`
        : `Eres un experto en copywriting. GENERA una versión del campo del brief.
Producto: ${briefData.productName}
Categoría: ${briefData.category || 'No especificada'}
REGLAS: Entrega versión final lista para pegar. Máximo 2-3 oraciones. Español latinoamericano.`;

      const userPrompt = shouldAppend
        ? `Texto actual (${fieldLabel}): ${base}\nEscribe 1-2 frases de complemento.`
        : base
          ? `Reescribe y mejora este ${fieldLabel}: ${base}`
          : `Crea un ${fieldLabel} impactante para este producto.`;

      const data = await invokeAIWithTokens('multi-ai', 'scripts.generate', {
        models: ['gemini'],
        mode: 'first',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }, profile?.current_organization_id);

      // multi-ai returns response for combined/first mode
      const aiText = (data?.response || data?.responses?.[0]?.content || '').trim();
      if (!aiText) throw new Error('Sin respuesta de IA');

      const nextValue = shouldAppend ? `${base} ${aiText}` : aiText;
      updateField(field as keyof BriefData, nextValue);
      toast.success(shouldAppend ? 'Texto complementado' : 'Texto generado');
    } catch (error) {
      console.error('AI enhancement error:', error);
      toast.error('Error al generar con IA', {
        description: 'Intenta de nuevo en unos segundos'
      });
    } finally {
      setEnhancingField(null);
    }
  };

  const handleCreateAndGenerateResearch = async () => {
    if (!isAllStepsComplete()) {
      toast.error('Completa todos los campos obligatorios del brief');
      return;
    }

    setIsGenerating(true);
    let createdProductId: string | null = null;

    try {
      // Step 1: Create the product in database (saves the brief)
      const { data: newProduct, error: createError } = await supabase
        .from('products')
        .insert({
          client_id: clientId,
          name: briefData.productName,
          brief_data: JSON.parse(JSON.stringify(briefData)),
          brief_status: 'in_progress',
          business_type: briefData.businessType,
        })
        .select('id')
        .single();

      if (createError) throw createError;
      createdProductId = newProduct.id;
      setGeneratingProductId(newProduct.id);

      toast.success('Producto creado, iniciando investigación con IA...');

      // Step 2: Fire research as fire-and-forget (edge function self-invokes for all 12 steps)
      // The ResearchProgressIndicator component polls research_progress automatically
      let researchSuccess = false;
      try {
        const fireResult = await fireProductResearch({ productId: newProduct.id, briefData });

        if (!fireResult.success) {
          console.error('Research fire error:', fireResult.error);
          toast.error('Error al iniciar la investigación', {
            description: 'El brief fue guardado. Puedes reintentar la investigación desde el detalle del producto.'
          });
        } else {
          // Poll for completion — wait up to 10 minutes
          researchSuccess = await new Promise<boolean>((resolve) => {
            const cancelPoll = pollProductResearchProgress(
              newProduct.id,
              (progress, done) => {
                if (done) {
                  if (progress?.error) {
                    console.error('Research poll error:', progress.label);
                    toast.error('La investigación encontró un error', {
                      description: progress.label || 'Puedes reintentar desde el detalle del producto.'
                    });
                    resolve(false);
                  } else {
                    resolve(true);
                  }
                  cancelPoll();
                }
              },
              3000,
              200,
            );

            // Safety timeout: don't block forever (10 min)
            setTimeout(() => {
              cancelPoll();
              resolve(false);
            }, 600000);
          });

          if (!researchSuccess) {
            toast.error('La investigación no se completó a tiempo', {
              description: 'Puedes ver el progreso parcial y reintentar desde el detalle del producto.'
            });
          }
        }
      } catch (researchError) {
        console.error('Research exception:', researchError);
        toast.error('Error al generar la investigación', {
          description: 'El brief fue guardado. Puedes reintentar la investigación desde el detalle del producto.'
        });
      }

      // Step 3: Get the client's organization_id
      const { data: clientData } = await supabase
        .from('clients')
        .select('organization_id')
        .eq('id', clientId)
        .single();

      // Step 4: Create the content items automatically with phase distribution
      if (totalFromPhases > 0) {
        const contentItems: any[] = [];

        // Create content items for each phase with prefilled guionizador data
        ESFERA_PHASES.forEach((phase) => {
          const count = briefData.phaseDistribution[phase.key];
          const phaseDefaults = PHASE_DEFAULTS[phase.key];

          for (let i = 0; i < count; i++) {
            contentItems.push({
              // Basic info
              title: `${briefData.productName} - ${phase.label} ${i + 1}`,
              client_id: clientId,
              product_id: newProduct.id,
              status: 'draft' as const,
              organization_id: clientData?.organization_id || null,

              // Sphere phase
              sphere_phase: phase.key,
              funnel_stage: phaseDefaults.funnelStage,
              content_objective: phaseDefaults.objective,

              // Guionizador prefilled fields
              cta: phaseDefaults.defaultCTA,
              hooks_count: 3,
              target_platform: briefData.platforms[0] || 'instagram',

              // Description with context
              description: `Contenido para fase ${phase.label}: ${phase.description}.\n\nObjetivo: ${briefData.currentObjective}\nTécnicas: ${phaseDefaults.techniques.join(', ')}\nTono: ${phaseDefaults.tone}`,

              // Strategist guidelines generated from brief
              strategist_guidelines: buildStrategistGuidelines(briefData, phase),
            });
          }
        });

        if (contentItems.length > 0) {
          const { error: contentError } = await supabase
            .from('content')
            .insert(contentItems);

          if (contentError) {
            console.error('Error creating content items:', contentError);
            toast.error('Producto creado pero hubo un error al crear los creativos');
          } else {
            toast.success(`¡${contentItems.length} creativo${contentItems.length > 1 ? 's' : ''} creado${contentItems.length > 1 ? 's' : ''} en el board!`);
          }
        }
      }

      if (researchSuccess) {
        toast.success('¡Investigación completada!', {
          description: 'El producto ha sido creado con análisis de mercado completo.'
        });
      }

      // Clear the draft after successful creation
      clearDraft(clientId);
      onComplete(newProduct.id);
    } catch (error) {
      console.error('Error creating product:', error);
      // If the product was already created, still navigate to it
      if (createdProductId) {
        toast.error('Error parcial', {
          description: 'El producto fue creado pero hubo un problema adicional. Revisa el detalle del producto.'
        });
        clearDraft(clientId);
        onComplete(createdProductId);
      } else {
        const msg = error instanceof Error ? error.message : 'Intenta de nuevo';
        const isRLS = msg.includes('row-level security') || msg.includes('policy');
        toast.error('Error al crear el producto', {
          description: isRLS
            ? 'No tienes permisos para crear productos para este cliente. Contacta al administrador.'
            : msg
        });
      }
    } finally {
      setIsGenerating(false);
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
        >
          {isThisFieldEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          {hasValue ? 'Complementar' : 'Generar'}
        </Button>

        {hasValue && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" disabled={!!enhancingField} className="h-7 w-7">
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => enhanceWithAI(field, 'append')}>
                <Wand2 className="h-4 w-4 mr-2" />
                Complementar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (window.confirm('¿Reemplazar el texto actual?')) enhanceWithAI(field, 'replace');
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Generar nuevo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            {/* Business Type Selector */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <Label className="text-base font-semibold">¿Qué tipo de negocio es? *</Label>
              <p className="text-sm text-muted-foreground mb-3">Esto nos ayuda a personalizar los guiones</p>
              <RadioGroup 
                value={briefData.businessType} 
                onValueChange={(v: 'product_service' | 'personal_brand') => updateField('businessType', v)}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  briefData.businessType === 'product_service' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="product_service" id="product_service" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="product_service" className="text-base font-medium cursor-pointer flex items-center gap-2">
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
                <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  briefData.businessType === 'personal_brand' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}>
                  <RadioGroupItem value="personal_brand" id="personal_brand" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="personal_brand" className="text-base font-medium cursor-pointer flex items-center gap-2">
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

            <div>
              <Label htmlFor="productName">
                {briefData.businessType === 'personal_brand' 
                  ? '¿Cuál es tu nombre o el de tu marca personal? *' 
                  : '¿Cómo se llama tu producto o servicio? *'}
              </Label>
              <Input
                id="productName"
                value={briefData.productName}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder={briefData.businessType === 'personal_brand' 
                  ? 'Ej: María García, Coach María, Dr. García...' 
                  : 'Ej: Curso de Marketing Digital, Crema Antiedad, Mentoría de Negocios...'}
                className="mt-1"
              />
            </div>

            <div>
              <Label>¿En qué categoría está? *</Label>
              <Select value={briefData.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Elige la que más se parezca" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {briefData.category === 'Otro' && (
              <div>
                <Label htmlFor="customCategory">Cuéntanos cuál es</Label>
                <Input
                  id="customCategory"
                  value={briefData.customCategory}
                  onChange={(e) => updateField('customCategory', e.target.value)}
                  placeholder="Escribe tu categoría"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label>¿Qué quieres lograr ahora mismo? *</Label>
              <Select value={briefData.currentObjective} onValueChange={(v) => updateField('currentObjective', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Elige tu objetivo principal" />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((obj) => (
                    <SelectItem key={obj} value={obj}>{obj}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="slogan">
                  {briefData.businessType === 'personal_brand'
                    ? '¿Tienes una frase que te represente? *'
                    : '¿Tienes una frase que represente tu producto? *'}
                </Label>
                {renderEnhanceButton('slogan')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Una frase corta que la gente recuerde</p>
              <Textarea
                id="slogan"
                value={briefData.slogan}
                onChange={(e) => updateField('slogan', e.target.value)}
                placeholder={briefData.businessType === 'personal_brand'
                  ? 'Ej: Tu mejor versión te espera, Creando líderes, Transformo vidas...'
                  : 'Ej: Transforma tu vida en 90 días, Belleza que se nota, El método que sí funciona...'}
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label>¿En qué mercado/región vendes principalmente?</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Esto enfoca el análisis de competencia en tu mercado objetivo
              </p>
              <Select value={briefData.targetMarket} onValueChange={(v) => updateField('targetMarket', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona el mercado objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_MARKETS.map(market => (
                    <SelectItem key={market} value={market}>{market}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Upload for additional context */}
            <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-primary" />
                <Label>Documento del producto (Opcional)</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Sube un documento con información adicional del producto. La IA lo leerá para enriquecer la investigación.
              </p>
              <Input
                value={briefData.documentUrl || ''}
                onChange={(e) => updateField('documentUrl', e.target.value)}
                placeholder="https://drive.google.com/... o URL del documento"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos soportados: PDF, Google Docs, archivos de texto.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mainBenefit">¿Qué es lo mejor que obtiene tu cliente? *</Label>
                {renderEnhanceButton('mainBenefit')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">El resultado más importante que van a lograr</p>
              <Textarea
                id="mainBenefit"
                value={briefData.mainBenefit}
                onChange={(e) => updateField('mainBenefit', e.target.value)}
                placeholder="Ej: Aprenderán a vender por internet, Tendrán una piel más joven, Duplicarán sus ingresos..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="transformation">¿Cómo cambia la vida de tu cliente? *</Label>
                {renderEnhanceButton('transformation')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">El antes y después de usar tu producto</p>
              <Textarea
                id="transformation"
                value={briefData.transformation}
                onChange={(e) => updateField('transformation', e.target.value)}
                placeholder="Ej: Pasan de no saber nada a tener su primer negocio online, De sentirse cansados a tener energía todo el día..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="differentiator">¿Qué te hace diferente a los demás? *</Label>
                {renderEnhanceButton('differentiator')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Lo que solo tú ofreces</p>
              <Textarea
                id="differentiator"
                value={briefData.differentiator}
                onChange={(e) => updateField('differentiator', e.target.value)}
                placeholder="Ej: Somos los únicos con garantía de resultados, Nuestro método está probado en 10,000 personas..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="keyIngredients">¿Qué incluye tu producto? *</Label>
                {renderEnhanceButton('keyIngredients')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Los componentes, módulos, ingredientes o partes principales</p>
              <Textarea
                id="keyIngredients"
                value={briefData.keyIngredients}
                onChange={(e) => updateField('keyIngredients', e.target.value)}
                placeholder="Ej: 12 módulos de video, 3 sesiones personalizadas, Ingredientes 100% naturales..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mustCommunicate">¿Qué mensaje no puede faltar? *</Label>
                {renderEnhanceButton('mustCommunicate')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Lo que siempre debe decirse de tu producto</p>
              <Textarea
                id="mustCommunicate"
                value={briefData.mustCommunicate}
                onChange={(e) => updateField('mustCommunicate', e.target.value)}
                placeholder="Ej: Que tiene garantía, Que es fácil de usar, Que funciona rápido..."
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Product Details Section */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-primary mb-4">Detalles del Producto/Servicio (opcional pero útil)</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Rango de precio</Label>
                  <Input
                    value={briefData.priceRange || ''}
                    onChange={(e) => updateField('priceRange', e.target.value)}
                    placeholder="Ej: $197-$497 USD, $50/mes"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>¿Cuánto tiempo llevas en el mercado?</Label>
                  <Select value={briefData.yearsInMarket || ''} onValueChange={(v) => updateField('yearsInMarket', v)}>
                    <SelectTrigger className="mt-1">
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

              <div className="mt-4">
                <Label>¿Cómo se entrega el producto/servicio?</Label>
                <Input
                  value={briefData.deliveryMethod || ''}
                  onChange={(e) => updateField('deliveryMethod', e.target.value)}
                  placeholder="Ej: Plataforma online, sesiones 1:1, envío físico, descarga digital..."
                  className="mt-1"
                />
              </div>

              <div className="mt-4">
                <Label>¿Qué formato tiene? (para servicios: estructura)</Label>
                <Textarea
                  value={briefData.productFormat || ''}
                  onChange={(e) => updateField('productFormat', e.target.value)}
                  placeholder="Ej: 8 módulos + 12 sesiones grupales + comunidad privada"
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="mt-4">
                <Label>¿Qué garantías ofreces?</Label>
                <Input
                  value={briefData.guarantees || ''}
                  onChange={(e) => updateField('guarantees', e.target.value)}
                  placeholder="Ej: 30 días de devolución, garantía de resultados..."
                  className="mt-1"
                />
              </div>

              <div className="mt-4">
                <Label>Prueba social existente (testimonios, casos de éxito, números)</Label>
                <Textarea
                  value={briefData.socialProof || ''}
                  onChange={(e) => updateField('socialProof', e.target.value)}
                  placeholder="Ej: +500 alumnos, 4.8 estrellas, testimonios de expertos..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="mt-4">
                <Label>Casos de éxito o transformaciones reales</Label>
                <Textarea
                  value={briefData.successStories || ''}
                  onChange={(e) => updateField('successStories', e.target.value)}
                  placeholder="Ej: Juan pasó de $2K a $15K/mes en 3 meses usando el método..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="problemSolved">¿Qué problema le resuelves a tu cliente? *</Label>
                {renderEnhanceButton('problemSolved')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">La frustración o dolor que eliminas</p>
              <Textarea
                id="problemSolved"
                value={briefData.problemSolved}
                onChange={(e) => updateField('problemSolved', e.target.value)}
                placeholder="Ej: No saben cómo empezar su negocio, Tienen acné y baja autoestima, Pierden dinero por no saber invertir..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mainDesire">¿Qué es lo que más desea tu cliente? *</Label>
                {renderEnhanceButton('mainDesire')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Su sueño o anhelo más profundo</p>
              <Textarea
                id="mainDesire"
                value={briefData.mainDesire}
                onChange={(e) => updateField('mainDesire', e.target.value)}
                placeholder="Ej: Tener libertad financiera, Verse joven de nuevo, Tener un negocio exitoso..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="consequenceOfNotBuying">¿Qué pasa si no compran? *</Label>
                {renderEnhanceButton('consequenceOfNotBuying')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Lo que pierden si no toman acción</p>
              <Textarea
                id="consequenceOfNotBuying"
                value={briefData.consequenceOfNotBuying}
                onChange={(e) => updateField('consequenceOfNotBuying', e.target.value)}
                placeholder="Ej: Seguirán estancados, Perderán más tiempo y dinero, Su problema empeorará..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="competitiveAdvantage">¿Por qué te elegirían a ti? *</Label>
                {renderEnhanceButton('competitiveAdvantage')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Tu razón para ser la mejor opción</p>
              <Textarea
                id="competitiveAdvantage"
                value={briefData.competitiveAdvantage}
                onChange={(e) => updateField('competitiveAdvantage', e.target.value)}
                placeholder="Ej: Resultados comprobados, Más experiencia, Mejor precio, Atención personalizada..."
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Deeper Problem Understanding */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-primary mb-4">Profundizando en el problema (opcional pero muy útil)</p>

              <div>
                <Label>¿Cuál es la RAÍZ del problema? (no el síntoma)</Label>
                <Textarea
                  value={briefData.rootCause || ''}
                  onChange={(e) => updateField('rootCause', e.target.value)}
                  placeholder="Ej: No es que no tengan tiempo, es que no saben priorizar. No es que no vendan, es que no tienen un sistema..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="mt-4">
                <Label>¿Qué soluciones han INTENTADO antes y por qué fallaron?</Label>
                <Textarea
                  value={briefData.failedSolutions || ''}
                  onChange={(e) => updateField('failedSolutions', e.target.value)}
                  placeholder="Ej: Cursos genéricos (no personalizados), coaches sin experiencia real, apps que no dan seguimiento..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="mt-4">
                <Label>¿Qué tan URGENTE es resolver este problema para el cliente?</Label>
                <Select value={briefData.urgencyLevel || ''} onValueChange={(v) => updateField('urgencyLevel', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Nivel de urgencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítico - Les está costando dinero/salud/relaciones ahora</SelectItem>
                    <SelectItem value="high">Alto - Lo necesitan resolver pronto</SelectItem>
                    <SelectItem value="medium">Medio - Les gustaría resolverlo pero no es urgente</SelectItem>
                    <SelectItem value="low">Bajo - Es un "nice to have"</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg mb-2">
              <p className="text-sm text-muted-foreground">
                💡 <strong>¿Para qué sirve esto?</strong> Las personas compran por emociones, no por lógica. 
                Aquí identificamos qué motiva a tu cliente a tomar acción.
              </p>
            </div>

            <div>
              <Label className="text-base font-semibold">🎯 ¿Qué necesidad básica satisface tu producto? *</Label>
              <p className="text-sm text-muted-foreground mb-3">Selecciona las que apliquen a tu cliente</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {REPTILE_TRIGGERS.map((trigger) => (
                  <div
                    key={trigger.value}
                    onClick={() => toggleArrayField('reptileBrain', trigger.value)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      briefData.reptileBrain.includes(trigger.value)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={briefData.reptileBrain.includes(trigger.value)} />
                      <div>
                        <p className="font-medium text-sm">{trigger.label}</p>
                        <p className="text-xs text-muted-foreground">{trigger.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">💗 ¿Cómo se sentirán después de comprarte? *</Label>
              <p className="text-sm text-muted-foreground mb-3">Las emociones que experimentarán</p>
              <div className="flex flex-wrap gap-2">
                {LIMBIC_EMOTIONS.map((emotion) => (
                  <Badge
                    key={emotion.value}
                    variant={briefData.limbicBrain.includes(emotion.value) ? 'default' : 'outline'}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => toggleArrayField('limbicBrain', emotion.value)}
                  >
                    {emotion.emoji} {emotion.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="cortexBrain" className="text-base font-semibold">🧠 ¿Cómo lo justifican lógicamente? *</Label>
                  <p className="text-sm text-muted-foreground">La excusa racional que se dan para comprar</p>
                </div>
                {renderEnhanceButton('cortexBrain')}
              </div>
              <Textarea
                id="cortexBrain"
                value={briefData.cortexBrain}
                onChange={(e) => updateField('cortexBrain', e.target.value)}
                placeholder="Ej: Es una inversión en mi futuro, A largo plazo me ahorra dinero, Lo necesito para mi trabajo..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg mb-2">
              <p className="text-sm text-muted-foreground">
                👤 <strong>Vamos a conocer a tu cliente ideal.</strong> Piensa en la persona perfecta que compraría tu producto.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>¿Es hombre, mujer o ambos? *</Label>
                <Select value={briefData.targetGender} onValueChange={(v) => updateField('targetGender', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Elige uno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Principalmente mujeres</SelectItem>
                    <SelectItem value="male">Principalmente hombres</SelectItem>
                    <SelectItem value="both">Ambos por igual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>¿Qué edad tienen? * (puedes elegir varios)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AGE_RANGES.map((age) => (
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

            <div>
              <Label htmlFor="targetOccupation">¿A qué se dedican? *</Label>
              <p className="text-sm text-muted-foreground mb-1">Su trabajo o actividad principal</p>
              <Input
                id="targetOccupation"
                value={briefData.targetOccupation}
                onChange={(e) => updateField('targetOccupation', e.target.value)}
                placeholder="Ej: Emprendedores, mamás, profesionales, estudiantes..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>¿Qué les interesa? * (elige varios)</Label>
              <p className="text-sm text-muted-foreground mb-1">Los temas que les gustan</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {INTERESTS.map((interest) => (
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

            <div>
              <Label htmlFor="targetHabits">¿Cómo es su día a día? *</Label>
              <p className="text-sm text-muted-foreground mb-1">Sus rutinas y comportamientos</p>
              <Textarea
                id="targetHabits"
                value={briefData.targetHabits}
                onChange={(e) => updateField('targetHabits', e.target.value)}
                placeholder="Ej: Trabajan todo el día, usan mucho Instagram, buscan mejorar su vida..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label>¿Qué excusas ponen para no comprar? * (elige las comunes)</Label>
              <p className="text-sm text-muted-foreground mb-1">Los pretextos más típicos</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {COMMON_OBJECTIONS.map((objection) => (
                  <Badge
                    key={objection}
                    variant={briefData.commonObjections.includes(objection) ? 'destructive' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleArrayField('commonObjections', objection)}
                  >
                    {objection}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="idealScenario">¿Cómo será su vida después de comprarte? *</Label>
                {renderEnhanceButton('idealScenario')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">El resultado soñado</p>
              <Textarea
                id="idealScenario"
                value={briefData.idealScenario}
                onChange={(e) => updateField('idealScenario', e.target.value)}
                placeholder="Ej: Tendrán más tiempo libre, Se sentirán seguros de sí mismos, Ganarán más dinero..."
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Deeper Audience Understanding */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-primary mb-4">Comportamiento de compra (opcional)</p>

              <div>
                <Label>Capacidad de pago del cliente ideal</Label>
                <Select value={briefData.buyingPower || ''} onValueChange={(v) => updateField('buyingPower', v)}>
                  <SelectTrigger className="mt-1">
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

              <div className="mt-4">
                <Label>¿Quién influye en su decisión de compra?</Label>
                <Textarea
                  value={briefData.decisionInfluencers || ''}
                  onChange={(e) => updateField('decisionInfluencers', e.target.value)}
                  placeholder="Ej: Su pareja, su coach, amigos emprendedores, reviews de YouTube..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="mt-4">
                <Label>¿Dónde buscan información antes de comprar?</Label>
                <Textarea
                  value={briefData.informationSources || ''}
                  onChange={(e) => updateField('informationSources', e.target.value)}
                  placeholder="Ej: Google, YouTube, Instagram, grupos de Facebook, podcasts..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="mt-4">
                <Label>¿Qué evento o situación los llevaría a comprar HOY?</Label>
                <Textarea
                  value={briefData.purchaseTriggers || ''}
                  onChange={(e) => updateField('purchaseTriggers', e.target.value)}
                  placeholder="Ej: Perdieron un cliente importante, su competencia los superó, un diagnóstico médico..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg mb-2">
              <p className="text-sm text-muted-foreground">
                📱 <strong>¡Ya casi terminamos!</strong> Ahora cuéntanos dónde y cómo quieres mostrar tu producto.
              </p>
            </div>

            <div>
              <Label>¿Qué tipo de videos o fotos te gustan? * (elige varios)</Label>
              <p className="text-sm text-muted-foreground mb-1">El estilo de contenido que prefieres</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {CONTENT_TYPES.map((type) => (
                  <div
                    key={type.value}
                    onClick={() => toggleArrayField('contentTypes', type.value)}
                    className={`p-2 rounded-lg border cursor-pointer text-center transition-all ${
                      briefData.contentTypes.includes(type.value)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="text-sm font-medium">{type.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>¿En qué redes sociales publicas? * (elige varias)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PLATFORMS.map((platform) => (
                  <Badge
                    key={platform.value}
                    variant={briefData.platforms.includes(platform.value) ? 'default' : 'outline'}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => toggleArrayField('platforms', platform.value)}
                  >
                    {platform.icon} {platform.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>¿Vas a pagar publicidad con este contenido? *</Label>
              <RadioGroup
                value={briefData.useForAds}
                onValueChange={(v) => updateField('useForAds', v)}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="ads-yes" />
                  <Label htmlFor="ads-yes">Sí, pagaré anuncios</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="ads-no" />
                  <Label htmlFor="ads-no">No, solo publicaciones normales</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="ads-both" />
                  <Label htmlFor="ads-both">Ambos</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="brandStrengths">¿Qué siempre debe destacarse de tu marca? *</Label>
              <p className="text-sm text-muted-foreground mb-1">Lo que nunca puede faltar</p>
              <Textarea
                id="brandStrengths"
                value={briefData.brandStrengths}
                onChange={(e) => updateField('brandStrengths', e.target.value)}
                placeholder="Ej: Nuestra calidad, Nuestro servicio, Nuestra experiencia, Nuestros resultados..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="brandRestrictions">¿Hay algo que NO se debe decir? (opcional)</Label>
              <p className="text-sm text-muted-foreground mb-1">Cosas que quieres evitar</p>
              <Textarea
                id="brandRestrictions"
                value={briefData.brandRestrictions}
                onChange={(e) => updateField('brandRestrictions', e.target.value)}
                placeholder="Ej: No mencionar competidores, No hacer promesas exageradas, No usar ciertos colores..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="expectedResult">¿Qué quieres lograr con este contenido? *</Label>
              <p className="text-sm text-muted-foreground mb-1">Tu meta principal</p>
              <Textarea
                id="expectedResult"
                value={briefData.expectedResult}
                onChange={(e) => updateField('expectedResult', e.target.value)}
                placeholder="Ej: Que me contacten más personas, Aumentar mis seguidores, Vender más, Generar confianza..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="referenceContent">¿Tienes ejemplos de contenido que te guste? (opcional)</Label>
              <p className="text-sm text-muted-foreground mb-1">Links de videos o publicaciones que quieras como referencia</p>
              <Textarea
                id="referenceContent"
                value={briefData.referenceContent}
                onChange={(e) => updateField('referenceContent', e.target.value)}
                placeholder="Pega aquí los links de TikTok, Instagram, YouTube, etc."
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Content Strategy Details */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-primary mb-4">Personalidad de marca (opcional)</p>

              <div>
                <Label>¿Cuál es la voz/personalidad de tu marca?</Label>
                <Select value={briefData.brandVoice || ''} onValueChange={(v) => updateField('brandVoice', v)}>
                  <SelectTrigger className="mt-1">
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

              <div className="mt-4">
                <Label>¿Qué contenido hace tu competencia? (para diferenciarnos)</Label>
                <Textarea
                  value={briefData.competitorContent || ''}
                  onChange={(e) => updateField('competitorContent', e.target.value)}
                  placeholder="Ej: Hacen muchos talking heads aburridos, solo promocionan, no educan..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="mt-4">
                <Label>Presupuesto aproximado para producción de contenido</Label>
                <Select value={briefData.budgetRange || ''} onValueChange={(v) => updateField('budgetRange', v)}>
                  <SelectTrigger className="mt-1">
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

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">🎬 Planifica tus Videos</h3>
              <p className="text-muted-foreground">
                Distribuye los videos disponibles según la fase del embudo de ventas
              </p>
            </div>

            {/* Videos Section - Based on Client Packages */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  📦 Videos Disponibles de tus Paquetes
                </Label>
                
                {loadingPackages ? (
                  <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando paquetes...</span>
                  </div>
                ) : videosAvailable > 0 ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary" className="text-sm py-1.5 px-3">
                        📦 {videosOwed} videos contratados
                      </Badge>
                      <Badge variant="outline" className="text-sm py-1.5 px-3">
                        ✅ {videosUsed} ya creados
                      </Badge>
                      <Badge className="text-sm py-1.5 px-3 bg-emerald-600">
                        🎯 {videosAvailable} disponibles para crear
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      ⚠️ No tienes videos disponibles
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Todos los videos de tus paquetes activos ya fueron creados.
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Contratados: {videosOwed} | Usados: {videosUsed}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Phase Distribution Section */}
            {videosAvailable > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    📊 Distribuye por Fase del Embudo (Método Esfera)
                  </Label>
                  <Badge variant={totalFromPhases > 0 ? 'default' : 'outline'} className="text-sm py-1 px-3">
                    {totalFromPhases} / {videosAvailable} seleccionados
                  </Badge>
                </div>
                
                <div className="grid gap-4">
                  {ESFERA_PHASES.map((phase) => (
                    <div
                      key={phase.key}
                      className={`p-4 rounded-lg border-2 ${phase.color} transition-all`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Header */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xl">{phase.icon}</span>
                            <span className={`font-bold text-lg ${phase.textColor}`}>{phase.label}</span>
                            <Badge variant="secondary" className="text-xs">
                              {phase.audience.split(':')[0]}
                            </Badge>
                          </div>
                          
                          {/* Description */}
                          <p className={`text-sm font-semibold ${phase.textColor}`}>{phase.description}</p>
                          <p className="text-sm text-foreground/80">{phase.details}</p>
                          
                          {/* Meta Campaign Info */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-xs font-medium">
                              {phase.metaCampaign}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {phase.objective}
                            </Badge>
                          </div>
                          
                          {/* Content Examples */}
                          <p className="text-xs text-muted-foreground italic">
                            📹 Contenido recomendado: {phase.contentExamples}
                          </p>
                        </div>
                        
                        {/* Counter */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground">Videos</span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => updatePhaseCount(phase.key, briefData.phaseDistribution[phase.key] - 1)}
                              disabled={briefData.phaseDistribution[phase.key] <= 0}
                            >
                              -
                            </Button>
                            <span className={`w-10 text-center font-bold text-2xl ${phase.textColor}`}>
                              {briefData.phaseDistribution[phase.key]}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => updatePhaseCount(phase.key, briefData.phaseDistribution[phase.key] + 1)}
                              disabled={totalFromPhases >= videosAvailable}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalFromPhases > 0 && (
                  <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-lg">
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      ✅ Se crearán <strong>{totalFromPhases}</strong> proyectos en tu tablero de contenido, 
                      distribuidos estratégicamente por fase del embudo.
                    </p>
                  </div>
                )}
              </div>
            )}
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
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Guardado automáticamente
              </span>
            )}
            <span>{Math.round(progress)}% completado</span>
          </div>
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
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[70px] ${
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
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={() => {
              // Ask before canceling if there's data
              if (briefData.productName.trim()) {
                if (window.confirm('¿Seguro que quieres salir? Tu progreso se guardará automáticamente y podrás continuar después.')) {
                  onCancel();
                }
              } else {
                clearDraft(clientId);
                onCancel();
              }
            }}>
              Cancelar
            </Button>
          )}
          <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
          </Button>
        </div>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={() => setCurrentStep(prev => prev + 1)} disabled={!canProceed}>
            Siguiente <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleCreateAndGenerateResearch} 
            disabled={isGenerating || !isAllStepsComplete()} 
            className="gap-2"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creando producto...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Crear Producto con IA</>
            )}
          </Button>
        )}
      </div>

      {isGenerating && generatingProductId && (
        <ResearchProgressIndicator productId={generatingProductId} isGenerating={isGenerating} />
      )}
    </div>
  );
}
