import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, Building2, Target, DollarSign, MessageSquare, Megaphone } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Competitor {
  name?: string;
  promise?: string;
  differentiator?: string;
  price?: string;
  tone?: string;
  cta?: string;
  awarenessLevel?: string;
  channels?: string[];
  contentFormats?: string[];
}

interface CompetitorAnalysis {
  competitors?: Competitor[];
  differentiation?: {
    repeatedMessages?: string[];
    poorlyAddressedPains?: string[];
    ignoredAspirations?: string[];
    positioningOpportunities?: string[];
    unexploitedEmotions?: string[];
  };
}

interface CompetitionAnalysisTabProps {
  competitorAnalysis?: CompetitorAnalysis | null;
}

export function CompetitionAnalysisTab({ competitorAnalysis }: CompetitionAnalysisTabProps) {
  const competitors = competitorAnalysis?.competitors || [];

  if (competitors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Swords className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver el análisis de competencia</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg border border-red-500/20">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Swords className="h-4 w-4 text-red-500" />
          Análisis de Competencia 360°
        </h3>
        <p className="text-sm text-muted-foreground">
          {competitors.length} competidores analizados con propuesta de valor, precios, tono y estrategias.
        </p>
      </div>

      {/* Competitor Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 Tabla Comparativa de Competidores</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Marca</TableHead>
                  <TableHead className="min-w-[150px]">Promesa</TableHead>
                  <TableHead className="min-w-[150px]">Diferenciador</TableHead>
                  <TableHead className="min-w-[80px]">Precio</TableHead>
                  <TableHead className="min-w-[100px]">Tono</TableHead>
                  <TableHead className="min-w-[120px]">CTA</TableHead>
                  <TableHead className="min-w-[120px]">Nivel Conciencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((competitor, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {competitor.name || `Competidor ${idx + 1}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{competitor.promise || '-'}</TableCell>
                    <TableCell className="text-sm">{competitor.differentiator || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {competitor.price || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{competitor.tone || '-'}</TableCell>
                    <TableCell className="text-sm">{competitor.cta || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {competitor.awarenessLevel || '-'}
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

      {/* Competitor Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {competitors.slice(0, 4).map((competitor, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {competitor.name || `Competidor ${idx + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {competitor.promise && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    <Target className="h-3 w-3 inline mr-1" />
                    Promesa
                  </p>
                  <p className="text-sm">{competitor.promise}</p>
                </div>
              )}
              
              {competitor.channels && competitor.channels.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    <Megaphone className="h-3 w-3 inline mr-1" />
                    Canales
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {competitor.channels.map((channel, cIdx) => (
                      <Badge key={cIdx} variant="outline" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {competitor.contentFormats && competitor.contentFormats.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    <MessageSquare className="h-3 w-3 inline mr-1" />
                    Formatos
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {competitor.contentFormats.map((format, fIdx) => (
                      <Badge key={fIdx} variant="secondary" className="text-xs">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
