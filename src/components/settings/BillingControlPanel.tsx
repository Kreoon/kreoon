import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertTriangle, Shield, Clock } from 'lucide-react';
import { useBillingControl } from '@/hooks/useOrganizationTrial';
import { toast } from 'sonner';

export function BillingControlPanel() {
  const { billingEnabled, toggleBilling } = useBillingControl();
  const [loading, setLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      await toggleBilling(checked);
      toast.success(checked 
        ? 'Sistema de cobros activado. Los trials ahora están en efecto.'
        : 'Sistema de cobros desactivado. Todas las organizaciones tienen acceso completo.'
      );
    } catch (error) {
      toast.error('Error al actualizar configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Control de Facturación</CardTitle>
              <CardDescription>Gestiona cuándo se activa el sistema de cobros</CardDescription>
            </div>
          </div>
          <Badge variant={billingEnabled ? 'default' : 'secondary'}>
            {billingEnabled ? 'Activo' : 'Desarrollo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="billing-toggle" className="font-medium">
                Activar sistema de cobros
              </Label>
              <p className="text-sm text-muted-foreground">
                Cuando está desactivado, todas las organizaciones tienen acceso completo
              </p>
            </div>
          </div>
          <Switch
            id="billing-toggle"
            checked={billingEnabled}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        {/* Status Info */}
        {!billingEnabled ? (
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <Clock className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-200">
              <strong>Modo desarrollo activo.</strong> Los trials de 30 días están registrados pero no se aplican restricciones. 
              Todas las organizaciones tienen acceso completo a todas las funcionalidades.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-primary/30 bg-primary/5">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription>
              <strong>Sistema de cobros activo.</strong> Las organizaciones en trial verán:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Banners de advertencia 7 y 3 días antes de expirar</li>
                <li>Modo solo lectura después de los 30 días</li>
                <li>CTA para activar plan de pago</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center p-3 rounded-lg bg-white dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-800">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">30</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Días de trial</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-800">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">7, 3</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Días de aviso</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
