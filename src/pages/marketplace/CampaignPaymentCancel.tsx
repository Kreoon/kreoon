import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import { useState } from 'react';

export default function CampaignPaymentCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { createCampaignCheckout } = useMarketplaceCampaigns();
  const [retrying, setRetrying] = useState(false);

  const campaignId = searchParams.get('campaign_id');

  const handleRetry = async () => {
    if (!campaignId) return;
    setRetrying(true);
    try {
      const checkoutUrl = await createCampaignCheckout(campaignId, 'create-publish-checkout');
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
    } catch {
      // ignore
    }
    setRetrying(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold">Pago cancelado</h1>
          <p className="text-muted-foreground">
            El pago fue cancelado. Tu campana se guardo como borrador y puedes completar el pago en cualquier momento.
          </p>
          <div className="flex flex-col gap-2">
            {campaignId && (
              <Button onClick={handleRetry} disabled={retrying} className="w-full">
                {retrying ? 'Redirigiendo...' : 'Reintentar pago'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace/my-campaigns', { replace: true })}
              className="w-full"
            >
              Volver a mis campanas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
