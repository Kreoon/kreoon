import type { MarketplaceViewMode } from '../types/marketplace';

export interface AdaptiveFilterOption {
  value: string;
  label: string;
}

export interface AdaptiveFilterConfig {
  key: string;
  label: string;
  type: 'multi-select' | 'toggle';
  options: AdaptiveFilterOption[];
  filterKey: 'platforms' | 'software' | 'accepts_exchange' | 'tech_stack' | 'education_format';
}

// --- Constants ---

export const PLATFORMS: AdaptiveFilterOption[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'linkedin', label: 'LinkedIn' },
];

export const SOFTWARE_TOOLS: AdaptiveFilterOption[] = [
  { value: 'premiere', label: 'Premiere Pro' },
  { value: 'after_effects', label: 'After Effects' },
  { value: 'davinci', label: 'DaVinci Resolve' },
  { value: 'final_cut', label: 'Final Cut Pro' },
  { value: 'capcut', label: 'CapCut' },
  { value: 'figma', label: 'Figma' },
];

export const TECH_STACKS: AdaptiveFilterOption[] = [
  { value: 'react', label: 'React' },
  { value: 'python', label: 'Python' },
  { value: 'node', label: 'Node.js' },
  { value: 'flutter', label: 'Flutter' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'shopify', label: 'Shopify' },
];

export const EDUCATION_FORMATS: AdaptiveFilterOption[] = [
  { value: 'live', label: 'En vivo' },
  { value: 'recorded', label: 'Grabado' },
  { value: 'workshop', label: 'Taller' },
  { value: 'mentoring', label: 'Mentoría' },
];

// --- Adaptive Filter Config per Role Category ---

const ADAPTIVE_FILTERS: Partial<Record<MarketplaceViewMode, AdaptiveFilterConfig[]>> = {
  content_creation: [
    { key: 'platforms', label: 'Plataformas', type: 'multi-select', options: PLATFORMS, filterKey: 'platforms' },
    { key: 'accepts_exchange', label: 'Acepta intercambio', type: 'toggle', options: [{ value: 'true', label: 'Solo intercambio de producto' }], filterKey: 'accepts_exchange' },
  ],
  post_production: [
    { key: 'software', label: 'Software', type: 'multi-select', options: SOFTWARE_TOOLS, filterKey: 'software' },
  ],
  strategy_marketing: [
    { key: 'platforms', label: 'Plataformas que gestiona', type: 'multi-select', options: PLATFORMS, filterKey: 'platforms' },
  ],
  technology: [
    { key: 'tech_stack', label: 'Stack tecnológico', type: 'multi-select', options: TECH_STACKS, filterKey: 'tech_stack' },
  ],
  education: [
    { key: 'education_format', label: 'Formato', type: 'multi-select', options: EDUCATION_FORMATS, filterKey: 'education_format' },
  ],
};

export function getAdaptiveFilters(category: MarketplaceViewMode): AdaptiveFilterConfig[] {
  return ADAPTIVE_FILTERS[category] ?? [];
}
