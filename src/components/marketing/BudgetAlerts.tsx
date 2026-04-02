import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Bell, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface BudgetAlert {
  id: string;
  clientId: string;
  clientName: string;
  monthlyBudget: number;
  spent: number;
  percentage: number;
  alertLevel: 'info' | 'warning' | 'critical';
  daysRemaining: number;
}

interface BudgetAlertsProps {
  organizationId: string | null | undefined;
}

export function BudgetAlerts({ organizationId }: BudgetAlertsProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchBudgetAlerts();
    }
  }, [organizationId]);

  const fetchBudgetAlerts = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      // Get marketing clients with budgets
      const { data: clients, error: clientsError } = await supabase
        .from('marketing_clients')
        .select(`
          id,
          monthly_budget,
          budget_currency,
          is_active,
          client:clients(id, name)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .gt('monthly_budget', 0);

      if (clientsError) throw clientsError;

      // Get traffic channel spending for current month
      const startDate = startOfMonth(new Date()).toISOString();
      const endDate = endOfMonth(new Date()).toISOString();

      const { data: spendingData, error: spendingError } = await supabase
        .from('traffic_sync_logs')
        .select(`
          channel_id,
          investment,
          traffic_channels(marketing_client_id)
        `)
        .gte('sync_date', startDate.split('T')[0])
        .lte('sync_date', endDate.split('T')[0]);

      if (spendingError) throw spendingError;

      // Aggregate spending by marketing client
      const spendByClient: Record<string, number> = {};
      (spendingData || []).forEach((log: any) => {
        const clientId = log.traffic_channels?.marketing_client_id;
        if (clientId) {
          spendByClient[clientId] = (spendByClient[clientId] || 0) + (log.investment || 0);
        }
      });

      // Calculate days remaining in month
      const today = new Date();
      const endOfCurrentMonth = endOfMonth(today);
      const daysRemaining = Math.ceil((endOfCurrentMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Generate alerts
      const generatedAlerts: BudgetAlert[] = (clients || [])
        .map(client => {
          const spent = spendByClient[client.id] || 0;
          const percentage = client.monthly_budget > 0 
            ? Math.round((spent / client.monthly_budget) * 100) 
            : 0;

          let alertLevel: 'info' | 'warning' | 'critical' = 'info';
          if (percentage >= 100) {
            alertLevel = 'critical';
          } else if (percentage >= 80) {
            alertLevel = 'warning';
          }

          return {
            id: client.id,
            clientId: (client.client as any)?.id,
            clientName: (client.client as any)?.name || 'Cliente',
            monthlyBudget: client.monthly_budget,
            spent,
            percentage,
            alertLevel,
            daysRemaining,
          };
        })
        .filter(alert => alert.percentage >= 70) // Only show alerts at 70%+
        .sort((a, b) => b.percentage - a.percentage);

      setAlerts(generatedAlerts);
    } catch (error) {
      console.error('Error fetching budget alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const getAlertConfig = (level: string) => {
    switch (level) {
      case 'critical':
        return {
          icon: AlertTriangle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          badgeVariant: 'destructive' as const,
          label: 'Crítico',
        };
      case 'warning':
        return {
          icon: Bell,
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          badgeVariant: 'secondary' as const,
          label: 'Advertencia',
        };
      default:
        return {
          icon: CheckCircle,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          badgeVariant: 'outline' as const,
          label: 'Info',
        };
    }
  };

  if (loading) {
    return null;
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">Alertas de Presupuesto</CardTitle>
        </div>
        <CardDescription>
          {alerts.length} cliente{alerts.length !== 1 ? 's' : ''} cerca o sobre el presupuesto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map(alert => {
          const config = getAlertConfig(alert.alertLevel);
          const Icon = config.icon;

          return (
            <div 
              key={alert.id} 
              className={`p-3 rounded-sm ${config.bgColor} border border-current/10`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{alert.clientName}</span>
                      <Badge variant={config.badgeVariant} className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(alert.spent)} de {formatCurrency(alert.monthlyBudget)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${config.color}`}>
                    {alert.percentage}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {alert.daysRemaining} días restantes
                  </div>
                </div>
              </div>
              <Progress 
                value={Math.min(alert.percentage, 100)} 
                className="h-2 mt-3"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
