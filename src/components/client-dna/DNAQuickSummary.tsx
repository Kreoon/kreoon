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
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500
                        flex items-center justify-center">
          <Dna className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm text-gray-400">
          ADN v{dna.version} • {dna.emotional_analysis?.confidence_level ?? '—'}% confianza
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10
                    border border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Dna className="w-5 h-5 text-purple-400" />
        <span className="font-medium text-white">ADN del Negocio v{dna.version}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <Target className="w-3 h-3" />
            Arquetipo
          </div>
          <p className="text-sm text-white font-medium">
            {getArchetype(dna)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <Users className="w-3 h-3" />
            Audiencia
          </div>
          <p className="text-sm text-white font-medium">
            {getAudienceAge(dna)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            Pilares
          </div>
          <p className="text-sm text-white font-medium">
            {getPillarCount(dna)} pilares
          </p>
        </div>
      </div>
    </div>
  );
}
