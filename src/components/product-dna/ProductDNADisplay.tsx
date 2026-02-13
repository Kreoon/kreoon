// ============================================
// ProductDNADisplay - Componente Principal
// Adaptado al schema real de product_dna table
// ============================================

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Target,
  Users,
  Palette,
  DollarSign,
  Lightbulb,
  Download,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  ExternalLink,
  Play,
  Pause,
  History,
  BarChart3,
  Hash,
  Megaphone,
  Eye,
  Layers,
  Swords,
  Globe,
  Pencil,
  Save,
  Plus,
  X,
} from 'lucide-react';

// ============================================
// TYPES - Based on actual DB schema
// ============================================

/** Shape of product_dna row as returned by Supabase */
export interface ProductDNARecord {
  id: string;
  client_id: string;
  service_group: string;
  service_types: string[];
  audio_url: string | null;
  audio_duration_seconds: number | null;
  transcription: string | null;
  reference_links: Array<{ url: string; type?: string; notes?: string }>;
  competitor_links: Array<{ url: string; type?: string; notes?: string }>;
  inspiration_links: Array<{ url: string; type?: string; notes?: string }>;
  wizard_responses: Record<string, any>;
  market_research: MarketResearchData | null;
  competitor_analysis: CompetitorAnalysisData | null;
  strategy_recommendations: StrategyRecommendationsData | null;
  content_brief: ContentBriefData | null;
  ai_confidence_score: number | null;
  estimated_complexity: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface MarketResearchData {
  market_overview?: string;
  market_size?: string;
  growth_trends?: string[];
  opportunities?: string[];
  threats?: string[];
  target_segments?: Array<{
    name: string;
    description: string;
    size_estimate?: string;
    priority?: string;
  }>;
  ideal_customer_profile?: {
    demographics?: string;
    psychographics?: string;
    pain_points?: string[];
    desires?: string[];
    objections?: string[];
    buying_triggers?: string[];
  };
}

interface CompetitorAnalysisData {
  direct_competitors?: Array<{
    name: string;
    strengths?: string[];
    weaknesses?: string[];
    positioning?: string;
    price_range?: string;
  }>;
  indirect_competitors?: string[];
  competitive_advantage?: string;
  positioning_strategy?: string;
  differentiation_points?: string[];
}

interface StrategyRecommendationsData {
  value_proposition?: string;
  brand_positioning?: string;
  pricing_strategy?: string;
  sales_angles?: Array<{
    angle_name: string;
    headline?: string;
    hook?: string;
    target_emotion?: string;
  }>;
  funnel_strategy?: {
    awareness?: string;
    consideration?: string;
    conversion?: string;
    retention?: string;
  };
  content_pillars?: string[];
  platforms?: Array<{
    name: string;
    strategy?: string;
    content_types?: string[];
    priority?: string;
  }>;
  hashtags?: string[];
  ads_targeting?: {
    interests?: string[];
    behaviors?: string[];
    keywords?: string[];
    lookalike_sources?: string[];
  };
}

interface ContentBriefData {
  brand_voice?: {
    tone?: string[];
    personality?: string;
    do_say?: string[];
    dont_say?: string[];
  };
  key_messages?: string[];
  tagline_suggestions?: string[];
  content_ideas?: Array<{
    title: string;
    format?: string;
    objective?: string;
    brief_description?: string;
  }>;
  visual_direction?: {
    color_palette?: string[];
    style?: string;
    mood?: string;
  };
}

// ============================================
// PROPS
// ============================================

interface ProductDNADisplayProps {
  productDna: ProductDNARecord;
  onRegenerate?: () => void;
  onFeedback?: () => void;
  onExportPDF?: () => void;
  onViewVersions?: () => void;
  isRegenerating?: boolean;
  /** Enable inline editing */
  editable?: boolean;
  /** Called when a section is saved: (sectionKey, updatedData) => success */
  onSaveSection?: (section: string, data: any) => Promise<boolean>;
}

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  accentColor?: string;
  badge?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProductDNADisplay({
  productDna,
  onRegenerate,
  onFeedback,
  onExportPDF,
  onViewVersions,
  isRegenerating = false,
  editable = false,
  onSaveSection,
}: ProductDNADisplayProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const mr = productDna.market_research;
  const ca = productDna.competitor_analysis;
  const sr = productDna.strategy_recommendations;
  const cb = productDna.content_brief;

  const hasAnalysis = !!(mr || ca || sr || cb);

  if (!hasAnalysis) {
    return <EmptyAnalysisState status={productDna.status} />;
  }

  const handleCopy = async (text: string, sectionId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlayingAudio(!isPlayingAudio);
    }
  };

