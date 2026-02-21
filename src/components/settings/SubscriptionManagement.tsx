import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Crown, Loader2, Search, UserCog, Building2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

interface OrgSubscription {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  tier: string;
  status: string;
  current_price: number;
  billing_cycle: string;
  current_period_end: string | null;
  created_at: string;
  org_name?: string;
  owner_name?: string;
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

const TIER_LABELS: Record<string, string> = {
  free: "Gratis",
  starter: "Starter",
  org_basic: "Org Básico",
  org_pro: "Org Pro",
  org_enterprise: "Enterprise",
  creator_basic: "Creator Básico",
  creator_pro: "Creator Pro",
};

const TIER_COLORS: Record<string, string> = {
  free: "bg-gray-500/10 text-gray-500",
  starter: "bg-blue-500/10 text-blue-500",
  org_basic: "bg-blue-500/10 text-blue-500",
  org_pro: "bg-purple-500/10 text-purple-500",
  org_enterprise: "bg-amber-500/10 text-amber-500",
  creator_basic: "bg-teal-500/10 text-teal-500",
  creator_pro: "bg-indigo-500/10 text-indigo-500",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  trialing: "Prueba",
  past_due: "Vencido",
  cancelled: "Cancelado",
  expired: "Expirado",
  pending: "Pendiente",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  trialing: "bg-blue-500/10 text-blue-500",
  past_due: "bg-red-500/10 text-red-500",
  cancelled: "bg-red-500/10 text-red-500",
  expired: "bg-gray-500/10 text-gray-500",
  pending: "bg-yellow-500/10 text-yellow-500",
};

export function SubscriptionManagement() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Get all platform subscriptions with org names (admin only)
  const { data: subscriptions = [], isLoading: loadingSubscriptions } = useQuery({
    queryKey: ["all-platform-subscriptions"],
    queryFn: async () => {
      const { data: subs, error: subsError } = await (supabase as any)
        .from("platform_subscriptions")
        .select("id, organization_id, user_id, tier, status, current_price, billing_cycle, current_period_end, created_at")
        .order("created_at", { ascending: false });

      if (subsError) throw subsError;
      if (!subs?.length) return [];

      // Get org names
      const orgIds = [...new Set(subs.map((s: any) => s.organization_id).filter(Boolean))];
      const userIds = [...new Set(subs.map((s: any) => s.user_id).filter(Boolean))];

      let orgMap = new Map<string, string>();
      if (orgIds.length > 0) {
        const { data: orgs } = await (supabase as any)
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);
        orgMap = new Map((orgs || []).map((o: any) => [o.id, o.name]));
      }

      let userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        userMap = new Map((profiles || []).map(p => [p.id, p.full_name || "—"]));
      }

      return subs.map((sub: any) => ({
        ...sub,
        org_name: sub.organization_id ? orgMap.get(sub.organization_id) || "—" : null,
        owner_name: sub.user_id ? userMap.get(sub.user_id) || "—" : null,
      })) as OrgSubscription[];
    },
    enabled: isAdmin,
  });

  // Get all referrals (admin only)
  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ["all-referrals"],
    queryFn: async () => {
      const { data: refs, error: refsError } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (refsError) throw refsError;
      if (!refs?.length) return [];

      const referrerIds = [...new Set(refs.map(r => r.referrer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", referrerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return refs.map(ref => ({
        ...ref,
        referrer: profileMap.get(ref.referrer_id) || null
      })) as unknown as Referral[];
    },
    enabled: isAdmin,
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
      toast.success("Comision actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar comision");
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
    (sub.org_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sub.owner_name || "").toLowerCase().includes(searchTerm.toLowerCase())
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
        <p>Solo administradores pueden ver esta seccion</p>
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
          placeholder="Buscar por organizacion o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Subscriptions (read-only, Stripe-managed) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Suscripciones por Organizacion
          </CardTitle>
          <CardDescription>
            Planes gestionados via Stripe. Los cambios se realizan desde la pagina de planes de cada organizacion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay suscripciones activas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organizacion / Usuario</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Periodo hasta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.org_name || sub.owner_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={TIER_COLORS[sub.tier] || "bg-gray-500/10 text-gray-500"}>
                        {TIER_LABELS[sub.tier] || sub.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>${sub.current_price?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[sub.status] || "bg-gray-500/10 text-gray-500"}>
                        {STATUS_LABELS[sub.status] || sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.current_period_end
                        ? format(new Date(sub.current_period_end), "dd MMM yyyy", { locale: es })
                        : "—"}
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
            Gestion de Referidos
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
                  <TableHead>Codigo</TableHead>
                  <TableHead>Comision %</TableHead>
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
