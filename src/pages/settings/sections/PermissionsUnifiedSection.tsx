import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Globe } from 'lucide-react';
import { UPPermissionsEditor } from '@/components/points/UPPermissionsEditor';
import { PermissionsEditor } from '@/components/settings/PermissionsEditor';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { Loader2 } from 'lucide-react';

const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];

export default function PermissionsUnifiedSection() {
  const { profile } = useAuth();
  const { isPlatformRoot: isPlatformRootFromHook } = useOrgOwner();
  const isPlatformRoot = (profile?.email && ROOT_EMAILS.includes(profile.email)) || isPlatformRootFromHook;
  
  if (!profile?.current_organization_id) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Permisos</h2>
        <p className="text-muted-foreground">
          Configura permisos por rol {isPlatformRoot && 'a nivel global y de organización'}
        </p>
      </div>

      {isPlatformRoot ? (
        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organización
            </TabsTrigger>
            <TabsTrigger value="global" className="gap-2">
              <Globe className="h-4 w-4" />
              Globales
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization">
            <UPPermissionsEditor organizationId={profile.current_organization_id} />
          </TabsContent>

          <TabsContent value="global">
            <PermissionsEditor />
          </TabsContent>
        </Tabs>
      ) : (
        <UPPermissionsEditor organizationId={profile.current_organization_id} />
      )}
    </div>
  );
}
