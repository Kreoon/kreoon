import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrgFinanceOverview {
  // Agencia (paquetes clientes)
  agency_sold: number;
  agency_collected: number;
  agency_pending: number;
  // Marketplace
  mp_revenue: number;
  mp_creator_cost: number;
  mp_editor_cost: number;
  mp_platform_fee: number;
  mp_projects_count: number;
  // Costos
  costs_operative: number;
  costs_package: number;
  payroll: number;
  // Totales
  total_revenue: number;
  total_costs: number;
  net_profit: number;
  margin_pct: number;
  packages_sold: number;
  payments_count: number;
  overdue_count: number;
  overdue_amount: number;
}

export interface OrgPayrollOverview {
  to_settle: number;
  in_transfer: number;
  paid_in_period: number;
  avg_payment: number;
  talents_paid: number;
  overdue_count: number;
  overdue_amount: number;
}

export interface OrgCostsOverview {
  total_costs: number;
  income_in_period: number;
  pct_of_income: number;
  top_category: string | null;
  top_category_amount: number;
  linked_amount: number;
  general_amount: number;
  costs_by_category: Array<{ category: string; total: number }>;
}

export type HealthLevel = 'excelente' | 'saludable' | 'vigilar' | 'en_riesgo' | 'critico';

export interface FinancialHealth {
  score: number;
  level: HealthLevel;
  factors: Array<{ name: string; impact: string; detail: string }>;
  recommendations: Array<{ priority: 'critica' | 'alta' | 'media' | 'baja'; action: string; impact_potencial: number }>;
}

export interface FinancialAnomaly {
  anomaly_type: string;
  severity: 'critica' | 'alta' | 'media' | 'baja';
  title: string;
  detail: string;
  related_id: string | null;
  amount: number;
}

const num = (v: unknown): number => typeof v === 'number' ? v : Number(v ?? 0);

export function useOrgFinanceOverview(
  orgId: string | undefined,
  startDate: string,
  endDate: string,
  currency: string = 'COP',
) {
  return useQuery({
    queryKey: ['org-finance-overview', orgId, startDate, endDate, currency],
    queryFn: async (): Promise<OrgFinanceOverview> => {
      const { data, error } = await (supabase as any).rpc('get_org_finance_overview', {
        p_org_id: orgId, p_start: startDate, p_end: endDate, p_currency: currency,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        agency_sold: num(row?.agency_sold),
        agency_collected: num(row?.agency_collected),
        agency_pending: num(row?.agency_pending),
        mp_revenue: num(row?.mp_revenue),
        mp_creator_cost: num(row?.mp_creator_cost),
        mp_editor_cost: num(row?.mp_editor_cost),
        mp_platform_fee: num(row?.mp_platform_fee),
        mp_projects_count: num(row?.mp_projects_count),
        costs_operative: num(row?.costs_operative),
        costs_package: num(row?.costs_package),
        payroll: num(row?.payroll),
        total_revenue: num(row?.total_revenue),
        total_costs: num(row?.total_costs),
        net_profit: num(row?.net_profit),
        margin_pct: num(row?.margin_pct),
        packages_sold: num(row?.packages_sold),
        payments_count: num(row?.payments_count),
        overdue_count: num(row?.overdue_count),
        overdue_amount: num(row?.overdue_amount),
      };
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useOrgPayrollOverview(
  orgId: string | undefined, startDate: string, endDate: string,
) {
  return useQuery({
    queryKey: ['org-payroll-overview', orgId, startDate, endDate],
    queryFn: async (): Promise<OrgPayrollOverview> => {
      const { data, error } = await (supabase as any).rpc('get_org_payroll_overview', {
        p_org_id: orgId, p_start: startDate, p_end: endDate,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        to_settle: num(row?.to_settle),
        in_transfer: num(row?.in_transfer),
        paid_in_period: num(row?.paid_in_period),
        avg_payment: num(row?.avg_payment),
        talents_paid: num(row?.talents_paid),
        overdue_count: num(row?.overdue_count),
        overdue_amount: num(row?.overdue_amount),
      };
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useOrgCostsOverview(
  orgId: string | undefined, startDate: string, endDate: string, currency: string = 'COP',
) {
  return useQuery({
    queryKey: ['org-costs-overview', orgId, startDate, endDate, currency],
    queryFn: async (): Promise<OrgCostsOverview> => {
      const { data, error } = await (supabase as any).rpc('get_org_costs_overview', {
        p_org_id: orgId, p_start: startDate, p_end: endDate, p_currency: currency,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total_costs: num(row?.total_costs),
        income_in_period: num(row?.income_in_period),
        pct_of_income: num(row?.pct_of_income),
        top_category: row?.top_category ?? null,
        top_category_amount: num(row?.top_category_amount),
        linked_amount: num(row?.linked_amount),
        general_amount: num(row?.general_amount),
        costs_by_category: (row?.costs_by_category ?? []) as Array<{ category: string; total: number }>,
      };
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useOrgFinancialHealth(orgId: string | undefined, currency: string = 'COP') {
  return useQuery({
    queryKey: ['org-financial-health', orgId, currency],
    queryFn: async (): Promise<FinancialHealth> => {
      const { data, error } = await (supabase as any).rpc('get_org_financial_health', {
        p_org_id: orgId, p_currency: currency,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        score: num(row?.score),
        level: (row?.level ?? 'vigilar') as HealthLevel,
        factors: (row?.factors ?? []) as FinancialHealth['factors'],
        recommendations: (row?.recommendations ?? []) as FinancialHealth['recommendations'],
      };
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useOrgFinancialAnomalies(orgId: string | undefined, currency: string = 'COP') {
  return useQuery({
    queryKey: ['org-financial-anomalies', orgId, currency],
    enabled: !!orgId,
    queryFn: async (): Promise<FinancialAnomaly[]> => {
      const { data, error } = await (supabase as any).rpc('get_org_financial_anomalies', {
        p_org_id: orgId!, p_currency: currency,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => ({
        anomaly_type: r.anomaly_type,
        severity: r.severity,
        title: r.title,
        detail: r.detail,
        related_id: r.related_id,
        amount: num(r.amount),
      }));
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}
