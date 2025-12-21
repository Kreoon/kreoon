import { useState, useEffect } from "react";
import { Users, User, CreditCard, Gift, CheckCircle, Search, DollarSign, UserPlus, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UserWithSubscription {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  subscription?: {
    id: string;
    plan: string;
    status: string;
    price: number;
    started_at: string;
    expires_at: string | null;
    notes: string | null;
  };
  isPaid: boolean;
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

export function UserPlansManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserWithSubscription[]>([]);
  const [referrals, setReferrals] = useState<ReferralWithDetails[]>([]);
  const [commissions, setCommissions] = useState<CommissionWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    freeUsers: 0,
    basicUsers: 0,
    proUsers: 0,
    paidUsers: 0,
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
      // Fetch ALL profiles (users)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name');

      // Fetch all subscriptions
      const { data: subsData } = await supabase
        .from('user_subscriptions')
        .select('*');

      const subsMap = new Map(subsData?.map(s => [s.user_id, s]));

      // Create subscription for users who don't have one
      const usersWithoutSub = profiles?.filter(p => !subsMap.has(p.id)) || [];
      
      if (usersWithoutSub.length > 0) {
        const newSubs = usersWithoutSub.map(u => ({
          user_id: u.id,
          plan: 'free' as const,
          status: 'active' as const,
          price: 0
        }));

        const { data: insertedSubs } = await supabase
          .from('user_subscriptions')
          .insert(newSubs)
          .select();

        if (insertedSubs) {
          insertedSubs.forEach(s => subsMap.set(s.user_id, s));
        }
      }

      // Combine profiles with subscriptions
      const usersWithSubs: UserWithSubscription[] = (profiles || []).map(p => {
        const sub = subsMap.get(p.id);
        return {
          ...p,
          subscription: sub,
          isPaid: (sub?.price || 0) > 0 || sub?.notes?.includes('[PAID]') || false
        };
      });

      setAllUsers(usersWithSubs);

      // Calculate user stats
      const totalUsers = usersWithSubs.length;
      const freeUsers = usersWithSubs.filter(u => u.subscription?.plan === 'free' || !u.subscription).length;
      const basicUsers = usersWithSubs.filter(u => u.subscription?.plan === 'basic').length;
      const proUsers = usersWithSubs.filter(u => u.subscription?.plan === 'pro').length;
      const paidUsers = usersWithSubs.filter(u => u.isPaid).length;

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
        totalUsers, freeUsers, basicUsers, proUsers, paidUsers,
        totalReferrals, activeReferrals, totalCommissions, pendingCommissions, paidCommissions
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: string, plan: string) => {
    setUpdatingUser(userId);
    try {
      const user = allUsers.find(u => u.id === userId);
      if (!user?.subscription?.id) {
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan: plan as 'free' | 'basic' | 'pro',
            status: 'active',
            price: 0
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_subscriptions')
          .update({ plan: plan as 'free' | 'basic' | 'pro' })
          .eq('id', user.subscription.id);

        if (error) throw error;
      }

      toast({
        title: "Plan actualizado",
        description: `Plan cambiado a ${plan === 'free' ? 'Gratis' : plan === 'basic' ? 'Básico' : 'Pro'}`,
      });

      fetchData();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el plan",
        variant: "destructive"
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const togglePaidStatus = async (userId: string, isPaid: boolean) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user?.subscription?.id) return;

    try {
      const currentNotes = user.subscription.notes || '';
      const newNotes = isPaid 
        ? (currentNotes.includes('[PAID]') ? currentNotes : `[PAID] ${currentNotes}`.trim())
        : currentNotes.replace('[PAID]', '').trim();

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ notes: newNotes || null })
        .eq('id', user.subscription.id);

      if (error) throw error;

      setAllUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, isPaid, subscription: { ...u.subscription!, notes: newNotes || null } }
          : u
      ));

      setStats(prev => ({
        ...prev,
        paidUsers: isPaid ? prev.paidUsers + 1 : prev.paidUsers - 1
      }));

      toast({
        title: isPaid ? "Marcado como cobrado" : "Marcado como no cobrado",
        description: `${user.full_name} ${isPaid ? 'ha sido marcado como cobrado' : 'ha sido marcado como pendiente de cobro'}`,
      });
    } catch (error) {
      console.error('Error updating paid status:', error);
    }
  };

  const updateUserPrice = async (userId: string, price: number) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user?.subscription?.id) return;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ price })
        .eq('id', user.subscription.id);

      if (error) throw error;

      setAllUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, subscription: { ...u.subscription!, price } }
          : u
      ));
    } catch (error) {
      console.error('Error updating price:', error);
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
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <p className="text-xs text-muted-foreground">Free</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-info/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/20">
                <CreditCard className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.basicUsers}</p>
                <p className="text-xs text-muted-foreground">Básico</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.proUsers}</p>
                <p className="text-xs text-muted-foreground">Pro</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.paidUsers}</p>
                <p className="text-xs text-muted-foreground">Cobrados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/20">
                <UserPlus className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                <p className="text-xs text-muted-foreground">Referidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
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

        <Card className="border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.pendingCommissions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Por Pagar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.paidCommissions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Pagadas</p>
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
              placeholder="Buscar usuario por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className={cn(
                "transition-all hover:shadow-md",
                user.subscription?.plan === 'pro' && "border-primary/30 bg-primary/5",
                user.subscription?.plan === 'basic' && "border-info/30 bg-info/5",
                user.isPaid && "ring-2 ring-success/30"
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
                    {user.isPaid && (
                      <Badge className="bg-success/20 text-success border-success/30 shrink-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Cobrado
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm text-muted-foreground">Plan:</Label>
                      <Select
                        value={user.subscription?.plan || 'free'}
                        onValueChange={(value) => updateUserPlan(user.id, value)}
                        disabled={updatingUser === user.id}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm text-muted-foreground">Precio:</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={user.subscription?.price || 0}
                          onChange={(e) => updateUserPrice(user.id, Number(e.target.value))}
                          className="w-20 h-8 text-right"
                          min={0}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <Label className="text-sm font-medium">¿Cobrado?</Label>
                      <Switch
                        checked={user.isPaid}
                        onCheckedChange={(checked) => togglePaidStatus(user.id, checked)}
                      />
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
                        <TableHead>Código</TableHead>
                        <TableHead>Comisión %</TableHead>
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
