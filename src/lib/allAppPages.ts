/**
 * Catálogo de todas las páginas/módulos internos de la app.
 *
 * Solo para el panel de QA root (`/admin/qa-paginas`). Lista páginas
 * autenticadas navegables sin parámetro dinámico obligatorio — no incluye
 * rutas públicas/legales/auth ni rutas que requieren un ID real
 * (ej: /crm/marcas/:brandId, /academia/:spaceSlug/*).
 *
 * Mantener sincronizado a mano con las rutas de src/App.tsx.
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Sparkles,
  UsersRound,
  Building2,
  Store,
  Compass,
  FolderKanban,
  Megaphone,
  PlusCircle,
  ClipboardList,
  UserPlus,
  ListChecks,
  MessageSquare,
  Play,
  Bookmark,
  Heart,
  CircleUser,
  TrendingUp,
  ImagePlus,
  Share2,
  Search,
  LineChart,
  Crown,
  Users2,
  Package,
  Wallet,
  DollarSign,
  Trash2,
  Blocks,
  Settings,
  UserCircle,
  ReceiptText,
  Trophy,
  Award,
  Palette,
  BookOpen,
  GraduationCap,
  PlusSquare,
  LayoutGrid,
} from 'lucide-react';

export interface QAPage {
  name: string;
  path: string;
  icon: LucideIcon;
  /** Nota corta sobre para quién es o en qué estado está */
  note?: string;
}

export interface QASection {
  label: string;
  items: QAPage[];
}

export const ALL_APP_PAGES: QASection[] = [
  {
    label: 'Producción',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Tablero de Contenido', path: '/board', icon: Kanban },
      { name: 'Contenido', path: '/content', icon: FileText },
      { name: 'Kreoon IA (Guiones)', path: '/scripts', icon: Sparkles },
      { name: 'Talento', path: '/talent', icon: UsersRound },
      { name: 'Clientes', path: '/clientes', icon: Building2 },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { name: 'Marketplace', path: '/marketplace', icon: Store },
      { name: 'Explorar Marketplace', path: '/marketplace/explore', icon: Compass },
      { name: 'Mis Proyectos', path: '/marketplace/projects', icon: FolderKanban },
      { name: 'Contenido Marketplace', path: '/marketplace/content', icon: FileText },
      { name: 'Videos Marketplace', path: '/marketplace/videos', icon: Play },
      { name: 'Campañas', path: '/marketplace/campaigns', icon: Megaphone },
      { name: 'Crear Campaña', path: '/marketplace/campaigns/create', icon: PlusCircle },
      { name: 'Mis Campañas', path: '/marketplace/my-campaigns', icon: ClipboardList },
      { name: 'Campañas como Creador', path: '/marketplace/creator-campaigns', icon: ClipboardList },
      { name: 'Listas de Talento', path: '/marketplace/talent-lists', icon: ListChecks },
      { name: 'Invitaciones', path: '/marketplace/invitations', icon: UserPlus },
      { name: 'Consultas', path: '/marketplace/inquiries', icon: MessageSquare },
      { name: 'Guardados', path: '/marketplace/guardados', icon: Bookmark },
      { name: 'Favoritos', path: '/marketplace/favoritos', icon: Heart },
      { name: 'Configurar Perfil Marketplace', path: '/marketplace/profile/setup', icon: CircleUser },
      { name: 'Marketplace Dashboard', path: '/marketplace/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Generador de Anuncios', path: '/ad-generator', icon: ImagePlus },
      { name: 'Social Hub', path: '/social-hub', icon: Share2 },
      { name: 'Analytics (KAE)', path: '/admin/analytics', icon: LineChart },
    ],
  },
  {
    label: 'CRM Plataforma',
    items: [
      { name: 'Panel Admin Plataforma', path: '/crm', icon: Crown },
      { name: 'CRM Overview', path: '/crm/overview', icon: LayoutDashboard },
      { name: 'Organizaciones', path: '/crm/organizaciones', icon: Building2 },
      { name: 'Marcas (Brands CRM)', path: '/crm/marcas', icon: Package },
      { name: 'Comunidades', path: '/crm/comunidades', icon: Users2 },
      { name: 'Personas', path: '/crm/personas', icon: UsersRound },
      { name: 'Finanzas Plataforma', path: '/crm/finanzas', icon: Wallet },
      { name: 'Email Marketing', path: '/crm/email-marketing', icon: Megaphone, note: 'root' },
      { name: 'Payouts', path: '/admin/payouts', icon: DollarSign },
      { name: 'Pagos Pendientes', path: '/admin/pending-payments', icon: DollarSign },
    ],
  },
  {
    label: 'CRM Organización',
    items: [
      { name: 'Finanzas de la Org', path: '/org-crm/finanzas', icon: Wallet },
    ],
  },
  {
    label: 'Admin / Root',
    items: [
      { name: 'Papelera', path: '/admin/papelera', icon: Trash2 },
      { name: 'Módulos en Desarrollo', path: '/admin/dev-modules', icon: Blocks, note: 'root' },
    ],
  },
  {
    label: 'Cuenta y Configuración',
    items: [
      { name: 'Configuración', path: '/settings', icon: Settings },
      { name: 'Mi Perfil', path: '/settings?section=profile', icon: UserCircle },
      { name: 'Mi Plan', path: '/planes', icon: Crown },
      { name: 'Campañas Gestionadas', path: '/campanas-gestionadas', icon: Megaphone },
      { name: 'Profile Builder', path: '/profile-builder', icon: Palette },
      { name: 'Galería de Templates', path: '/templates', icon: LayoutGrid },
    ],
  },
  {
    label: 'Dashboards por Rol',
    items: [
      { name: 'Dashboard Creador', path: '/creator-dashboard', icon: CircleUser },
      { name: 'Dashboard Editor', path: '/editor-dashboard', icon: FileText },
      { name: 'Dashboard Estratega', path: '/strategist-dashboard', icon: TrendingUp },
      { name: 'Dashboard Cliente', path: '/client-dashboard', icon: Building2 },
      { name: 'Tablero Cliente', path: '/client-board', icon: Kanban },
      { name: 'Demo Cliente', path: '/demo', icon: Play },
    ],
  },
  {
    label: 'Gamificación',
    items: [
      { name: 'Ranking', path: '/ranking', icon: Trophy },
      { name: 'Embajadores', path: '/ambassador', icon: Award },
    ],
  },
  {
    label: 'Academia (LMS)',
    items: [
      { name: 'Academia — Inicio', path: '/academia', icon: GraduationCap },
      { name: 'Explorar Academia', path: '/academia/explorar', icon: Compass },
      { name: 'Crear Espacio', path: '/academia/crear', icon: PlusSquare },
      { name: 'Dashboard Academia', path: '/academia/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Recibos y Docs',
    items: [
      { name: 'Documentación UP', path: '/up-documentation', icon: BookOpen },
      { name: 'Documentación MCP', path: '/mcp-docs', icon: ReceiptText },
    ],
  },
];

/** Total de páginas listadas (para el header del panel) */
export function countAllAppPages(): number {
  return ALL_APP_PAGES.reduce((sum, section) => sum + section.items.length, 0);
}
