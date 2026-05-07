import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clapperboard,
  Megaphone,
  MessageSquare,
  Copy,
  Check,
  Clock,
  Camera,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DirectorOutput, CaptionVariation } from '@/types/database';

interface ContentOutputTabsProps {
  directorOutput?: DirectorOutput;
  captions?: CaptionVariation[];
  editorGuidelines?: string;
  traffickerGuidelines?: string;
  strategistGuidelines?: string;
  designerGuidelines?: string;
  adminGuidelines?: string;
  className?: string;
}

export function ContentOutputTabs({
  directorOutput,
  captions,
  editorGuidelines,
  traffickerGuidelines,
  strategistGuidelines,
  designerGuidelines,
  adminGuidelines,
  className,
}: ContentOutputTabsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasDirector = !!directorOutput?.scenes?.length;
  const hasCaptions = !!captions?.length;
  const hasMarketing =
    editorGuidelines ||
    traffickerGuidelines ||
    strategistGuidelines ||
    designerGuidelines ||
    adminGuidelines;

  if (!hasDirector && !hasCaptions && !hasMarketing) {
    return null;
  }

  return (
    <Tabs defaultValue="director" className={cn('w-full', className)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="director" className="gap-2" disabled={!hasDirector}>
          <Clapperboard className="h-4 w-4" />
          <span className="hidden sm:inline">Director</span>
        </TabsTrigger>
        <TabsTrigger value="marketing" className="gap-2" disabled={!hasMarketing}>
          <Megaphone className="h-4 w-4" />
          <span className="hidden sm:inline">Marketing</span>
        </TabsTrigger>
        <TabsTrigger value="captions" className="gap-2" disabled={!hasCaptions}>
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Captions</span>
        </TabsTrigger>
      </TabsList>

      {/* Director Tab - Production Table */}
      <TabsContent value="director" className="space-y-4">
        {directorOutput && (
          <>
            {/* Summary Stats */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {directorOutput.totalDuration}s total
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Camera className="h-3 w-3" />
                {directorOutput.totalScenes} escenas
              </Badge>
            </div>

            {/* Setup Required */}
            {directorOutput.setupRequired?.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Setup Requerido</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {directorOutput.setupRequired.map((item, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scenes Table */}
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left w-12">#</th>
                      <th className="p-2 text-left w-20">Tiempo</th>
                      <th className="p-2 text-left">Guion Verbal</th>
                      <th className="p-2 text-left">Guion Visual</th>
                      <th className="p-2 text-left w-32">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directorOutput.scenes.map((scene) => (
                      <tr key={scene.number} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-mono text-center">
                          <Badge variant="outline" className="w-8 justify-center">
                            {scene.number}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono text-xs">{scene.time}</td>
                        <td className="p-2">
                          <p className="font-medium">"{scene.verbalScript}"</p>
                          {scene.tone && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Tono: {scene.tone}
                            </p>
                          )}
                        </td>
                        <td className="p-2 space-y-1 text-xs">
                          <p>
                            <strong>Accion:</strong> {scene.visualScript.action}
                          </p>
                          <p>
                            <strong>Plano:</strong> {scene.visualScript.shot}
                          </p>
                          <p>
                            <strong>Angulo:</strong> {scene.visualScript.angle}
                          </p>
                          <p>
                            <strong>Producto:</strong>{' '}
                            {scene.visualScript.productVisible ? 'Si' : 'No'}
                          </p>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {scene.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>

            {/* Director Notes */}
            {directorOutput.directorNotes?.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Notas del Director
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {directorOutput.directorNotes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </TabsContent>

      {/* Marketing Tab - Guidelines */}
      <TabsContent value="marketing" className="space-y-4">
        {editorGuidelines && (
          <GuidelineCard
            title="Editor"
            content={editorGuidelines}
            icon="scissors"
            onCopy={() => copyToClipboard(editorGuidelines, 'editor')}
            copied={copiedId === 'editor'}
          />
        )}
        {traffickerGuidelines && (
          <GuidelineCard
            title="Trafficker"
            content={traffickerGuidelines}
            icon="target"
            onCopy={() => copyToClipboard(traffickerGuidelines, 'trafficker')}
            copied={copiedId === 'trafficker'}
          />
        )}
        {strategistGuidelines && (
          <GuidelineCard
            title="Estratega"
            content={strategistGuidelines}
            icon="lightbulb"
            onCopy={() => copyToClipboard(strategistGuidelines, 'strategist')}
            copied={copiedId === 'strategist'}
          />
        )}
        {designerGuidelines && (
          <GuidelineCard
            title="Disenador"
            content={designerGuidelines}
            icon="palette"
            onCopy={() => copyToClipboard(designerGuidelines, 'designer')}
            copied={copiedId === 'designer'}
          />
        )}
        {adminGuidelines && (
          <GuidelineCard
            title="Admin"
            content={adminGuidelines}
            icon="shield"
            onCopy={() => copyToClipboard(adminGuidelines, 'admin')}
            copied={copiedId === 'admin'}
          />
        )}
      </TabsContent>

      {/* Captions Tab */}
      <TabsContent value="captions" className="space-y-4">
        {/* Organic Captions */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              Organico
            </Badge>
            <span className="text-muted-foreground">Para engagement</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {captions
              ?.filter((c) => c.type === 'organic')
              .map((caption, i) => (
                <CaptionCard
                  key={`organic-${i}`}
                  caption={caption}
                  onCopy={() => copyToClipboard(caption.content, `caption-organic-${i}`)}
                  copied={copiedId === `caption-organic-${i}`}
                />
              ))}
          </div>
        </div>

        {/* Ads Captions */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
              Ads
            </Badge>
            <span className="text-muted-foreground">Para conversion</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {captions
              ?.filter((c) => c.type === 'ads')
              .map((caption, i) => (
                <CaptionCard
                  key={`ads-${i}`}
                  caption={caption}
                  onCopy={() => copyToClipboard(caption.content, `caption-ads-${i}`)}
                  copied={copiedId === `caption-ads-${i}`}
                />
              ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

interface GuidelineCardProps {
  title: string;
  content: string;
  icon: string;
  onCopy: () => void;
  copied: boolean;
}

function GuidelineCard({ title, content, onCopy, copied }: GuidelineCardProps) {
  return (
    <Card>
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCopy} className="h-7 w-7 p-0">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="py-2">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  );
}

interface CaptionCardProps {
  caption: CaptionVariation;
  onCopy: () => void;
  copied: boolean;
}

function CaptionCard({ caption, onCopy, copied }: CaptionCardProps) {
  return (
    <Card className={cn(
      'transition-colors',
      caption.type === 'organic' && 'border-green-500/20',
      caption.type === 'ads' && 'border-blue-500/20'
    )}>
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-sm">{caption.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{caption.objective}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCopy} className="h-7 w-7 p-0">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        <p className="text-sm whitespace-pre-wrap">{caption.content}</p>
        <div className="flex items-center gap-2 pt-2 border-t">
          <Badge variant="outline" className="text-xs">
            {caption.platform}
          </Badge>
          {caption.compliance && (
            <Badge variant="outline" className="text-xs text-green-600">
              Compliance OK
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
