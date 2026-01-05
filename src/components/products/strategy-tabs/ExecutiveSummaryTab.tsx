import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Target, Users, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';

interface BriefData {
  productName?: string;
  category?: string;
  customCategory?: string;
  slogan?: string;
  currentObjective?: string;
  mainBenefit?: string;
  transformation?: string;
  differentiator?: string;
  problemSolved?: string;
  targetGender?: string;
  targetAgeRange?: string;
  targetOccupation?: string;
  platforms?: string[];
  contentTypes?: string[];
  expectedResult?: string;
  aiSuggestedAngles?: string[];
  aiSuggestedHooks?: string[];
}

interface ExecutiveSummaryTabProps {
  briefData?: BriefData | null;
  productName?: string;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  ugc: 'UGC',
  testimonial: 'Testimoniales',
  educational: 'Educativo',
  before_after: 'Antes/Después',
  unboxing: 'Unboxing',
  tutorial: 'Tutorial',
  lifestyle: 'Lifestyle',
  talking_head: 'Talking Head',
  story: 'Storytelling',
  meme: 'Memes/Trends',
  comparison: 'Comparación',
  bts: 'Behind the Scenes',
};

export function ExecutiveSummaryTab({ briefData, productName }: ExecutiveSummaryTabProps) {
  if (!briefData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Completa el Brief IA para ver el resumen ejecutivo</p>
      </div>
    );
  }

  const category = briefData.customCategory || briefData.category;
  const contentTypes = briefData.contentTypes || [];
  const suggestedAngles = briefData.aiSuggestedAngles || [];
  const suggestedHooks = briefData.aiSuggestedHooks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">{productName || briefData.productName}</h2>
            {category && <Badge variant="secondary" className="mb-3">{category}</Badge>}
            {briefData.slogan && (
              <p className="text-lg italic text-muted-foreground">"{briefData.slogan}"</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Points Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Objetivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{briefData.currentObjective || 'No definido'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Avatar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {[briefData.targetGender, briefData.targetAgeRange, briefData.targetOccupation]
                .filter(Boolean)
                .join(' • ') || 'No definido'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Value Proposition */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Propuesta de Valor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-20 text-xs text-muted-foreground font-medium">Problema:</div>
            <p className="text-sm flex-1">{briefData.problemSolved || 'No definido'}</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-20 text-xs text-muted-foreground font-medium">Beneficio:</div>
            <p className="text-sm flex-1">{briefData.mainBenefit || 'No definido'}</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-20 text-xs text-muted-foreground font-medium">Diferenciador:</div>
            <p className="text-sm flex-1">{briefData.differentiator || 'No definido'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Content Strategy */}
      {contentTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📹 Tipos de Contenido Recomendados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contentTypes.map((type) => (
                <Badge key={type} variant="outline">
                  {CONTENT_TYPE_LABELS[type] || type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {(suggestedAngles.length > 0 || suggestedHooks.length > 0) && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Sugerencias de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestedAngles.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Ángulos de venta:</p>
                <div className="space-y-1">
                  {suggestedAngles.map((angle, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {angle}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {suggestedHooks.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Hooks sugeridos:</p>
                <div className="space-y-1">
                  {suggestedHooks.map((hook, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-3 w-3 text-primary mt-1 shrink-0" />
                      {hook}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expected Result */}
      {briefData.expectedResult && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-green-600">🎯 Resultado Esperado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{briefData.expectedResult}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
