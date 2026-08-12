import { PermissionsEditor } from '@/components/settings/PermissionsEditor';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { Loader2 } from 'lucide-react';

// DEPRECATED: ROOT_EMAILS hardcoded - now using is_superadmin from database via useOrgOwner hook
const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];

export default function PermissionsUnifiedSection() {
  const { user, profile } = useAuth();
  const { isPlatformRoot: isPlatformRootFromHook } = useOrgOwner();
  // IMPORTANT: profile can fail to load by auth uid after migrations; rely on auth email.
  // NEW: isPlatformRootFromHook now checks is_superadmin from database
  const isPlatformRoot = profile?.is_superadmin === true || (user?.email && ROOT_EMAILS.includes(user.email)) || isPlatformRootFromHook;

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
          Configura los permisos globales por rol
        </p>
      </div>

      {isPlatformRoot ? (
        <PermissionsEditor />
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay permisos configurables a nivel de organización.
        </p>
      )}
    </div>
  );
}
