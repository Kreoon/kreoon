import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';
import { OrganizationPlansPage } from '@/components/settings/OrganizationPlansPage';
import type { PlanDef } from '@/lib/finance/constants';

type Segment = PlanDef['segment'];

export default function PlanesPage() {
  const { profile, activeRole } = useAuth();
  const organizationId = profile?.current_organization_id;
  const group = activeRole ? getPermissionGroup(activeRole) : null;

  // For org roles, detect org type to choose segment
  const { data: orgType } = useQuery({
    queryKey: ['org-type-for-plans', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('organization_type')
        .eq('id', organizationId!)
        .single();
      return data?.organization_type as string | null;
    },
    enabled: !!organizationId && (group === 'admin' || group === 'team_leader' || group === 'strategist'),
    staleTime: 30 * 60 * 1000,
  });

  let segment: Segment;
  if (group === 'creator' || group === 'editor') {
    segment = 'creadores';
  } else if (orgType === 'agency') {
    segment = 'agencias';
  } else {
    segment = 'marcas';
  }

  return <OrganizationPlansPage fixedSegment={segment} />;
}
