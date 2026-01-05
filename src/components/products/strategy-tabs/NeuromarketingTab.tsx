import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Heart, Lightbulb, Eye, Target, Megaphone, Users } from 'lucide-react';

interface EsferaPhase {
  marketDominance?: string;
  saturated?: string;
  opportunities?: string[];
  currentPromises?: string;
  unresolvedObjections?: string;
  trustOpportunities?: string[];
  existingProof?: string;
  validationGaps?: string;
  decisionMessages?: string[];
  commonErrors?: string;
  communityOpportunities?: string[];
}

interface EsferaInsights {
  enganchar?: EsferaPhase;
  solucion?: EsferaPhase;
  remarketing?: EsferaPhase;
  fidelizar?: EsferaPhase;
}

interface ContentStrategy {
  esferaInsights?: EsferaInsights;
}

interface NeuromarketingTabProps {
  contentStrategy?: ContentStrategy | null;
}

const PHASE_CONFIG = {
  enganchar: {
    title: '1️⃣ ENGANCHAR',
    subtitle: 'Captar atención y despertar interés',
    color: 'border-red-500/20 bg-red-500/5',
    icon: Zap,
    iconColor: 'text-red-500',
  },
  solucion: {
    title: '2️⃣ SOLUCIÓN',
    subtitle: 'Presentar la solución y construir autoridad',
    color: 'border-blue-500/20 bg-blue-500/5',
    icon: Target,
    iconColor: 'text-blue-500',
  },
  remarketing: {
    title: '3️⃣ REMARKETING',
    subtitle: 'Reforzar y empujar la decisión',
    color: 'border-purple-500/20 bg-purple-500/5',
    icon: Eye,
    iconColor: 'text-purple-500',
  },
  fidelizar: {
    title: '4️⃣ FIDELIZAR',
    subtitle: 'Retener y convertir en embajadores',
    color: 'border-green-500/20 bg-green-500/5',
    icon: Users,
    iconColor: 'text-green-500',
  },
};

export function NeuromarketingTab({ contentStrategy }: NeuromarketingTabProps) {
  const esfera = contentStrategy?.esferaInsights;

  const hasData = esfera && (
    esfera.enganchar?.marketDominance ||
    esfera.solucion?.currentPromises ||
    esfera.remarketing?.existingProof ||
    esfera.fidelizar?.commonErrors
  );

  if (!hasData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver insights del Método Esfera</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" />
          Método ESFERA - Insights por Fase
        </h3>
        <p className="text-sm text-muted-foreground">
          Análisis estratégico de cada fase del embudo según el Método ESFERA de Juan Ads.
        </p>
      </div>

      {/* Phase Cards */}
      {Object.entries(PHASE_CONFIG).map(([key, config]) => {
        const phaseData = esfera?.[key as keyof EsferaInsights];
        if (!phaseData) return null;

        const Icon = config.icon;

        return (
          <Card key={key} className={config.color}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.iconColor}`} />
                {config.title}
              </CardTitle>
              <CardDescription>{config.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Market Dominance / Current State */}
              {(phaseData.marketDominance || phaseData.currentPromises || phaseData.existingProof || phaseData.commonErrors) && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {key === 'enganchar' && '📊 Qué domina el mercado'}
                    {key === 'solucion' && '📊 Promesas actuales'}
                    {key === 'remarketing' && '📊 Prueba social existente'}
                    {key === 'fidelizar' && '⚠️ Errores comunes del mercado'}
                  </p>
                  <p className="text-sm bg-background p-2 rounded">
                    {phaseData.marketDominance || phaseData.currentPromises || phaseData.existingProof || phaseData.commonErrors}
                  </p>
                </div>
              )}

              {/* Saturated / Objections / Gaps */}
              {(phaseData.saturated || phaseData.unresolvedObjections || phaseData.validationGaps) && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {key === 'enganchar' && '🚫 Qué está saturado'}
                    {key === 'solucion' && '❓ Objeciones no resueltas'}
                    {key === 'remarketing' && '🕳️ Vacíos de validación'}
                  </p>
                  <p className="text-sm bg-background p-2 rounded text-amber-600">
                    {phaseData.saturated || phaseData.unresolvedObjections || phaseData.validationGaps}
                  </p>
                </div>
              )}

              {/* Opportunities */}
              {(phaseData.opportunities?.length || phaseData.trustOpportunities?.length || 
                phaseData.decisionMessages?.length || phaseData.communityOpportunities?.length) && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {key === 'enganchar' && '✨ Nuevas oportunidades creativas'}
                    {key === 'solucion' && '🏆 Oportunidades de autoridad'}
                    {key === 'remarketing' && '💬 Mensajes que empujan la decisión'}
                    {key === 'fidelizar' && '🤝 Oportunidades de comunidad/LTV'}
                  </p>
                  <div className="space-y-1">
                    {(phaseData.opportunities || phaseData.trustOpportunities || 
                      phaseData.decisionMessages || phaseData.communityOpportunities)?.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-background rounded border-l-2 border-primary">
                        <span className="text-primary">→</span>
                        <p className="text-sm">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
