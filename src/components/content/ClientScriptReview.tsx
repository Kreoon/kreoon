import { useState, useMemo, useCallback, useEffect } from 'react';
import { Content, ContentStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  X,
  Scissors,
  Target,
  Megaphone,
  Palette,
  ClipboardList,
  Play,
  Zap,
  Users,
  TrendingUp,
  Image,
  Type,
  CheckSquare,
  History
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

  const parser = new DOMParser();
  const doc = parser.parseFromString(script, 'text/html');
  const text = doc.body.textContent || '';
  
  const scenes: ScriptScene[] = [];
  
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
  
  if (scenes.length === 0) {
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

// Parse HTML content to structured list items
function parseGuidelinesToItems(html: string | null): string[] {
  if (!html) return [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const items: string[] = [];
  
  // Extract list items
  doc.querySelectorAll('li').forEach(li => {
    const text = li.textContent?.trim();
    if (text) items.push(text);
  });
  
  // If no list items, try paragraphs
  if (items.length === 0) {
    doc.querySelectorAll('p').forEach(p => {
      const text = p.textContent?.trim();
      if (text && text.length > 10) items.push(text);
    });
  }
  
  // Fallback to text content split by newlines
  if (items.length === 0) {
    const text = doc.body.textContent || '';
    text.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 10) items.push(trimmed);
    });
  }
  
  return items.slice(0, 10);
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
  const [activeTab, setActiveTab] = useState('guion');
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

  const scenes = useMemo(() => parseScriptToScenes(content.script), [content.script]);
  const editorItems = useMemo(() => parseGuidelinesToItems(content.editor_guidelines), [content.editor_guidelines]);
  const strategistItems = useMemo(() => parseGuidelinesToItems(content.strategist_guidelines), [content.strategist_guidelines]);
  const traffickerItems = useMemo(() => parseGuidelinesToItems(content.trafficker_guidelines), [content.trafficker_guidelines]);
  const designerItems = useMemo(() => parseGuidelinesToItems((content as any).designer_guidelines), [(content as any).designer_guidelines]);
  const adminItems = useMemo(() => parseGuidelinesToItems((content as any).admin_guidelines), [(content as any).admin_guidelines]);

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

  // Info Card Component for role tabs
  const InfoCard = ({ icon: Icon, title, items, emptyText, color }: { 
    icon: any; 
    title: string; 
    items: string[]; 
    emptyText: string;
    color: string;
  }) => (
    <div className={cn("rounded-xl border p-4", color)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5" />
        <h4 className="font-semibold">{title}</h4>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2">
              <span className="text-muted-foreground mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
      )}
    </div>
  );

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

          {/* Tabs Navigation */}
          <div className="px-4 sm:px-5 pb-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start gap-1 bg-transparent border-b rounded-none h-auto p-0 overflow-x-auto">
                <TabsTrigger 
                  value="guion" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Guion
                </TabsTrigger>
                <TabsTrigger 
                  value="editor" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
                >
                  <Scissors className="h-4 w-4 mr-1.5" />
                  Editor
                </TabsTrigger>
                <TabsTrigger 
                  value="estratega" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
                >
                  <Target className="h-4 w-4 mr-1.5" />
                  Estratega
                </TabsTrigger>
                <TabsTrigger 
                  value="trafficker" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
                >
                  <Megaphone className="h-4 w-4 mr-1.5" />
                  Trafficker
                </TabsTrigger>
                <TabsTrigger 
                  value="diseno" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
                >
                  <Palette className="h-4 w-4 mr-1.5" />
                  Diseño
                </TabsTrigger>
                <TabsTrigger 
                  value="admin" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
                >
                  <ClipboardList className="h-4 w-4 mr-1.5" />
                  Admin
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Tab Content with Scroll */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{ 
            maxHeight: '70vh',
            scrollbarWidth: 'auto',
            scrollbarColor: 'hsl(var(--muted-foreground)) transparent'
          }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            {/* GUION TAB - Complete Script in ONE container */}
            <TabsContent value="guion" className="m-0 p-4 sm:p-6 space-y-4">
              {content.script ? (
                <>
                  {/* Single unified script container */}
                  <div className="border rounded-xl overflow-hidden bg-card">
                    <div className="p-5 sm:p-6">
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none script-content"
                        dangerouslySetInnerHTML={{ __html: content.script }}
                        style={{
                          lineHeight: '1.8',
                        }}
                      />
                    </div>
                  </div>

                  {/* General Comments */}
                  <div className="border-t pt-6 mt-6">
                    <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Comentarios Generales
                    </h3>

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
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">No hay guión disponible</p>
                  <p className="text-sm">El guión aún no ha sido generado para este contenido.</p>
                </div>
              )}
            </TabsContent>

            {/* EDITOR TAB */}
            <TabsContent value="editor" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="grid gap-4">
                <InfoCard
                  icon={Play}
                  title="Timeline por escenas"
                  items={editorItems.filter(i => i.toLowerCase().includes('escena') || i.toLowerCase().includes('tiempo'))}
                  emptyText="No hay información de timeline disponible"
                  color="bg-violet-50/50 dark:bg-violet-950/20 border-violet-200/50 dark:border-violet-800/50"
                />
                <InfoCard
                  icon={Zap}
                  title="Ritmo y transiciones"
                  items={editorItems.filter(i => i.toLowerCase().includes('ritmo') || i.toLowerCase().includes('transición') || i.toLowerCase().includes('corte'))}
                  emptyText="No hay indicaciones de ritmo"
                  color="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50"
                />
                <InfoCard
                  icon={Scissors}
                  title="Indicaciones de edición"
                  items={editorItems.length > 0 ? editorItems : []}
                  emptyText="Las indicaciones de edición se generarán junto con el guión"
                  color="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50"
                />
              </div>
            </TabsContent>

            {/* ESTRATEGA TAB */}
            <TabsContent value="estratega" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="grid gap-4">
                <InfoCard
                  icon={Target}
                  title="Objetivo del video"
                  items={strategistItems.filter(i => i.toLowerCase().includes('objetivo') || i.toLowerCase().includes('meta'))}
                  emptyText="No hay objetivo definido"
                  color="bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-800/50"
                />
                <InfoCard
                  icon={Users}
                  title="Nivel de conciencia del avatar"
                  items={strategistItems.filter(i => i.toLowerCase().includes('avatar') || i.toLowerCase().includes('audiencia') || i.toLowerCase().includes('conciencia'))}
                  emptyText="No hay información del avatar"
                  color="bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-200/50 dark:border-cyan-800/50"
                />
                <InfoCard
                  icon={Target}
                  title="Intención estratégica"
                  items={strategistItems.length > 0 ? strategistItems : []}
                  emptyText="La estrategia se generará junto con el guión"
                  color="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/50"
                />
              </div>
            </TabsContent>

            {/* TRAFFICKER TAB */}
            <TabsContent value="trafficker" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="grid gap-4">
                <InfoCard
                  icon={Megaphone}
                  title="Tipo de creatividad"
                  items={traffickerItems.filter(i => i.toLowerCase().includes('ugc') || i.toLowerCase().includes('founder') || i.toLowerCase().includes('educativo'))}
                  emptyText="No hay tipo definido"
                  color="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/50"
                />
                <InfoCard
                  icon={TrendingUp}
                  title="Uso recomendado (TOF/MOF/BOF)"
                  items={traffickerItems.filter(i => i.toLowerCase().includes('tof') || i.toLowerCase().includes('mof') || i.toLowerCase().includes('bof') || i.toLowerCase().includes('funnel'))}
                  emptyText="No hay recomendación de funnel"
                  color="bg-teal-50/50 dark:bg-teal-950/20 border-teal-200/50 dark:border-teal-800/50"
                />
                <InfoCard
                  icon={Megaphone}
                  title="Indicaciones para pauta"
                  items={traffickerItems.length > 0 ? traffickerItems : []}
                  emptyText="Las indicaciones de pauta se generarán junto con el guión"
                  color="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-800/50"
                />
              </div>
            </TabsContent>

            {/* DISEÑO TAB */}
            <TabsContent value="diseno" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="grid gap-4">
                <InfoCard
                  icon={Palette}
                  title="Estilo visual y mood"
                  items={designerItems.filter(i => i.toLowerCase().includes('estilo') || i.toLowerCase().includes('mood') || i.toLowerCase().includes('visual'))}
                  emptyText="No hay estilo definido"
                  color="bg-pink-50/50 dark:bg-pink-950/20 border-pink-200/50 dark:border-pink-800/50"
                />
                <InfoCard
                  icon={Image}
                  title="Miniatura recomendada"
                  items={designerItems.filter(i => i.toLowerCase().includes('miniatura') || i.toLowerCase().includes('thumbnail'))}
                  emptyText="No hay recomendación de miniatura"
                  color="bg-fuchsia-50/50 dark:bg-fuchsia-950/20 border-fuchsia-200/50 dark:border-fuchsia-800/50"
                />
                <InfoCard
                  icon={Type}
                  title="Colores y tipografía"
                  items={designerItems.filter(i => i.toLowerCase().includes('color') || i.toLowerCase().includes('tipografía') || i.toLowerCase().includes('fuente'))}
                  emptyText="No hay indicaciones de color/tipografía"
                  color="bg-lime-50/50 dark:bg-lime-950/20 border-lime-200/50 dark:border-lime-800/50"
                />
                <InfoCard
                  icon={Palette}
                  title="Indicaciones de diseño"
                  items={designerItems.length > 0 ? designerItems : []}
                  emptyText="Las indicaciones de diseño se generarán junto con el guión"
                  color="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/50"
                />
              </div>
            </TabsContent>

            {/* ADMIN TAB */}
            <TabsContent value="admin" className="m-0 p-4 sm:p-6 space-y-4">
              <div className="grid gap-4">
                {/* Status Card */}
                <div className="rounded-xl border p-4 bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="h-5 w-5" />
                    <h4 className="font-semibold">Estado del guión</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Versión</span>
                      <Badge variant="outline">v{scriptVersion}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Estado</span>
                      <Badge className={isApproved ? "bg-green-500" : "bg-amber-500"}>
                        {isApproved ? "Aprobado" : "En revisión"}
                      </Badge>
                    </div>
                    {content.script_approved_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Aprobado el</span>
                        <span className="text-sm">{format(new Date(content.script_approved_at), "d 'de' MMMM, HH:mm", { locale: es })}</span>
                      </div>
                    )}
                    {content.deadline && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Fecha de entrega</span>
                        <span className="text-sm">{format(new Date(content.deadline), "d 'de' MMMM", { locale: es })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <InfoCard
                  icon={History}
                  title="Historial de cambios"
                  items={((content as any).change_requests || []).map((r: any) => 
                    `${format(new Date(r.requestedAt), "d/MM")} - ${r.types?.join(', ') || 'Cambios solicitados'}`
                  )}
                  emptyText="No hay historial de cambios"
                  color="bg-gray-50/50 dark:bg-gray-950/20 border-gray-200/50 dark:border-gray-800/50"
                />

                <InfoCard
                  icon={ClipboardList}
                  title="Indicaciones administrativas"
                  items={adminItems.length > 0 ? adminItems : []}
                  emptyText="Las indicaciones administrativas se generarán junto con el guión"
                  color="bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-200/50 dark:border-zinc-800/50"
                />
              </div>
            </TabsContent>
          </Tabs>
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
