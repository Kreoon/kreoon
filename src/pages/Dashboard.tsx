import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video, Users, CheckCircle, Clock, DollarSign, TrendingUp,
  Activity, Target, BarChart3, ArrowUpRight, ArrowDownRight,
  Play, UserCheck, Calendar, Banknote, Filter, X, Settings,
  Building2, Scissors, Zap, Trophy, Crown, Store
} from "lucide-react";
import { format, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { DateRangePresetPicker } from "@/components/ui/date-range-preset-picker";
import { resolvePreset, type DateRangeValue } from "@/lib/date-presets";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useContentWithFilters } from "@/hooks/useContent";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { Content, Client, Profile, ClientPackage } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UnifiedProjectModal } from "@/components/projects/UnifiedProjectModal";
import { TechKpiDialog } from "@/components/dashboard/TechKpiDialog";
import { KpiListDialog } from "@/components/dashboard/KpiListDialog";
import { GoalsDialog } from "@/components/dashboard/GoalsDialog";
import { GoalsChart } from "@/components/dashboard/GoalsChart";
import { DashboardKpiCard, TechProgress, PipelineItem, TechSectionHeader } from "@/components/dashboard/TechDashboardCards";
import { TechGrid, TechParticles, TechOrb, StaggerContainer, StaggerItem } from "@/components/ui/tech-effects";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AmbassadorBadge } from "@/components/ui/ambassador-badge";
import { ReferralStats } from "@/components/dashboard/ReferralStats";
import { MarketplaceDashboardTab } from "@/components/marketplace/dashboard/MarketplaceDashboardTab";
import { CurrencyDisplay, CurrencyBadge, formatCurrency, type CurrencyType } from "@/components/ui/currency-input";
import { useCurrency } from "@/hooks/useCurrency";
import { UPSystemKPIs } from "@/components/dashboard/UPSystemKPIs";
import { ActiveSeasonBanner } from "@/components/dashboard/ActiveSeasonBanner";
import { CollaborativeStats } from "@/components/dashboard/CollaborativeStats";

// Optimized animated number counter using requestAnimationFrame (60fps, minimal re-renders)
const AnimatedNumber = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    // Skip animation if value hasn't changed or is 0
    if (value === prevValueRef.current || value === 0) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 800; // Slightly faster for snappier feel
    let startTime: number | null = null;
    let animationId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out curve for smoother deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationId = requestAnimationFrame(animate);
    prevValueRef.current = value;

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [value]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

// Premium Stats Card with glow effect - Nova Design System
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
  // Nova color mapping
  const novaColorMap = {
    primary: { bg: "rgba(139, 92, 246, 0.1)", border: "var(--nova-border-accent)", text: "var(--nova-accent-primary)" },
    success: { bg: "var(--nova-success-bg)", border: "var(--nova-success)", text: "var(--nova-success)" },
    warning: { bg: "var(--nova-warning-bg)", border: "var(--nova-warning)", text: "var(--nova-warning)" },
    info: { bg: "var(--nova-info-bg)", border: "var(--nova-info)", text: "var(--nova-info)" },
    destructive: { bg: "var(--nova-error-bg)", border: "var(--nova-error)", text: "var(--nova-error)" },
  };

  const novaColors = novaColorMap[color];
  const progressPercent = goalValue && goalValue > 0 ? Math.min((value / goalValue) * 100, 100) : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-sm border p-6",
        "bg-[var(--nova-bg-elevated)] backdrop-blur-xl",
        "transition-all duration-500 hover:scale-[1.02] nova-hover-glow",
        onClick && "cursor-pointer"
      )}
      style={{ borderColor: novaColors.border }}
    >
      <div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-all duration-700 group-hover:scale-150"
        style={{ background: novaColors.text }}
      />

      <div
        className="absolute right-4 top-4 p-3 rounded-sm backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
        style={{ background: novaColors.bg }}
      >
        <Icon className="h-6 w-6" style={{ color: novaColors.text }} />
      </div>

      <div className="relative z-10">
        <p className="text-xs font-medium text-[var(--nova-text-secondary)] uppercase tracking-wider mb-2">
          {title}
        </p>
        <p className="text-4xl font-bold tracking-tight text-[var(--nova-text-bright)] mb-1">
          <AnimatedNumber value={value} />
        </p>
        {subtitle && (
          <p className="text-sm text-[var(--nova-text-secondary)]">{subtitle}</p>
        )}
        {goalValue && goalValue > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--nova-text-secondary)]">{goalLabel || 'Meta'}</span>
              <span className="text-[var(--nova-text-secondary)]">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? (
              <ArrowUpRight className="h-4 w-4 text-[var(--nova-success)]" />
            ) : trend < 0 ? (
              <ArrowDownRight className="h-4 w-4 text-[var(--nova-error)]" />
            ) : null}
            <span className={cn(
              "text-sm font-medium",
              trend > 0 ? "text-[var(--nova-success)]" : trend < 0 ? "text-[var(--nova-error)]" : "text-[var(--nova-text-secondary)]"
            )}>
              {trend > 0 && "+"}{trend}% vs mes anterior
            </span>
          </div>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1 opacity-50 transition-all duration-500 group-hover:opacity-100"
        style={{ background: novaColors.text }}
      />
    </div>
  );
};

