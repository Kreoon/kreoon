import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { MembershipGate } from '@/components/marketplace/MembershipGate';
import { useAuth } from '@/hooks/useAuth';

const CampaignWizard = lazy(() => import('@/components/marketplace/campaigns/wizard/CampaignWizard'));
const EasyCampaignWizard = lazy(() => import('@/components/marketplace/campaigns/wizard/EasyCampaignWizard'));

const Spinner = (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full" />
  </div>
);

export default function CampaignWizardPage() {
  const { id } = useParams<{ id?: string }>();
  const { activeRole } = useAuth();
  const isClient = activeRole === 'client';

  return (
    <MembershipGate>
      <Suspense fallback={Spinner}>
        {/* Clientes ven el wizard simplificado. Admins/talent ven el completo */}
        {isClient && !id
          ? <EasyCampaignWizard />
          : <CampaignWizard editCampaignId={id} />
        }
      </Suspense>
    </MembershipGate>
  );
}
