/**
 * Development Modules Configuration
 *
 * Lista de módulos en desarrollo que solo el usuario root puede ver.
 * Estos módulos están ocultos del sidebar y rutas para usuarios normales.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Trophy,
  TrendingUp,
  Radio,
  Users,
  BarChart3,
  ImagePlus,
  Search,
  Radar,
  GitBranch,
  Megaphone,
  Wallet,
  CalendarDays
} from 'lucide-react';

/** Email del usuario root con acceso a módulos en desarrollo */
const ROOT_EMAIL = 'jacsolucionesgraficas@gmail.com';

/** Definición de un item del sidebar para un módulo */
export interface DevSidebarItem {
  label: string;
  path: string;
  icon?: LucideIcon;
}

/** Definición de un módulo en desarrollo */
export interface DevelopmentModule {
  /** Identificador único del módulo */
  id: string;
  /** Nombre para mostrar */
  name: string;
  /** Descripción breve del módulo */
  description: string;
  /** Icono de Lucide */
  icon: LucideIcon;
  /** Rutas que pertenecen a este módulo */
  routes: string[];
  /** Items del sidebar para este módulo */
  sidebarItems: DevSidebarItem[];
  /** Estado del módulo */
  status: 'development' | 'beta' | 'paused';
}

/**
 * Lista de módulos en desarrollo
 * Solo visibles para el usuario root (jacsolucionesgraficas@gmail.com)
 */
