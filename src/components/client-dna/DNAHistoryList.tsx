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
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">Historial de Versiones</h3>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {history.map((dna) => {
          const isActive = dna.id === activeDnaId;

          return (
            <div
              key={dna.id}
              className={`rounded-lg border transition-colors ${
                isActive
                  ? 'border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-500/10'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14141f] hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <div className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Version Badge */}
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center
                                    font-bold text-sm sm:text-lg shrink-0 ${
                      isActive
                        ? 'bg-purple-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}>
                      v{dna.version}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:font-medium text-zinc-900 dark:text-white">
                          Versión {dna.version}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full
                                         bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30
                                         text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
                        {formatDate(dna.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onViewDetails(dna)}
                      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg
                                 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                                 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700
                                 active:bg-zinc-300 dark:active:bg-zinc-600 transition-colors duration-150"
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Ver
                    </button>

                    {!isActive && (
                      <button
                        onClick={() => onSelect(dna.id)}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg
                                   bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30
                                   text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/30
                                   active:bg-purple-300 dark:active:bg-purple-500/40 transition-colors duration-150"
                      >
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Restaurar
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Summary */}
                {dna.emotional_analysis && (
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-zinc-500">Estado</p>
                        <p className="text-[10px] sm:text-sm text-zinc-900 dark:text-white capitalize truncate">{dna.emotional_analysis.overall_mood}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-zinc-500">Confianza</p>
                        <p className="text-[10px] sm:text-sm text-zinc-900 dark:text-white">{dna.emotional_analysis.confidence_level}%</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-zinc-500">Regiones</p>
                        <p className="text-[10px] sm:text-sm text-zinc-900 dark:text-white">{dna.audience_locations?.length || 0}</p>
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
