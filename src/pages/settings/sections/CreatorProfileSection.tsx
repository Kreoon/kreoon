import { useState } from 'react';
import { CreatorProfileEditor } from '@/components/settings/CreatorProfileEditor';
import { TalentDNAPage } from '@/components/talent-dna';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dna, User, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CreatorProfileSection() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-sm mb-6">
          <TabsTrigger
            value="profile"
            className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-sm"
          >
            <User className="h-4 w-4" />
            Perfil Manual
          </TabsTrigger>
          <TabsTrigger
            value="talent-dna"
            className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-sm"
          >
            <Dna className="h-4 w-4" />
            ADN de Talento
            <Badge variant="outline" className="ml-1 text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              IA
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <CreatorProfileEditor />
        </TabsContent>

        <TabsContent value="talent-dna" className="mt-0">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-sm p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                <Dna className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  ADN de Talento
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    Potenciado por IA
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Graba un audio respondiendo 7 preguntas y la IA generara tu perfil profesional completo.
                  Esto te ayudara a destacar en el marketplace y atraer mas oportunidades.
                </p>
              </div>
            </div>
          </div>
          <TalentDNAPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
