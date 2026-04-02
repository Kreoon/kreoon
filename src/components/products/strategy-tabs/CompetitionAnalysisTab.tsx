import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Swords, Building2, Target, DollarSign, MessageSquare, Megaphone, Globe, ExternalLink, Instagram, Facebook, Linkedin, Youtube, ChevronRight } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from 'react';

interface Competitor {
  name?: string;
  promise?: string;
  valueProposition?: string;
  differentiator?: string;
  price?: string;
  tone?: string;
  cta?: string;
  awarenessLevel?: string;
  channels?: string[];
  contentFormats?: string[];
  website?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;
  strengths?: string[];
  weaknesses?: string[];
}

interface CompetitorAnalysis {
  competitors?: Competitor[];
  differentiation?: {
    repeatedMessages?: string[] | { message: string; opportunity: string }[];
    poorlyAddressedPains?: string[] | { pain: string; opportunity: string; howToUse: string }[];
    ignoredAspirations?: string[] | { aspiration: string; opportunity: string }[];
    positioningOpportunities?: string[] | { opportunity: string; why: string; execution: string }[];
    unexploitedEmotions?: string[] | { emotion: string; howToUse: string }[];
  };
}

interface CompetitionAnalysisTabProps {
  competitorAnalysis?: CompetitorAnalysis | null;
}

