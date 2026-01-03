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
  { id: 'basics', title: 'Tu Producto', description: 'Cuéntanos qué vendes', icon: Package },
  { id: 'value', title: 'Lo Bueno', description: '¿Qué gana tu cliente?', icon: Sparkles },
  { id: 'problem', title: 'El Problema', description: '¿Qué dolor resuelves?', icon: Target },
  { id: 'neuro', title: 'Emociones', description: '¿Qué sienten al comprarte?', icon: Brain },
  { id: 'audience', title: 'Tu Cliente', description: '¿A quién le vendes?', icon: Users },
  { id: 'content', title: 'Contenido', description: '¿Dónde y cómo publicar?', icon: Megaphone },
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
              <Label htmlFor="productName">¿Cómo se llama tu producto o servicio? *</Label>
              <Input
                id="productName"
                value={briefData.productName}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder="Ej: Curso de Marketing Digital, Crema Antiedad, Mentoría de Negocios..."
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
                <Label htmlFor="slogan">¿Tienes una frase que represente tu producto? *</Label>
                {renderEnhanceButton('slogan')}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Una frase corta que la gente recuerde</p>
              <Textarea
                id="slogan"
                value={briefData.slogan}
                onChange={(e) => updateField('slogan', e.target.value)}
                placeholder="Ej: Transforma tu vida en 90 días, Belleza que se nota, El método que sí funciona..."
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
                <Label>¿Qué edad tienen? *</Label>
                <Select value={briefData.targetAgeRange} onValueChange={(v) => updateField('targetAgeRange', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Elige un rango" />
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