export const DEVELOPMENT_MODULES: DevelopmentModule[] = [
  {
    id: 'ranking',
    name: 'Ranking',
    description: 'Sistema de clasificación y leaderboards para talentos',
    icon: Trophy,
    status: 'development',
    routes: ['/ranking'],
    sidebarItems: [
      { label: 'Ranking', path: '/ranking', icon: Trophy }
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Dashboard de estrategia de marketing y métricas',
    icon: TrendingUp,
    status: 'development',
    routes: ['/marketing'],
    sidebarItems: [
      { label: 'Marketing', path: '/marketing', icon: TrendingUp }
    ]
  },
  {
    id: 'streaming',
    name: 'Streaming',
    description: 'Hub de transmisiones en vivo y estudios virtuales',
    icon: Radio,
    status: 'development',
    routes: ['/streaming', '/streaming/studio', '/streaming/recap'],
    sidebarItems: [
      { label: 'Streaming', path: '/streaming', icon: Radio }
    ]
  },
  {
    id: 'live-hosting',
    name: 'Live Hosting',
    description: 'Contratación de hosts para transmisiones en vivo',
    icon: Users,
    status: 'development',
    routes: ['/streaming/hosting', '/streaming/hosting/new'],
    sidebarItems: [
      { label: 'Live Hosting', path: '/streaming/hosting', icon: Users }
    ]
  },
  {
    id: 'marketing-ads',
    name: 'Marketing Ads',
    description: 'Gestión de campañas publicitarias multi-plataforma',
    icon: BarChart3,
    status: 'development',
    routes: ['/marketing-ads'],
    sidebarItems: [
      { label: 'Marketing Ads', path: '/marketing-ads', icon: BarChart3 }
    ]
  },
  {
    id: 'ad-generator',
    name: 'Generador Ads',
    description: 'Creación automática de anuncios con IA',
    icon: ImagePlus,
    status: 'development',
    routes: ['/ad-generator'],
    sidebarItems: [
      { label: 'Generador Ads', path: '/ad-generator', icon: ImagePlus }
    ]
  },
  {
    id: 'ad-intelligence',
    name: 'Ad Intelligence',
    description: 'Análisis de competencia y tendencias en publicidad',
    icon: Search,
    status: 'development',
    routes: ['/admin/ad-intelligence'],
    sidebarItems: [
      { label: 'Ad Intelligence', path: '/admin/ad-intelligence', icon: Search }
    ]
  },
  {
    id: 'social-scraper',
    name: 'Social Scraper',
    description: 'Extracción de datos de redes sociales',
    icon: Radar,
    status: 'development',
    routes: ['/admin/social-scraper'],
    sidebarItems: [
      { label: 'Social Scraper', path: '/admin/social-scraper', icon: Radar }
    ]
  },
  {
    id: 'pipelines',
    name: 'Pipelines',
    description: 'Gestión de pipelines de ventas CRM',
    icon: GitBranch,
    status: 'development',
    routes: ['/org-crm/pipelines'],
    sidebarItems: [
      { label: 'Pipelines', path: '/org-crm/pipelines', icon: GitBranch }
    ]
  },
  {
    id: 'email-marketing',
    name: 'Email Marketing',
    description: 'Campañas de email y automatizaciones',
    icon: Megaphone,
    status: 'development',
    routes: ['/crm/email-marketing'],
    sidebarItems: [
      { label: 'Email Marketing', path: '/crm/email-marketing', icon: Megaphone }
    ]
  },
  {
    id: 'wallet',
    name: 'Wallet',
    description: 'Sistema de pagos, billetera y transacciones',
    icon: Wallet,
    status: 'development',
    routes: ['/wallet', '/wallet/transactions', '/wallet/withdrawals', '/wallet/payment-methods', '/wallet/settings', '/admin/wallets'],
    sidebarItems: [
      { label: 'Wallet', path: '/wallet', icon: Wallet }
    ]
  },
  {
    id: 'booking',
    name: 'Booking',
    description: 'Sistema de reservas y agendamiento de citas',
    icon: CalendarDays,
    status: 'development',
    routes: ['/booking/settings', '/booking/calendar', '/book'],
    sidebarItems: [
      { label: 'Booking', path: '/booking/calendar', icon: CalendarDays }
    ]
  }
];

/**
 * Verifica si una ruta pertenece a un módulo en desarrollo
 */
export function isDevModule(path: string): boolean {
  const normalizedPath = path.split('?')[0];
  return DEVELOPMENT_MODULES.some(module =>
    module.routes.some(route =>
      normalizedPath === route || normalizedPath.startsWith(`${route}/`)
    )
  );
}

/**
 * Verifica si el email pertenece al usuario root
 */
export function isRootUser(email: string | undefined | null): boolean {
  if (!email) return false;
  return email === ROOT_EMAIL;
}

/**
 * Verifica si un usuario puede acceder a módulos en desarrollo
 */
export function canAccessDevModule(email: string | undefined | null): boolean {
  return isRootUser(email);
}

/** Obtiene el email del usuario root */
export function getRootEmail(): string {
  return ROOT_EMAIL;
}

/**
 * Obtiene el módulo de desarrollo que contiene una ruta específica
 */
export function getDevModuleByPath(path: string): DevelopmentModule | undefined {
  const normalizedPath = path.split('?')[0];
  return DEVELOPMENT_MODULES.find(module =>
    module.routes.some(route =>
      normalizedPath === route || normalizedPath.startsWith(`${route}/`)
    )
  );
}

/**
 * Obtiene todas las rutas de módulos en desarrollo
 */
export function getAllDevRoutes(): string[] {
  return DEVELOPMENT_MODULES.flatMap(module => module.routes);
}

/**
 * Filtra items del sidebar excluyendo módulos en desarrollo.
 * SIEMPRE filtra los módulos de desarrollo de las secciones normales.
 * Root los ve en la sección "EN DESARROLLO", no duplicados en ambos lugares.
 */
export function filterDevModuleItems<T extends { href?: string; path?: string }>(
  items: T[],
  _userEmail: string | undefined | null
): T[] {
  // Siempre filtrar módulos en desarrollo de las secciones normales
  // Root los ve en la sección "EN DESARROLLO" separada
  return items.filter(item => {
    const path = item.href || item.path || '';
    return !isDevModule(path);
  });
}
