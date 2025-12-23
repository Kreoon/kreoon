import { useState, useEffect, useMemo } from "react";
import { 
  Video, Users, CheckCircle, Clock, DollarSign, TrendingUp, 
  Activity, Target, BarChart3, ArrowUpRight, ArrowDownRight,
  Play, UserCheck, Calendar, Banknote, Filter, X, Settings,
  Building2, Scissors, Zap, Trophy, Crown
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { MedievalBanner } from "@/components/layout/MedievalBanner";
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
import { AmbassadorBadge } from "@/components/ui/ambassador-badge";
import { ReferralStats } from "@/components/dashboard/ReferralStats";
import { CurrencyDisplay, CurrencyBadge, formatCurrency, type CurrencyType } from "@/components/ui/currency-input";
import { useCurrency } from "@/hooks/useCurrency";
import { Leaderboard } from "@/components/points/Leaderboard";
import { useLeaderboard } from "@/hooks/useUserPoints";
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
  const { user, isAdmin, profile, isAmbassador } = useAuth();
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

  // Billing data from packages - now separated by currency
  const [packages, setPackages] = useState<(ClientPackage & { client?: Client })[]>([]);
  const [clientsBilling, setClientsBilling] = useState<{
    totalBilled: number;
    totalPending: number;
    totalPaid: number;
    contentOwed: number;
    totalBilledUSD: number;
    totalPendingUSD: number;
    totalPaidUSD: number;
    totalBilledCOP: number;
    totalPendingCOP: number;
    totalPaidCOP: number;
  }>({ 
    totalBilled: 0, totalPending: 0, totalPaid: 0, contentOwed: 0,
    totalBilledUSD: 0, totalPendingUSD: 0, totalPaidUSD: 0,
    totalBilledCOP: 0, totalPendingCOP: 0, totalPaidCOP: 0
  });

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

        // Calculate billing - separated by currency
        const packagesWithValues = packagesData.filter(p => (p.total_value || 0) > 0);
        
        // COP packages
        const copPackages = packagesWithValues.filter(p => (p as any).currency === 'COP' || !(p as any).currency);
        const totalBilledCOP = copPackages.reduce((sum, p) => sum + (p.total_value || 0), 0);
        const totalPaidCOP = copPackages.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
        const totalPendingCOP = totalBilledCOP - totalPaidCOP;
        
        // USD packages
        const usdPackages = packagesWithValues.filter(p => (p as any).currency === 'USD');
        const totalBilledUSD = usdPackages.reduce((sum, p) => sum + (p.total_value || 0), 0);
        const totalPaidUSD = usdPackages.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
        const totalPendingUSD = totalBilledUSD - totalPaidUSD;

        // Total for backward compatibility (keep as COP equivalent for now)
        const totalBilled = totalBilledCOP + totalBilledUSD;
        const totalPaid = totalPaidCOP + totalPaidUSD;
        const totalPending = totalBilled - totalPaid;
        
        // Content owed = total content promised in all active packages - delivered/approved content
        const totalContentPromised = packagesData.reduce((sum, p) => sum + (p.content_quantity || 0), 0);
        const deliveredContent = allContent.filter(c => ['approved', 'delivered'].includes(c.status)).length;
        const contentOwed = Math.max(0, totalContentPromised - deliveredContent);

        setClientsBilling({ 
          totalBilled, totalPending, totalPaid, contentOwed,
          totalBilledUSD, totalPendingUSD, totalPaidUSD,
          totalBilledCOP, totalPendingCOP, totalPaidCOP
        });
      }

      // Determine which year(s) to query based on date filters or current/next year
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const filterYear = startDateFilter ? startDateFilter.getFullYear() : 
                         endDateFilter ? endDateFilter.getFullYear() : 
                         currentYear;
      
      // Fetch current month/quarter goal - check both current year and filter year
      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('period_type', 'month')
        .eq('period_value', currentMonth)
        .in('year', [currentYear, currentYear + 1, filterYear])
        .order('year', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalData) {
        setCurrentGoal({
          revenue_goal: goalData.revenue_goal || 0,
          content_goal: goalData.content_goal || 0,
          new_clients_goal: goalData.new_clients_goal || 0
        });
      }

      // Fetch all goals for chart - include current year, next year, and filter year
      const yearsToFetch = [...new Set([currentYear, currentYear + 1, filterYear])];
      const { data: allGoalsData } = await supabase
        .from('goals')
        .select('*')
        .in('year', yearsToFetch)
        .eq('period_type', 'month');
      
      setAllGoals(allGoalsData || []);

      // Calculate monthly actuals for each year that has goals
      const monthlyData: any[] = [];
      const yearsWithGoals = [...new Set((allGoalsData || []).map(g => g.year))];
      
      for (const year of yearsWithGoals) {
        for (let month = 1; month <= 12; month++) {
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = endOfMonth(monthStart);
          
          // Revenue from packages paid in this month - separated by currency
          const monthPackages = packagesData?.filter(p => {
            const paidDate = p.paid_at ? new Date(p.paid_at) : null;
            return paidDate && paidDate >= monthStart && paidDate <= monthEnd;
          }) || [];
          
          const monthRevenueCOP = monthPackages
            .filter(p => (p as any).currency !== 'USD')
            .reduce((sum, p) => sum + (p.paid_amount || 0), 0);
          
          const monthRevenueUSD = monthPackages
            .filter(p => (p as any).currency === 'USD')
            .reduce((sum, p) => sum + (p.paid_amount || 0), 0);

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
            year,
            revenue: monthRevenueCOP + monthRevenueUSD,
            revenueCOP: monthRevenueCOP,
            revenueUSD: monthRevenueUSD,
            content: monthContent,
            clients: monthClients
          });
        }
      }
      
      // Also add current year if no goals exist yet
      if (yearsWithGoals.length === 0) {
        for (let month = 1; month <= 12; month++) {
          monthlyData.push({
            month,
            year: currentYear,
            revenue: 0,
            revenueCOP: 0,
            revenueUSD: 0,
            content: 0,
            clients: 0
          });
        }
      }
      
      setMonthlyActuals(monthlyData);
    };

    fetchFiltersAndData();
  }, [allContent, startDateFilter, endDateFilter]);

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
  
  // Payment stats - CORRECTED LOGIC - now separated by currency
  // Unpaid creator content: approved content where creator hasn't been paid AND has a payment value assigned
  const unpaidCreatorContent = content.filter(c => c.status === 'approved' && !c.creator_paid && (c.creator_payment || 0) > 0);
  // Unpaid editor content: approved content where editor hasn't been paid AND has a payment value assigned
  const unpaidEditorContent = content.filter(c => c.status === 'approved' && !c.editor_paid && (c.editor_payment || 0) > 0);
  
  // Calculate pending amounts to pay team - separated by currency
  const pendingCreatorPaymentCOP = unpaidCreatorContent
    .filter(c => (c as any).creator_payment_currency !== 'USD')
    .reduce((sum, c) => sum + (c.creator_payment || 0), 0);
  const pendingCreatorPaymentUSD = unpaidCreatorContent
    .filter(c => (c as any).creator_payment_currency === 'USD')
    .reduce((sum, c) => sum + (c.creator_payment || 0), 0);
  const pendingEditorPaymentCOP = unpaidEditorContent
    .filter(c => (c as any).editor_payment_currency !== 'USD')
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);
  const pendingEditorPaymentUSD = unpaidEditorContent
    .filter(c => (c as any).editor_payment_currency === 'USD')
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);
  
  // Total for backwards compat
  const pendingCreatorPayment = pendingCreatorPaymentCOP + pendingCreatorPaymentUSD;
  const pendingEditorPayment = pendingEditorPaymentCOP + pendingEditorPaymentUSD;

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
      {/* Medieval Banner Header */}
      <div className="p-4 md:p-6">
        <MedievalBanner
          icon={Crown}
          title="Sala del Trono"
          subtitle="Centro de comando del reino"
          action={
            <div className="flex items-center gap-2">
              {(isAmbassador || profile?.is_ambassador) && (
                <AmbassadorBadge size="sm" variant="glow" />
              )}
              {isAdmin && (
                <Button variant="medieval" size="sm" onClick={() => setGoalsDialogOpen(true)} className="h-8 px-2 md:px-3">
                  <Target className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Metas</span>
                </Button>
              )}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-success/10 border border-success/20">
                <Activity className="h-3 w-3 text-success animate-pulse" />
                <span className="text-xs font-medium text-success">En vivo</span>
              </div>
            </div>
          }
        />
      </div>

      {/* Filters section */}
      <div className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">

        {/* Filters - Mobile optimized */}
        {isAdmin && (
          <div className="px-4 md:px-6 pb-3">
            {/* Mobile: Collapsible filter button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:hidden justify-between h-9"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">
                      {hasActiveFilters ? 'Filtros activos' : 'Filtrar resultados'}
                    </span>
                  </div>
                  {hasActiveFilters && (
                    <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                      {[filterClientId !== 'all', filterCreatorId !== 'all', filterEditorId !== 'all', startDateFilter, endDateFilter].filter(Boolean).length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] p-4" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Filtros</span>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                        <X className="h-3 w-3 mr-1" />
                        Limpiar
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal text-xs h-9",
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
                            "w-full justify-start text-left font-normal text-xs h-9",
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
                  </div>

                  <Select value={filterClientId} onValueChange={setFilterClientId}>
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los clientes</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-2">
                    <Select value={filterCreatorId} onValueChange={setFilterCreatorId}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue placeholder="Creador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {creators.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterEditorId} onValueChange={setFilterEditorId}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue placeholder="Editor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {editors.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Desktop: Inline filters */}
            <div className="hidden md:flex flex-wrap items-center gap-2 md:gap-3">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[120px] justify-start text-left font-normal text-xs h-8",
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
                      "w-[120px] justify-start text-left font-normal text-xs h-8",
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
                <SelectTrigger className="w-[130px] h-8 text-xs">
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
                <SelectTrigger className="w-[130px] h-8 text-xs">
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
                <SelectTrigger className="w-[130px] h-8 text-xs">
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
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-8">
                  <X className="h-3 w-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 lg:px-6 space-y-3">
        {/* Row 1: Main KPIs - Compact */}
        <div data-tour="stats-section" className="grid grid-cols-3 gap-3">
          {/* Total Contenidos - Compact */}
          <div 
            onClick={() => openKpiDialog('Todos los Contenidos', content)}
            className="group relative overflow-hidden rounded-xl border border-border/50 p-3 bg-gradient-to-br from-card to-muted/10 cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Video className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Contenidos</span>
            </div>
            <p className="text-2xl font-bold"><AnimatedNumber value={totalContent} /></p>
            {currentGoal?.content_goal && currentGoal.content_goal > 0 && (
              <div className="mt-1">
                <Progress value={Math.min((totalContent / currentGoal.content_goal) * 100, 100)} className="h-1" />
                <span className="text-[10px] text-muted-foreground">Meta: {currentGoal.content_goal}</span>
              </div>
            )}
          </div>

          {/* Ingresos COP */}
          <div 
            onClick={() => openListDialog('Paquetes Vendidos (COP)', 'packages-sold', { packages: packages.filter(p => (p as any).currency === 'COP' || !(p as any).currency) })}
            className="group relative overflow-hidden rounded-xl border border-yellow-500/30 p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <span>🇨🇴</span>
              <span className="text-xs text-muted-foreground">Ingresos COP</span>
            </div>
            <p className="text-xl font-bold"><CurrencyDisplay value={clientsBilling.totalBilledCOP} currency="COP" size="sm" /></p>
            {currentGoal?.revenue_goal && currentGoal.revenue_goal > 0 && (
              <div className="mt-1">
                <Progress value={Math.min((clientsBilling.totalBilledCOP / currentGoal.revenue_goal) * 100, 100)} className="h-1" />
                <span className="text-[10px] text-muted-foreground">{Math.round((clientsBilling.totalBilledCOP / currentGoal.revenue_goal) * 100)}%</span>
              </div>
            )}
          </div>

          {/* Ingresos USD */}
          <div 
            onClick={() => openListDialog('Paquetes Vendidos (USD)', 'packages-sold', { packages: packages.filter(p => (p as any).currency === 'USD') })}
            className="group relative overflow-hidden rounded-xl border border-green-500/30 p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <span>🇺🇸</span>
              <span className="text-xs text-muted-foreground">Ingresos USD</span>
            </div>
            <p className="text-xl font-bold"><CurrencyDisplay value={clientsBilling.totalBilledUSD} currency="USD" size="sm" /></p>
            <div className="mt-1">
              <span className="text-[10px] text-muted-foreground">Completados: {Math.round((completed / totalContent) * 100) || 0}%</span>
            </div>
          </div>
        </div>

        {/* Row 2: Team KPIs - Creadores, Editores, Clientes */}
        <div className="grid grid-cols-3 gap-2">
          <div onClick={() => openListDialog('Creadores Activos', 'creators', { profiles: activeCreators })}
            className="p-2 rounded-lg bg-info/10 border border-info/20 cursor-pointer hover:bg-info/20 transition-colors text-center">
            <Users className="h-3 w-3 mx-auto text-info mb-0.5" />
            <p className="text-lg font-bold text-info">{activeCreators.length}</p>
            <p className="text-[10px] text-muted-foreground">Creadores</p>
          </div>
          <div onClick={() => openListDialog('Editores Activos', 'editors', { profiles: activeEditors })}
            className="p-2 rounded-lg bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/20 transition-colors text-center">
            <Scissors className="h-3 w-3 mx-auto text-warning mb-0.5" />
            <p className="text-lg font-bold text-warning">{activeEditors.length}</p>
            <p className="text-[10px] text-muted-foreground">Editores</p>
          </div>
          <div onClick={() => openListDialog('Clientes Activos', 'clients', { clients: activeClients })}
            className="p-2 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors text-center">
            <Building2 className="h-3 w-3 mx-auto text-primary mb-0.5" />
            <p className="text-lg font-bold text-primary">{activeClients.length}</p>
            <p className="text-[10px] text-muted-foreground">Clientes</p>
          </div>
        </div>

        {/* Row 3: Status KPIs - In order: Pendientes → Grabación → Edición → Entregados → Novedad → Corregidos → Aprobados */}
        <div className="grid grid-cols-7 gap-2">
          <div onClick={() => openKpiDialog('Pendientes', content.filter(c => ['draft', 'script_approved', 'assigned'].includes(c.status)))}
            className="p-2 rounded-lg bg-muted/50 border border-border cursor-pointer hover:bg-muted transition-colors text-center">
            <Calendar className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
            <p className="text-lg font-bold">{pending}</p>
            <p className="text-[10px] text-muted-foreground">Pendientes</p>
          </div>
          <div onClick={() => openKpiDialog('En Grabación', content.filter(c => c.status === 'recording'))}
            className="p-2 rounded-lg bg-info/10 border border-info/20 cursor-pointer hover:bg-info/20 transition-colors text-center">
            <Video className="h-3 w-3 mx-auto text-info mb-0.5" />
            <p className="text-lg font-bold text-info">{content.filter(c => c.status === 'recording').length}</p>
            <p className="text-[10px] text-muted-foreground">Grabación</p>
          </div>
          <div onClick={() => openKpiDialog('En Edición', content.filter(c => c.status === 'editing'))}
            className="p-2 rounded-lg bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/20 transition-colors text-center">
            <Scissors className="h-3 w-3 mx-auto text-warning mb-0.5" />
            <p className="text-lg font-bold text-warning">{content.filter(c => c.status === 'editing').length}</p>
            <p className="text-[10px] text-muted-foreground">Edición</p>
          </div>
          <div onClick={() => openKpiDialog('Entregados', content.filter(c => c.status === 'delivered'))}
            className="p-2 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors text-center">
            <Play className="h-3 w-3 mx-auto text-primary mb-0.5" />
            <p className="text-lg font-bold text-primary">{content.filter(c => c.status === 'delivered').length}</p>
            <p className="text-[10px] text-muted-foreground">Entregados</p>
          </div>
          <div onClick={() => openKpiDialog('Con Novedad', content.filter(c => c.status === 'issue'))}
            className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors text-center">
            <Activity className="h-3 w-3 mx-auto text-destructive mb-0.5" />
            <p className="text-lg font-bold text-destructive">{content.filter(c => c.status === 'issue').length}</p>
            <p className="text-[10px] text-muted-foreground">Novedad</p>
          </div>
          <div onClick={() => openKpiDialog('Corregidos', content.filter(c => c.status === 'corrected'))}
            className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors text-center">
            <TrendingUp className="h-3 w-3 mx-auto text-amber-500 mb-0.5" />
            <p className="text-lg font-bold text-amber-500">{content.filter(c => c.status === 'corrected').length}</p>
            <p className="text-[10px] text-muted-foreground">Corregidos</p>
          </div>
          <div onClick={() => openKpiDialog('Aprobados', content.filter(c => c.status === 'approved'))}
            className="p-2 rounded-lg bg-success/10 border border-success/20 cursor-pointer hover:bg-success/20 transition-colors text-center">
            <CheckCircle className="h-3 w-3 mx-auto text-success mb-0.5" />
            <p className="text-lg font-bold text-success">{completed}</p>
            <p className="text-[10px] text-muted-foreground">Aprobados</p>
          </div>
        </div>

        {/* Row 3: Payments & Billing - Side by Side Compact */}
        <div className="grid grid-cols-2 gap-3">
          {/* Pagos al Equipo */}
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Pagos Equipo</h3>
              <Banknote className="h-4 w-4 text-warning" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* COP */}
              <div className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">🇨🇴</span>
                  <span className="text-[10px] text-muted-foreground">COP</span>
                </div>
                <div className="space-y-1">
                  <div onClick={() => openKpiDialog('Por Pagar a Creadores (COP)', unpaidCreatorContent.filter(c => (c as any).creator_payment_currency !== 'USD'))}
                    className="flex justify-between items-center cursor-pointer hover:bg-warning/10 rounded px-1 -mx-1">
                    <span className="text-[10px] text-muted-foreground">Creadores</span>
                    <span className="text-xs font-bold text-warning"><CurrencyDisplay value={pendingCreatorPaymentCOP} currency="COP" size="sm" /></span>
                  </div>
                  <div onClick={() => openKpiDialog('Por Pagar a Editores (COP)', unpaidEditorContent.filter(c => (c as any).editor_payment_currency !== 'USD'))}
                    className="flex justify-between items-center cursor-pointer hover:bg-info/10 rounded px-1 -mx-1">
                    <span className="text-[10px] text-muted-foreground">Editores</span>
                    <span className="text-xs font-bold text-info"><CurrencyDisplay value={pendingEditorPaymentCOP} currency="COP" size="sm" /></span>
                  </div>
                </div>
              </div>
              {/* USD */}
              <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">🇺🇸</span>
                  <span className="text-[10px] text-muted-foreground">USD</span>
                </div>
                <div className="space-y-1">
                  <div onClick={() => openKpiDialog('Por Pagar a Creadores (USD)', unpaidCreatorContent.filter(c => (c as any).creator_payment_currency === 'USD'))}
                    className="flex justify-between items-center cursor-pointer hover:bg-warning/10 rounded px-1 -mx-1">
                    <span className="text-[10px] text-muted-foreground">Creadores</span>
                    <span className="text-xs font-bold text-warning"><CurrencyDisplay value={pendingCreatorPaymentUSD} currency="USD" size="sm" /></span>
                  </div>
                  <div onClick={() => openKpiDialog('Por Pagar a Editores (USD)', unpaidEditorContent.filter(c => (c as any).editor_payment_currency === 'USD'))}
                    className="flex justify-between items-center cursor-pointer hover:bg-info/10 rounded px-1 -mx-1">
                    <span className="text-[10px] text-muted-foreground">Editores</span>
                    <span className="text-xs font-bold text-info"><CurrencyDisplay value={pendingEditorPaymentUSD} currency="USD" size="sm" /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Facturación Clientes */}
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Facturación</h3>
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* COP */}
              <div className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">🇨🇴</span>
                  <span className="text-[10px] text-muted-foreground">COP</span>
                </div>
                <div className="space-y-1">
                  <div onClick={() => openListDialog('Recaudado COP', 'packages-paid', { packages: packages.filter(p => p.paid_amount > 0 && (p as any).currency !== 'USD') })}
                    className="flex justify-between items-center cursor-pointer hover:bg-success/10 rounded px-1 -mx-1">
                    <span className="text-[10px] text-muted-foreground">Recaudado</span>
                    <span className="text-xs font-bold text-success"><CurrencyDisplay value={clientsBilling.totalPaidCOP} currency="COP" size="sm" /></span>
                  </div>
                  <div onClick={() => openListDialog('Por Cobrar COP', 'packages-pending', { packages: packages.filter(p => (p.total_value - p.paid_amount) > 0 && (p as any).currency !== 'USD') })}
                    className="flex justify-between items-center cursor-pointer hover:bg-warning/10 rounded px-1 -mx-1">
                    <span className="text-[10px] text-muted-foreground">Por Cobrar</span>
                    <span className="text-xs font-bold text-warning"><CurrencyDisplay value={clientsBilling.totalPendingCOP} currency="COP" size="sm" /></span>
                  </div>
                </div>
              </div>
              {/* USD */}
              <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">🇺🇸</span>
                  <span className="text-[10px] text-muted-foreground">USD</span>
                </div>
                <div className="space-y-1">
                  <div onClick={() => openListDialog('Recaudado USD', 'packages-paid', { packages: packages.filter(p => p.paid_amount > 0 && (p as any).currency === 'USD') })}
                    className="flex justify-between items-center cursor-pointer hover:bg-success/10 rounded px-1 -mx-1">
                    <span className="text-[10px] text-muted-foreground">Recaudado</span>
                    <span className="text-xs font-bold text-success"><CurrencyDisplay value={clientsBilling.totalPaidUSD} currency="USD" size="sm" /></span>
                  </div>
                  <div onClick={() => openListDialog('Por Cobrar USD', 'packages-pending', { packages: packages.filter(p => (p.total_value - p.paid_amount) > 0 && (p as any).currency === 'USD') })}
                    className="flex justify-between items-center cursor-pointer hover:bg-warning/10 rounded px-1 -mx-1">
                    <span className="text-[10px] text-muted-foreground">Por Cobrar</span>
                    <span className="text-xs font-bold text-warning"><CurrencyDisplay value={clientsBilling.totalPendingUSD} currency="USD" size="sm" /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Videos Adeudados - Compact */}
        <div onClick={() => openKpiDialog('Videos Adeudados', content.filter(c => ['approved', 'delivered'].includes(c.status)))}
          className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Videos Adeudados a Clientes</span>
          </div>
          <span className="text-lg font-bold text-destructive">{clientsBilling.contentOwed}</span>
        </div>

        {/* Row 5: Tabs for Charts, Leaderboard, Referrals */}
        {isAdmin && (
          <Tabs defaultValue="leaderboard" className="rounded-xl border border-border/50 bg-card p-3">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="leaderboard" className="text-xs h-7">
                <Trophy className="h-3 w-3 mr-1" />
                Ranking
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-xs h-7">
                <Target className="h-3 w-3 mr-1" />
                Metas
              </TabsTrigger>
              <TabsTrigger value="referrals" className="text-xs h-7">
                <Users className="h-3 w-3 mr-1" />
                Referidos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="leaderboard" className="mt-2">
              <Leaderboard maxItems={5} showHeader={false} />
            </TabsContent>
            
            <TabsContent value="goals" className="mt-2">
              {allGoals.length > 0 ? (
                <Tabs defaultValue="revenue" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-7 mb-2">
                    <TabsTrigger value="revenue" className="text-[10px] h-6">Ingresos</TabsTrigger>
                    <TabsTrigger value="content" className="text-[10px] h-6">Contenidos</TabsTrigger>
                    <TabsTrigger value="clients" className="text-[10px] h-6">Clientes</TabsTrigger>
                  </TabsList>
                  <div className="h-48">
                    <TabsContent value="revenue" className="h-full m-0">
                      <GoalsChart 
                        goals={allGoals} 
                        actuals={monthlyActuals} 
                        metric="revenue" 
                        title="" 
                        startMonth={startDateFilter ? startDateFilter.getMonth() + 1 : 1}
                        endMonth={endDateFilter ? endDateFilter.getMonth() + 1 : 12}
                        year={startDateFilter?.getFullYear() || endDateFilter?.getFullYear()}
                      />
                    </TabsContent>
                    <TabsContent value="content" className="h-full m-0">
                      <GoalsChart 
                        goals={allGoals} 
                        actuals={monthlyActuals} 
                        metric="content" 
                        title="" 
                        startMonth={startDateFilter ? startDateFilter.getMonth() + 1 : 1}
                        endMonth={endDateFilter ? endDateFilter.getMonth() + 1 : 12}
                        year={startDateFilter?.getFullYear() || endDateFilter?.getFullYear()}
                      />
                    </TabsContent>
                    <TabsContent value="clients" className="h-full m-0">
                      <GoalsChart 
                        goals={allGoals} 
                        actuals={monthlyActuals} 
                        metric="clients" 
                        title="" 
                        startMonth={startDateFilter ? startDateFilter.getMonth() + 1 : 1}
                        endMonth={endDateFilter ? endDateFilter.getMonth() + 1 : 12}
                        year={startDateFilter?.getFullYear() || endDateFilter?.getFullYear()}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay metas configuradas. <button onClick={() => setGoalsDialogOpen(true)} className="text-primary underline">Configurar</button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="referrals" className="mt-2">
              <ReferralStats />
            </TabsContent>
          </Tabs>
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