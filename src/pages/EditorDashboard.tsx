import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
  CreditCard,
  LayoutDashboard,
  Columns,
  TrendingUp,
  Play,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const EDITOR_COLUMNS: { status: ContentStatus; title: string; color: string }[] = [
  { status: 'recorded', title: 'Por Editar', color: 'bg-cyan-500' },
  { status: 'editing', title: 'En Edición', color: 'bg-purple-500' },
  { status: 'delivered', title: 'Entregado', color: 'bg-emerald-500' },
  { status: 'approved', title: 'Aprobados', color: 'bg-success' },
  { status: 'paid', title: 'Pagados', color: 'bg-primary' },
];

// Premium Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "primary",
  onClick,
  subtitle,
  prefix = "",
  suffix = ""
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color?: "primary" | "success" | "warning" | "info" | "destructive" | "purple";
  onClick?: () => void;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
}) => {
  const colorClasses = {
    primary: "from-primary/20 to-primary/5 border-primary/30",
    success: "from-success/20 to-success/5 border-success/30",
    warning: "from-warning/20 to-warning/5 border-warning/30",
    info: "from-info/20 to-info/5 border-info/30",
    destructive: "from-destructive/20 to-destructive/5 border-destructive/30",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
  };

  const iconColors = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    destructive: "text-destructive",
    purple: "text-purple-500",
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 p-4",
        "bg-gradient-to-br backdrop-blur-xl",
        "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        colorClasses[color],
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg bg-background/50", iconColors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{prefix}{value.toLocaleString()}{suffix}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default function EditorDashboard() {
  const { user, profile } = useAuth();
  const { content, loading, updateContentStatus } = useContent(user?.id, 'editor');
  const { toast } = useToast();
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
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

  const formatDate = (date: string) => {
    if (!date) return '';
    return format(new Date(date), "d MMM", { locale: es });
  };

  // Métricas
  const toEditContent = content.filter(c => c.status === 'recorded');
  const editingContent = content.filter(c => c.status === 'editing');
  const approvedContent = content.filter(c => c.status === 'approved');
  const unpaidContent = content.filter(c => c.status === 'approved' && !c.editor_paid);
  const paidContent = content.filter(c => c.status === 'paid' || c.editor_paid);
  
  const pendingPayment = unpaidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);
  
  const totalPaid = paidContent
    .filter(c => !c.is_ambassador_content)
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);

  // Progreso
  const totalAssigned = content.length;
  const completedCount = content.filter(c => ['approved', 'paid', 'delivered'].includes(c.status)).length;
  const progressPercent = totalAssigned > 0 ? (completedCount / totalAssigned) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Panel de Editor</h1>
          <p className="text-sm text-muted-foreground">Bienvenido, {profile?.full_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {profile?.is_ambassador && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="font-medium text-primary text-sm">Embajador</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="font-semibold text-success text-sm">
              ${pendingPayment.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">pendiente</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2">
            <Columns className="w-4 h-4" />
            <span className="hidden sm:inline">Tablero</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatsCard
              title="Total Asignados"
              value={content.length}
              icon={Scissors}
              color="purple"
              onClick={() => openKpiDialog('Total Asignados', content)}
            />
            <StatsCard
              title="Por Editar"
              value={toEditContent.length}
              icon={Clock}
              color="info"
              onClick={() => openKpiDialog('Por Editar', toEditContent)}
            />
            <StatsCard
              title="En Edición"
              value={editingContent.length}
              icon={Video}
              color="warning"
              onClick={() => openKpiDialog('En Edición', editingContent)}
            />
            <StatsCard
              title="Aprobados"
              value={approvedContent.length}
              icon={CheckCircle2}
              color="success"
              onClick={() => openKpiDialog('Aprobados', approvedContent)}
            />
            <StatsCard
              title="Por Pagar"
              value={unpaidContent.length}
              icon={DollarSign}
              color="warning"
              subtitle={`$${pendingPayment.toLocaleString()}`}
              onClick={() => openKpiDialog('Por Pagar', unpaidContent)}
            />
            <StatsCard
              title="Pagados"
              value={paidContent.length}
              icon={CreditCard}
              color="success"
              subtitle={`$${totalPaid.toLocaleString()}`}
              onClick={() => openKpiDialog('Pagados', paidContent)}
            />
          </div>

          {/* Progress Card */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Progreso General</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {completedCount} de {totalAssigned} completados
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {progressPercent.toFixed(0)}% de tu contenido ha sido aprobado o entregado
              </p>
            </CardContent>
          </Card>

          {/* Pending Work Alert */}
          {toEditContent.length > 0 && (
            <Card className="border-info/30 bg-info/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-info/20">
                      <Clock className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Tienes {toEditContent.length} video(s) por editar</p>
                      <p className="text-xs text-muted-foreground">Revisa tu cola de edición</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setActiveTab('board')}>
                    Ver tablero
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Content */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Contenido Reciente</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('board')}>
                Ver todo
              </Button>
            </div>
            <div className="space-y-2">
              {content.slice(0, 5).map(item => (
                <Card key={item.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedContent(item)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover rounded-lg" />
                      ) : (
                        <Play className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.creator?.full_name || 'Sin creador'}</p>
                    </div>
                    <Badge className={`text-xs ${STATUS_COLORS[item.status]}`} variant="secondary">
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {content.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Scissors className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="font-semibold mb-2">Sin proyectos asignados</h4>
                    <p className="text-sm text-muted-foreground">Cuando te asignen proyectos aparecerán aquí</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Board Tab */}
        <TabsContent value="board" className="mt-4">
          <div data-tour="editor-kanban" className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {EDITOR_COLUMNS.map(column => (
                <div key={column.status} className="w-72 sm:w-80 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="font-semibold text-sm">{column.title}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">
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
                        <CardContent className="p-3 sm:p-4">
                          <h4 className="font-medium text-sm line-clamp-2 mb-2">{item.title}</h4>
                          
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {item.description || 'Sin descripción'}
                          </p>

                          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="truncate max-w-[100px]">{item.creator?.full_name || 'Sin creador'}</span>
                            </div>
                            
                            {item.deadline && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(item.deadline)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            <span className="truncate">{item.client?.name || 'Sin cliente'}</span>
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
                              className="w-full mt-3 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveToNext(item);
                              }}
                            >
                              Siguiente paso
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {getColumnContent(column.status).length === 0 && (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm">
                        Sin contenido
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Content Detail Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{selectedContent?.title}</DialogTitle>
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
                  <Label className="text-muted-foreground text-xs">Creador</Label>
                  <p className="mt-1 text-sm">{selectedContent.creator?.full_name || 'Sin asignar'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Cliente</Label>
                  <p className="mt-1 text-sm">{selectedContent.client?.name || 'Sin cliente'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Descripción</Label>
                <p className="mt-1 text-sm">{selectedContent.description || 'Sin descripción'}</p>
              </div>

              {selectedContent.drive_url && (
                <div>
                  <Label className="text-muted-foreground text-xs">Video Crudo</Label>
                  <a 
                    href={selectedContent.drive_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-1 text-primary hover:underline block text-sm"
                  >
                    Ver video original
                  </a>
                </div>
              )}

              {selectedContent.deadline && (
                <div>
                  <Label className="text-muted-foreground text-xs">Fecha límite</Label>
                  <p className="mt-1 text-sm">{new Date(selectedContent.deadline).toLocaleDateString()}</p>
                </div>
              )}

              {!selectedContent.is_ambassador_content && selectedContent.editor_payment > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Pago</Label>
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