function CompetitorDetailDialog({ competitor }: { competitor: Competitor }) {
  const hasSocialLinks = competitor.website || competitor.instagram || competitor.tiktok || 
                         competitor.facebook || competitor.youtube || competitor.linkedin;

  return (
    <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {competitor.name}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        {/* Links & Social Media */}
        {hasSocialLinks && (
          <div className="p-4 bg-muted dark:bg-[var(--nova-bg-elevated)] rounded-lg border border-border dark:border-[var(--nova-border-default)]">
            <p className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
              <Globe className="h-4 w-4" />
              Enlaces y Redes Sociales
            </p>
            <div className="flex flex-wrap gap-2">
              {competitor.website && (
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors duration-150"
                >
                  <Globe className="h-4 w-4" />
                  Website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {competitor.instagram && (
                <a
                  href={competitor.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 rounded-lg border border-pink-500/30 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
                >
                  <Instagram className="h-4 w-4 text-pink-500" />
                  Instagram
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {competitor.tiktok && (
                <a
                  href={competitor.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
                >
                  🎵 TikTok
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {competitor.facebook && (
                <a
                  href={competitor.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 rounded-lg border border-blue-500/30 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
                >
                  <Facebook className="h-4 w-4 text-blue-500" />
                  Facebook
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {competitor.youtube && (
                <a
                  href={competitor.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 rounded-lg border border-red-500/30 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
                >
                  <Youtube className="h-4 w-4 text-red-500" />
                  YouTube
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {competitor.linkedin && (
                <a
                  href={competitor.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 rounded-lg border border-blue-600/30 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
                >
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  LinkedIn
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Value Proposition & Promise */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitor.valueProposition && (
            <div className="p-3 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
              <p className="text-xs font-medium text-primary mb-1">Propuesta de Valor</p>
              <p className="text-sm text-zinc-300">{competitor.valueProposition}</p>
            </div>
          )}
          {competitor.promise && (
            <div className="p-3 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
              <p className="text-xs font-medium text-amber-500 mb-1">Promesa Central</p>
              <p className="text-sm text-zinc-300">{competitor.promise}</p>
            </div>
          )}
        </div>

        {/* Differentiator & Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitor.differentiator && (
            <div className="p-3 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
              <p className="text-xs font-medium text-green-500 mb-1">Diferenciador</p>
              <p className="text-sm text-zinc-300">{competitor.differentiator}</p>
            </div>
          )}
          {competitor.price && (
            <div className="p-3 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
              <p className="text-xs font-medium text-blue-500 mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Rango de Precios
              </p>
              <p className="text-sm font-medium text-zinc-300">{competitor.price}</p>
            </div>
          )}
        </div>

        {/* Tone & CTA */}
        {(competitor.tone || competitor.cta) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitor.tone && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Tono de Comunicación
                </p>
                <p className="text-sm">{competitor.tone}</p>
              </div>
            )}
            {competitor.cta && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">CTA Principal</p>
                <Badge variant="outline">{competitor.cta}</Badge>
              </div>
            )}
          </div>
        )}

        {/* Channels & Formats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitor.channels && competitor.channels.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Megaphone className="h-3 w-3" /> Canales de Ads
              </p>
              <div className="flex flex-wrap gap-1">
                {competitor.channels.map((channel, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {channel}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {competitor.contentFormats && competitor.contentFormats.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Formatos de Contenido</p>
              <div className="flex flex-wrap gap-1">
                {competitor.contentFormats.map((format, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitor.strengths && competitor.strengths.length > 0 && (
            <div className="p-3 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
              <p className="text-xs font-medium text-green-500 mb-2">Fortalezas</p>
              <ul className="space-y-1">
                {competitor.strengths.map((s, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-1 text-zinc-300">
                    <span className="text-green-500">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {competitor.weaknesses && competitor.weaknesses.length > 0 && (
            <div className="p-3 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
              <p className="text-xs font-medium text-red-500 mb-2">Debilidades</p>
              <ul className="space-y-1">
                {competitor.weaknesses.map((w, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-1 text-zinc-300">
                    <span className="text-red-500">•</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Awareness Level */}
        {competitor.awarenessLevel && (
          <div className="text-center pt-2 border-t">
            <Badge variant="secondary">
              <Target className="h-3 w-3 mr-1" />
              Nivel de Conciencia: {competitor.awarenessLevel}
            </Badge>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export function CompetitionAnalysisTab({ competitorAnalysis }: CompetitionAnalysisTabProps) {
  const competitors = competitorAnalysis?.competitors || [];
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);

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
      <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-zinc-100">
          <Swords className="h-4 w-4 text-red-500" />
          Análisis de Competencia 360°
        </h3>
        <p className="text-sm text-zinc-400">
          {competitors.length} competidores analizados. Haz clic en cada uno para ver detalles, URLs y redes sociales.
        </p>
      </div>

      {/* Competitor Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 Tabla Comparativa de Competidores</CardTitle>
          <CardDescription>Haz clic en un competidor para ver información detallada</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Marca</TableHead>
                  <TableHead className="min-w-[150px]">Promesa</TableHead>
                  <TableHead className="min-w-[150px]">Diferenciador</TableHead>
                  <TableHead className="min-w-[100px]">Precio</TableHead>
                  <TableHead className="min-w-[100px]">Tono</TableHead>
                  <TableHead className="min-w-[80px]">Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((competitor, idx) => (
                  <TableRow key={idx} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{competitor.name || `Competidor ${idx + 1}`}</span>
                        {competitor.website && (
                          <a 
                            href={competitor.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate" title={competitor.promise}>
                      {competitor.promise || '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate" title={competitor.differentiator}>
                      {competitor.differentiator || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {competitor.price || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[100px] truncate">
                      {competitor.tone || '-'}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <CompetitorDetailDialog competitor={competitor} />
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Competitor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitors.slice(0, 6).map((competitor, idx) => (
          <Dialog key={idx}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {competitor.name || `Competidor ${idx + 1}`}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {competitor.promise && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Promesa</p>
                      <p className="text-sm line-clamp-2">{competitor.promise}</p>
                    </div>
                  )}
                  
                  {competitor.price && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">{competitor.price}</Badge>
                    </div>
                  )}

                  {/* Quick social links */}
                  <div className="flex gap-2 pt-2 border-t">
                    {competitor.website && (
                      <a 
                        href={competitor.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                    {competitor.instagram && (
                      <a 
                        href={competitor.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-pink-500"
                      >
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {competitor.facebook && (
                      <a 
                        href={competitor.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-blue-500"
                      >
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {competitor.youtube && (
                      <a 
                        href={competitor.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Youtube className="h-4 w-4" />
                      </a>
                    )}
                    {competitor.linkedin && (
                      <a 
                        href={competitor.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-blue-600"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <CompetitorDetailDialog competitor={competitor} />
          </Dialog>
        ))}
      </div>
    </div>
  );
}
