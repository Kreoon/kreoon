import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { KpiContentDialog } from '@/components/dashboard/KpiContentDialog';
import { 
  LogOut, 
  Video, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Star,
  ArrowRight,
  Loader2,
  User,
  DollarSign,
  Calendar,
  CreditCard
} from 'lucide-react';

const CREATOR_COLUMNS: { status: ContentStatus; title: string; color: string }[] = [
  { status: 'assigned', title: 'Asignados', color: 'bg-purple-500' },
  { status: 'recording', title: 'En Grabación', color: 'bg-orange-500' },
  { status: 'recorded', title: 'Grabado', color: 'bg-cyan-500' },
  { status: 'editing', title: 'En Edición', color: 'bg-pink-500' },
  { status: 'delivered', title: 'Entregado', color: 'bg-emerald-500' },
  { status: 'approved', title: 'Aprobados', color: 'bg-success' },
  { status: 'paid', title: 'Pagados', color: 'bg-primary' },
];

export default function CreatorDashboard() {
  const { user, profile, signOut } = useAuth();
  const { content, loading, updateContentStatus, refetch } = useContent(user?.id, 'creator');
  const { toast } = useToast();
  const [isAmbassador, setIsAmbassador] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean;
    title: string;
    content: Content[];
  }>({ open: false, title: '', content: [] });

  const openKpiDialog = (title: string, contentList: Content[]) => {
    setKpiDialog({ open: true, title, content: contentList });
  };

  useEffect(() => {
    if (profile) {
      setIsAmbassador(profile.is_ambassador);
    }
  }, [profile]);

  const handleAmbassadorToggle = async (checked: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_ambassador: checked })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de embajador',
        variant: 'destructive'
      });
    } else {
      setIsAmbassador(checked);
      toast({
        title: checked ? 'Ahora eres embajador' : 'Ya no eres embajador',
        description: checked 
          ? 'Podrás recibir contenido exclusivo de UGC Colombia'
          : 'Ya no recibirás contenido de embajador'
      });
    }
  };

  const handleMoveToNext = async (item: Content) => {
    const statusFlow: Record<ContentStatus, ContentStatus> = {
      'draft': 'script_approved',
      'script_pending': 'script_approved',
      'script_approved': 'assigned',
      'assigned': 'recording',
      'recording': 'recorded',
      'recorded': 'editing',
      'editing': 'delivered',
      'delivered': 'approved',
      'issue': 'editing',
      'review': 'approved',
      'approved': 'approved',
      'rejected': 'draft',
      'paid': 'paid'
    };

    const nextStatus = statusFlow[item.status];
    if (nextStatus && nextStatus !== item.status) {
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
  const unpaidContent = content.filter(c => c.status === 'approved' && !c.creator_paid);
  const paidContent = content.filter(c => c.status === 'paid' || c.creator_paid);
  
  const pendingPayment = unpaidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.creator_payment || 0), 0);
  
  const totalPaid = paidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.creator_payment || 0), 0);

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
              <h1 className="font-semibold">{profile?.full_name || 'Creador'}</h1>
              <p className="text-sm text-muted-foreground">Panel de Creador</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="ambassador"
                checked={isAmbassador}
                onCheckedChange={handleAmbassadorToggle}
              />
              <Label htmlFor="ambassador" className="flex items-center gap-1 cursor-pointer">
                <Star className={`w-4 h-4 ${isAmbassador ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                Embajador UGC
              </Label>
            </div>

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openKpiDialog('Total Asignados', content)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{content.length}</p>
                <p className="text-sm text-muted-foreground">Total asignados</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openKpiDialog('En Progreso', content.filter(c => ['script_approved', 'recording'].includes(c.status)))}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {content.filter(c => ['script_approved', 'recording'].includes(c.status)).length}
                </p>
                <p className="text-sm text-muted-foreground">En progreso</p>
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
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openKpiDialog('Contenido Embajador', content.filter(c => c.is_ambassador_content))}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Star className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {content.filter(c => c.is_ambassador_content).length}
                </p>
                <p className="text-sm text-muted-foreground">Embajador</p>
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
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {CREATOR_COLUMNS.map(column => (
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
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium line-clamp-2">{item.title}</h4>
                          {item.is_ambassador_content && (
                            <Star className="w-4 h-4 text-primary fill-primary flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {item.description || 'Sin descripción'}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            {item.client?.name || 'Sin cliente'}
                          </div>
                          
                          {item.deadline && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.deadline).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {!item.is_ambassador_content && item.creator_payment > 0 && (
                          <div className="mt-2 pt-2 border-t flex items-center gap-1 text-sm text-success">
                            <DollarSign className="w-3 h-3" />
                            ${item.creator_payment.toLocaleString()}
                          </div>
                        )}

                        {column.status !== 'approved' && (
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
                {selectedContent.is_ambassador_content && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="w-3 h-3 fill-primary text-primary" />
                    Embajador
                  </Badge>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground">Descripción</Label>
                <p className="mt-1">{selectedContent.description || 'Sin descripción'}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Cliente</Label>
                <p className="mt-1">{selectedContent.client?.name || 'Sin cliente'}</p>
              </div>

              {selectedContent.script && (
                <div>
                  <Label className="text-muted-foreground">Guión</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                    {selectedContent.script}
                  </div>
                </div>
              )}

              {selectedContent.deadline && (
                <div>
                  <Label className="text-muted-foreground">Fecha límite</Label>
                  <p className="mt-1">{new Date(selectedContent.deadline).toLocaleDateString()}</p>
                </div>
              )}

              {!selectedContent.is_ambassador_content && selectedContent.creator_payment > 0 && (
                <div>
                  <Label className="text-muted-foreground">Pago</Label>
                  <p className="mt-1 text-lg font-semibold text-success">
                    ${selectedContent.creator_payment.toLocaleString()}
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
