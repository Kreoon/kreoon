/**
 * dnaToBlocksMapping.ts
 * Mapeo de datos del ADN de Talento a bloques del Profile Builder
 */

import type { TalentDNAData } from '@/types/talent-dna';
import type { BlockType } from '@/components/profile-builder/types/profile-builder';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DNAFieldMapping {
  dnaPath: string;           // Ruta en dna_data (ej: 'creator_identity.bio_full')
  blockField: string;        // Campo del bloque donde aplicar
  label: string;             // Label para UI
  transform?: TransformType; // Transformacion opcional
}

export type TransformType =
  | 'none'
  | 'arrayToSkillItems'
  | 'arrayToIconItems'
  | 'arrayToFaqItems'
  | 'arrayToBulletList';

export interface DNASuggestion extends DNAFieldMapping {
  value: unknown;            // Valor actual del ADN
  preview: string;           // Preview para mostrar en UI
}

// ─── Mapeos por tipo de bloque ───────────────────────────────────────────────

export const DNA_BLOCK_MAPPINGS: Partial<Record<BlockType, DNAFieldMapping[]>> = {
  hero_banner: [
    {
      dnaPath: 'creator_identity.tagline',
      blockField: 'config.subheadline',
      label: 'Tagline profesional',
    },
  ],

  about: [
    {
      dnaPath: 'creator_identity.bio_full',
      blockField: 'config.text',
      label: 'Biografia completa',
    },
    {
      dnaPath: 'creator_identity.unique_factor',
      blockField: 'config.text',
      label: 'Factor diferenciador',
    },
  ],

  skills: [
    {
      dnaPath: 'specialization.production_skills',
      blockField: 'config.items',
      label: 'Habilidades de produccion',
      transform: 'arrayToSkillItems',
    },
    {
      dnaPath: 'creative_process.tools_used',
      blockField: 'config.items',
      label: 'Herramientas',
      transform: 'arrayToSkillItems',
    },
  ],

  icon_list: [
    {
      dnaPath: 'specialization.niches',
      blockField: 'config.items',
      label: 'Nichos',
      transform: 'arrayToIconItems',
    },
    {
      dnaPath: 'platforms',
      blockField: 'config.items',
      label: 'Plataformas',
      transform: 'arrayToIconItems',
    },
    {
      dnaPath: 'languages',
      blockField: 'config.items',
      label: 'Idiomas',
      transform: 'arrayToIconItems',
    },
    {
      dnaPath: 'specialization.content_formats',
      blockField: 'config.items',
      label: 'Formatos de contenido',
      transform: 'arrayToIconItems',
    },
  ],

  faq: [
    {
      dnaPath: 'creative_process.workflow_description',
      blockField: 'config.items',
      label: 'Proceso de trabajo',
      transform: 'arrayToFaqItems',
    },
  ],

  text: [
    {
      dnaPath: 'creator_identity.bio_full',
      blockField: 'config.content',
      label: 'Biografia completa',
    },
    {
      dnaPath: 'creator_identity.unique_factor',
      blockField: 'config.content',
      label: 'Factor diferenciador',
    },
    {
      dnaPath: 'creative_process.workflow_description',
      blockField: 'config.content',
      label: 'Proceso de trabajo',
    },
  ],

  bullet_list: [
    {
      dnaPath: 'creator_identity.achievements',
      blockField: 'config.items',
      label: 'Logros destacados',
      transform: 'arrayToBulletList',
    },
    {
      dnaPath: 'specialization.specialized_services',
      blockField: 'config.items',
      label: 'Servicios especializados',
      transform: 'arrayToBulletList',
    },
  ],
};

// ─── Funciones de utilidad ───────────────────────────────────────────────────

/**
 * Obtiene un valor anidado del objeto ADN usando notacion de punto
 * Ejemplo: getDNAValue(dna, 'creator_identity.tagline')
 */
export function getDNAValue(dnaData: TalentDNAData | null | undefined, path: string): unknown {
  if (!dnaData) return undefined;

  const parts = path.split('.');
  let current: unknown = dnaData;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Genera un preview del valor para mostrar en la UI
 */
export function getValuePreview(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    return value.length > 80 ? value.slice(0, 80) + '...' : value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '(vacio)';
    const items = value.slice(0, 3).join(', ');
    return value.length > 3 ? `${items}...` : items;
  }

  return String(value);
}

