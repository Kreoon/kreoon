import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Content, STATUS_LABELS, STATUS_COLORS, ClientPackage, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PaymentStatus } from "@/types/database";
import { ProductDetailDialog } from "@/components/products/ProductDetailDialog";
import { ProductDNAWizard } from "@/components/product-dna";
import { ClientPackageDialog } from "@/components/clients/ClientPackageDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2, Video, Mail, Phone, Calendar, DollarSign,
  Package, Plus, Trash2, Edit2, ShoppingBag, CheckCircle,
  Star, Eye, Settings, Radio, Dna, Sparkles, FolderOpen, FileText, Target, Loader2, Handshake,
  TrendingUp, MapPin, Save
} from "lucide-react";
import { LazyRichTextViewer as RichTextViewer } from "@/components/ui/lazy-rich-text-editor";
import { Card, CardContent } from "@/components/ui/card";
import { ClientStreamingChannels } from "@/components/clients/ClientStreamingChannels";
import { ClientBillingTab } from "@/components/clients/ClientBillingTab";
import { ClientServicesTab } from "@/components/clients/ClientServicesTab";
import { ClientActivityPanel } from "@/components/clients/ClientActivityPanel";
import { VipBadge } from "@/components/ui/vip-badge";

// Lazy load ClientDNATab (424KB) - only loads when DNA tab is active
const ClientDNATab = lazy(() => import('@/components/clients/dna/ClientDNATab').then(m => ({ default: m.ClientDNATab })));
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { CompanyProfileEditor } from "@/components/portfolio/CompanyProfileEditor";
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
  onboarding_url: string | null;
  research_url: string | null;
  brief_data?: any;
  created_at: string;
  product_code?: number;
}

