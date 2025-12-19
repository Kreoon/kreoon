import { useState, useEffect, useMemo } from "react";
import { 
  Video, Users, CheckCircle, Clock, DollarSign, TrendingUp, 
  Activity, Target, BarChart3, ArrowUpRight, ArrowDownRight,
  Play, UserCheck, Calendar, Banknote, Filter, X, Settings,
  Building2, Scissors
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useContentWithFilters } from "@/hooks/useContent";
import { Content, Client, Profile, ClientPackage } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ContentDetailDialog } from "@/components/content/ContentDetailDialog";
import { KpiContentDialog } from "@/components/dashboard/KpiContentDialog";
import { KpiListDialog } from "@/components/dashboard/KpiListDialog";
import { GoalsDialog } from "@/components/dashboard/GoalsDialog";
import { GoalsChart } from "@/components/dashboard/GoalsChart";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  subtitle,
  goalValue,
  goalLabel
}: { 
  title: string; 
  value: number; 
  icon: any; 
  trend?: number;
  color?: "primary" | "success" | "warning" | "info" | "destructive";
  onClick?: () => void;
  subtitle?: string;
  goalValue?: number;
  goalLabel?: string;
}) => {
  const colorClasses = {
    primary: "from-primary/20 to-primary/5 border-primary/30 text-primary",
    success: "from-success/20 to-success/5 border-success/30 text-success",
    warning: "from-warning/20 to-warning/5 border-warning/30 text-warning",
    info: "from-info/20 to-info/5 border-info/30 text-info",
    destructive: "from-destructive/20 to-destructive/5 border-destructive/30 text-destructive",
  };

  const progressPercent = goalValue && goalValue > 0 ? Math.min((value / goalValue) * 100, 100) : 0;

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
      <div className={cn(
        "absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20",
        "bg-current blur-3xl transition-all duration-700 group-hover:scale-150"
      )} />
      
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
        {goalValue && goalValue > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{goalLabel || 'Meta'}</span>
              <span className="text-muted-foreground">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
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
  onClick,
  goalValue,
  goalLabel
}: { 
  title: string; 
  value: number; 
  prefix?: string;
  suffix?: string;
  icon: any; 
  trend?: number;
  description?: string;
  onClick?: () => void;
  goalValue?: number;
  goalLabel?: string;
}) => {
  const progressPercent = goalValue && goalValue > 0 ? Math.min((value / goalValue) * 100, 100) : 0;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/50 p-8",
        "bg-gradient-to-br from-card via-card to-muted/20 backdrop-blur-xl",
        "transition-all duration-500 hover:shadow-[0_0_60px_-10px] hover:shadow-primary/20",
        onClick && "cursor-pointer"
      )}
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl transition-transform duration-700 group-hover:scale-125" />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
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

          {goalValue && goalValue > 0 && (
            <div className="mt-4 space-y-1 max-w-xs">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{goalLabel || 'Meta'}: {prefix}{goalValue.toLocaleString()}</span>
                <span className={cn(
                  "font-medium",
                  progressPercent >= 100 ? "text-success" : progressPercent >= 75 ? "text-warning" : "text-muted-foreground"
                )}>
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
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
};

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  // Filters state
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [filterCreatorId, setFilterCreatorId] = useState<string>('all');
  const [filterEditorId, setFilterEditorId] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);
  
  // Filter options
  const [clients, setClients] = useState<{id: string; name: string}[]>([]);
  const [creators, setCreators] = useState<{id: string; name: string}[]>([]);
  const [editors, setEditors] = useState<{id: string; name: string}[]>([]);
  
  const { content: allContent, loading, refetch, deleteContent } = useContentWithFilters({
    userId: user?.id,
    role: 'admin',
    clientId: filterClientId !== 'all' ? filterClientId : undefined,
    creatorId: filterCreatorId !== 'all' ? filterCreatorId : undefined,
    editorId: filterEditorId !== 'all' ? filterEditorId : undefined
  });

  // Filter content by date range
  const content = useMemo(() => {
    return allContent.filter(c => {
      if (startDateFilter) {
        const contentDate = c.created_at ? new Date(c.created_at) : null;
        if (!contentDate || contentDate < startDateFilter) return false;
      }
      if (endDateFilter) {
        const contentDate = c.created_at ? new Date(c.created_at) : null;
        if (!contentDate || contentDate > endDateFilter) return false;
      }
      return true;
    });
  }, [allContent, startDateFilter, endDateFilter]);

  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean;
    title: string;
    content: Content[];
  }>({ open: false, title: '', content: [] });

  const [listDialog, setListDialog] = useState<{
    open: boolean;
    title: string;
    type: 'clients' | 'creators' | 'editors' | 'packages-sold' | 'packages-paid' | 'packages-pending';
    clients: Client[];
    profiles: (Profile & { content_count?: number; total_payment?: number })[];
    packages: (ClientPackage & { client?: Client })[];
  }>({
    open: false,
    title: '',
    type: 'clients',
    clients: [],
    profiles: [],
    packages: []
  });

  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<{
    revenue_goal: number;
    content_goal: number;
    new_clients_goal: number;
  } | null>(null);

  // All goals for chart
  const [allGoals, setAllGoals] = useState<any[]>([]);
  const [monthlyActuals, setMonthlyActuals] = useState<any[]>([]);

  // Billing data from packages
  const [packages, setPackages] = useState<(ClientPackage & { client?: Client })[]>([]);
  const [clientsBilling, setClientsBilling] = useState<{
    totalBilled: number;
    totalPending: number;
    totalPaid: number;
    contentOwed: number;
  }>({ totalBilled: 0, totalPending: 0, totalPaid: 0, contentOwed: 0 });

  // Active clients, creators, editors lists
  const [activeClients, setActiveClients] = useState<Client[]>([]);
  const [activeCreators, setActiveCreators] = useState<(Profile & { content_count?: number; total_payment?: number })[]>([]);
  const [activeEditors, setActiveEditors] = useState<(Profile & { content_count?: number; total_payment?: number })[]>([]);

  // Load filters and data
  useEffect(() => {
    const fetchFiltersAndData = async () => {
      // Fetch filter options
      const { data: creatorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'creator');
      
      if (creatorRoles?.length) {
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorRoles.map(r => r.user_id));
        setCreators(creatorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      }

      const { data: editorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'editor');
      
      if (editorRoles?.length) {
        const { data: editorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', editorRoles.map(r => r.user_id));
        setEditors(editorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      }

      const { data: clientsList } = await supabase
        .from('clients')
        .select('*');
      setClients(clientsList?.map(c => ({ id: c.id, name: c.name })) || []);
      setActiveClients(clientsList as Client[] || []);

      // Fetch packages with client info
      const { data: packagesData } = await supabase
        .from('client_packages')
        .select('*, clients(*)')
        .eq('is_active', true);

      if (packagesData) {
        const mappedPackages = packagesData.map(p => ({
          ...p,
          client: p.clients as Client
        })) as (ClientPackage & { client?: Client })[];
        setPackages(mappedPackages);

        // Calculate billing - CORRECTED LOGIC (only packages with values > 0)
        const packagesWithValues = packagesData.filter(p => (p.total_value || 0) > 0);
        const totalBilled = packagesWithValues.reduce((sum, p) => sum + (p.total_value || 0), 0);
        const totalPaid = packagesWithValues.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
        const totalPending = totalBilled - totalPaid;
        
        // Content owed = total content promised in all active packages - delivered/approved content
        const totalContentPromised = packagesData.reduce((sum, p) => sum + (p.content_quantity || 0), 0);
        const deliveredContent = allContent.filter(c => ['approved', 'delivered'].includes(c.status)).length;
        const contentOwed = Math.max(0, totalContentPromised - deliveredContent);

        setClientsBilling({ totalBilled, totalPending, totalPaid, contentOwed });
      }

      // Fetch current month/quarter goal
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('period_type', 'month')
        .eq('period_value', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (goalData) {
        setCurrentGoal({
          revenue_goal: goalData.revenue_goal || 0,
          content_goal: goalData.content_goal || 0,
          new_clients_goal: goalData.new_clients_goal || 0
        });
      }

      // Fetch all goals for chart
      const { data: allGoalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('year', currentYear)
        .eq('period_type', 'month');
      
      setAllGoals(allGoalsData || []);

      // Calculate monthly actuals
      const monthlyData = [];
      for (let month = 1; month <= 12; month++) {
        const monthStart = new Date(currentYear, month - 1, 1);
        const monthEnd = endOfMonth(monthStart);
        
        // Revenue from packages paid in this month
        const monthRevenue = packagesData?.filter(p => {
          const paidDate = p.paid_at ? new Date(p.paid_at) : null;
          return paidDate && paidDate >= monthStart && paidDate <= monthEnd;
        }).reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0;

        // Content completed in this month
        const monthContent = allContent.filter(c => {
          const approvedDate = c.approved_at ? new Date(c.approved_at) : null;
          return approvedDate && approvedDate >= monthStart && approvedDate <= monthEnd;
        }).length;

        // Clients created in this month
        const monthClients = clientsList?.filter(c => {
          const createdDate = c.created_at ? new Date(c.created_at) : null;
          return createdDate && createdDate >= monthStart && createdDate <= monthEnd;
        }).length || 0;

        monthlyData.push({
          month,
          year: currentYear,
          revenue: monthRevenue,
          content: monthContent,
          clients: monthClients
        });
      }
      setMonthlyActuals(monthlyData);
    };

    fetchFiltersAndData();
  }, [allContent]);

  // Calculate active creators and editors with their stats
  useEffect(() => {
    const calculateActiveUsers = async () => {
      // Get unique creator IDs from content
      const creatorIds = [...new Set(content.map(c => c.creator_id).filter(Boolean))] as string[];
      const editorIds = [...new Set(content.map(c => c.editor_id).filter(Boolean))] as string[];

      if (creatorIds.length > 0) {
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', creatorIds);

        const creatorsWithStats = creatorProfiles?.map(p => {
          const creatorContent = content.filter(c => c.creator_id === p.id);
          return {
            ...p,
            content_count: creatorContent.length,
            total_payment: creatorContent.reduce((sum, c) => sum + (c.creator_payment || 0), 0)
          };
        }) || [];

        setActiveCreators(creatorsWithStats);
      }

      if (editorIds.length > 0) {
        const { data: editorProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', editorIds);

        const editorsWithStats = editorProfiles?.map(p => {
          const editorContent = content.filter(c => c.editor_id === p.id);
          return {
            ...p,
            content_count: editorContent.length,
            total_payment: editorContent.reduce((sum, c) => sum + (c.editor_payment || 0), 0)
          };
        }) || [];

        setActiveEditors(editorsWithStats);
      }
    };

    calculateActiveUsers();
  }, [content]);

  // Stats calculations
  const totalContent = content.length;
  const activeContent = content.filter(c => !['approved', 'paid', 'delivered'].includes(c.status)).length;
  const inProgress = content.filter(c => ['recording', 'editing'].includes(c.status)).length;
  const completed = content.filter(c => c.status === 'approved').length;
  const pending = content.filter(c => ['draft', 'script_approved', 'assigned'].includes(c.status)).length;
  
  // Payment stats - CORRECTED LOGIC
  // Unpaid creator content: approved content where creator hasn't been paid AND has a payment value assigned
  const unpaidCreatorContent = content.filter(c => c.status === 'approved' && !c.creator_paid && (c.creator_payment || 0) > 0);
  // Unpaid editor content: approved content where editor hasn't been paid AND has a payment value assigned
  const unpaidEditorContent = content.filter(c => c.status === 'approved' && !c.editor_paid && (c.editor_payment || 0) > 0);
  
  // Calculate pending amounts to pay team (only for content with assigned values)
  const pendingCreatorPayment = unpaidCreatorContent.reduce((sum, c) => sum + (c.creator_payment || 0), 0);
  const pendingEditorPayment = unpaidEditorContent.reduce((sum, c) => sum + (c.editor_payment || 0), 0);

  const openKpiDialog = (title: string, contentList: Content[]) => {
    setKpiDialog({ open: true, title, content: contentList });
  };

  const openListDialog = (
    title: string, 
    type: 'clients' | 'creators' | 'editors' | 'packages-sold' | 'packages-paid' | 'packages-pending',
    data?: { clients?: Client[]; profiles?: (Profile & { content_count?: number; total_payment?: number })[]; packages?: (ClientPackage & { client?: Client })[] }
  ) => {
    setListDialog({
      open: true,
      title,
      type,
      clients: data?.clients || [],
      profiles: data?.profiles || [],
      packages: data?.packages || []
    });
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

  const clearFilters = () => {
    setFilterClientId('all');
    setFilterCreatorId('all');
    setFilterEditorId('all');
    setStartDateFilter(undefined);
    setEndDateFilter(undefined);
  };

  const hasActiveFilters = filterClientId !== 'all' || filterCreatorId !== 'all' || filterEditorId !== 'all' || startDateFilter || endDateFilter;

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
        <div className="flex h-16 items-center justify-between px-6 lg:px-8">
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
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setGoalsDialogOpen(true)}>
                <Target className="h-4 w-4 mr-2" />
                Metas
              </Button>
            )}
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 border border-success/20">
              <Activity className="h-4 w-4 text-success animate-pulse" />
              <span className="text-sm font-medium text-success">En vivo</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 md:gap-3 px-6 pb-4 overflow-x-auto">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[130px] justify-start text-left font-normal text-xs",
                    !startDateFilter && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-1 h-3 w-3" />
                  {startDateFilter ? format(startDateFilter, "dd/MM/yy", { locale: es }) : "Desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDateFilter}
                  onSelect={setStartDateFilter}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[130px] justify-start text-left font-normal text-xs",
                    !endDateFilter && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-1 h-3 w-3" />
                  {endDateFilter ? format(endDateFilter, "dd/MM/yy", { locale: es }) : "Hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDateFilter}
                  onSelect={setEndDateFilter}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Select value={filterClientId} onValueChange={setFilterClientId}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCreatorId} onValueChange={setFilterCreatorId}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Creador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los creadores</SelectItem>
                {creators.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterEditorId} onValueChange={setFilterEditorId}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Editor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los editores</SelectItem>
                {editors.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="p-6 lg:p-8 space-y-8">
        {/* Main KPIs Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LargeKpiCard
            title="Total Contenidos"
            value={totalContent}
            icon={Video}
            description="Contenidos gestionados en la plataforma"
            onClick={() => openKpiDialog('Todos los Contenidos', content)}
            goalValue={currentGoal?.content_goal}
            goalLabel="Meta del mes"
          />
          <LargeKpiCard
            title="Ingresos Totales"
            value={clientsBilling.totalBilled}
            prefix="$"
            icon={DollarSign}
            description="Facturación total de paquetes vendidos"
            onClick={() => openListDialog('Paquetes Vendidos', 'packages-sold', { packages })}
            goalValue={currentGoal?.revenue_goal}
            goalLabel="Meta del mes"
          />
          <LargeKpiCard
            title="Tasa de Completados"
            value={totalContent > 0 ? Math.round((completed / totalContent) * 100) : 0}
            suffix="%"
            icon={Target}
            description="Porcentaje de contenidos aprobados"
            onClick={() => openKpiDialog('Contenidos Aprobados', content.filter(c => c.status === 'approved'))}
          />
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <PremiumStatsCard
            title="Activos"
            value={activeContent}
            icon={Play}
            color="info"
            onClick={() => openKpiDialog('Contenido Activo', content.filter(c => !['approved', 'paid', 'delivered'].includes(c.status)))}
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
            value={activeCreators.length}
            icon={Users}
            color="info"
            onClick={() => openListDialog('Creadores Activos', 'creators', { profiles: activeCreators })}
          />
          <PremiumStatsCard
            title="Clientes"
            value={activeClients.length}
            icon={Building2}
            color="primary"
            onClick={() => openListDialog('Clientes Activos', 'clients', { clients: activeClients })}
            goalValue={currentGoal?.new_clients_goal}
            goalLabel="Meta nuevos"
          />
        </div>

        {/* Payment Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Payments Panel */}
          <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-card to-muted/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Pagos al Equipo</h2>
                <p className="text-sm text-muted-foreground">Pagos pendientes a creadores y editores</p>
              </div>
              <Banknote className="h-8 w-8 text-warning" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div 
                className="p-4 rounded-2xl bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/20 transition-colors"
                onClick={() => openKpiDialog('Por Pagar a Creadores', unpaidCreatorContent)}
              >
                <p className="text-sm text-muted-foreground mb-1">Por pagar a Creadores</p>
                <p className="text-3xl font-bold text-warning">
                  ${pendingCreatorPayment.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {unpaidCreatorContent.length} contenidos
                </p>
              </div>
              <div 
                className="p-4 rounded-2xl bg-info/10 border border-info/20 cursor-pointer hover:bg-info/20 transition-colors"
                onClick={() => openKpiDialog('Por Pagar a Editores', unpaidEditorContent)}
              >
                <p className="text-sm text-muted-foreground mb-1">Por pagar a Editores</p>
                <p className="text-3xl font-bold text-info">
                  ${pendingEditorPayment.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {unpaidEditorContent.length} contenidos
                </p>
              </div>
            </div>

            <div 
              className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors"
              onClick={() => openKpiDialog('Total Por Pagar Equipo', [...unpaidCreatorContent, ...unpaidEditorContent])}
            >
              <p className="text-sm text-muted-foreground mb-1">Total por pagar al equipo</p>
              <p className="text-3xl font-bold text-destructive">
                ${(pendingCreatorPayment + pendingEditorPayment).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Financial Overview - Client Billing */}
          <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-card to-muted/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Facturación Clientes</h2>
                <p className="text-sm text-muted-foreground">Balance de paquetes vendidos</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-2xl bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => openListDialog('Total Ventas - Paquetes', 'packages-sold', { packages })}
              >
                <p className="text-sm text-muted-foreground mb-1">Total Ventas</p>
                <p className="text-2xl font-bold text-primary">
                  ${clientsBilling.totalBilled.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{packages.length} paquetes</p>
              </div>
              <div 
                className="p-4 rounded-2xl bg-success/10 border border-success/20 cursor-pointer hover:bg-success/20 transition-colors"
                onClick={() => openListDialog('Recaudado', 'packages-paid', { packages: packages.filter(p => p.paid_amount > 0) })}
              >
                <p className="text-sm text-muted-foreground mb-1">Recaudado</p>
                <p className="text-2xl font-bold text-success">
                  ${clientsBilling.totalPaid.toLocaleString()}
                </p>
              </div>
              <div 
                className="p-4 rounded-2xl bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/20 transition-colors"
                onClick={() => openListDialog('Por Cobrar', 'packages-pending', { packages: packages.filter(p => (p.total_value - p.paid_amount) > 0) })}
              >
                <p className="text-sm text-muted-foreground mb-1">Por Cobrar</p>
                <p className="text-2xl font-bold text-warning">
                  ${clientsBilling.totalPending.toLocaleString()}
                </p>
              </div>
              <div 
                className="p-4 rounded-2xl bg-info/10 border border-info/20 cursor-pointer hover:bg-info/20 transition-colors"
                onClick={() => openKpiDialog('Videos Adeudados', content.filter(c => ['approved', 'delivered'].includes(c.status)))}
              >
                <p className="text-sm text-muted-foreground mb-1">Videos Adeudados</p>
                <p className="text-2xl font-bold text-info">
                  {clientsBilling.contentOwed}
                </p>
                <p className="text-xs text-muted-foreground mt-1">por entregar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Editors KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PremiumStatsCard
            title="Editores Activos"
            value={activeEditors.length}
            icon={Scissors}
            color="info"
            onClick={() => openListDialog('Editores Activos', 'editors', { profiles: activeEditors })}
          />
          <PremiumStatsCard
            title="Videos en Edición"
            value={content.filter(c => c.status === 'editing').length}
            icon={Clock}
            color="warning"
            onClick={() => openKpiDialog('Videos en Edición', content.filter(c => c.status === 'editing'))}
          />
          <PremiumStatsCard
            title="Videos Entregados"
            value={content.filter(c => c.status === 'delivered').length}
            icon={CheckCircle}
            color="success"
            onClick={() => openKpiDialog('Videos Entregados', content.filter(c => c.status === 'delivered'))}
          />
        </div>

        {/* Goals vs Actuals Chart */}
        {isAdmin && allGoals.length > 0 && (
          <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-card to-muted/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Metas vs Resultados</h2>
                <p className="text-sm text-muted-foreground">Comparativa mensual {new Date().getFullYear()}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
            
            <Tabs defaultValue="revenue" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="revenue">Ingresos</TabsTrigger>
                <TabsTrigger value="content">Contenidos</TabsTrigger>
                <TabsTrigger value="clients">Clientes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="revenue">
                <GoalsChart 
                  goals={allGoals} 
                  actuals={monthlyActuals} 
                  metric="revenue" 
                  title="Ingresos Mensuales" 
                />
              </TabsContent>
              
              <TabsContent value="content">
                <GoalsChart 
                  goals={allGoals} 
                  actuals={monthlyActuals} 
                  metric="content" 
                  title="Contenidos Aprobados" 
                />
              </TabsContent>
              
              <TabsContent value="clients">
                <GoalsChart 
                  goals={allGoals} 
                  actuals={monthlyActuals} 
                  metric="clients" 
                  title="Nuevos Clientes" 
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
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

      <KpiListDialog
        title={listDialog.title}
        type={listDialog.type}
        clients={listDialog.clients}
        profiles={listDialog.profiles}
        packages={listDialog.packages}
        open={listDialog.open}
        onOpenChange={(open) => setListDialog(prev => ({ ...prev, open }))}
      />

      <GoalsDialog
        open={goalsDialogOpen}
        onOpenChange={setGoalsDialogOpen}
        onSave={() => {
          refetch();
          // Refetch goal
          const fetchGoal = async () => {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const { data } = await supabase
              .from('goals')
              .select('*')
              .eq('period_type', 'month')
              .eq('period_value', currentMonth)
              .eq('year', currentYear)
              .maybeSingle();
            if (data) {
              setCurrentGoal({
                revenue_goal: data.revenue_goal || 0,
                content_goal: data.content_goal || 0,
                new_clients_goal: data.new_clients_goal || 0
              });
            }
          };
          fetchGoal();
        }}
      />
    </div>
  );
}