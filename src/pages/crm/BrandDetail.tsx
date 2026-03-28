import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Building2,
  ArrowLeft,
  Users,
  Package,
  FileText,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Briefcase,
  Eye,
  DollarSign,
  Loader2,
  Crown,
  UserCircle,
  Sparkles,
  TrendingUp,
  FolderKanban,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function BrandDetail() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPlatformRoot } = useOrgOwner();
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Delete brand function (only for platform root)
  const handleDeleteBrand = async () => {
    if (!brandId || !isPlatformRoot) return;

    setIsDeleting(true);
    try {
      // Use RPC to delete brand with all related data (SECURITY DEFINER)
      const { error } = await supabase.rpc('delete_brand_complete', {
        p_brand_id: brandId,
      });

      if (error) throw error;

      toast.success('Marca eliminada correctamente');
      queryClient.invalidateQueries({ queryKey: ['crm-brands'] });
      navigate('/crm/marcas');
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      toast.error(error?.message || 'Error al eliminar la marca');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Fetch brand details
  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ['crm-brand-detail', brandId],
    queryFn: async () => {
      if (!brandId) return null;

      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!brandId,
  });

  // Fetch owner profile
  const { data: owner } = useQuery({
    queryKey: ['crm-brand-owner', brand?.owner_id],
    queryFn: async () => {
      if (!brand?.owner_id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, phone')
        .eq('id', brand.owner_id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!brand?.owner_id,
  });

  // Fetch associated client
  const { data: client } = useQuery({
    queryKey: ['crm-brand-client', brandId],
    queryFn: async () => {
      if (!brandId) return null;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('brand_id', brandId)
        .maybeSingle();

      if (error) return null;
      return data;
    },
    enabled: !!brandId,
  });

  // Fetch brand members
  const { data: members = [] } = useQuery({
    queryKey: ['crm-brand-members', brandId],
    queryFn: async () => {
      if (!brandId) return [];

      const { data: memberships, error } = await supabase
        .from('brand_members')
        .select('*')
        .eq('brand_id', brandId)
        .eq('status', 'active');

      if (error || !memberships?.length) return [];

      // Get profiles for members
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return memberships.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
      }));
    },
    enabled: !!brandId,
  });

  // Fetch products (via client)
  const { data: products = [] } = useQuery({
    queryKey: ['crm-brand-products', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) return [];
      return data;
    },
    enabled: !!client?.id,
  });

  // Fetch content (via client)
  const { data: content = [] } = useQuery({
    queryKey: ['crm-brand-content', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];

      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) return [];
      return data;
    },
    enabled: !!client?.id,
  });

  // Fetch packages (via client)
  const { data: packages = [] } = useQuery({
    queryKey: ['crm-brand-packages', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];

      const { data, error } = await supabase
        .from('client_packages')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) return [];
      return data;
    },
    enabled: !!client?.id,
  });

  // Fetch community membership
  const { data: communityMembership } = useQuery({
    queryKey: ['crm-brand-community', brand?.owner_id],
    queryFn: async () => {
      if (!brand?.owner_id) return null;

      const { data, error } = await supabase
        .from('partner_community_memberships')
        .select(`
          *,
          community:partner_communities(name, custom_badge_text, custom_badge_color)
        `)
        .eq('user_id', brand.owner_id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) return null;
      return data;
    },
    enabled: !!brand?.owner_id,
  });

  if (brandLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Marca no encontrada</h2>
        <p className="text-muted-foreground mb-4">La marca que buscas no existe o fue eliminada</p>
        <Button onClick={() => navigate('/crm/marcas')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Marcas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/crm/marcas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="h-16 w-16 rounded-sm object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-sm bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{brand.name}</h1>
              {brand.is_verified && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                  Verificada
                </Badge>
              )}
              {brand.community_badge_text && (
                <Badge
                  style={{
                    backgroundColor: brand.community_badge_color || '#9333ea',
                    color: 'white',
                  }}
                >
                  {brand.community_badge_text}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{brand.industry || 'Sin industria'}</p>
          </div>
        </div>

        {/* Delete button for platform root */}
        {isPlatformRoot && (
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Eliminar Marca
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Eliminar Marca Permanentemente
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>
                      ¿Estás seguro de que deseas eliminar <strong>{brand.name}</strong>?
                    </p>
                    <p className="text-destructive font-medium">
                      Esta acción eliminará permanentemente:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                      <li>La marca y su configuración</li>
                      <li>Todos los miembros asociados</li>
                      <li>El cliente vinculado y sus datos</li>
                      <li>{products.length} productos</li>
                      <li>{content.length} contenidos</li>
                      <li>{packages.length} paquetes</li>
                      <li>ADN de marca y productos</li>
                    </ul>
                    <p className="text-destructive font-medium pt-2">
                      Esta acción NO se puede deshacer.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteBrand}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Sí, eliminar permanentemente
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="members">Miembros ({members.length})</TabsTrigger>
          <TabsTrigger value="products">Productos ({products.length})</TabsTrigger>
          <TabsTrigger value="content">Contenido ({content.length})</TabsTrigger>
          <TabsTrigger value="packages">Paquetes ({packages.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Brand Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información de la Marca</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {brand.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Descripción</p>
                    <p className="text-sm">{brand.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {brand.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {brand.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {brand.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{brand.city}, {brand.country || 'CO'}</span>
                    </div>
                  )}
                  {brand.nit && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>NIT: {brand.nit}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Creada: {format(new Date(brand.created_at), 'd MMM yyyy', { locale: es })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Owner Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Propietario</CardTitle>
              </CardHeader>
              <CardContent>
                {owner ? (
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={owner.avatar_url || undefined} />
                      <AvatarFallback>
                        {owner.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{owner.full_name || 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground">{owner.email}</p>
                      {owner.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {owner.phone}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      <Crown className="h-3 w-3 mr-1" />
                      Owner
                    </Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Cargando...</p>
                )}
              </CardContent>
            </Card>

            {/* Community Membership */}
            {communityMembership && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Membresía de Comunidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      style={{
                        backgroundColor: (communityMembership.community as any)?.custom_badge_color || '#f59e0b',
                        color: 'white',
                      }}
                    >
                      {(communityMembership.community as any)?.name || 'Comunidad'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-sm">
                    <div className="p-2 bg-background rounded-sm">
                      <p className="font-bold text-amber-600">{communityMembership.free_months_granted}</p>
                      <p className="text-xs text-muted-foreground">Meses gratis</p>
                    </div>
                    <div className="p-2 bg-background rounded-sm">
                      <p className="font-bold text-amber-600">{communityMembership.commission_discount_applied}%</p>
                      <p className="text-xs text-muted-foreground">Descuento</p>
                    </div>
                    <div className="p-2 bg-background rounded-sm">
                      <p className="font-bold text-amber-600">{communityMembership.bonus_tokens_granted}</p>
                      <p className="text-xs text-muted-foreground">Tokens</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{members.length}</p>
                    <p className="text-xs text-muted-foreground">Miembros</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{products.length}</p>
                    <p className="text-xs text-muted-foreground">Productos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{content.length}</p>
                    <p className="text-xs text-muted-foreground">Contenido</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{packages.length}</p>
                    <p className="text-xs text-muted-foreground">Paquetes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {members.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">Sin miembros</h3>
                <p className="text-muted-foreground text-sm">Esta marca no tiene miembros activos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {members.map(member => (
                <Card key={member.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.profile?.full_name || 'Usuario'}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.profile?.email}</p>
                      </div>
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role === 'owner' ? 'Owner' : 'Miembro'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">Sin productos</h3>
                <p className="text-muted-foreground text-sm">Esta marca no tiene productos registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map(product => (
                <Card key={product.id}>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">{product.name}</h4>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(product.created_at), 'd MMM yyyy', { locale: es })}</span>
                      {product.brief_status && (
                        <Badge variant="outline" className="text-xs">
                          {product.brief_status}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          {content.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">Sin contenido</h3>
                <p className="text-muted-foreground text-sm">Esta marca no tiene contenido creado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {content.map(item => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold truncate">{item.title || 'Sin título'}</h4>
                      <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                        {item.status}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), 'd MMM yyyy', { locale: es })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-4">
          {packages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">Sin paquetes</h3>
                <p className="text-muted-foreground text-sm">Esta marca no tiene paquetes de servicios</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {packages.map(pkg => (
                <Card key={pkg.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{pkg.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {pkg.content_quantity} contenidos · {pkg.hooks_per_video} hooks/video
                        </p>
                      </div>
                      <Badge
                        variant={pkg.payment_status === 'paid' ? 'default' : 'secondary'}
                        className={cn(
                          pkg.payment_status === 'paid' && 'bg-green-500/20 text-green-600'
                        )}
                      >
                        {pkg.payment_status === 'paid' ? 'Pagado' :
                         pkg.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valor total</span>
                      <span className="font-semibold">${pkg.total_value?.toLocaleString() || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
