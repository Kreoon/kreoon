import { useState, useEffect } from "react";
import { Users, DollarSign, UserPlus, CheckCircle, Clock, XCircle, CreditCard, User, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export function ReferralStats() {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<ReferralWithDetails[]>([]);
  const [commissions, setCommissions] = useState<CommissionWithDetails[]>([]);
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

      // Fetch all referrals
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (referralsData) {
        const referrerIds = [...new Set(referralsData.map(r => r.referrer_id))];
        const referredIds = referralsData.map(r => r.referred_user_id).filter(Boolean) as string[];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', [...referrerIds, ...referredIds]);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]));

        const enrichedReferrals = referralsData.map(r => ({
          ...r,
          referrer: profilesMap.get(r.referrer_id),
          referred_user: r.referred_user_id ? profilesMap.get(r.referred_user_id) : undefined
        }));

        setReferrals(enrichedReferrals);

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

      // Fetch all commissions
      const { data: commissionsData } = await supabase
        .from('referral_commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (commissionsData) {
        const referrerIds = [...new Set(commissionsData.map(c => c.referrer_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', referrerIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]));

        const enrichedCommissions = commissionsData.map(c => ({
          ...c,
          referrer: profilesMap.get(c.referrer_id)
        }));

        setCommissions(enrichedCommissions);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
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
                <p className="text-xs text-muted-foreground">Comisiones Pendientes</p>
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
                <p className="text-xs text-muted-foreground">Comisiones Pagadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="referrals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referrals">
            <UserPlus className="w-4 h-4 mr-2" />
            Referidos ({referrals.length})
          </TabsTrigger>
          <TabsTrigger value="commissions">
            <DollarSign className="w-4 h-4 mr-2" />
            Comisiones ({commissions.length})
          </TabsTrigger>
        </TabsList>

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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referidor</TableHead>
                      <TableHead>Email Referido</TableHead>
                      <TableHead>Usuario Referido</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Comisión %</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Registro</TableHead>
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
                        <TableCell>
                          {referral.registered_at 
                            ? new Date(referral.registered_at).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referidor</TableHead>
                      <TableHead>Monto Origen</TableHead>
                      <TableHead>% Comisión</TableHead>
                      <TableHead>Comisión</TableHead>
                      <TableHead>Descripción</TableHead>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
