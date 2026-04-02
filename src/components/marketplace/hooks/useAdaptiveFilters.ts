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
  filterKey: 'platforms' | 'software' | 'accepts_exchange';
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

// --- Adaptive Filter Config per Role Category (4 categorias) ---

const ADAPTIVE_FILTERS: Partial<Record<MarketplaceViewMode, AdaptiveFilterConfig[]>> = {
  creators: [
    { key: 'platforms', label: 'Plataformas', type: 'multi-select', options: PLATFORMS, filterKey: 'platforms' },
    { key: 'accepts_exchange', label: 'Acepta intercambio', type: 'toggle', options: [{ value: 'true', label: 'Solo intercambio de producto' }], filterKey: 'accepts_exchange' },
  ],
  production: [
    { key: 'software', label: 'Software', type: 'multi-select', options: SOFTWARE_TOOLS, filterKey: 'software' },
  ],
  strategy: [
    { key: 'platforms', label: 'Plataformas que gestiona', type: 'multi-select', options: PLATFORMS, filterKey: 'platforms' },
  ],
};

export function getAdaptiveFilters(category: MarketplaceViewMode): AdaptiveFilterConfig[] {
  return ADAPTIVE_FILTERS[category] ?? [];
}
