import { useState } from 'react';
import { useOrganizations, Organization, OrganizationMember, OrganizationInvitation } from '@/hooks/useOrganizations';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Building2, 
  Plus, 
  Users, 
  Settings, 
  Mail, 
  Link2, 
  Copy, 
  UserPlus, 
  Crown, 
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';
import type { AppRole } from '@/types/database';
import { OrganizationProfileEditor } from './OrganizationProfileEditor';
import { EditorRandomizerSettings } from './EditorRandomizerSettings';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  strategist: 'Estratega',
  creator: 'Creador',
  editor: 'Editor',
  client: 'Cliente',
  ambassador: 'Embajador' // legacy - kept for display only
};

// Roles that can be assigned in org management (no ambassador)
const ASSIGNABLE_ROLES: AppRole[] = ['admin', 'strategist', 'creator', 'editor', 'client'];

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  strategist: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  creator: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  editor: 'bg-green-500/10 text-green-500 border-green-500/20',
  client: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  ambassador: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
};

export function OrganizationManagement() {
  const { profile, isAdmin } = useAuth();
  const {
    organizations,
    currentOrg,
    members,
    invitations,
    loading,
    createOrganization,
    updateOrganization,
    inviteMember,
    cancelInvitation,
    updateMemberRole,
    removeMember,
    switchOrganization,
    generateRegistrationLink,
    toggleRegistration
  } = useOrganizations();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('creator');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    
    setIsSubmitting(true);
    const result = await createOrganization(newOrgName, newOrgDescription);
    setIsSubmitting(false);
    
    if (result) {
      setShowCreateDialog(false);
      setNewOrgName('');
      setNewOrgDescription('');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentOrg) return;
    
    setIsSubmitting(true);
    const success = await inviteMember(currentOrg.id, inviteEmail, inviteRole);
    setIsSubmitting(false);
    
    if (success) {
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('creator');
    }
  };

  const copyRegistrationLink = () => {
    if (!currentOrg?.registration_link) return;
    
    const fullUrl = `${window.location.origin}/register/${currentOrg.registration_link}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Link copiado al portapapeles');
  };

  const handleGenerateLink = async () => {
    if (!currentOrg) return;
    await generateRegistrationLink(currentOrg.id);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Organizaciones</h2>
          <p className="text-muted-foreground">
            Gestiona tus organizaciones y equipos
          </p>
        </div>
        
        {isAdmin && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Organización
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Organización</DialogTitle>
                <DialogDescription>
                  Crea una nueva organización para gestionar equipos y contenido de forma independiente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Nombre</Label>
                  <Input
                    id="org-name"
                    placeholder="Mi Organización"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-desc">Descripción (opcional)</Label>
                  <Textarea
                    id="org-desc"
                    placeholder="Describe tu organización..."
                    value={newOrgDescription}
                    onChange={(e) => setNewOrgDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateOrg} disabled={isSubmitting || !newOrgName.trim()}>
                  {isSubmitting ? 'Creando...' : 'Crear'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Organization Selector */}
      {organizations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organización Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={currentOrg?.id || ''} onValueChange={switchOrganization}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una organización" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {org.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {organizations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay organizaciones</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin 
                ? 'Crea tu primera organización para comenzar'
                : 'Aún no perteneces a ninguna organización'
              }
            </p>
            {isAdmin && (
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Organización
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Organization Management */}
      {currentOrg && (
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <FileText className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Miembros
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="h-4 w-4" />
              Invitaciones
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <OrganizationProfileEditor 
              organizationId={currentOrg.id} 
              isRootAdmin={isAdmin}
            />
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {members.length} miembro{members.length !== 1 ? 's' : ''}
              </p>
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invitar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invitar Miembro</DialogTitle>
                    <DialogDescription>
                      Envía una invitación por email para unirse a {currentOrg.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Rol</Label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([role, label]) => (
                            <SelectItem key={role} value={role}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleInvite} disabled={isSubmitting || !inviteEmail.trim()}>
                      {isSubmitting ? 'Enviando...' : 'Enviar Invitación'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  currentUserId={profile?.id}
                  onUpdateRole={updateMemberRole}
                  onRemove={removeMember}
                />
              ))}
            </div>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {invitations.length} invitación{invitations.length !== 1 ? 'es' : ''} pendiente{invitations.length !== 1 ? 's' : ''}
            </p>

            {invitations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Mail className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No hay invitaciones pendientes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    onCancel={cancelInvitation}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={currentOrg.name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={currentOrg.slug} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={currentOrg.description || ''} disabled />
                </div>
              </CardContent>
            </Card>


            {/* Editor Randomizer Settings */}
            <EditorRandomizerSettings />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Member Card Component
function MemberCard({ 
  member, 
  currentUserId,
  onUpdateRole, 
  onRemove 
}: { 
  member: OrganizationMember;
  currentUserId?: string;
  onUpdateRole: (id: string, role: AppRole) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}) {
  const isCurrentUser = member.user_id === currentUserId;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.profile?.avatar_url || undefined} />
          <AvatarFallback>
            {member.profile?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{member.profile?.full_name || 'Usuario'}</span>
            {member.is_owner && (
              <Crown className="h-4 w-4 text-yellow-500" />
            )}
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">Tú</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{member.profile?.email}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={ROLE_COLORS[member.role]}>
          {ROLE_LABELS[member.role]}
        </Badge>

        {!member.is_owner && !isCurrentUser && (
          <div className="flex items-center gap-1">
            <Select 
              value={member.role} 
              onValueChange={(v) => onUpdateRole(member.id, v as AppRole)}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <SelectItem key={role} value={role}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Remover miembro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {member.profile?.full_name} será removido de la organización. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onRemove(member.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}

// Invitation Card Component
function InvitationCard({ 
  invitation, 
  onCancel 
}: { 
  invitation: OrganizationInvitation;
  onCancel: (id: string) => Promise<boolean>;
}) {
  const isExpired = new Date(invitation.expires_at) < new Date();

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <span className="font-medium">{invitation.email}</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {isExpired ? (
              <span className="text-destructive">Expirada</span>
            ) : (
              <span>Expira {new Date(invitation.expires_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={ROLE_COLORS[invitation.role]}>
          {ROLE_LABELS[invitation.role]}
        </Badge>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar invitación?</AlertDialogTitle>
              <AlertDialogDescription>
                La invitación a {invitation.email} será cancelada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Mantener</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onCancel(invitation.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancelar Invitación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