interface ClientDetailDialogProps {
  client: {
    id: string;
    name: string;
    logo_url: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    notes: string | null;
    is_vip?: boolean;
    username?: string | null;
    organization_id?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  initialTab?: string;
}

export function ClientDetailDialog({ client, open, onOpenChange, onUpdate, initialTab }: ClientDetailDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const pendingRefreshRef = useRef(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      onUpdate?.();
    }
    onOpenChange(nextOpen);
  };
  const [editMode, setEditMode] = useState(false);
  const [assignedContent, setAssignedContent] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCreateProductWizard, setShowCreateProductWizard] = useState(false);
  
  // Packages state
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ClientPackage | null>(null);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  
  // Company Profile Editor
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [fullClientData, setFullClientData] = useState<any>(null);

  // Origin fields
  const [originData, setOriginData] = useState({ lead_source: '', community_name: '', referred_by: '' });
  const [savingOrigin, setSavingOrigin] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    notes: "",
    is_vip: false
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        contact_email: client.contact_email || "",
        contact_phone: client.contact_phone || "",
        notes: client.notes || "",
        is_vip: client.is_vip ?? false
      });
      fetchClientContent();
      fetchProducts();
      fetchPackages();
      fetchFullClientData();
    }
  }, [client]);

  const fetchFullClientData = async () => {
    if (!client) return;
    try {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client.id)
        .single();
      setFullClientData(data);
      if (data) {
        setOriginData({
          lead_source: data.lead_source ?? '',
          community_name: data.community_name ?? '',
          referred_by: data.referred_by ?? '',
        });
      }
    } catch (error) {
      console.error('Error fetching full client data:', error);
    }
  };

  const handleSaveOrigin = async () => {
    if (!client) return;
    setSavingOrigin(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          lead_source: originData.lead_source || null,
          community_name: originData.community_name || null,
          referred_by: originData.referred_by || null,
        })
        .eq('id', client.id);
      if (error) throw error;
      toast({ title: 'Origen guardado' });
      pendingRefreshRef.current = true;
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSavingOrigin(false);
    }
  };

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
      
      toast({ title: "Campaña eliminada" });
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
        .order('product_code', { ascending: true });
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
      // Primero obtenemos el contenido básico
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('client_id', client.id)
        .eq('organization_id', client.organization_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching content:', error);
        setAssignedContent([]);
        return;
      }

      // Luego obtenemos los perfiles de creadores y editores
      const contentWithProfiles = await Promise.all((data || []).map(async (item) => {
        let creator = null;
        let editor = null;

        if (item.creator_id) {
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', item.creator_id)
            .maybeSingle();
          creator = creatorData;
        }

        if (item.editor_id) {
          const { data: editorData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', item.editor_id)
            .maybeSingle();
          editor = editorData;
        }

        return { ...item, creator, editor };
      }));
      
      setAssignedContent(contentWithProfiles as any[]);
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
          notes: formData.notes || null,
          is_vip: formData.is_vip
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Guardado",
        description: "Los cambios se han guardado exitosamente"
      });
      
      setEditMode(false);
      pendingRefreshRef.current = true;
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full sm:max-w-4xl max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <div className="flex items-center gap-4">
            {client.logo_url ? (
              <img 
                src={client.logo_url} 
                alt={client.name}
                className="h-16 w-16 rounded-sm object-cover ring-2 ring-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-sm bg-primary/10 flex items-center justify-center ring-2 ring-border">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">{client.name}</DialogTitle>
                {formData.is_vip && <VipBadge size="sm" variant="minimal" />}
              </div>
              <p className="text-sm text-muted-foreground">{client.contact_email}</p>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/empresa/${client.username || client.id}`);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver perfil
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue={initialTab ?? "info"} className="mt-4">
          <TabsList className="flex w-full overflow-x-auto gap-0.5 h-auto flex-wrap">
            <TabsTrigger value="info" className="flex-none">Info</TabsTrigger>
            <TabsTrigger value="finanzas" className="flex-none gap-1">
              <TrendingUp className="h-3 w-3" />
              Finanzas
            </TabsTrigger>
            <TabsTrigger value="origen" className="flex-none gap-1">
              <MapPin className="h-3 w-3" />
              Origen
            </TabsTrigger>
            <TabsTrigger value="dna" className="flex-none gap-1">
              <Dna className="h-3 w-3" />
              ADN Marca
            </TabsTrigger>
            <TabsTrigger value="products" className="flex-none gap-1">
              <Package className="h-3 w-3" />
              Productos ({products.length})
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex-none">Servicios ({packages.length})</TabsTrigger>
            <TabsTrigger value="content" className="flex-none">Videos ({assignedContent.length})</TabsTrigger>
            <TabsTrigger value="channels" className="flex-none gap-1">
              <Radio className="h-3 w-3" />
              Canales
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-none">Stats</TabsTrigger>
            <TabsTrigger value="billing" className="flex-none gap-1">
              <DollarSign className="h-3 w-3" />
              Cobros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Admin: Full Profile Editor Button */}
            {isAdmin && fullClientData && (
              <div className="p-4 rounded-sm border bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Perfil completo de la empresa</p>
                      <p className="text-xs text-muted-foreground">
                        Edita todos los datos: documento legal, ubicación, redes sociales, categoría, etc.
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => setShowProfileEditor(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar perfil completo
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Nombre
                </Label>
                <p className="font-medium">{fullClientData?.name || client.name}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <p className="font-medium">{fullClientData?.contact_email || client.contact_email || "—"}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Teléfono
                </Label>
                <p className="font-medium">{fullClientData?.contact_phone || client.contact_phone || "—"}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Contacto principal</Label>
                <p className="font-medium">{fullClientData?.main_contact || "—"}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Documento</Label>
                <p className="font-medium">
                  {fullClientData?.document_type ? `${fullClientData.document_type.toUpperCase()}: ${fullClientData.document_number || "—"}` : "—"}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Categoría</Label>
                <p className="font-medium">{fullClientData?.category || "—"}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Ubicación</Label>
                <p className="font-medium">
                  {[fullClientData?.city, fullClientData?.country].filter(Boolean).join(", ") || "—"}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Sitio Web</Label>
                <p className="font-medium">{fullClientData?.website || "—"}</p>
              </div>
            </div>

            {/* Social Links */}
            {(fullClientData?.instagram || fullClientData?.tiktok || fullClientData?.facebook || fullClientData?.linkedin) && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Redes sociales</Label>
                <div className="flex flex-wrap gap-2">
                  {fullClientData?.instagram && (
                    <Badge variant="outline">Instagram: {fullClientData.instagram}</Badge>
                  )}
                  {fullClientData?.tiktok && (
                    <Badge variant="outline">TikTok: {fullClientData.tiktok}</Badge>
                  )}
                  {fullClientData?.facebook && (
                    <Badge variant="outline">Facebook: {fullClientData.facebook}</Badge>
                  )}
                  {fullClientData?.linkedin && (
                    <Badge variant="outline">LinkedIn: {fullClientData.linkedin}</Badge>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Descripción</Label>
              <p className="text-sm">{fullClientData?.bio || client.notes || "Sin descripción"}</p>
            </div>

            {/* VIP Toggle - Admin only */}
            {isAdmin && (
              <div className="flex items-center justify-between p-4 rounded-sm border bg-card">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Cliente VIP</p>
                    <p className="text-xs text-muted-foreground">
                      Mostrar insignia VIP en el perfil de la empresa
                    </p>
                  </div>
                </div>
                <Switch
                  checked={fullClientData?.is_vip ?? formData.is_vip}
                  onCheckedChange={async (checked) => {
                    try {
                      await supabase
                        .from('clients')
                        .update({ is_vip: checked })
                        .eq('id', client.id);
                      setFullClientData({ ...fullClientData, is_vip: checked });
                      setFormData({ ...formData, is_vip: checked });
                      onUpdate?.();
                    } catch (error) {
                      console.error('Error updating VIP status:', error);
                    }
                  }}
                />
              </div>
            )}
          </TabsContent>

          {/* Finanzas Tab */}
          <TabsContent value="finanzas" className="space-y-6 mt-4">
            {/* Resumen financiero */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-sm border bg-card text-center">
                <p className="text-xs text-muted-foreground mb-1">Total contratado</p>
                <p className="text-2xl font-bold text-success flex items-center justify-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {packages.reduce((s, p) => s + (p.total_value || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-sm border bg-card text-center">
                <p className="text-xs text-muted-foreground mb-1">Pagado</p>
                <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {packages.reduce((s, p) => s + (p.paid_amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-sm border bg-card text-center">
                <p className="text-xs text-muted-foreground mb-1">Pendiente de cobro</p>
                <p className="text-2xl font-bold text-warning flex items-center justify-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {packages.reduce((s, p) => s + ((p.total_value || 0) - (p.paid_amount || 0)), 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Costo de producción (pagos a creadores/editores) */}
            <div className="p-4 rounded-sm border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Costo de producción (pagos al equipo)</p>
              <p className="text-xl font-bold flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                {totalValue.toLocaleString()}
              </p>
            </div>

            {/* Detalle de paquetes */}
            {packages.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Campañas contratadas</h4>
                {packages.map(pkg => {
                  const pending = pkg.total_value - pkg.paid_amount;
                  const isPaid = pkg.payment_status === 'paid';
                  const isBarter = (pkg as any).is_barter;
                  return (
                    <div key={pkg.id} className="p-3 rounded-sm border bg-card flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium opacity-50 shrink-0">
                            #{String(pkg.campaign_number).padStart(4, '0')}
                          </span>
                          <p className="font-medium text-sm truncate">{pkg.name}</p>
                          {isBarter && (
                            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Canje</Badge>
                          )}
                          {!isBarter && (
                            <Badge className={PAYMENT_STATUS_COLORS[pkg.payment_status as PaymentStatus]}>
                              {PAYMENT_STATUS_LABELS[pkg.payment_status as PaymentStatus]}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pkg.content_quantity} videos · {pkg.creators_count} creadores
                        </p>
                      </div>
                      {!isBarter && (
                        <div className="text-right text-sm shrink-0">
                          <p className="font-semibold">${pkg.total_value.toLocaleString()}</p>
                          {!isPaid && (
                            <p className="text-xs text-warning">-${pending.toLocaleString()} pend.</p>
                          )}
                          {isPaid && (
                            <p className="text-xs text-success flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Pagado
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">Sin campañas registradas</p>
              </div>
            )}
          </TabsContent>

          {/* Origen Tab */}
          <TabsContent value="origen" className="space-y-5 mt-4">
            <div className="space-y-1">
              <h4 className="font-medium">Origen y Comunidad</h4>
              <p className="text-xs text-muted-foreground">Cómo llegó este cliente a la plataforma</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Fuente de captación</Label>
                <Select
                  value={originData.lead_source}
                  onValueChange={v => setOriginData(prev => ({ ...prev, lead_source: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar fuente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="referral">Referido</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="website">Sitio web</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Comunidad o programa</Label>
                <Input
                  value={originData.community_name}
                  onChange={e => setOriginData(prev => ({ ...prev, community_name: e.target.value }))}
                  placeholder="Ej: Los Reyes del Contenido"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Referido por</Label>
                <Input
                  value={originData.referred_by}
                  onChange={e => setOriginData(prev => ({ ...prev, referred_by: e.target.value }))}
                  placeholder="Nombre del referidor"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveOrigin} disabled={savingOrigin}>
                {savingOrigin ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar origen
              </Button>
            </div>

            {/* Datos de ubicación (readonly, desde fullClientData) */}
            {(fullClientData?.city || fullClientData?.country) && (
              <div className="pt-2 border-t space-y-2">
                <Label className="text-xs text-muted-foreground">Ubicación registrada</Label>
                <p className="text-sm font-medium">
                  {[fullClientData?.city, fullClientData?.country].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </TabsContent>

          {/* DNA Tab - lazy loaded */}
          <TabsContent value="dna" className="mt-4">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }>
              <ClientDNATab clientId={client.id} />
            </Suspense>
          </TabsContent>

          {/* Servicios Tab (campañas + fillmakers + proyectos sueltos) */}
          <TabsContent value="packages" className="mt-4">
            {fullClientData?.organization_id ? (
              <ClientServicesTab
                orgId={fullClientData.organization_id}
                clientId={client.id}
                clientName={client.name}
                isAdmin={isAdmin}
                packages={packages}
                loadingPackages={loadingPackages}
                assignedContent={assignedContent}
                onCreatePackage={() => { setSelectedPackage(null); setShowPackageDialog(true); }}
                onEditPackage={(pkg) => { setSelectedPackage(pkg); setShowPackageDialog(true); }}
                onDeletePackage={handleDeletePackage}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
            )}
          </TabsContent>

          {/* Products / ADN de Productos Tab */}
          <TabsContent value="products" className="space-y-4 mt-4">
            {showCreateProductWizard ? (
              <ProductDNAWizard
                clientId={client.id}
                onComplete={() => {
                  setShowCreateProductWizard(false);
                  fetchProducts();
                }}
                onCancel={() => setShowCreateProductWizard(false)}
              />
            ) : (
              <>
                {/* Header with CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold">Productos</h3>
                    <p className="text-xs text-muted-foreground">
                      Productos y servicios con ADN generado por IA
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCreateProductWizard(true)}
                    className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                  >
                    <Plus className="h-4 w-4" />
                    Crear Nuevo Producto
                  </Button>
                </div>

                {loadingProducts ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-24 rounded-sm" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-8 text-center">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="w-7 h-7 text-primary" />
                      </div>
                      <h4 className="font-semibold text-base mb-2">Crea el primer producto</h4>
                      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                        Graba un audio describiendo el producto y la IA investigará mercado,
                        competencia y creará estrategias automáticamente.
                      </p>
                      <Button
                        onClick={() => setShowCreateProductWizard(true)}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Crear Producto con IA
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {products.map((product) => (
                      <Card
                        key={product.id}
                        className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => { setSelectedProduct(product); setShowProductDialog(true); }}
                      >
                        <CardContent className="p-0">
                          {/* Product Header */}
                          <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-sm bg-primary/10">
                                  <Package className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-semibold">
                                    {product.product_code && <span className="text-primary">#{product.product_code}</span>}{' '}
                                    {product.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    Creado: {formatDate(product.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver detalles
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      onClick={(e) => e.stopPropagation()}
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
                            </div>
                          </div>

                          {/* Product Quick Info */}
                          <div className="p-4 space-y-3">
                            {/* Sales Angles */}
                            {product.sales_angles && product.sales_angles.length > 0 && (
                              <div>
                                <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                                  <Sparkles className="h-3 w-3" /> Ángulos de Venta
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                  {product.sales_angles.map((angle, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {angle}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Quick Links */}
                            <div className="flex flex-wrap gap-2">
                              {product.brief_url && (
                                <a
                                  href={product.brief_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                                >
                                  <FolderOpen className="h-3 w-3" /> Brief
                                </a>
                              )}
                              {product.onboarding_url && (
                                <a
                                  href={product.onboarding_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                                >
                                  <FileText className="h-3 w-3" /> Onboarding
                                </a>
                              )}
                              {product.research_url && (
                                <a
                                  href={product.research_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                                >
                                  <Target className="h-3 w-3" /> Investigación
                                </a>
                              )}
                            </div>

                            {/* Description preview */}
                            {product.description && (
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                <RichTextViewer content={product.description} className="prose-sm" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
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
                        <div key={content.id} className="flex items-center justify-between p-3 rounded-sm border bg-card">
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
                        <div key={content.id} className="flex items-center justify-between p-3 rounded-sm border bg-muted/50">
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
            {/* Actividad del cliente */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Actividad</h4>
              <ClientActivityPanel clientId={client.id} />
            </div>

            {/* Content Stats */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Contenido</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-primary">{assignedContent.length}</p>
                  <p className="text-xs text-muted-foreground">Total videos</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-info">{activeContent.length}</p>
                  <p className="text-xs text-muted-foreground">En progreso</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-success">{completedContent.length}</p>
                  <p className="text-xs text-muted-foreground">Completados</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-primary">{products.length}</p>
                  <p className="text-xs text-muted-foreground">Productos</p>
                </div>
              </div>
            </div>

            {/* Engagement Stats */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Engagement</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-primary">
                    {assignedContent.reduce((sum, c) => sum + (c.views_count || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Vistas totales</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-pink-500">
                    {assignedContent.reduce((sum, c) => sum + (c.likes_count || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Likes totales</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
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
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-success flex items-center justify-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {packages.reduce((sum, p) => sum + (p.total_value || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Valor contratado</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {packages.reduce((sum, p) => sum + (p.paid_amount || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Pagado</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-warning flex items-center justify-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {packages.reduce((sum, p) => sum + ((p.total_value || 0) - (p.paid_amount || 0)), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
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
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Campañas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-primary">{packages.length}</p>
                  <p className="text-xs text-muted-foreground">Total campañas</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-success">
                    {packages.filter(p => p.payment_status === 'paid').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Pagados</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-info">
                    {packages.reduce((sum, p) => sum + (p.content_quantity || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Videos contratados</p>
                </div>
                <div className="p-4 rounded-sm border bg-card text-center">
                  <p className="text-2xl font-bold text-warning">
                    {packages.reduce((sum, p) => sum + (p.content_quantity || 0), 0) - completedContent.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Videos pendientes</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Streaming Channels Tab */}
          <TabsContent value="channels" className="mt-4">
            <ClientStreamingChannels clientId={client.id} clientName={client.name} />
          </TabsContent>

          {/* Cobros Tab */}
          <TabsContent value="billing" className="mt-4">
            {fullClientData?.organization_id ? (
              <ClientBillingTab
                orgId={fullClientData.organization_id}
                clientId={client.id}
                clientName={client.name}
                orgName="Kreoon"
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Product Dialog - for editing existing products */}
      <ProductDetailDialog
        product={selectedProduct as any}
        clientId={client.id}
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        onResearchComplete={(updated) => {
          setSelectedProduct(updated);
          fetchProducts();
        }}
        onSave={async () => {
          await fetchProducts();
          if (selectedProduct?.id) {
            const { data } = await supabase.from('products').select('*').eq('id', selectedProduct.id).single();
            if (data) setSelectedProduct(data);
          }
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

      {/* Company Profile Editor */}
      {fullClientData && (
        <CompanyProfileEditor
          companyId={client.id}
          currentData={fullClientData}
          open={showProfileEditor}
          onOpenChange={setShowProfileEditor}
          onSave={() => {
            fetchFullClientData();
            onUpdate?.();
          }}
        />
      )}
    </Dialog>
  );
}
