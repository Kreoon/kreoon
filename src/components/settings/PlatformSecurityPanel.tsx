import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, Shield, Smartphone, Key, Lock, Users, Globe,
  CheckCircle2, XCircle, AlertTriangle, Ban, Clock, 
  Monitor, MapPin, RefreshCw, Settings2, UserCheck,
  ShieldCheck, ShieldAlert, History, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

interface SecurityPolicy {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  updated_at: string;
}

interface UserSecurityStatus {
  id: string;
  user_id: string;
  mfa_enabled: boolean;
  last_password_change: string | null;
  failed_login_attempts: number;
  account_locked: boolean;
  locked_until: string | null;
  force_password_reset: boolean;
  security_score: number;
  profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface LoginHistory {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  location: string | null;
  is_suspicious: boolean;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string | null;
  blocked_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export function PlatformSecurityPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserSecurityStatus[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  
  // Edit dialogs
  const [editingPolicy, setEditingPolicy] = useState<SecurityPolicy | null>(null);
  const [policyValue, setPolicyValue] = useState<any>({});
  const [saving, setSaving] = useState(false);
  
  // Block IP dialog
  const [showBlockIP, setShowBlockIP] = useState(false);
  const [newBlockedIP, setNewBlockedIP] = useState({ ip: "", reason: "", duration: "permanent" });

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Load security policies
      const { data: policiesData } = await supabase
        .from('security_settings')
        .select('*')
        .order('setting_key');

      if (policiesData) {
        setPolicies(policiesData as SecurityPolicy[]);
      }

      // Load user security statuses
      const { data: statusData } = await supabase
        .from('user_security_status')
        .select(`
          *,
          profile:profiles!user_security_status_user_id_fkey(full_name, email, avatar_url)
        `)
        .order('security_score', { ascending: true });

      if (statusData) {
        setUserStatuses(statusData as any[]);
      }

      // Load recent login history
      const { data: historyData } = await supabase
        .from('login_history')
        .select(`
          *,
          profile:profiles!login_history_user_id_fkey(full_name, email)
        `)
        .order('login_at', { ascending: false })
        .limit(50);

      if (historyData) {
        setLoginHistory(historyData as any[]);
      }

      // Load blocked IPs
      const { data: blockedData } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('is_active', true)
        .order('blocked_at', { ascending: false });

      if (blockedData) {
        setBlockedIPs(blockedData);
      }
    } catch (error) {
      console.error("Error loading security data:", error);
      toast.error("Error al cargar datos de seguridad");
    } finally {
      setLoading(false);
    }
  };

  const openPolicyEditor = (policy: SecurityPolicy) => {
    setEditingPolicy(policy);
    setPolicyValue(policy.setting_value);
  };

  const savePolicy = async () => {
    if (!editingPolicy) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('security_settings')
        .update({
          setting_value: policyValue,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', editingPolicy.id);

      if (error) throw error;

      toast.success("Política de seguridad actualizada");
      setEditingPolicy(null);
      loadSecurityData();
    } catch (error: any) {
      console.error("Error saving policy:", error);
      toast.error(error.message || "Error al guardar política");
    } finally {
      setSaving(false);
    }
  };

  const blockIP = async () => {
    if (!newBlockedIP.ip) {
      toast.error("Ingresa una dirección IP");
      return;
    }

    setSaving(true);
    try {
      let expiresAt = null;
      if (newBlockedIP.duration !== "permanent") {
        const hours = parseInt(newBlockedIP.duration);
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase
        .from('blocked_ips')
        .insert({
          ip_address: newBlockedIP.ip,
          reason: newBlockedIP.reason || null,
          expires_at: expiresAt,
          blocked_by: user?.id
        });

      if (error) throw error;

      toast.success("IP bloqueada correctamente");
      setShowBlockIP(false);
      setNewBlockedIP({ ip: "", reason: "", duration: "permanent" });
      loadSecurityData();
    } catch (error: any) {
      console.error("Error blocking IP:", error);
      toast.error(error.message || "Error al bloquear IP");
    } finally {
      setSaving(false);
    }
  };

  const unblockIP = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success("IP desbloqueada");
      loadSecurityData();
    } catch (error: any) {
      console.error("Error unblocking IP:", error);
      toast.error(error.message || "Error al desbloquear IP");
    }
  };

