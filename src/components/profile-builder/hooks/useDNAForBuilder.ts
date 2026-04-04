/**
 * useDNAForBuilder.ts
 * Hook para integrar datos del ADN de Talento en el Profile Builder
 */

import { useCallback, useMemo } from 'react';
import { useTalentDNA } from '@/hooks/useTalentDNA';
import {
  getDNAValue,
  getDNASuggestionsForBlock,
  transformDNAValue,
  getValuePreview,
  DNA_CATEGORIES,
  type DNASuggestion,
  type DNACategory,
} from '@/lib/profile-builder/dnaToBlocksMapping';
import type { TalentDNAData } from '@/types/talent-dna';
import type { BlockType, ProfileBlock } from '../types/profile-builder';

export interface UseDNAForBuilderResult {
  /** Si el usuario tiene ADN generado */
  hasDNA: boolean;
  /** Datos del ADN */
  dnaData: TalentDNAData | null;
  /** Esta cargando */
  loading: boolean;
  /** Fecha de generacion del ADN */
  generatedAt: string | null;
  /** Obtener sugerencias para un tipo de bloque */
  getSuggestionsForBlock: (blockType: BlockType) => DNASuggestion[];
  /** Obtener un valor especifico del ADN */
  getValue: (path: string) => unknown;
  /** Obtener preview de un valor */
  getPreview: (path: string) => string;
  /** Aplicar una sugerencia a un bloque */
  applyToBlock: (
    suggestion: DNASuggestion,
    block: ProfileBlock
  ) => Partial<ProfileBlock>;
  /** Categorias de datos ADN para el panel */
  categories: DNACategory[];
  /** Obtener datos de una categoria */
  getCategoryData: (categoryId: string) => Array<{
    path: string;
    label: string;
    value: unknown;
    preview: string;
  }>;
}

/**
 * Hook para acceder y usar datos del ADN de Talento en el Profile Builder
 */
export function useDNAForBuilder(): UseDNAForBuilderResult {
  const { dna, loading } = useTalentDNA();

  const dnaData = dna?.dna_data ?? null;
  const hasDNA = dnaData !== null;

  const generatedAt = useMemo(() => {
    if (!dna?.created_at) return null;
    return dna.created_at;
  }, [dna?.created_at]);

  /**
   * Obtener sugerencias disponibles para un tipo de bloque
   */
  const getSuggestionsForBlock = useCallback(
    (blockType: BlockType): DNASuggestion[] => {
      return getDNASuggestionsForBlock(blockType, dnaData);
    },
    [dnaData]
  );

  /**
   * Obtener un valor especifico del ADN
   */
  const getValue = useCallback(
    (path: string): unknown => {
      return getDNAValue(dnaData, path);
    },
    [dnaData]
  );

  /**
   * Obtener preview de un valor
   */
  const getPreview = useCallback(
    (path: string): string => {
      const value = getDNAValue(dnaData, path);
      return getValuePreview(value);
    },
    [dnaData]
  );

  /**
   * Aplicar una sugerencia a un bloque
   * Retorna las actualizaciones parciales para el bloque
   */
  const applyToBlock = useCallback(
    (suggestion: DNASuggestion, block: ProfileBlock): Partial<ProfileBlock> => {
      const transformedValue = transformDNAValue(
        suggestion.value,
        suggestion.transform
      );

      // Determinar donde aplicar el valor
      const fieldParts = suggestion.blockField.split('.');

      if (fieldParts[0] === 'config') {
        // Aplicar a config del bloque
        const configKey = fieldParts[1];
        return {
          config: {
            ...block.config,
            [configKey]: transformedValue,
          },
        };
      }

      // Por defecto, retornar sin cambios
      return {};
    },
    []
  );

  /**
   * Obtener datos de una categoria para mostrar en el panel
   */
  const getCategoryData = useCallback(
    (categoryId: string) => {
      const category = DNA_CATEGORIES.find((c) => c.id === categoryId);
      if (!category) return [];

      return category.fields
        .map((field) => {
          const value = getDNAValue(dnaData, field.path);
          return {
            path: field.path,
            label: field.label,
            value,
            preview: getValuePreview(value),
          };
        })
        .filter((item) => {
          // Filtrar items vacios
          if (item.value === null || item.value === undefined) return false;
          if (Array.isArray(item.value) && item.value.length === 0) return false;
          if (typeof item.value === 'string' && item.value.trim() === '') return false;
          return true;
        });
    },
    [dnaData]
  );

  return {
    hasDNA,
    dnaData,
    loading,
    generatedAt,
    getSuggestionsForBlock,
    getValue,
    getPreview,
    applyToBlock,
    categories: DNA_CATEGORIES,
    getCategoryData,
  };
}
