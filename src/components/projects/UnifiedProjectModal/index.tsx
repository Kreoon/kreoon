import { lazy, Suspense, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AutoSaveIndicator } from '@/components/ui/autosave-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, Trash2, Eye, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedProject } from './hooks/useUnifiedProject';
import { SECTION_TAB_CONFIG } from '@/types/unifiedProject.types';
import { getWorkflowForType } from '@/types/workflows';
import { WorkflowProgressBar } from './WorkflowProgressBar';
import type { UnifiedProjectModalProps } from './types';
import type { UnifiedSectionKey } from '@/types/unifiedProject.types';

// Lazy load all tabs
const WorkspaceTab = lazy(() => import('./tabs/WorkspaceTab'));
const BriefTab = lazy(() => import('./tabs/BriefTab'));
const DeliverablesTab = lazy(() => import('./tabs/DeliverablesTab'));
const TeamTab = lazy(() => import('./tabs/TeamTab'));
const ThumbnailTab = lazy(() => import('./tabs/ThumbnailTab'));
const DatesTab = lazy(() => import('./tabs/DatesTab'));
const PaymentsTab = lazy(() => import('./tabs/PaymentsTab'));
// Map section keys to lazy components
const TAB_COMPONENTS: Record<UnifiedSectionKey, React.LazyExoticComponent<any>> = {
  workspace: WorkspaceTab,
  brief: BriefTab,
  deliverables: DeliverablesTab,
  materials: DeliverablesTab,
  review: DeliverablesTab, // Review integrated into deliverables view
  thumbnail: ThumbnailTab,
  team: TeamTab,
  dates: DatesTab,
  payments: PaymentsTab,
};

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function UnifiedProjectModal({
  source,
  projectId,
  project: preloadedProject,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  mode = 'view',
  createProjectType,
}: UnifiedProjectModalProps) {
  const isCreateMode = mode === 'create';
  const [activeTab, setActiveTab] = useState<string>('workspace');

  const {
    project,
    formData,
    setFormData,
    loading,
    saving,
    editMode,
    setEditMode,
    handleSave,
    handleStatusChange,
    permissions,
    typeConfig,
    autoSaveStatus,
    lastSaved,
    flushPendingRefresh,
    assignmentsHook,
    selectedProduct,
    handleProductChange,
  } = useUnifiedProject({
    source,
    projectId,
    preloaded: preloadedProject,
    onUpdate,
    createProjectType,
  });

  // Determine visible sections based on permissions + type config
  const displaySections = useMemo(() => {
    if (isCreateMode) return typeConfig.visibleTabs;
    return permissions.visibleSections.filter(s => typeConfig.visibleTabs.includes(s));
  }, [isCreateMode, typeConfig.visibleTabs, permissions.visibleSections]);

  // Workflow phases for progress bar (must be before early return to respect Rules of Hooks)
  const workflow = useMemo(
    () => getWorkflowForType(typeConfig.type, typeConfig.workflow.states),
    [typeConfig.type, typeConfig.workflow.states],
  );

  const handleClose = () => {
    if (!isCreateMode) {
      flushPendingRefresh();
    }
    onOpenChange(false);
  };

  if (!isCreateMode && !project && !loading) return null;

  const tabProps = {
    project: project || ({} as any),
    formData,
    setFormData,
    editMode: isCreateMode ? true : editMode,
    setEditMode,
    permissions,
    typeConfig,
    onUpdate,
    assignmentsHook,
    selectedProduct,
    onProductChange: handleProductChange,
  };

  // Status options from workflow config
  const statusOptions = typeConfig.workflow.states;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-5xl max-h-[90vh] overflow-hidden p-0 flex flex-col" aria-describedby="unified-project-description">
        <DialogDescription id="unified-project-description" className="sr-only">
          Detalle del proyecto
        </DialogDescription>

        {/* ============ HERO HEADER ============ */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 sm:p-6 border-b shrink-0">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }} />
          </div>

          <div className="relative">
            {/* Top Row: Type Badge + Status + Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {/* Project Type Badge */}
                <Badge className={cn('text-xs px-2 py-0.5', typeConfig.bgColor, typeConfig.color)}>
                  {typeConfig.label}
                </Badge>

                {/* Status */}
                {isCreateMode ? (
                  <Badge className="text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20">
                    <Plus className="h-3 w-3 mr-1" />
                    Nuevo Proyecto
                  </Badge>
                ) : permissions.can('project.status', 'edit') ? (
                  <SearchableSelect
                    value={project?.status || ''}
                    onValueChange={handleStatusChange}
                    options={statusOptions.map(state => ({ value: state.key, label: state.label }))}
                    placeholder="Estado..."
                    triggerClassName="min-w-[140px] h-9 text-sm font-medium"
                  />
                ) : (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {statusOptions.find(s => s.key === project?.status)?.label || project?.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isCreateMode && editMode && (
                  <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
                )}

                {!isCreateMode && permissions.canEnterEditMode && (
                  <Button
                    variant={editMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? 'Cancelar' : 'Editar'}
                  </Button>
                )}

                {(isCreateMode || editMode) && (
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    {isCreateMode ? 'Crear' : 'Guardar'}
                  </Button>
                )}
              </div>
            </div>

            {/* Title */}
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                {(isCreateMode || editMode) && permissions.can('project.title', 'edit') ? (
                  <Input
                    value={formData.title || ''}
                    onChange={(e) => setFormData((prev: Record<string, any>) => ({ ...prev, title: e.target.value }))}
                    className="text-2xl sm:text-3xl font-bold h-auto py-2 bg-background/50"
                    placeholder="Nombre del proyecto..."
                  />
                ) : (
                  project?.title || 'Cargando...'
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Meta info: participants */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
              {project?.clientName && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full text-muted-foreground">
                  <span>Cliente: {project.clientName}</span>
                </div>
              )}
              {project?.creatorName && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full text-muted-foreground">
                  <span>Creador: {project.creatorName}</span>
                </div>
              )}
              {project?.deadline && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full text-muted-foreground">
                  <span>Entrega: {new Date(project.deadline).toLocaleDateString('es-CO')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============ WORKFLOW PROGRESS BAR ============ */}
        {!isCreateMode && project?.status && (
          <div className="px-4 sm:px-6 py-3 border-b bg-muted/10 shrink-0">
            <WorkflowProgressBar workflow={workflow} currentStatus={project.status} />
          </div>
        )}

        {/* ============ CONTENT AREA WITH TABS ============ */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          {loading ? (
            <TabSkeleton />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full h-auto gap-1 mb-6 flex flex-wrap justify-start bg-muted/30 p-1 rounded-lg">
                {displaySections.map(sectionKey => {
                  const config = SECTION_TAB_CONFIG[sectionKey];
                  const readOnly = permissions.isReadOnly(`project.${sectionKey}` as any);

                  return (
                    <TabsTrigger
                      key={sectionKey}
                      value={sectionKey}
                      className={cn(
                        'text-xs sm:text-sm px-3 py-2 flex items-center gap-1.5 rounded-md transition-all duration-200',
                        'data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground',
                        'hover:bg-background/50',
                      )}
                    >
                      <span className="hidden sm:inline">{config.label}</span>
                      <span className="sm:hidden">{config.label.slice(0, 4)}</span>
                      {readOnly && <Eye className="h-3 w-3 text-muted-foreground" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {displaySections.map(sectionKey => {
                const TabComponent = TAB_COMPONENTS[sectionKey];
                const readOnly = permissions.isReadOnly(`project.${sectionKey}` as any);

                return (
                  <TabsContent key={sectionKey} value={sectionKey} className="mt-4 relative">
                    {readOnly && (
                      <div className="absolute top-0 right-0 z-10 flex items-center gap-1 px-2 py-1 text-xs rounded-bl-lg bg-muted/80 text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        Solo lectura
                      </div>
                    )}
                    <Suspense fallback={<TabSkeleton />}>
                      <TabComponent {...tabProps} readOnly={readOnly} sectionKey={sectionKey} />
                    </Suspense>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>

        {/* ============ FOOTER: DELETE ============ */}
        {!isCreateMode && permissions.can('project.delete', 'edit') && (
          <div className="border-t p-4 bg-muted/30">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Proyecto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar proyecto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta accion no se puede deshacer. Se eliminara permanentemente el proyecto "{project?.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (project?.id) {
                        onDelete?.(project.id);
                        onOpenChange(false);
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UnifiedProjectModal;
