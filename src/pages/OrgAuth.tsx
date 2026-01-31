import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

function mapAuthErrorMessage(message?: string) {
  if (!message) return "Error";
  if (message === "Invalid login credentials") return "Credenciales inválidas";
  if (message.includes("Email not confirmed")) {
    return "Debes confirmar tu correo. Revisa tu bandeja de entrada (y spam) y vuelve a intentar.";
  }
  return message;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const OrgAuth = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingOrg, setCheckingOrg] = useState(true);
  const [organization, setOrganization] = useState<{
    id: string;
    name: string;
    logo_url: string | null;
    description: string | null;
    is_registration_open: boolean;
    default_role: string;
  } | null>(null);
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!slug) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, logo_url, description, is_registration_open, default_role")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        toast.error("Organización no encontrada");
        navigate("/auth");
        return;
      }

      setOrganization(data);
      setCheckingOrg(false);
    };

    fetchOrganization();
  }, [slug, navigate]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && organization) {
        // Check if already member of this org
        const { data: membership } = await supabase
          .from("organization_members")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("user_id", session.user.id)
          .single();

        if (membership) {
          navigate("/");
        }
      }
    };

    if (organization) {
      checkSession();
    }
  }, [organization, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setLoading(true);
    try {
      const email = normalizeEmail(loginEmail);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is member of this org
        const { data: membership } = await supabase
          .from("organization_members")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("user_id", data.user.id)
          .single();

        if (membership) {
          // Update current org
          await supabase
            .from("profiles")
            .update({ current_organization_id: organization.id })
            .eq("id", data.user.id);
          
          toast.success(`Bienvenido a ${organization.name}`);
          navigate("/");
        } else {
          toast.error("No tienes acceso a esta organización");
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      toast.error(mapAuthErrorMessage(error.message) || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    if (!organization.is_registration_open) {
      toast.error("El registro no está habilitado para esta organización");
      return;
    }

    setLoading(true);
    try {
      const email = normalizeEmail(signupEmail);
      const { data, error } = await supabase.auth.signUp({
        email,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/org/${slug}`,
          data: {
            full_name: signupName,
            organization_id: organization.id,
            organization_role: organization.default_role,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // If email confirmation is required, there is no session yet.
        // Avoid DB writes and guide the user to confirm their email.
        // Note: If auto-confirm is enabled, session will be available immediately.
        if (!data.session) {
          toast.success(
            "Cuenta creada. Revisa tu correo para confirmar tu email y luego inicia sesión para continuar."
          );
          navigate("/auth", { replace: true });
          return;
        }
        
        console.log('[OrgAuth] Session available, proceeding with org registration...');

        // The profile and org membership will be created by triggers
        // But we'll add org membership manually just in case
        await supabase.from("organization_members").insert({
          organization_id: organization.id,
          user_id: data.user.id,
          role: organization.default_role as any,
          is_owner: false,
        });

        // Also insert into organization_member_roles for multi-role support
        await supabase.from("organization_member_roles").insert({
          organization_id: organization.id,
          user_id: data.user.id,
          role: organization.default_role as any,
        });

        // Update profile with current org
        await supabase
          .from("profiles")
          .update({ current_organization_id: organization.id })
          .eq("id", data.user.id);

        toast.success("Registro exitoso. Tu solicitud está pendiente de aprobación.");
        navigate("/pending-access");
      }
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast.error("Este correo ya está registrado. Intenta iniciar sesión.");
      } else {
        toast.error(mapAuthErrorMessage(error.message) || "Error al registrarse");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {organization.logo_url ? (
            <img 
              src={organization.logo_url} 
              alt={organization.name}
              className="h-16 w-16 mx-auto rounded-lg object-cover"
            />
          ) : (
            <div className="h-16 w-16 mx-auto rounded-lg overflow-hidden">
              <img src="/favicon.png" alt="KREOON" className="h-16 w-16 object-cover" />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl">{organization.name}</CardTitle>
            {organization.description && (
              <CardDescription className="mt-2">{organization.description}</CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup" disabled={!organization.is_registration_open}>
                Registrarse
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo electrónico</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Iniciar Sesión
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 mt-4">
              {organization.is_registration_open ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Tu nombre"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Correo electrónico</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@correo.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Crear cuenta
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Tu solicitud será revisada por un administrador
                  </p>
                </form>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>El registro público no está habilitado.</p>
                  <p className="text-sm mt-2">Contacta al administrador para obtener acceso.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgAuth;
