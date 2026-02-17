import type {
  UnifiedProject,
  UnifiedPermissions,
  UnifiedSectionKey,
  ProjectTypeConfig,
} from '@/types/unifiedProject.types';
import type { UseProjectAssignmentsReturn } from '@/hooks/useProjectAssignments';

// ============================================================
// MODAL PROPS
// ============================================================

export type UnifiedModalMode = 'view' | 'create';

export interface UnifiedProjectModalProps {
  /** Source of the project data */
  source: 'content' | 'marketplace';
  /** Project ID (required for view mode) */
  projectId?: string;
  /** Pre-loaded project data (optional, avoids refetch) */
  project?: UnifiedProject;
  /** Dialog open state */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback when project is saved/updated */
  onUpdate?: () => void;
  /** Callback when project is deleted */
  onDelete?: (id: string) => void;
  /** View or create mode */
  mode?: UnifiedModalMode;
  /** For create mode: which project type to create */
  createProjectType?: import('@/types/unifiedProject.types').ProjectType;
}

// ============================================================
// TAB PROPS (shared interface for all tab components)
// ============================================================

export interface UnifiedTabProps {
  project: UnifiedProject;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  permissions: UnifiedPermissions;
  typeConfig: ProjectTypeConfig;
  onUpdate?: () => void;
  readOnly?: boolean;
  assignmentsHook?: UseProjectAssignmentsReturn;
  /** Selected product (for content projects - needed by script generation) */
  selectedProduct?: any;
  /** Callback to change the selected product */
  onProductChange?: (productId: string) => void;
}

// ============================================================
// HOOK RETURN TYPE
// ============================================================

export interface UseUnifiedProjectReturn {
  project: UnifiedProject | null;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  loading: boolean;
  saving: boolean;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  handleSave: () => Promise<void>;
  handleStatusChange: (newStatus: string) => Promise<void>;
  permissions: UnifiedPermissions;
  typeConfig: ProjectTypeConfig;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  flushPendingRefresh: () => void;
  assignmentsHook: UseProjectAssignmentsReturn;
  selectedProduct: any;
  handleProductChange: (productId: string) => void;
}
