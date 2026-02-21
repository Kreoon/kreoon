import { useState, useEffect } from "react";
import { Users, User, CreditCard, Gift, CheckCircle, Search, DollarSign, UserPlus, Clock, XCircle, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface UserWithOrgPlan {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  org_name: string | null;
  org_tier: string | null;
  org_status: string | null;
}

interface ReferralWithDetails {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_user_id: string | null;
  referral_code: string;
  commission_percentage: number;
  status: string;
  registered_at: string | null;
  created_at: string;
  referrer?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  referred_user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface CommissionWithDetails {
  id: string;
  referral_id: string;
  referrer_id: string;
  amount: number;
  source_amount: number;
  commission_percentage: number;
  description: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  referrer?: {
    full_name: string;
    avatar_url: string | null;
  };
}

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  org_basic: "Org Basico",
  org_pro: "Org Pro",
  org_enterprise: "Enterprise",
  creator_basic: "Creator Basico",
  creator_pro: "Creator Pro",
};

export function UserPlansManagement() {
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserWithOrgPlan[]>([]);
  const [referrals, setReferrals] = useState<ReferralWithDetails[]>([]);
  const [commissions, setCommissions] = useState<CommissionWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    freeUsers: 0,
    subscribedUsers: 0,
    totalReferrals: 0,
    activeReferrals: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch ALL profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name');

      // 2. Fetch org memberships
      const { data: memberships } = await (supabase as any)
        .from('organization_members')
        .select('user_id, organization_id');

      // 3. Fetch platform subscriptions (active, non-free)
      const { data: orgSubs } = await (supabase as any)
        .from('platform_subscriptions')
        .select('organization_id, tier, status')
        .eq('status', 'active');

      // 4. Fetch org names
      const orgIds = [...new Set([
        ...((memberships || []).map((m: any) => m.organization_id)),
        ...((orgSubs || []).map((s: any) => s.organization_id).filter(Boolean)),
      ])];

      let orgMap = new Map<string, string>();
      if (orgIds.length > 0) {
        const { data: orgs } = await (supabase as any)
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        orgMap = new Map((orgs || []).map((o: any) => [o.id, o.name]));
      }

      // Build org → subscription map
      const orgSubMap = new Map<string, { tier: string; status: string }>();
      for (const sub of (orgSubs || [])) {
        if (sub.organization_id) {
          orgSubMap.set(sub.organization_id, { tier: sub.tier, status: sub.status });
        }
      }

      // Build user → org map (pick first org membership)
      const userOrgMap = new Map<string, string>();
      for (const m of (memberships || [])) {
        if (!userOrgMap.has(m.user_id)) {
          userOrgMap.set(m.user_id, m.organization_id);
        }
      }

      // Combine
      const usersWithPlans: UserWithOrgPlan[] = (profiles || []).map(p => {
        const orgId = userOrgMap.get(p.id);
        const sub = orgId ? orgSubMap.get(orgId) : null;
        return {
          ...p,
          org_name: orgId ? orgMap.get(orgId) || null : null,
          org_tier: sub?.tier || null,
          org_status: sub?.status || null,
        };
      });

      setAllUsers(usersWithPlans);

      // Calculate stats
      const totalUsers = usersWithPlans.length;
      const subscribedUsers = usersWithPlans.filter(u => u.org_tier && !u.org_tier.includes('free')).length;
      const freeUsers = totalUsers - subscribedUsers;

      // Fetch referrals
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (referralsData) {
        const referrerIds = [...new Set(referralsData.map(r => r.referrer_id))];
        const referredIds = referralsData.map(r => r.referred_user_id).filter(Boolean) as string[];

        const { data: refProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', [...referrerIds, ...referredIds]);

        const profilesMap = new Map(refProfiles?.map(p => [p.id, p]));

        const enrichedReferrals = referralsData.map(r => ({
          ...r,
          referrer: profilesMap.get(r.referrer_id),
          referred_user: r.referred_user_id ? profilesMap.get(r.referred_user_id) : undefined
        }));

        setReferrals(enrichedReferrals);
      }

      // Fetch commissions
      const { data: commissionsData } = await supabase
        .from('referral_commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (commissionsData) {
        const referrerIds = [...new Set(commissionsData.map(c => c.referrer_id))];
        const { data: commProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', referrerIds);

        const profilesMap = new Map(commProfiles?.map(p => [p.id, p]));

        const enrichedCommissions = commissionsData.map(c => ({
          ...c,
          referrer: profilesMap.get(c.referrer_id)
        }));

        setCommissions(enrichedCommissions);
      }

      // Calculate all stats
      const totalReferrals = referralsData?.length || 0;
      const activeReferrals = referralsData?.filter(r => r.status === 'active').length || 0;
      const totalCommissions = commissionsData?.reduce((sum, c) => sum + c.amount, 0) || 0;
      const pendingCommissions = commissionsData?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0;
      const paidCommissions = commissionsData?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0) || 0;

      setStats({
        totalUsers, freeUsers, subscribedUsers,
        totalReferrals, activeReferrals, totalCommissions, pendingCommissions, paidCommissions
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle className="w-3 h-3 mr-1" /> Activo</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning border-warning/30"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      case 'paid':
        return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle className="w-3 h-3 mr-1" /> Pagado</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredUsers = allUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.org_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.freeUsers}</p>
                <p className="text-xs text-muted-foreground">Sin plan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.subscribedUsers}</p>
                <p className="text-xs text-muted-foreground">Con plan activo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.totalCommissions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Comisiones Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Usuarios ({allUsers.length})
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <UserPlus className="w-4 h-4 mr-2" />
            Referidos ({referrals.length})
          </TabsTrigger>
          <TabsTrigger value="commissions">
            <DollarSign className="w-4 h-4 mr-2" />
            Comisiones ({commissions.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuario por nombre, email u organizacion..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className={cn(
                "transition-all hover:shadow-md",
                user.org_tier && !user.org_tier.includes('free') && "border-primary/30 bg-primary/5",
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback>{user.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Organizacion:</span>
                      <span className="text-sm font-medium truncate max-w-[160px]">
                        {user.org_name || "Sin org"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Plan:</span>
                      <Badge className={cn(
                        "text-xs",
                        user.org_tier && !user.org_tier.includes('free')
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {user.org_tier ? (TIER_LABELS[user.org_tier] || user.org_tier) : "Free"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No se encontraron usuarios
            </p>
          )}
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Referidos</CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay referidos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referidor</TableHead>
                        <TableHead>Email Referido</TableHead>
                        <TableHead>Usuario Referido</TableHead>
                        <TableHead>Codigo</TableHead>
                        <TableHead>Comision %</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={referral.referrer?.avatar_url || ''} />
                                <AvatarFallback>{referral.referrer?.full_name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{referral.referrer?.full_name || 'Desconocido'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{referral.referred_email}</TableCell>
                          <TableCell>
                            {referral.referred_user ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={referral.referred_user.avatar_url || ''} />
                                  <AvatarFallback>{referral.referred_user.full_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <span>{referral.referred_user.full_name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin registrar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-sm">{referral.referral_code}</code>
                          </TableCell>
                          <TableCell>{referral.commission_percentage}%</TableCell>
                          <TableCell>{getStatusBadge(referral.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Comisiones</CardTitle>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay comisiones registradas</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referidor</TableHead>
                        <TableHead>Monto Origen</TableHead>
                        <TableHead>% Comision</TableHead>
                        <TableHead>Comision</TableHead>
                        <TableHead>Descripcion</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={commission.referrer?.avatar_url || ''} />
                                <AvatarFallback>{commission.referrer?.full_name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{commission.referrer?.full_name || 'Desconocido'}</span>
                            </div>
                          </TableCell>
                          <TableCell>${commission.source_amount.toLocaleString()}</TableCell>
                          <TableCell>{commission.commission_percentage}%</TableCell>
                          <TableCell className="font-bold text-success">${commission.amount.toLocaleString()}</TableCell>
                          <TableCell>{commission.description || '-'}</TableCell>
                          <TableCell>{getStatusBadge(commission.status)}</TableCell>
                          <TableCell>
                            {commission.paid_at
                              ? new Date(commission.paid_at).toLocaleDateString()
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
