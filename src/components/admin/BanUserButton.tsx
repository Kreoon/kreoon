import { useEffect, useState } from "react";
import { Ban, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface BanUserButtonProps {
  userId: string;
  userEmail?: string | null;
  /**
   * Estado de baneo conocido. Si se omite (undefined), el componente lo detecta
   * automáticamente vía la RPC `is_user_banned`.
   */
  isBanned?: boolean;
  onDone?: () => void;
  className?: string;
}

/**
 * Botón reutilizable de banear/desbanear un usuario. Usa las acciones
 * `ban_user` / `unban_user` de la edge function admin-users (registran metadata
 * en user_bans + ban nativo de Supabase Auth). Sirve para cualquier panel de
 * detalle de persona (usuarios de plataforma, usuarios cliente, etc.).
 */
export function BanUserButton({
  userId,
  userEmail,
  isBanned,
  onDone,
  className,
}: BanUserButtonProps) {
  const [banned, setBanned] = useState<boolean | null>(isBanned ?? null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<"permanent" | "7d" | "30d">(
    "permanent",
  );
  const [alsoBlockIps, setAlsoBlockIps] = useState(false);
  const [alsoBlockDevices, setAlsoBlockDevices] = useState(false);
  const [loading, setLoading] = useState(false);

  // Autodetección del estado de baneo cuando no se provee isBanned
  useEffect(() => {
    if (isBanned !== undefined) {
      setBanned(isBanned);
      return;
    }
    let cancelled = false;
    supabase.rpc("is_user_banned", { _uid: userId }).then(({ data }) => {
      if (!cancelled) setBanned(data === true);
    });
    return () => {
      cancelled = true;
    };
  }, [isBanned, userId]);

  const invoke = async (action: string, body: Record<string, unknown>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No autenticado");
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action, ...body },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleUnban = async () => {
    setLoading(true);
    try {
      await invoke("unban_user", { userId });
      toast.success("Usuario desbaneado");
      setBanned(false);
      onDone?.();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    setLoading(true);
    try {
      let expiresAt: string | null = null;
      if (duration === "7d")
        expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      if (duration === "30d")
        expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      const res = await invoke("ban_user", {
        userId,
        reason: reason || null,
        expiresAt,
        alsoBlockIps,
        alsoBlockDevices,
      });
      const extra: string[] = [];
      if (res?.blockedIps) extra.push(`${res.blockedIps} IP(s)`);
      if (res?.blockedDevices)
        extra.push(`${res.blockedDevices} dispositivo(s)`);
      toast.success(
        "Usuario baneado" +
          (extra.length ? ` · bloqueado ${extra.join(" y ")}` : ""),
      );
      setBanned(true);
      setOpen(false);
      setReason("");
      setDuration("permanent");
      setAlsoBlockIps(false);
      setAlsoBlockDevices(false);
      onDone?.();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  if (banned === null) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn(
          "w-full justify-start gap-2 h-8 text-xs text-white/40",
          className,
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Cargando estado…
      </Button>
    );
  }

  if (banned) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleUnban}
        disabled={loading}
        className={cn(
          "w-full justify-start gap-2 h-8 text-xs text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/10",
          className,
        )}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle className="h-3.5 w-3.5" />
        )}
        Desbanear usuario
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={loading}
        className={cn(
          "w-full justify-start gap-2 h-8 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10",
          className,
        )}
      >
        <Ban className="h-3.5 w-3.5" />
        Banear usuario
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banear usuario</DialogTitle>
            <DialogDescription>
              Bloquearás el acceso de {userEmail || "este usuario"}. No podrá
              iniciar sesión ni entrar a la plataforma mientras el baneo esté
              activo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ban-reason">Razón (opcional)</Label>
              <Textarea
                id="ban-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: spam, comportamiento abusivo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Duración</Label>
              <Select
                value={duration}
                onValueChange={(v) => setDuration(v as typeof duration)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanente</SelectItem>
                  <SelectItem value="7d">7 días</SelectItem>
                  <SelectItem value="30d">30 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-md border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">
                Bloqueo adicional (usa las IPs y dispositivos conocidos del
                usuario)
              </p>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={alsoBlockIps}
                  onCheckedChange={(v) => setAlsoBlockIps(v === true)}
                />
                Bloquear también sus IPs conocidas
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={alsoBlockDevices}
                  onCheckedChange={(v) => setAlsoBlockDevices(v === true)}
                />
                Bloquear también su dispositivo (cookie)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBan}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Banear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
