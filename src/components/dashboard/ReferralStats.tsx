import { useState, useEffect } from "react";
import { Users, DollarSign, Clock, CreditCard, User, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ReferralStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    pendingReferrals: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    totalUsers: 0,
    freeUsers: 0,
    subscribedUsers: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch total profiles count
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch active non-free platform subscriptions → get org IDs
      const { data: orgSubs } = await (supabase as never)
        .from('platform_subscriptions')
        .select('organization_id')
        .not('tier', 'in', '(brand_free,creator_free)')
        .eq('status', 'active');

      const subscribedOrgIds = (orgSubs || []).map((s: { organization_id: string }) => s.organization_id).filter(Boolean);

      // 3. Count members of those orgs
      let subscribedUsers = 0;
      if (subscribedOrgIds.length > 0) {
        const { count } = await (supabase as never)
          .from('organization_members')
          .select('user_id', { count: 'exact', head: true })
          .in('organization_id', subscribedOrgIds);
        subscribedUsers = count || 0;
      }

      const totalUsers = profilesCount || 0;
      const freeUsers = Math.max(0, totalUsers - subscribedUsers);

      setStats(prev => ({
        ...prev,
        totalUsers,
        freeUsers,
        subscribedUsers,
      }));

      // 4. Fetch referral stats from unified system (referral_relationships)
      const { data: referralsData } = await supabase
        .from('referral_relationships')
        .select('status');

      if (referralsData) {
        const totalReferrals = referralsData.length;
        const activeReferrals = referralsData.filter(r => r.status === 'active').length;
        const pendingReferrals = referralsData.filter(r => r.status === 'pending').length;

        setStats(prev => ({
          ...prev,
          totalReferrals,
          activeReferrals,
          pendingReferrals
        }));
      }

      // 5. Fetch commission stats from unified system (referral_earnings)
      const { data: earningsData } = await supabase
        .from('referral_earnings')
        .select('commission_amount, status');

      if (earningsData) {
        const totalCommissions = earningsData.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
        const pendingCommissions = earningsData.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0);
        const paidCommissions = earningsData.filter(c => c.status === 'credited').reduce((sum, c) => sum + (c.commission_amount || 0), 0);

        setStats(prev => ({
          ...prev,
          totalCommissions,
          pendingCommissions,
          paidCommissions
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total Users - Nova */}
      <Card className="bg-[var(--nova-bg-elevated)] border-[var(--nova-border-accent)] nova-hover-glow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-[rgba(139,92,246,0.2)]">
              <Users className="h-5 w-5 text-[var(--nova-accent-primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--nova-text-bright)]">{stats.totalUsers}</p>
              <p className="text-xs text-[var(--nova-text-secondary)]">Total Usuarios</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Free Users - Nova */}
      <Card className="bg-[var(--nova-bg-elevated)] border-[var(--nova-border-subtle)] nova-hover-glow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-[var(--nova-bg-surface)]">
              <User className="h-5 w-5 text-[var(--nova-text-secondary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--nova-text-bright)]">{stats.freeUsers}</p>
              <p className="text-xs text-[var(--nova-text-secondary)]">Sin Plan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscribed Users - Nova */}
      <Card className="bg-[var(--nova-bg-elevated)] border-[var(--nova-border-accent)] nova-hover-glow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-[rgba(139,92,246,0.2)]">
              <Building2 className="h-5 w-5 text-[var(--nova-accent-primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--nova-text-bright)]">{stats.subscribedUsers}</p>
              <p className="text-xs text-[var(--nova-text-secondary)]">Con Plan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Referrals - Nova */}
      <Card className="bg-[var(--nova-bg-elevated)] border-[var(--nova-info-bg)] nova-hover-glow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-[var(--nova-info-bg)]">
              <CreditCard className="h-5 w-5 text-[var(--nova-info)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--nova-text-bright)]">{stats.totalReferrals}</p>
              <p className="text-xs text-[var(--nova-text-secondary)]">Referidos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Commissions - Nova */}
      <Card className="bg-[var(--nova-bg-elevated)] border-[var(--nova-warning-bg)] nova-hover-glow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-[var(--nova-warning-bg)]">
              <Clock className="h-5 w-5 text-[var(--nova-warning)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--nova-text-bright)]">${stats.pendingCommissions.toLocaleString()}</p>
              <p className="text-xs text-[var(--nova-text-secondary)]">Comisiones Pend.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paid Commissions - Nova */}
      <Card className="bg-[var(--nova-bg-elevated)] border-[var(--nova-success-bg)] nova-hover-glow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-[var(--nova-success-bg)]">
              <DollarSign className="h-5 w-5 text-[var(--nova-success)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--nova-text-bright)]">${stats.paidCommissions.toLocaleString()}</p>
              <p className="text-xs text-[var(--nova-text-secondary)]">Comisiones Pag.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
