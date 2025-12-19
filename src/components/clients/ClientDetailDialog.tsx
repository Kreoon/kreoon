import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Content, STATUS_LABELS, STATUS_COLORS, ClientPackage, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PaymentStatus } from "@/types/database";
import { ProductDetailDialog } from "@/components/products/ProductDetailDialog";
import { ClientPackageDialog } from "@/components/clients/ClientPackageDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Building2, Video, Save, Mail, Phone, Calendar, DollarSign, 
  Package, Plus, Trash2, Edit2, ExternalLink, ShoppingBag, CheckCircle
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

interface Product {
  id: string;
  name: string;
  description: string | null;
  strategy: string | null;
  sales_angles: string[] | null;
  brief_url: string | null;
  created_at: string;
}

interface ClientDetailDialogProps {
  client: {
    id: string;
    name: string;
    logo_url: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    notes: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ClientDetailDialog({ client, open, onOpenChange, onUpdate }: ClientDetailDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [assignedContent, setAssignedContent] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  
  // Packages state
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ClientPackage | null>(null);
  const [showPackageDialog, setShowPackageDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    notes: ""
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        contact_email: client.contact_email || "",
        contact_phone: client.contact_phone || "",
        notes: client.notes || ""
      });
      fetchClientContent();
      fetchProducts();
      fetchPackages();
    }
  }, [client]);

  const fetchPackages = async () => {
    if (!client) return;
    setLoadingPackages(true);
    try {
      const { data } = await supabase
        .from('client_packages')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      setPackages((data || []) as ClientPackage[]);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    try {
      const { error } = await supabase
        .from('client_packages')
        .delete()
        .eq('id', packageId);
      
      if (error) throw error;
      
      toast({ title: "Paquete eliminado" });
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({ 
        title: "Error al eliminar", 
        variant: "destructive" 
      });
    }
  };

  const fetchProducts = async () => {
    if (!client) return;
    setLoadingProducts(true);
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('client_id', client.id)
        .order('name');
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      
      toast({ title: "Producto eliminado" });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ 
        title: "Error al eliminar", 
        description: "El producto puede tener videos asociados",
        variant: "destructive" 
      });
    }
  };

  const fetchClientContent = async () => {
    if (!client) return;
    setLoadingContent(true);
    try {
      const { data } = await supabase
        .from('content')
        .select(`
          *,
          creator:profiles!content_creator_id_fkey(full_name),
          editor:profiles!content_editor_id_fkey(full_name)
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      
      setAssignedContent((data || []) as any[]);
    } catch (error) {
      console.error('Error fetching client content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSave = async () => {
    if (!client) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          notes: formData.notes || null
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Guardado",
        description: "Los cambios se han guardado exitosamente"
      });
      
      setEditMode(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  const totalValue = assignedContent.reduce((sum, c) => {
    return sum + (c.creator_payment || 0) + (c.editor_payment || 0);
  }, 0);

  const completedContent = assignedContent.filter(c => c.status === 'approved' || c.status === 'paid');
  const activeContent = assignedContent.filter(c => !['approved', 'paid'].includes(c.status));

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {client.logo_url ? (
              <img 
                src={client.logo_url} 
                alt={client.name}
                className="h-16 w-16 rounded-lg object-cover ring-2 ring-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center ring-2 ring-border">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">{client.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{client.contact_email}</p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="packages">Paquetes ({packages.length})</TabsTrigger>
            <TabsTrigger value="products">Productos ({products.length})</TabsTrigger>
            <TabsTrigger value="content">Videos ({assignedContent.length})</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Nombre
                </Label>
                {editMode ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{client.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                {editMode ? (
                  <Input
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{client.contact_email || "—"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Teléfono
                </Label>
                {editMode ? (
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{client.contact_phone || "—"}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Notas</Label>
              {editMode ? (
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              ) : (
                <p className="text-sm">{client.notes || "Sin notas"}</p>
              )}
            </div>

            {isAdmin && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                {editMode ? (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditMode(true)}>
                    Editar
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-4 mt-4">
            {isAdmin && (
              <div className="flex justify-end">
                <Button onClick={() => { setSelectedPackage(null); setShowPackageDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Paquete
                </Button>
              </div>
            )}

            {loadingPackages ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-3">No hay paquetes registrados</p>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    onClick={() => { setSelectedPackage(null); setShowPackageDialog(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer paquete
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {packages.map((pkg) => {
                  const pendingAmount = pkg.total_value - pkg.paid_amount;
                  const contentDelivered = assignedContent.filter(c => 
                    ['approved', 'paid'].includes(c.status)
                  ).length;
                  const contentOwed = pkg.content_quantity - contentDelivered;

                  return (
                    <div 
                      key={pkg.id}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
                            <h4 className="font-semibold truncate">{pkg.name}</h4>
                            <Badge className={PAYMENT_STATUS_COLORS[pkg.payment_status as PaymentStatus]}>
                              {PAYMENT_STATUS_LABELS[pkg.payment_status as PaymentStatus]}
                            </Badge>
                          </div>
                          
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                            <div className="p-2 rounded bg-muted/50">
                              <p className="text-muted-foreground">Videos</p>
                              <p className="font-semibold">{pkg.content_quantity}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                              <p className="text-muted-foreground">Hooks/Video</p>
                              <p className="font-semibold">{pkg.hooks_per_video}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                              <p className="text-muted-foreground">Creadores</p>
                              <p className="font-semibold">{pkg.creators_count}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                              <p className="text-muted-foreground">Productos</p>
                              <p className="font-semibold">{pkg.product_ids?.length || pkg.products_count}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-primary" />
                              <span className="font-medium">${pkg.total_value.toLocaleString()}</span>
                              <span className="text-muted-foreground">valor</span>
                            </div>
                            {pkg.payment_status === 'paid' ? (
                              <div className="flex items-center gap-1 text-success">
                                <CheckCircle className="h-4 w-4" />
                                <span>Pagado completo</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1 text-success">
                                  <span className="font-medium">${pkg.paid_amount.toLocaleString()}</span>
                                  <span className="text-muted-foreground">recaudado</span>
                                </div>
                                <div className="flex items-center gap-1 text-warning">
                                  <span className="font-medium">${pendingAmount.toLocaleString()}</span>
                                  <span className="text-muted-foreground">pendiente</span>
                                </div>
                              </>
                            )}
                            {contentOwed > 0 && pkg.payment_status === 'paid' && (
                              <div className="flex items-center gap-1 text-info">
                                <Video className="h-4 w-4" />
                                <span className="font-medium">{contentOwed}</span>
                                <span className="text-muted-foreground">videos por entregar</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setSelectedPackage(pkg); setShowPackageDialog(true); }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar paquete?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará permanentemente "{pkg.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePackage(pkg.id)}
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
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4 mt-4">
            {isAdmin && (
              <div className="flex justify-end">
                <Button onClick={() => { setSelectedProduct(null); setShowProductDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </div>
            )}

            {loadingProducts ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-3">No hay productos registrados</p>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    onClick={() => { setSelectedProduct(null); setShowProductDialog(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer producto
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {products.map((product) => (
                  <div 
                    key={product.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-primary shrink-0" />
                          <h4 className="font-semibold truncate">{product.name}</h4>
                        </div>
                        
                        {product.sales_angles && product.sales_angles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {product.sales_angles.slice(0, 3).map((angle, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {angle}
                              </Badge>
                            ))}
                            {product.sales_angles.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{product.sales_angles.length - 3} más
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Creado: {formatDate(product.created_at)}</span>
                          {product.brief_url && (
                            <a 
                              href={product.brief_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Brief
                            </a>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setSelectedProduct(product); setShowProductDialog(true); }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente "{product.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteProduct(product.id)}
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
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            {loadingContent ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : assignedContent.length === 0 ? (
              <div className="text-center py-8">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No tiene proyectos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeContent.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Activos ({activeContent.length})</h4>
                    <div className="space-y-2">
                      {activeContent.map(content => (
                        <div key={content.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{content.title}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              {content.creator && <span>Creador: {content.creator.full_name}</span>}
                              {content.editor && <span>Editor: {content.editor.full_name}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={STATUS_COLORS[content.status]} variant="secondary">
                              {STATUS_LABELS[content.status]}
                            </Badge>
                            {content.deadline && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(content.deadline)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {completedContent.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Completados ({completedContent.length})</h4>
                    <div className="space-y-2">
                      {completedContent.slice(0, 5).map(content => (
                        <div key={content.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{content.title}</p>
                          </div>
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            Completado
                          </Badge>
                        </div>
                      ))}
                      {completedContent.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          + {completedContent.length - 5} más
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-6 mt-4">
            {/* Content Stats */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Contenido</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-primary">{assignedContent.length}</p>
                  <p className="text-xs text-muted-foreground">Total videos</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-info">{activeContent.length}</p>
                  <p className="text-xs text-muted-foreground">En progreso</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-success">{completedContent.length}</p>
                  <p className="text-xs text-muted-foreground">Completados</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-primary">{products.length}</p>
                  <p className="text-xs text-muted-foreground">Productos</p>
                </div>
              </div>
            </div>

            {/* Engagement Stats */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Engagement</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-primary">
                    {assignedContent.reduce((sum, c) => sum + (c.views_count || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Vistas totales</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-pink-500">
                    {assignedContent.reduce((sum, c) => sum + (c.likes_count || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Likes totales</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-success">
                    {assignedContent.filter(c => c.is_published).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Publicados</p>
                </div>
              </div>
            </div>

            {/* Financial Stats */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Finanzas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-success flex items-center justify-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {packages.reduce((sum, p) => sum + (p.total_value || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Valor contratado</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {packages.reduce((sum, p) => sum + (p.paid_amount || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Pagado</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-warning flex items-center justify-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {packages.reduce((sum, p) => sum + ((p.total_value || 0) - (p.paid_amount || 0)), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-muted-foreground flex items-center justify-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {totalValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Costo producción</p>
                </div>
              </div>
            </div>

            {/* Packages Stats */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Paquetes</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-primary">{packages.length}</p>
                  <p className="text-xs text-muted-foreground">Total paquetes</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-success">
                    {packages.filter(p => p.payment_status === 'paid').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Pagados</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-info">
                    {packages.reduce((sum, p) => sum + (p.content_quantity || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Videos contratados</p>
                </div>
                <div className="p-4 rounded-lg border bg-card text-center">
                  <p className="text-2xl font-bold text-warning">
                    {packages.reduce((sum, p) => sum + (p.content_quantity || 0), 0) - completedContent.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Videos pendientes</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Product Dialog */}
      <ProductDetailDialog
        product={selectedProduct as any}
        clientId={client.id}
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        onSave={() => {
          fetchProducts();
          setShowProductDialog(false);
        }}
      />

      {/* Package Dialog */}
      <ClientPackageDialog
        clientId={client.id}
        package_={selectedPackage}
        products={products as any}
        open={showPackageDialog}
        onOpenChange={setShowPackageDialog}
        onSuccess={fetchPackages}
      />
    </Dialog>
  );
}