// Large KPI Card for main metrics - Nova Design System
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
        "group relative overflow-hidden rounded-sm border p-8",
        "bg-[var(--nova-bg-elevated)] backdrop-blur-xl",
        "border-[var(--nova-border-default)]",
        "transition-all duration-500 nova-hover-glow",
        onClick && "cursor-pointer"
      )}
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-[rgba(139,92,246,0.1)] to-transparent blur-3xl transition-transform duration-700 group-hover:scale-125" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-sm bg-[rgba(139,92,246,0.1)] backdrop-blur-sm">
              <Icon className="h-8 w-8 text-[var(--nova-accent-primary)]" />
            </div>
            <p className="text-lg font-medium text-[var(--nova-text-secondary)]">{title}</p>
          </div>

          <p className="text-6xl font-bold tracking-tight text-[var(--nova-text-bright)] mb-2">
            {prefix}<AnimatedNumber value={value} />{suffix}
          </p>

          {description && (
            <p className="text-sm text-[var(--nova-text-secondary)] max-w-xs">{description}</p>
          )}

          {goalValue && goalValue > 0 && (
            <div className="mt-4 space-y-1 max-w-xs">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--nova-text-secondary)]">{goalLabel || 'Meta'}: {prefix}{goalValue.toLocaleString()}</span>
                <span className={cn(
                  "font-medium",
                  progressPercent >= 100 ? "text-[var(--nova-success)]" : progressPercent >= 75 ? "text-[var(--nova-warning)]" : "text-[var(--nova-text-secondary)]"
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
            trend > 0 ? "bg-[var(--nova-success-bg)] text-[var(--nova-success)]" : "bg-[var(--nova-error-bg)] text-[var(--nova-error)]"
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
  const { user, isAdmin, isClient, profile } = useAuth();
  const { currentOrgId, isPlatformRoot, loading: orgLoading } = useOrgOwner();
  const { toast } = useToast();

  // Detect independent client (client_users or brand member without organization)
  const [isIndependentClient, setIsIndependentClient] = useState<boolean | null>(null);
  useEffect(() => {
    // Wait for org loading to finish
    if (orgLoading) return;
    // If user has organization or is platform root, they're not independent
    if (currentOrgId || isPlatformRoot) {
      setIsIndependentClient(false);
      return;
    }
    // Check if user is a brand member
    const isBrandMember = !!(profile as any)?.active_brand_id;
    if (isBrandMember) {
      setIsIndependentClient(true);
      return;
    }
    // Check if user has client_users associations
    if (!user?.id) {
      setIsIndependentClient(false);
      return;
    }
    const checkClientUser = async () => {
      const { data } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      setIsIndependentClient(!!data?.client_id);
    };
    checkClientUser();
  }, [orgLoading, currentOrgId, isPlatformRoot, profile, user?.id]);

  // Redirect independent clients to their dedicated dashboard
  if (isIndependentClient === true) {
    return <Navigate to="/client-dashboard" replace />;
  }

  // Filters state
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [filterCreatorId, setFilterCreatorId] = useState<string>('all');
  const [filterEditorId, setFilterEditorId] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeValue | null>(null);
  const startDateFilter = dateRangeFilter?.from;
  const endDateFilter = dateRangeFilter?.to;
  
  // Filter options
  const [clients, setClients] = useState<{id: string; name: string}[]>([]);
  const [creators, setCreators] = useState<{id: string; name: string}[]>([]);
  const [editors, setEditors] = useState<{id: string; name: string}[]>([]);
  
  // Only fetch content once org context is loaded
  const { content: allContent, loading: contentLoading, refetch, deleteContent } = useContentWithFilters({
    userId: user?.id,
    role: 'admin',
    clientId: filterClientId !== 'all' ? filterClientId : undefined,
    creatorId: filterCreatorId !== 'all' ? filterCreatorId : undefined,
    editorId: filterEditorId !== 'all' ? filterEditorId : undefined,
    organizationId: currentOrgId || undefined
  });
  
  // Combined loading state - wait for both org and content
  const loading = orgLoading || contentLoading;

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

  // Raw DB data loaded once per org (not on every content change)
  const [rawClientsList, setRawClientsList] = useState<any[]>([]);
  const [rawPackagesData, setRawPackagesData] = useState<any[]>([]);

  // Load filters and DB data - only when org or date filters change (NOT on content change)
  useEffect(() => {
    if (orgLoading) return;

    // Reset data when no org is selected
    if (!currentOrgId) {
      setClients([]);
      setCreators([]);
      setEditors([]);
      setPackages([]);
      setActiveClients([]);
      setActiveCreators([]);
      setActiveEditors([]);
      setCurrentGoal(null);
      setAllGoals([]);
      setMonthlyActuals([]);
      setRawClientsList([]);
      setRawPackagesData([]);
      setClientsBilling({
        totalBilled: 0, totalPending: 0, totalPaid: 0, contentOwed: 0,
        totalBilledUSD: 0, totalPendingUSD: 0, totalPaidUSD: 0,
        totalBilledCOP: 0, totalPendingCOP: 0, totalPaidCOP: 0
      });
      return;
    }

    const fetchFiltersAndData = async () => {
      // Run independent queries in parallel
      const [creatorRolesRes, editorRolesRes, clientsRes, goalRes, allGoalsRes] = await Promise.all([
        supabase.from('organization_member_roles').select('user_id').eq('organization_id', currentOrgId).eq('role', 'creator'),
        supabase.from('organization_member_roles').select('user_id').eq('organization_id', currentOrgId).eq('role', 'editor'),
        supabase.from('clients').select('*').eq('organization_id', currentOrgId),
        supabase.from('goals').select('*').eq('period_type', 'month').eq('period_value', new Date().getMonth() + 1).in('year', [new Date().getFullYear(), new Date().getFullYear() + 1]).order('year', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('goals').select('*').in('year', [new Date().getFullYear(), new Date().getFullYear() + 1]).eq('period_type', 'month'),
      ]);

      // Fetch creator/editor profiles in parallel
      const creatorIds = creatorRolesRes.data?.map(r => r.user_id) || [];
      const editorIds = editorRolesRes.data?.map(r => r.user_id) || [];

      const [creatorProfilesRes, editorProfilesRes] = await Promise.all([
        creatorIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', creatorIds) : { data: [] },
        editorIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', editorIds) : { data: [] },
      ]);

      setCreators(creatorProfilesRes.data?.map(p => ({ id: p.id, name: p.full_name })) || []);
      setEditors(editorProfilesRes.data?.map(p => ({ id: p.id, name: p.full_name })) || []);

      const clientsList = clientsRes.data || [];
      setClients(clientsList.map(c => ({ id: c.id, name: c.name })));
      setRawClientsList(clientsList);

      // Fetch packages via server-side JOIN (avoids massive .in() with 500+ UUIDs)
      const { data: packagesData } = await supabase.rpc('get_org_client_packages', { p_organization_id: currentOrgId });
      setRawPackagesData(packagesData || []);

      // Goals
      if (goalRes.data) {
        setCurrentGoal({
          revenue_goal: goalRes.data.revenue_goal || 0,
          content_goal: goalRes.data.content_goal || 0,
          new_clients_goal: goalRes.data.new_clients_goal || 0
        });
      }
      setAllGoals(allGoalsRes.data || []);
    };

    fetchFiltersAndData();
  }, [currentOrgId, orgLoading]);

  // Billing, packages, monthly actuals - derived from raw data + content + date filters
  // This is pure computation, no DB queries
  useMemo(() => {
    if (!rawClientsList.length && !rawPackagesData.length) return;

    const clientById = new Map(rawClientsList.map(c => [c.id, c]));
    const mappedPackages = rawPackagesData.map(p => ({
      ...p,
      client: (clientById.get(p.client_id) as Client | undefined)
    })) as (ClientPackage & { client?: Client })[];

    // Filter packages by date range (created_at for "vendido")
    const filteredPackagesByCreated = mappedPackages.filter(p => {
      const packageDate = p.created_at ? new Date(p.created_at) : null;
      if (startDateFilter && packageDate && packageDate < startDateFilter) return false;
      if (endDateFilter && packageDate && packageDate > endDateFilter) return false;
      return true;
    });

    // Filter packages by paid_at for "Recaudado"
    const filteredPackagesByPaid = mappedPackages.filter(p => {
      const paidDate = p.paid_at ? new Date(p.paid_at) : null;
      if (!paidDate) return false;
      if (startDateFilter && paidDate < startDateFilter) return false;
      if (endDateFilter && paidDate > endDateFilter) return false;
      return true;
    });

    setPackages(filteredPackagesByCreated);

    // Calculate billing - separated by currency
    const copPackagesCreated = filteredPackagesByCreated.filter(p => (p as any).currency === 'COP' || !(p as any).currency);
    const totalBilledCOP = copPackagesCreated.reduce((sum, p) => sum + (p.total_value || 0), 0);
    const totalPendingCOP = copPackagesCreated.reduce((sum, p) => sum + ((p.total_value || 0) - (p.paid_amount || 0)), 0);
    const copPackagesPaid = filteredPackagesByPaid.filter(p => (p as any).currency === 'COP' || !(p as any).currency);
    const totalPaidCOP = copPackagesPaid.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
    const usdPackagesCreated = filteredPackagesByCreated.filter(p => (p as any).currency === 'USD');
    const totalBilledUSD = usdPackagesCreated.reduce((sum, p) => sum + (p.total_value || 0), 0);
    const totalPendingUSD = usdPackagesCreated.reduce((sum, p) => sum + ((p.total_value || 0) - (p.paid_amount || 0)), 0);
    const usdPackagesPaid = filteredPackagesByPaid.filter(p => (p as any).currency === 'USD');
    const totalPaidUSD = usdPackagesPaid.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
    const totalBilled = totalBilledCOP + totalBilledUSD;
    const totalPaid = totalPaidCOP + totalPaidUSD;
    const totalPending = totalPendingCOP + totalPendingUSD;

    const totalContentPromised = filteredPackagesByCreated.reduce((sum, p) => sum + (p.content_quantity || 0), 0);
    const deliveredContent = content.filter(c => ['approved', 'delivered'].includes(c.status)).length;
    const contentOwed = Math.max(0, totalContentPromised - deliveredContent);

    setClientsBilling({
      totalBilled, totalPending, totalPaid, contentOwed,
      totalBilledUSD, totalPendingUSD, totalPaidUSD,
      totalBilledCOP, totalPendingCOP, totalPaidCOP
    });

    // Filter active clients by date range
    const filteredClients = rawClientsList.filter(c => {
      const clientDate = c.created_at ? new Date(c.created_at) : null;
      if (startDateFilter && clientDate && clientDate < startDateFilter) return false;
      if (endDateFilter && clientDate && clientDate > endDateFilter) return false;
      return true;
    });
    setActiveClients(filteredClients as Client[]);

    // Monthly actuals for chart
    const currentYear = new Date().getFullYear();
    const yearsWithGoals = [...new Set((allGoals || []).map((g: any) => g.year))];
    const monthlyData: any[] = [];

    for (const year of yearsWithGoals) {
      for (let month = 1; month <= 12; month++) {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = endOfMonth(monthStart);

        const monthPackages = rawPackagesData.filter(p => {
          const paidDate = p.paid_at ? new Date(p.paid_at) : null;
          return paidDate && paidDate >= monthStart && paidDate <= monthEnd;
        });
        const monthRevenueCOP = monthPackages.filter(p => (p as any).currency !== 'USD').reduce((sum: number, p: any) => sum + (p.paid_amount || 0), 0);
        const monthRevenueUSD = monthPackages.filter(p => (p as any).currency === 'USD').reduce((sum: number, p: any) => sum + (p.paid_amount || 0), 0);
        const monthContent = allContent.filter(c => {
          const approvedDate = c.approved_at ? new Date(c.approved_at) : null;
          return approvedDate && approvedDate >= monthStart && approvedDate <= monthEnd;
        }).length;
        const monthClients = rawClientsList.filter(c => {
          const createdDate = c.created_at ? new Date(c.created_at) : null;
          return createdDate && createdDate >= monthStart && createdDate <= monthEnd;
        }).length;

        monthlyData.push({ month, year, revenue: monthRevenueCOP + monthRevenueUSD, revenueCOP: monthRevenueCOP, revenueUSD: monthRevenueUSD, content: monthContent, clients: monthClients });
      }
    }

    if (yearsWithGoals.length === 0) {
      for (let month = 1; month <= 12; month++) {
        monthlyData.push({ month, year: currentYear, revenue: 0, revenueCOP: 0, revenueUSD: 0, content: 0, clients: 0 });
      }
    }

    setMonthlyActuals(monthlyData);
  }, [rawClientsList, rawPackagesData, allContent, content, startDateFilter, endDateFilter, allGoals]);

  // Calculate active creators and editors with their stats
  // Uses profiles already fetched in useContent hook (creator/editor fields)
  useMemo(() => {
    // Build stats from content data directly (profiles are already embedded by useContent)
    const creatorMap = new Map<string, { id: string; full_name: string; content_count: number; total_payment: number }>();
    const editorMap = new Map<string, { id: string; full_name: string; content_count: number; total_payment: number }>();

    for (const c of content) {
      if (c.creator_id && (c as any).creator?.full_name) {
        const existing = creatorMap.get(c.creator_id) || { id: c.creator_id, full_name: (c as any).creator.full_name, content_count: 0, total_payment: 0 };
        existing.content_count++;
        existing.total_payment += (c.creator_payment || 0);
        creatorMap.set(c.creator_id, existing);
      }
      if (c.editor_id && (c as any).editor?.full_name) {
        const existing = editorMap.get(c.editor_id) || { id: c.editor_id, full_name: (c as any).editor.full_name, content_count: 0, total_payment: 0 };
        existing.content_count++;
        existing.total_payment += (c.editor_payment || 0);
        editorMap.set(c.editor_id, existing);
      }
    }

    setActiveCreators(Array.from(creatorMap.values()) as any);
    setActiveEditors(Array.from(editorMap.values()) as any);
  }, [content]);

  // Realtime auto-refresh removed — dashboard updates only on explicit user actions

  // Stats calculations
  const totalContent = content.length;
  const activeContent = content.filter(c => !['approved', 'paid', 'delivered', 'corrected'].includes(c.status)).length;
  const inProgress = content.filter(c => ['recording', 'editing'].includes(c.status)).length;
  const completed = content.filter(c => c.status === 'approved').length;
  const pending = content.filter(c => ['draft', 'script_approved', 'assigned'].includes(c.status)).length;
  
  // Payment stats - CORRECTED LOGIC - now separated by currency
  // Unpaid creator content: approved content where creator hasn't been paid AND has a payment value assigned
  const unpaidCreatorContent = content.filter(c => c.status === 'approved' && !c.creator_paid && (c.creator_payment || 0) > 0);
  // Unpaid editor content: approved content where editor hasn't been paid AND has a payment value assigned
  const unpaidEditorContent = content.filter(c => c.status === 'approved' && !c.editor_paid && (c.editor_payment || 0) > 0);
  
  // Paid content (already paid to team)
  const paidCreatorContent = content.filter(c => c.creator_paid === true && (c.creator_payment || 0) > 0);
  const paidEditorContent = content.filter(c => c.editor_paid === true && (c.editor_payment || 0) > 0);
  
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
  
  // Calculate PAID amounts to team - separated by currency
  const paidCreatorPaymentCOP = paidCreatorContent
    .filter(c => (c as any).creator_payment_currency !== 'USD')
    .reduce((sum, c) => sum + (c.creator_payment || 0), 0);
  const paidCreatorPaymentUSD = paidCreatorContent
    .filter(c => (c as any).creator_payment_currency === 'USD')
    .reduce((sum, c) => sum + (c.creator_payment || 0), 0);
  const paidEditorPaymentCOP = paidEditorContent
    .filter(c => (c as any).editor_payment_currency !== 'USD')
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);
  const paidEditorPaymentUSD = paidEditorContent
    .filter(c => (c as any).editor_payment_currency === 'USD')
    .reduce((sum, c) => sum + (c.editor_payment || 0), 0);

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
    setDateRangeFilter(null);
  };

  const hasActiveFilters = filterClientId !== 'all' || filterCreatorId !== 'all' || filterEditorId !== 'all' || dateRangeFilter;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <motion.div 
            className="absolute inset-0 rounded-full bg-[hsl(270,100%,60%,0.3)] blur-xl"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-t-[hsl(270,100%,60%)] border-[hsl(270,100%,60%,0.2)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <motion.p
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-primary whitespace-nowrap"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Cargando dashboard...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Tech Background */}
      <div className="fixed inset-0 pointer-events-none">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={20} />
        <TechOrb size="lg" position="top-right" delay={0} />
        <TechOrb size="md" position="bottom-left" delay={1} />
      </div>
      {/* Page Header */}
      <div className="p-4 md:p-6">
        <PageHeader
          icon={Crown}
          title="KREOON Board"
          subtitle="Centro de comando y métricas"
          action={
            <div className="flex items-center gap-2">
              <DateRangePresetPicker
                value={dateRangeFilter ?? { preset: 'last_30', ...resolvePreset('last_30') }}
                onChange={setDateRangeFilter}
                presets={['today', 'last_7', 'last_30', 'this_month', 'last_month', 'this_quarter', 'custom']}
              />
              {profile?.is_ambassador && (
                <AmbassadorBadge size="sm" variant="glow" />
              )}
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setGoalsDialogOpen(true)} className="h-8 px-2 md:px-3 border-primary/30 hover:bg-primary/10">
                  <Target className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Metas</span>
                </Button>
              )}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-sm bg-success/10 border border-success/20">
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
                  
                  <DateRangePresetPicker
                    value={dateRangeFilter ?? { preset: 'last_30', ...resolvePreset('last_30') }}
                    onChange={setDateRangeFilter}
                    presets={['today', 'last_7', 'last_30', 'this_month', 'last_month', 'custom']}
                    numberOfMonths={1}
                    align="start"
                  />

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
                        <SelectValue placeholder="Productor AV" />
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

              <DateRangePresetPicker
                value={dateRangeFilter ?? { preset: 'last_30', ...resolvePreset('last_30') }}
                onChange={setDateRangeFilter}
                presets={['today', 'last_7', 'last_30', 'this_month', 'last_month', 'this_quarter', 'custom']}
                align="start"
              />

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

      <div className="px-4 py-2 lg:px-6">
        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="principal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-10 mb-4">
            <TabsTrigger value="principal" className="text-xs gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Principal</span>
            </TabsTrigger>
            <TabsTrigger value="financiero" className="text-xs gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Financiero</span>
            </TabsTrigger>
            <TabsTrigger value="up" className="text-xs gap-1">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">UP System</span>
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="text-xs gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="text-xs gap-1">
              <Store className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Marketplace</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PRINCIPAL - KPIs de la Organización */}
          <TabsContent value="principal" className="space-y-3 mt-0">
            {/* Row 1: Main KPIs - Tech Style */}
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3" staggerDelay={0.1}>
              {/* Total Contenidos */}
              <StaggerItem>
                <DashboardKpiCard
                  title="Total Contenidos"
                  value={<AnimatedNumber value={totalContent} />}
                  icon={Video}
                  iconColor="hsl(270 100% 60%)"
                  onClick={() => openKpiDialog('Todos los Contenidos', content)}
                >
                  {currentGoal?.content_goal && currentGoal.content_goal > 0 && (
                    <TechProgress 
                      value={totalContent} 
                      max={currentGoal.content_goal} 
                      color="hsl(270 100% 60%)"
                      label="Meta"
                    />
                  )}
                </DashboardKpiCard>
              </StaggerItem>

              {/* Ingresos COP */}
              <StaggerItem>
                <DashboardKpiCard
                  title="Ingresos COP"
                  value={<CurrencyDisplay value={clientsBilling.totalBilledCOP} currency="COP" size="sm" />}
                  icon={DollarSign}
                  iconColor="hsl(45 100% 50%)"
                  borderColor="hsl(45 100% 50% / 0.3)"
                  onClick={() => openListDialog('Paquetes Vendidos (COP)', 'packages-sold', { packages: packages.filter(p => (p as any).currency === 'COP' || !(p as any).currency) })}
                >
                  {currentGoal?.revenue_goal && currentGoal.revenue_goal > 0 && (
                    <TechProgress 
                      value={clientsBilling.totalBilledCOP} 
                      max={currentGoal.revenue_goal} 
                      color="hsl(45 100% 50%)"
                      label="Meta"
                    />
                  )}
                </DashboardKpiCard>
              </StaggerItem>

              {/* Ingresos USD */}
              <StaggerItem>
                <DashboardKpiCard
                  title="Ingresos USD"
                  value={<CurrencyDisplay value={clientsBilling.totalBilledUSD} currency="USD" size="sm" />}
                  icon={DollarSign}
                  iconColor="hsl(160 100% 45%)"
                  borderColor="hsl(160 100% 45% / 0.3)"
                  onClick={() => openListDialog('Paquetes Vendidos (USD)', 'packages-sold', { packages: packages.filter(p => (p as any).currency === 'USD') })}
                  subtitle={<span>Recaudado: <CurrencyDisplay value={clientsBilling.totalPaidUSD} currency="USD" size="sm" /></span>}
                />
              </StaggerItem>

              {/* Clientes Activos */}
              <StaggerItem>
                <DashboardKpiCard
                  title="Clientes"
                  value={activeClients.length}
                  icon={Building2}
                  iconColor="hsl(270 100% 60%)"
                  onClick={() => openListDialog('Clientes Activos', 'clients', { clients: activeClients })}
                >
                  {currentGoal?.new_clients_goal && currentGoal.new_clients_goal > 0 && (
                    <TechProgress 
                      value={activeClients.length} 
                      max={currentGoal.new_clients_goal} 
                      color="hsl(270 100% 60%)"
                      label="Meta"
                    />
                  )}
                </DashboardKpiCard>
              </StaggerItem>
            </StaggerContainer>

            {/* Row 2: Content Status Pipeline - Tech Style */}
            <motion.div 
              className="rounded-sm border border-[hsl(270,100%,60%,0.15)] bg-gradient-to-br from-card to-card p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <TechSectionHeader icon={Activity} title="Pipeline de Contenidos" />
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                <PipelineItem
                  icon={Calendar}
                  value={pending}
                  label="Pendientes"
                  color="hsl(270 30% 55%)"
                  onClick={() => openKpiDialog('Pendientes', content.filter(c => ['draft', 'script_approved', 'assigned'].includes(c.status)))}
                />
                <PipelineItem
                  icon={Video}
                  value={content.filter(c => c.status === 'recording').length}
                  label="Grabación"
                  color="hsl(200 100% 50%)"
                  onClick={() => openKpiDialog('En Grabación', content.filter(c => c.status === 'recording'))}
                />
                <PipelineItem
                  icon={Scissors}
                  value={content.filter(c => c.status === 'editing').length}
                  label="Edición"
                  color="hsl(45 100% 50%)"
                  onClick={() => openKpiDialog('En Edición', content.filter(c => c.status === 'editing'))}
                />
                <PipelineItem
                  icon={Play}
                  value={content.filter(c => c.status === 'delivered').length}
                  label="Entregados"
                  color="hsl(270 100% 60%)"
                  onClick={() => openKpiDialog('Entregados', content.filter(c => c.status === 'delivered'))}
                />
                <PipelineItem
                  icon={Activity}
                  value={content.filter(c => c.status === 'issue').length}
                  label="Novedad"
                  color="hsl(0 80% 55%)"
                  onClick={() => openKpiDialog('Con Novedad', content.filter(c => c.status === 'issue'))}
                />
                <PipelineItem
                  icon={TrendingUp}
                  value={content.filter(c => c.status === 'corrected').length}
                  label="Corregidos"
                  color="hsl(35 100% 50%)"
                  onClick={() => openKpiDialog('Corregidos', content.filter(c => c.status === 'corrected'))}
                />
                <PipelineItem
                  icon={CheckCircle}
                  value={completed}
                  label="Aprobados"
                  color="hsl(160 100% 45%)"
                  onClick={() => openKpiDialog('Aprobados', content.filter(c => c.status === 'approved'))}
                />
              </div>
            </motion.div>

            {/* Row 3: Videos Adeudados + Quick Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div onClick={() => openKpiDialog('Videos Adeudados', content.filter(c => ['approved', 'delivered'].includes(c.status)))}
                className="p-4 rounded-sm bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium">Videos Adeudados</span>
                  </div>
                  <span className="text-2xl font-bold text-destructive">{clientsBilling.contentOwed}</span>
                </div>
              </div>
              
              <div className="p-4 rounded-sm bg-success/10 border border-success/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm font-medium">Total Recaudado</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-success"><CurrencyDisplay value={clientsBilling.totalPaidCOP} currency="COP" size="sm" /></p>
                    <p className="text-xs text-success/70"><CurrencyDisplay value={clientsBilling.totalPaidUSD} currency="USD" size="sm" /></p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-sm bg-warning/10 border border-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    <span className="text-sm font-medium">Total Por Cobrar</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-warning"><CurrencyDisplay value={clientsBilling.totalPendingCOP} currency="COP" size="sm" /></p>
                    <p className="text-xs text-warning/70"><CurrencyDisplay value={clientsBilling.totalPendingUSD} currency="USD" size="sm" /></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Goals Chart */}
            {allGoals.length > 0 && (
              <div className="rounded-sm border border-border/50 bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Metas vs Real
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setGoalsDialogOpen(true)} className="h-7 px-2 text-xs">
                    <Settings className="h-3 w-3 mr-1" />
                    Configurar
                  </Button>
                </div>
                <Tabs defaultValue="revenue" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-8 mb-2">
                    <TabsTrigger value="revenue" className="text-xs h-7">Ingresos</TabsTrigger>
                    <TabsTrigger value="content" className="text-xs h-7">Contenidos</TabsTrigger>
                    <TabsTrigger value="clients" className="text-xs h-7">Clientes</TabsTrigger>
                  </TabsList>
                  <div className="h-52">
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
              </div>
            )}
          </TabsContent>

          {/* TAB 2: FINANCIERO - Todo lo financiero */}
          <TabsContent value="financiero" className="space-y-4 mt-0">
            {/* Summary Cards - Row 1: Ingresos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-sm bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🇨🇴</span>
                  <span className="text-sm font-medium">Total Facturado COP</span>
                </div>
                <p className="text-2xl font-bold"><CurrencyDisplay value={clientsBilling.totalBilledCOP} currency="COP" size="sm" /></p>
              </div>
              <div className="p-4 rounded-sm bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🇺🇸</span>
                  <span className="text-sm font-medium">Total Facturado USD</span>
                </div>
                <p className="text-2xl font-bold"><CurrencyDisplay value={clientsBilling.totalBilledUSD} currency="USD" size="sm" /></p>
              </div>
              <div className="p-4 rounded-sm bg-gradient-to-br from-success/10 to-success/5 border border-success/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Total Recaudado</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-success"><CurrencyDisplay value={clientsBilling.totalPaidCOP} currency="COP" size="sm" /></p>
                  <p className="text-xs text-success/70"><CurrencyDisplay value={clientsBilling.totalPaidUSD} currency="USD" size="sm" /></p>
                </div>
              </div>
              <div className="p-4 rounded-sm bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Total Por Cobrar</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-warning"><CurrencyDisplay value={clientsBilling.totalPendingCOP} currency="COP" size="sm" /></p>
                  <p className="text-xs text-warning/70"><CurrencyDisplay value={clientsBilling.totalPendingUSD} currency="USD" size="sm" /></p>
                </div>
              </div>
            </div>

            {/* Summary Cards - Row 2: Egresos y Utilidad */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Por Pagar al Equipo */}
              <div className="p-4 rounded-sm bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/30">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Total Por Pagar</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-destructive"><CurrencyDisplay value={pendingCreatorPaymentCOP + pendingEditorPaymentCOP} currency="COP" size="sm" /></p>
                  <p className="text-xs text-destructive/70"><CurrencyDisplay value={pendingCreatorPaymentUSD + pendingEditorPaymentUSD} currency="USD" size="sm" /></p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Creadores + Editores</p>
              </div>

              {/* Total Pagado al Equipo */}
              <div className="p-4 rounded-sm bg-gradient-to-br from-info/10 to-info/5 border border-info/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-info" />
                  <span className="text-sm font-medium">Total Pagado Equipo</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-info"><CurrencyDisplay value={paidCreatorPaymentCOP + paidEditorPaymentCOP} currency="COP" size="sm" /></p>
                  <p className="text-xs text-info/70"><CurrencyDisplay value={paidCreatorPaymentUSD + paidEditorPaymentUSD} currency="USD" size="sm" /></p>
                </div>
              </div>

              {/* Utilidad Real (ya cobrado - ya pagado) */}
              <div className="p-4 rounded-sm bg-gradient-to-br from-success/10 to-success/5 border border-success/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Utilidad Real</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-success">
                    <CurrencyDisplay value={clientsBilling.totalPaidCOP - (paidCreatorPaymentCOP + paidEditorPaymentCOP)} currency="COP" size="sm" />
                  </p>
                  <p className="text-xs text-success/70">
                    <CurrencyDisplay value={clientsBilling.totalPaidUSD - (paidCreatorPaymentUSD + paidEditorPaymentUSD)} currency="USD" size="sm" />
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Recaudado - Pagado</p>
              </div>

              {/* Posible Utilidad (por cobrar - por pagar) */}
              <div className="p-4 rounded-sm bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Posible Utilidad</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">
                    <CurrencyDisplay value={clientsBilling.totalPendingCOP - (pendingCreatorPaymentCOP + pendingEditorPaymentCOP)} currency="COP" size="sm" />
                  </p>
                  <p className="text-xs text-primary/70">
                    <CurrencyDisplay value={clientsBilling.totalPendingUSD - (pendingCreatorPaymentUSD + pendingEditorPaymentUSD)} currency="USD" size="sm" />
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Por Cobrar - Por Pagar</p>
              </div>
            </div>

            {/* Facturación Detailed - By Currency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* FACTURACIÓN - COP */}
              <div className="rounded-sm border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇨🇴</span>
                    <h3 className="text-base font-semibold">Facturación COP</h3>
                  </div>
                  <BarChart3 className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="space-y-3">
                  <div onClick={() => openListDialog('Facturado COP', 'packages-sold', { packages: packages.filter(p => (p as any).currency === 'COP' || !(p as any).currency) })}
                    className="flex justify-between items-center cursor-pointer hover:bg-yellow-500/10 rounded-sm p-3 transition-colors border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">Facturado</span>
                    </div>
                    <span className="text-xl font-bold"><CurrencyDisplay value={clientsBilling.totalBilledCOP} currency="COP" size="sm" /></span>
                  </div>
                  <div onClick={() => openListDialog('Recaudado COP', 'packages-paid', { packages: packages.filter(p => p.paid_amount > 0 && ((p as any).currency === 'COP' || !(p as any).currency)) })}
                    className="flex justify-between items-center cursor-pointer hover:bg-success/10 rounded-sm p-3 transition-colors border border-success/20 bg-success/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Recaudado</span>
                    </div>
                    <span className="text-xl font-bold text-success"><CurrencyDisplay value={clientsBilling.totalPaidCOP} currency="COP" size="sm" /></span>
                  </div>
                  <div onClick={() => openListDialog('Por Cobrar COP', 'packages-pending', { packages: packages.filter(p => (p.total_value - p.paid_amount) > 0 && ((p as any).currency === 'COP' || !(p as any).currency)) })}
                    className="flex justify-between items-center cursor-pointer hover:bg-warning/10 rounded-sm p-3 transition-colors border border-warning/20 bg-warning/5">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-warning" />
                      <span className="font-medium">Por Cobrar</span>
                    </div>
                    <span className="text-xl font-bold text-warning"><CurrencyDisplay value={clientsBilling.totalPendingCOP} currency="COP" size="sm" /></span>
                  </div>
                </div>
              </div>

              {/* FACTURACIÓN - USD */}
              <div className="rounded-sm border border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇺🇸</span>
                    <h3 className="text-base font-semibold">Facturación USD</h3>
                  </div>
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-3">
                  <div onClick={() => openListDialog('Facturado USD', 'packages-sold', { packages: packages.filter(p => (p as any).currency === 'USD') })}
                    className="flex justify-between items-center cursor-pointer hover:bg-green-500/10 rounded-sm p-3 transition-colors border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Facturado</span>
                    </div>
                    <span className="text-xl font-bold"><CurrencyDisplay value={clientsBilling.totalBilledUSD} currency="USD" size="sm" /></span>
                  </div>
                  <div onClick={() => openListDialog('Recaudado USD', 'packages-paid', { packages: packages.filter(p => p.paid_amount > 0 && (p as any).currency === 'USD') })}
                    className="flex justify-between items-center cursor-pointer hover:bg-success/10 rounded-sm p-3 transition-colors border border-success/20 bg-success/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Recaudado</span>
                    </div>
                    <span className="text-xl font-bold text-success"><CurrencyDisplay value={clientsBilling.totalPaidUSD} currency="USD" size="sm" /></span>
                  </div>
                  <div onClick={() => openListDialog('Por Cobrar USD', 'packages-pending', { packages: packages.filter(p => (p.total_value - p.paid_amount) > 0 && (p as any).currency === 'USD') })}
                    className="flex justify-between items-center cursor-pointer hover:bg-warning/10 rounded-sm p-3 transition-colors border border-warning/20 bg-warning/5">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-warning" />
                      <span className="font-medium">Por Cobrar</span>
                    </div>
                    <span className="text-xl font-bold text-warning"><CurrencyDisplay value={clientsBilling.totalPendingUSD} currency="USD" size="sm" /></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagos Equipo - By Currency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* PAGOS EQUIPO - COP */}
              <div className="rounded-sm border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇨🇴</span>
                    <h3 className="text-base font-semibold">Pagos Equipo COP</h3>
                  </div>
                  <Banknote className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="space-y-3">
                  {/* Pagado */}
                  <div className="p-3 rounded-sm bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-success">Pagado</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div onClick={() => openKpiDialog('Pagado a Creadores (COP)', paidCreatorContent.filter(c => (c as any).creator_payment_currency !== 'USD'))}
                        className="flex flex-col cursor-pointer hover:bg-success/20 rounded-sm p-2 transition-colors">
                        <span className="text-xs text-muted-foreground">Creadores</span>
                        <span className="text-lg font-bold text-success"><CurrencyDisplay value={paidCreatorPaymentCOP} currency="COP" size="sm" /></span>
                      </div>
                      <div onClick={() => openKpiDialog('Pagado a Editores (COP)', paidEditorContent.filter(c => (c as any).editor_payment_currency !== 'USD'))}
                        className="flex flex-col cursor-pointer hover:bg-success/20 rounded-sm p-2 transition-colors">
                        <span className="text-xs text-muted-foreground">Editores</span>
                        <span className="text-lg font-bold text-success"><CurrencyDisplay value={paidEditorPaymentCOP} currency="COP" size="sm" /></span>
                      </div>
                    </div>
                    <div className="border-t border-success/30 mt-3 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Pagado</span>
                        <span className="text-xl font-bold text-success"><CurrencyDisplay value={paidCreatorPaymentCOP + paidEditorPaymentCOP} currency="COP" size="sm" /></span>
                      </div>
                    </div>
                  </div>
                  {/* Por Pagar */}
                  <div className="p-3 rounded-sm bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-warning" />
                      <span className="text-sm font-semibold text-warning">Por Pagar</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div onClick={() => openKpiDialog('Por Pagar a Creadores (COP)', unpaidCreatorContent.filter(c => (c as any).creator_payment_currency !== 'USD'))}
                        className="flex flex-col cursor-pointer hover:bg-warning/20 rounded-sm p-2 transition-colors">
                        <span className="text-xs text-muted-foreground">Creadores</span>
                        <span className="text-lg font-bold text-warning"><CurrencyDisplay value={pendingCreatorPaymentCOP} currency="COP" size="sm" /></span>
                      </div>
                      <div onClick={() => openKpiDialog('Por Pagar a Editores (COP)', unpaidEditorContent.filter(c => (c as any).editor_payment_currency !== 'USD'))}
                        className="flex flex-col cursor-pointer hover:bg-warning/20 rounded-sm p-2 transition-colors">
                        <span className="text-xs text-muted-foreground">Editores</span>
                        <span className="text-lg font-bold text-warning"><CurrencyDisplay value={pendingEditorPaymentCOP} currency="COP" size="sm" /></span>
                      </div>
                    </div>
                    <div className="border-t border-warning/30 mt-3 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Por Pagar</span>
                        <span className="text-xl font-bold text-warning"><CurrencyDisplay value={pendingCreatorPaymentCOP + pendingEditorPaymentCOP} currency="COP" size="sm" /></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAGOS EQUIPO - USD */}
              <div className="rounded-sm border border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇺🇸</span>
                    <h3 className="text-base font-semibold">Pagos Equipo USD</h3>
                  </div>
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-3">
                  {/* Pagado */}
                  <div className="p-3 rounded-sm bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-success">Pagado</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div onClick={() => openKpiDialog('Pagado a Creadores (USD)', paidCreatorContent.filter(c => (c as any).creator_payment_currency === 'USD'))}
                        className="flex flex-col cursor-pointer hover:bg-success/20 rounded-sm p-2 transition-colors">
                        <span className="text-xs text-muted-foreground">Creadores</span>
                        <span className="text-lg font-bold text-success"><CurrencyDisplay value={paidCreatorPaymentUSD} currency="USD" size="sm" /></span>
                      </div>
                      <div onClick={() => openKpiDialog('Pagado a Editores (USD)', paidEditorContent.filter(c => (c as any).editor_payment_currency === 'USD'))}
                        className="flex flex-col cursor-pointer hover:bg-success/20 rounded-sm p-2 transition-colors">
                        <span className="text-xs text-muted-foreground">Editores</span>
                        <span className="text-lg font-bold text-success"><CurrencyDisplay value={paidEditorPaymentUSD} currency="USD" size="sm" /></span>
                      </div>
                    </div>
                    <div className="border-t border-success/30 mt-3 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Pagado</span>
                        <span className="text-xl font-bold text-success"><CurrencyDisplay value={paidCreatorPaymentUSD + paidEditorPaymentUSD} currency="USD" size="sm" /></span>
                      </div>
                    </div>
                  </div>
                  {/* Por Pagar */}
                  <div className="p-3 rounded-sm bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-warning" />
                      <span className="text-sm font-semibold text-warning">Por Pagar</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div onClick={() => openKpiDialog('Por Pagar a Creadores (USD)', unpaidCreatorContent.filter(c => (c as any).creator_payment_currency === 'USD'))}
                        className="flex flex-col cursor-pointer hover:bg-warning/20 rounded-sm p-2 transition-colors">
                        <span className="text-xs text-muted-foreground">Creadores</span>
                        <span className="text-lg font-bold text-warning"><CurrencyDisplay value={pendingCreatorPaymentUSD} currency="USD" size="sm" /></span>
                      </div>
                      <div onClick={() => openKpiDialog('Por Pagar a Editores (USD)', unpaidEditorContent.filter(c => (c as any).editor_payment_currency === 'USD'))}
                        className="flex flex-col cursor-pointer hover:bg-warning/20 rounded-sm p-2 transition-colors">
                        <span className="text-xs text-muted-foreground">Editores</span>
                        <span className="text-lg font-bold text-warning"><CurrencyDisplay value={pendingEditorPaymentUSD} currency="USD" size="sm" /></span>
                      </div>
                    </div>
                    <div className="border-t border-warning/30 mt-3 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Por Pagar</span>
                        <span className="text-xl font-bold text-warning"><CurrencyDisplay value={pendingCreatorPaymentUSD + pendingEditorPaymentUSD} currency="USD" size="sm" /></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Margen / Utilidad Estimada */}
            <div className="rounded-sm border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Resumen de Utilidad
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-sm bg-card/50">
                  <p className="text-xs text-muted-foreground mb-1">Ingresos COP</p>
                  <p className="text-lg font-bold"><CurrencyDisplay value={clientsBilling.totalPaidCOP} currency="COP" size="sm" /></p>
                </div>
                <div className="text-center p-3 rounded-sm bg-card/50">
                  <p className="text-xs text-muted-foreground mb-1">Costos COP</p>
                  <p className="text-lg font-bold text-destructive"><CurrencyDisplay value={paidCreatorPaymentCOP + paidEditorPaymentCOP} currency="COP" size="sm" /></p>
                </div>
                <div className="text-center p-3 rounded-sm bg-card/50">
                  <p className="text-xs text-muted-foreground mb-1">Ingresos USD</p>
                  <p className="text-lg font-bold"><CurrencyDisplay value={clientsBilling.totalPaidUSD} currency="USD" size="sm" /></p>
                </div>
                <div className="text-center p-3 rounded-sm bg-card/50">
                  <p className="text-xs text-muted-foreground mb-1">Costos USD</p>
                  <p className="text-lg font-bold text-destructive"><CurrencyDisplay value={paidCreatorPaymentUSD + paidEditorPaymentUSD} currency="USD" size="sm" /></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-primary/20">
                <div className="text-center p-3 rounded-sm bg-success/10 border border-success/20">
                  <p className="text-xs text-muted-foreground mb-1">Utilidad COP</p>
                  <p className="text-xl font-bold text-success">
                    <CurrencyDisplay value={clientsBilling.totalPaidCOP - (paidCreatorPaymentCOP + paidEditorPaymentCOP)} currency="COP" size="sm" />
                  </p>
                </div>
                <div className="text-center p-3 rounded-sm bg-success/10 border border-success/20">
                  <p className="text-xs text-muted-foreground mb-1">Utilidad USD</p>
                  <p className="text-xl font-bold text-success">
                    <CurrencyDisplay value={clientsBilling.totalPaidUSD - (paidCreatorPaymentUSD + paidEditorPaymentUSD)} currency="USD" size="sm" />
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: UP SYSTEM */}
          <TabsContent value="up" className="space-y-4 mt-0">
            {/* Active Season Banner */}
            {currentOrgId && (
              <ActiveSeasonBanner />
            )}

            {/* UP System KPIs */}
            {currentOrgId && (
              <UPSystemKPIs organizationId={currentOrgId} />
            )}

            {/* Kreoon Social Collaborative Stats */}
            {currentOrgId && (
              <CollaborativeStats organizationId={currentOrgId} />
            )}

            {/* Placeholder for future UP features */}
            <div className="rounded-sm border border-border/50 bg-card p-6 text-center">
              <Zap className="h-12 w-12 mx-auto text-primary/50 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Sistema UP Activo</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                El sistema de puntos UP está funcionando. Los creadores y editores ganan puntos basados en su desempeño y tiempos de entrega.
              </p>
            </div>
          </TabsContent>

          {/* TAB 4: USUARIOS Y REFERIDOS */}
          <TabsContent value="usuarios" className="space-y-4 mt-0">
            {/* Team Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div onClick={() => openListDialog('Creadores Activos', 'creators', { profiles: activeCreators })}
                className="p-5 rounded-sm bg-info/10 border border-info/20 cursor-pointer hover:bg-info/20 transition-colors text-center">
                <Users className="h-8 w-8 mx-auto text-info mb-2" />
                <p className="text-3xl font-bold text-info">{activeCreators.length}</p>
                <p className="text-sm text-muted-foreground">Creadores Activos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {content.filter(c => c.creator_id).length} contenidos asignados
                </p>
              </div>
              <div onClick={() => openListDialog('Editores Activos', 'editors', { profiles: activeEditors })}
                className="p-5 rounded-sm bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/20 transition-colors text-center">
                <Scissors className="h-8 w-8 mx-auto text-warning mb-2" />
                <p className="text-3xl font-bold text-warning">{activeEditors.length}</p>
                <p className="text-sm text-muted-foreground">Editores Activos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {content.filter(c => c.editor_id).length} contenidos asignados
                </p>
              </div>
              <div onClick={() => openListDialog('Clientes Activos', 'clients', { clients: activeClients })}
                className="p-5 rounded-sm bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors text-center">
                <Building2 className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-3xl font-bold text-primary">{activeClients.length}</p>
                <p className="text-sm text-muted-foreground">Clientes Activos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {packages.length} paquetes activos
                </p>
              </div>
            </div>

            {/* Team Performance Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Creators */}
              <div className="rounded-sm border border-border/50 bg-card p-5">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-info" />
                  Top Creadores
                </h3>
                <div className="space-y-2">
                  {activeCreators.slice(0, 5).map((creator, index) => (
                    <div key={creator.id} className="flex items-center justify-between p-2 rounded-sm bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-6">{index + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{creator.full_name}</p>
                          <p className="text-xs text-muted-foreground">{creator.content_count || 0} contenidos</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-success">
                        <CurrencyDisplay value={creator.total_payment || 0} currency="COP" size="sm" />
                      </span>
                    </div>
                  ))}
                  {activeCreators.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay creadores activos en este período</p>
                  )}
                </div>
              </div>

              {/* Top Editors */}
              <div className="rounded-sm border border-border/50 bg-card p-5">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-warning" />
                  Top Editores
                </h3>
                <div className="space-y-2">
                  {activeEditors.slice(0, 5).map((editor, index) => (
                    <div key={editor.id} className="flex items-center justify-between p-2 rounded-sm bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-6">{index + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{editor.full_name}</p>
                          <p className="text-xs text-muted-foreground">{editor.content_count || 0} contenidos</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-success">
                        <CurrencyDisplay value={editor.total_payment || 0} currency="COP" size="sm" />
                      </span>
                    </div>
                  ))}
                  {activeEditors.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay editores activos en este período</p>
                  )}
                </div>
              </div>
            </div>

            {/* Referral Stats */}
            <div className="rounded-sm border border-border/50 bg-card p-5">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Programa de Referidos
              </h3>
              <ReferralStats />
            </div>
          </TabsContent>

          {/* TAB 5: MARKETPLACE */}
          <TabsContent value="marketplace" className="space-y-3 mt-0">
            <MarketplaceDashboardTab role="admin" />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <UnifiedProjectModal
        source="content"
        projectId={selectedContent?.id}
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
        onUpdate={refetch}
        onDelete={handleDeleteContent}
      />

      <TechKpiDialog
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
            const goalQuery = supabase
              .from('goals')
              .select('*')
              .eq('period_type', 'month')
              .eq('period_value', currentMonth)
              .eq('year', currentYear);
            
            const { data } = await goalQuery.maybeSingle();
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