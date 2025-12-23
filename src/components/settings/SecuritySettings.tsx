import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot, 
  InputOTPSeparator 
} from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Loader2, Shield, Smartphone, Key, Lock, Eye, EyeOff,
  CheckCircle2, XCircle, AlertTriangle, Copy, QrCode,
  MonitorSmartphone, Clock, Trash2, RefreshCw, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

export function SecuritySettings() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // 2FA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Load MFA factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (!factorsError && factorsData) {
        setMfaFactors(factorsData.totp || []);
        setMfaEnabled(factorsData.totp?.some(f => f.status === 'verified') || false);
      }
    } catch (error) {
      console.error("Error loading security data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Password change
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      toast.error("La contraseña debe incluir mayúsculas, minúsculas y números");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error(error.message || "Error al cambiar la contraseña");
    } finally {
      setChangingPassword(false);
    }
  };

  // 2FA Setup
  const startMFAEnrollment = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `${profile?.full_name || user?.email} - Authenticator`
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setShowSetup2FA(true);
      }
    } catch (error: any) {
      console.error("MFA enrollment error:", error);
      toast.error(error.message || "Error al configurar 2FA");
    } finally {
      setEnrolling(false);
    }
  };

  const verifyAndEnableMFA = async () => {
    if (verifyCode.length !== 6) {
      toast.error("Ingresa el código de 6 dígitos");
      return;
    }

    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode
      });

      if (verifyError) throw verifyError;

      toast.success("Autenticación de dos factores activada");
      setShowSetup2FA(false);
      setVerifyCode("");
      setQrCode("");
      setSecret("");
      loadSecurityData();
    } catch (error: any) {
      console.error("MFA verify error:", error);
      toast.error(error.message || "Código incorrecto. Inténtalo de nuevo.");
    } finally {
      setVerifying(false);
    }
  };

  const disableMFA = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      });

      if (error) throw error;

      toast.success("Autenticación de dos factores desactivada");
      loadSecurityData();
    } catch (error: any) {
      console.error("MFA unenroll error:", error);
      toast.error(error.message || "Error al desactivar 2FA");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { label: "Débil", color: "bg-red-500", percent: 33 };
    if (strength <= 4) return { label: "Media", color: "bg-amber-500", percent: 66 };
    return { label: "Fuerte", color: "bg-green-500", percent: 100 };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Seguridad</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona la seguridad de tu cuenta, contraseña y autenticación
        </p>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={mfaEnabled ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mfaEnabled ? "bg-green-100 dark:bg-green-900" : "bg-amber-100 dark:bg-amber-900"}`}>
              <Smartphone className={`h-5 w-5 ${mfaEnabled ? "text-green-600" : "text-amber-600"}`} />
            </div>
            <div>
              <p className="text-sm font-medium">2FA</p>
              <p className={`text-xs ${mfaEnabled ? "text-green-600" : "text-amber-600"}`}>
                {mfaEnabled ? "Activado" : "Desactivado"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <Key className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Contraseña</p>
              <p className="text-xs text-green-600">Configurada</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-blue-600 truncate max-w-[150px]">{user?.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Autenticación de Dos Factores (2FA)
          </CardTitle>
          <CardDescription>
            Añade una capa extra de seguridad usando una aplicación de autenticación como Google Authenticator, Authy o Microsoft Authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaFactors.filter(f => f.status === 'verified').length > 0 ? (
            <div className="space-y-4">
              <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  La autenticación de dos factores está <strong>activada</strong>. Tu cuenta está más segura.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Dispositivos configurados</Label>
                {mfaFactors.filter(f => f.status === 'verified').map((factor) => (
                  <div key={factor.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{factor.friendly_name || "Authenticator App"}</p>
                        <p className="text-xs text-muted-foreground">
                          Configurado {formatDistanceToNow(new Date(factor.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => disableMFA(factor.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  La autenticación de dos factores está <strong>desactivada</strong>. Recomendamos activarla para mayor seguridad.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">¿Por qué usar 2FA?</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Protege tu cuenta incluso si tu contraseña es comprometida
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Bloquea accesos no autorizados desde nuevos dispositivos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Compatible con Google Authenticator, Authy, 1Password y más
                  </li>
                </ul>
              </div>

              <Button onClick={startMFAEnrollment} disabled={enrolling}>
                {enrolling ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                Configurar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Actualiza tu contraseña regularmente para mantener tu cuenta segura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {newPassword && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{passwordStrength.label}</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li className={newPassword.length >= 8 ? "text-green-600" : ""}>
                    {newPassword.length >= 8 ? "✓" : "○"} Mínimo 8 caracteres
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : ""}>
                    {/[A-Z]/.test(newPassword) ? "✓" : "○"} Una mayúscula
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? "text-green-600" : ""}>
                    {/[a-z]/.test(newPassword) ? "✓" : "○"} Una minúscula
                  </li>
                  <li className={/\d/.test(newPassword) ? "text-green-600" : ""}>
                    {/\d/.test(newPassword) ? "✓" : "○"} Un número
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
            <Input
              id="confirmPassword"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>

          <Button 
            onClick={handleChangePassword} 
            disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
          >
            {changingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Key className="h-4 w-4 mr-2" />
            )}
            Cambiar Contraseña
          </Button>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Consejos de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Key className="h-4 w-4" />
                Contraseñas Seguras
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Usa contraseñas únicas para cada servicio</li>
                <li>• Combina letras, números y símbolos</li>
                <li>• Considera usar un gestor de contraseñas</li>
              </ul>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Autenticación
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Activa 2FA para protección adicional</li>
                <li>• Guarda tus códigos de respaldo</li>
                <li>• No compartas tu código de verificación</li>
              </ul>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4" />
                Dispositivos
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Revisa tus sesiones activas regularmente</li>
                <li>• Cierra sesión en dispositivos no utilizados</li>
                <li>• Mantén tus dispositivos actualizados</li>
              </ul>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Prevención
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Desconfía de emails sospechosos (phishing)</li>
                <li>• Verifica siempre la URL del sitio</li>
                <li>• No hagas clic en enlaces desconocidos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={showSetup2FA} onOpenChange={setShowSetup2FA}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Configurar Autenticación 2FA
            </DialogTitle>
            <DialogDescription>
              Escanea el código QR con tu aplicación de autenticación
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: QR Code */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Paso 1</Badge>
                <span className="text-sm font-medium">Escanea el código QR</span>
              </div>
              
              {qrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="QR Code for 2FA" className="w-48 h-48" />
                </div>
              )}

              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">¿No puedes escanear? Usa este código:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{secret}</code>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(secret)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Step 2: Verify */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Paso 2</Badge>
                <span className="text-sm font-medium">Ingresa el código de verificación</span>
              </div>
              
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6} 
                  value={verifyCode}
                  onChange={setVerifyCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Ingresa el código de 6 dígitos que aparece en tu aplicación
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowSetup2FA(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={verifyAndEnableMFA}
                disabled={verifying || verifyCode.length !== 6}
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Verificar y Activar
              </Button>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Importante:</strong> Guarda el código secreto en un lugar seguro. 
                Lo necesitarás si pierdes acceso a tu aplicación de autenticación.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
