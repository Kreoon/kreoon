import { useState, useEffect } from "react";
import { 
  Video, Users, CheckCircle, Clock, DollarSign, TrendingUp, 
  Activity, Zap, Target, BarChart3, ArrowUpRight, ArrowDownRight,
  Play, Eye, UserCheck, Calendar, Banknote, Receipt
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useContentWithFilters } from "@/hooks/useContent";
import { Content } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ContentDetailDialog } from "@/components/content/ContentDetailDialog";
import { KpiContentDialog } from "@/components/dashboard/KpiContentDialog";
import { cn } from "@/lib/utils";

// Animated number counter
const AnimatedNumber = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
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

// Premium Stats Card with glow effect
const PremiumStatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = "primary",
  onClick,
  subtitle
}: { 
  title: string; 
  value: number; 
  icon: any; 
  trend?: number;
  color?: "primary" | "success" | "warning" | "info" | "destructive";
  onClick?: () => void;
  subtitle?: string;
}) => {
  const colorClasses = {
    primary: "from-primary/20 to-primary/5 border-primary/30 text-primary",
    success: "from-success/20 to-success/5 border-success/30 text-success",
    warning: "from-warning/20 to-warning/5 border-warning/30 text-warning",
    info: "from-info/20 to-info/5 border-info/30 text-info",
    destructive: "from-destructive/20 to-destructive/5 border-destructive/30 text-destructive",
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 p-6",
        "bg-gradient-to-br backdrop-blur-xl",
        "transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl",
        colorClasses[color],
        onClick && "cursor-pointer"
      )}
    >
      {/* Animated background pulse */}
      <div className={cn(
        "absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20",
        "bg-current blur-3xl transition-all duration-700 group-hover:scale-150"
      )} />
      
      {/* Floating icon */}
      <div className={cn(
        "absolute right-4 top-4 p-3 rounded-xl",
        "bg-current/10 backdrop-blur-sm",
        "transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
      )}>
        <Icon className="h-6 w-6 text-current" />
      </div>
      
      <div className="relative z-10">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          {title}
        </p>
        <p className="text-4xl font-bold tracking-tight text-foreground mb-1">
          <AnimatedNumber value={value} />
        </p>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? (
              <ArrowUpRight className="h-4 w-4 text-success" />
            ) : trend < 0 ? (
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            ) : null}
            <span className={cn(
              "text-sm font-medium",
              trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {trend > 0 && "+"}{trend}% vs mes anterior
            </span>
          </div>
        )}
      </div>
      
      {/* Bottom accent line */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-1 bg-current opacity-50",
        "transition-all duration-500 group-hover:opacity-100"
      )} />
    </div>
  );
};

// Large KPI Card for main metrics
const LargeKpiCard = ({ 
  title, 
  value, 
  prefix = "",
  suffix = "",
  icon: Icon, 
  trend,
  description,
  onClick 
}: { 
  title: string; 
  value: number; 
  prefix?: string;
  suffix?: string;
  icon: any; 
  trend?: number;
  description?: string;
  onClick?: () => void;
}) => (
  <div 
    onClick={onClick}
    className={cn(
      "group relative overflow-hidden rounded-3xl border border-border/50 p-8",
      "bg-gradient-to-br from-card via-card to-muted/20 backdrop-blur-xl",
      "transition-all duration-500 hover:shadow-[0_0_60px_-10px] hover:shadow-primary/20",
      onClick && "cursor-pointer"
    )}
  >
    {/* Animated gradient orb */}
    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl transition-transform duration-700 group-hover:scale-125" />
    
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">{title}</p>
        </div>
        
        <p className="text-6xl font-bold tracking-tight text-foreground mb-2">
          {prefix}<AnimatedNumber value={value} />{suffix}
        </p>
        
        {description && (
          <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
        )}
      </div>
      
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium",
          trend > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}>
          {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {trend > 0 && "+"}{trend}%
        </div>
      )}
    </div>
  </div>
);

// Quick action button for payments
const QuickPayButton = ({ 
  label, 
  count, 
  icon: Icon,
  onClick,
  variant = "default"
}: { 
  label: string; 
  count: number;
  icon: any;
  onClick: () => void;
  variant?: "default" | "success";
}) => (
  <Button
    onClick={onClick}
    variant="outline"
    className={cn(
      "h-auto p-4 flex flex-col items-center gap-2 rounded-xl border-2",
      "transition-all duration-300 hover:scale-105",
      variant === "success" 
        ? "border-success/30 bg-success/5 hover:bg-success/10 hover:border-success/50" 
        : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
    )}
  >
    <Icon className={cn("h-6 w-6", variant === "success" ? "text-success" : "text-primary")} />
    <span className="text-sm font-medium">{label}</span>
    <span className="text-2xl font-bold">{count}</span>
  </Button>
);

