import { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutoSaveIndicator } from '@/components/ui/autosave-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ProductDetailDialog } from '@/components/products/ProductDetailDialog';
import { ProductSelector } from '@/components/products/ProductSelector';
import { ContentConfigDialog } from './Config';
import { STATUS_LABELS, STATUS_COLORS, ContentStatus, STATUS_ORDER } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { useContentDetail } from './hooks/useContentDetail';
import { useContentPermissions } from './hooks/useContentPermissions';
import { useBlockConfig } from './hooks/useBlockConfig';
import { useContentCreate } from './hooks/useContentCreate';
import { BlockKey } from './Config/types';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Package, Target, Save, Trash2, Share2, Settings, Lock, Eye, Plus, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentDetailDialogProps, ContentFormData, SelectOption } from './types';
import { useInternalBrandClient } from '@/hooks/useInternalBrandClient';

// Lazy load tabs
const ScriptsTab = lazy(() => import('./tabs/ScriptsTab').then(m => ({ default: m.ScriptsTab })));
const VideoTab = lazy(() => import('./tabs/VideoTab').then(m => ({ default: m.VideoTab })));
const GeneralTab = lazy(() => import('./tabs/GeneralTab').then(m => ({ default: m.GeneralTab })));
const TeamTab = lazy(() => import('./tabs/TeamTab').then(m => ({ default: m.TeamTab })));
const DatesTab = lazy(() => import('./tabs/DatesTab').then(m => ({ default: m.DatesTab })));
const PaymentsTab = lazy(() => import('./tabs/PaymentsTab').then(m => ({ default: m.PaymentsTab })));
const MaterialTab = lazy(() => import('./tabs/MaterialTab').then(m => ({ default: m.MaterialTab })));