/**
 * Transforma un valor del ADN al formato esperado por el bloque
 */
export function transformDNAValue(
  value: unknown,
  transform: TransformType = 'none'
): unknown {
  if (value === null || value === undefined) return value;

  switch (transform) {
    case 'arrayToSkillItems':
      if (Array.isArray(value)) {
        return value.map((item, index) => ({
          id: `dna-skill-${index}`,
          name: String(item),
          level: 80, // Nivel por defecto
        }));
      }
      return value;

    case 'arrayToIconItems':
      if (Array.isArray(value)) {
        return value.map((item, index) => ({
          id: `dna-icon-${index}`,
          label: String(item),
          icon: 'star', // Icono por defecto
        }));
      }
      return value;

    case 'arrayToFaqItems':
      if (typeof value === 'string') {
        return [
          {
            id: 'dna-faq-1',
            question: 'Como es mi proceso de trabajo?',
            answer: value,
          },
        ];
      }
      return value;

    case 'arrayToBulletList':
      if (Array.isArray(value)) {
        return value.map((item, index) => ({
          id: `dna-bullet-${index}`,
          text: String(item),
        }));
      }
      return value;

    case 'none':
    default:
      return value;
  }
}

/**
 * Obtiene las sugerencias disponibles del ADN para un tipo de bloque
 */
export function getDNASuggestionsForBlock(
  blockType: BlockType,
  dnaData: TalentDNAData | null | undefined
): DNASuggestion[] {
  if (!dnaData) return [];

  const mappings = DNA_BLOCK_MAPPINGS[blockType];
  if (!mappings) return [];

  const suggestions: DNASuggestion[] = [];

  for (const mapping of mappings) {
    const value = getDNAValue(dnaData, mapping.dnaPath);

    // Solo incluir si hay valor
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'string' && value.trim() === '') continue;

    suggestions.push({
      ...mapping,
      value,
      preview: getValuePreview(value),
    });
  }

  return suggestions;
}

// ─── Categorias de datos ADN para el panel ───────────────────────────────────

export interface DNACategory {
  id: string;
  label: string;
  icon: string;
  fields: {
    path: string;
    label: string;
  }[];
}

export const DNA_CATEGORIES: DNACategory[] = [
  {
    id: 'identity',
    label: 'Identidad',
    icon: 'user',
    fields: [
      { path: 'creator_identity.tagline', label: 'Tagline' },
      { path: 'creator_identity.bio_full', label: 'Biografia' },
      { path: 'creator_identity.unique_factor', label: 'Factor unico' },
      { path: 'creator_identity.years_creating', label: 'Anos creando' },
    ],
  },
  {
    id: 'specialization',
    label: 'Especializacion',
    icon: 'target',
    fields: [
      { path: 'specialization.niches', label: 'Nichos' },
      { path: 'specialization.production_skills', label: 'Habilidades' },
      { path: 'specialization.content_formats', label: 'Formatos' },
      { path: 'specialization.specialized_services', label: 'Servicios' },
    ],
  },
  {
    id: 'style',
    label: 'Estilo',
    icon: 'palette',
    fields: [
      { path: 'content_style.primary_style', label: 'Estilo principal' },
      { path: 'content_style.tone_descriptors', label: 'Tono' },
      { path: 'content_style.visual_aesthetic', label: 'Estetica visual' },
      { path: 'content_style.editing_style', label: 'Edicion' },
    ],
  },
  {
    id: 'process',
    label: 'Proceso',
    icon: 'workflow',
    fields: [
      { path: 'creative_process.workflow_description', label: 'Flujo de trabajo' },
      { path: 'creative_process.turnaround_typical', label: 'Tiempo de entrega' },
      { path: 'creative_process.collaboration_style', label: 'Estilo colaboracion' },
      { path: 'creative_process.tools_used', label: 'Herramientas' },
    ],
  },
  {
    id: 'platforms',
    label: 'Plataformas',
    icon: 'globe',
    fields: [
      { path: 'platforms', label: 'Plataformas' },
      { path: 'languages', label: 'Idiomas' },
      { path: 'marketplace_roles', label: 'Roles' },
    ],
  },
];
