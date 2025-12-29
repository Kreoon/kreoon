import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface TrackingAnalyticsDashboardProps {
  organizationId: string;
}

export function TrackingAnalyticsDashboard({ organizationId }: TrackingAnalyticsDashboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          El dashboard de analytics estará disponible próximamente
        </p>
      </CardContent>
    </Card>
  );
}
