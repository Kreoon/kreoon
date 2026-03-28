import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Building2,
  Search,
  Users,
  Package,
  FileText,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Eye,
  Loader2,
  Plus,
  Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const INDUSTRIES = [
  'Tecnología',
  'E-commerce',
  'Moda y Belleza',
  'Salud y Bienestar',
  'Alimentos y Bebidas',
  'Educación',
  'Finanzas',
  'Entretenimiento',
  'Deportes',
  'Viajes y Turismo',
  'Servicios Profesionales',
  'Retail',
  'Automotriz',
  'Inmobiliaria',
  'Otro',
];

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  owner_id: string;
  created_at: string;
  is_verified: boolean;
  community_badge_text: string | null;
  community_badge_color: string | null;
  owner?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  client?: {
    id: string;
    name: string;
  };
  _count?: {
    members: number;
    products: number;
    content: number;
  };
}

export default function BrandsCRM() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPlatformRoot } = useOrgOwner();
  const [search, setSearch] = useState('');

  // Create brand dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    ownerEmail: '',
    industry: '',
    website: '',
    city: '',
    description: '',
  });

  // Create brand function
  const handleCreateBrand = async () => {
    if (!createForm.name || !createForm.ownerEmail) {
      toast.error('Nombre y email del propietario son requeridos');
      return;
    }

    setIsCreating(true);
    try {
      // 1. Find or validate the owner by email
      const { data: ownerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', createForm.ownerEmail.toLowerCase().trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!ownerProfile) {
        toast.error('No se encontró un usuario con ese email. El usuario debe registrarse primero.');
        setIsCreating(false);
        return;
      }

      // 2. Check if user already has a brand
      const { data: existingBrand } = await supabase
        .from('brands')
        .select('id, name')
        .eq('owner_id', ownerProfile.id)
        .maybeSingle();

      if (existingBrand) {
        toast.error(`Este usuario ya tiene una marca: ${existingBrand.name}`);
        setIsCreating(false);
        return;
      }

      // 3. Generate slug
      const slug = createForm.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      // 4. Create the brand
      const { data: newBrand, error: brandError } = await supabase
        .from('brands')
        .insert({
          name: createForm.name,
          slug,
          owner_id: ownerProfile.id,
          industry: createForm.industry || null,
          website: createForm.website || null,
          city: createForm.city || null,
          description: createForm.description || null,
        })
        .select()
        .single();

      if (brandError) throw brandError;

      // 5. Create brand membership for owner
      await supabase.from('brand_members').insert({
        brand_id: newBrand.id,
        user_id: ownerProfile.id,
        role: 'owner',
        status: 'active',
      });

      // 6. Update owner's profile with active_brand_id
      await supabase
        .from('profiles')
        .update({ active_brand_id: newBrand.id, active_role: 'client' } as any)
        .eq('id', ownerProfile.id);

      // 7. Create associated client
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          name: createForm.name,
          brand_id: newBrand.id,
          is_internal_brand: false,
          is_public: false,
          bio: createForm.description || `Cliente de marca: ${createForm.name}`,
        })
        .select()
        .single();

      // 8. Add owner to client_users
      if (newClient) {
        await supabase.from('client_users').insert({
          client_id: newClient.id,
          user_id: ownerProfile.id,
          role: 'owner',
        });
      }

      toast.success('Marca creada correctamente');
      queryClient.invalidateQueries({ queryKey: ['crm-brands'] });
      setShowCreateDialog(false);
      setCreateForm({
        name: '',
        ownerEmail: '',
        industry: '',
        website: '',
        city: '',
        description: '',
      });

      // Navigate to the new brand
      navigate(`/crm/marcas/${newBrand.id}`);
    } catch (error: any) {
      console.error('Error creating brand:', error);
      if (error?.code === '23505') {
        toast.error('Ya existe una marca con ese nombre');
      } else {
        toast.error(error?.message || 'Error al crear la marca');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Fetch all brands with their associated data
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['crm-brands'],
    queryFn: async () => {
      // Get all brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: false });

      if (brandsError) throw brandsError;

      // Get owner profiles
      const ownerIds = [...new Set(brandsData?.map(b => b.owner_id).filter(Boolean))];
      const { data: owners } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', ownerIds);

      const ownerMap = new Map(owners?.map(o => [o.id, o]) || []);

      // Get associated clients
      const brandIds = brandsData?.map(b => b.id) || [];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, brand_id')
        .in('brand_id', brandIds);

      const clientMap = new Map(clients?.map(c => [c.brand_id, c]) || []);

      // Get member counts
      const { data: memberCounts } = await supabase
        .from('brand_members')
        .select('brand_id')
        .in('brand_id', brandIds)
        .eq('status', 'active');

      const memberCountMap = new Map<string, number>();
      memberCounts?.forEach(m => {
        memberCountMap.set(m.brand_id, (memberCountMap.get(m.brand_id) || 0) + 1);
      });

      // Get product counts (from associated client)
      const clientIds = clients?.map(c => c.id) || [];
      const { data: productCounts } = await supabase
        .from('products')
        .select('client_id')
        .in('client_id', clientIds);

      const productCountMap = new Map<string, number>();
      productCounts?.forEach(p => {
        const brand = clients?.find(c => c.id === p.client_id);
        if (brand) {
          productCountMap.set(brand.brand_id!, (productCountMap.get(brand.brand_id!) || 0) + 1);
        }
      });

      // Get content counts
      const { data: contentCounts } = await supabase
        .from('content')
        .select('client_id')
        .in('client_id', clientIds);

      const contentCountMap = new Map<string, number>();
      contentCounts?.forEach(c => {
        const brand = clients?.find(cl => cl.id === c.client_id);
        if (brand) {
          contentCountMap.set(brand.brand_id!, (contentCountMap.get(brand.brand_id!) || 0) + 1);
        }
      });

      // Combine data
      return (brandsData || []).map(brand => ({
        ...brand,
        owner: ownerMap.get(brand.owner_id),
        client: clientMap.get(brand.id),
        _count: {
          members: memberCountMap.get(brand.id) || 0,
          products: productCountMap.get(brand.id) || 0,
          content: contentCountMap.get(brand.id) || 0,
        },
      })) as Brand[];
    },
  });

  // Filter brands by search
  const filteredBrands = brands.filter(brand => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      brand.name.toLowerCase().includes(searchLower) ||
      brand.owner?.full_name?.toLowerCase().includes(searchLower) ||
      brand.owner?.email?.toLowerCase().includes(searchLower) ||
      brand.industry?.toLowerCase().includes(searchLower) ||
      brand.city?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const totalBrands = brands.length;
  const verifiedBrands = brands.filter(b => b.is_verified).length;
  const totalMembers = brands.reduce((sum, b) => sum + (b._count?.members || 0), 0);
  const totalProducts = brands.reduce((sum, b) => sum + (b._count?.products || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Marcas Independientes"
        subtitle="Gestiona las empresas independientes de la plataforma"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Marcas</p>
                <p className="text-2xl font-bold">{totalBrands}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verificadas</p>
                <p className="text-2xl font-bold">{verifiedBrands}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Miembros</p>
                <p className="text-2xl font-bold">{totalMembers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Productos</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Create */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, industria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {isPlatformRoot && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear Marca
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nueva Marca</DialogTitle>
                <DialogDescription>
                  Crea una nueva marca independiente en la plataforma
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">Nombre de la marca *</Label>
                  <Input
                    id="brand-name"
                    placeholder="Mi Empresa S.A.S"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-email">Email del propietario *</Label>
                  <Input
                    id="owner-email"
                    type="email"
                    placeholder="propietario@empresa.com"
                    value={createForm.ownerEmail}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, ownerEmail: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    El usuario debe estar registrado en la plataforma
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industria</Label>
                  <Select
                    value={createForm.industry}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, industry: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una industria" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(industry => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Sitio web</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website"
                        placeholder="www.empresa.com"
                        value={createForm.website}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, website: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="city"
                        placeholder="Bogotá"
                        value={createForm.city}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, city: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Breve descripción de la marca..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateBrand} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Marca'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Brands List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-16 w-16 rounded-sm" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBrands.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {search ? 'Sin resultados' : 'Sin marcas'}
            </h3>
            <p className="text-muted-foreground">
              {search
                ? 'No se encontraron marcas con ese criterio de búsqueda'
                : 'No hay marcas independientes registradas aún'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBrands.map(brand => (
            <Card
              key={brand.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/crm/marcas/${brand.id}`)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{brand.name}</h3>
                      {brand.is_verified && (
                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                          Verificada
                        </Badge>
                      )}
                    </div>
                    {brand.community_badge_text && (
                      <Badge
                        className="text-xs mb-2"
                        style={{
                          backgroundColor: brand.community_badge_color || '#9333ea',
                          color: 'white',
                        }}
                      >
                        {brand.community_badge_text}
                      </Badge>
                    )}
                    {brand.industry && (
                      <p className="text-sm text-muted-foreground mb-2">{brand.industry}</p>
                    )}
                    {brand.owner && (
                      <div className="flex items-center gap-2 text-sm">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={brand.owner.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {brand.owner.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground truncate">
                          {brand.owner.full_name || brand.owner.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-semibold">{brand._count?.members || 0}</p>
                    <p className="text-muted-foreground">Miembros</p>
                  </div>
                  <div>
                    <p className="font-semibold">{brand._count?.products || 0}</p>
                    <p className="text-muted-foreground">Productos</p>
                  </div>
                  <div>
                    <p className="font-semibold">{brand._count?.content || 0}</p>
                    <p className="text-muted-foreground">Contenido</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  {brand.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {brand.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(brand.created_at), 'd MMM yyyy', { locale: es })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
