import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { 
  LogOut, 
  Video, 
  Clock, 
  CheckCircle2, 
  FileText,
  Loader2,
  User,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye
} from 'lucide-react';

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClientContent();
  }, [user]);

  const fetchClientContent = async () => {
    if (!user) return;

    try {
      // Get client associated with user
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientData) {
        const { data: contentData } = await supabase
          .from('content')
          .select(`
            *,
            client:clients(*),
            creator:profiles!content_creator_id_fkey(*),
            editor:profiles!content_editor_id_fkey(*)
          `)
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false });

        setContent((contentData || []) as unknown as Content[]);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedContent || !user) return;
    setSubmitting(true);

    try {
      await supabase
        .from('content')
        .update({ 
          status: 'approved' as ContentStatus,
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', selectedContent.id);

      if (feedback) {
        await supabase
          .from('content_comments')
          .insert({
            content_id: selectedContent.id,
            user_id: user.id,
            comment: `Aprobado: ${feedback}`
          });
      }

      toast({
        title: 'Contenido aprobado',
        description: 'El contenido ha sido aprobado exitosamente'
      });

      setSelectedContent(null);
      setFeedback('');
      fetchClientContent();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo aprobar el contenido',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedContent || !user || !feedback) {
      toast({
        title: 'Feedback requerido',
        description: 'Por favor indica las correcciones necesarias',
        variant: 'destructive'
      });
      return;
    }
    setSubmitting(true);

    try {
      await supabase
        .from('content')
        .update({ 
          status: 'editing' as ContentStatus,
          notes: feedback
        })
        .eq('id', selectedContent.id);

      await supabase
        .from('content_comments')
        .insert({
          content_id: selectedContent.id,
          user_id: user.id,
          comment: `Correcciones solicitadas: ${feedback}`
        });

      toast({
        title: 'Enviado a corrección',
        description: 'El editor realizará los cambios solicitados'
      });

      setSelectedContent(null);
      setFeedback('');
      fetchClientContent();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar a corrección',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getContentByStatus = (statuses: ContentStatus[]) => {
    return content.filter(c => statuses.includes(c.status));
  };

  const inProgressContent = getContentByStatus(['draft', 'script_pending', 'script_approved', 'recording', 'editing']);
  const reviewContent = getContentByStatus(['review']);
  const approvedContent = getContentByStatus(['approved', 'paid']);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback>
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">{profile?.full_name || 'Cliente'}</h1>
              <p className="text-sm text-muted-foreground">Portal de Cliente</p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{content.length}</p>
                <p className="text-sm text-muted-foreground">Total contenidos</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressContent.length}</p>
                <p className="text-sm text-muted-foreground">En progreso</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Eye className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviewContent.length}</p>
                <p className="text-sm text-muted-foreground">Por revisar</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedContent.length}</p>
                <p className="text-sm text-muted-foreground">Aprobados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="review" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="review" className="gap-2">
              <Eye className="w-4 h-4" />
              Por Revisar
              {reviewContent.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {reviewContent.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <Clock className="w-4 h-4" />
              En Progreso
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Aprobados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review">
            {reviewContent.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No hay contenido por revisar</h3>
                  <p className="text-muted-foreground">
                    Cuando tu contenido esté listo para revisión, aparecerá aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviewContent.map(item => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold line-clamp-2">{item.title}</h4>
                        <Badge className="bg-orange-500/20 text-orange-500">
                          Por revisar
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {item.description || 'Sin descripción'}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <User className="w-3 h-3" />
                        Creador: {item.creator?.full_name || 'Sin asignar'}
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={() => setSelectedContent(item)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Revisar contenido
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress">
            {inProgressContent.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No hay contenido en progreso</h3>
                  <p className="text-muted-foreground">
                    El contenido en producción aparecerá aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressContent.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold line-clamp-2">{item.title}</h4>
                        <Badge className={STATUS_COLORS[item.status]}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {item.description || 'Sin descripción'}
                      </p>

                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          Creador: {item.creator?.full_name || 'Por asignar'}
                        </div>
                        {item.deadline && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Entrega: {new Date(item.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {item.script && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full mt-4"
                          onClick={() => setSelectedContent(item)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Ver guión
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved">
            {approvedContent.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No hay contenido aprobado</h3>
                  <p className="text-muted-foreground">
                    El contenido aprobado aparecerá aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedContent.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold line-clamp-2">{item.title}</h4>
                        <Badge className="bg-success/20 text-success">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Aprobado
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {item.description || 'Sin descripción'}
                      </p>

                      {item.approved_at && (
                        <p className="text-xs text-muted-foreground">
                          Aprobado el {new Date(item.approved_at).toLocaleDateString()}
                        </p>
                      )}

                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => setSelectedContent(item)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalles
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => {
        setSelectedContent(null);
        setFeedback('');
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContent?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedContent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[selectedContent.status]}>
                  {STATUS_LABELS[selectedContent.status]}
                </Badge>
              </div>

              <div>
                <Label className="text-muted-foreground">Descripción</Label>
                <p className="mt-1">{selectedContent.description || 'Sin descripción'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Creador</Label>
                  <p className="mt-1">{selectedContent.creator?.full_name || 'Sin asignar'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Editor</Label>
                  <p className="mt-1">{selectedContent.editor?.full_name || 'Sin asignar'}</p>
                </div>
              </div>

              {selectedContent.script && (
                <div>
                  <Label className="text-muted-foreground">Guión</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm max-h-48 overflow-y-auto">
                    {selectedContent.script}
                  </div>
                </div>
              )}

              {selectedContent.video_url && (
                <div>
                  <Label className="text-muted-foreground">Video</Label>
                  <a 
                    href={selectedContent.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-1 text-primary hover:underline flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" />
                    Ver video
                  </a>
                </div>
              )}

              {selectedContent.status === 'review' && (
                <>
                  <div>
                    <Label htmlFor="feedback">Comentarios / Feedback</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Escribe tus comentarios aquí..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={handleReject}
                      disabled={submitting}
                      className="gap-2"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Solicitar correcciones
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="w-4 h-4" />
                      )}
                      Aprobar contenido
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
