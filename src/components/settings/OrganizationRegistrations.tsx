import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Building2, 
  Search, 
  Users, 
  Crown, 
  Settings, 
  Eye, 
  UserPlus,
  Ban,
  Check,
  Calendar,
  Mail,
  Globe,
  Plus,
  Loader2
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { OrganizationProfileEditor } from './OrganizationProfileEditor';
import type { AppRole } from '@/types/database';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  organization_type: string | null;
  is_registration_open: boolean | null;
  is_blocked: boolean | null;
  created_at: string;
  admin_name: string | null;
  admin_email: string | null;
  members_count: number;
  owner?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

const ORG_TYPE_LABELS: Record<string, string> = {
  agency: 'Agencia',
  community: 'Comunidad',
  academy: 'Academia',
  company: 'Empresa'
};

export function OrganizationRegistrations() {
  const { profile, isAdmin } = useAuth();
  const ROOT_EMAIL = "jacsolucionesgraficas@gmail.com";
  const isRootAdmin = profile?.email === ROOT_EMAIL;

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignOwnerDialog, setShowAssignOwnerDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [newOrgType, setNewOrgType] = useState<string>('agency');

  useEffect(() => {
    if (isRootAdmin) {
      fetchOrganizations();
    }
  }, [isRootAdmin]);

  const fetchOrganizations = async () => {
    try {
      // Fetch all organizations
      const { data: orgsData, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch members count and owners for each organization
      const orgsWithDetails = await Promise.all((orgsData || []).map(async (org) => {
        // Get members count
        const { count } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        // Get owner
        const { data: ownerData } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', org.id)
          .eq('is_owner', true)
          .maybeSingle();

        let owner = null;
        if (ownerData?.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .eq('id', ownerData.user_id)
            .maybeSingle();
          owner = profileData;
        }

        return {
          ...org,
          members_count: count || 0,
          owner
        };
      }));

      setOrganizations(orgsWithDetails);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAssignOwner = async () => {
    if (!selectedOrg || !selectedOwnerId) return;

    setIsSubmitting(true);
    try {
      // First, remove existing owner status
      await supabase
        .from('organization_members')
        .update({ is_owner: false })
        .eq('organization_id', selectedOrg.id)
        .eq('is_owner', true);

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', selectedOrg.id)
        .eq('user_id', selectedOwnerId)
        .single();

      if (existingMember) {
        // Update existing member to owner
        await supabase
          .from('organization_members')
          .update({ is_owner: true, role: 'admin' })
          .eq('id', existingMember.id);
      } else {
        // Add as new owner member
        await supabase
          .from('organization_members')
          .insert({
            organization_id: selectedOrg.id,
            user_id: selectedOwnerId,
            role: 'admin',
            is_owner: true
          });
      }

      // Update user's current organization
      await supabase
        .from('profiles')
        .update({ current_organization_id: selectedOrg.id })
        .eq('id', selectedOwnerId);

      toast.success('Propietario asignado correctamente');
      setShowAssignOwnerDialog(false);
      setSelectedOwnerId('');
      fetchOrganizations();
    } catch (error) {
      console.error('Error assigning owner:', error);
      toast.error('Error al asignar propietario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockOrg = async (orgId: string, block: boolean) => {
    try {
      await supabase
        .from('organizations')
        .update({ 
          is_blocked: block,
          blocked_at: block ? new Date().toISOString() : null,
          blocked_by: block ? profile?.id : null
        })
        .eq('id', orgId);

      toast.success(block ? 'Organización bloqueada' : 'Organización desbloqueada');
      fetchOrganizations();
    } catch (error) {
      toast.error('Error al actualizar organización');
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate slug from name
      const slug = newOrgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          slug: slug + '-' + Date.now().toString(36),
          description: newOrgDescription.trim() || null,
          organization_type: newOrgType,
          created_by: profile?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Organización creada exitosamente');
      setShowCreateDialog(false);
      setNewOrgName('');
      setNewOrgDescription('');
      setNewOrgType('agency');
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error('Error al crear organización: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isRootAdmin) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Ban className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acceso restringido</h3>
          <p className="text-muted-foreground">
            Solo el administrador root puede gestionar organizaciones
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Filter organizations
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'no-owner') return matchesSearch && !org.owner;
    if (activeTab === 'blocked') return matchesSearch && org.is_blocked;
    if (activeTab === 'agencies') return matchesSearch && org.organization_type === 'agency';
    if (activeTab === 'communities') return matchesSearch && org.organization_type === 'community';
    if (activeTab === 'academies') return matchesSearch && org.organization_type === 'academy';
    return matchesSearch;
  });

  const noOwnerCount = organizations.filter(o => !o.owner).length;
  const blockedCount = organizations.filter(o => o.is_blocked).length;

  const OrganizationCard = ({ org }: { org: Organization }) => (
    <Card className={`transition-all hover:shadow-md ${org.is_blocked ? 'border-destructive/50 bg-destructive/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 rounded-sm">
            <AvatarImage src={org.logo_url || ''} />
            <AvatarFallback className="rounded-sm bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate">{org.name}</h3>
              {org.organization_type && (
                <Badge variant="outline" className="text-xs">
                  {ORG_TYPE_LABELS[org.organization_type] || org.organization_type}
                </Badge>
              )}
              {org.is_blocked && (
                <Badge variant="destructive" className="text-xs">
                  Bloqueada
                </Badge>
              )}
              {!org.owner && (
                <Badge variant="secondary" className="text-xs bg-warning/20 text-warning">
                  Sin propietario
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground truncate">
              @{org.slug}
            </p>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {org.members_count} miembros
              </span>
              {org.admin_email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {org.admin_email}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(org.created_at).toLocaleDateString()}
              </span>
            </div>

            {org.owner && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-sm">
                <Crown className="h-4 w-4 text-yellow-500" />
                <Avatar className="h-6 w-6">
                  <AvatarImage src={org.owner.avatar_url || ''} />
                  <AvatarFallback>{org.owner.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{org.owner.full_name}</span>
                <span className="text-xs text-muted-foreground">{org.owner.email}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setSelectedOrg(org);
                setShowDetailDialog(true);
              }}
            >
              <Eye className="h-4 w-4" />
              Ver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setSelectedOrg(org);
                fetchAvailableUsers();
                setShowAssignOwnerDialog(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              {org.owner ? 'Cambiar' : 'Asignar'}
            </Button>
            <Button
              variant={org.is_blocked ? "default" : "destructive"}
              size="sm"
              className="gap-1"
              onClick={() => handleBlockOrg(org.id, !org.is_blocked)}
            >
              {org.is_blocked ? (
                <>
                  <Check className="h-4 w-4" />
                  Desbloquear
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  Bloquear
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Organizaciones</h2>
          <p className="text-muted-foreground">
            Administra todas las organizaciones registradas en la plataforma
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Organización
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{organizations.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{organizations.length - noOwnerCount}</p>
                <p className="text-sm text-muted-foreground">Con propietario</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{noOwnerCount}</p>
                <p className="text-sm text-muted-foreground">Sin propietario</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Ban className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{blockedCount}</p>
                <p className="text-sm text-muted-foreground">Bloqueadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">
            Todas ({organizations.length})
          </TabsTrigger>
          <TabsTrigger value="no-owner" className="gap-1">
            <UserPlus className="h-3 w-3" />
            Sin propietario ({noOwnerCount})
          </TabsTrigger>
          <TabsTrigger value="agencies">
            Agencias
          </TabsTrigger>
          <TabsTrigger value="communities">
            Comunidades
          </TabsTrigger>
          <TabsTrigger value="academies">
            Academias
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-1">
            <Ban className="h-3 w-3" />
            Bloqueadas ({blockedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredOrgs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay organizaciones en esta categoría</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrgs.map(org => (
                <OrganizationCard key={org.id} org={org} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-4xl max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Perfil de {selectedOrg?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <OrganizationProfileEditor 
              organizationId={selectedOrg.id}
              isRootAdmin={true}
              onUpdate={() => {
                fetchOrganizations();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Owner Dialog */}
      <Dialog open={showAssignOwnerDialog} onOpenChange={setShowAssignOwnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Propietario</DialogTitle>
            <DialogDescription>
              Selecciona el usuario que será propietario de {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{user.full_name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignOwnerDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignOwner} disabled={isSubmitting || !selectedOwnerId}>
              {isSubmitting ? 'Asignando...' : 'Asignar Propietario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Organization Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Organización</DialogTitle>
            <DialogDescription>
              Crea una nueva organización manualmente desde el panel de administración
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nombre *</Label>
              <Input
                id="org-name"
                placeholder="Nombre de la organización"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-type">Tipo</Label>
              <Select value={newOrgType} onValueChange={setNewOrgType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency">Agencia</SelectItem>
                  <SelectItem value="community">Comunidad</SelectItem>
                  <SelectItem value="academy">Academia</SelectItem>
                  <SelectItem value="company">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-desc">Descripción (opcional)</Label>
              <Textarea
                id="org-desc"
                placeholder="Describe la organización..."
                value={newOrgDescription}
                onChange={(e) => setNewOrgDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateOrganization} 
              disabled={isSubmitting || !newOrgName.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Organización'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
