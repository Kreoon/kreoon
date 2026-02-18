import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';
import { OrganizationPlansPage } from '@/components/settings/OrganizationPlansPage';
import type { PlanDef } from '@/lib/finance/constants';

type Segment = PlanDef['segment'];

export default function PlanesPage() {
  const { profile, activeRole } = useAuth();
  const organizationId = profile?.current_organization_id;
  const group = activeRole ? getPermissionGroup(activeRole) : null;

  let segment: Segment;
  if (!organizationId) {
    // Freelance users without org: talent → creadores, brand/client → marcas
    segment = group === 'client' ? 'marcas' : 'creadores';
  } else if (group === 'creator' || group === 'editor' || group === 'strategist') {
    // Org members with talent-type roles always see creadores
    segment = 'creadores';
  } else {
    // Any org member (admin, team_leader, client, etc.) → agencias plans
    segment = 'agencias';
  }

  return <OrganizationPlansPage fixedSegment={segment} />;
}
