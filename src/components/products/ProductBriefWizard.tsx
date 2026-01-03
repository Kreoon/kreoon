import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, CheckCircle2, ArrowRight, ArrowLeft, FileText, Target, Users, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BriefData {
  productName: string;
  productDescription: string;
  category: string;
  targetAudience: string;
  mainProblem: string;
  uniqueValue: string;
  priceRange: string;
  competitors: string;
  website: string;
  socialMedia: string;
  additionalInfo: string;
}

interface ProductBriefWizardProps {
  productId: string;
  productName: string;
  existingBrief?: BriefData;
  onComplete: () => void;
}

const STEPS = [
  { 
    id: 'basics', 
    title: 'Información Básica', 
    description: 'Datos esenciales del producto',
    icon: FileText 
  },
  { 
    id: 'problem', 
    title: 'Problema y Solución', 
    description: 'Qué resuelve tu producto',
    icon: Target 
  },
  { 
    id: 'audience', 
    title: 'Audiencia y Mercado', 
    description: 'A quién va dirigido',
    icon: Users 
  },
  { 
    id: 'competition', 
    title: 'Competencia', 
    description: 'El panorama competitivo',
    icon: Lightbulb 
  },
];

export function ProductBriefWizard({ 
  productId, 
  productName, 
  existingBrief,
  onComplete 
}: ProductBriefWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefData, setBriefData] = useState<BriefData>(existingBrief || {
    productName: productName || '',
    productDescription: '',
    category: '',
    targetAudience: '',
    mainProblem: '',
    uniqueValue: '',
    priceRange: '',
    competitors: '',
    website: '',
    socialMedia: '',
    additionalInfo: '',
  });

  const updateField = (field: keyof BriefData, value: string) => {
    setBriefData(prev => ({ ...prev, [field]: value }));
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!briefData.productName && !!briefData.productDescription;
      case 1:
        return !!briefData.mainProblem && !!briefData.uniqueValue;
      case 2:
        return !!briefData.targetAudience;
      case 3:
        return true; // Optional step
      default:
        return false;
    }
  };

  const canProceed = isStepComplete(currentStep);
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleGenerateResearch = async () => {
    if (!isStepComplete(0) || !isStepComplete(1)) {
      toast.error('Completa al menos la información básica y el problema/solución');
      return;
    }

    setIsGenerating(true);
    try {
      // First update brief status to in_progress
      await supabase
        .from('products')
        .update({ 
          brief_status: 'in_progress',
          brief_data: JSON.parse(JSON.stringify(briefData))
        })
        .eq('id', productId);

      // Call the research edge function
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
      
      // Revert status on error
      await supabase
        .from('products')
        .update({ brief_status: 'pending' })
        .eq('id', productId);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Nombre del Producto *</Label>
              <Input
                id="productName"
                value={briefData.productName}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder="Ej: Curso de Marketing Digital"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productDescription">Descripción del Producto *</Label>
              <Textarea
                id="productDescription"
                value={briefData.productDescription}
                onChange={(e) => updateField('productDescription', e.target.value)}
                placeholder="Describe tu producto o servicio en detalle. ¿Qué es? ¿Qué incluye? ¿Cómo funciona?"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría / Nicho</Label>
              <Input
                id="category"
                value={briefData.category}
                onChange={(e) => updateField('category', e.target.value)}
                placeholder="Ej: Educación online, Salud, Fitness, Negocios..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceRange">Rango de Precio</Label>
              <Input
                id="priceRange"
                value={briefData.priceRange}
                onChange={(e) => updateField('priceRange', e.target.value)}
                placeholder="Ej: $97 - $497 USD"
              />
            </div>
          </div>
        );
      
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mainProblem">Problema Principal que Resuelve *</Label>
              <Textarea
                id="mainProblem"
                value={briefData.mainProblem}
                onChange={(e) => updateField('mainProblem', e.target.value)}
                placeholder="¿Cuál es el dolor o frustración principal que tu producto soluciona?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uniqueValue">Propuesta de Valor Única *</Label>
              <Textarea
                id="uniqueValue"
                value={briefData.uniqueValue}
                onChange={(e) => updateField('uniqueValue', e.target.value)}
                placeholder="¿Qué hace único a tu producto? ¿Por qué deberían elegirte sobre la competencia?"
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Público Objetivo *</Label>
              <Textarea
                id="targetAudience"
                value={briefData.targetAudience}
                onChange={(e) => updateField('targetAudience', e.target.value)}
                placeholder="¿Quién es tu cliente ideal? Edad, profesión, intereses, nivel de ingresos, situación actual..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Sitio Web (opcional)</Label>
              <Input
                id="website"
                value={briefData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://tuproducto.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="socialMedia">Redes Sociales (opcional)</Label>
              <Input
                id="socialMedia"
                value={briefData.socialMedia}
                onChange={(e) => updateField('socialMedia', e.target.value)}
                placeholder="@usuario en Instagram, TikTok, etc."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="competitors">Competidores Conocidos</Label>
              <Textarea
                id="competitors"
                value={briefData.competitors}
                onChange={(e) => updateField('competitors', e.target.value)}
                placeholder="Lista los competidores que conoces. Ej: Empresa X, Curso Y de Fulano, Método Z..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Información Adicional</Label>
              <Textarea
                id="additionalInfo"
                value={briefData.additionalInfo}
                onChange={(e) => updateField('additionalInfo', e.target.value)}
                placeholder="Cualquier información adicional relevante: testimonios, casos de éxito, objeciones comunes..."
                rows={3}
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
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Paso {currentStep + 1} de {STEPS.length}</span>
          <span>{Math.round(progress)}% completado</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep || (index === currentStep && isStepComplete(index));
          
          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : isComplete 
                    ? 'text-primary/70' 
                    : 'text-muted-foreground'
              }`}
            >
              <div className={`p-2 rounded-full ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : isComplete 
                    ? 'bg-primary/20' 
                    : 'bg-muted'
              }`}>
                {isComplete && index < currentStep ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Current step content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = STEPS[currentStep].icon;
              return <StepIcon className="h-5 w-5" />;
            })()}
            {STEPS[currentStep].title}
          </CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!canProceed}
          >
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleGenerateResearch}
            disabled={isGenerating || !isStepComplete(0) || !isStepComplete(1)}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando investigación...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar Investigación con IA
              </>
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
                <p className="font-medium">Investigando en tiempo real...</p>
                <p className="text-sm text-muted-foreground">
                  Perplexity está analizando el mercado, competencia y generando avatares estratégicos.
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