// Map tab keys to block keys
const TAB_TO_BLOCK: Record<string, BlockKey> = {
  scripts: 'script',
  video: 'video',
  material: 'material',
  general: 'script',
  team: 'team',
  dates: 'dates',
  payments: 'payments',
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

export function ContentDetailDialog({ 
  content, 
  open, 
  onOpenChange, 
  onUpdate, 
  onDelete,
  mode = 'view'
}: ContentDetailDialogProps) {
  const { isAdmin, isClient, user } = useAuth();
  const { internalBrandClient } = useInternalBrandClient();
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('scripts');
  const [clients, setClients] = useState<SelectOption[]>([]);
  
  const isCreateMode = mode === 'create';
  
  // View mode hooks
  const viewHooks = useContentDetail({ content: isCreateMode ? null : content, onUpdate });
  const permissions = useContentPermissions(isCreateMode ? null : content);
  const blockConfig = useBlockConfig(isCreateMode ? null : content);
  
  // Create mode hooks
  const createHooks = useContentCreate({
    onSuccess: onUpdate,
    onClose: () => onOpenChange(false)
  });

  // Unified state based on mode
  const formData = isCreateMode ? createHooks.formData : viewHooks.formData;
  const setFormData = isCreateMode ? createHooks.setFormData : viewHooks.setFormData;
  const selectedProduct = isCreateMode ? createHooks.selectedProduct : viewHooks.selectedProduct;
  const handleProductChange = isCreateMode ? createHooks.handleProductChange : viewHooks.handleProductChange;
  const loading = isCreateMode ? createHooks.loading : viewHooks.loading;
  const saving = isCreateMode ? createHooks.saving : viewHooks.loading;

  // In create mode, always in edit mode
  const editMode = isCreateMode ? true : viewHooks.editMode;
  const setEditMode = isCreateMode ? () => {} : viewHooks.setEditMode;

  // Fetch clients for header selector
  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, is_internal_brand')
        .order('name');
      
      // Mark internal brand client for special display and sort first
      const clientsWithFlags = (data || []).map(c => ({
        ...c,
        is_internal_brand: c.is_internal_brand === true
      }));
      
      clientsWithFlags.sort((a, b) => {
        if (a.is_internal_brand && !b.is_internal_brand) return -1;
        if (!a.is_internal_brand && b.is_internal_brand) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setClients(clientsWithFlags);
    };
    if (open) {
      fetchClients();
    }
  }, [open]);

  // Get client name from formData
  const getClientName = () => {
    if (formData.client_id) {
      return clients.find(c => c.id === formData.client_id)?.name;
    }
    return content?.client?.name;
  };

  // Handle client change - also clear product when client changes
  const handleClientChange = (clientId: string) => {
    setFormData((prev: ContentFormData) => ({ 
      ...prev, 
      client_id: clientId,
      product_id: '', // Clear product when client changes
      product: ''
    }));
  };

  // Combine permissions with block config for effective visible tabs
  const effectiveVisibleTabs = useMemo(() => {
    if (isCreateMode) {
      return ['scripts', 'general', 'team', 'dates', 'payments'] as const;
    }
    return permissions.visibleTabs.filter(tabKey => {
      const blockKey = TAB_TO_BLOCK[tabKey];
      if (!blockKey) return true;
      return blockConfig.canViewBlock(blockKey);
    });
  }, [isCreateMode, permissions.visibleTabs, blockConfig]);

  const isTabLocked = (tabKey: string): boolean => {
    if (isCreateMode) return false;
    const blockKey = TAB_TO_BLOCK[tabKey];
    if (!blockKey) return false;
    return blockConfig.isBlockLocked(blockKey);
  };

  const isTabReadOnly = (tabKey: string): boolean => {
    if (isCreateMode) return false;
    const blockKey = TAB_TO_BLOCK[tabKey];
    if (!blockKey) return false;
    return !blockConfig.canEditBlock(blockKey);
  };

  if (!isCreateMode && !content) return null;

  const formatDate = (date: string | null) => {
    if (!date) return 'Sin fecha';
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
  };

  const displayContent = isCreateMode 
    ? { 
        id: '', 
        title: formData.title || 'Nuevo Proyecto',
        status: 'draft' as ContentStatus,
        client: null,
        client_id: formData.client_id,
        campaign_week: formData.campaign_week,
        start_date: formData.start_date,
        deadline: formData.deadline,
        sequence_number: null,
      } as any
    : content;

  const effectivePermissions = isCreateMode 
    ? {
        can: () => true,
        visibleTabs: ['scripts', 'general', 'team', 'dates', 'payments'] as any[],
        isReadOnly: () => false,
        canEnterEditMode: true,
      }
    : permissions;

  // Check if user can edit client/product (admin or edit mode with general permission)
  const canEditClientProduct = isCreateMode || (editMode && effectivePermissions.can('content.general', 'edit'));

  const tabProps = {
    content: displayContent,
    formData,
    setFormData,
    editMode: editMode && !isTabLocked(activeTab) && !isTabReadOnly(activeTab),
    setEditMode,
    permissions: effectivePermissions,
    onUpdate,
    readOnly: isTabReadOnly(activeTab),
  };

  const TAB_CONFIG: Record<string, { label: string; icon?: string; component: React.ReactNode }> = {
    scripts: { label: 'Guion', icon: '📝', component: <ScriptsTab {...tabProps} selectedProduct={selectedProduct} onProductChange={handleProductChange} /> },
    video: { label: 'Video', icon: '🎬', component: <VideoTab {...tabProps} selectedProduct={selectedProduct} /> },
    material: { label: 'Material', icon: '📁', component: <MaterialTab {...tabProps} /> },
    general: { label: 'General', icon: '⚙️', component: <GeneralTab {...tabProps} selectedProduct={selectedProduct} onProductChange={handleProductChange} /> },
    team: { label: 'Equipo', icon: '👥', component: <TeamTab {...tabProps} /> },
    dates: { label: 'Fechas', icon: '📅', component: <DatesTab {...tabProps} /> },
    payments: { label: 'Finanzas', icon: '💰', component: <PaymentsTab {...tabProps} /> }
  };

  const handleSave = () => {
    if (isCreateMode) {
      createHooks.handleCreate();
    } else {
      viewHooks.handleSave();
    }
  };

  const handleClose = () => {
    if (isCreateMode) {
      createHooks.resetForm();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-5xl max-h-[90vh] overflow-hidden p-0">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8 border-b">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{ 
              backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }} />
          </div>
          
          <div className="relative">
            {/* Top Row: Status & Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isCreateMode ? (
                  <Badge className="text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20">
                    <Plus className="h-3 w-3 mr-1" />
                    Nuevo Proyecto
                  </Badge>
                ) : effectivePermissions.can('content.status', 'edit') ? (
                  <Select 
                    value={viewHooks.currentStatus || content?.status} 
                    onValueChange={(v) => viewHooks.handleStatusChange(v as ContentStatus)}
                    disabled={loading}
                  >
                    <SelectTrigger className={`w-auto min-w-[140px] text-sm font-medium ${STATUS_COLORS[viewHooks.currentStatus || content?.status || 'draft']}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map(status => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[content?.status || 'draft']}`}>
                    {STATUS_LABELS[content?.status || 'draft']}
                  </Badge>
                )}
                
                {!isCreateMode && formData.is_published && (
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    <Share2 className="h-3 w-3 mr-1" />
                    Publicado
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {!isCreateMode && isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfigDialog(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                
                {!isCreateMode && editMode && (
                  <AutoSaveIndicator 
                    status={viewHooks.autoSaveStatus} 
                    lastSaved={viewHooks.lastSaved} 
                  />
                )}
                
                {!isCreateMode && effectivePermissions.canEnterEditMode && (
                  <Button
                    variant={editMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? 'Cancelar' : 'Editar'}
                  </Button>
                )}
                
                {editMode && (
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

            {/* Title with Sequence Number */}
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
                {/* Sequence Number Badge */}
                {!isCreateMode && displayContent.sequence_number && (
                  <Badge variant="outline" className="text-sm font-mono shrink-0 bg-primary/5 border-primary/20 text-primary">
                    {displayContent.sequence_number}
                  </Badge>
                )}
                {isCreateMode && (
                  <Badge variant="outline" className="text-sm font-mono shrink-0 bg-muted/50 border-dashed text-muted-foreground">
                    Auto
                  </Badge>
                )}
                <span className="flex-1">
                  {editMode && (isCreateMode || effectivePermissions.can('content.title', 'edit')) ? (
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData((prev: ContentFormData) => ({ ...prev, title: e.target.value }))}
                      className="text-2xl sm:text-3xl font-bold h-auto py-2 bg-background/50"
                      placeholder="Nombre del proyecto..."
                    />
                  ) : (
                    displayContent.title
                  )}
                </span>
              </DialogTitle>
            </DialogHeader>

            {/* Meta Info Row - Client & Product Selectors */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
              {/* Cliente Selector/Badge */}
              {canEditClientProduct ? (
                <div className="flex items-center gap-1.5 bg-background/80 rounded-lg border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border-r border-border/50">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Cliente</span>
                  </div>
                  <Select value={formData.client_id || ''} onValueChange={handleClientChange}>
                    <SelectTrigger className="border-0 bg-transparent h-8 min-w-[140px] text-sm focus:ring-0">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.is_internal_brand ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              🏅 {c.name} (Marca Interna)
                            </span>
                          ) : (
                            c.name
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : getClientName() ? (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{getClientName()}</span>
                </div>
              ) : null}

              {/* Producto Selector/Badge */}
              {canEditClientProduct ? (
                <div className="flex items-center gap-1.5 bg-background/80 rounded-lg border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border-r border-border/50">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Producto</span>
                  </div>
                  <div className="px-2">
                    <ProductSelector
                      clientId={formData.client_id || null}
                      value={formData.product_id || ''}
                      onChange={handleProductChange}
                    />
                  </div>
                </div>
              ) : selectedProduct?.name ? (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedProduct.name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowProductDialog(true)} 
                    className="h-5 px-1 text-xs ml-1"
                  >
                    Ver
                  </Button>
                </div>
              ) : null}

              {/* Fecha de Inicio */}
              {editMode ? (
                <div className="flex items-center gap-1.5 bg-background/80 rounded-lg border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border-r border-border/50">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Inicio</span>
                  </div>
                  <Input
                    type="date"
                    value={formData.start_date ? format(new Date(formData.start_date), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setFormData((prev: ContentFormData) => ({ 
                      ...prev, 
                      start_date: e.target.value ? new Date(e.target.value).toISOString() : null 
                    }))}
                    className="border-0 bg-transparent h-8 w-auto text-sm focus-visible:ring-0"
                  />
                </div>
              ) : displayContent.start_date ? (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Inicio: {formatDate(displayContent.start_date)}</span>
                </div>
              ) : null}

              {/* Semana o Campaña */}
              {editMode ? (
                <div className="flex items-center gap-1.5 bg-background/80 rounded-lg border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border-r border-border/50">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Semana o Campaña</span>
                  </div>
                  <Input
                    value={formData.campaign_week || ''}
                    onChange={(e) => setFormData((prev: ContentFormData) => ({ 
                      ...prev, 
                      campaign_week: e.target.value 
                    }))}
                    className="border-0 bg-transparent h-8 w-[120px] text-sm focus-visible:ring-0"
                    placeholder="Ej: S1, Campaña 2"
                  />
                </div>
              ) : displayContent.campaign_week ? (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>{displayContent.campaign_week}</span>
                </div>
              ) : null}

              {/* Deadline (read-only in header, editable in DatesTab) */}
              {displayContent.deadline && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Entrega: {formatDate(displayContent.deadline)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area with Tabs */}
        <div className="overflow-y-auto max-h-[calc(90vh-220px)] p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-auto gap-1 mb-6 flex flex-wrap justify-start bg-muted/30 p-1 rounded-lg">
              {effectiveVisibleTabs.map(tabKey => {
                const locked = isTabLocked(tabKey);
                const readOnly = isTabReadOnly(tabKey);
                const config = TAB_CONFIG[tabKey];
                
                return (
                  <TabsTrigger 
                    key={tabKey} 
                    value={tabKey} 
                    className={cn(
                      "text-xs sm:text-sm px-3 py-2 flex items-center gap-1.5 rounded-md transition-all duration-200",
                      "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground",
                      "hover:bg-background/50",
                      locked && "border-warning/50",
                      readOnly && !locked && "border-dashed"
                    )}
                  >
                    {config?.icon && <span className="text-sm">{config.icon}</span>}
                    <span className="hidden sm:inline">{config?.label}</span>
                    {locked && <Lock className="h-3 w-3 text-warning" />}
                    {readOnly && !locked && <Eye className="h-3 w-3 text-muted-foreground" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {effectiveVisibleTabs.map(tabKey => {
              const locked = isTabLocked(tabKey);
              const readOnly = isTabReadOnly(tabKey);
              
              return (
                <TabsContent key={tabKey} value={tabKey} className="mt-4 relative">
                  {(locked || readOnly) && (
                    <div className={cn(
                      "absolute top-0 right-0 z-10 flex items-center gap-1 px-2 py-1 text-xs rounded-bl-lg",
                      locked ? "bg-warning/20 text-warning" : "bg-muted/80 text-muted-foreground"
                    )}>
                      {locked ? <Lock className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {locked ? 'Bloqueado' : 'Solo lectura'}
                    </div>
                  )}
                  <Suspense fallback={<TabSkeleton />}>
                    {TAB_CONFIG[tabKey]?.component}
                  </Suspense>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        {/* Footer Actions - Delete */}
        {!isCreateMode && effectivePermissions.can('content.delete', 'edit') && (
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
                  <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente el proyecto "{content?.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete?.(content!.id);
                      onOpenChange(false);
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

      {/* Product Dialog */}
      <ProductDetailDialog
        product={selectedProduct}
        clientId={formData.client_id}
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        onSave={() => {}}
      />

      {/* Content Config Dialog */}
      {!isCreateMode && isAdmin && (
        <ContentConfigDialog
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          organizationId={(content as any)?.organization_id || null}
        />
      )}
    </Dialog>
  );
}

export default ContentDetailDialog;
