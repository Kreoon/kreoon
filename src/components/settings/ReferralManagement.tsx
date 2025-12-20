import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Users, DollarSign, UserPlus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Referral {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_user_id: string | null;
  referral_code: string;
  commission_percentage: number;
  status: string;
  registered_at: string | null;
  created_at: string;
}

interface Commission {
  id: string;
  amount: number;
  source_amount: number;
  commission_percentage: number;
  description: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export function ReferralManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newReferralEmail, setNewReferralEmail] = useState("");

  // Get user's referral code
  const { data: referralCode, isLoading: loadingCode } = useQuery({
    queryKey: ["user-referral-code", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Check if user already has referrals
      const { data: existingReferral } = await supabase
        .from("referrals")
        .select("referral_code")
        .eq("referrer_id", user.id)
        .limit(1)
        .maybeSingle();
      
      if (existingReferral) {
        return existingReferral.referral_code;
      }
      
      // Generate new code
      const { data, error } = await supabase.rpc("generate_referral_code");
      if (error) throw error;
      return data as string;
    },
    enabled: !!user?.id,
  });

  // Get user's referrals
  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ["user-referrals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!user?.id,
  });

  // Get user's commissions
  const { data: commissions = [], isLoading: loadingCommissions } = useQuery({
    queryKey: ["user-commissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_commissions")
        .select("*")
        .eq("referrer_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!user?.id,
  });

  // Create referral mutation
  const createReferral = useMutation({
    mutationFn: async (email: string) => {
      if (!user?.id || !referralCode) throw new Error("No user or code");
      
      const { error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: user.id,
          referred_email: email,
          referral_code: referralCode,
          status: "pending",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-referrals"] });
      setNewReferralEmail("");
      toast.success("Referido agregado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al agregar referido");
    },
  });

  const copyReferralLink = () => {
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado al portapapeles");
  };

  const totalEarnings = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingEarnings = commissions.filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.amount), 0);
  const confirmedReferrals = referrals.filter(r => r.status === "confirmed").length;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500",
      confirmed: "bg-green-500/10 text-green-500",
      paid: "bg-blue-500/10 text-blue-500",
    };
    const labels: Record<string, string> = {
      pending: "Pendiente",
      confirmed: "Confirmado",
      paid: "Pagado",
    };
    return <Badge className={styles[status] || ""}>{labels[status] || status}</Badge>;
  };

  if (loadingCode || loadingReferrals) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referidos Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referrals.length}</div>
            <p className="text-xs text-muted-foreground">
              {confirmedReferrals} confirmados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancias Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${pendingEarnings.toLocaleString()} pendientes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tu Código</CardTitle>
            <Copy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="text-xl font-bold font-mono">{referralCode}</code>
              <Button variant="ghost" size="icon" onClick={copyReferralLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Referral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar Referido
          </CardTitle>
          <CardDescription>
            Ingresa el email de la persona que quieres referir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (newReferralEmail) createReferral.mutate(newReferralEmail);
            }}
            className="flex gap-2"
          >
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              value={newReferralEmail}
              onChange={(e) => setNewReferralEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={createReferral.isPending || !newReferralEmail}>
              {createReferral.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Referidos</CardTitle>
          <CardDescription>Lista de personas que has referido a la plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aún no tienes referidos</p>
              <p className="text-sm">Comparte tu código para empezar a ganar comisiones</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">{referral.referred_email}</TableCell>
                    <TableCell>{referral.commission_percentage}%</TableCell>
                    <TableCell>{getStatusBadge(referral.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(referral.created_at), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Commissions List */}
      {commissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mis Comisiones</CardTitle>
            <CardDescription>Historial de comisiones ganadas por referidos</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto Base</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-medium">{commission.description || "Comisión por referido"}</TableCell>
                    <TableCell>${Number(commission.source_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      ${Number(commission.amount).toLocaleString()} ({commission.commission_percentage}%)
                    </TableCell>
                    <TableCell>{getStatusBadge(commission.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(commission.created_at), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
