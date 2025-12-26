import { useState, useMemo, useCallback } from 'react';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';
import { 
  FileText,
  CheckCircle2,
  MessageCircle,
  User,
  Loader2,
  Send,
  Calendar,
  Package,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Edit3,
  Lock,
  Clock,
  AlertCircle,
  Lightbulb,
  Film,
  BarChart3,
  Megaphone
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

interface ParsedSection {
  type: 'hooks' | 'desarrollo' | 'cierre' | 'info' | 'other';
  title: string;
  content: string;
  items?: { index: number; text: string }[];
}

// Parse script HTML into structured sections
function parseScriptForClient(html: string): ParsedSection[] {
  if (!html || html.trim() === '') return [];
  
  const sections: ParsedSection[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  
  let currentSection: ParsedSection | null = null;
  
  const detectSectionType = (text: string): { type: ParsedSection['type']; title: string } | null => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('hook')) return { type: 'hooks', title: 'Hooks' };
    if (lowerText.includes('desarrollo') || lowerText.includes('escena')) return { type: 'desarrollo', title: 'Guión Principal' };
    if (lowerText.includes('cierre') || lowerText.includes('cta')) return { type: 'cierre', title: 'Call to Action (CTA)' };
    if (lowerText.includes('información') || lowerText.includes('avatar') || lowerText.includes('perfil')) return { type: 'info', title: 'Información General' };
    return null;
  };

  const children = Array.from(body.childNodes);
  
  children.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const textContent = element.textContent || '';
      
      if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
        const detected = detectSectionType(textContent);
        if (detected) {
          if (currentSection && currentSection.content.trim()) {
            sections.push(currentSection);
          }
          currentSection = { 
            type: detected.type, 
            title: detected.title,
            content: element.outerHTML,
            items: detected.type === 'hooks' ? [] : undefined
          };
          return;
        }
      }
      
      if (currentSection) {
        currentSection.content += element.outerHTML;
        
        // Extract hook items
        if (currentSection.type === 'hooks' && currentSection.items) {
          const hookMatch = textContent.match(/hook\s*(\d+)/i);
          if (hookMatch || element.tagName.toLowerCase() === 'li') {
            currentSection.items.push({
              index: currentSection.items.length + 1,
              text: textContent.trim()
            });
          }
        }
      } else {
        currentSection = { type: 'other', title: 'Contenido', content: element.outerHTML };
      }
    }
  });
  
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  return sections;
}

