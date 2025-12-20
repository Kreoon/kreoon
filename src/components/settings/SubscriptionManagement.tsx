import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Crown, Loader2, Search, UserCog } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

interface UserSubscription {
  id: string;
  user_id: string;
  plan: "free" | "basic" | "pro";
  status: "active" | "cancelled" | "expired" | "pending";
  price: number;
  started_at: string;
  expires_at: string | null;
  notes: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_user_id: string | null;
  referral_code: string;
  commission_percentage: number;
  status: string;
  created_at: string;
  referrer?: {
    full_name: string;
    email: string;
  };
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratis",
  basic: "Básico",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-500/10 text-gray-500",
  basic: "bg-blue-500/10 text-blue-500",
  pro: "bg-purple-500/10 text-purple-500",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  cancelled: "Cancelado",
  expired: "Expirado",
  pending: "Pendiente",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
  expired: "bg-gray-500/10 text-gray-500",
  pending: "bg-yellow-500/10 text-yellow-500",
};

export function SubscriptionManagement() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Get all subscriptions with profiles (admin only)
  const { data: subscriptions = [], isLoading: loadingSubscriptions } = useQuery({
    queryKey: ["all-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as unknown as UserSubscription[];
    },
    enabled: isAdmin,
  });

  // Get all referrals (admin only)
  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ["all-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select(`
          *,
          referrer:referrer_id (full_name, email)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as unknown as Referral[];
    },
    enabled: isAdmin,
  });

  // Update subscription mutation
  const updateSubscription = useMutation({
    mutationFn: async ({ id, plan, price }: { id: string; plan: string; price?: number }) => {
      const updates: Record<string, unknown> = { plan };
      if (price !== undefined) updates.price = price;
      
      const { error } = await supabase
        .from("user_subscriptions")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-subscriptions"] });
      toast.success("Plan actualizado correctamente");
    },
    onError: () => {
      toast.error("Error al actualizar el plan");
    },
  });

  // Update referral commission mutation
  const updateCommission = useMutation({
    mutationFn: async ({ id, commission_percentage }: { id: string; commission_percentage: number }) => {
      const { error } = await supabase
        .from("referrals")
        .update({ commission_percentage })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-referrals"] });
      toast.success("Comisión actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar comisión");
    },
  });

  // Update referral status mutation
  const updateReferralStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("referrals")
        .update({ status })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-referrals"] });
      toast.success("Estado actualizado");
    },
    onError: () => {
      toast.error("Error al actualizar estado");
    },
  });

  const filteredSubscriptions = subscriptions.filter(sub => 
    sub.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReferrals = referrals.filter(ref =>
    ref.referred_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.referrer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.referrer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Solo administradores pueden ver esta sección</p>
      </div>
    );
  }

  if (loadingSubscriptions || loadingReferrals) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Subscriptions Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Gestión de Planes
          </CardTitle>
          <CardDescription>
            Asigna planes Free, Básico o Pro a los usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay suscripciones</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.profiles?.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.profiles?.email}</TableCell>
                    <TableCell>
                      <Select
                        value={sub.plan}
                        onValueChange={(value) => updateSubscription.mutate({ id: sub.id, plan: value })}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Gratis</SelectItem>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={sub.price}
                        onChange={(e) => updateSubscription.mutate({ id: sub.id, plan: sub.plan, price: Number(e.target.value) })}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[sub.status]}>
                        {STATUS_LABELS[sub.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(sub.started_at), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Referrals Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Gestión de Referidos
          </CardTitle>
          <CardDescription>
            Administra las comisiones de referidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReferrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay referidos registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referidor</TableHead>
                  <TableHead>Email Referido</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Comisión %</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReferrals.map((ref) => (
                  <TableRow key={ref.id}>
                    <TableCell className="font-medium">{ref.referrer?.full_name || ref.referrer?.email || "—"}</TableCell>
                    <TableCell>{ref.referred_email}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">{ref.referral_code}</code>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={ref.commission_percentage}
                        onChange={(e) => updateCommission.mutate({ id: ref.id, commission_percentage: Number(e.target.value) })}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={ref.status}
                        onValueChange={(value) => updateReferralStatus.mutate({ id: ref.id, status: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="paid">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(ref.created_at), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