export default function Dashboard() {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const { content, loading, refetch, deleteContent } = useContentWithFilters({
    userId: user?.id,
    role: 'admin'
  });

  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean;
    title: string;
    content: Content[];
  }>({ open: false, title: '', content: [] });

  // Fetch clients billing data
  const [clientsBilling, setClientsBilling] = useState<{
    totalBilled: number;
    totalPending: number;
    totalPaid: number;
  }>({ totalBilled: 0, totalPending: 0, totalPaid: 0 });

  useEffect(() => {
    const fetchBillingData = async () => {
      // Calculate from content - sum of creator_payment + editor_payment for billed
      const totalBilled = content.reduce((sum, c) => {
        // Only count invoiced content
        if (c.invoiced) {
          return sum + (c.creator_payment || 0) + (c.editor_payment || 0);
        }
        return sum;
      }, 0);

      // Pending = not paid content that's approved
      const pendingPayments = content.filter(c => 
        c.status === 'approved' && (!c.creator_paid || !c.editor_paid)
      );
      const totalPending = pendingPayments.reduce((sum, c) => {
        let pending = 0;
        if (!c.creator_paid) pending += c.creator_payment || 0;
        if (!c.editor_paid) pending += c.editor_payment || 0;
        return sum + pending;
      }, 0);

      // Paid = content with both paid
      const paidPayments = content.filter(c => c.creator_paid && c.editor_paid);
      const totalPaid = paidPayments.reduce((sum, c) => 
        sum + (c.creator_payment || 0) + (c.editor_payment || 0), 0
      );

      setClientsBilling({ totalBilled, totalPending, totalPaid });
    };

    if (content.length > 0) {
      fetchBillingData();
    }
  }, [content]);

  // Stats calculations
  const totalContent = content.length;
  const activeContent = content.filter(c => !['approved', 'paid'].includes(c.status)).length;
  const inProgress = content.filter(c => ['recording', 'editing'].includes(c.status)).length;
  const completed = content.filter(c => c.status === 'approved').length;
  const pending = content.filter(c => ['draft', 'script_approved', 'assigned'].includes(c.status)).length;
  
  // Payment stats
  const unpaidCreatorContent = content.filter(c => c.status === 'approved' && !c.creator_paid);
  const unpaidEditorContent = content.filter(c => c.status === 'approved' && !c.editor_paid);
  const paidContent = content.filter(c => c.creator_paid && c.editor_paid);

  // Calculate pending amounts
  const pendingCreatorPayment = unpaidCreatorContent.reduce((sum, c) => sum + (c.creator_payment || 0), 0);
  const pendingEditorPayment = unpaidEditorContent.reduce((sum, c) => sum + (c.editor_payment || 0), 0);

  const handleMarkCreatorPaid = async (contentItem: Content) => {
    try {
      const updates: any = { creator_paid: true };
      
      // If both will be paid, change status to paid
      if (contentItem.editor_paid) {
        updates.status = 'paid';
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', contentItem.id);

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: `Creador marcado como pagado para "${contentItem.title}"`
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
    }
  };

  const handleMarkEditorPaid = async (contentItem: Content) => {
    try {
      const updates: any = { editor_paid: true };
      
      // If both will be paid, change status to paid
      if (contentItem.creator_paid) {
        updates.status = 'paid';
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', contentItem.id);

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: `Editor marcado como pagado para "${contentItem.title}"`
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
    }
  };

  const handleBulkPayCreators = async () => {
    try {
      for (const item of unpaidCreatorContent) {
        await handleMarkCreatorPaid(item);
      }
      toast({
        title: "Pagos procesados",
        description: `${unpaidCreatorContent.length} creadores marcados como pagados`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar pagos",
        variant: "destructive"
      });
    }
  };

  const handleBulkPayEditors = async () => {
    try {
      for (const item of unpaidEditorContent) {
        await handleMarkEditorPaid(item);
      }
      toast({
        title: "Pagos procesados",
        description: `${unpaidEditorContent.length} editores marcados como pagados`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar pagos",
        variant: "destructive"
      });
    }
  };

  const openKpiDialog = (title: string, contentList: Content[]) => {
    setKpiDialog({ open: true, title, content: contentList });
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      await deleteContent(contentId);
      toast({
        title: "Eliminado",
        description: "Contenido eliminado correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header with glassmorphism */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-6 lg:px-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Dashboard Ejecutivo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Métricas en tiempo real • {new Date().toLocaleDateString('es-CO', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 border border-success/20">
              <Activity className="h-4 w-4 text-success animate-pulse" />
              <span className="text-sm font-medium text-success">En vivo</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 lg:p-8 space-y-8">
        {/* Main KPIs Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LargeKpiCard
            title="Total Contenidos"
            value={totalContent}
            icon={Video}
            trend={12}
            description="Contenidos gestionados en la plataforma"
            onClick={() => openKpiDialog('Todos los Contenidos', content)}
          />
          <LargeKpiCard
            title="Ingresos Totales"
            value={clientsBilling.totalBilled}
            prefix="$"
            suffix=""
            icon={DollarSign}
            trend={8}
            description="Facturación total a clientes"
          />
          <LargeKpiCard
            title="Tasa de Completados"
            value={totalContent > 0 ? Math.round((completed / totalContent) * 100) : 0}
            suffix="%"
            icon={Target}
            trend={5}
            description="Porcentaje de contenidos aprobados"
          />
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <PremiumStatsCard
            title="Activos"
            value={activeContent}
            icon={Play}
            color="info"
            onClick={() => openKpiDialog('Contenido Activo', content.filter(c => !['approved', 'paid'].includes(c.status)))}
          />
          <PremiumStatsCard
            title="En Proceso"
            value={inProgress}
            icon={Clock}
            color="warning"
            onClick={() => openKpiDialog('En Proceso', content.filter(c => ['recording', 'editing'].includes(c.status)))}
          />
          <PremiumStatsCard
            title="Pendientes"
            value={pending}
            icon={Calendar}
            color="primary"
            onClick={() => openKpiDialog('Pendientes', content.filter(c => ['draft', 'script_approved', 'assigned'].includes(c.status)))}
          />
          <PremiumStatsCard
            title="Aprobados"
            value={completed}
            icon={CheckCircle}
            color="success"
            onClick={() => openKpiDialog('Aprobados', content.filter(c => c.status === 'approved'))}
          />
          <PremiumStatsCard
            title="Creadores"
            value={new Set(content.map(c => c.creator_id).filter(Boolean)).size}
            icon={Users}
            color="info"
          />
          <PremiumStatsCard
            title="Clientes"
            value={new Set(content.map(c => c.client_id).filter(Boolean)).size}
            icon={UserCheck}
            color="primary"
          />
        </div>

        {/* Payment Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Payments Panel */}
          <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-card to-muted/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Pagos Pendientes</h2>
                <p className="text-sm text-muted-foreground">Resumen de pagos por procesar</p>
              </div>
              <Banknote className="h-8 w-8 text-warning" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20">
                <p className="text-sm text-muted-foreground mb-1">Por pagar a Creadores</p>
                <p className="text-3xl font-bold text-warning">
                  ${pendingCreatorPayment.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {unpaidCreatorContent.length} contenidos
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-info/10 border border-info/20">
                <p className="text-sm text-muted-foreground mb-1">Por pagar a Editores</p>
                <p className="text-3xl font-bold text-info">
                  ${pendingEditorPayment.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {unpaidEditorContent.length} contenidos
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Los pagos individuales se realizan desde las tarjetas en el Tablero
            </p>
          </div>

          {/* Financial Overview */}
          <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-card to-muted/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Resumen Financiero</h2>
                <p className="text-sm text-muted-foreground">Balance general de pagos</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Total Facturado</p>
                <p className="text-2xl font-bold text-primary">
                  ${clientsBilling.totalBilled.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20">
                <p className="text-sm text-muted-foreground mb-1">Pendiente</p>
                <p className="text-2xl font-bold text-warning">
                  ${(pendingCreatorPayment + pendingEditorPayment).toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-success/10 border border-success/20">
                <p className="text-sm text-muted-foreground mb-1">Total Pagado</p>
                <p className="text-2xl font-bold text-success">
                  ${clientsBilling.totalPaid.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-info/10 border border-info/20">
                <p className="text-sm text-muted-foreground mb-1">Contenidos Pagados</p>
                <p className="text-2xl font-bold text-info">
                  {paidContent.length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-card to-muted/10 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Resumen Financiero</h2>
              <p className="text-sm text-muted-foreground">Balance general de pagos</p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Total Facturado</p>
              <p className="text-3xl font-bold text-primary">
                ${clientsBilling.totalBilled.toLocaleString()}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-warning/10 border border-warning/20">
              <p className="text-sm text-muted-foreground mb-2">Pendiente por Pagar</p>
              <p className="text-3xl font-bold text-warning">
                ${(pendingCreatorPayment + pendingEditorPayment).toLocaleString()}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-success/10 border border-success/20">
              <p className="text-sm text-muted-foreground mb-2">Total Pagado</p>
              <p className="text-3xl font-bold text-success">
                ${clientsBilling.totalPaid.toLocaleString()}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-info/10 border border-info/20">
              <p className="text-sm text-muted-foreground mb-2">Contenidos Pagados</p>
              <p className="text-3xl font-bold text-info">
                {paidContent.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ContentDetailDialog
        content={selectedContent}
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
        onUpdate={refetch}
        onDelete={handleDeleteContent}
      />

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
