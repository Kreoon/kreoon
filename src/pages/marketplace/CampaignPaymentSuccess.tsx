import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CampaignPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const campaignId = searchParams.get('campaign_id');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/marketplace/my-campaigns', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Pago procesado</h1>
          <p className="text-muted-foreground">
            Tu pago se ha procesado correctamente. Tu campana esta siendo activada y pronto sera visible para los creadores.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirigiendo en {countdown} segundos...
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/marketplace/my-campaigns', { replace: true })} className="w-full">
              Ver mis campanas
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace/campaigns', { replace: true })}
              className="w-full"
            >
              Ir al marketplace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
