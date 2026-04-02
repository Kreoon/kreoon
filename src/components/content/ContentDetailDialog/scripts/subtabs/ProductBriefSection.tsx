import { useState } from 'react';
import { SectionCard } from '../../components/SectionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Target, 
  Users, 
  Brain, 
  Megaphone,
  Sparkles,
  Heart,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BriefData {
  productName?: string;
  category?: string;
  currentObjective?: string;
  slogan?: string;
  mainBenefit?: string;
  transformation?: string;
  differentiator?: string;
  problemSolved?: string;
  mainDesire?: string;
  consequenceOfNotBuying?: string;
  reptileBrain?: string[];
  limbicBrain?: string[];
  cortexBrain?: string;
  targetGender?: string;
  targetAgeRange?: string | string[];
  targetOccupation?: string;
  targetInterests?: string[];
  commonObjections?: string[];
  contentTypes?: string[];
  platforms?: string[];
  brandStrengths?: string;
  expectedResult?: string;
  [key: string]: any;
}

interface ProductBriefSectionProps {
  product: {
    id: string;
    name: string;
    brief_data?: BriefData | null;
    description?: string;
    strategy?: string;
    ideal_avatar?: string;
    sales_angles?: string[];
  } | null;
}

const REPTILE_LABELS: Record<string, string> = {
  survival: '🛡️ Seguridad',
  reproduction: '✨ Verse bien',
  power: '👑 Éxito',
  scarcity: '⏰ Urgencia',
  territory: '🎯 Pertenencia',
  food: '🎁 Placer',
};

const LIMBIC_LABELS: Record<string, string> = {
  happiness: '😊 Felicidad',
  confidence: '💪 Confianza',
  freedom: '🦋 Libertad',
  peace: '🧘 Paz',
  pride: '🏆 Orgullo',
  love: '❤️ Amor',
  excitement: '🎢 Emoción',
  hope: '✨ Esperanza',
  belonging: '🤝 Pertenencia',
  relief: '😌 Alivio',
};

