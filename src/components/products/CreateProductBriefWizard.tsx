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

interface CreateProductBriefWizardProps {
  clientId: string;
  onComplete: (productId: string) => void;
  onCancel?: () => void;
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

const DEFAULT_BRIEF: BriefData = {
  productName: '',
  category: '',
  customCategory: '',
  currentObjective: '',
  slogan: '',
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

export function CreateProductBriefWizard({ 
  clientId, 
  onComplete,
  onCancel 
}: CreateProductBriefWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [briefData, setBriefData] = useState<BriefData>(DEFAULT_BRIEF);

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

      const { data, error } = await supabase.functions.invoke('multi-ai', {
        body: {
          models: ['gemini'],
          mode: 'first',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }
      });

      if (error) throw error;

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
    try {
      // Step 1: Create the product in database
      const { data: newProduct, error: createError } = await supabase
        .from('products')
        .insert({
          client_id: clientId,
          name: briefData.productName,
          brief_data: JSON.parse(JSON.stringify(briefData)),
          brief_status: 'in_progress',
        })
        .select('id')
        .single();

      if (createError) throw createError;

      toast.success('Producto creado, iniciando investigación con IA...');

      // Step 2: Call the research function
      const { data, error } = await supabase.functions.invoke('product-research', {
        body: { productId: newProduct.id, briefData }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('¡Investigación completada!', {
          description: 'El producto ha sido creado con análisis de mercado completo.'
        });
        onComplete(newProduct.id);
      } else {
        throw new Error(data?.error || 'Error al generar la investigación');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Error al crear el producto', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo'
      });
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
            <div>
              <Label htmlFor="productName">Nombre del producto o servicio *</Label>
              <Input
                id="productName"
                value={briefData.productName}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder="Ej: Curso de Marketing Digital"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Categoría *</Label>
              <Select value={briefData.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona una categoría" />
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
                <Label htmlFor="customCategory">Especifica la categoría</Label>
                <Input
                  id="customCategory"
                  value={briefData.customCategory}
                  onChange={(e) => updateField('customCategory', e.target.value)}
                  placeholder="Tu categoría específica"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label>Objetivo actual *</Label>
              <Select value={briefData.currentObjective} onValueChange={(v) => updateField('currentObjective', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="¿Qué quieres lograr?" />
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
                <Label htmlFor="slogan">Slogan o frase de venta *</Label>
                {renderEnhanceButton('slogan')}
              </div>
              <Textarea
                id="slogan"
                value={briefData.slogan}
                onChange={(e) => updateField('slogan', e.target.value)}
                placeholder="Ej: Transforma tu vida en 90 días"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mainBenefit">Beneficio principal *</Label>
                {renderEnhanceButton('mainBenefit')}
              </div>
              <Textarea
                id="mainBenefit"
                value={briefData.mainBenefit}
                onChange={(e) => updateField('mainBenefit', e.target.value)}
                placeholder="¿Cuál es el principal beneficio que obtiene el cliente?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="transformation">Transformación *</Label>
                {renderEnhanceButton('transformation')}
              </div>
              <Textarea
                id="transformation"
                value={briefData.transformation}
                onChange={(e) => updateField('transformation', e.target.value)}
                placeholder="¿Cómo cambia la vida del cliente después de usar tu producto?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="differentiator">Diferenciador único *</Label>
                {renderEnhanceButton('differentiator')}
              </div>
              <Textarea
                id="differentiator"
                value={briefData.differentiator}
                onChange={(e) => updateField('differentiator', e.target.value)}
                placeholder="¿Qué te hace diferente de la competencia?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="keyIngredients">Ingredientes/Componentes clave *</Label>
                {renderEnhanceButton('keyIngredients')}
              </div>
              <Textarea
                id="keyIngredients"
                value={briefData.keyIngredients}
                onChange={(e) => updateField('keyIngredients', e.target.value)}
                placeholder="¿Qué incluye tu producto? Módulos, sesiones, ingredientes..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mustCommunicate">Lo que DEBE comunicarse *</Label>
                {renderEnhanceButton('mustCommunicate')}
              </div>
              <Textarea
                id="mustCommunicate"
                value={briefData.mustCommunicate}
                onChange={(e) => updateField('mustCommunicate', e.target.value)}
                placeholder="Mensajes clave que no pueden faltar en el contenido"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="problemSolved">Problema que resuelve *</Label>
                {renderEnhanceButton('problemSolved')}
              </div>
              <Textarea
                id="problemSolved"
                value={briefData.problemSolved}
                onChange={(e) => updateField('problemSolved', e.target.value)}
                placeholder="¿Qué dolor o problema específico soluciona?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mainDesire">Deseo principal *</Label>
                {renderEnhanceButton('mainDesire')}
              </div>
              <Textarea
                id="mainDesire"
                value={briefData.mainDesire}
                onChange={(e) => updateField('mainDesire', e.target.value)}
                placeholder="¿Qué desea profundamente tu cliente ideal?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="consequenceOfNotBuying">Consecuencia de no comprar *</Label>
                {renderEnhanceButton('consequenceOfNotBuying')}
              </div>
              <Textarea
                id="consequenceOfNotBuying"
                value={briefData.consequenceOfNotBuying}
                onChange={(e) => updateField('consequenceOfNotBuying', e.target.value)}
                placeholder="¿Qué pasa si el cliente NO toma acción?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="competitiveAdvantage">Ventaja competitiva *</Label>
                {renderEnhanceButton('competitiveAdvantage')}
              </div>
              <Textarea
                id="competitiveAdvantage"
                value={briefData.competitiveAdvantage}
                onChange={(e) => updateField('competitiveAdvantage', e.target.value)}
                placeholder="¿Por qué elegirte a ti y no a la competencia?"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold">🦎 Cerebro Reptiliano *</Label>
              <p className="text-sm text-muted-foreground mb-3">Instintos primarios que activa tu producto</p>
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
              <Label className="text-base font-semibold">💗 Cerebro Límbico *</Label>
              <p className="text-sm text-muted-foreground mb-3">Emociones que genera tu producto</p>
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
                  <Label htmlFor="cortexBrain" className="text-base font-semibold">🧠 Cerebro Córtex *</Label>
                  <p className="text-sm text-muted-foreground">Justificación racional de la compra</p>
                </div>
                {renderEnhanceButton('cortexBrain')}
              </div>
              <Textarea
                id="cortexBrain"
                value={briefData.cortexBrain}
                onChange={(e) => updateField('cortexBrain', e.target.value)}
                placeholder="¿Cómo justifica el cliente racionalmente su compra?"
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Género *</Label>
                <Select value={briefData.targetGender} onValueChange={(v) => updateField('targetGender', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Mujer</SelectItem>
                    <SelectItem value="male">Hombre</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Rango de edad *</Label>
                <Select value={briefData.targetAgeRange} onValueChange={(v) => updateField('targetAgeRange', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map((age) => (
                      <SelectItem key={age} value={age}>{age}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="targetOccupation">Ocupación / Profesión *</Label>
              <Input
                id="targetOccupation"
                value={briefData.targetOccupation}
                onChange={(e) => updateField('targetOccupation', e.target.value)}
                placeholder="Ej: Emprendedores, amas de casa, profesionales..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Intereses principales * (selecciona varios)</Label>
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
              <Label htmlFor="targetHabits">Hábitos y comportamientos *</Label>
              <Textarea
                id="targetHabits"
                value={briefData.targetHabits}
                onChange={(e) => updateField('targetHabits', e.target.value)}
                placeholder="¿Qué hace tu cliente ideal en su día a día?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label>Objeciones comunes * (selecciona las que apliquen)</Label>
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
                <Label htmlFor="idealScenario">Escenario ideal post-compra *</Label>
                {renderEnhanceButton('idealScenario')}
              </div>
              <Textarea
                id="idealScenario"
                value={briefData.idealScenario}
                onChange={(e) => updateField('idealScenario', e.target.value)}
                placeholder="¿Cómo se ve la vida de tu cliente después de usar tu producto?"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label>Tipos de contenido * (selecciona varios)</Label>
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
              <Label>Plataformas objetivo * (selecciona varias)</Label>
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
              <Label>¿El contenido se usará para Ads? *</Label>
              <RadioGroup
                value={briefData.useForAds}
                onValueChange={(v) => updateField('useForAds', v)}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="ads-yes" />
                  <Label htmlFor="ads-yes">Sí</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="ads-no" />
                  <Label htmlFor="ads-no">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="ads-both" />
                  <Label htmlFor="ads-both">Ambos (orgánico y Ads)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="brandStrengths">Puntos fuertes a comunicar *</Label>
              <Textarea
                id="brandStrengths"
                value={briefData.brandStrengths}
                onChange={(e) => updateField('brandStrengths', e.target.value)}
                placeholder="¿Qué aspectos de tu marca deben destacarse siempre?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="brandRestrictions">Restricciones de marca (opcional)</Label>
              <Textarea
                id="brandRestrictions"
                value={briefData.brandRestrictions}
                onChange={(e) => updateField('brandRestrictions', e.target.value)}
                placeholder="¿Hay algo que NO se debe decir o hacer?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="expectedResult">Resultado esperado *</Label>
              <Textarea
                id="expectedResult"
                value={briefData.expectedResult}
                onChange={(e) => updateField('expectedResult', e.target.value)}
                placeholder="¿Qué esperas lograr con el contenido?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="referenceContent">Contenido de referencia (opcional)</Label>
              <Textarea
                id="referenceContent"
                value={briefData.referenceContent}
                onChange={(e) => updateField('referenceContent', e.target.value)}
                placeholder="URLs de videos o contenido que te guste como referencia"
                className="mt-1"
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
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
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

      {isGenerating && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <p className="font-medium">Investigando con IA...</p>
                <p className="text-sm text-muted-foreground">
                  Creando producto, analizando mercado, competencia y generando avatares estratégicos. 
                  Esto puede tomar 1-2 minutos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
