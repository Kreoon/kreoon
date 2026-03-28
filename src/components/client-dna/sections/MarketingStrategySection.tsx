import React, { useState } from 'react';
import {
  Layout, Instagram, Youtube, Music2, Linkedin, Facebook,
  Globe, Hash, Zap, Calendar, ChevronDown, Lightbulb
} from 'lucide-react';
import { MarketingStrategy, ContentPillar, Platform } from '@/types/client-dna';
import { EditableText, EditableTags } from '../EditableFields';

interface Props {
  data: MarketingStrategy;
  isEditing?: boolean;
  onFieldChange?: (path: string, value: unknown) => void;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  'Instagram': Instagram,
  'TikTok': Music2,
  'YouTube': Youtube,
  'LinkedIn': Linkedin,
  'Facebook': Facebook,
  'Twitter': Globe,
  'Pinterest': Globe,
};

const PRIORITY_CONFIG = {
  high: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/20', border: 'border-green-200 dark:border-green-500/30', label: 'Alta' },
  medium: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/20', border: 'border-yellow-200 dark:border-yellow-500/30', label: 'Media' },
  low: { color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-500/20', border: 'border-zinc-200 dark:border-zinc-500/30', label: 'Baja' },
};

// Adapters for old→new data
function getContentPillars(data: any): ContentPillar[] {
  if (Array.isArray(data.content_pillars) && data.content_pillars.length) {
    // New structured format
    if (typeof data.content_pillars[0] === 'object') return data.content_pillars;
    // Old string[] format → wrap into ContentPillar objects
    return data.content_pillars.map((p: string) => ({ name: p, description: '', content_ideas: [] }));
  }
  return [];
}

function getRecommendedPlatforms(data: any): Platform[] {
  if (Array.isArray(data.recommended_platforms) && data.recommended_platforms.length) return data.recommended_platforms;
  // Fallback: old channels[] → wrap into Platform objects
  if (data.channels?.length) {
    return data.channels.map((ch: string) => ({ name: ch, priority: 'medium' as const, strategy: '', content_types: [] }));
  }
  return [];
}

function getContentFormats(data: any): string[] {
  if (Array.isArray(data.content_formats) && data.content_formats.length) return data.content_formats;
  return [];
}

function getEngagementTactics(data: any): string[] {
  if (Array.isArray(data.engagement_tactics) && data.engagement_tactics.length) return data.engagement_tactics;
  return [];
}

function getHashtagStrategy(data: any): string[] {
  if (Array.isArray(data.hashtag_strategy) && data.hashtag_strategy.length) return data.hashtag_strategy;
  return [];
}

export function MarketingStrategySection({ data, isEditing, onFieldChange }: Props) {
  const [expandedPillar, setExpandedPillar] = useState<number | null>(0);
  const change = (path: string) => (value: unknown) => onFieldChange?.(path, value);

  const contentPillars = getContentPillars(data);
  const platforms = getRecommendedPlatforms(data);
  const contentFormats = getContentFormats(data);
  const engagementTactics = getEngagementTactics(data);
  const hashtagStrategy = getHashtagStrategy(data);

  const updatePillarField = (index: number, field: string, value: unknown) => {
    const updated = [...contentPillars];
    updated[index] = { ...updated[index], [field]: value };
    onFieldChange?.('content_pillars', updated);
  };

  const updatePlatformField = (index: number, field: string, value: unknown) => {
    const updated = [...platforms];
    updated[index] = { ...updated[index], [field]: value };
    onFieldChange?.('recommended_platforms', updated);
  };

  return (
    <div className="space-y-6">
      {/* Content Pillars */}
      {(contentPillars.length > 0 || isEditing) && (
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Layout className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">Pilares de Contenido</p>
          </div>

          {contentPillars.map((pillar, i) => (
            <ContentPillarCard
              key={i}
              pillar={pillar}
              index={i}
              isExpanded={expandedPillar === i || !!isEditing}
              onToggle={() => setExpandedPillar(expandedPillar === i ? null : i)}
              isEditing={isEditing}
              onPillarFieldChange={(field, value) => updatePillarField(i, field, value)}
            />
          ))}

          {isEditing && (
            <button
              onClick={() => {
                const updated = [...contentPillars, { name: '', description: '', content_ideas: [] }];
                onFieldChange?.('content_pillars', updated);
              }}
              className="w-full p-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150"
            >
              + Agregar pilar
            </button>
          )}
        </div>
      )}

      {/* Recommended Platforms */}
      {(platforms.length > 0 || isEditing) && (
        <div className="p-3 sm:p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider mb-3 sm:mb-4">Plataformas Recomendadas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {platforms.map((platform, i) => (
              <PlatformCard
                key={i}
                platform={platform}
                isEditing={isEditing}
                onFieldChange={(field, value) => updatePlatformField(i, field, value)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content Formats & Frequency */}
      {(contentFormats.length > 0 || data.posting_frequency || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(contentFormats.length > 0 || isEditing) && (
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Formatos de Contenido</p>
              {isEditing ? (
                <EditableTags items={data.content_formats || []} onChange={change('content_formats') as (v: string[]) => void} color="blue" placeholder="Agregar formato..." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contentFormats.map((format, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20
                                 text-sm text-blue-600 dark:text-blue-300"
                    >
                      {format}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {(data.posting_frequency || isEditing) && (
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30
                            border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Frecuencia de Publicación</p>
              </div>
              {isEditing ? (
                <EditableText value={data.posting_frequency} onChange={change('posting_frequency') as (v: string) => void} placeholder="Frecuencia..." />
              ) : (
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{data.posting_frequency}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Engagement Tactics */}
      {(engagementTactics.length > 0 || isEditing) && (
        <div className="p-3 sm:p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
            <p className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">Tácticas de Engagement</p>
          </div>
          {isEditing ? (
            <EditableTags items={data.engagement_tactics || []} onChange={change('engagement_tactics') as (v: string[]) => void} color="amber" placeholder="Agregar táctica..." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 sm:gap-2">
              {engagementTactics.map((tactic, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 sm:mt-2 shrink-0" />
                  <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">{tactic}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hashtag Strategy */}
      {(hashtagStrategy.length > 0 || isEditing) && (
        <div className="p-3 sm:p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-600 dark:text-pink-400" />
            <p className="text-xs sm:text-sm font-medium text-pink-600 dark:text-pink-400">Estrategia de Hashtags</p>
          </div>
          {isEditing ? (
            <EditableTags items={data.hashtag_strategy || []} onChange={change('hashtag_strategy') as (v: string[]) => void} color="pink" placeholder="Agregar hashtag..." />
          ) : (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {hashtagStrategy.map((hashtag, i) => (
                <span
                  key={i}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-pink-100 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20
                             text-[10px] sm:text-sm text-pink-600 dark:text-pink-300"
                >
                  #{hashtag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Old fields fallback */}
      {(data.primary_objective || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Objetivo Principal</p>
          {isEditing ? (
            <EditableText value={data.primary_objective} onChange={change('primary_objective') as (v: string) => void} placeholder="Objetivo principal..." />
          ) : (
            <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">{data.primary_objective}</p>
          )}
        </div>
      )}
      {(data.secondary_objectives?.length > 0 || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Objetivos Secundarios</p>
          {isEditing ? (
            <EditableTags items={data.secondary_objectives || []} onChange={change('secondary_objectives') as (v: string[]) => void} color="amber" placeholder="Agregar objetivo..." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(data.secondary_objectives || []).map((obj, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-600 dark:text-amber-300">
                  {obj}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {(data.main_cta || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">CTA Principal</p>
          {isEditing ? (
            <EditableText value={data.main_cta} onChange={change('main_cta') as (v: string) => void} placeholder="CTA principal..." />
          ) : (
            <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">{data.main_cta}</p>
          )}
        </div>
      )}
      {(data.funnel_strategy || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Estrategia de Embudo</p>
          {isEditing ? (
            <EditableText value={data.funnel_strategy} onChange={change('funnel_strategy') as (v: string) => void} multiline placeholder="Estrategia de embudo..." />
          ) : (
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{data.funnel_strategy}</p>
          )}
        </div>
      )}
      {(data.monthly_budget || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Presupuesto Mensual</p>
          {isEditing ? (
            <EditableText value={data.monthly_budget} onChange={change('monthly_budget') as (v: string) => void} placeholder="Presupuesto..." />
          ) : (
            <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">{data.monthly_budget}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ContentPillarCard({
  pillar,
  index,
  isExpanded,
  onToggle,
  isEditing,
  onPillarFieldChange,
}: {
  pillar: ContentPillar;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isEditing?: boolean;
  onPillarFieldChange?: (field: string, value: unknown) => void;
}) {
  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-amber-500 to-orange-500',
    'from-emerald-500 to-teal-500',
    'from-rose-500 to-red-500',
  ];
  const gradient = colors[index % colors.length];
  const hasDetails = pillar.description || pillar.content_ideas?.length > 0;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
      {isEditing ? (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient}
                            flex items-center justify-center text-white font-bold flex-shrink-0`}>
              {index + 1}
            </div>
            <div className="flex-1 space-y-2">
              <EditableText value={pillar.name} onChange={(v) => onPillarFieldChange?.('name', v)} placeholder="Nombre del pilar..." />
              <EditableText value={pillar.description} onChange={(v) => onPillarFieldChange?.('description', v)} placeholder="Descripción..." />
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Ideas de Contenido</p>
            <EditableTags items={pillar.content_ideas || []} onChange={(v) => onPillarFieldChange?.('content_ideas', v)} color="amber" placeholder="Agregar idea..." />
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={hasDetails ? onToggle : undefined}
            className={`w-full p-4 flex items-center justify-between ${hasDetails ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer' : 'cursor-default'} transition-colors duration-150`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient}
                              flex items-center justify-center text-white font-bold`}>
                {index + 1}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{pillar.name}</p>
                {pillar.description && <p className="text-sm text-zinc-400">{pillar.description}</p>}
              </div>
            </div>
            {hasDetails && (
              <ChevronDown className={`w-5 h-5 text-zinc-400 transition-[transform] duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </button>

          {isExpanded && pillar.content_ideas?.length > 0 && (
            <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4 mb-3">Ideas de Contenido</p>
              <div className="space-y-2">
                {pillar.content_ideas.map((idea, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{idea}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlatformCard({ platform, isEditing, onFieldChange }: { platform: Platform; isEditing?: boolean; onFieldChange?: (field: string, value: unknown) => void }) {
  const Icon = PLATFORM_ICONS[platform.name] || Globe;
  const priorityConfig = PRIORITY_CONFIG[platform.priority] || PRIORITY_CONFIG.medium;

  return (
    <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-900 dark:text-zinc-100 shrink-0" />
          {isEditing ? (
            <EditableText value={platform.name} onChange={(v) => onFieldChange?.('name', v)} placeholder="Plataforma..." />
          ) : (
            <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{platform.name}</span>
          )}
        </div>
        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${priorityConfig.bg} ${priorityConfig.border} border ${priorityConfig.color} shrink-0`}>
          {priorityConfig.label}
        </span>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <EditableText value={platform.strategy} onChange={(v) => onFieldChange?.('strategy', v)} placeholder="Estrategia..." />
          <EditableTags items={platform.content_types || []} onChange={(v) => onFieldChange?.('content_types', v)} color="purple" placeholder="Tipo de contenido..." />
        </div>
      ) : (
        <>
          {platform.strategy && <p className="text-[10px] sm:text-xs text-zinc-400 mb-1.5 sm:mb-2 line-clamp-2">{platform.strategy}</p>}
          {platform.content_types?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {platform.content_types.slice(0, 3).map((type, i) => (
                <span key={i} className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] sm:text-xs text-zinc-400">
                  {type}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
