import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { MembershipGate } from '@/components/marketplace/MembershipGate';

const CampaignWizard = lazy(() => import('@/components/marketplace/campaigns/wizard/CampaignWizard'));

export default function CampaignWizardPage() {
  const { id } = useParams<{ id?: string }>();

  return (
    <MembershipGate>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        }
      >
        <CampaignWizard editCampaignId={id} />
      </Suspense>
    </MembershipGate>
  );
}
