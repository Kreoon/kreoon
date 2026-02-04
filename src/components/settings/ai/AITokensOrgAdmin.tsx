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
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrgOption {
  id: string;
  name: string;
  logo_url: string | null;
}

interface TokenBalance {
  tokens_remaining: number;
  purchased_tokens: number;
  monthly_tokens_included: number;
  tokens_used_this_period: number;
  custom_api_enabled: boolean;
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
        const { data, error } = await supabase
          .from("organization_ai_tokens")
          .select("tokens_remaining, purchased_tokens, monthly_tokens_included, tokens_used_this_period, custom_api_enabled")
          .eq("organization_id", selectedOrgId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setBalance(data as TokenBalance);
        } else {
          setBalance({
            tokens_remaining: 0,
            purchased_tokens: 0,
            monthly_tokens_included: 0,
            tokens_used_this_period: 0,
            custom_api_enabled: false,
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
      const { data: existing } = await supabase
        .from("organization_ai_tokens")
        .select("id, purchased_tokens")
        .eq("organization_id", selectedOrgId)
        .maybeSingle();

      if (existing) {
        const newPurchased = (existing.purchased_tokens ?? 0) + amount;
        const { error: updateError } = await supabase
          .from("organization_ai_tokens")
          .update({
            purchased_tokens: newPurchased,
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", selectedOrgId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("organization_ai_tokens")
          .insert({
            organization_id: selectedOrgId,
            monthly_tokens_included: 0,
            tokens_remaining: 0,
            tokens_used_this_period: 0,
            purchased_tokens: amount,
            period_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (insertError) throw insertError;
      }

      await supabase.from("ai_token_transactions").insert({
        organization_id: selectedOrgId,
        type: "plan_credit",
        tokens_amount: amount,
        module_key: "admin",
        action: "manual_credit",
        description: "Crédito manual por administrador",
      });

      toast.success(`${formatTokens(amount)} Kreoon Coins agregados correctamente`);
      setTokenAmount("1000");
      setBalance((prev) =>
        prev
          ? { ...prev, purchased_tokens: prev.purchased_tokens + amount }
          : { tokens_remaining: 0, purchased_tokens: amount, monthly_tokens_included: 0, tokens_used_this_period: 0, custom_api_enabled: false }
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Error al agregar coins");
    } finally {
      setCrediting(false);
    }
  };

  const totalAvailable = balance
    ? balance.tokens_remaining + balance.purchased_tokens
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Kreoon Coins por organización
        </CardTitle>
        <CardDescription>
          Agrega Kreoon Coins manualmente a cualquier organización
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
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Balance actual</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                Total disponible:{" "}
                <strong className="text-primary">
                  {formatTokens(totalAvailable)} coins
                </strong>
              </span>
              <span className="text-muted-foreground">
                Plan: {formatTokens(balance.tokens_remaining)} | Extra:{" "}
                {formatTokens(balance.purchased_tokens)}
              </span>
              {balance.custom_api_enabled && (
                <span className="text-amber-600">API propia activa</span>
              )}
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
