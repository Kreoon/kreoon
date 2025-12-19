import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { KpiContentDialog } from '@/components/dashboard/KpiContentDialog';
import { 
  Scissors, 
  Clock, 
  CheckCircle2, 
  FileText,
  ArrowRight,
  Loader2,
  User,
  DollarSign,
  Calendar,
  Video,
  CreditCard
} from 'lucide-react';

const EDITOR_COLUMNS: { status: ContentStatus; title: string; color: string }[] = [
  { status: 'recorded', title: 'Por Editar', color: 'bg-cyan-500' },
  { status: 'editing', title: 'En Edición', color: 'bg-purple-500' },
  { status: 'delivered', title: 'Entregado', color: 'bg-emerald-500' },
  { status: 'approved', title: 'Aprobados', color: 'bg-success' },
  { status: 'paid', title: 'Pagados', color: 'bg-primary' },
];

export default function EditorDashboard() {
  const { user, profile, signOut } = useAuth();
  const { content, loading, updateContentStatus } = useContent(user?.id, 'editor');
  const { toast } = useToast();
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean;
    title: string;
    content: Content[];
  }>({ open: false, title: '', content: [] });

  const openKpiDialog = (title: string, contentList: Content[]) => {
    setKpiDialog({ open: true, title, content: contentList });
  };

  const handleMoveToNext = async (item: Content) => {
    const statusFlow: Record<string, ContentStatus> = {
      'recorded': 'editing',
      'editing': 'delivered'
    };
    const nextStatus = statusFlow[item.status];
    if (nextStatus) {
      try {
        await updateContentStatus(item.id, nextStatus);
        toast({
          title: 'Estado actualizado',
          description: `Movido a ${STATUS_LABELS[nextStatus]}`
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el estado',
          variant: 'destructive'
        });
      }
    }
  };

  const getColumnContent = (status: ContentStatus) => {
    return content.filter(c => c.status === status);
  };

  // Pagos pendientes y pagados
  const unpaidContent = content.filter(c => c.status === 'approved' && !c.editor_paid);
  const paidContent = content.filter(c => c.status === 'paid' || c.editor_paid);
  
  const pendingPayment = unpaidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);
  
  const totalPaid = paidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Editor</h1>
          <p className="text-muted-foreground">Gestiona tu contenido por editar</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
          <DollarSign className="w-4 h-4 text-success" />
          <span className="font-semibold text-success">
            ${pendingPayment.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">pendiente</span>
        </div>
      </div>

      {/* Stats */}
      <div data-tour="editor-stats" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openKpiDialog('Total Asignados', content)}
          >
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

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openKpiDialog('Por Editar', content.filter(c => c.status === 'recorded'))}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {content.filter(c => c.status === 'recorded').length}
                </p>
                <p className="text-sm text-muted-foreground">Por editar</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openKpiDialog('En Edición', content.filter(c => c.status === 'editing'))}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Video className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {content.filter(c => c.status === 'editing').length}
                </p>
                <p className="text-sm text-muted-foreground">En edición</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openKpiDialog('Aprobados', content.filter(c => c.status === 'approved'))}
          >
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

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-warning/30 bg-warning/5"
            onClick={() => openKpiDialog('Por Pagar', unpaidContent)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unpaidContent.length}</p>
                <p className="text-sm text-muted-foreground">Por pagar</p>
                <p className="text-xs text-warning font-medium">${pendingPayment.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-success/30 bg-success/5"
            onClick={() => openKpiDialog('Pagados', paidContent)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CreditCard className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidContent.length}</p>
                <p className="text-sm text-muted-foreground">Pagados</p>
                <p className="text-xs text-success font-medium">${totalPaid.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <div data-tour="editor-kanban" className="overflow-x-auto pb-4">
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

                        {(column.status === 'recorded' || column.status === 'editing') && (
                          <Button 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToNext(item);
                            }}
                          >
                            Siguiente paso
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

      {/* KPI Content Dialog */}
      <KpiContentDialog
        title={kpiDialog.title}
        content={kpiDialog.content}
        open={kpiDialog.open}
        onOpenChange={(open) => setKpiDialog(prev => ({ ...prev, open }))}
        onSelectContent={setSelectedContent}
      />
    </div>
  );
}
