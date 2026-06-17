import { useCallback, useEffect, useState } from "react";
import {
  Globe,
  Loader2,
  MonitorSmartphone,
  Shield,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface IpRow {
  ip_address: string;
  device_id: string;
  user_agent: string | null;
  last_seen: string;
  hits: number;
  ip_blocked: boolean;
  device_blocked: boolean;
}

/**
 * Lista las IPs y dispositivos recientes de un usuario y permite bloquearlos o
 * desbloquearlos individualmente. Usa las acciones list_user_ips / block_ip /
 * unblock_ip / block_device / unblock_device de admin-users.
 */
export function UserIpManager({ userId }: { userId: string }) {
  const [rows, setRows] = useState<IpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const invoke = useCallback(
    async (action: string, body: Record<string, unknown>) => {
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
    },
    [],
  );

  const fetchIps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke("list_user_ips", { userId });
      setRows(data?.ips || []);
    } catch (e: any) {
      toast.error("Error al cargar IPs: " + (e.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  }, [invoke, userId]);

  useEffect(() => {
    fetchIps();
  }, [fetchIps]);

  const toggleIp = async (row: IpRow) => {
    setBusy(row.ip_address);
    try {
      if (row.ip_blocked) {
        await invoke("unblock_ip", { ipAddress: row.ip_address });
        toast.success("IP desbloqueada");
      } else {
        await invoke("block_ip", {
          ipAddress: row.ip_address,
          reason: "Bloqueo desde panel de usuario",
        });
        toast.success("IP bloqueada");
      }
      fetchIps();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setBusy(null);
    }
  };

  const toggleDevice = async (row: IpRow) => {
    setBusy(row.device_id);
    try {
      if (row.device_blocked) {
        await invoke("unblock_device", { deviceId: row.device_id });
        toast.success("Dispositivo desbloqueado");
      } else {
        await invoke("block_device", {
          deviceId: row.device_id,
          reason: "Bloqueo desde panel de usuario",
        });
        toast.success("Dispositivo bloqueado");
      }
      fetchIps();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/40 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando IPs…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-xs text-white/40 py-2">
        Sin IPs registradas todavía. Se registran cuando el usuario abre la
        plataforma.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div
          key={`${row.ip_address}-${row.device_id}-${i}`}
          className="rounded-sm bg-white/5 border border-white/10 p-2.5 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
              <span className="font-mono text-xs text-white/80 truncate">
                {row.ip_address}
              </span>
              {row.ip_blocked && (
                <Badge variant="destructive" className="text-[10px] h-4">
                  Bloqueada
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleIp(row)}
              disabled={busy === row.ip_address || row.ip_address === "unknown"}
              className={cnBtn(row.ip_blocked)}
            >
              {busy === row.ip_address ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : row.ip_blocked ? (
                <ShieldOff className="h-3 w-3" />
              ) : (
                <Shield className="h-3 w-3" />
              )}
              {row.ip_blocked ? "Desbloquear IP" : "Bloquear IP"}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[10px] text-white/40">
            <span>
              {formatDistanceToNow(new Date(row.last_seen), {
                addSuffix: true,
                locale: es,
              })}{" "}
              · {row.hits} acceso(s)
            </span>
            {row.device_id ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDevice(row)}
                disabled={busy === row.device_id}
                className={cnBtn(row.device_blocked)}
              >
                {busy === row.device_id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MonitorSmartphone className="h-3 w-3" />
                )}
                {row.device_blocked ? "Desbloquear disp." : "Bloquear disp."}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function cnBtn(active: boolean): string {
  return active
    ? "h-6 gap-1.5 text-[10px] text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/10"
    : "h-6 gap-1.5 text-[10px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10";
}
