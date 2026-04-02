import { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MembershipGate } from '@/components/marketplace/MembershipGate';
import { AlertCircle } from 'lucide-react';

const CampaignEditWizard = lazy(
  () => import('@/components/marketplace/campaigns/wizard/CampaignEditWizard'),
);

export default function CampaignEditWizardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Campana no especificada</h2>
          <p className="text-gray-400 text-sm">No se proporciono un ID de campana para editar.</p>
          <button
            onClick={() => navigate('/marketplace/my-campaigns')}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-sm text-sm transition-colors"
          >
            Ir a mis campanas
          </button>
        </div>
      </div>
    );
  }

  return (
    <MembershipGate>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        }
      >
        <CampaignEditWizard campaignId={id} />
      </Suspense>
    </MembershipGate>
  );
}
