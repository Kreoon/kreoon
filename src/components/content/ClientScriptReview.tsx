import { useState, useMemo, useCallback, useEffect } from 'react';
import { Content, ContentStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { 
  FileText,
  CheckCircle2,
  MessageCircle,
  Loader2,
  Send,
  Calendar,
  Package,
  ChevronDown,
  ChevronUp,
  Edit3,
  Lock,
  Clock,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ClientScriptReviewProps {
  content: Content;
  onUpdate?: () => void;
  userId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  section?: string;
  section_index?: number;
  comment_type?: string;
  profile?: { full_name: string; avatar_url?: string };
}

interface ScriptScene {
  id: number;
  title: string;
  visual: string;
  dialogue: string;
  emotion: string;
  isCTA?: boolean;
}

// Parse script content into scenes
function parseScriptToScenes(script: string | null): ScriptScene[] {
  if (!script) return [];

  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(script, 'text/html');
  const text = doc.body.textContent || '';
  
  const scenes: ScriptScene[] = [];
  
  // Try to find scene patterns
  const scenePattern = /escena\s*(\d+)[^a-z]*([^]*?)(?=escena\s*\d+|cierre|cta|llamada|$)/gi;
  const matches = [...text.matchAll(scenePattern)];
  
  if (matches.length > 0) {
    matches.forEach((match, idx) => {
      const sceneNum = parseInt(match[1]);
      const sceneContent = match[2] || '';
      
      scenes.push({
        id: sceneNum,
        title: idx === 0 ? 'Apertura' : idx === matches.length - 1 ? 'Desarrollo final' : 'Desarrollo',
        visual: extractSection(sceneContent, ['visual:', 'se ve:', '🎥']) || 'Plano del creador frente a cámara',
        dialogue: extractSection(sceneContent, ['voz:', 'dice:', '🎙️', 'diálogo:', 'guión:']) || sceneContent.trim().slice(0, 300),
        emotion: extractSection(sceneContent, ['emoción:', 'tono:', '😌', 'intención:']) || 'Conversacional'
      });
    });
  }
  
  // If no scenes found, try to parse by sections
  if (scenes.length === 0) {
    // Look for hook section
    const hookSection = extractSection(text, ['hooks', '🎯 hooks', 'ganchos']);
    if (hookSection && hookSection.length > 20) {
      scenes.push({
        id: 1,
        title: 'Apertura (Hooks)',
        visual: 'Plano cercano del creador, contacto visual directo',
        dialogue: hookSection.slice(0, 400),
        emotion: 'Disruptivo, atención inmediata'
      });
    }
    
    // Look for main development
    const developSection = extractSection(text, ['desarrollo', '💬', 'guión principal', 'cuerpo']);
    if (developSection && developSection.length > 20) {
      scenes.push({
        id: scenes.length + 1,
        title: 'Desarrollo',
        visual: 'Creador explicando con gestos naturales',
        dialogue: developSection.slice(0, 500),
        emotion: 'Educativo, cercano'
      });
    }
    
    // Look for CTA
    const ctaSection = extractSection(text, ['cta', '📢', 'cierre', 'llamada a la acción']);
    if (ctaSection && ctaSection.length > 10) {
      scenes.push({
        id: scenes.length + 1,
        title: 'Cierre (CTA)',
        visual: 'Plano cercano, mirada directa a cámara',
        dialogue: ctaSection.slice(0, 300),
        emotion: 'Motivacional, llamada a acción',
        isCTA: true
      });
    }
  }
  
  // If still no scenes, create a single scene from the content
  if (scenes.length === 0 && text.length > 50) {
    scenes.push({
      id: 1,
      title: 'Contenido del video',
      visual: 'Creador frente a cámara',
      dialogue: text.slice(0, 600),
      emotion: 'Conversacional'
    });
  }
  
  return scenes;
}

// Helper to extract a section from text
function extractSection(text: string, startMarkers: string[]): string {
  const lowerText = text.toLowerCase();
  let start = -1;
  
  for (const marker of startMarkers) {
    const idx = lowerText.indexOf(marker.toLowerCase());
    if (idx !== -1) {
      start = idx + marker.length;
      break;
    }
  }
  
  if (start === -1) return '';
  
  // Find next section marker or end
  const endMarkers = ['escena', 'visual:', 'voz:', 'emoción:', 'cta', 'hooks', 'desarrollo', '🎯', '💬', '📢'];
  let end = text.length;
  
  for (const marker of endMarkers) {
    const idx = lowerText.indexOf(marker.toLowerCase(), start + 10);
    if (idx !== -1 && idx < end) {
      end = idx;
    }
  }
  
  return text.slice(start, end).trim().replace(/^[:\s\-]+/, '').trim();
}

const changeRequestOptions = [
  { id: 'hooks', label: 'Cambiar hooks/apertura' },
  { id: 'tone', label: 'Ajustar tono' },
  { id: 'cta', label: 'Modificar CTA' },
  { id: 'duration', label: 'Ajustar duración' },
  { id: 'escenas', label: 'Modificar escenas' },
  { id: 'other', label: 'Otro' },
];

export function ClientScriptReview({ content, onUpdate, userId, open, onOpenChange }: ClientScriptReviewProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeCommentScene, setActiveCommentScene] = useState<number | null>(null);
  const [generalComment, setGeneralComment] = useState('');
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [selectedChangeTypes, setSelectedChangeTypes] = useState<string[]>([]);
  const [changeDescription, setChangeDescription] = useState('');
  const [expandedScenes, setExpandedScenes] = useState<number[]>([]);

  const isApproved = content.status === 'script_approved' || content.script_approved_at;
  const scriptVersion = (content as any).script_version || 1;

  // Parse script into scenes
  const scenes = useMemo(() => parseScriptToScenes(content.script), [content.script]);

  // Expand all scenes by default
  useEffect(() => {
    if (scenes.length > 0 && expandedScenes.length === 0) {
      setExpandedScenes(scenes.map(s => s.id));
    }
  }, [scenes]);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const { data: commentsData } = await supabase
        .from('content_comments')
        .select('*')
        .eq('content_id', content.id)
        .order('created_at', { ascending: true });

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
        setComments(commentsData.map(c => ({
          ...c,
          profile: profileMap.get(c.user_id) || { full_name: 'Usuario' }
        })));
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [content.id]);

  const handleAddSceneComment = async (sceneId: number) => {
    if (!userId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: userId,
          comment: newComment.trim(),
          section: 'scene',
          section_index: sceneId,
          comment_type: 'section'
        });
      if (error) throw error;
      setNewComment('');
      setActiveCommentScene(null);
      fetchComments();
      toast({ title: 'Comentario agregado' });
    } catch (error) {
      toast({ title: 'Error al agregar comentario', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddGeneralComment = async () => {
    if (!userId || !generalComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: userId,
          comment: generalComment.trim(),
          comment_type: 'general'
        });
      if (error) throw error;
      setGeneralComment('');
      fetchComments();
      toast({ title: 'Comentario agregado' });
    } catch (error) {
      toast({ title: 'Error al agregar comentario', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!userId || selectedChangeTypes.length === 0) return;
    setSubmitting(true);
    try {
      const changeRequest = {
        types: selectedChangeTypes,
        description: changeDescription,
        requestedAt: new Date().toISOString(),
        requestedBy: userId
      };
      
      const { error: commentError } = await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: userId,
          comment: `Solicitud de cambios: ${selectedChangeTypes.join(', ')}${changeDescription ? ` - ${changeDescription}` : ''}`,
          comment_type: 'change_request'
        });

      if (commentError) throw commentError;

      const currentRequests = (content as any).change_requests || [];
      const { error: updateError } = await supabase
        .from('content')
        .update({
          change_request_status: 'pending',
          change_requests: [...currentRequests, changeRequest]
        })
        .eq('id', content.id);

      if (updateError) throw updateError;

      toast({ title: 'Solicitud de cambios enviada' });
      setShowChangeRequest(false);
      setSelectedChangeTypes([]);
      setChangeDescription('');
      fetchComments();
      onUpdate?.();
    } catch (error) {
      toast({ title: 'Error al solicitar cambios', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveScript = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content')
        .update({ 
          status: 'script_approved' as ContentStatus,
          script_approved_at: new Date().toISOString(),
          script_approved_by: userId,
          change_request_status: null
        })
        .eq('id', content.id);

      if (error) throw error;

      await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: userId,
          comment: 'Guión aprobado por el cliente',
          comment_type: 'general'
        });

      toast({ title: 'Guión aprobado', description: 'El guión ha sido aprobado exitosamente' });
      onOpenChange(false);
      onUpdate?.();
    } catch (error) {
      toast({ title: 'Error al aprobar guión', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      fetchComments();
    }
    onOpenChange(isOpen);
  };

  const getSceneComments = (sceneId: number) => 
    comments.filter(c => c.section === 'scene' && c.section_index === sceneId);

  const getGeneralComments = () => 
    comments.filter(c => c.comment_type === 'general' || !c.section);

  const toggleScene = (id: number) => {
    setExpandedScenes(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleChangeType = (id: string) => {
    setSelectedChangeTypes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* Fixed Header with Actions */}
        <div className="sticky top-0 z-20 bg-background border-b shrink-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                    <FileText className="h-3 w-3 mr-1" />
                    Guión del Video
                  </Badge>
                  <Badge className={cn("text-xs", isApproved ? "bg-green-500" : "bg-amber-500")}>
                    {isApproved ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aprobado
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        En revisión
                      </>
                    )}
                  </Badge>
                  <Badge variant="outline" className="text-xs">v{scriptVersion}</Badge>
                </div>
                <DialogTitle className="text-lg font-bold truncate">{content.title}</DialogTitle>
                
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {(content as any).client?.name && (
                    <div className="flex items-center gap-1.5">
                      <Package className="h-4 w-4" />
                      <span>{(content as any).client.name}</span>
                    </div>
                  )}
                  {content.deadline && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>Entrega: {format(new Date(content.deadline), "d 'de' MMMM", { locale: es })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Action Buttons */}
              <div className="flex gap-2 shrink-0">
                {!isApproved ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChangeRequest(true)}
                      className="gap-1"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Solicitar cambios</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApproveScript}
                      disabled={submitting}
                      className="gap-1 bg-green-600 hover:bg-green-700"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Aprobar guión</span>
                      <span className="sm:hidden">Aprobar</span>
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 px-3 py-2 rounded-lg">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium hidden sm:inline">Guión bloqueado</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Script Container - Single unified view */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{ 
            maxHeight: '70vh',
            scrollbarWidth: 'auto',
            scrollbarColor: 'hsl(var(--muted-foreground)) transparent'
          }}
        >
          <div className="p-4 sm:p-6 space-y-4">
            {scenes.length > 0 ? (
              scenes.map((scene, idx) => (
                <Collapsible
                  key={scene.id}
                  open={expandedScenes.includes(scene.id)}
                  onOpenChange={() => toggleScene(scene.id)}
                  className="border rounded-xl overflow-hidden bg-card"
                >
                  {/* Scene Header */}
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-transparent data-[state=open]:border-border">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg",
                          scene.isCTA 
                            ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-600" 
                            : idx === 0 
                              ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600"
                              : "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600"
                        )}>
                          {scene.id}
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-base">
                            ESCENA {scene.id} · {scene.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {scene.dialogue.slice(0, 50)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSceneComments(scene.id).length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {getSceneComments(scene.id).length}
                          </Badge>
                        )}
                        {expandedScenes.includes(scene.id) ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="p-4 space-y-4">
                      {/* Visual - Light blue background */}
                      <div className="bg-sky-50 dark:bg-sky-950/30 rounded-lg p-4 border border-sky-200/50 dark:border-sky-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🎥</span>
                          <span className="font-semibold text-sky-700 dark:text-sky-300 text-sm uppercase tracking-wide">Qué se ve</span>
                        </div>
                        <p className="text-sm leading-relaxed">{scene.visual}</p>
                      </div>

                      {/* Dialogue - Light green background */}
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 border border-emerald-200/50 dark:border-emerald-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🗣</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm uppercase tracking-wide">Qué se dice</span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{scene.dialogue}</p>
                      </div>

                      {/* Emotion - Small, subtle */}
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-base">😶</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Emoción:</span>
                        <span className="text-sm text-muted-foreground italic">{scene.emotion}</span>
                      </div>

                      {/* Separator */}
                      <div className="border-t border-dashed pt-3">
                        {/* Scene Comments */}
                        {getSceneComments(scene.id).length > 0 && (
                          <div className="space-y-2 mb-3">
                            {getSceneComments(scene.id).map((comment) => (
                              <div key={comment.id} className="flex items-start gap-2 bg-muted/50 rounded-lg p-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={comment.profile?.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {comment.profile?.full_name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">{comment.profile?.full_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(comment.created_at), "d MMM, HH:mm", { locale: es })}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{comment.comment}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comment Button/Input */}
                        {activeCommentScene === scene.id ? (
                          <div className="flex gap-2">
                            <Textarea
                              placeholder={`Comentar escena ${scene.id}...`}
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="min-h-[60px] text-sm flex-1"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex flex-col gap-1">
                              <Button
                                size="icon"
                                onClick={() => handleAddSceneComment(scene.id)}
                                disabled={submitting || !newComment.trim()}
                              >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setActiveCommentScene(null);
                                  setNewComment('');
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveCommentScene(scene.id)}
                            className="text-xs text-muted-foreground hover:text-foreground w-full justify-start"
                          >
                            <MessageCircle className="h-3 w-3 mr-1.5" />
                            Comentar esta escena
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No hay guión disponible</p>
                <p className="text-sm">El guión aún no ha sido generado para este contenido.</p>
              </div>
            )}

            {/* General Comments Section */}
            {scenes.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Comentarios Generales
                </h3>

                {/* Existing General Comments */}
                {getGeneralComments().length > 0 && (
                  <div className="space-y-3 mb-4">
                    {getGeneralComments().map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.profile?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {comment.profile?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{comment.profile?.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add General Comment */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Escribe un comentario general sobre el guión..."
                    value={generalComment}
                    onChange={(e) => setGeneralComment(e.target.value)}
                    className="min-h-[80px] text-sm"
                    rows={3}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddGeneralComment}
                    disabled={submitting || !generalComment.trim()}
                    className="shrink-0 h-10 w-10"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Request Modal */}
        {showChangeRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Solicitar Cambios</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChangeRequest(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 mb-4">
                <p className="text-sm text-muted-foreground">¿Qué te gustaría cambiar?</p>
                {changeRequestOptions.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedChangeTypes.includes(option.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={selectedChangeTypes.includes(option.id)}
                      onCheckedChange={() => toggleChangeType(option.id)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>

              <Textarea
                placeholder="Describe los cambios que necesitas (opcional)..."
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                className="min-h-[100px] mb-4"
              />

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowChangeRequest(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRequestChanges}
                  disabled={submitting || selectedChangeTypes.length === 0}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Enviar solicitud
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
