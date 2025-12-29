import { OrganizationAISettings } from '@/components/settings/OrganizationAISettings';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function OrganizationAISection() {
  const { profile } = useAuth();
  
  if (!profile?.current_organization_id) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <OrganizationAISettings organizationId={profile.current_organization_id} />;
}
