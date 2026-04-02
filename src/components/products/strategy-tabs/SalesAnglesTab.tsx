import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Heart, Users, Video, Hash, Megaphone } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SalesAngle {
  angle?: string;
  type?: string;
  avatar?: string;
  emotion?: string;
  contentType?: string;
  hookExample?: string;
  ctaExample?: string;
  funnelPhase?: string;
  hashtags?: string[];
  whyItWorks?: string;
  developmentTips?: string;
}

interface SalesAnglesData {
  angles?: SalesAngle[];
}

interface SalesAnglesTabProps {
  salesAnglesData?: SalesAnglesData | null;
}

const FUNNEL_LABELS: Record<string, string> = {
  'tofu': 'TOFU',
  'mofu': 'MOFU',
  'bofu': 'BOFU',
};

const FUNNEL_COLORS: Record<string, string> = {
  'tofu': 'bg-sky-900/50 text-sky-400',
  'mofu': 'bg-amber-900/50 text-amber-400',
  'bofu': 'bg-green-900/50 text-green-400',
};

const TYPE_COLORS: Record<string, string> = {
  'educativo': 'bg-blue-900/50 text-blue-400',
  'emocional': 'bg-pink-900/50 text-pink-400',
  'aspiracional': 'bg-purple-900/50 text-purple-400',
  'autoridad': 'bg-amber-900/50 text-amber-400',
  'comparativo': 'bg-green-900/50 text-green-400',
  'anti-mercado': 'bg-red-900/50 text-red-400',
  'storytelling': 'bg-indigo-900/50 text-indigo-400',
  'prueba-social': 'bg-teal-900/50 text-teal-400',
  'error-comun': 'bg-orange-900/50 text-orange-400',
};

export function SalesAnglesTab({ salesAnglesData }: SalesAnglesTabProps) {
  const angles = salesAnglesData?.angles || [];

  if (angles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver los ángulos de venta</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-zinc-100">
          <Sparkles className="h-4 w-4 text-amber-500" />
          20 Ángulos de Venta Estratégicos
        </h3>
        <p className="text-sm text-zinc-400">
          Ángulos variados: educativos, emocionales, aspiracionales, autoridad, comparativos, anti-mercado, storytelling, prueba social y error común.
        </p>
      </div>

      {/* Summary by Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 Distribución por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(
              angles.reduce((acc, angle) => {
                const type = angle.type || 'otro';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <Badge key={type} className={TYPE_COLORS[type] || 'bg-zinc-800 text-zinc-400'}>
                {type}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Angles Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📝 Tabla de Ángulos de Venta</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead className="min-w-[200px]">Ángulo</TableHead>
                  <TableHead className="min-w-[100px]">Tipo</TableHead>
                  <TableHead className="min-w-[80px]">Funnel</TableHead>
                  <TableHead className="min-w-[120px]">Avatar</TableHead>
                  <TableHead className="min-w-[100px]">Emoción</TableHead>
                  <TableHead className="min-w-[180px]">Hook</TableHead>
                  <TableHead className="min-w-[100px]">Formato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {angles.map((angle, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold text-primary">{idx + 1}</TableCell>
                    <TableCell className="text-sm">{angle.angle || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${TYPE_COLORS[angle.type || ''] || 'bg-zinc-800 text-zinc-400'}`}>
                        {angle.type || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {angle.funnelPhase && (
                        <Badge className={`text-xs ${FUNNEL_COLORS[angle.funnelPhase] || 'bg-zinc-800 text-zinc-400'}`}>
                          {FUNNEL_LABELS[angle.funnelPhase] || angle.funnelPhase}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {angle.avatar || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-pink-500" />
                        {angle.emotion || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm italic text-muted-foreground">
                      {angle.hookExample ? `"${angle.hookExample}"` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Video className="h-3 w-3 mr-1" />
                        {angle.contentType || '-'}
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

      {/* Angle Cards - All */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {angles.map((angle, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${TYPE_COLORS[angle.type || ''] || 'bg-zinc-800 text-zinc-400'}`}>
                    {angle.type}
                  </Badge>
                  {angle.funnelPhase && (
                    <Badge className={`text-xs ${FUNNEL_COLORS[angle.funnelPhase] || 'bg-zinc-800 text-zinc-400'}`}>
                      {FUNNEL_LABELS[angle.funnelPhase] || angle.funnelPhase}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{angle.angle}</p>

              {angle.hookExample && (
                <div className="p-2 bg-[#1a1a24] border border-zinc-800 dark:border-zinc-700/50 rounded-lg">
                  <p className="text-xs font-medium text-amber-500 mb-1 flex items-center gap-1">
                    <Megaphone className="h-3 w-3" /> Hook
                  </p>
                  <p className="text-sm italic text-zinc-300">"{angle.hookExample}"</p>
                </div>
              )}

              {angle.ctaExample && (
                <div className="p-2 bg-[#1a1a24] border border-zinc-800 dark:border-zinc-700/50 rounded-lg">
                  <p className="text-xs font-medium text-green-500 mb-1">CTA</p>
                  <p className="text-sm text-zinc-300">{angle.ctaExample}</p>
                </div>
              )}

              {angle.whyItWorks && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-purple-600">Por qué funciona:</span> {angle.whyItWorks}
                </p>
              )}

              {angle.developmentTips && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-blue-600">Desarrollo:</span> {angle.developmentTips}
                </p>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1 border-t">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {angle.avatar}</span>
                <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-pink-500" /> {angle.emotion}</span>
                <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {angle.contentType}</span>
              </div>

              {angle.hashtags && angle.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {angle.hashtags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-normal">
                      <Hash className="h-2.5 w-2.5 mr-0.5" />{tag.replace(/^#/, '')}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
