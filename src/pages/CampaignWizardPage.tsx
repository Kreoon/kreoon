import { lazy, Suspense } from 'react';
import { MembershipGate } from '@/components/marketplace/MembershipGate';

const CampaignWizard = lazy(() => import('@/components/marketplace/campaigns/wizard/CampaignWizard'));

export default function CampaignWizardPage() {
  return (
    <MembershipGate>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        }
      >
        <CampaignWizard />
      </Suspense>
    </MembershipGate>
  );
}
