import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { useNavigate } from 'react-router-dom';
import { ClientFinanceChart } from '@/components/dashboard/ClientFinanceChart';
import { 
  LogOut, 
  Video, 
  Clock, 
  CheckCircle2, 
  FileText,
  Loader2,
  User,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Play,
  TrendingUp,
  DollarSign,
  Package,
  Settings,
  Home,
  Heart,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Edit,
  Save,
  X,
  Wallet,
  BarChart3,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientPackage {
  id: string;
  name: string;
  content_quantity: number;
  total_value: number;
  paid_amount: number;
  payment_status: string;
  is_active: boolean;
  created_at: string;
}

interface ClientInfo {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
}

// Animated number counter
const AnimatedNumber = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 800;
    const steps = 25;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

// Premium Stats Card
const PremiumStatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = "primary",
  onClick,
  subtitle,
  prefix = "",
  suffix = ""
}: { 
  title: string; 
  value: number; 
  icon: any; 
  trend?: number;
  color?: "primary" | "success" | "warning" | "info" | "destructive";
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
  };

  const iconColors = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    destructive: "text-destructive",
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 p-4 md:p-5",
        "bg-gradient-to-br backdrop-blur-xl",
        "transition-all duration-500 hover:scale-[1.02] hover:shadow-xl",
        colorClasses[color],
        onClick && "cursor-pointer"
      )}
    >
      <div className={cn(
        "absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20",
        "bg-current blur-3xl transition-all duration-700 group-hover:scale-150",
        iconColors[color]
      )} />
      
      <div className={cn(
        "absolute right-3 top-3 p-2 rounded-xl",
        "bg-current/10 backdrop-blur-sm",
        "transition-transform duration-500 group-hover:scale-110"
      )}>
        <Icon className={cn("h-5 w-5", iconColors[color])} />
      </div>
      
      <div className="relative z-10">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {title}
        </p>
        <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-success" />
            ) : trend < 0 ? (
              <ArrowDownRight className="h-3 w-3 text-destructive" />
            ) : null}
            <span className={cn(
              "text-xs font-medium",
              trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {trend > 0 && "+"}{trend}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [content, setContent] = useState<Content[]>([]);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Edit company state
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    notes: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClientData();
    }
  }, [user]);

  const fetchClientData = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, logo_url, contact_email, contact_phone, notes')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientData) {
        setClientInfo(clientData);
        setEditForm({
          name: clientData.name || '',
          contact_email: clientData.contact_email || '',
          contact_phone: clientData.contact_phone || '',
          notes: clientData.notes || ''
        });

        const { data: contentData, error: contentError } = await supabase
          .from('content')
          .select(`
            *,
            client:clients(*)
          `)
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false });

        if (contentError) {
          console.error('Error fetching content:', contentError);
          setContent([]);
        } else {
          // Obtener perfiles de creadores y editores
          const contentItems = contentData || [];
          const creatorIds = [...new Set(contentItems.filter(c => c.creator_id).map(c => c.creator_id))];
          const editorIds = [...new Set(contentItems.filter(c => c.editor_id).map(c => c.editor_id))];
          
          let creatorMap = new Map();
          let editorMap = new Map();
          
          if (creatorIds.length > 0) {
            const { data: creators } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', creatorIds);
            creators?.forEach(c => creatorMap.set(c.id, c));
          }
          
          if (editorIds.length > 0) {
            const { data: editors } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', editorIds);
            editors?.forEach(e => editorMap.set(e.id, e));
          }
          
          const contentWithProfiles = contentItems.map(item => ({
            ...item,
            creator: item.creator_id ? creatorMap.get(item.creator_id) : null,
            editor: item.editor_id ? editorMap.get(item.editor_id) : null
          }));
          
          setContent(contentWithProfiles as unknown as Content[]);
        }

        const { data: packagesData } = await supabase
          .from('client_packages')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false });

        setPackages(packagesData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!clientInfo) return;
    setSavingCompany(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: editForm.name,
          contact_email: editForm.contact_email,
          contact_phone: editForm.contact_phone,
          notes: editForm.notes
        })
        .eq('id', clientInfo.id);

      if (error) throw error;

      setClientInfo(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditingCompany(false);
      toast({ title: 'Empresa actualizada', description: 'Los datos de tu empresa se guardaron correctamente' });
    } catch (error) {
      console.error('Error saving company:', error);
      toast({ title: 'Error', description: 'No se pudo guardar la información', variant: 'destructive' });
    } finally {
      setSavingCompany(false);
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

      toast({ title: 'Contenido aprobado', description: 'El contenido ha sido aprobado exitosamente' });
      setSelectedContent(null);
      setFeedback('');
      fetchClientData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo aprobar el contenido', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedContent || !user || !feedback) {
      toast({ title: 'Feedback requerido', description: 'Por favor indica las correcciones necesarias', variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    try {
      await supabase
        .from('content')
        .update({ status: 'editing' as ContentStatus, notes: feedback })
        .eq('id', selectedContent.id);

      await supabase.from('content_comments').insert({
        content_id: selectedContent.id,
        user_id: user.id,
        comment: `Correcciones solicitadas: ${feedback}`
      });

      toast({ title: 'Enviado a corrección', description: 'El editor realizará los cambios solicitados' });
      setSelectedContent(null);
      setFeedback('');
      fetchClientData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo enviar a corrección', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getContentByStatus = (statuses: ContentStatus[]) => content.filter(c => statuses.includes(c.status));

  const inProgressContent = getContentByStatus(['draft', 'script_pending', 'script_approved', 'recording', 'editing', 'review']);
  const reviewContent = getContentByStatus(['delivered', 'issue']); // Entregado y novedades para revisar
  const approvedContent = getContentByStatus(['approved', 'paid']);
  const publishedContent = content.filter(c => c.is_published);

  // Financial Metrics
  const totalInvested = packages.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
  const totalValue = packages.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
  const pendingPayment = totalValue - totalInvested;
  const totalContentPromised = packages.reduce((sum, p) => sum + (p.content_quantity || 0), 0);
  const deliveredContentCount = approvedContent.length;
  const contentPending = Math.max(0, totalContentPromised - deliveredContentCount);
  
  // Calcular costo por video del paquete
  const costPerVideo = totalContentPromised > 0 ? totalValue / totalContentPromised : 0;
  
  // Valor de videos aprobados (consumidos)
  const approvedVideosValue = deliveredContentCount * costPerVideo;
  
  // Saldo del cliente: positivo = saldo a favor, negativo = debe
  // Saldo = Lo que pagó - Valor de videos aprobados
  const clientBalance = totalInvested - approvedVideosValue;
  
  // Engagement Metrics
  const totalViews = content.reduce((sum, c) => sum + (c.views_count || 0), 0);
  const totalLikes = content.reduce((sum, c) => sum + (c.likes_count || 0), 0);
  const avgViewsPerVideo = content.length > 0 ? Math.round(totalViews / content.length) : 0;

  const formatDate = (date: string) => {
    if (!date) return '';
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa vinculada</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Tu cuenta aún no está vinculada a una empresa. Contacta al administrador para completar la configuración.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/portfolio')}>
            Ver Portafolio
          </Button>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {clientInfo.logo_url ? (
              <img src={clientInfo.logo_url} alt={clientInfo.name} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{clientInfo.name}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Portal de Cliente</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {reviewContent.length > 0 && (
              <Button size="sm" onClick={() => setActiveTab('review')} className="gap-1">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">{reviewContent.length} por revisar</span>
                <span className="sm:hidden">{reviewContent.length}</span>
              </Button>
            )}
            <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-lg bg-success/10 border border-success/20">
              <Activity className="h-3 w-3 text-success animate-pulse" />
              <span className="text-xs font-medium text-success">En vivo</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-t border-border/30 px-2">
          {[
            { id: 'overview', label: 'Dashboard', icon: Home },
            { id: 'finance', label: 'Finanzas', icon: Wallet },
            { id: 'review', label: 'Revisar', icon: Eye, badge: reviewContent.length },
            { id: 'content', label: 'Contenido', icon: Video },
            { id: 'company', label: 'Empresa', icon: Building2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'text-primary border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 text-[10px] px-1">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome */}
            <div>
              <h2 className="text-xl font-bold">Hola, {profile?.full_name?.split(' ')[0] || 'Cliente'} 👋</h2>
              <p className="text-sm text-muted-foreground">Aquí está el resumen de tu cuenta</p>
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <PremiumStatsCard
                title="Inversión Total"
                value={totalInvested}
                prefix="$"
                icon={DollarSign}
                color="success"
                subtitle={`de $${totalValue.toLocaleString()}`}
              />
              <PremiumStatsCard
                title="Videos"
                value={content.length}
                icon={Video}
                color="primary"
                subtitle={`${deliveredContentCount} aprobados`}
              />
              <PremiumStatsCard
                title="Vistas Totales"
                value={totalViews}
                icon={TrendingUp}
                color="info"
              />
              <PremiumStatsCard
                title="Likes"
                value={totalLikes}
                icon={Heart}
                color="destructive"
              />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <ClientFinanceChart
                    packages={packages}
                    content={content}
                    chartType="content-status"
                    title="Estado del Contenido"
                  />
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <ClientFinanceChart
                    packages={packages}
                    content={content}
                    chartType="engagement"
                    title="Engagement Mensual"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Pending Reviews Alert */}
            {reviewContent.length > 0 && (
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-orange-500/20">
                        <Eye className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Tienes {reviewContent.length} contenido(s) por revisar</p>
                        <p className="text-xs text-muted-foreground">Revisa y aprueba tu contenido</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('review')}>
                      Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Card */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Progreso del Paquete</h3>
                  <span className="text-xs text-muted-foreground">
                    {deliveredContentCount} de {totalContentPromised} videos
                  </span>
                </div>
                <Progress 
                  value={totalContentPromised > 0 ? (deliveredContentCount / totalContentPromised) * 100 : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {contentPending > 0 ? `Faltan ${contentPending} videos por entregar` : 'Todos los videos entregados 🎉'}
                </p>
              </CardContent>
            </Card>

            {/* Recent Content */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Contenido Reciente</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('content')}>
                  Ver todo
                </Button>
              </div>
              <div className="space-y-2">
                {content.slice(0, 4).map(item => (
                  <Card key={item.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover rounded-lg" />
                        ) : (
                          <Play className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(item.created_at || '')}</p>
                      </div>
                      <Badge className={STATUS_COLORS[item.status]} variant="secondary">
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Finance Tab */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-1">Control Financiero</h2>
              <p className="text-sm text-muted-foreground">Resumen de tu inversión y paquetes</p>
            </div>

            {/* Financial KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <PremiumStatsCard
                title="Total Pagado"
                value={totalInvested}
                prefix="$"
                icon={DollarSign}
                color="success"
              />
              <PremiumStatsCard
                title="Videos Aprobados"
                value={Math.round(approvedVideosValue)}
                prefix="$"
                icon={CheckCircle2}
                color="primary"
                subtitle={`${deliveredContentCount} videos`}
              />
              <PremiumStatsCard
                title={clientBalance >= 0 ? "Saldo a Favor" : "Saldo Pendiente"}
                value={Math.abs(Math.round(clientBalance))}
                prefix={clientBalance >= 0 ? "+$" : "-$"}
                icon={Wallet}
                color={clientBalance >= 0 ? "success" : "destructive"}
                subtitle={clientBalance >= 0 ? "Tienes crédito disponible" : "Monto por regularizar"}
              />
              <PremiumStatsCard
                title="Por Pagar"
                value={pendingPayment > 0 ? pendingPayment : 0}
                prefix="$"
                icon={Clock}
                color={pendingPayment > 0 ? "warning" : "success"}
                subtitle={`de $${totalValue.toLocaleString()} total`}
              />
              <PremiumStatsCard
                title="Costo por Video"
                value={Math.round(costPerVideo)}
                prefix="$"
                icon={BarChart3}
                color="info"
                subtitle={`${totalContentPromised} videos en paquete`}
              />
            </div>

            {/* Investment Chart */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <ClientFinanceChart
                  packages={packages}
                  content={content}
                  chartType="investment"
                  title="Inversión Mensual"
                />
              </CardContent>
            </Card>

            {/* Packages List */}
            <div>
              <h3 className="font-semibold mb-3">Mis Paquetes</h3>
              {packages.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="font-semibold mb-2">Sin paquetes</h4>
                    <p className="text-sm text-muted-foreground">Contacta al equipo para contratar un paquete</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {packages.map(pkg => (
                    <Card key={pkg.id} className={pkg.is_active ? 'border-primary/30' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{pkg.name}</h4>
                            <p className="text-xs text-muted-foreground">{formatDate(pkg.created_at)}</p>
                          </div>
                          <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                            {pkg.is_active ? 'Activo' : 'Completado'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Videos</p>
                            <p className="font-semibold">{pkg.content_quantity}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Valor Total</p>
                            <p className="font-semibold">${Number(pkg.total_value).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Pagado</p>
                            <p className="font-semibold text-success">${Number(pkg.paid_amount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Estado</p>
                            <Badge variant={pkg.payment_status === 'paid' ? 'default' : 'outline'} className="text-xs">
                              {pkg.payment_status === 'paid' ? 'Pagado' : pkg.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                            </Badge>
                          </div>
                        </div>

                        {/* Progress bar for package */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Pago</span>
                            <span className="text-muted-foreground">
                              {Math.round((Number(pkg.paid_amount) / Number(pkg.total_value)) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={(Number(pkg.paid_amount) / Number(pkg.total_value)) * 100} 
                            className="h-1.5"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Tab */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Contenido por Revisar</h2>
              <p className="text-sm text-muted-foreground">Revisa y aprueba tu contenido</p>
            </div>

            {reviewContent.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
                  <h3 className="font-semibold mb-2">Todo al día</h3>
                  <p className="text-sm text-muted-foreground">No hay contenido pendiente de revisión</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reviewContent.map(item => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover rounded-lg" />
                          ) : (
                            <Video className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm line-clamp-2">{item.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Creador: {item.creator?.full_name || 'Sin asignar'}
                          </p>
                        </div>
                      </div>
                      <Button className="w-full" onClick={() => setSelectedContent(item)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Revisar y Aprobar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Todo el Contenido</h2>
              <p className="text-sm text-muted-foreground">{content.length} videos en total</p>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                <TabsTrigger value="progress" className="text-xs">Progreso</TabsTrigger>
                <TabsTrigger value="approved" className="text-xs">Aprobados</TabsTrigger>
                <TabsTrigger value="published" className="text-xs">Publicados</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <ContentList items={content} onSelect={setSelectedContent} />
              </TabsContent>
              <TabsContent value="progress">
                <ContentList items={inProgressContent} onSelect={setSelectedContent} />
              </TabsContent>
              <TabsContent value="approved">
                <ContentList items={approvedContent} onSelect={setSelectedContent} />
              </TabsContent>
              <TabsContent value="published">
                <ContentList items={publishedContent} onSelect={setSelectedContent} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Company Tab */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1">Datos de la Empresa</h2>
                <p className="text-sm text-muted-foreground">Administra la información de tu marca</p>
              </div>
              {!isEditingCompany && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingCompany(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="p-6">
                {isEditingCompany ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company-name">Nombre de la empresa</Label>
                      <Input
                        id="company-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nombre de tu empresa"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email">Email de contacto</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={editForm.contact_email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, contact_email: e.target.value }))}
                        placeholder="email@empresa.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-phone">Teléfono de contacto</Label>
                      <Input
                        id="contact-phone"
                        value={editForm.contact_phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                        placeholder="+57 300 000 0000"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notas adicionales</Label>
                      <Textarea
                        id="notes"
                        value={editForm.notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Información adicional sobre tu empresa..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveCompany} disabled={savingCompany} className="flex-1">
                        {savingCompany ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingCompany(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {clientInfo.logo_url ? (
                        <img src={clientInfo.logo_url} alt={clientInfo.name} className="h-16 w-16 rounded-xl object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold">{clientInfo.name}</h3>
                        <p className="text-sm text-muted-foreground">Cliente desde {formatDate(packages[packages.length - 1]?.created_at || '')}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <Label className="text-xs text-muted-foreground">Email de contacto</Label>
                        <p className="font-medium">{clientInfo.contact_email || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Teléfono</Label>
                        <p className="font-medium">{clientInfo.contact_phone || 'No especificado'}</p>
                      </div>
                    </div>

                    {clientInfo.notes && (
                      <div className="pt-4 border-t">
                        <Label className="text-xs text-muted-foreground">Notas</Label>
                        <p className="text-sm mt-1">{clientInfo.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats about company */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="h-5 w-5 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold">{packages.length}</p>
                  <p className="text-xs text-muted-foreground">Paquetes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Video className="h-5 w-5 mx-auto text-info mb-2" />
                  <p className="text-2xl font-bold">{content.length}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-5 w-5 mx-auto text-success mb-2" />
                  <p className="text-2xl font-bold">${(totalInvested / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground">Invertido</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-warning mb-2" />
                  <p className="text-2xl font-bold">{avgViewsPerVideo.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Vistas/Video</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => { setSelectedContent(null); setFeedback(''); }}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-lg">{selectedContent?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedContent && (
            <ScrollArea className="max-h-[calc(90vh-80px)]">
              <div className="p-4 space-y-4">
                <Badge className={STATUS_COLORS[selectedContent.status]}>
                  {STATUS_LABELS[selectedContent.status]}
                </Badge>

                {selectedContent.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Descripción</Label>
                    <p className="text-sm mt-1">{selectedContent.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Creador</Label>
                    <p>{selectedContent.creator?.full_name || 'Sin asignar'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Editor</Label>
                    <p>{selectedContent.editor?.full_name || 'Sin asignar'}</p>
                  </div>
                </div>

                {selectedContent.script && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Guión</Label>
                    <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
                      {selectedContent.script}
                    </div>
                  </div>
                )}

                {selectedContent.video_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Video</Label>
                    <a 
                      href={selectedContent.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-1 block p-3 bg-primary/10 rounded-lg text-primary text-sm hover:bg-primary/20 transition-colors"
                    >
                      <Play className="w-4 h-4 inline mr-2" />
                      Ver video
                    </a>
                  </div>
                )}

                {selectedContent.status === 'review' && (
                  <>
                    <div>
                      <Label htmlFor="feedback" className="text-xs text-muted-foreground">
                        Comentarios (opcional para aprobar, requerido para rechazar)
                      </Label>
                      <Textarea
                        id="feedback"
                        placeholder="Escribe tus comentarios o correcciones..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-success hover:bg-success/90" 
                        onClick={handleApprove}
                        disabled={submitting}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={handleReject}
                        disabled={submitting || !feedback}
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Correcciones
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Content List Component
function ContentList({ items, onSelect }: { items: Content[]; onSelect: (c: Content) => void }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Video className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No hay contenido en esta categoría</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <Card key={item.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onSelect(item)}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover rounded-lg" />
              ) : (
                <Play className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.creator?.full_name || 'Sin creador'}</p>
            </div>
            <Badge className={STATUS_COLORS[item.status]} variant="secondary">
              {STATUS_LABELS[item.status]}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
