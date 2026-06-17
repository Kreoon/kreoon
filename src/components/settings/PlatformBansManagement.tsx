import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ban,
  Globe,
  Mail,
  Loader2,
  Trash2,
  RefreshCw,
  MonitorSmartphone,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserBan {
  id: string;
  user_id: string;
  email: string | null;
  current_email?: string | null;
  full_name?: string | null;
  reason: string | null;
  banned_at: string;
  expires_at: string | null;
}

interface BlockedIp {
  id: string;
  ip_address: string;
  reason: string | null;
  blocked_at: string;
  expires_at: string | null;
}

interface BlockedEmail {
  id: string;
  pattern: string;
  pattern_type: "email" | "domain";
  reason: string | null;
  blocked_at: string;
}

interface BlockedDevice {
  id: string;
  device_id: string;
  reason: string | null;
  blocked_at: string;
  expires_at: string | null;
}

const fmt = (d: string | null) =>
  d ? format(new Date(d), "dd MMM yyyy HH:mm", { locale: es }) : "—";

export function PlatformBansManagement() {
  const [userBans, setUserBans] = useState<UserBan[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [blockedEmails, setBlockedEmails] = useState<BlockedEmail[]>([]);
  const [blockedDevices, setBlockedDevices] = useState<BlockedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [newIp, setNewIp] = useState("");
  const [newIpReason, setNewIpReason] = useState("");
  const [newPattern, setNewPattern] = useState("");
  const [newPatternType, setNewPatternType] = useState<"email" | "domain">(
    "email",
  );
  const [newEmailReason, setNewEmailReason] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newDeviceReason, setNewDeviceReason] = useState("");

  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No autenticado");
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const headers = await getAuthHeaders();
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body,
      headers,
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bans, ips, emails, devices] = await Promise.all([
        invoke({ action: "list_user_bans" }),
        invoke({ action: "list_blocked_ips" }),
        invoke({ action: "list_blocked_emails" }),
        invoke({ action: "list_blocked_devices" }),
      ]);
      setUserBans(bans?.bans || []);
      setBlockedIps(ips?.ips || []);
      setBlockedEmails(emails?.emails || []);
      setBlockedDevices(devices?.devices || []);
    } catch (e: any) {
      toast.error(
        "Error al cargar baneos: " + (e.message || "Error desconocido"),
      );
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUnbanUser = async (ban: UserBan) => {
    setActionLoading(true);
    try {
      await invoke({ action: "unban_user", userId: ban.user_id });
      toast.success("Usuario desbaneado");
      fetchAll();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockIp = async () => {
    if (!newIp.trim()) return;
    setActionLoading(true);
    try {
      await invoke({
        action: "block_ip",
        ipAddress: newIp.trim(),
        reason: newIpReason || null,
      });
      toast.success("IP bloqueada");
      setNewIp("");
      setNewIpReason("");
      fetchAll();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockIp = async (id: string) => {
    setActionLoading(true);
    try {
      await invoke({ action: "unblock_ip", blockId: id });
      toast.success("IP desbloqueada");
      fetchAll();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockEmail = async () => {
    if (!newPattern.trim()) return;
    setActionLoading(true);
    try {
      await invoke({
        action: "block_email",
        pattern: newPattern.trim(),
        patternType: newPatternType,
        reason: newEmailReason || null,
      });
      toast.success("Email/dominio bloqueado");
      setNewPattern("");
      setNewEmailReason("");
      fetchAll();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockEmail = async (id: string) => {
    setActionLoading(true);
    try {
      await invoke({ action: "unblock_email", blockId: id });
      toast.success("Email/dominio desbloqueado");
      fetchAll();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockDevice = async () => {
    if (!newDeviceId.trim()) return;
    setActionLoading(true);
    try {
      await invoke({
        action: "block_device",
        deviceId: newDeviceId.trim(),
        reason: newDeviceReason || null,
      });
      toast.success("Dispositivo bloqueado");
      setNewDeviceId("");
      setNewDeviceReason("");
      fetchAll();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockDevice = async (id: string) => {
    setActionLoading(true);
    try {
      await invoke({ action: "unblock_device", blockId: id });
      toast.success("Dispositivo desbloqueado");
      fetchAll();
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Error desconocido"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Baneos y bloqueos</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAll}
          disabled={actionLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Ban className="h-4 w-4 mr-2" />
            Usuarios ({userBans.length})
          </TabsTrigger>
          <TabsTrigger value="ips">
            <Globe className="h-4 w-4 mr-2" />
            IPs ({blockedIps.length})
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Emails ({blockedEmails.length})
          </TabsTrigger>
          <TabsTrigger value="devices">
            <MonitorSmartphone className="h-4 w-4 mr-2" />
            Dispositivos ({blockedDevices.length})
          </TabsTrigger>
        </TabsList>

        {/* Usuarios baneados */}
        <TabsContent value="users" className="space-y-3 pt-4">
          {userBans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay usuarios baneados.
            </p>
          ) : (
            userBans.map((ban) => (
              <Card
                key={ban.id}
                className="flex items-center justify-between p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {ban.full_name ||
                      ban.current_email ||
                      ban.email ||
                      ban.user_id}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {ban.current_email || ban.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ban.reason || "Sin razón"} · Baneado {fmt(ban.banned_at)} ·{" "}
                    {ban.expires_at
                      ? `Expira ${fmt(ban.expires_at)}`
                      : "Permanente"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnbanUser(ban)}
                  disabled={actionLoading}
                >
                  Desbanear
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        {/* IPs bloqueadas */}
        <TabsContent value="ips" className="space-y-3 pt-4">
          <Card className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="new-ip">Dirección IP</Label>
                <Input
                  id="new-ip"
                  placeholder="201.0.0.1"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-ip-reason">Razón (opcional)</Label>
                <Input
                  id="new-ip-reason"
                  placeholder="spam, abuso..."
                  value={newIpReason}
                  onChange={(e) => setNewIpReason(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleBlockIp}
              disabled={actionLoading || !newIp.trim()}
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Bloquear IP
            </Button>
          </Card>

          {blockedIps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay IPs bloqueadas.
            </p>
          ) : (
            blockedIps.map((ip) => (
              <Card
                key={ip.id}
                className="flex items-center justify-between p-4"
              >
                <div className="min-w-0">
                  <p className="font-mono font-medium">{ip.ip_address}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ip.reason || "Sin razón"} · {fmt(ip.blocked_at)} ·{" "}
                    {ip.expires_at
                      ? `Expira ${fmt(ip.expires_at)}`
                      : "Permanente"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleUnblockIp(ip.id)}
                  disabled={actionLoading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Emails/Dominios bloqueados */}
        <TabsContent value="emails" className="space-y-3 pt-4">
          <Card className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="new-pattern">Email o dominio</Label>
                <Input
                  id="new-pattern"
                  placeholder={
                    newPatternType === "domain" ? "tempmail.com" : "spam@x.com"
                  }
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={newPatternType}
                  onValueChange={(v) =>
                    setNewPatternType(v as "email" | "domain")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email exacto</SelectItem>
                    <SelectItem value="domain">Dominio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-email-reason">Razón (opcional)</Label>
                <Input
                  id="new-email-reason"
                  placeholder="spam..."
                  value={newEmailReason}
                  onChange={(e) => setNewEmailReason(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleBlockEmail}
              disabled={actionLoading || !newPattern.trim()}
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Bloquear
            </Button>
          </Card>

          {blockedEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay emails/dominios bloqueados.
            </p>
          ) : (
            blockedEmails.map((em) => (
              <Card
                key={em.id}
                className="flex items-center justify-between p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {em.pattern}{" "}
                    <Badge variant="secondary" className="ml-1">
                      {em.pattern_type === "domain" ? "dominio" : "email"}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {em.reason || "Sin razón"} · {fmt(em.blocked_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleUnblockEmail(em.id)}
                  disabled={actionLoading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Dispositivos bloqueados */}
        <TabsContent value="devices" className="space-y-3 pt-4">
          <Card className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="new-device">ID de dispositivo (cookie)</Label>
                <Input
                  id="new-device"
                  placeholder="kreoon_did..."
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-device-reason">Razón (opcional)</Label>
                <Input
                  id="new-device-reason"
                  placeholder="spam, abuso..."
                  value={newDeviceReason}
                  onChange={(e) => setNewDeviceReason(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleBlockDevice}
              disabled={actionLoading || !newDeviceId.trim()}
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Bloquear dispositivo
            </Button>
            <p className="text-xs text-muted-foreground">
              Normalmente los dispositivos se bloquean desde el panel de un
              usuario o al banear con la casilla correspondiente; aquí puedes
              gestionarlos manualmente.
            </p>
          </Card>

          {blockedDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay dispositivos bloqueados.
            </p>
          ) : (
            blockedDevices.map((dev) => (
              <Card
                key={dev.id}
                className="flex items-center justify-between p-4"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs font-medium truncate">
                    {dev.device_id}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dev.reason || "Sin razón"} · {fmt(dev.blocked_at)} ·{" "}
                    {dev.expires_at
                      ? `Expira ${fmt(dev.expires_at)}`
                      : "Permanente"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleUnblockDevice(dev.id)}
                  disabled={actionLoading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
