import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  XCircle,
  FileVideo,
  Target,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  Play,
  Loader2,
  Zap,
  RefreshCw,
  Heart,
  Layers,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { SPHERE_PHASES, SpherePhase, getSpherePhaseConfig } from "./types";
import { HLSVideoPlayer } from "@/components/video/HLSVideoPlayer";
import { ContentAIAnalysis } from "@/components/content/ContentAIAnalysis";

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  strategy_status: string;
  sphere_phase: SpherePhase | null;
  target_platform: string | null;
  content_objective: string | null;
  hook: string | null;
  cta: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  bunny_embed_url?: string | null;
  script: string | null;
  creator?: { id: string; full_name?: string; display_name?: string; avatar_url: string | null } | null;
}

interface ContentValidationDialogProps {
  content: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string | null | undefined;
  clientId: string | null | undefined;
}

const SPHERE_ICONS: Record<SpherePhase, React.ReactNode> = {
  engage: <Zap className="h-4 w-4" />,
  solution: <Lightbulb className="h-4 w-4" />,
  remarketing: <RefreshCw className="h-4 w-4" />,
  fidelize: <Heart className="h-4 w-4" />,
};

export function ContentValidationDialog({
  content,
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  clientId,
}: ContentValidationDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [feedback, setFeedback] = useState("");
  const [strategicComment, setStrategicComment] = useState("");
  
  // Checklist states - Updated for Método Esfera
  const [checklist, setChecklist] = useState({
    meets_client_objective: false,
    aligned_with_strategy: false,
    coherent_with_esfera: false,
    follows_branding: false,
    usable_for_ads: false,
    usable_for_organic: false,
  });

  const allChecklistPassed = Object.values(checklist).every(v => v);

  const handleApprove = async () => {
    if (!content || !user || !organizationId) return;
    
    // Validate sphere_phase is assigned
    if (!content.sphere_phase) {
      toast.error('El contenido debe tener una Fase Esfera asignada');
      return;
    }
    
    setLoading(true);
    try {
      const { error: contentError } = await supabase
        .from('content')
        .update({
          strategy_status: 'aprobado_estrategia',
          marketing_approved_at: new Date().toISOString(),
          marketing_approved_by: user.id,
        })
        .eq('id', content.id);

      if (contentError) throw contentError;

      const { error: reviewError } = await supabase
        .from('content_strategy_reviews')
        .insert({
          content_id: content.id,
          organization_id: organizationId,
          client_id: clientId,
          reviewer_id: user.id,
          review_status: 'approved',
          ...checklist,
          coherent_with_esfera: checklist.coherent_with_esfera,
          sphere_phase_assigned: content.sphere_phase,
          strategic_comment: strategicComment || null,
          feedback: null,
          overall_score: Object.values(checklist).filter(v => v).length,
        });

      if (reviewError) throw reviewError;

      toast.success('Contenido aprobado para marketing');
      onSuccess();
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Error al aprobar contenido');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!content || !user || !organizationId || !feedback.trim()) {
      toast.error('El feedback es obligatorio para rechazar');
      return;
    }
    
    setLoading(true);
    try {
      const { error: contentError } = await supabase
        .from('content')
        .update({
          strategy_status: 'rechazado_estrategia',
          marketing_rejected_at: new Date().toISOString(),
          marketing_rejected_by: user.id,
          marketing_rejection_reason: feedback,
        })
        .eq('id', content.id);

      if (contentError) throw contentError;

      const { error: reviewError } = await supabase
        .from('content_strategy_reviews')
        .insert({
          content_id: content.id,
          organization_id: organizationId,
          client_id: clientId,
          reviewer_id: user.id,
          review_status: 'rejected',
          ...checklist,
          coherent_with_esfera: checklist.coherent_with_esfera,
          sphere_phase_assigned: content.sphere_phase,
          strategic_comment: strategicComment || null,
          feedback: feedback,
          overall_score: Object.values(checklist).filter(v => v).length,
        });

      if (reviewError) throw reviewError;

      toast.success('Contenido rechazado con feedback');
      setFeedback("");
      setStrategicComment("");
      setChecklist({
        meets_client_objective: false,
        aligned_with_strategy: false,
        coherent_with_esfera: false,
        follows_branding: false,
        usable_for_ads: false,
        usable_for_organic: false,
      });
      onSuccess();
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast.error('Error al rechazar contenido');
    } finally {
      setLoading(false);
    }
  };

  if (!content) return null;

  const sphereConfig = getSpherePhaseConfig(content.sphere_phase);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileVideo className="h-5 w-5" />
            Validación Estratégica - Método Esfera
          </DialogTitle>
          <DialogDescription>
            Revisa y valida el contenido según el Método Esfera
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview" className="gap-2">
              <Play className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <Target className="h-4 w-4" />
              Detalles
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Brain className="h-4 w-4" />
              Análisis IA
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Validación
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Video/Image Preview */}
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-0 overflow-hidden rounded-lg">
                      <div className="mx-auto w-full max-w-[360px] aspect-[9/16] bg-black relative flex items-center justify-center">
                        {(content.video_url || content.bunny_embed_url) ? (
                          <HLSVideoPlayer
                            src={content.video_url || content.bunny_embed_url || ''}
                            poster={content.thumbnail_url || undefined}
                            showControls={true}
                            autoPlay={false}
                            muted={false}
                            loop={false}
                            aspectRatio="9:16"
                            objectFit="contain"
                            className="w-full h-full"
                          />
                        ) : content.thumbnail_url ? (
                          <img 
                            src={content.thumbnail_url} 
                            alt={content.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileVideo className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hook */}
                  {content.hook && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Zap className="h-4 w-4 text-cyan-500" />
                          Hook
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{content.hook}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* CTA */}
                  {content.cta && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          CTA
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm font-medium">{content.cta}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Script */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-sm">Guión / Copy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {content.script ? (
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: content.script }}
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">Sin guión disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Título</Label>
                      <p className="font-medium">{content.title}</p>
                    </div>
                    {content.description && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Descripción</Label>
                        <p className="text-sm">{content.description}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">Fase Esfera</Label>
                      <div className="mt-1">
                        <Badge className={`${sphereConfig.bgColor} ${sphereConfig.color} gap-1`}>
                          {SPHERE_ICONS[content.sphere_phase]}
                          {sphereConfig.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {sphereConfig.objective}
                        </p>
                      </div>
                    </div>
                    {content.target_platform && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Plataforma Destino</Label>
                        <Badge variant="outline" className="mt-1">
                          {content.target_platform}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Contexto Método Esfera
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        {SPHERE_ICONS[content.sphere_phase]}
                        <span className="font-medium">{sphereConfig.label}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Objetivo:</span>
                          <p>{sphereConfig.objective}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tipos de contenido sugeridos:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sphereConfig.contentTypes.map(type => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Métricas clave:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sphereConfig.metrics.map(metric => (
                              <Badge key={metric} variant="outline" className="text-xs">
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {content.content_objective ? (
                      <div>
                        <Label className="text-xs text-muted-foreground">Objetivo del Contenido</Label>
                        <p className="text-sm">{content.content_objective}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">No se ha definido objetivo</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI Analysis Tab */}
            <TabsContent value="ai" className="space-y-4">
              {organizationId && content.id && (
                <ContentAIAnalysis
                  contentId={content.id}
                  organizationId={organizationId}
                  videoUrl={content.video_url || content.bunny_embed_url || undefined}
                  script={content.script || undefined}
                  spherePhase={content.sphere_phase || undefined}
                />
              )}
            </TabsContent>

            {/* Validation Tab */}
            <TabsContent value="validation" className="space-y-4">
              {/* Checklist - Updated for Método Esfera */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Checklist de Validación Esfera
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { key: 'meets_client_objective', label: '¿Cumple objetivo del cliente?' },
                      { key: 'aligned_with_strategy', label: '¿Está alineado a la estrategia?' },
                      { key: 'coherent_with_esfera', label: '¿Es coherente con la Fase Esfera?' },
                      { key: 'follows_branding', label: '¿Cumple con branding?' },
                      { key: 'usable_for_ads', label: '¿Es usable para Ads?' },
                      { key: 'usable_for_organic', label: '¿Es usable para Orgánico?' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={item.key}
                          checked={checklist[item.key as keyof typeof checklist]}
                          onCheckedChange={(checked) => 
                            setChecklist(prev => ({ ...prev, [item.key]: checked === true }))
                          }
                        />
                        <Label htmlFor={item.key} className="text-sm cursor-pointer">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Puntuación:</span>
                    <Badge variant={allChecklistPassed ? "default" : "secondary"}>
                      {Object.values(checklist).filter(v => v).length}/6
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Strategic Comment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentario Estratégico (Opcional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Agrega notas o sugerencias estratégicas basadas en el Método Esfera..."
                    value={strategicComment}
                    onChange={(e) => setStrategicComment(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Rejection Feedback */}
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Feedback de Rechazo (Obligatorio para rechazar)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Explica por qué rechazas este contenido y qué debe mejorarse según el Método Esfera..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    className="border-red-200 dark:border-red-800 focus:border-red-500"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !feedback.trim()}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Rechazar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Aprobar para Marketing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}