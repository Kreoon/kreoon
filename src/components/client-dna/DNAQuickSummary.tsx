import React from 'react';
import { Dna, Target, Users, TrendingUp } from 'lucide-react';
import { ClientDNA } from '@/types/client-dna';

interface DNAQuickSummaryProps {
  dna: ClientDNA;
  compact?: boolean;
}

// Safe accessors for old/new data shapes
function getArchetype(dna: ClientDNA): string {
  return dna.dna_data?.brand_identity?.brand_archetype || '—';
}

function getAudienceAge(dna: ClientDNA): string {
  const ic = dna.dna_data?.ideal_customer as any;
  if (!ic) return '—';
  const demo = ic.demographic || ic.demographics;
  return demo?.age_range || '—';
}

function getPillarCount(dna: ClientDNA): number {
  const pillars = dna.dna_data?.marketing_strategy?.content_pillars;
  if (!Array.isArray(pillars)) return 0;
  return pillars.length;
}

export function DNAQuickSummary({ dna, compact = false }: DNAQuickSummaryProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500
                        flex items-center justify-center shrink-0">
          <Dna className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
        </div>
        <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
          ADN v{dna.version} • {dna.emotional_analysis?.confidence_level ?? '—'}% confianza
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Dna className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 shrink-0" />
        <span className="text-sm sm:font-medium text-zinc-900 dark:text-white">ADN del Negocio v{dna.version}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-zinc-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
            <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            <span className="truncate">Arquetipo</span>
          </div>
          <p className="text-[10px] sm:text-sm text-zinc-900 dark:text-white font-medium truncate">
            {getArchetype(dna)}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1 text-zinc-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            <span className="truncate">Audiencia</span>
          </div>
          <p className="text-[10px] sm:text-sm text-zinc-900 dark:text-white font-medium truncate">
            {getAudienceAge(dna)}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1 text-zinc-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            <span className="truncate">Pilares</span>
          </div>
          <p className="text-[10px] sm:text-sm text-zinc-900 dark:text-white font-medium">
            {getPillarCount(dna)} pilares
          </p>
        </div>
      </div>
    </div>
  );
}
