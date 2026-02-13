import React from 'react';
import { Calendar, CheckCircle2, Eye, RotateCcw } from 'lucide-react';
import { ClientDNA } from '@/types/client-dna';

interface DNAHistoryListProps {
  history: ClientDNA[];
  activeDnaId?: string;
  onSelect: (dnaId: string) => void;
  onViewDetails: (dna: ClientDNA) => void;
}

export function DNAHistoryList({
  history,
  activeDnaId,
  onSelect,
  onViewDetails
}: DNAHistoryListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Historial de Versiones</h3>
      </div>

      <div className="space-y-3">
        {history.map((dna) => {
          const isActive = dna.id === activeDnaId;

          return (
            <div
              key={dna.id}
              className={`relative overflow-hidden rounded-xl border transition-all ${
                isActive
                  ? 'border-purple-500/50 bg-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Version Badge */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                                    font-bold text-lg ${
                      isActive
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      v{dna.version}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          Versión {dna.version}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
                                         bg-green-500/20 border border-green-500/30
                                         text-xs text-green-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {formatDate(dna.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewDetails(dna)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                 bg-white/5 border border-white/10
                                 text-sm text-gray-400 hover:text-white hover:bg-white/10
                                 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </button>

                    {!isActive && (
                      <button
                        onClick={() => onSelect(dna.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                   bg-purple-500/20 border border-purple-500/30
                                   text-sm text-purple-400 hover:bg-purple-500/30
                                   transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurar
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Summary */}
                {dna.emotional_analysis && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Estado Emocional</p>
                        <p className="text-white capitalize">{dna.emotional_analysis.overall_mood}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Confianza</p>
                        <p className="text-white">{dna.emotional_analysis.confidence_level}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Ubicaciones</p>
                        <p className="text-white">{dna.audience_locations?.length || 0} regiones</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
