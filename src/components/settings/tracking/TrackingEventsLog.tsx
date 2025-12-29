import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface TrackingEventsLogProps {
  organizationId: string;
}

export function TrackingEventsLog({ organizationId }: TrackingEventsLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Log de Eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          El log de eventos en tiempo real estará disponible próximamente
        </p>
      </CardContent>
    </Card>
  );
}
