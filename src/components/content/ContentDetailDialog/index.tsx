import { useState, useEffect, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Content, STATUS_LABELS, STATUS_COLORS, ContentStatus, STATUS_ORDER } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar, Save, Clock, Share2, Package, Target, Trash2, Loader2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Types
import { ContentDetailDialogProps, ContentFormData, TabKey } from "./types";

// Hooks
import { useContentDetail } from "./hooks/useContentDetail";
import { useContentPermissions } from "./hooks/useContentPermissions";

// Lazy loaded tabs
const ScriptsTab = lazy(() => import("./tabs/ScriptsTab").then(m => ({ default: m.ScriptsTab })));
const VideoTab = lazy(() => import("./tabs/VideoTab").then(m => ({ default: m.VideoTab })));
const MaterialTab = lazy(() => import("./tabs/MaterialTab").then(m => ({ default: m.MaterialTab })));
const GeneralTab = lazy(() => import("./tabs/GeneralTab").then(m => ({ default: m.GeneralTab })));
const TeamTab = lazy(() => import("./tabs/TeamTab").then(m => ({ default: m.TeamTab })));
const DatesTab = lazy(() => import("./tabs/DatesTab").then(m => ({ default: m.DatesTab })));
const PaymentsTab = lazy(() => import("./tabs/PaymentsTab").then(m => ({ default: m.PaymentsTab })));

// Tab loading skeleton
function TabSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

// Tab configuration for rendering
const TAB_CONFIG: { key: TabKey; label: string; shortLabel?: string }[] = [
  { key: 'scripts', label: 'Scripts' },
  { key: 'video', label: 'Video' },
  { key: 'material', label: 'Material' },
  { key: 'general', label: 'General' },
  { key: 'equipo', label: 'Equipo' },
  { key: 'fechas', label: 'Fechas' },
  { key: 'pagos', label: 'Pagos' },
];

export function ContentDetailDialog({ 
  content, 
  open, 
  onOpenChange, 
  onUpdate, 
  onDelete 
}: ContentDetailDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  
  const [activeTab, setActiveTab] = useState<TabKey>('scripts');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ContentStatus | null>(null);

  // Custom hooks
  const {
    formData,
    setFormData,
    selectedProduct,
    handleProductChange,
    handleSave,
    hasUnsavedChanges
  } = useContentDetail(content, onUpdate);

  const permissions = useContentPermissions(content);

  // Sync unsaved changes with context
  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
    return () => setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  // Initialize current status from content
  useEffect(() => {
    if (content) {
      setCurrentStatus(content.status);
    }
  }, [content]);

  // Handle status change
  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (!content) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('content')
        .update({ status: newStatus })
        .eq('id', content.id);
      if (error) throw error;
      setCurrentStatus(newStatus);
      toast({ title: "Estado actualizado", description: `Nuevo estado: ${STATUS_LABELS[newStatus]}` });
      onUpdate?.();
    } catch (error) {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handle save with loading state
  const onSave = async () => {
    setLoading(true);
    try {
      await handleSave();
      setEditMode(false);
      toast({ title: "Guardado", description: "Los cambios se han guardado exitosamente" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron guardar los cambios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Format date helper
  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
  };

  if (!content) return null;

  // Filter visible tabs based on permissions
  const visibleTabsConfig = TAB_CONFIG.filter(tab => permissions.visibleTabs.includes(tab.key));

  // Tab props to pass to each tab component
  const tabProps = {
    content,
    formData,
    setFormData,
    editMode,
    setEditMode,
    permissions,
    onUpdate,
    loading,
    setLoading
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-5xl max-h-[90vh] overflow-hidden p-0">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8 border-b">
          {/* Background Pattern */}
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
                {permissions.can('content.status', 'edit') ? (
                  <Select 
                    value={currentStatus || content.status} 
                    onValueChange={(v) => handleStatusChange(v as ContentStatus)}
                    disabled={loading}
                  >
                    <SelectTrigger className={`w-auto min-w-[140px] text-sm font-medium ${STATUS_COLORS[currentStatus || content.status]}`}>
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
                  <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[content.status]}`}>
                    {STATUS_LABELS[content.status]}
                  </Badge>
                )}
                
                {formData.is_published && (
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    <Share2 className="h-3 w-3 mr-1" />
                    Publicado
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {permissions.canEnterEditMode && (
                  <Button
                    variant={editMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? "Cancelar" : "Editar"}
                  </Button>
                )}
                {editMode && (
                  <Button onClick={onSave} disabled={loading} size="sm">
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Guardar
                  </Button>
                )}
              </div>
            </div>

            {/* Title */}
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                {editMode && permissions.can('content.general', 'edit') ? (
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="text-2xl sm:text-3xl font-bold h-auto py-2 bg-background/50"
                  />
                ) : (
                  content.title
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              {content.client?.name && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Package className="h-4 w-4" />
                  <span>{content.client.name}</span>
                </div>
              )}
              {selectedProduct?.name && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Target className="h-4 w-4" />
                  <span>{selectedProduct.name}</span>
                </div>
              )}
              {content.campaign_week && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Calendar className="h-4 w-4" />
                  <span>{content.campaign_week}</span>
                </div>
              )}
              {content.deadline && (
                <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full">
                  <Clock className="h-4 w-4" />
                  <span>Entrega: {formatDate(content.deadline)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area with Tabs */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            <TabsList className={`grid w-full h-auto gap-1 mb-6`} style={{
              gridTemplateColumns: `repeat(${Math.min(visibleTabsConfig.length, 7)}, minmax(0, 1fr))`
            }}>
              {visibleTabsConfig.map(tab => (
                <TabsTrigger 
                  key={tab.key} 
                  value={tab.key} 
                  className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Suspense fallback={<TabSkeleton />}>
              {/* Scripts Tab */}
              {permissions.visibleTabs.includes('scripts') && (
                <TabsContent value="scripts">
                  <ScriptsTab {...tabProps} selectedProduct={selectedProduct} onProductChange={handleProductChange} />
                </TabsContent>
              )}

              {/* Video Tab */}
              {permissions.visibleTabs.includes('video') && (
                <TabsContent value="video">
                  <VideoTab {...tabProps} selectedProduct={selectedProduct} />
                </TabsContent>
              )}

              {/* Material Tab */}
              {permissions.visibleTabs.includes('material') && (
                <TabsContent value="material">
                  <MaterialTab {...tabProps} />
                </TabsContent>
              )}

              {/* General Tab */}
              {permissions.visibleTabs.includes('general') && (
                <TabsContent value="general">
                  <GeneralTab {...tabProps} selectedProduct={selectedProduct} onProductChange={handleProductChange} />
                </TabsContent>
              )}

              {/* Team Tab */}
              {permissions.visibleTabs.includes('equipo') && (
                <TabsContent value="equipo">
                  <TeamTab {...tabProps} />
                </TabsContent>
              )}

              {/* Dates Tab */}
              {permissions.visibleTabs.includes('fechas') && (
                <TabsContent value="fechas">
                  <DatesTab {...tabProps} />
                </TabsContent>
              )}

              {/* Payments Tab */}
              {permissions.visibleTabs.includes('pagos') && (
                <TabsContent value="pagos">
                  <PaymentsTab {...tabProps} />
                </TabsContent>
              )}
            </Suspense>
          </Tabs>
        </div>

        {/* Footer Actions - Delete only */}
        {permissions.can('content.delete', 'delete') && (
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
                    Esta acción no se puede deshacer. Se eliminará permanentemente el proyecto "{content.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete?.(content.id);
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
    </Dialog>
  );
}

// Re-export for backwards compatibility
export default ContentDetailDialog;
