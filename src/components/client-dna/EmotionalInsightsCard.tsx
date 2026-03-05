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
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-pink-600/10" />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                          flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Análisis Emocional</h3>
            <p className="text-sm text-gray-400">Insights de KIRO basados en tu audio</p>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Overall Mood */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Estado General</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{moodConfig.emoji}</span>
              <span className={`text-xl font-bold ${moodConfig.color}`}>{moodConfig.label}</span>
            </div>
          </div>

          {/* Confidence Level */}
          {analysis.confidence_level != null && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Confianza</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-white">{analysis.confidence_level}%</span>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
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
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Comunicación</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <StyleBadge label={analysis.communication_style.pace} type="pace" />
                <StyleBadge label={analysis.communication_style.energy} type="energy" />
              </div>
            </div>
          )}
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Passion Topics */}
          {(analysis.passion_topics?.length || 0) > 0 && (
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Lightbulb className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-sm font-medium text-green-400">Temas con Pasión</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(analysis.passion_topics || []).map((topic, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20
                               text-xs text-green-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Concern Areas */}
          {(analysis.concern_areas?.length || 0) > 0 && (
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <span className="text-sm font-medium text-orange-400">Áreas de Preocupación</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(analysis.concern_areas || []).map((area, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20
                               text-xs text-orange-300"
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
          <div className="mt-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-purple-400">Recomendaciones de KIRO</span>
            </div>
            {analysis.content_recommendations.suggested_tone && (
              <p className="text-sm text-foreground/80 mb-3">
                <span className="text-purple-400 font-medium">Tono sugerido:</span>{' '}
                {analysis.content_recommendations.suggested_tone}
              </p>
            )}
            {(analysis.content_recommendations.emphasize_topics?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Enfatizar:</span>
                {(analysis.content_recommendations.emphasize_topics || []).map((topic, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-purple-500/20 text-xs text-purple-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StyleBadge({ label, type }: { label: string; type: 'pace' | 'energy' }) {
  const configs = {
    pace: {
      slow: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Pausado' },
      moderate: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Moderado' },
      fast: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Rápido' },
    },
    energy: {
      low: { color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Baja energía' },
      medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Media energía' },
      high: { color: 'text-pink-400', bg: 'bg-pink-500/20', label: 'Alta energía' },
    }
  };

  const config = configs[type][label as keyof typeof configs[typeof type]] || {
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    label
  };

  return (
    <span className={`px-2 py-1 rounded-lg ${config.bg} ${config.color} text-xs font-medium`}>
      {config.label}
    </span>
  );
}
