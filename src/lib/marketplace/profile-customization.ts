export const KREOON_ACCENT_COLORS = [
  { id: 'purple', hex: '#8B5CF6', label: 'Púrpura', emoji: '💜' },
  { id: 'blue', hex: '#3B82F6', label: 'Azul', emoji: '💙' },
  { id: 'green', hex: '#10B981', label: 'Verde', emoji: '💚' },
  { id: 'orange', hex: '#F97316', label: 'Naranja', emoji: '🧡' },
  { id: 'pink', hex: '#EC4899', label: 'Rosa', emoji: '💖' },
  { id: 'white', hex: '#F8FAFC', label: 'Blanco', emoji: '🤍' },
  { id: 'black', hex: '#1E1E2E', label: 'Negro', emoji: '🖤' },
  { id: 'yellow', hex: '#EAB308', label: 'Amarillo', emoji: '💛' },
] as const;

export type AccentColorId = typeof KREOON_ACCENT_COLORS[number]['id'];

export const PORTFOLIO_LAYOUTS = [
  { id: 'grid', label: 'Grid Uniforme', icon: 'LayoutGrid' },
  { id: 'masonry', label: 'Masonry', icon: 'LayoutDashboard' },
  { id: 'featured', label: 'Featured + Grid', icon: 'LayoutTemplate' },
] as const;

export type PortfolioLayoutId = typeof PORTFOLIO_LAYOUTS[number]['id'];

export interface ProfileCustomization {
  accent_color: AccentColorId;
  portfolio_layout: PortfolioLayoutId;
  section_order: string[];
  featured_links: Array<{ label: string; url: string }>;
}

export const DEFAULT_PROFILE_CUSTOMIZATION: ProfileCustomization = {
  accent_color: 'purple',
  portfolio_layout: 'grid',
  section_order: ['portfolio', 'services', 'reviews', 'stats'],
  featured_links: [],
};