  const handleSaveSection = async (section: string, data: any) => {
    if (!onSaveSection) return;
    setSavingSection(section);
    try {
      await onSaveSection(section, data);
    } finally {
      setSavingSection(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <HeaderSection
        productDna={productDna}
        onRegenerate={onRegenerate}
        onFeedback={onFeedback}
        onExportPDF={onExportPDF}
        onViewVersions={onViewVersions}
        isRegenerating={isRegenerating}
        editable={editable}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
      />

      {/* Audio */}
      {productDna.audio_url && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAudio}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlayingAudio ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Audio del Cliente</p>
              <p className="text-xs text-gray-400">
                {productDna.audio_duration_seconds
                  ? `${Math.floor(productDna.audio_duration_seconds / 60)}:${(productDna.audio_duration_seconds % 60).toString().padStart(2, '0')}`
                  : 'Duración desconocida'
                }
              </p>
            </div>
            {productDna.transcription && (
              <button
                onClick={() => handleCopy(productDna.transcription!, 'transcript')}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                title="Copiar transcripción"
              >
                {copiedSection === 'transcript' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
          {productDna.transcription && (
            <div className="mt-3 p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-gray-400 uppercase font-medium mb-1">Transcripción</p>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {productDna.transcription}
              </p>
            </div>
          )}
          <audio
            ref={audioRef}
            src={productDna.audio_url}
            onEnded={() => setIsPlayingAudio(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Value Proposition & Positioning */}
      {sr && (sr.value_proposition || sr.brand_positioning) && (
        <EditableStrategySection
          data={sr}
          isEditing={isEditing}
          saving={savingSection === 'strategy_recommendations'}
          onSave={(updated) => handleSaveSection('strategy_recommendations', updated)}
          onCopy={handleCopy}
          copiedSection={copiedSection}
        />
      )}

      {/* Market Research */}
      {mr && (
        <EditableMarketSection
          data={mr}
          isEditing={isEditing}
          saving={savingSection === 'market_research'}
          onSave={(updated) => handleSaveSection('market_research', updated)}
        />
      )}

      {/* Competitor Analysis */}
      {ca && (
        <EditableCompetitorSection
          data={ca}
          isEditing={isEditing}
          saving={savingSection === 'competitor_analysis'}
          onSave={(updated) => handleSaveSection('competitor_analysis', updated)}
        />
      )}

      {/* Target Audience */}
      {mr?.ideal_customer_profile && (
        <SectionCard
          title="Audiencia Objetivo"
          icon={<Users className="w-5 h-5" />}
          accentColor="from-purple-500 to-pink-500"
        >
          <TargetAudienceSection data={mr.ideal_customer_profile} />
        </SectionCard>
      )}

      {/* Sales Angles */}
      {sr?.sales_angles && sr.sales_angles.length > 0 && (
        <SectionCard
          title="Ángulos de Venta"
          icon={<Megaphone className="w-5 h-5" />}
          accentColor="from-yellow-500 to-orange-500"
          badge={`${sr.sales_angles.length} ángulos`}
        >
          <SalesAnglesSection
            data={sr.sales_angles}
            onCopy={handleCopy}
            copiedSection={copiedSection}
          />
        </SectionCard>
      )}

      {/* Content Brief */}
      {cb && (
        <EditableContentBriefSection
          data={cb}
          isEditing={isEditing}
          saving={savingSection === 'content_brief'}
          onSave={(updated) => handleSaveSection('content_brief', updated)}
          onCopy={handleCopy}
          copiedSection={copiedSection}
        />
      )}

      {/* Funnel Strategy */}
      {sr?.funnel_strategy && (
        <SectionCard
          title="Estrategia de Funnel"
          icon={<Layers className="w-5 h-5" />}
          accentColor="from-indigo-500 to-purple-500"
        >
          <FunnelStrategySection data={sr.funnel_strategy} />
        </SectionCard>
      )}

      {/* Platforms & Ads */}
      <div className="grid md:grid-cols-2 gap-6">
        {sr?.platforms && sr.platforms.length > 0 && (
          <SectionCard
            title="Plataformas"
            icon={<Globe className="w-5 h-5" />}
            accentColor="from-cyan-500 to-blue-500"
          >
            <PlatformsSection data={sr.platforms} hashtags={sr.hashtags} />
          </SectionCard>
        )}

        {sr?.ads_targeting && (
          <SectionCard
            title="Segmentación Ads"
            icon={<Target className="w-5 h-5" />}
            accentColor="from-emerald-500 to-teal-500"
          >
            <AdsTargetingSection data={sr.ads_targeting} />
          </SectionCard>
        )}
      </div>

      {/* References */}
      {(productDna.reference_links?.length > 0 ||
        productDna.competitor_links?.length > 0 ||
        productDna.inspiration_links?.length > 0) && (
        <SectionCard
          title="Referencias del Cliente"
          icon={<ExternalLink className="w-5 h-5" />}
          accentColor="from-gray-500 to-slate-500"
        >
          <ReferencesSection
            referenceLinks={productDna.reference_links}
            competitorLinks={productDna.competitor_links}
            inspirationLinks={productDna.inspiration_links}
          />
        </SectionCard>
      )}
    </div>
  );
}

// ============================================
// HEADER SECTION
// ============================================

const SERVICE_GROUP_LABELS: Record<string, string> = {
  content_creation: 'Creación de Contenido',
  post_production: 'Post-Producción',
  strategy_marketing: 'Estrategia & Marketing',
  technology: 'Tecnología & Desarrollo',
  education_training: 'Educación & Formación',
  general_services: 'Servicios Generales'
};

function HeaderSection({
  productDna,
  onRegenerate,
  onFeedback,
  onExportPDF,
  onViewVersions,
  isRegenerating,
  editable,
  isEditing,
  onToggleEdit,
}: {
  productDna: ProductDNARecord;
  onRegenerate?: () => void;
  onFeedback?: () => void;
  onExportPDF?: () => void;
  onViewVersions?: () => void;
  isRegenerating?: boolean;
  editable?: boolean;
  isEditing?: boolean;
  onToggleEdit?: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Info */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">ADN de Producto</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {SERVICE_GROUP_LABELS[productDna.service_group] || productDna.service_group}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {productDna.service_types?.map((s) => (
                <span key={s} className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">
                v{productDna.version || 1}
              </span>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-4">
          {productDna.ai_confidence_score != null && (
            <ScoreBadge
              label="Confianza"
              value={productDna.ai_confidence_score}
              icon={<Shield className="w-4 h-4" />}
            />
          )}
          {productDna.estimated_complexity && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-gray-400 text-xs mt-1 capitalize">{productDna.estimated_complexity}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {editable && onToggleEdit && (
            <ActionButton
              onClick={onToggleEdit}
              icon={<Pencil className={`w-4 h-4 ${isEditing ? 'text-yellow-400' : ''}`} />}
              label={isEditing ? 'Editando' : 'Editar'}
              variant={isEditing ? 'secondary' : 'ghost'}
            />
          )}
          {onViewVersions && (
            <ActionButton onClick={onViewVersions} icon={<History className="w-4 h-4" />} label="Versiones" variant="ghost" />
          )}
          {onFeedback && (
            <ActionButton onClick={onFeedback} icon={<MessageSquare className="w-4 h-4" />} label="Feedback" variant="ghost" />
          )}
          {onExportPDF && (
            <ActionButton onClick={onExportPDF} icon={<Download className="w-4 h-4" />} label="PDF" variant="secondary" />
          )}
          {onRegenerate && (
            <ActionButton
              onClick={onRegenerate}
              icon={<RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />}
              label="Regenerar"
              variant="primary"
              disabled={isRegenerating}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION CARD
// ============================================

function SectionCard({
  title,
  icon,
  children,
  defaultExpanded = false,
  accentColor = 'from-purple-500 to-pink-500',
  badge
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center`}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {badge && (
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{badge}</span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 pt-0 border-t border-white/5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// MARKET RESEARCH SECTION
// ============================================

function MarketResearchSection({ data }: { data: MarketResearchData }) {
  return (
    <div className="space-y-6">
      {/* Overview */}
      {data.market_overview && (
        <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
          <p className="text-gray-300 leading-relaxed">{data.market_overview}</p>
        </div>
      )}

      {/* Market Size */}
      {data.market_size && (
        <div className="p-4 bg-white/5 rounded-lg">
          <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2">
            Tamaño del Mercado
          </h4>
          <p className="text-gray-300">{data.market_size}</p>
        </div>
      )}

      {/* Trends */}
      {data.growth_trends && data.growth_trends.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Tendencias de Crecimiento
          </h4>
          <div className="grid gap-2">
            {data.growth_trends.map((trend, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{trend}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities & Threats */}
      <div className="grid md:grid-cols-2 gap-4">
        {data.opportunities && data.opportunities.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3">Oportunidades</h4>
            <div className="space-y-2">
              {data.opportunities.map((opp, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-green-500/10 rounded-lg">
                  <Zap className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{opp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.threats && data.threats.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">Amenazas</h4>
            <div className="space-y-2">
              {data.threats.map((threat, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{threat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Target Segments */}
      {data.target_segments && data.target_segments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Segmentos Objetivo</h4>
          <div className="grid gap-3">
            {data.target_segments.map((seg, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-medium text-white">{seg.name}</h5>
                  {seg.priority && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      seg.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      seg.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {seg.priority}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm">{seg.description}</p>
                {seg.size_estimate && (
                  <p className="text-gray-500 text-xs mt-1">Tamaño: {seg.size_estimate}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPETITOR ANALYSIS SECTION
// ============================================

function CompetitorSection({ data }: { data: CompetitorAnalysisData }) {
  return (
    <div className="space-y-6">
      {data.competitive_advantage && (
        <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
          <p className="text-xs text-orange-400 uppercase font-semibold mb-1">Ventaja Competitiva</p>
          <p className="text-gray-300 font-medium">{data.competitive_advantage}</p>
        </div>
      )}

      {data.direct_competitors && data.direct_competitors.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Competidores Directos</h4>
          <div className="grid gap-3">
            {data.direct_competitors.map((comp, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-white">{comp.name}</h5>
                  {comp.price_range && (
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{comp.price_range}</span>
                  )}
                </div>
                {comp.positioning && (
                  <p className="text-sm text-gray-400 mb-3 italic">{comp.positioning}</p>
                )}
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {comp.strengths && comp.strengths.length > 0 && (
                    <div>
                      <p className="text-green-400 text-xs uppercase mb-1">Fortalezas</p>
                      <ul className="space-y-1">
                        {comp.strengths.map((s, j) => (
                          <li key={j} className="text-gray-400 flex items-start gap-2">
                            <span className="text-green-400">+</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {comp.weaknesses && comp.weaknesses.length > 0 && (
                    <div>
                      <p className="text-red-400 text-xs uppercase mb-1">Debilidades</p>
                      <ul className="space-y-1">
                        {comp.weaknesses.map((w, j) => (
                          <li key={j} className="text-gray-400 flex items-start gap-2">
                            <span className="text-red-400">-</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.positioning_strategy && (
        <div className="p-4 bg-white/5 rounded-lg">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Estrategia de Posicionamiento</p>
          <p className="text-gray-300">{data.positioning_strategy}</p>
        </div>
      )}

      {data.differentiation_points && data.differentiation_points.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Puntos de Diferenciación</h4>
          <div className="flex flex-wrap gap-2">
            {data.differentiation_points.map((point, i) => (
              <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full text-orange-300 text-sm border border-orange-500/30">
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.indirect_competitors && data.indirect_competitors.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Competidores Indirectos</h4>
          <div className="flex flex-wrap gap-2">
            {data.indirect_competitors.map((c, i) => (
              <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// TARGET AUDIENCE SECTION
// ============================================

function TargetAudienceSection({ data }: { data: NonNullable<MarketResearchData['ideal_customer_profile']> }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {data.demographics && (
          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
            <p className="text-xs text-purple-400 uppercase font-semibold mb-2">Demográfico</p>
            <p className="text-gray-300">{data.demographics}</p>
          </div>
        )}
        {data.psychographics && (
          <div className="p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-lg border border-pink-500/20">
            <p className="text-xs text-pink-400 uppercase font-semibold mb-2">Psicográfico</p>
            <p className="text-gray-300">{data.psychographics}</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {data.pain_points && data.pain_points.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">Puntos de Dolor</h4>
            <div className="space-y-2">
              {data.pain_points.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-red-400">•</span> {p}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.desires && data.desires.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3">Deseos</h4>
            <div className="space-y-2">
              {data.desires.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-400">•</span> {d}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.objections && data.objections.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-3">Objeciones</h4>
            <div className="space-y-2">
              {data.objections.map((o, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-yellow-400">•</span> {o}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.buying_triggers && data.buying_triggers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">Disparadores de Compra</h4>
            <div className="space-y-2">
              {data.buying_triggers.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-blue-400">•</span> {t}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SALES ANGLES SECTION
// ============================================

function SalesAnglesSection({
  data,
  onCopy,
  copiedSection
}: {
  data: NonNullable<StrategyRecommendationsData['sales_angles']>;
  onCopy: (text: string, id: string) => void;
  copiedSection: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400">{data.length} ángulos generados</p>
        <button
          onClick={() => onCopy(
            data.map(a => `${a.angle_name}\n${a.headline || ''}\nHook: ${a.hook || ''}\nEmoción: ${a.target_emotion || ''}`).join('\n\n'),
            'all-angles'
          )}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
        >
          {copiedSection === 'all-angles' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          Copiar todos
        </button>
      </div>
      {data.map((angle, i) => (
        <div key={i} className="p-4 bg-white/5 rounded-lg border-l-2 border-yellow-500">
          <div className="flex items-start justify-between">
            <h5 className="font-medium text-white">{angle.angle_name}</h5>
            {angle.target_emotion && (
              <span className="text-xs bg-yellow-500/20 px-2 py-0.5 rounded-full text-yellow-300">
                {angle.target_emotion}
              </span>
            )}
          </div>
          {angle.headline && (
            <p className="text-gray-300 mt-1 font-medium">{angle.headline}</p>
          )}
          {angle.hook && (
            <p className="text-gray-400 text-sm mt-2 italic">Hook: "{angle.hook}"</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// CONTENT BRIEF SECTION
// ============================================

function ContentBriefSection({
  data,
  onCopy,
  copiedSection
}: {
  data: ContentBriefData;
  onCopy: (text: string, id: string) => void;
  copiedSection: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Brand Voice */}
      {data.brand_voice && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Voz de Marca</h4>
          {data.brand_voice.personality && (
            <p className="text-gray-300">{data.brand_voice.personality}</p>
          )}
          {data.brand_voice.tone && data.brand_voice.tone.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.brand_voice.tone.map((t, i) => (
                <span key={i} className="px-3 py-1 bg-pink-500/20 rounded-full text-pink-300 text-sm">{t}</span>
              ))}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {data.brand_voice.do_say && data.brand_voice.do_say.length > 0 && (
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-xs text-green-400 uppercase font-semibold mb-2">Sí decir</p>
                <ul className="space-y-1">
                  {data.brand_voice.do_say.map((s, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-1">
                      <span className="text-green-400">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.brand_voice.dont_say && data.brand_voice.dont_say.length > 0 && (
              <div className="p-3 bg-red-500/10 rounded-lg">
                <p className="text-xs text-red-400 uppercase font-semibold mb-2">No decir</p>
                <ul className="space-y-1">
                  {data.brand_voice.dont_say.map((s, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-1">
                      <span className="text-red-400">✗</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Messages */}
      {data.key_messages && data.key_messages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Mensajes Clave</h4>
            <button
              onClick={() => onCopy(data.key_messages!.join('\n'), 'messages')}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              {copiedSection === 'messages' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copiar
            </button>
          </div>
          <div className="grid gap-2">
            {data.key_messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-xs flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-300">{msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Taglines */}
      {data.tagline_suggestions && data.tagline_suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Taglines Sugeridos</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {data.tagline_suggestions.map((t, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-lg border-l-2 border-purple-500">
                <p className="text-gray-300 text-sm italic">"{t}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Ideas */}
      {data.content_ideas && data.content_ideas.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Ideas de Contenido</h4>
          <div className="grid gap-3">
            {data.content_ideas.map((idea, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-start justify-between">
                  <h5 className="font-medium text-white">{idea.title}</h5>
                  <div className="flex gap-2">
                    {idea.format && (
                      <span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded-full text-purple-300">{idea.format}</span>
                    )}
                    {idea.objective && (
                      <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-300">{idea.objective}</span>
                    )}
                  </div>
                </div>
                {idea.brief_description && (
                  <p className="text-gray-400 text-sm mt-2">{idea.brief_description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Direction */}
      {data.visual_direction && (
        <div className="p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-lg border border-pink-500/20">
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3">Dirección Visual</h4>
          {data.visual_direction.style && (
            <p className="text-gray-300 mb-2">{data.visual_direction.style}</p>
          )}
          {data.visual_direction.mood && (
            <p className="text-gray-400 text-sm italic mb-3">Mood: {data.visual_direction.mood}</p>
          )}
          {data.visual_direction.color_palette && data.visual_direction.color_palette.length > 0 && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400 uppercase">Paleta:</p>
              {data.visual_direction.color_palette.map((color, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-400">{color}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// FUNNEL STRATEGY SECTION
// ============================================

function FunnelStrategySection({ data }: { data: NonNullable<StrategyRecommendationsData['funnel_strategy']> }) {
  const stages = [
    { key: 'awareness' as const, label: 'Awareness', color: 'from-blue-500 to-cyan-500', icon: <Eye className="w-4 h-4" /> },
    { key: 'consideration' as const, label: 'Consideración', color: 'from-purple-500 to-pink-500', icon: <Target className="w-4 h-4" /> },
    { key: 'conversion' as const, label: 'Conversión', color: 'from-green-500 to-emerald-500', icon: <Zap className="w-4 h-4" /> },
    { key: 'retention' as const, label: 'Retención', color: 'from-orange-500 to-red-500', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const value = data[stage.key];
        if (!value) return null;
        return (
          <div key={stage.key} className="relative pl-6 pb-2 border-l-2 border-white/10 last:pb-0">
            <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full bg-gradient-to-br ${stage.color} flex items-center justify-center`}>
              <span className="text-white">{stage.icon}</span>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <h5 className="font-medium text-white text-sm mb-1">{stage.label}</h5>
              <p className="text-gray-400 text-sm">{value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// PLATFORMS SECTION
// ============================================

function PlatformsSection({ data, hashtags }: { data: NonNullable<StrategyRecommendationsData['platforms']>; hashtags?: string[] }) {
  return (
    <div className="space-y-4">
      {data.map((platform, i) => (
        <div key={i} className="p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <h5 className="font-medium text-white text-sm">{platform.name}</h5>
            {platform.priority && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                platform.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                platform.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {platform.priority}
              </span>
            )}
          </div>
          {platform.strategy && <p className="text-gray-400 text-sm">{platform.strategy}</p>}
          {platform.content_types && platform.content_types.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {platform.content_types.map((ct, j) => (
                <span key={j} className="text-xs bg-cyan-500/20 px-2 py-0.5 rounded-full text-cyan-300">{ct}</span>
              ))}
            </div>
          )}
        </div>
      ))}

      {hashtags && hashtags.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2 flex items-center gap-1">
            <Hash className="w-3 h-3" /> Hashtags
          </p>
          <div className="flex flex-wrap gap-1">
            {hashtags.map((h, i) => (
              <span key={i} className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-300">{h}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ADS TARGETING SECTION
// ============================================

function AdsTargetingSection({ data }: { data: NonNullable<StrategyRecommendationsData['ads_targeting']> }) {
  const sections = [
    { key: 'interests' as const, label: 'Intereses', color: 'text-purple-300 bg-purple-500/20' },
    { key: 'behaviors' as const, label: 'Comportamientos', color: 'text-blue-300 bg-blue-500/20' },
    { key: 'keywords' as const, label: 'Keywords', color: 'text-green-300 bg-green-500/20' },
    { key: 'lookalike_sources' as const, label: 'Lookalike', color: 'text-orange-300 bg-orange-500/20' },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const items = data[section.key];
        if (!items || items.length === 0) return null;
        return (
          <div key={section.key}>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">{section.label}</p>
            <div className="flex flex-wrap gap-1">
              {items.map((item, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${section.color}`}>{item}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// REFERENCES SECTION
// ============================================

function ReferencesSection({
  referenceLinks,
  competitorLinks,
  inspirationLinks
}: {
  referenceLinks: Array<{ url: string }>;
  competitorLinks: Array<{ url: string }>;
  inspirationLinks: Array<{ url: string }>;
}) {
  const renderLinks = (links: Array<{ url: string }>, color: string) => (
    <div className="flex flex-wrap gap-2">
      {links.map((link, i) => {
        let hostname = link.url;
        try { hostname = new URL(link.url).hostname; } catch { /* keep raw */ }
        return (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 px-3 py-1 ${color} rounded-full text-sm hover:opacity-80 transition-opacity`}
          >
            <ExternalLink className="w-3 h-3" />
            {hostname}
          </a>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {referenceLinks?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Producto/Negocio</h4>
          {renderLinks(referenceLinks, 'bg-blue-500/20 text-blue-300')}
        </div>
      )}
      {competitorLinks?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Competencia</h4>
          {renderLinks(competitorLinks, 'bg-red-500/20 text-red-300')}
        </div>
      )}
      {inspirationLinks?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Inspiración</h4>
          {renderLinks(inspirationLinks, 'bg-purple-500/20 text-purple-300')}
        </div>
      )}
    </div>
  );
}

// ============================================
// EDITABLE SECTION WRAPPERS
// ============================================

/** Inline-editable textarea for text fields */
function InlineTextarea({
  value,
  onChange,
  isEditing,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  isEditing: boolean;
  placeholder?: string;
  className?: string;
}) {
  if (!isEditing) return <p className={`text-gray-300 leading-relaxed ${className}`}>{value}</p>;
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white/10 border border-white/20 rounded-lg p-3 text-gray-200 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y min-h-[80px] ${className}`}
    />
  );
}

/** Editable chip/tag list */
function InlineChipList({
  items,
  onChange,
  isEditing,
  color = 'bg-white/10 text-gray-300',
}: {
  items: string[];
  onChange: (v: string[]) => void;
  isEditing: boolean;
  color?: string;
}) {
  const [newItem, setNewItem] = useState('');

  if (!isEditing) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className={`px-3 py-1 rounded-full text-sm ${color}`}>{item}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className={`px-3 py-1 rounded-full text-sm ${color} flex items-center gap-1`}>
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="ml-1 hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.trim()) {
              e.preventDefault();
              onChange([...items, newItem.trim()]);
              setNewItem('');
            }
          }}
          placeholder="Agregar..."
          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
        <button
          onClick={() => {
            if (newItem.trim()) {
              onChange([...items, newItem.trim()]);
              setNewItem('');
            }
          }}
          className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <Plus className="w-4 h-4 text-gray-300" />
        </button>
      </div>
    </div>
  );
}

/** Save button for editable sections */
function SectionSaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
    >
      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      {saving ? 'Guardando...' : 'Guardar'}
    </button>
  );
}

/** Editable: Strategy/Value Proposition section */
function EditableStrategySection({
  data,
  isEditing,
  saving,
  onSave,
  onCopy,
  copiedSection,
}: {
  data: StrategyRecommendationsData;
  isEditing: boolean;
  saving: boolean;
  onSave: (d: StrategyRecommendationsData) => void;
  onCopy: (text: string, id: string) => void;
  copiedSection: string | null;
}) {
  const [local, setLocal] = useState(data);
  // Sync when not editing
  React.useEffect(() => { if (!isEditing) setLocal(data); }, [data, isEditing]);

  return (
    <SectionCard
      title="Propuesta de Valor"
      icon={<Sparkles className="w-5 h-5" />}
      defaultExpanded={true}
      accentColor="from-blue-500 to-cyan-500"
    >
      <div className="space-y-4">
        {(local.value_proposition || isEditing) && (
          <div className="relative">
            <InlineTextarea
              value={local.value_proposition || ''}
              onChange={(v) => setLocal({ ...local, value_proposition: v })}
              isEditing={isEditing}
              placeholder="Propuesta de valor..."
              className="text-lg"
            />
            {!isEditing && local.value_proposition && (
              <CopyButton
                onClick={() => onCopy(local.value_proposition!, 'vp')}
                copied={copiedSection === 'vp'}
              />
            )}
          </div>
        )}
        {(local.brand_positioning || isEditing) && (
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
            <p className="text-xs text-blue-400 uppercase font-semibold mb-1">Posicionamiento de Marca</p>
            <InlineTextarea
              value={local.brand_positioning || ''}
              onChange={(v) => setLocal({ ...local, brand_positioning: v })}
              isEditing={isEditing}
              placeholder="Posicionamiento..."
            />
          </div>
        )}
        {(local.pricing_strategy || isEditing) && (
          <div className="p-4 bg-white/5 rounded-lg">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Estrategia de Precio
            </p>
            <InlineTextarea
              value={local.pricing_strategy || ''}
              onChange={(v) => setLocal({ ...local, pricing_strategy: v })}
              isEditing={isEditing}
              placeholder="Estrategia de precio..."
            />
          </div>
        )}
        {isEditing && (
          <div className="flex justify-end pt-2">
            <SectionSaveButton onClick={() => onSave(local)} saving={saving} />
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/** Editable: Market Research section */
function EditableMarketSection({
  data,
  isEditing,
  saving,
  onSave,
}: {
  data: MarketResearchData;
  isEditing: boolean;
  saving: boolean;
  onSave: (d: MarketResearchData) => void;
}) {
  const [local, setLocal] = useState(data);
  React.useEffect(() => { if (!isEditing) setLocal(data); }, [data, isEditing]);

  return (
    <SectionCard
      title="Investigación de Mercado"
      icon={<TrendingUp className="w-5 h-5" />}
      accentColor="from-green-500 to-emerald-500"
      badge={local.growth_trends?.length ? `${local.growth_trends.length} tendencias` : undefined}
    >
      {isEditing ? (
        <div className="space-y-6">
          <div>
            <p className="text-xs text-green-400 uppercase font-semibold mb-2">Visión del Mercado</p>
            <InlineTextarea
              value={local.market_overview || ''}
              onChange={(v) => setLocal({ ...local, market_overview: v })}
              isEditing={true}
              placeholder="Descripción del mercado..."
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Demográfico (Cliente Ideal)</p>
            <InlineTextarea
              value={local.ideal_customer_profile?.demographics || ''}
              onChange={(v) => setLocal({
                ...local,
                ideal_customer_profile: { ...local.ideal_customer_profile, demographics: v },
              })}
              isEditing={true}
              placeholder="Datos demográficos..."
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Psicográfico (Cliente Ideal)</p>
            <InlineTextarea
              value={local.ideal_customer_profile?.psychographics || ''}
              onChange={(v) => setLocal({
                ...local,
                ideal_customer_profile: { ...local.ideal_customer_profile, psychographics: v },
              })}
              isEditing={true}
              placeholder="Datos psicográficos..."
            />
          </div>
          <div>
            <p className="text-xs text-red-400 uppercase font-semibold mb-2">Puntos de Dolor</p>
            <InlineChipList
              items={local.ideal_customer_profile?.pain_points || []}
              onChange={(v) => setLocal({
                ...local,
                ideal_customer_profile: { ...local.ideal_customer_profile, pain_points: v },
              })}
              isEditing={true}
              color="bg-red-500/20 text-red-300"
            />
          </div>
          <div>
            <p className="text-xs text-green-400 uppercase font-semibold mb-2">Deseos</p>
            <InlineChipList
              items={local.ideal_customer_profile?.desires || []}
              onChange={(v) => setLocal({
                ...local,
                ideal_customer_profile: { ...local.ideal_customer_profile, desires: v },
              })}
              isEditing={true}
              color="bg-green-500/20 text-green-300"
            />
          </div>
          <div className="flex justify-end pt-2">
            <SectionSaveButton onClick={() => onSave(local)} saving={saving} />
          </div>
        </div>
      ) : (
        <MarketResearchSection data={local} />
      )}
    </SectionCard>
  );
}

/** Editable: Competitor Analysis section */
function EditableCompetitorSection({
  data,
  isEditing,
  saving,
  onSave,
}: {
  data: CompetitorAnalysisData;
  isEditing: boolean;
  saving: boolean;
  onSave: (d: CompetitorAnalysisData) => void;
}) {
  const [local, setLocal] = useState(data);
  React.useEffect(() => { if (!isEditing) setLocal(data); }, [data, isEditing]);

  return (
    <SectionCard
      title="Análisis Competitivo"
      icon={<Swords className="w-5 h-5" />}
      accentColor="from-orange-500 to-red-500"
      badge={local.direct_competitors?.length ? `${local.direct_competitors.length} competidores` : undefined}
    >
      {isEditing ? (
        <div className="space-y-6">
          <div>
            <p className="text-xs text-orange-400 uppercase font-semibold mb-2">Ventaja Competitiva</p>
            <InlineTextarea
              value={local.competitive_advantage || ''}
              onChange={(v) => setLocal({ ...local, competitive_advantage: v })}
              isEditing={true}
              placeholder="Ventaja competitiva principal..."
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Estrategia de Posicionamiento</p>
            <InlineTextarea
              value={local.positioning_strategy || ''}
              onChange={(v) => setLocal({ ...local, positioning_strategy: v })}
              isEditing={true}
              placeholder="Estrategia de posicionamiento..."
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Puntos de Diferenciación</p>
            <InlineChipList
              items={local.differentiation_points || []}
              onChange={(v) => setLocal({ ...local, differentiation_points: v })}
              isEditing={true}
              color="bg-orange-500/20 text-orange-300"
            />
          </div>
          <div className="flex justify-end pt-2">
            <SectionSaveButton onClick={() => onSave(local)} saving={saving} />
          </div>
        </div>
      ) : (
        <CompetitorSection data={local} />
      )}
    </SectionCard>
  );
}

/** Editable: Content Brief section */
function EditableContentBriefSection({
  data,
  isEditing,
  saving,
  onSave,
  onCopy,
  copiedSection,
}: {
  data: ContentBriefData;
  isEditing: boolean;
  saving: boolean;
  onSave: (d: ContentBriefData) => void;
  onCopy: (text: string, id: string) => void;
  copiedSection: string | null;
}) {
  const [local, setLocal] = useState(data);
  React.useEffect(() => { if (!isEditing) setLocal(data); }, [data, isEditing]);

  return (
    <SectionCard
      title="Brief Creativo"
      icon={<Palette className="w-5 h-5" />}
      accentColor="from-pink-500 to-rose-500"
      badge="Contenido"
    >
      {isEditing ? (
        <div className="space-y-6">
          <div>
            <p className="text-xs text-pink-400 uppercase font-semibold mb-2">Personalidad de Marca</p>
            <InlineTextarea
              value={local.brand_voice?.personality || ''}
              onChange={(v) => setLocal({
                ...local,
                brand_voice: { ...local.brand_voice, personality: v },
              })}
              isEditing={true}
              placeholder="Personalidad de la voz de marca..."
            />
          </div>
          <div>
            <p className="text-xs text-pink-400 uppercase font-semibold mb-2">Tono de Voz</p>
            <InlineChipList
              items={local.brand_voice?.tone || []}
              onChange={(v) => setLocal({
                ...local,
                brand_voice: { ...local.brand_voice, tone: v },
              })}
              isEditing={true}
              color="bg-pink-500/20 text-pink-300"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Mensajes Clave</p>
            <InlineChipList
              items={local.key_messages || []}
              onChange={(v) => setLocal({ ...local, key_messages: v })}
              isEditing={true}
              color="bg-white/10 text-gray-300"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Taglines Sugeridos</p>
            <InlineChipList
              items={local.tagline_suggestions || []}
              onChange={(v) => setLocal({ ...local, tagline_suggestions: v })}
              isEditing={true}
              color="bg-purple-500/20 text-purple-300"
            />
          </div>
          <div className="flex justify-end pt-2">
            <SectionSaveButton onClick={() => onSave(local)} saving={saving} />
          </div>
        </div>
      ) : (
        <ContentBriefSection data={local} onCopy={onCopy} copiedSection={copiedSection} />
      )}
    </SectionCard>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function ScoreBadge({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  return (
    <div className="text-center">
      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getColor(value)} flex items-center justify-center`}>
        <span className="text-white font-bold">{value}</span>
      </div>
      <p className="text-gray-400 text-xs mt-1 flex items-center justify-center gap-1">{icon} {label}</p>
    </div>
  );
}

function ActionButton({
  onClick, icon, label, variant = 'ghost', disabled = false
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'ghost' | 'secondary' | 'primary';
  disabled?: boolean;
}) {
  const variants = {
    ghost: 'bg-white/5 hover:bg-white/10 text-gray-300',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function CopyButton({ onClick, copied }: { onClick: () => void; copied: boolean }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-2 right-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
    </button>
  );
}

function EmptyAnalysisState({ status }: { status: string }) {
  const getContent = () => {
    switch (status) {
      case 'analyzing':
        return {
          icon: <RefreshCw className="w-12 h-12 text-purple-400 animate-spin" />,
          title: 'KIRO está analizando...',
          description: 'Esto puede tomar unos minutos. El análisis se actualizará automáticamente.'
        };
      case 'failed':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-red-400" />,
          title: 'Error en el análisis',
          description: 'Hubo un problema al generar el análisis. Por favor intenta regenerarlo.'
        };
      default:
        return {
          icon: <Sparkles className="w-12 h-12 text-gray-400" />,
          title: 'Sin análisis todavía',
          description: 'El ADN de producto aún no ha sido analizado. Inicia el análisis para ver los resultados.'
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {content.icon}
      <h3 className="text-xl font-semibold text-white mt-4">{content.title}</h3>
      <p className="text-gray-400 mt-2 max-w-md">{content.description}</p>
    </div>
  );
}