  const toggleUserLock = async (userId: string, lock: boolean) => {
    try {
      const lockUntil = lock 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
        : null;

      const { error } = await supabase
        .from('user_security_status')
        .update({
          account_locked: lock,
          locked_until: lockUntil
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(lock ? "Cuenta bloqueada" : "Cuenta desbloqueada");
      loadSecurityData();
    } catch (error: any) {
      console.error("Error toggling user lock:", error);
      toast.error(error.message || "Error al modificar cuenta");
    }
  };

  const forcePasswordReset = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_security_status')
        .update({ force_password_reset: true })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success("Se forzará cambio de contraseña en próximo inicio de sesión");
    } catch (error: any) {
      console.error("Error forcing password reset:", error);
      toast.error(error.message || "Error al forzar cambio de contraseña");
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getSecurityScoreBadge = (score: number) => {
    if (score >= 80) return { label: "Excelente", variant: "default" as const };
    if (score >= 50) return { label: "Medio", variant: "secondary" as const };
    return { label: "Bajo", variant: "destructive" as const };
  };

  const getPolicyLabel = (key: string) => {
    const labels: Record<string, string> = {
      mfa_policy: "Autenticación de Dos Factores",
      password_policy: "Política de Contraseñas",
      session_policy: "Política de Sesiones",
      login_policy: "Política de Inicio de Sesión",
      ip_policy: "Política de IPs"
    };
    return labels[key] || key;
  };

  const getPolicyIcon = (key: string) => {
    const icons: Record<string, any> = {
      mfa_policy: Smartphone,
      password_policy: Key,
      session_policy: Clock,
      login_policy: UserCheck,
      ip_policy: Globe
    };
    const Icon = icons[key] || Settings2;
    return <Icon className="h-5 w-5" />;
  };

  // Calculate stats
  const totalUsers = userStatuses.length;
  const usersWithMFA = userStatuses.filter(u => u.mfa_enabled).length;
  const lockedAccounts = userStatuses.filter(u => u.account_locked).length;
  const avgSecurityScore = totalUsers > 0 
    ? Math.round(userStatuses.reduce((acc, u) => acc + u.security_score, 0) / totalUsers)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Usuarios totales</p>
            </div>
          </CardContent>
        </Card>

        <Card className={usersWithMFA > 0 ? "border-green-500/50" : "border-amber-500/50"}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${usersWithMFA > 0 ? "bg-green-100 dark:bg-green-900" : "bg-amber-100 dark:bg-amber-900"}`}>
              <Smartphone className={`h-5 w-5 ${usersWithMFA > 0 ? "text-green-600" : "text-amber-600"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{usersWithMFA}</p>
              <p className="text-xs text-muted-foreground">Con 2FA activo</p>
            </div>
          </CardContent>
        </Card>

        <Card className={lockedAccounts === 0 ? "border-green-500/50" : "border-red-500/50"}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${lockedAccounts === 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
              <Lock className={`h-5 w-5 ${lockedAccounts === 0 ? "text-green-600" : "text-red-600"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{lockedAccounts}</p>
              <p className="text-xs text-muted-foreground">Cuentas bloqueadas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${getSecurityScoreColor(avgSecurityScore)}`}>{avgSecurityScore}%</p>
              <p className="text-xs text-muted-foreground">Puntaje promedio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Políticas
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="blocked" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            IPs Bloqueadas
          </TabsTrigger>
        </TabsList>

        {/* Security Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Políticas de Seguridad de la Plataforma
              </CardTitle>
              <CardDescription>
                Configura las políticas de seguridad que aplican a todos los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {policies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getPolicyIcon(policy.setting_key)}
                    </div>
                    <div>
                      <p className="font-medium">{getPolicyLabel(policy.setting_key)}</p>
                      <p className="text-xs text-muted-foreground">{policy.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openPolicyEditor(policy)}>
                    Configurar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Security Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Estado de Seguridad de Usuarios
              </CardTitle>
              <CardDescription>
                Monitorea y gestiona la seguridad de cada usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Puntaje</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userStatuses.map((status) => (
                      <TableRow key={status.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={status.profile?.avatar_url || undefined} />
                              <AvatarFallback>
                                {status.profile?.full_name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{status.profile?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{status.profile?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {status.mfa_enabled ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" /> Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={status.security_score} className="w-16 h-2" />
                            <span className={`text-sm font-medium ${getSecurityScoreColor(status.security_score)}`}>
                              {status.security_score}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {status.account_locked ? (
                            <Badge variant="destructive">
                              <Lock className="h-3 w-3 mr-1" /> Bloqueada
                            </Badge>
                          ) : status.force_password_reset ? (
                            <Badge variant="secondary">
                              <Key className="h-3 w-3 mr-1" /> Cambio requerido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Activa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleUserLock(status.user_id, !status.account_locked)}
                            >
                              {status.account_locked ? "Desbloquear" : "Bloquear"}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => forcePasswordReset(status.user_id)}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Historial de Inicios de Sesión
              </CardTitle>
              <CardDescription>
                Registro de los últimos accesos a la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No hay registros de inicio de sesión
                        </TableCell>
                      </TableRow>
                    ) : (
                      loginHistory.map((login) => (
                        <TableRow key={login.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{login.profile?.full_name || "Usuario"}</p>
                              <p className="text-xs text-muted-foreground">{login.profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{format(new Date(login.login_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(login.login_at), { addSuffix: true, locale: es })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {login.ip_address || "N/A"}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{login.device_type || "Desconocido"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {login.is_suspicious ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Sospechoso
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Normal
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked IPs Tab */}
        <TabsContent value="blocked" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5" />
                  Direcciones IP Bloqueadas
                </CardTitle>
                <CardDescription>
                  Gestiona las IPs bloqueadas por seguridad
                </CardDescription>
              </div>
              <Button onClick={() => setShowBlockIP(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Bloquear IP
              </Button>
            </CardHeader>
            <CardContent>
              {blockedIPs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay IPs bloqueadas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dirección IP</TableHead>
                      <TableHead>Razón</TableHead>
                      <TableHead>Bloqueada desde</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedIPs.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded">{ip.ip_address}</code>
                        </TableCell>
                        <TableCell>{ip.reason || "Sin especificar"}</TableCell>
                        <TableCell>
                          {format(new Date(ip.blocked_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          {ip.expires_at 
                            ? format(new Date(ip.expires_at), "dd/MM/yyyy HH:mm", { locale: es })
                            : "Permanente"
                          }
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => unblockIP(ip.id)}
                          >
                            Desbloquear
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Policy Editor Dialog */}
      <Dialog open={!!editingPolicy} onOpenChange={() => setEditingPolicy(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingPolicy && getPolicyIcon(editingPolicy.setting_key)}
              {editingPolicy && getPolicyLabel(editingPolicy.setting_key)}
            </DialogTitle>
            <DialogDescription>
              {editingPolicy?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editingPolicy?.setting_key === "mfa_policy" && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Requerir 2FA para todos</Label>
                  <Switch 
                    checked={policyValue.required || false}
                    onCheckedChange={(checked) => setPolicyValue({...policyValue, required: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Requerir 2FA para admins</Label>
                  <Switch 
                    checked={policyValue.required_for_admins !== false}
                    onCheckedChange={(checked) => setPolicyValue({...policyValue, required_for_admins: checked})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Período de gracia (días)</Label>
                  <Input 
                    type="number"
                    value={policyValue.grace_period_days || 7}
                    onChange={(e) => setPolicyValue({...policyValue, grace_period_days: parseInt(e.target.value)})}
                  />
                </div>
              </>
            )}

            {editingPolicy?.setting_key === "password_policy" && (
              <>
                <div className="space-y-2">
                  <Label>Longitud mínima</Label>
                  <Input 
                    type="number"
                    value={policyValue.min_length || 8}
                    onChange={(e) => setPolicyValue({...policyValue, min_length: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Requerir mayúsculas</Label>
                  <Switch 
                    checked={policyValue.require_uppercase !== false}
                    onCheckedChange={(checked) => setPolicyValue({...policyValue, require_uppercase: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Requerir números</Label>
                  <Switch 
                    checked={policyValue.require_numbers !== false}
                    onCheckedChange={(checked) => setPolicyValue({...policyValue, require_numbers: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Requerir caracteres especiales</Label>
                  <Switch 
                    checked={policyValue.require_special || false}
                    onCheckedChange={(checked) => setPolicyValue({...policyValue, require_special: checked})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiración (días, 0 = nunca)</Label>
                  <Input 
                    type="number"
                    value={policyValue.expiry_days || 0}
                    onChange={(e) => setPolicyValue({...policyValue, expiry_days: parseInt(e.target.value)})}
                  />
                </div>
              </>
            )}

            {editingPolicy?.setting_key === "session_policy" && (
              <>
                <div className="space-y-2">
                  <Label>Máximo sesiones concurrentes</Label>
                  <Input 
                    type="number"
                    value={policyValue.max_concurrent_sessions || 5}
                    onChange={(e) => setPolicyValue({...policyValue, max_concurrent_sessions: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timeout de sesión (minutos)</Label>
                  <Input 
                    type="number"
                    value={policyValue.session_timeout_minutes || 480}
                    onChange={(e) => setPolicyValue({...policyValue, session_timeout_minutes: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timeout por inactividad (minutos)</Label>
                  <Input 
                    type="number"
                    value={policyValue.idle_timeout_minutes || 30}
                    onChange={(e) => setPolicyValue({...policyValue, idle_timeout_minutes: parseInt(e.target.value)})}
                  />
                </div>
              </>
            )}

            {editingPolicy?.setting_key === "login_policy" && (
              <>
                <div className="space-y-2">
                  <Label>Máximo intentos fallidos</Label>
                  <Input 
                    type="number"
                    value={policyValue.max_failed_attempts || 5}
                    onChange={(e) => setPolicyValue({...policyValue, max_failed_attempts: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duración de bloqueo (minutos)</Label>
                  <Input 
                    type="number"
                    value={policyValue.lockout_duration_minutes || 30}
                    onChange={(e) => setPolicyValue({...policyValue, lockout_duration_minutes: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Notificar en nuevo dispositivo</Label>
                  <Switch 
                    checked={policyValue.notify_on_new_device !== false}
                    onCheckedChange={(checked) => setPolicyValue({...policyValue, notify_on_new_device: checked})}
                  />
                </div>
              </>
            )}

            {editingPolicy?.setting_key === "ip_policy" && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Habilitar bloqueo geográfico</Label>
                  <Switch 
                    checked={policyValue.enable_geo_blocking || false}
                    onCheckedChange={(checked) => setPolicyValue({...policyValue, enable_geo_blocking: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Permitir VPN</Label>
                  <Switch 
                    checked={policyValue.allow_vpn !== false}
                    onCheckedChange={(checked) => setPolicyValue({...policyValue, allow_vpn: checked})}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPolicy(null)}>
              Cancelar
            </Button>
            <Button onClick={savePolicy} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block IP Dialog */}
      <Dialog open={showBlockIP} onOpenChange={setShowBlockIP}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Bloquear Dirección IP
            </DialogTitle>
            <DialogDescription>
              Bloquea una IP para prevenir accesos no autorizados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Dirección IP</Label>
              <Input 
                placeholder="192.168.1.1"
                value={newBlockedIP.ip}
                onChange={(e) => setNewBlockedIP({...newBlockedIP, ip: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Razón (opcional)</Label>
              <Input 
                placeholder="Actividad sospechosa..."
                value={newBlockedIP.reason}
                onChange={(e) => setNewBlockedIP({...newBlockedIP, reason: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Duración</Label>
              <Select 
                value={newBlockedIP.duration} 
                onValueChange={(v) => setNewBlockedIP({...newBlockedIP, duration: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                  <SelectItem value="168">7 días</SelectItem>
                  <SelectItem value="720">30 días</SelectItem>
                  <SelectItem value="permanent">Permanente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockIP(false)}>
              Cancelar
            </Button>
            <Button onClick={blockIP} disabled={saving} variant="destructive">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Bloquear IP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
