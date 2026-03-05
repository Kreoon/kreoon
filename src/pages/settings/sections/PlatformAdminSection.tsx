import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Trash2, FileText } from 'lucide-react';
import { PlatformSecurityPanel } from '@/components/settings/PlatformSecurityPanel';
import { RootAdminPanel } from '@/components/settings/RootAdminPanel';
import { LegalConsentsAdminPanel } from '@/components/settings/LegalConsentsAdminPanel';

export default function PlatformAdminSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Administración</h2>
        <p className="text-muted-foreground">
          Seguridad de plataforma y operaciones administrativas
        </p>
      </div>

      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="security" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <FileText className="h-4 w-4" />
            Consentimientos
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Eliminar Datos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <PlatformSecurityPanel />
        </TabsContent>

        <TabsContent value="legal">
          <LegalConsentsAdminPanel />
        </TabsContent>

        <TabsContent value="admin">
          <RootAdminPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
