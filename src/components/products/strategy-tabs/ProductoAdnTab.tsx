import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Users, Trophy } from 'lucide-react';
import { JTBDAnalysisTab } from './JTBDAnalysisTab';
import { AvatarSegmentationTab } from './AvatarSegmentationTab';
import { PUVTransformationTab } from './PUVTransformationTab';

interface ProductoAdnTabProps {
  jtbdData?: unknown;
  avatarProfiles?: unknown;
  salesAnglesData?: unknown;
}

/**
 * ADN de Producto — pestaña unificada del Research Unificado (9 pasos).
 * Agrupa lo que antes eran 3-4 pestañas sueltas (JTBD, Dolores/Deseos,
 * Avatares, PUV) porque en el sistema nuevo son UN solo bloque: "quién es tu
 * cliente y qué le vendes". Sub-tabs internas para no saturar la pantalla.
 */
export function ProductoAdnTab({ jtbdData, avatarProfiles, salesAnglesData }: ProductoAdnTabProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
        <h3 className="font-semibold text-sm mb-2 text-zinc-100">ADN de Producto</h3>
        <p className="text-sm text-zinc-400">
          Quién es tu cliente y qué trabajo le resuelves: jobs to be done, dolores y deseos,
          avatares y tu propuesta única de valor.
        </p>
      </div>

      <Tabs defaultValue="jtbd" className="w-full">
        <TabsList className="grid grid-cols-3 h-auto gap-1">
          <TabsTrigger value="jtbd" className="gap-1.5 text-xs py-2">
            <Target className="h-3.5 w-3.5" /> Jobs y Dolores
          </TabsTrigger>
          <TabsTrigger value="avatars" className="gap-1.5 text-xs py-2">
            <Users className="h-3.5 w-3.5" /> Avatares
          </TabsTrigger>
          <TabsTrigger value="puv" className="gap-1.5 text-xs py-2">
            <Trophy className="h-3.5 w-3.5" /> PUV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jtbd" className="mt-4">
          <JTBDAnalysisTab jtbdData={jtbdData as any} />
        </TabsContent>
        <TabsContent value="avatars" className="mt-4">
          <AvatarSegmentationTab avatarProfiles={avatarProfiles as any} />
        </TabsContent>
        <TabsContent value="puv" className="mt-4">
          <PUVTransformationTab salesAnglesData={salesAnglesData as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
