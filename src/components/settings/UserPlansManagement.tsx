import { useState, useEffect } from "react";
import { Users, User, CreditCard, Gift, CheckCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function UserPlansManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserWithSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    freeUsers: 0,
    basicUsers: 0,
    proUsers: 0,
    paidUsers: 0
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
          // Consider "paid" if price > 0 or if notes contains "[PAID]"
          isPaid: (sub?.price || 0) > 0 || sub?.notes?.includes('[PAID]') || false
        };
      });

      setAllUsers(usersWithSubs);

      // Calculate stats
      const totalUsers = usersWithSubs.length;
      const freeUsers = usersWithSubs.filter(u => u.subscription?.plan === 'free' || !u.subscription).length;
      const basicUsers = usersWithSubs.filter(u => u.subscription?.plan === 'basic').length;
      const proUsers = usersWithSubs.filter(u => u.subscription?.plan === 'pro').length;
      const paidUsers = usersWithSubs.filter(u => u.isPaid).length;

      setStats({ totalUsers, freeUsers, basicUsers, proUsers, paidUsers });
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
      // Use notes field to track paid status
      const currentNotes = user.subscription.notes || '';
      const newNotes = isPaid 
        ? (currentNotes.includes('[PAID]') ? currentNotes : `[PAID] ${currentNotes}`.trim())
        : currentNotes.replace('[PAID]', '').trim();

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ notes: newNotes || null })
        .eq('id', user.subscription.id);

      if (error) throw error;

      // Update local state
      setAllUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, isPaid, subscription: { ...u.subscription!, notes: newNotes || null } }
          : u
      ));

      // Update stats
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
                <p className="text-xs text-muted-foreground">Total</p>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuario por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Grid */}
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
    </div>
  );
}
