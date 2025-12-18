import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { 
  LogOut, 
  Scissors, 
  Clock, 
  CheckCircle2, 
  FileText,
  ArrowRight,
  Loader2,
  User,
  DollarSign,
  Calendar,
  Video
} from 'lucide-react';

const EDITOR_COLUMNS: { status: ContentStatus; title: string; color: string }[] = [
  { status: 'editing', title: 'Por Editar', color: 'bg-purple-500' },
  { status: 'review', title: 'En Revisión', color: 'bg-orange-500' },
  { status: 'approved', title: 'Aprobados', color: 'bg-success' },
];

export default function EditorDashboard() {
  const { user, profile, signOut } = useAuth();
  const { content, loading, updateContentStatus } = useContent(user?.id, 'editor');
  const { toast } = useToast();
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const handleMoveToReview = async (item: Content) => {
    try {
      await updateContentStatus(item.id, 'review');
      toast({
        title: 'Enviado a revisión',
        description: 'El cliente revisará el contenido'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive'
      });
    }
  };

  const getColumnContent = (status: ContentStatus) => {
    return content.filter(c => c.status === status);
  };

  const pendingPayment = content
    .filter(c => c.status === 'approved' && !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);

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
              <h1 className="font-semibold">{profile?.full_name || 'Editor'}</h1>
              <p className="text-sm text-muted-foreground">Panel de Editor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="font-semibold text-success">
                ${pendingPayment.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">pendiente</span>
            </div>

            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Scissors className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{content.length}</p>
                <p className="text-sm text-muted-foreground">Total asignados</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {content.filter(c => c.status === 'editing').length}
                </p>
                <p className="text-sm text-muted-foreground">Por editar</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Video className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {content.filter(c => c.status === 'review').length}
                </p>
                <p className="text-sm text-muted-foreground">En revisión</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {content.filter(c => c.status === 'approved').length}
                </p>
                <p className="text-sm text-muted-foreground">Aprobados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {EDITOR_COLUMNS.map(column => (
              <div key={column.status} className="w-80 flex-shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {getColumnContent(column.status).length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {getColumnContent(column.status).map(item => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedContent(item)}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium line-clamp-2 mb-2">{item.title}</h4>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {item.description || 'Sin descripción'}
                        </p>

                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            {item.creator?.full_name || 'Sin creador'}
                          </div>
                          
                          {item.deadline && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.deadline).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          {item.client?.name || 'Sin cliente'}
                        </div>

                        {!item.is_ambassador_content && item.editor_payment > 0 && (
                          <div className="mt-2 pt-2 border-t flex items-center gap-1 text-sm text-success">
                            <DollarSign className="w-3 h-3" />
                            ${item.editor_payment.toLocaleString()}
                          </div>
                        )}

                        {column.status === 'editing' && (
                          <Button 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToReview(item);
                            }}
                          >
                            Enviar a revisión
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {getColumnContent(column.status).length === 0 && (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                      Sin contenido
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Detail Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="max-w-2xl">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Creador</Label>
                  <p className="mt-1">{selectedContent.creator?.full_name || 'Sin asignar'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="mt-1">{selectedContent.client?.name || 'Sin cliente'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Descripción</Label>
                <p className="mt-1">{selectedContent.description || 'Sin descripción'}</p>
              </div>

              {selectedContent.video_url && (
                <div>
                  <Label className="text-muted-foreground">Video</Label>
                  <a 
                    href={selectedContent.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-1 text-primary hover:underline block"
                  >
                    Ver video original
                  </a>
                </div>
              )}

              {selectedContent.deadline && (
                <div>
                  <Label className="text-muted-foreground">Fecha límite</Label>
                  <p className="mt-1">{new Date(selectedContent.deadline).toLocaleDateString()}</p>
                </div>
              )}

              {!selectedContent.is_ambassador_content && selectedContent.editor_payment > 0 && (
                <div>
                  <Label className="text-muted-foreground">Pago</Label>
                  <p className="mt-1 text-lg font-semibold text-success">
                    ${selectedContent.editor_payment.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
