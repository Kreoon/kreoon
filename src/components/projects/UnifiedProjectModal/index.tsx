import { lazy, Suspense, useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AutoSaveIndicator } from '@/components/ui/autosave-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ContentConfigDialog } from '@/components/content/ContentDetailDialog/Config';
import { Save, Trash2, Eye, Plus, Loader2, Settings, Zap, Lightbulb, RefreshCw, Heart, Building2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedProject } from './hooks/useUnifiedProject';
import { SECTION_TAB_CONFIG } from '@/types/unifiedProject.types';
import { getWorkflowForType } from '@/types/workflows';
import { WorkflowProgressBar } from './WorkflowProgressBar';
import type { UnifiedProjectModalProps } from './types';
import type { UnifiedSectionKey } from '@/types/unifiedProject.types';

// Sphere phase configuration for content projects
const SPHERE_PHASES_CONFIG = [
  { value: 'engage', label: 'Enganchar', icon: Zap, color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/50' },
  { value: 'solution', label: 'Solucion', icon: Lightbulb, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50' },
  { value: 'remarketing', label: 'Remarketing', icon: RefreshCw, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/50' },
  { value: 'fidelize', label: 'Fidelizar', icon: Heart, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/50' },
];

// Lazy load all tabs
const WorkspaceTab = lazy(() => import('./tabs/WorkspaceTab'));
const BriefTab = lazy(() => import('./tabs/BriefTab'));
const VideoTab = lazy(() => import('./tabs/VideoTab'));
const DeliverablesTab = lazy(() => import('./tabs/DeliverablesTab'));
const MaterialsTab = lazy(() => import('./tabs/MaterialsTab'));
const TeamTab = lazy(() => import('./tabs/TeamTab'));
const ThumbnailTab = lazy(() => import('./tabs/ThumbnailTab'));
const DatesTab = lazy(() => import('./tabs/DatesTab'));
// Map section keys to lazy components
const TAB_COMPONENTS: Record<UnifiedSectionKey, React.LazyExoticComponent<any>> = {
  workspace: WorkspaceTab,
  brief: BriefTab,
  video: VideoTab,
  deliverables: DeliverablesTab,
  materials: MaterialsTab,
  review: DeliverablesTab, // Review integrated into deliverables view
  thumbnail: ThumbnailTab,
  team: TeamTab,
  dates: DatesTab,
  payments: TeamTab, // Finances merged into TeamTab
  reference: WorkspaceTab, // Reference video embedded in workspace; kept for type compat
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
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

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

  // Track scroll position to collapse/expand header on mobile
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      setIsHeaderCollapsed(el.scrollTop > 60);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

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
      <DialogContent className="w-full sm:w-full max-w-5xl max-sm:!h-[100dvh] max-h-[100dvh] sm:max-h-[90vh] max-sm:!left-0 max-sm:!top-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!rounded-none max-sm:!border-0 overflow-hidden p-0 flex flex-col" aria-describedby="unified-project-description">
        <DialogDescription id="unified-project-description" className="sr-only">
          Detalle del proyecto
        </DialogDescription>

        {/* ============ COMPACT HEADER (mobile collapsed) ============ */}
        {isHeaderCollapsed && (
          <div className="sm:hidden shrink-0 z-20 bg-card/95 backdrop-blur-sm border-b px-3 py-1.5 flex items-center gap-1.5 pr-10">
            {/* Sequence number */}
            {source === 'content' && !isCreateMode && project?.contentData?.sequence_number && (
              <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 shrink-0 bg-primary/5 border-primary/20 text-primary">
                {project.contentData.sequence_number}
              </Badge>
            )}
            <span className="text-xs font-semibold truncate flex-1">{project?.title || formData.title || 'Proyecto'}</span>
            {!isCreateMode && project?.status && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                {statusOptions.find(s => s.key === project?.status)?.label || project?.status}
              </Badge>
            )}
            {!isCreateMode && permissions.canEnterEditMode && (
              <Button
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[10px] px-1.5"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? 'X' : 'Editar'}
              </Button>
            )}
            {(isCreateMode || editMode) && (
              <Button onClick={handleSave} disabled={saving} size="sm" className="h-6 text-[10px] px-1.5">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
            )}
          </div>
        )}

        {/* ============ HERO HEADER ============ */}
        <div className={cn(
          "relative bg-gradient-to-br from-primary/10 via-primary/5 to-background p-3 sm:p-6 border-b shrink-0 transition-all duration-200",
          isHeaderCollapsed && "max-sm:hidden"
        )}>
          <div className="absolute inset-0 opacity-5 hidden sm:block">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }} />
          </div>

          <div className="relative">
            {/* Top Row: Type Badge + Status + Actions */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-4 pr-6 sm:pr-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                {/* Project Type Badge */}
                <Badge className={cn('text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 sm:py-0.5 shrink-0', typeConfig.bgColor, typeConfig.color)}>
                  {typeConfig.label}
                </Badge>

                {/* Status */}
                {isCreateMode ? (
                  <Badge className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/10 text-primary border-primary/20 shrink-0">
                    <Plus className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Nuevo Proyecto</span>
                    <span className="sm:hidden">Nuevo</span>
                  </Badge>
                ) : permissions.can('project.status', 'edit') ? (
                  <SearchableSelect
                    value={project?.status || ''}
                    onValueChange={handleStatusChange}
                    options={statusOptions.map(state => ({ value: state.key, label: state.label }))}
                    placeholder="Estado..."
                    triggerClassName="min-w-[100px] sm:min-w-[140px] h-7 sm:h-9 text-xs sm:text-sm font-medium"
                  />
                ) : (
                  <Badge variant="secondary" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 shrink-0 truncate max-w-[120px] sm:max-w-none">
                    {statusOptions.find(s => s.key === project?.status)?.label || project?.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Config gear button (admin + content only) */}
                {!isCreateMode && source === 'content' && permissions.can('project.delete', 'edit') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                    onClick={() => setShowConfigDialog(true)}
                    title="Configuracion"
                  >
                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}

                {!isCreateMode && editMode && (
                  <span className="hidden sm:inline-flex">
                    <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
                  </span>
                )}

                {!isCreateMode && permissions.canEnterEditMode && (
                  <Button
                    variant={editMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                    className="h-7 sm:h-9 text-[11px] sm:text-sm px-2 sm:px-3"
                  >
                    {editMode ? 'X' : 'Editar'}
                  </Button>
                )}

                {(isCreateMode || editMode) && (
                  <Button onClick={handleSave} disabled={saving} size="sm" className="h-7 sm:h-9 text-[11px] sm:text-sm px-2 sm:px-3">
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin sm:mr-1" />
                    ) : (
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                    )}
                    <span className="hidden sm:inline">{isCreateMode ? 'Crear' : 'Guardar'}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Title with Sequence Number */}
            <DialogHeader className="space-y-1 sm:space-y-2">
              <DialogTitle className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
                {/* Sequence Number Badge (content only) */}
                {source === 'content' && !isCreateMode && project?.contentData?.sequence_number && (
                  <Badge variant="outline" className="text-xs sm:text-sm font-mono shrink-0 bg-primary/5 border-primary/20 text-primary">
                    {project.contentData.sequence_number}
                  </Badge>
                )}
                <span className="flex-1 min-w-0">
                  {(isCreateMode || editMode) && permissions.can('project.title', 'edit') ? (
                    <Input
                      value={formData.title || ''}
                      onChange={(e) => setFormData((prev: Record<string, any>) => ({ ...prev, title: e.target.value }))}
                      className="text-lg sm:text-2xl md:text-3xl font-bold h-auto py-1.5 sm:py-2 bg-background/50"
                      placeholder="Nombre del proyecto..."
                    />
                  ) : (
                    <span className="block truncate sm:whitespace-normal">{project?.title || 'Cargando...'}</span>
                  )}
                </span>
              </DialogTitle>
            </DialogHeader>

            {/* Meta info: participants + content metadata */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-2 sm:mt-4 text-xs sm:text-sm">
              {/* Client badge */}
              {project?.clientName && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-background/50 px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full text-muted-foreground">
                  <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="truncate max-w-[100px] sm:max-w-none">{project.clientName}</span>
                </div>
              )}

              {/* Product badge */}
              {selectedProduct?.name && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-background/50 px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full text-muted-foreground">
                  <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="truncate max-w-[100px] sm:max-w-none">{selectedProduct.name}</span>
                </div>
              )}

              {/* Sphere Phase badge (content only) */}
              {source === 'content' && (() => {
                const phase = SPHERE_PHASES_CONFIG.find(p => p.value === formData.sphere_phase);
                if (!phase) return null;
                const Icon = phase.icon;
                return (
                  <div className={cn("flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full", phase.bgColor, phase.color)}>
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="font-medium">{phase.label}</span>
                  </div>
                );
              })()}

              {/* Campaign week (content only) */}
              {source === 'content' && formData.campaign_week && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-background/50 px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full text-muted-foreground">
                  <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{formData.campaign_week}</span>
                </div>
              )}

              {project?.creatorName && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-background/50 px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full text-muted-foreground">
                  <span className="truncate max-w-[120px] sm:max-w-none">Creador: {project.creatorName}</span>
                </div>
              )}
              {project?.deadline && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-background/50 px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full text-muted-foreground">
                  <span>{new Date(project.deadline).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============ WORKFLOW PROGRESS BAR ============ */}
        {!isCreateMode && project?.status && (
          <div className={cn("px-4 sm:px-6 py-3 border-b bg-muted/10 shrink-0", isHeaderCollapsed && "max-sm:hidden")}>
            <WorkflowProgressBar workflow={workflow} currentStatus={project.status} />
          </div>
        )}

        {/* ============ CONTENT AREA WITH TABS ============ */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-4 sm:p-6">
              <TabSkeleton />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Sticky tab bar */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-2 sm:px-6 pt-3 sm:pt-6 pb-2">
                <TabsList className="w-full h-auto gap-0.5 sm:gap-1 grid grid-cols-3 sm:flex sm:flex-wrap sm:justify-start bg-muted/30 p-0.5 sm:p-1 rounded-lg">
                  {displaySections.map(sectionKey => {
                    const config = SECTION_TAB_CONFIG[sectionKey];
                    const readOnly = permissions.isReadOnly(`project.${sectionKey}` as any);

                    return (
                      <TabsTrigger
                        key={sectionKey}
                        value={sectionKey}
                        className={cn(
                          'text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-center gap-1 sm:gap-1.5 rounded-md transition-all duration-200',
                          'data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground',
                          'hover:bg-background/50',
                        )}
                      >
                        {config.label}
                        {readOnly && <Eye className="h-3 w-3 text-muted-foreground" />}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              <div className="px-4 sm:px-6 pb-4 sm:pb-6">
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
              </div>
            </Tabs>
          )}

          {/* ============ FOOTER: DELETE (inside scroll) ============ */}
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
        </div>
      </DialogContent>

      {/* Content Config Dialog (admin only) */}
      {source === 'content' && project?.organizationId && (
        <ContentConfigDialog
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          organizationId={project.organizationId}
        />
      )}
    </Dialog>
  );
}

export default UnifiedProjectModal;
