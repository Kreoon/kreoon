import { Paintbrush } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WhiteLabelBrandingTab from '@/components/settings/white-label/WhiteLabelBrandingTab';
import WhiteLabelDomainTab from '@/components/settings/white-label/WhiteLabelDomainTab';
import WhiteLabelEmailTab from '@/components/settings/white-label/WhiteLabelEmailTab';
import WhiteLabelPreviewTab from '@/components/settings/white-label/WhiteLabelPreviewTab';

export default function WhiteLabelSection() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
          <Paintbrush className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Marca Blanca</h2>
          <p className="text-sm text-muted-foreground">
            Personaliza la apariencia, dominio y emails de tu organización
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">Marca Visual</TabsTrigger>
          <TabsTrigger value="domain">Dominio</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="preview">Vista Previa</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-4">
          <WhiteLabelBrandingTab />
        </TabsContent>

        <TabsContent value="domain" className="mt-4">
          <WhiteLabelDomainTab />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <WhiteLabelEmailTab />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <WhiteLabelPreviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
