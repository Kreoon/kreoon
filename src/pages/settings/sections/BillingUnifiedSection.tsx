import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, CreditCard, Receipt, Coins } from 'lucide-react';
import { SubscriptionManagement } from '@/components/settings/SubscriptionManagement';
import { UserPlansManagement } from '@/components/settings/UserPlansManagement';
import { BillingControlPanel } from '@/components/settings/BillingControlPanel';
import { CurrencyManagement } from '@/components/settings/CurrencyManagement';

export default function BillingUnifiedSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Facturación y Planes</h2>
        <p className="text-muted-foreground">
          Gestiona planes, suscripciones, monedas y configuración de cobros
        </p>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plans" className="gap-2">
            <Crown className="h-4 w-4" />
            Planes
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="currency" className="gap-2">
            <Coins className="h-4 w-4" />
            Monedas
          </TabsTrigger>
          <TabsTrigger value="control" className="gap-2">
            <Receipt className="h-4 w-4" />
            Control
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <SubscriptionManagement />
        </TabsContent>

        <TabsContent value="users">
          <UserPlansManagement />
        </TabsContent>

        <TabsContent value="currency">
          <CurrencyManagement />
        </TabsContent>

        <TabsContent value="control">
          <BillingControlPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
