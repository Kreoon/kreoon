import { useOrganizations, OrganizationInvitation } from '@/hooks/useOrganizations';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Building2,
  Mail,
  Trash2,
  Clock,
  FileText,
  UserPlus,
  Palette,
  Settings,
} from 'lucide-react';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import { OrganizationProfileEditor } from './OrganizationProfileEditor';
import { OrgRegistrationSettings } from './OrgRegistrationSettings';
import { EditorRandomizerSettings } from './EditorRandomizerSettings';
import { AppearanceSettings } from './AppearanceSettings';

// ─── Main Component ──────────────────────────────────────────────────────────

export function OrganizationManagement() {
  const { isAdmin } = useAuth();
  const { isPlatformRoot } = useOrgOwner();
  const {
    currentOrg,
    invitations,
    loading,
    cancelInvitation,
  } = useOrganizations();

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
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          {currentOrg?.name || 'Organización'}
        </h2>
        <p className="text-muted-foreground">
          Datos, registro, personalización y configuración de tu organización
        </p>
      </div>

      {currentOrg && (
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex w-full h-auto p-1 overflow-x-auto">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Datos</span>
            </TabsTrigger>
            <TabsTrigger value="registration" className="flex items-center gap-2 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Registro</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Invitaciones</span>
              {invitations.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{invitations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap">
              <Palette className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Marca Blanca</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Avanzado</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Datos */}
          <TabsContent value="profile" className="space-y-4">
            <OrganizationProfileEditor
              organizationId={currentOrg.id}
              isRootAdmin={isAdmin}
            />
          </TabsContent>

          {/* Tab 2: Registro & Landing */}
          <TabsContent value="registration" className="space-y-4">
            <OrgRegistrationSettings />
          </TabsContent>

          {/* Tab 3: Invitaciones */}
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

          {/* Tab 4: Marca Blanca */}
          <TabsContent value="branding" className="space-y-4">
            {isPlatformRoot ? (
              <AppearanceSettings />
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Palette className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Marca Blanca</h3>
                  <p className="text-muted-foreground max-w-md">
                    La personalización de marca blanca (logos, colores, PWA) está disponible para administradores de la plataforma.
                    El color principal de tu organización se configura en la pestaña Datos.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 5: Avanzado */}
          <TabsContent value="advanced" className="space-y-4">
            <EditorRandomizerSettings />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Invitation Card ─────────────────────────────────────────────────────────

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
        <Badge variant="outline" className={getRoleBadgeColor(invitation.role)}>
          {getRoleLabel(invitation.role)}
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