export function ProductBriefSection({ product }: ProductBriefSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!product) {
    return (
      <SectionCard title="Brief del Producto" iconEmoji="📋">
        <div className="flex flex-col items-center justify-center py-6 text-center bg-muted/30 rounded-sm">
          <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground text-sm">No hay producto asociado</p>
          <p className="text-xs text-muted-foreground mt-1">Selecciona un producto para ver su brief</p>
        </div>
      </SectionCard>
    );
  }

  const brief = product.brief_data;
  const hasBrief = brief && Object.keys(brief).length > 0;

  if (!hasBrief) {
    return (
      <SectionCard title="Brief del Producto" iconEmoji="📋">
        <div className="flex flex-col items-center justify-center py-6 text-center bg-muted/30 rounded-sm">
          <AlertCircle className="h-8 w-8 text-warning/50 mb-2" />
          <p className="text-muted-foreground text-sm">Producto sin brief</p>
          <p className="text-xs text-muted-foreground mt-1">
            El cliente aún no ha completado el brief de este producto
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Brief del Producto" iconEmoji="📋">
      <div className="space-y-4">
        {/* Header with product info */}
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-lg">{brief.productName || product.name}</h4>
            {brief.category && (
              <Badge variant="secondary" className="mt-1">{brief.category}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="gap-1"
          >
            {expanded ? (
              <>Menos <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>Ver todo <ChevronDown className="h-4 w-4" /></>
            )}
          </Button>
        </div>

        {/* Quick summary - always visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {brief.slogan && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-sm col-span-full">
              <p className="text-xs text-muted-foreground mb-1">✨ Slogan</p>
              <p className="text-sm font-medium">{brief.slogan}</p>
            </div>
          )}
          
          {brief.currentObjective && (
            <div className="p-3 bg-muted/50 rounded-sm">
              <p className="text-xs text-muted-foreground mb-1">🎯 Objetivo</p>
              <p className="text-sm">{brief.currentObjective}</p>
            </div>
          )}

          {brief.mainBenefit && (
            <div className="p-3 bg-muted/50 rounded-sm">
              <p className="text-xs text-muted-foreground mb-1">⭐ Beneficio principal</p>
              <p className="text-sm">{brief.mainBenefit}</p>
            </div>
          )}
        </div>

        {/* Expanded content */}
        <div className={cn(
          "space-y-4 overflow-hidden transition-all duration-300",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}>
          {/* Transformation & Differentiator */}
          {(brief.transformation || brief.differentiator) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {brief.transformation && (
                <div className="p-3 bg-success/5 border border-success/20 rounded-sm">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Transformación
                  </p>
                  <p className="text-sm">{brief.transformation}</p>
                </div>
              )}
              {brief.differentiator && (
                <div className="p-3 bg-info/5 border border-info/20 rounded-sm">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Diferenciador
                  </p>
                  <p className="text-sm">{brief.differentiator}</p>
                </div>
              )}
            </div>
          )}

          {/* Problem & Desire */}
          {(brief.problemSolved || brief.mainDesire) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Problema y Deseo
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {brief.problemSolved && (
                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-sm">
                    <p className="text-xs text-muted-foreground mb-1">😫 Problema que resuelve</p>
                    <p className="text-sm">{brief.problemSolved}</p>
                  </div>
                )}
                {brief.mainDesire && (
                  <div className="p-3 bg-success/5 border border-success/20 rounded-sm">
                    <p className="text-xs text-muted-foreground mb-1">🌟 Deseo principal</p>
                    <p className="text-sm">{brief.mainDesire}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Neuromarketing */}
          {(brief.reptileBrain?.length || brief.limbicBrain?.length) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Brain className="h-3 w-3" /> Neuromarketing
              </p>
              <div className="flex flex-wrap gap-2">
                {brief.reptileBrain?.map((trigger) => (
                  <Badge key={trigger} variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-300">
                    {REPTILE_LABELS[trigger] || trigger}
                  </Badge>
                ))}
                {brief.limbicBrain?.map((emotion) => (
                  <Badge key={emotion} variant="outline" className="bg-pink-500/10 text-pink-700 border-pink-300">
                    {LIMBIC_LABELS[emotion] || emotion}
                  </Badge>
                ))}
              </div>
              {brief.cortexBrain && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-sm mt-2">
                  <p className="text-xs text-muted-foreground mb-1">🧠 Argumento racional</p>
                  <p className="text-sm">{brief.cortexBrain}</p>
                </div>
              )}
            </div>
          )}

          {/* Target Audience */}
          {(brief.targetGender || brief.targetAgeRange || brief.targetOccupation) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Cliente Ideal
              </p>
              <div className="flex flex-wrap gap-2">
                {brief.targetGender && (
                  <Badge variant="secondary">{brief.targetGender}</Badge>
                )}
                {brief.targetAgeRange && (
                  Array.isArray(brief.targetAgeRange) 
                    ? brief.targetAgeRange.map((age) => (
                        <Badge key={age} variant="secondary">{age}</Badge>
                      ))
                    : <Badge variant="secondary">{brief.targetAgeRange}</Badge>
                )}
                {brief.targetOccupation && (
                  <Badge variant="secondary">{brief.targetOccupation}</Badge>
                )}
              </div>
              {brief.targetInterests?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {brief.targetInterests.map((interest) => (
                    <Badge key={interest} variant="outline" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Objections */}
          {brief.commonObjections?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">🚫 Objeciones a vencer</p>
              <div className="flex flex-wrap gap-1">
                {brief.commonObjections.map((objection) => (
                  <Badge key={objection} variant="outline" className="text-xs bg-warning/10">
                    {objection}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Content Strategy */}
          {(brief.contentTypes?.length || brief.platforms?.length) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Megaphone className="h-3 w-3" /> Estrategia de Contenido
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {brief.contentTypes?.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-sm">
                    <p className="text-xs text-muted-foreground mb-2">Tipos de contenido</p>
                    <div className="flex flex-wrap gap-1">
                      {brief.contentTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {brief.platforms?.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-sm">
                    <p className="text-xs text-muted-foreground mb-2">Plataformas</p>
                    <div className="flex flex-wrap gap-1">
                      {brief.platforms.map((platform) => (
                        <Badge key={platform} variant="secondary" className="text-xs">{platform}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Brand Guidelines */}
          {(brief.brandStrengths || brief.expectedResult) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {brief.brandStrengths && (
                <div className="p-3 bg-muted/50 rounded-sm">
                  <p className="text-xs text-muted-foreground mb-1">💪 Fortalezas de marca</p>
                  <p className="text-sm">{brief.brandStrengths}</p>
                </div>
              )}
              {brief.expectedResult && (
                <div className="p-3 bg-muted/50 rounded-sm">
                  <p className="text-xs text-muted-foreground mb-1">🎯 Resultado esperado</p>
                  <p className="text-sm">{brief.expectedResult}</p>
                </div>
              )}
            </div>
          )}

          {/* Sales Angles from product */}
          {product.sales_angles && product.sales_angles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Ángulos de Venta Disponibles
              </p>
              <div className="space-y-2">
                {product.sales_angles.map((angle, idx) => (
                  <div key={idx} className="p-2 bg-primary/5 border border-primary/20 rounded text-sm">
                    {angle}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
