import { useState } from 'react';
import { Content, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScriptPreview } from '@/components/content/ScriptViewer';
import { ClientScriptReview } from '@/components/content/ClientScriptReview';
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
  BookOpen,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ScriptReviewCardProps {
  content: Content;
  onUpdate?: () => void;
  userId?: string;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  profile?: { full_name: string; avatar_url?: string };
}

export function ScriptReviewCard({ content, onUpdate, userId }: ScriptReviewCardProps) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [showFullScript, setShowFullScript] = useState(false);
  const [showScriptReview, setShowScriptReview] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  const isApproved = content.status === 'script_approved' || content.script_approved_at;

  const fetchComments = async () => {
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
  };

  const handleToggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!userId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: userId,
          comment: newComment.trim()
        });
      if (error) throw error;
      setNewComment('');
      fetchComments();
      toast({ title: 'Comentario agregado' });
    } catch (error) {
      toast({ title: 'Error al agregar comentario', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={cn("text-xs", isApproved ? "bg-green-500" : STATUS_COLORS[content.status])}>
                    {isApproved ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aprobado
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        {STATUS_LABELS[content.status]}
                      </>
                    )}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                    <FileText className="h-3 w-3 mr-1" />
                    Guión
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm line-clamp-2">{content.title}</h3>
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {(content as any).client?.name && (
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>{(content as any).client.name}</span>
                </div>
              )}
              {content.product && (
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>{content.product}</span>
                </div>
              )}
              {content.deadline && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(content.deadline), "d MMM", { locale: es })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Script preview */}
          <div className="p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Vista previa</span>
              <button
                onClick={() => setShowFullScript(!showFullScript)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {showFullScript ? 'Ver menos' : 'Ver más'}
                {showFullScript ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            
            {content.script ? (
              <div 
                onClick={() => setShowScriptReview(true)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className={cn("rounded-sm bg-background/50 p-3", showFullScript ? "max-h-80 overflow-y-auto" : "max-h-36 overflow-hidden")}>
                  <ScriptPreview content={content.script} />
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm bg-background/50 rounded-sm">
                <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                Sin guión
              </div>
            )}
          </div>

          {/* Sales angle preview */}
          {content.sales_angle && (
            <div className="px-4 py-3 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground">Ángulo de venta:</span>
              <p className="text-sm mt-1 line-clamp-2">{content.sales_angle}</p>
            </div>
          )}

          {/* Comments section */}
          {showComments && (
            <div className="border-t bg-muted/30 max-h-48 overflow-y-auto">
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Escribe un comentario sobre el guión..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[50px] text-sm resize-none"
                    rows={2}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddComment}
                    disabled={submitting || !newComment.trim()}
                    className="shrink-0"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                
                {loadingComments ? (
                  <div className="text-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-2">
                    {comments.slice(0, 5).map((comment) => (
                      <div key={comment.id} className="flex gap-2 text-sm">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarImage src={comment.profile?.avatar_url} />
                          <AvatarFallback className="text-xs bg-primary/10">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-xs">{comment.profile?.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), "d MMM", { locale: es })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{comment.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-1">Sin comentarios</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t p-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleComments}
              className={cn("flex-1", showComments && "bg-primary/10")}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Comentarios
            </Button>
            <Button
              onClick={() => setShowScriptReview(true)}
              disabled={!content.script}
              variant="default"
              className="flex-1"
              size="sm"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Revisar Guión
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Script Review Dialog */}
      <ClientScriptReview
        content={content}
        userId={userId}
        open={showScriptReview}
        onOpenChange={setShowScriptReview}
        onUpdate={onUpdate}
      />
    </>
  );
}
