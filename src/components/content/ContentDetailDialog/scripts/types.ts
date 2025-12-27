// ============= SCRIPT PERMISSIONS TYPES =============

export type ScriptSubTab = 'ia' | 'script' | 'editor' | 'strategist' | 'designer' | 'trafficker' | 'admin';

export type ScriptAction = 'view' | 'edit' | 'generate' | 'approve' | 'lock';

export interface ScriptTabPermission {
  view: boolean;
  edit: boolean;
  generate?: boolean;  // Only for IA tab
  approve?: boolean;   // Only for script tab
  lock?: boolean;      // Only for admin tab
}

export interface ScriptPermissions {
  ia: ScriptTabPermission;
  script: ScriptTabPermission;
  editor: ScriptTabPermission;
  strategist: ScriptTabPermission;
  designer: ScriptTabPermission;
  trafficker: ScriptTabPermission;
  admin: ScriptTabPermission;
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

// Database row type
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
  editor_view: boolean;
  editor_edit: boolean;
  strategist_view: boolean;
  strategist_edit: boolean;
  designer_view: boolean;
  designer_edit: boolean;
  trafficker_view: boolean;
  trafficker_edit: boolean;
  admin_view: boolean;
  admin_edit: boolean;
  admin_lock: boolean;
  status_overrides: Record<string, Partial<ScriptPermissions>>;
}

// Sub-tab configuration
export interface ScriptSubTabConfig {
  key: ScriptSubTab;
  label: string;
  icon: string;
  description: string;
}

export const SCRIPT_SUB_TABS: ScriptSubTabConfig[] = [
  { key: 'ia', label: 'IA', icon: '🤖', description: 'Generación de guiones con IA' },
  { key: 'script', label: 'Guión', icon: '📝', description: 'Guión completo del contenido' },
  { key: 'editor', label: 'Editor', icon: '🎬', description: 'Indicaciones de edición' },
  { key: 'strategist', label: 'Estratega', icon: '🧠', description: 'Estrategia y objetivos' },
  { key: 'designer', label: 'Diseñador', icon: '🎨', description: 'Indicaciones visuales' },
  { key: 'trafficker', label: 'Trafficker', icon: '📈', description: 'Pauta y campañas' },
  { key: 'admin', label: 'Admin', icon: '🛠️', description: 'Control y aprobaciones' },
];

// Default permissions by role (fallback if DB doesn't have them)
export const DEFAULT_PERMISSIONS: Record<string, ScriptPermissions> = {
  admin: {
    ia: { view: true, edit: true, generate: true },
    script: { view: true, edit: true, approve: true },
    editor: { view: true, edit: true },
    strategist: { view: true, edit: true },
    designer: { view: true, edit: true },
    trafficker: { view: true, edit: true },
    admin: { view: true, edit: true, lock: true },
  },
  creator: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: true, approve: false },
    editor: { view: true, edit: false },
    strategist: { view: true, edit: false },
    designer: { view: true, edit: false },
    trafficker: { view: false, edit: false },
    admin: { view: false, edit: false, lock: false },
  },
  editor: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    editor: { view: true, edit: true },
    strategist: { view: true, edit: false },
    designer: { view: true, edit: false },
    trafficker: { view: false, edit: false },
    admin: { view: false, edit: false, lock: false },
  },
  strategist: {
    ia: { view: true, edit: true, generate: true },
    script: { view: true, edit: true, approve: false },
    editor: { view: true, edit: true },
    strategist: { view: true, edit: true },
    designer: { view: true, edit: true },
    trafficker: { view: true, edit: true },
    admin: { view: false, edit: false, lock: false },
  },
  designer: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    editor: { view: true, edit: false },
    strategist: { view: true, edit: false },
    designer: { view: true, edit: true },
    trafficker: { view: false, edit: false },
    admin: { view: false, edit: false, lock: false },
  },
  trafficker: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    editor: { view: true, edit: false },
    strategist: { view: true, edit: false },
    designer: { view: true, edit: false },
    trafficker: { view: true, edit: true },
    admin: { view: false, edit: false, lock: false },
  },
  client: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: false, approve: true },
    editor: { view: false, edit: false },
    strategist: { view: false, edit: false },
    designer: { view: false, edit: false },
    trafficker: { view: false, edit: false },
    admin: { view: false, edit: false, lock: false },
  },
};
