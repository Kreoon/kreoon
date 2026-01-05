import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Target, Users, Brain, FileText, Video } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeadMagnet {
  name?: string;
  objective?: string;
  contentType?: string;
  pain?: string;
  avatar?: string;
  awarenessPhase?: string;
}

interface Creative {
  angle?: string;
  avatar?: string;
  title?: string;
  idea?: string;
  format?: string;
  esferaPhase?: string;
  duration?: string;
}

interface SalesAnglesData {
  leadMagnets?: LeadMagnet[];
  videoCreatives?: Creative[]; // creativos multi-formato (se mantiene el nombre por compatibilidad)
}

interface LeadMagnetsCreativesTabProps {
  salesAnglesData?: SalesAnglesData | null;
}

const PHASE_COLORS: Record<string, string> = {
  'enganchar': 'bg-red-100 text-red-700',
  'solucion': 'bg-blue-100 text-blue-700',
  'remarketing': 'bg-purple-100 text-purple-700',
  'fidelizar': 'bg-green-100 text-green-700',
};

export function LeadMagnetsCreativesTab({ salesAnglesData }: LeadMagnetsCreativesTabProps) {
  const leadMagnets = salesAnglesData?.leadMagnets || [];
  const videoCreatives = salesAnglesData?.videoCreatives || [];

  const hasData = leadMagnets.length > 0 || videoCreatives.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver Lead Magnets y Creativos</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Lead Magnets Section */}
      {leadMagnets.length > 0 && (
        <>
          <div className="p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-lg border border-pink-500/20">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Gift className="h-4 w-4 text-pink-500" />
              3 Lead Magnets Estratégicos
            </h3>
            <p className="text-sm text-muted-foreground">
              Recursos gratuitos diseñados para captar leads calificados en diferentes fases de conciencia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leadMagnets.map((lm, idx) => (
              <Card key={idx} className="border-pink-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Lead Magnet #{idx + 1}
                    </Badge>
                    {lm.awarenessPhase && (
                      <Badge variant="secondary" className="text-xs">
                        <Brain className="h-3 w-3 mr-1" />
                        {lm.awarenessPhase}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-2">{lm.name || `Lead Magnet ${idx + 1}`}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lm.objective && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">🎯 Objetivo</p>
                      <p className="text-sm">{lm.objective}</p>
                    </div>
                  )}
                  {lm.contentType && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">📄 Tipo de Contenido</p>
                      <p className="text-sm">{lm.contentType}</p>
                    </div>
                  )}
                  {lm.pain && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">💢 Dolor que Ataca</p>
                      <p className="text-sm">{lm.pain}</p>
                    </div>
                  )}
                  {lm.avatar && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {lm.avatar}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

       {/* Creatives Section */}
       {videoCreatives.length > 0 && (
         <>
           <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-lg border border-indigo-500/20">
             <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
               <Video className="h-4 w-4 text-indigo-500" />
               {videoCreatives.length} Creativos (multi-formato)
             </h3>
             <p className="text-sm text-muted-foreground">
               Ideas distribuidas por fase ESFERA y por formato (video, carrusel, imagen, email, landing, etc.).
             </p>
           </div>

          {/* Summary by Phase */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📊 Distribución por Fase ESFERA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  videoCreatives.reduce((acc, vc) => {
                    const phase = vc.esferaPhase || 'otro';
                    acc[phase] = (acc[phase] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([phase, count]) => (
                  <Badge key={phase} className={PHASE_COLORS[phase] || 'bg-gray-100 text-gray-700'}>
                    {phase}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Video Creatives Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🎬 Tabla de Creativos</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead className="min-w-[100px]">Fase</TableHead>
                      <TableHead className="min-w-[150px]">Título</TableHead>
                      <TableHead className="min-w-[200px]">Idea Principal</TableHead>
                      <TableHead className="min-w-[100px]">Ángulo</TableHead>
                      <TableHead className="min-w-[100px]">Avatar</TableHead>
                      <TableHead className="min-w-[80px]">Formato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videoCreatives.map((vc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold">{idx + 1}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${PHASE_COLORS[vc.esferaPhase || ''] || 'bg-gray-100 text-gray-700'}`}>
                            {vc.esferaPhase || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{vc.title || '-'}</TableCell>
                        <TableCell className="text-sm">{vc.idea || '-'}</TableCell>
                        <TableCell className="text-sm">{vc.angle || '-'}</TableCell>
                        <TableCell className="text-sm">{vc.avatar || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {vc.format || '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
