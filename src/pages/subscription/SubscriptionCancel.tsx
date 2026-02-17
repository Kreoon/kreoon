import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SubscriptionCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Pago cancelado</h1>
          <p className="text-muted-foreground">
            El proceso de pago fue cancelado. No se realizo ningun cargo a tu tarjeta. Puedes intentarlo de nuevo cuando quieras.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/', { replace: true })}>
              Ir al inicio
            </Button>
            <Button onClick={() => navigate('/settings', { replace: true })}>
              Ver planes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
