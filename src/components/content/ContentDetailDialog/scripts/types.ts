// ============= SCRIPT PERMISSIONS TYPES =============

// Nueva estructura: 5 bloques principales (Guión, Director, B-Roll, Marketing, Captions)
export type ScriptSubTab = 'ia' | 'script' | 'director' | 'broll' | 'marketing' | 'captions';

export type ScriptAction = 'view' | 'edit' | 'generate' | 'approve' | 'lock';

export interface ScriptTabPermission {
  view: boolean;
  edit: boolean;
  generate?: boolean;  // Only for IA tab
  approve?: boolean;   // Only for script tab
  lock?: boolean;      // Only for admin/captions tab
}

export interface ScriptPermissions {
  ia: ScriptTabPermission;
  script: ScriptTabPermission;
  director: ScriptTabPermission;
  broll: ScriptTabPermission;
  marketing: ScriptTabPermission;
  captions: ScriptTabPermission;
}

export interface ScriptPermissionsHook {
  permissions: ScriptPermissions;
  loading: boolean;
  canView: (tab: ScriptSubTab) => boolean;
  canEdit: (tab: ScriptSubTab) => boolean;
  canGenerate: () => boolean;
  canApprove: () => boolean;
  canLock: () => boolean;
  isReadOnly: (tab: ScriptSubTab) => boolean;
  visibleTabs: ScriptSubTab[];
}

// Database row type - Nueva estructura 4 bloques
export interface ScriptPermissionRow {
  id: string;
  organization_id: string;
  role: string;
  ia_view: boolean;
  ia_edit: boolean;
  ia_generate: boolean;
  script_view: boolean;
  script_edit: boolean;
  script_approve: boolean;
  director_view: boolean;
  director_edit: boolean;
  marketing_view: boolean;
  marketing_edit: boolean;
  captions_view: boolean;
  captions_edit: boolean;
  captions_lock: boolean;
  status_overrides: Record<string, Partial<ScriptPermissions>>;
}

// Sub-tab configuration
export interface ScriptSubTabConfig {
  key: ScriptSubTab;
  label: string;
  icon: string;
  description: string;
}

// Orden: IA, Guión, Director, B-Roll, Marketing, Captions (5 bloques principales)
export const SCRIPT_SUB_TABS: ScriptSubTabConfig[] = [
  { key: 'ia', label: 'IA', icon: '🤖', description: 'Generación de guiones con IA' },
  { key: 'script', label: 'Guión', icon: '🎬', description: 'Guión completo para el creador' },
  { key: 'director', label: 'Director', icon: '🎥', description: 'Tabla de producción por escenas' },
  { key: 'broll', label: 'B-Roll', icon: '🎬', description: 'Ideas de tomas de cobertura' },
  { key: 'marketing', label: 'Marketing', icon: '📊', description: 'Estrategia + Tráfico combinado' },
  { key: 'captions', label: 'Captions', icon: '📱', description: '4 variaciones: 2 orgánico + 2 ads' },
];

// Default permissions by role (fallback if DB doesn't have them)
// TODOS los roles pueden VER todas las pestañas, solo varía quién puede EDITAR
export const DEFAULT_PERMISSIONS: Record<string, ScriptPermissions> = {
  admin: {
    ia: { view: true, edit: true, generate: true },
    script: { view: true, edit: true, approve: true },
    director: { view: true, edit: true },
    broll: { view: true, edit: true },
    marketing: { view: true, edit: true },
    captions: { view: true, edit: true, lock: true },
  },
  creator: {
    ia: { view: true, edit: false, generate: false },
    script: { view: true, edit: true, approve: false },
    director: { view: true, edit: false },
    broll: { view: true, edit: false },
    marketing: { view: true, edit: false },
    captions: { view: true, edit: false, lock: false },
  },
  editor: {
    ia: { view: true, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    director: { view: true, edit: true },
    broll: { view: true, edit: true },
    marketing: { view: true, edit: false },
    captions: { view: true, edit: false, lock: false },
  },
  strategist: {
    ia: { view: true, edit: true, generate: true },
    script: { view: true, edit: true, approve: false },
    director: { view: true, edit: true },
    broll: { view: true, edit: true },
    marketing: { view: true, edit: true },
    captions: { view: true, edit: true, lock: false },
  },
  designer: {
    ia: { view: true, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    director: { view: true, edit: false },
    broll: { view: true, edit: false },
    marketing: { view: true, edit: false },
    captions: { view: true, edit: false, lock: false },
  },
  trafficker: {
    ia: { view: true, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    director: { view: true, edit: false },
    broll: { view: true, edit: false },
    marketing: { view: true, edit: true },
    captions: { view: true, edit: true, lock: false },
  },
  client: {
    ia: { view: true, edit: false, generate: false },
    script: { view: true, edit: false, approve: true },
    director: { view: true, edit: false },
    broll: { view: true, edit: false },
    marketing: { view: true, edit: false },
    captions: { view: true, edit: false, lock: false },
  },
  guest: {
    ia: { view: true, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    director: { view: true, edit: false },
    broll: { view: true, edit: false },
    marketing: { view: true, edit: false },
    captions: { view: true, edit: false, lock: false },
  },
};
