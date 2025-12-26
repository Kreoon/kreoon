import { useState, useMemo, useCallback } from 'react';
import { Content, ContentStatus } from '@/types/database';
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
  Edit3,
  Lock,
  Clock,
  Lightbulb,
  Film,
  BarChart3,
  Megaphone,
  Palette,
  ClipboardList,
  TrendingUp
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

// Structured script data interface
interface StructuredScript {
  hooks: { id: number; text: string; type?: string }[];
  body: { scene: number; visual: string; voice: string; emotion: string }[];
  ctas: { organic: string; ads: string };
  editing: { pace: string; style: string; subtitles: string; music: string; colorGrading?: string };
  strategy: { objective: string; emotion: string; funnelStage: string; insight?: string };
  trafficker: { objective: string; format: string; kpis: string[]; audience?: string; copies?: string[] };
  design: { colors: string[]; textHierarchy: string; elements?: string[]; ctaPosition?: string };
  admin: { deadline: string; deliverables: string[]; status: string; timeline?: string };
}

// Smart parser that extracts structured data from HTML content
function parseStructuredScript(
  script: string | null,
  editorGuidelines: string | null,
  strategistGuidelines: string | null,
  traffickerGuidelines: string | null,
  designerGuidelines: string | null,
  adminGuidelines: string | null,
  content: Content
): StructuredScript {
  const result: StructuredScript = {
    hooks: [],
    body: [],
    ctas: { organic: '', ads: '' },
    editing: { pace: '', style: '', subtitles: '', music: '' },
    strategy: { objective: '', emotion: '', funnelStage: '' },
    trafficker: { objective: '', format: '', kpis: [] },
    design: { colors: [], textHierarchy: '' },
    admin: { deadline: '', deliverables: [], status: 'pendiente' }
  };

  // Helper to extract text content from HTML
  const extractText = (html: string | null): string => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Helper to find content between markers
  const extractSection = (text: string, startMarkers: string[], endMarkers?: string[]): string => {
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
    
    let end = text.length;
    if (endMarkers) {
      for (const marker of endMarkers) {
        const idx = lowerText.indexOf(marker.toLowerCase(), start);
        if (idx !== -1 && idx < end) {
          end = idx;
        }
      }
    }
    
    return text.slice(start, end).trim();
  };

  // Parse hooks from script
  if (script) {
    const scriptText = extractText(script);
    
    // Look for hook patterns
    const hookPatterns = [
      /hook\s*(\d+)[:\s]*[""]?([^""]+)[""]?/gi,
      /🎯[^:]*:\s*[""]?([^""]+)[""]?/gi,
      /opción\s*(\d+)[:\s]*[""]?([^""]+)[""]?/gi,
    ];
    
    for (const pattern of hookPatterns) {
      const matches = [...scriptText.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach((match, idx) => {
          const hookText = match[2] || match[1];
          if (hookText && hookText.length > 10) {
            result.hooks.push({
              id: result.hooks.length + 1,
              text: hookText.trim().replace(/^[""]|[""]$/g, ''),
              type: 'captura'
            });
          }
        });
        break;
      }
    }

    // If no hooks found via patterns, try to find hook section
    if (result.hooks.length === 0) {
      const hooksSection = extractSection(scriptText, ['hooks', '🎯', 'gancho'], ['desarrollo', 'escena', 'guión']);
      if (hooksSection) {
        const lines = hooksSection.split('\n').filter(l => l.trim().length > 15);
        lines.slice(0, 5).forEach((line, idx) => {
          const cleanLine = line.replace(/^[\d\.\-\*•]+\s*/, '').replace(/^hook\s*\d*[:\s]*/i, '').trim();
          if (cleanLine.length > 10) {
            result.hooks.push({ id: idx + 1, text: cleanLine, type: 'captura' });
          }
        });
      }
    }

    // Parse scenes/body
    const scenePattern = /escena\s*(\d+)[:\s]*([^]*?)(?=escena\s*\d+|cierre|cta|$)/gi;
    const sceneMatches = [...scriptText.matchAll(scenePattern)];
    
    sceneMatches.forEach((match) => {
      const sceneNum = parseInt(match[1]);
      const sceneContent = match[2] || '';
      
      result.body.push({
        scene: sceneNum,
        visual: extractSection(sceneContent, ['visual:', 'se ve:', '🎥'], ['voz:', 'dice:', 'emoción:']) || 'Plano medio del creador',
        voice: extractSection(sceneContent, ['voz:', 'dice:', '🎙️', 'diálogo:'], ['visual:', 'emoción:']) || sceneContent.slice(0, 200).trim(),
        emotion: extractSection(sceneContent, ['emoción:', 'tono:', '😌'], ['visual:', 'voz:']) || 'Conversacional'
      });
    });

    // If no scenes found, create one from script content
    if (result.body.length === 0 && scriptText.length > 50) {
      const desarrolloSection = extractSection(scriptText, ['desarrollo', 'guión principal', 'script'], ['cta', 'cierre']);
      result.body.push({
        scene: 1,
        visual: 'Creador frente a cámara',
        voice: desarrolloSection.slice(0, 300) || scriptText.slice(100, 400),
        emotion: 'Conversacional y cercano'
      });
    }

    // Parse CTAs
    const ctaSection = extractSection(scriptText, ['cta', 'cierre', 'llamada a la acción', '📢'], []);
    if (ctaSection) {
      result.ctas.organic = extractSection(ctaSection, ['orgánico:', 'redes:'], ['ads:', 'paid:']) || ctaSection.slice(0, 150);
      result.ctas.ads = extractSection(ctaSection, ['ads:', 'paid:', 'publicidad:'], []) || '';
    }
  }

  // Parse editor guidelines
  if (editorGuidelines) {
    const editorText = extractText(editorGuidelines);
    
    result.editing.pace = extractSection(editorText, ['ritmo:', 'pace:'], ['estilo:', 'style:']) || 
                         (editorText.toLowerCase().includes('rápido') ? 'Rápido' : 
                          editorText.toLowerCase().includes('dinámico') ? 'Dinámico' : 'Medio');
    
    result.editing.style = extractSection(editorText, ['estilo:', 'style:'], ['subtítulos:', 'música:']) ||
                          (editorText.toLowerCase().includes('ugc') ? 'UGC' : 'Editorial');
    
    result.editing.subtitles = extractSection(editorText, ['subtítulos:', 'subtitles:'], ['música:', 'color:']) || 'Grandes y contrastados';
    
    result.editing.music = extractSection(editorText, ['música:', 'music:'], ['color:', 'ritmo:']) || 'Inspiradora y motivacional';
    
    result.editing.colorGrading = extractSection(editorText, ['color:', 'colorimetría:', 'grading:'], ['música:', 'subtítulos:']) || '';
  }

  // Parse strategist guidelines
  if (strategistGuidelines) {
    const stratText = extractText(strategistGuidelines);
    
    result.strategy.objective = extractSection(stratText, ['objetivo:', 'objective:'], ['emoción:', 'funnel:']) ||
                               content.sales_angle || 'Generar engagement';
    
    result.strategy.emotion = extractSection(stratText, ['emoción:', 'emotion:', 'sentimiento:'], ['objetivo:', 'funnel:']) || 'Conexión emocional';
    
    result.strategy.funnelStage = extractSection(stratText, ['funnel:', 'etapa:', 'fase:'], ['objetivo:', 'emoción:']) || 'Consideración';
    
    result.strategy.insight = extractSection(stratText, ['insight:', 'hipótesis:'], ['objetivo:', 'emoción:']) || '';
  }

  // Parse trafficker guidelines
  if (traffickerGuidelines) {
    const traffText = extractText(traffickerGuidelines);
    
    result.trafficker.objective = extractSection(traffText, ['objetivo:', 'goal:'], ['formato:', 'kpi:']) || 'Conversiones';
    
    result.trafficker.format = extractSection(traffText, ['formato:', 'format:'], ['objetivo:', 'kpi:']) || 'Reels / Stories';
    
    const kpisSection = extractSection(traffText, ['kpi:', 'métricas:'], ['formato:', 'objetivo:']);
    if (kpisSection) {
      result.trafficker.kpis = kpisSection.split(/[,\n•\-]/).map(k => k.trim()).filter(k => k.length > 2);
    } else {
      result.trafficker.kpis = ['CTR', 'Retención', 'Conversiones'];
    }
    
    result.trafficker.audience = extractSection(traffText, ['audiencia:', 'público:', 'target:'], ['formato:', 'objetivo:']) || '';
    
    // Extract copy variations if present
    const copiesSection = extractSection(traffText, ['copys:', 'variaciones:', 'copies:'], []);
    if (copiesSection) {
      result.trafficker.copies = copiesSection.split('\n').filter(c => c.trim().length > 20).slice(0, 4);
    }
  }

  // Parse designer guidelines
  if (designerGuidelines) {
    const designText = extractText(designerGuidelines);
    
    const colorsSection = extractSection(designText, ['colores:', 'paleta:', 'colors:'], ['tipografía:', 'elementos:']);
    if (colorsSection) {
      result.design.colors = colorsSection.split(/[,\n•\-]/).map(c => c.trim()).filter(c => c.length > 2);
    } else {
      result.design.colors = ['Colores de marca'];
    }
    
    result.design.textHierarchy = extractSection(designText, ['jerarquía:', 'tipografía:', 'texto:'], ['colores:', 'elementos:']) || 'Headlines fuertes';
    
    const elementsSection = extractSection(designText, ['elementos:', 'assets:'], ['colores:', 'tipografía:']);
    if (elementsSection) {
      result.design.elements = elementsSection.split(/[,\n•\-]/).map(e => e.trim()).filter(e => e.length > 2);
    }
    
    result.design.ctaPosition = extractSection(designText, ['cta:', 'botón:', 'posición:'], ['elementos:', 'colores:']) || '';
  }

  // Parse admin guidelines
  if (adminGuidelines) {
    const adminText = extractText(adminGuidelines);
    
    result.admin.deadline = content.deadline ? format(new Date(content.deadline), "d 'de' MMMM, yyyy", { locale: es }) : 
                           extractSection(adminText, ['fecha:', 'deadline:', 'entrega:'], ['entregables:', 'status:']) || '';
    
    const deliverablesSection = extractSection(adminText, ['entregables:', 'deliverables:'], ['fecha:', 'status:']);
    if (deliverablesSection) {
      result.admin.deliverables = deliverablesSection.split(/[,\n•\-]/).map(d => d.trim()).filter(d => d.length > 2);
    } else {
      result.admin.deliverables = ['Video final', 'Copys', 'Thumbnails'];
    }
    
    result.admin.status = content.status || 'pendiente';
    
    result.admin.timeline = extractSection(adminText, ['timeline:', 'cronograma:'], ['entregables:', 'fecha:']) || '';
  } else {
    // Default admin values
    result.admin.deadline = content.deadline ? format(new Date(content.deadline), "d 'de' MMMM, yyyy", { locale: es }) : '';
    result.admin.deliverables = ['Video final editado', 'Copys para redes'];
    result.admin.status = content.status || 'pendiente';
  }

  return result;
}

