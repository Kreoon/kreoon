import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Search, Loader2, Plus, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrgOption {
  id: string;
  name: string;
  logo_url: string | null;
}

interface TokenBalance {
  balance_subscription: number;
  balance_purchased: number;
  balance_bonus: number;
  total_consumed: number;
  monthly_allowance: number;
}

async function invokeTokenService<T = any>(action: string, body?: Record<string, any>): Promise<T | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase.functions.invoke(`ai-tokens-service/${action}`, {
    body: body || {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error || data?.error) return null;
  return data as T;
}

function formatTokens(n: number) {
  return n.toLocaleString("es-CO");
}

export function AITokensOrgAdmin() {
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [tokenAmount, setTokenAmount] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [crediting, setCrediting] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("organizations")
          .select("id, name, logo_url")
          .order("name");
        if (searchQuery.trim()) {
          query = query.ilike("name", `%${searchQuery.trim()}%`);
        }
        const { data, error } = await query.limit(50);
        if (error) throw error;
        setOrganizations((data as OrgOption[]) ?? []);
        if (!selectedOrgId && data?.length) {
          setSelectedOrgId(data[0].id);
        }
      } catch (e) {
        console.error(e);
        toast.error("Error al cargar organizaciones");
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedOrgId) {
      setBalance(null);
      return;
    }
    const fetchBalance = async () => {
      try {
        const res = await invokeTokenService<{ success: boolean; balance: any }>("get-balance", {
          organization_id: selectedOrgId,
        });
        if (res?.success && res.balance) {
          setBalance({
            balance_subscription: res.balance.balance_subscription ?? 0,
            balance_purchased: res.balance.balance_purchased ?? 0,
            balance_bonus: res.balance.balance_bonus ?? 0,
            total_consumed: res.balance.total_consumed ?? 0,
            monthly_allowance: res.balance.monthly_allowance ?? 0,
          });
        } else {
          setBalance({
            balance_subscription: 0,
            balance_purchased: 0,
            balance_bonus: 0,
            total_consumed: 0,
            monthly_allowance: 0,
          });
        }
      } catch (e) {
        console.error(e);
        setBalance(null);
      }
    };
    fetchBalance();
  }, [selectedOrgId]);

  const handleCredit = async () => {
    const amount = parseInt(tokenAmount, 10);
    if (!selectedOrgId || isNaN(amount) || amount <= 0) {
      toast.error("Selecciona una organización e ingresa una cantidad válida");
      return;
    }

    setCrediting(true);
    try {
      const res = await invokeTokenService("admin-credit", {
        organization_id: selectedOrgId,
        tokens: amount,
        description: "Crédito manual por administrador",
      });

      if (!res?.success) {
        throw new Error(res?.error || "Error al agregar coins");
      }

      toast.success(`${formatTokens(amount)} Tokens IA agregados correctamente`);
      setTokenAmount("1000");
      // Refresh balance
      setBalance((prev) =>
        prev
          ? { ...prev, balance_purchased: prev.balance_purchased + amount }
          : { balance_subscription: 0, balance_purchased: amount, balance_bonus: 0, total_consumed: 0, monthly_allowance: 0 }
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Error al agregar coins");
    } finally {
      setCrediting(false);
    }
  };

  const totalAvailable = balance
    ? balance.balance_subscription + balance.balance_purchased + balance.balance_bonus
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Tokens IA por organización
        </CardTitle>
        <CardDescription>
          Agrega Tokens IA manualmente a cualquier organización
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Buscar organización</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nombre de la organización..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Organización</Label>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una organización" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {org.name}
                  </div>
                </SelectItem>
              ))}
              {!loading && organizations.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">
                  No se encontraron organizaciones
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedOrgId && balance && (
          <div className="rounded-sm border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Balance actual</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                Total disponible:{" "}
                <strong className="text-primary">
                  {formatTokens(totalAvailable)} coins
                </strong>
              </span>
              <span className="text-muted-foreground">
                Plan: {formatTokens(balance.balance_subscription)} | Extra:{" "}
                {formatTokens(balance.balance_purchased)} | Bonus:{" "}
                {formatTokens(balance.balance_bonus)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Cantidad a agregar</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              placeholder="1000"
            />
            <div className="flex gap-1">
              {[500, 1000, 5000, 10000].map((n) => (
                <Button
                  key={n}
                  variant="outline"
                  size="sm"
                  onClick={() => setTokenAmount(String(n))}
                >
                  +{formatTokens(n)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={handleCredit}
          disabled={crediting || !selectedOrgId || !tokenAmount || parseInt(tokenAmount, 10) <= 0}
          className="w-full"
        >
          {crediting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Agregar {formatTokens(parseInt(tokenAmount, 10) || 0)} coins
        </Button>
      </CardContent>
    </Card>
  );
}
