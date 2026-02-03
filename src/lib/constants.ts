/**
 * Constantes globales de la aplicación Kreoon.
 */

// ─── Roles del sistema ──────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: "admin",
  CREATOR: "creator",
  EDITOR: "editor",
  CLIENT: "client",
  STRATEGIST: "strategist",
  AMBASSADOR: "ambassador",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Labels de roles en español
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  creator: "Creador",
  editor: "Editor",
  client: "Marca",
  strategist: "Estratega",
  ambassador: "Embajador",
};

// Rutas de dashboard por rol
export const DASHBOARD_ROUTES: Record<Role, string> = {
  admin: "/dashboard",
  creator: "/creator-dashboard",
  editor: "/editor-dashboard",
  client: "/client-dashboard",
  strategist: "/strategist-dashboard",
  ambassador: "/dashboard",
};

// ─── Estados de organización ────────────────────────────────────────────────

export const ORG_STATUS = {
  ACTIVE: "active",
  PENDING: "pending_assignment",
  SUSPENDED: "suspended",
} as const;

export type OrgStatus = (typeof ORG_STATUS)[keyof typeof ORG_STATUS];

// ─── Configuración de la app ────────────────────────────────────────────────

export const APP_CONFIG = {
  name: "Kreoon",
  tagline: "Plataforma de Contenido Colaborativo",
  supportEmail: "soporte@kreoon.com",
  socialLinks: {
    instagram: "https://instagram.com/kreoon",
    tiktok: "https://tiktok.com/@kreoon",
    linkedin: "https://linkedin.com/company/kreoon",
    youtube: "https://youtube.com/@kreoon",
    twitter: "https://twitter.com/KREOON_app",
  },
  legalLinks: {
    terms: "/terms",
    privacy: "/privacy",
    cookies: "/cookies",
  },
} as const;

// ─── Límites y configuraciones ──────────────────────────────────────────────

export const LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxBioLength: 500,
  maxCampaignTitle: 100,
  passwordMinLength: 8,
  maxUploadFiles: 10,
} as const;

// ─── Breakpoints (sincronizados con Tailwind) ───────────────────────────────

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// ─── Tiempos de animación en ms ─────────────────────────────────────────────

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// ─── Z-index layers ─────────────────────────────────────────────────────────

export const Z_INDEX = {
  dropdown: 50,
  sticky: 100,
  modal: 200,
  popover: 250,
  tooltip: 300,
  toast: 400,
} as const;

// ─── Query keys para React Query ────────────────────────────────────────────

export const QUERY_KEYS = {
  user: "user",
  profile: "profile",
  organizations: "organizations",
  campaigns: "campaigns",
  creators: "creators",
  notifications: "notifications",
  content: "content",
  team: "team",
  clients: "clients",
} as const;
