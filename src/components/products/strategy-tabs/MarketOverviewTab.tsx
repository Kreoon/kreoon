import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, TrendingUp, Target, Lightbulb } from 'lucide-react';

interface BriefData {
  category?: string;
  customCategory?: string;
  currentObjective?: string;
  platforms?: string[];
  useForAds?: string;
}

interface MarketOverviewTabProps {
  briefData?: BriefData | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta (Facebook/Instagram)',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  youtube_shorts: 'YouTube Shorts',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  pinterest: 'Pinterest',
  email: 'Email Marketing',
  whatsapp: 'WhatsApp',
};

export function MarketOverviewTab({ briefData }: MarketOverviewTabProps) {
  if (!briefData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Completa el Brief IA para ver el panorama del mercado</p>
      </div>
    );
  }

  const category = briefData.customCategory || briefData.category || 'No definida';
  const objective = briefData.currentObjective || 'No definido';
  const platforms = briefData.platforms || [];
  const useForAds = briefData.useForAds || 'No especificado';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Categoría de Mercado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-sm">{category}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Objetivo Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{objective}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Plataformas Objetivo
          </CardTitle>
          <CardDescription>Canales donde se distribuirá el contenido</CardDescription>
        </CardHeader>
        <CardContent>
          {platforms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => (
                <Badge key={platform} variant="outline">
                  {PLATFORM_LABELS[platform] || platform}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay plataformas definidas</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Uso en Publicidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{useForAds}</p>
        </CardContent>
      </Card>
    </div>
  );
}
