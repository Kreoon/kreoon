import React from 'react';
import { Brain, Zap, AlertCircle, Heart, MessageCircle, Lightbulb } from 'lucide-react';
import { EmotionalAnalysis } from '@/types/client-dna';

interface EmotionalInsightsCardProps {
  analysis: EmotionalAnalysis;
}

const MOOD_CONFIG = {
  enthusiastic: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Entusiasta', emoji: '🔥' },
  confident: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Confiado', emoji: '💪' },
  uncertain: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Incierto', emoji: '🤔' },
  stressed: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Estresado', emoji: '😰' },
  calm: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Calmado', emoji: '😌' },
  passionate: { color: 'text-pink-400', bg: 'bg-pink-500/20', label: 'Apasionado', emoji: '❤️‍🔥' },
};

export function EmotionalInsightsCard({ analysis }: EmotionalInsightsCardProps) {
  if (!analysis) return null;
  const moodConfig = MOOD_CONFIG[analysis.overall_mood as keyof typeof MOOD_CONFIG] || MOOD_CONFIG.calm;

  return (
    <div className="rounded-lg bg-white dark:bg-[#14141f] border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">Análisis Emocional</h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Insights de KIRO basados en tu audio</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Overall Mood */}
        <div className="p-3 sm:p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
            <span className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">Estado General</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">{moodConfig.emoji}</span>
            <span className={`text-lg sm:text-xl font-bold ${moodConfig.color}`}>{moodConfig.label}</span>
          </div>
        </div>

        {/* Confidence Level */}
        {analysis.confidence_level != null && (
          <div className="p-3 sm:p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
              <span className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">Confianza</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white shrink-0">{analysis.confidence_level}%</span>
              <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${analysis.confidence_level}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Communication Style */}
        {analysis.communication_style && (
          <div className="p-3 sm:p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
              <span className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">Comunicación</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <StyleBadge label={analysis.communication_style.pace} type="pace" />
              <StyleBadge label={analysis.communication_style.energy} type="energy" />
            </div>
          </div>
        )}
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Passion Topics */}
        {(analysis.passion_topics?.length || 0) > 0 && (
          <div className="p-3 sm:p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">Temas con Pasión</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {(analysis.passion_topics || []).map((topic, i) => (
                <span
                  key={i}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20
                             text-[10px] sm:text-xs text-green-700 dark:text-green-300"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Concern Areas */}
        {(analysis.concern_areas?.length || 0) > 0 && (
          <div className="p-3 sm:p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">Áreas de Preocupación</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {(analysis.concern_areas || []).map((area, i) => (
                <span
                  key={i}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20
                             text-[10px] sm:text-xs text-amber-700 dark:text-amber-300"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Recommendations */}
      {analysis.content_recommendations && (
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
              <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">Recomendaciones de KIRO</span>
          </div>
          {analysis.content_recommendations.suggested_tone && (
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 mb-2 sm:mb-3">
              <span className="text-purple-600 dark:text-purple-400 font-medium">Tono sugerido:</span>{' '}
              {analysis.content_recommendations.suggested_tone}
            </p>
          )}
          {(analysis.content_recommendations.emphasize_topics?.length || 0) > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs text-zinc-500">Enfatizar:</span>
              {(analysis.content_recommendations.emphasize_topics || []).map((topic, i) => (
                <span
                  key={i}
                  className="px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-[10px] sm:text-xs text-purple-600 dark:text-purple-300"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StyleBadge({ label, type }: { label: string; type: 'pace' | 'energy' }) {
  const configs = {
    pace: {
      slow: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20', label: 'Pausado' },
      moderate: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/20', label: 'Moderado' },
      fast: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/20', label: 'Rápido' },
    },
    energy: {
      low: { color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-500/20', label: 'Baja energía' },
      medium: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/20', label: 'Media energía' },
      high: { color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-500/20', label: 'Alta energía' },
    }
  };

  const config = configs[type][label as keyof typeof configs[typeof type]] || {
    color: 'text-zinc-600 dark:text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-500/20',
    label
  };

  return (
    <span className={`px-2 py-1 rounded-lg ${config.bg} ${config.color} text-xs font-medium`}>
      {config.label}
    </span>
  );
}