const sectionTabs = [
  { id: 'hooks', label: 'Hooks', icon: Target },
  { id: 'guion', label: 'Guión', icon: Film },
  { id: 'cta', label: 'CTA', icon: Megaphone },
  { id: 'edicion', label: 'Edición', icon: Edit3 },
  { id: 'estrategia', label: 'Estrategia', icon: Lightbulb },
  { id: 'trafficker', label: 'Trafficker', icon: TrendingUp },
  { id: 'diseno', label: 'Diseño', icon: Palette },
  { id: 'admin', label: 'Admin', icon: ClipboardList },
];

const changeRequestOptions = [
  { id: 'hooks', label: 'Cambiar hooks' },
  { id: 'tone', label: 'Ajustar tono' },
  { id: 'cta', label: 'Modificar CTA' },
  { id: 'duration', label: 'Ajustar duración' },
  { id: 'escenas', label: 'Modificar escenas' },
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

  // Parse structured data from all guidelines
  const structuredData = useMemo(() => parseStructuredScript(
    content.script,
    content.editor_guidelines,
    content.strategist_guidelines,
    content.trafficker_guidelines,
    (content as any).designer_guidelines || null,
    (content as any).admin_guidelines || null,
    content
  ), [content]);

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

  const getCommentsForSection = (section: string) => 
    comments.filter(c => c.section === section);

  const toggleScene = (index: number) => {
    setExpandedScenes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const renderInfoCard = (label: string, value: string, icon?: React.ReactNode) => (
    <div className="bg-background/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm">{value || 'No especificado'}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <div className="sticky top-0 z-20 bg-background border-b shrink-0">
          <div className="p-4 sm:p-6 pb-4">
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
                <DialogTitle className="text-lg sm:text-xl font-bold truncate">{content.title}</DialogTitle>
                
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

              {/* Action Buttons */}
              <div className="flex gap-2 shrink-0">
                {!isApproved && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChangeRequest(true)}
                      className="gap-1 hidden sm:flex"
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
                      <span className="hidden sm:inline">Aprobar guión</span>
                      <span className="sm:hidden">Aprobar</span>
                    </Button>
                  </>
                )}
                {isApproved && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 px-3 py-2 rounded-lg">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium hidden sm:inline">Guión bloqueado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs - Scrollable on mobile */}
          <div className="px-4 sm:px-6 overflow-x-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-8 h-auto p-1">
                {sectionTabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="gap-1 text-xs px-3 py-2 whitespace-nowrap"
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Scrollable Content - Fixed height with internal scroll */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[calc(95vh-200px)]">
            <div className="p-4 sm:p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* HOOKS TAB */}
                <TabsContent value="hooks" className="mt-0 space-y-3">
                  {structuredData.hooks.length > 0 ? (
                    structuredData.hooks.map((hook) => (
                      <div 
                        key={hook.id}
                        className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-4 sm:p-5 border border-amber-500/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 font-bold text-sm shrink-0">
                            {hook.id}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-base leading-relaxed font-medium">
                              "{hook.text}"
                            </p>
                            {hook.type && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                {hook.type}
                              </Badge>
                            )}
                            
                            {/* Per-hook comment */}
                            <div className="mt-3 pt-3 border-t border-amber-500/20">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCommentSection(commentSection === `hook-${hook.id}` ? null : `hook-${hook.id}`)}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  Comentar
                                </Button>
                                {getCommentsForSection(`hooks`).filter(c => c.section_index === hook.id).length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {getCommentsForSection(`hooks`).filter(c => c.section_index === hook.id).length} comentarios
                                  </span>
                                )}
                              </div>
                              
                              {commentSection === `hook-${hook.id}` && (
                                <div className="mt-2 flex gap-2">
                                  <Textarea
                                    placeholder={`Comentario sobre Hook ${hook.id}...`}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="min-h-[60px] text-sm"
                                    rows={2}
                                  />
                                  <Button
                                    size="icon"
                                    onClick={() => handleAddComment('hooks', hook.id)}
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
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No hay hooks definidos aún</p>
                    </div>
                  )}
                </TabsContent>

                {/* GUIÓN TAB */}
                <TabsContent value="guion" className="mt-0 space-y-3">
                  {structuredData.body.length > 0 ? (
                    structuredData.body.map((scene) => (
                      <Collapsible
                        key={scene.scene}
                        open={expandedScenes.includes(scene.scene)}
                        onOpenChange={() => toggleScene(scene.scene)}
                      >
                        <Card className="overflow-hidden">
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20 text-blue-600">
                                  <Film className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                  <h4 className="font-semibold">Escena {scene.scene}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {scene.voice.slice(0, 60)}...
                                  </p>
                                </div>
                              </div>
                              {expandedScenes.includes(scene.scene) ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-4 space-y-4">
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2 text-blue-600">
                                    <Film className="h-4 w-4" />
                                    <span className="font-medium text-sm">🎥 Qué se ve</span>
                                  </div>
                                  <p className="text-sm">{scene.visual}</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2 text-green-600">
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="font-medium text-sm">🎙️ Qué se dice</span>
                                  </div>
                                  <p className="text-sm">{scene.voice}</p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2 text-purple-600">
                                    <Sparkles className="h-4 w-4" />
                                    <span className="font-medium text-sm">😌 Emoción</span>
                                  </div>
                                  <p className="text-sm">{scene.emotion}</p>
                                </div>
                              </div>
                              
                              {/* Per-scene comment */}
                              <div className="pt-3 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCommentSection(commentSection === `scene-${scene.scene}` ? null : `scene-${scene.scene}`)}
                                  className="text-xs text-muted-foreground hover:text-foreground mb-2"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  Comentar esta escena
                                </Button>
                                
                                {commentSection === `scene-${scene.scene}` && (
                                  <div className="flex gap-2">
                                    <Textarea
                                      placeholder={`Comentario sobre Escena ${scene.scene}...`}
                                      value={newComment}
                                      onChange={(e) => setNewComment(e.target.value)}
                                      className="min-h-[60px] text-sm"
                                      rows={2}
                                    />
                                    <Button
                                      size="icon"
                                      onClick={() => handleAddComment('body', scene.scene)}
                                      disabled={submitting || !newComment.trim()}
                                    >
                                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Film className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No hay escenas definidas aún</p>
                    </div>
                  )}
                </TabsContent>

                {/* CTA TAB */}
                <TabsContent value="cta" className="mt-0 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-5 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                          <Megaphone className="h-4 w-4 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-green-700 dark:text-green-400">CTA Orgánico</h3>
                      </div>
                      <p className="text-sm">
                        {structuredData.ctas.organic || 'No hay CTA orgánico definido'}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-5 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                          <BarChart3 className="h-4 w-4 text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-purple-700 dark:text-purple-400">CTA Ads</h3>
                      </div>
                      <p className="text-sm">
                        {structuredData.ctas.ads || 'No hay CTA para ads definido'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick feedback buttons */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => { setCommentSection('cta'); setNewComment('Cambiar CTA'); }}>
                      Cambiar CTA
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setCommentSection('cta'); setNewComment('Probar uno más directo'); }}>
                      Más directo
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setCommentSection('cta'); setNewComment('CTA más emocional'); }}>
                      Más emocional
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
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      {renderInfoCard('Ritmo', structuredData.editing.pace)}
                      {renderInfoCard('Estilo', structuredData.editing.style)}
                      {renderInfoCard('Subtítulos', structuredData.editing.subtitles)}
                      {renderInfoCard('Música', structuredData.editing.music)}
                      {structuredData.editing.colorGrading && renderInfoCard('Colorimetría', structuredData.editing.colorGrading)}
                    </div>
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
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      {renderInfoCard('Objetivo', structuredData.strategy.objective)}
                      {renderInfoCard('Emoción clave', structuredData.strategy.emotion)}
                      {renderInfoCard('Fase del funnel', structuredData.strategy.funnelStage)}
                      {structuredData.strategy.insight && renderInfoCard('Insight', structuredData.strategy.insight)}
                    </div>
                  </div>
                </TabsContent>

                {/* TRAFFICKER TAB */}
                <TabsContent value="trafficker" className="mt-0 space-y-4">
                  <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-5 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-orange-500/20">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                      </div>
                      <h3 className="font-semibold text-orange-700 dark:text-orange-400">Pautas de Tráfico</h3>
                    </div>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      {renderInfoCard('Objetivo de campaña', structuredData.trafficker.objective)}
                      {renderInfoCard('Formato', structuredData.trafficker.format)}
                      {structuredData.trafficker.audience && renderInfoCard('Audiencia', structuredData.trafficker.audience)}
                      <div className="bg-background/50 rounded-lg p-3">
                        <span className="text-xs font-medium text-muted-foreground">KPIs</span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {structuredData.trafficker.kpis.map((kpi, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{kpi}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {structuredData.trafficker.copies && structuredData.trafficker.copies.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-orange-500/20">
                        <span className="text-xs font-medium text-muted-foreground">Variaciones de Copy</span>
                        <div className="space-y-2 mt-2">
                          {structuredData.trafficker.copies.map((copy, idx) => (
                            <div key={idx} className="bg-background/50 rounded-lg p-3 text-sm">
                              {copy}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* DISEÑO TAB */}
                <TabsContent value="diseno" className="mt-0 space-y-4">
                  <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl p-5 border border-pink-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-pink-500/20">
                        <Palette className="h-4 w-4 text-pink-600" />
                      </div>
                      <h3 className="font-semibold text-pink-700 dark:text-pink-400">Pautas de Diseño</h3>
                    </div>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="bg-background/50 rounded-lg p-3">
                        <span className="text-xs font-medium text-muted-foreground">Colores</span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {structuredData.design.colors.map((color, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{color}</Badge>
                          ))}
                        </div>
                      </div>
                      {renderInfoCard('Jerarquía de texto', structuredData.design.textHierarchy)}
                      {structuredData.design.ctaPosition && renderInfoCard('Posición CTA', structuredData.design.ctaPosition)}
                      {structuredData.design.elements && structuredData.design.elements.length > 0 && (
                        <div className="bg-background/50 rounded-lg p-3">
                          <span className="text-xs font-medium text-muted-foreground">Elementos</span>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {structuredData.design.elements.map((el, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{el}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ADMIN TAB */}
                <TabsContent value="admin" className="mt-0 space-y-4">
                  <div className="bg-gradient-to-r from-slate-500/10 to-gray-500/10 rounded-xl p-5 border border-slate-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-slate-500/20">
                        <ClipboardList className="h-4 w-4 text-slate-600" />
                      </div>
                      <h3 className="font-semibold text-slate-700 dark:text-slate-400">Información de Producción</h3>
                    </div>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      {structuredData.admin.deadline && renderInfoCard('Fecha de entrega', structuredData.admin.deadline, <Calendar className="h-3 w-3" />)}
                      <div className="bg-background/50 rounded-lg p-3">
                        <span className="text-xs font-medium text-muted-foreground">Estado</span>
                        <div className="mt-1">
                          <Badge className={cn(
                            "text-xs",
                            content.status === 'script_approved' ? "bg-green-500" :
                            content.status === 'script_pending' ? "bg-amber-500" : "bg-blue-500"
                          )}>
                            {content.status === 'script_approved' ? 'Aprobado' :
                             content.status === 'script_pending' ? 'Pendiente revisión' : content.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3 sm:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">Entregables</span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {structuredData.admin.deliverables.map((del, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{del}</Badge>
                          ))}
                        </div>
                      </div>
                      {structuredData.admin.timeline && renderInfoCard('Timeline', structuredData.admin.timeline)}
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
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
        </div>

        {/* Approval Status Footer */}
        {isApproved && content.script_approved_at && (
          <div className="border-t p-4 bg-green-50 dark:bg-green-950/30 shrink-0">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Guión aprobado</span>
              <span className="text-sm text-muted-foreground">
                • {format(new Date(content.script_approved_at), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
            </div>
          </div>
        )}

        {/* Change Request Dialog */}
        <Dialog open={showChangeRequest} onOpenChange={setShowChangeRequest}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Solicitar cambios</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <Textarea
                placeholder="Describe los cambios que necesitas..."
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
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
