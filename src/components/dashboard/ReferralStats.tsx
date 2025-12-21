import { useState, useEffect } from "react";
import { Users, DollarSign, CheckCircle, Clock, CreditCard, User, Gift } from "lucide-react";
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
    basicUsers: 0,
    proUsers: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user subscription stats only
      const { data: subsData } = await supabase
        .from('user_subscriptions')
        .select('*');

      // Fetch total profiles count
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (subsData) {
        const freeUsers = subsData.filter(s => s.plan === 'free').length;
        const basicUsers = subsData.filter(s => s.plan === 'basic').length;
        const proUsers = subsData.filter(s => s.plan === 'pro').length;

        setStats(prev => ({
          ...prev,
          totalUsers: profilesCount || subsData.length,
          freeUsers,
          basicUsers,
          proUsers
        }));
      }

      // Fetch referral stats
      const { data: referralsData } = await supabase
        .from('referrals')
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

      // Fetch commission stats
      const { data: commissionsData } = await supabase
        .from('referral_commissions')
        .select('amount, status');

      if (commissionsData) {
        const totalCommissions = commissionsData.reduce((sum, c) => sum + c.amount, 0);
        const pendingCommissions = commissionsData.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
        const paidCommissions = commissionsData.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

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
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Usuarios</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-muted-foreground/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.freeUsers}</p>
              <p className="text-xs text-muted-foreground">Plan Free</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/20">
              <CreditCard className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.basicUsers}</p>
              <p className="text-xs text-muted-foreground">Plan Básico</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.proUsers}</p>
              <p className="text-xs text-muted-foreground">Plan Pro</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">${stats.pendingCommissions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Comisiones Pend.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">${stats.paidCommissions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Comisiones Pag.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