// Extract scenes from desarrollo section
function extractScenes(html: string): { index: number; visual: string; dialog: string; emotion: string }[] {
  const scenes: { index: number; visual: string; dialog: string; emotion: string }[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const headers = doc.querySelectorAll('h3, h4, strong');
  let currentScene: { index: number; visual: string; dialog: string; emotion: string } | null = null;
  
  headers.forEach((header) => {
    const text = header.textContent?.toLowerCase() || '';
    if (text.includes('escena') || text.includes('scene')) {
      if (currentScene) scenes.push(currentScene);
      currentScene = { index: scenes.length + 1, visual: '', dialog: '', emotion: '' };
    }
  });
  
  if (currentScene) scenes.push(currentScene);
  
  // If no scenes found, create a single scene from content
  if (scenes.length === 0) {
    const textContent = doc.body.textContent?.trim() || '';
    if (textContent) {
      scenes.push({ index: 1, visual: '', dialog: textContent.slice(0, 300), emotion: '' });
    }
  }
  
  return scenes;
}

const sectionTabs = [
  { id: 'hooks', label: 'Hooks', icon: Target },
  { id: 'guion', label: 'Guión', icon: Film },
  { id: 'cta', label: 'CTA', icon: Megaphone },
  { id: 'edicion', label: 'Edición', icon: Edit3 },
  { id: 'estrategia', label: 'Estrategia', icon: Lightbulb },
];

const changeRequestOptions = [
  { id: 'hooks', label: 'Cambiar hooks' },
  { id: 'tone', label: 'Ajustar tono' },
  { id: 'cta', label: 'Modificar CTA' },
  { id: 'duration', label: 'Ajustar duración' },
  { id: 'other', label: 'Otro' },
];

export function ClientScriptReview({ content, onUpdate, userId, open, onOpenChange }: ClientScriptReviewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('hooks');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentSection, setCommentSection] = useState<string | null>(null);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [selectedChangeTypes, setSelectedChangeTypes] = useState<string[]>([]);
  const [changeDescription, setChangeDescription] = useState('');
  const [expandedScenes, setExpandedScenes] = useState<number[]>([1]);

  const isApproved = content.status === 'script_approved' || content.script_approved_at;
  const scriptVersion = (content as any).script_version || 1;

  const parsedSections = useMemo(() => parseScriptForClient(content.script || ''), [content.script]);
  
  const hooksSection = parsedSections.find(s => s.type === 'hooks');
  const desarrolloSection = parsedSections.find(s => s.type === 'desarrollo');
  const cierreSection = parsedSections.find(s => s.type === 'cierre');
  const scenes = useMemo(() => desarrolloSection ? extractScenes(desarrolloSection.content) : [], [desarrolloSection]);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const { data: commentsData } = await supabase
        .from('content_comments')
        .select('*')
        .eq('content_id', content.id)
        .order('created_at', { ascending: false });

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

  const handleAddComment = async (section?: string, sectionIndex?: number) => {
    if (!userId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: userId,
          comment: newComment.trim(),
          section: section || null,
          section_index: sectionIndex || null,
          comment_type: section ? 'section' : 'general'
        });
      if (error) throw error;
      setNewComment('');
      setCommentSection(null);
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
      // Add change request as comment
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

      // Update content with change request
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

  // Fetch comments when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      fetchComments();
    }
    onOpenChange(isOpen);
  };

  const getCommentsForSection = (section: string) => 
    comments.filter(c => c.section === section);

  const toggleScene = (index: number) => {
    setExpandedScenes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <div className="sticky top-0 z-20 bg-background border-b">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
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
                  <Badge variant="outline" className="text-xs">
                    v{scriptVersion}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-bold">{content.title}</DialogTitle>
                
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
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

              {/* Action Buttons */}
              <div className="flex gap-2 shrink-0">
                {!isApproved && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChangeRequest(true)}
                      className="gap-1"
                    >
                      <Edit3 className="h-4 w-4" />
                      Solicitar cambios
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
                      Aprobar guión
                    </Button>
                  </>
                )}
                {isApproved && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 px-3 py-2 rounded-lg">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Guión bloqueado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
            <TabsList className="grid w-full grid-cols-5">
              {sectionTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-1 text-xs sm:text-sm">
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* HOOKS TAB */}
              <TabsContent value="hooks" className="mt-0 space-y-4">
                {hooksSection?.items && hooksSection.items.length > 0 ? (
                  <div className="space-y-3">
                    {hooksSection.items.map((hook, idx) => (
                      <div 
                        key={idx}
                        className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-5 border border-amber-500/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 font-bold text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-base leading-relaxed font-medium">
                              "{hook.text}"
                            </p>
                            
                            {/* Per-hook comment */}
                            <div className="mt-3 pt-3 border-t border-amber-500/20">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCommentSection(commentSection === `hook-${idx}` ? null : `hook-${idx}`)}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  Comentar
                                </Button>
                                {getCommentsForSection(`hooks`).filter(c => c.section_index === idx + 1).length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {getCommentsForSection(`hooks`).filter(c => c.section_index === idx + 1).length} comentarios
                                  </span>
                                )}
                              </div>
                              
                              {commentSection === `hook-${idx}` && (
                                <div className="mt-2 flex gap-2">
                                  <Textarea
                                    placeholder={`Comentario sobre Hook ${idx + 1}...`}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="min-h-[60px] text-sm"
                                    rows={2}
                                  />
                                  <Button
                                    size="icon"
                                    onClick={() => handleAddComment('hooks', idx + 1)}
                                    disabled={submitting || !newComment.trim()}
                                  >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-5 border border-amber-500/20"
                    dangerouslySetInnerHTML={{ __html: hooksSection?.content || '<p class="text-muted-foreground">No hay hooks definidos</p>' }}
                  />
                )}
              </TabsContent>

              {/* GUIÓN TAB */}
              <TabsContent value="guion" className="mt-0 space-y-4">
                {scenes.length > 0 ? (
                  <div className="space-y-3">
                    {scenes.map((scene) => (
                      <Collapsible
                        key={scene.index}
                        open={expandedScenes.includes(scene.index)}
                        onOpenChange={() => toggleScene(scene.index)}
                      >
                        <Card className="overflow-hidden">
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20 text-blue-600">
                                  <Film className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                  <h4 className="font-semibold">Escena {scene.index}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {scene.dialog.slice(0, 50)}...
                                  </p>
                                </div>
                              </div>
                              {expandedScenes.includes(scene.index) ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-4 space-y-4">
                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2 text-blue-600">
                                    <Film className="h-4 w-4" />
                                    <span className="font-medium text-sm">Qué se ve</span>
                                  </div>
                                  <p className="text-sm">{scene.visual || 'No especificado'}</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2 text-green-600">
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="font-medium text-sm">Qué se dice</span>
                                  </div>
                                  <p className="text-sm">{scene.dialog || 'No especificado'}</p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2 text-purple-600">
                                    <Sparkles className="h-4 w-4" />
                                    <span className="font-medium text-sm">Emoción</span>
                                  </div>
                                  <p className="text-sm">{scene.emotion || 'No especificado'}</p>
                                </div>
                              </div>
                              
                              {/* Per-scene comment */}
                              <div className="pt-3 border-t">
                                <div className="flex gap-2">
                                  <Textarea
                                    placeholder={`Comentario sobre Escena ${scene.index}...`}
                                    className="min-h-[60px] text-sm"
                                    rows={2}
                                  />
                                  <Button size="icon" disabled>
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                ) : (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-5 border border-blue-500/20"
                    dangerouslySetInnerHTML={{ __html: desarrolloSection?.content || content.script || '<p class="text-muted-foreground">No hay guión disponible</p>' }}
                  />
                )}
              </TabsContent>

              {/* CTA TAB */}
              <TabsContent value="cta" className="mt-0 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-5 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <Megaphone className="h-4 w-4 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-green-700 dark:text-green-400">CTA Orgánico</h3>
                    </div>
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: cierreSection?.content || '<p class="text-muted-foreground">No hay CTA definido</p>' 
                      }}
                    />
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-5 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-purple-700 dark:text-purple-400">CTA Ads</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {content.trafficker_guidelines ? 'Ver pestaña Estrategia para CTAs de ads' : 'No hay CTA para ads definido'}
                    </p>
                  </div>
                </div>
                
                {/* Quick feedback buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => { setCommentSection('cta'); setNewComment('Cambiar CTA'); }}>
                    Cambiar CTA
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setCommentSection('cta'); setNewComment('Probar uno más directo'); }}>
                    Probar uno más directo
                  </Button>
                </div>
              </TabsContent>

              {/* EDICIÓN TAB */}
              <TabsContent value="edicion" className="mt-0 space-y-4">
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl p-5 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Film className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-blue-700 dark:text-blue-400">Pautas de Edición</h3>
                  </div>
                  
                  {content.editor_guidelines ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="bg-background/50 rounded-lg p-3">
                          <span className="text-xs font-medium text-muted-foreground">Ritmo</span>
                          <p className="text-sm mt-1">Dinámico / Rápido</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-3">
                          <span className="text-xs font-medium text-muted-foreground">Estilo</span>
                          <p className="text-sm mt-1">UGC</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-background/50 rounded-lg p-3">
                          <span className="text-xs font-medium text-muted-foreground">Subtítulos</span>
                          <p className="text-sm mt-1">Grandes, contrastados</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-3">
                          <span className="text-xs font-medium text-muted-foreground">Música</span>
                          <p className="text-sm mt-1">Inspiradora</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay pautas de edición definidas</p>
                  )}
                </div>
              </TabsContent>

              {/* ESTRATEGIA TAB */}
              <TabsContent value="estrategia" className="mt-0 space-y-4">
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Lightbulb className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-purple-700 dark:text-purple-400">Estrategia del Video</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {content.sales_angle && (
                      <div className="bg-background/50 rounded-lg p-4">
                        <span className="text-xs font-medium text-muted-foreground">Objetivo del video</span>
                        <p className="text-sm mt-1">{content.sales_angle}</p>
                      </div>
                    )}
                    
                    {content.strategist_guidelines && (
                      <div className="bg-background/50 rounded-lg p-4">
                        <span className="text-xs font-medium text-muted-foreground">Emoción clave</span>
                        <p className="text-sm mt-1">Frustración → Alivio</p>
                      </div>
                    )}
                    
                    <div className="bg-background/50 rounded-lg p-4">
                      <span className="text-xs font-medium text-muted-foreground">Resultado esperado</span>
                      <p className="text-sm mt-1">Comentarios o mensajes directos</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* General Comments Section */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Comentarios generales
              </h4>
              
              <div className="flex gap-2 mb-4">
                <Textarea
                  placeholder="Escribe un comentario sobre el guión..."
                  value={commentSection === null ? newComment : ''}
                  onChange={(e) => { setCommentSection(null); setNewComment(e.target.value); }}
                  className="min-h-[60px] text-sm"
                  rows={2}
                />
                <Button
                  size="icon"
                  onClick={() => handleAddComment()}
                  disabled={submitting || !newComment.trim() || commentSection !== null}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              
              {loadingComments ? (
                <div className="text-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : comments.filter(c => !c.section).length > 0 ? (
                <div className="space-y-3">
                  {comments.filter(c => !c.section).map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={comment.profile?.avatar_url} />
                        <AvatarFallback className="text-xs bg-primary/10">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.profile?.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "d MMM, HH:mm", { locale: es })}
                          </span>
                          {comment.comment_type === 'change_request' && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
                              Solicitud de cambio
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin comentarios aún</p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Approval Status Footer */}
        {isApproved && content.script_approved_at && (
          <div className="border-t p-4 bg-green-50 dark:bg-green-950/30">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Guión aprobado</span>
              <span className="text-sm text-muted-foreground">
                • {format(new Date(content.script_approved_at), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
              <Badge variant="outline" className="text-xs">v{scriptVersion}</Badge>
            </div>
          </div>
        )}

        {/* Change Request Dialog */}
        <Dialog open={showChangeRequest} onOpenChange={setShowChangeRequest}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Solicitar cambios
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">¿Qué te gustaría cambiar?</p>
                <div className="grid grid-cols-2 gap-2">
                  {changeRequestOptions.map((option) => (
                    <Button
                      key={option.id}
                      variant={selectedChangeTypes.includes(option.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedChangeTypes(prev =>
                          prev.includes(option.id)
                            ? prev.filter(t => t !== option.id)
                            : [...prev, option.id]
                        );
                      }}
                      className="justify-start"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Descripción (opcional)</label>
                <Textarea
                  placeholder="Describe los cambios que necesitas..."
                  value={changeDescription}
                  onChange={(e) => setChangeDescription(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowChangeRequest(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRequestChanges}
                  disabled={submitting || selectedChangeTypes.length === 0}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enviar solicitud
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
