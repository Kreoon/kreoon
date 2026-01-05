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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Comprehensive brief data structure
interface BriefData {
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
  
  // Section 3: Problem & Desire
  problemSolved: string;
  mainDesire: string;
  consequenceOfNotBuying: string;
  competitiveAdvantage: string;
  
  // Section 4: Neuromarketing
  reptileBrain: string[];
  limbicBrain: string[];
  cortexBrain: string;
  
  // Section 5: Target Audience
  targetGender: string;
  targetAgeRange: string;
  targetOccupation: string;
  targetInterests: string[];
  targetHabits: string;
  commonObjections: string[];
  customObjections: string;
  idealScenario: string;
  
  // Section 6: Content Strategy
  contentTypes: string[];
  platforms: string[];
  useForAds: string;
  referenceContent: string;
  brandStrengths: string;
  brandRestrictions: string;
  expectedResult: string;
  additionalNotes: string;
  
  // AI-enhanced fields
  aiSuggestedAngles: string[];
  aiSuggestedHooks: string[];
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
  problemSolved: '',
  mainDesire: '',
  consequenceOfNotBuying: '',
  competitiveAdvantage: '',
  reptileBrain: [],
  limbicBrain: [],
  cortexBrain: '',
  targetGender: '',
  targetAgeRange: '',
  targetOccupation: '',
  targetInterests: [],
  targetHabits: '',
  commonObjections: [],
  customObjections: '',
  idealScenario: '',
  contentTypes: [],
  platforms: [],
  useForAds: '',
  referenceContent: '',
  brandStrengths: '',
  brandRestrictions: '',
  expectedResult: '',
  additionalNotes: '',
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
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [briefData, setBriefData] = useState<BriefData>({
    ...DEFAULT_BRIEF,
    productName: productName || '',
    ...existingBrief,
  });

  // Save brief to database
  const saveBrief = useCallback(async (showToast = true) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          brief_data: JSON.parse(JSON.stringify(briefData)),
          brief_status: isAllStepsComplete() ? 'completed' : 'in_progress',
          brief_completed_at: isAllStepsComplete() ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
      if (showToast) {
        toast.success('Brief guardado correctamente');
      }
    } catch (error) {
      console.error('Error saving brief:', error);
      if (showToast) {
        toast.error('Error al guardar el brief');
      }
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
          briefData.targetAgeRange &&
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
          provider: 'lovable',
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
    if (!isStepComplete(0) || !isStepComplete(1) || !isStepComplete(2)) {
      toast.error('Completa al menos las primeras 3 secciones del brief');
      return;
    }

    setIsGenerating(true);
    try {
      await supabase
        .from('products')
        .update({ 
          brief_status: 'in_progress',
          brief_data: JSON.parse(JSON.stringify(briefData))
        })
        .eq('id', productId);

      const { data, error } = await supabase.functions.invoke('product-research', {
        body: { productId, briefData }
      });

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
            <div className="space-y-2">
              <Label htmlFor="productName">Nombre del producto o servicio *</Label>
              <Input
                id="productName"
                value={briefData.productName}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder="Ej: Método de Ventas High Ticket"
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
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
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
                <Label>Rango de edad *</Label>
                <Select value={briefData.targetAgeRange} onValueChange={(v) => updateField('targetAgeRange', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map(age => (
                      <SelectItem key={age} value={age}>{age}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
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
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
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
          <Button onClick={handleGenerateResearch} disabled={isGenerating || !isStepComplete(0) || !isStepComplete(1) || !isStepComplete(2)} className="gap-2">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</> : <><Sparkles className="h-4 w-4" /> Generar Investigación con IA</>}
          </Button>
        )}
      </div>

      {isGenerating && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <p className="font-medium">Investigando con Perplexity...</p>
                <p className="text-sm text-muted-foreground">Analizando mercado, competencia y generando avatares estratégicos. Esto puede tomar 1-2 minutos.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
