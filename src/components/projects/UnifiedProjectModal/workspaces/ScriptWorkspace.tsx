import { ScriptsTabContainer } from '@/components/content/ContentDetailDialog/scripts/ScriptsTabContainer';
import type { UnifiedTabProps } from '../types';
import type { ContentFormData, ContentPermissions } from '@/components/content/ContentDetailDialog/types';

/**
 * ScriptWorkspace - Wraps the existing ScriptsTabContainer from ContentDetailDialog.
 * Used for content_creation project type.
 */
export default function ScriptWorkspace({
  project,
  formData,
  setFormData,
  editMode,
  setEditMode,
  permissions,
  onUpdate,
  readOnly,
}: UnifiedTabProps) {
  // ScriptsTabContainer expects ContentFormData shape and ContentPermissions
  // For content source, we can pass through directly since formData matches
  if (project.source === 'content' && project.contentData) {
    // Adapt unified permissions back to content-compatible shape
    const contentPermissions: ContentPermissions = {
      can: (resource, action) => permissions.can(`project.${resource.split('.')[1]}` as any, action),
      visibleTabs: permissions.visibleSections as any[],
      isReadOnly: (resource) => permissions.isReadOnly(`project.${resource.split('.')[1]}` as any),
      canEnterEditMode: permissions.canEnterEditMode,
    };

    return (
      <ScriptsTabContainer
        content={project.contentData}
        formData={formData as unknown as ContentFormData}
        setFormData={setFormData as any}
        editMode={editMode && !readOnly}
        setEditMode={setEditMode}
        permissions={contentPermissions}
        onUpdate={onUpdate}
        selectedProduct={null}
        onProductChange={() => {}}
      />
    );
  }

  // For marketplace projects of type content_creation, show a simplified script editor
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Workspace de Guion</h3>
      <p className="text-sm text-muted-foreground">
        El workspace de guion completo esta disponible para proyectos creados desde el tablero de contenido.
        Para proyectos de marketplace, usa el brief y los entregables.
      </p>
    </div>
  );
}
