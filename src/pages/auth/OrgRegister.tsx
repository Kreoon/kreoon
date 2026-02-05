import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Video,
  Scissors,
  Briefcase,
  Mail,
  Lightbulb,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  KreoonCard,
  KreoonButton,
  KreoonInput,
  KreoonBadge,
} from "@/components/ui/kreoon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RegistrationPageConfig {
  welcome_title?: string;
  welcome_message?: string;
  banner_url?: string;
  primary_color?: string;
  show_description?: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_registration_open: boolean;
  registration_require_invite: boolean;
  default_role: string;
  registration_page_config: RegistrationPageConfig | null;
}

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre es muy largo"),
    email: z
      .string()
      .trim()
      .email("Email inválido")
      .max(255, "El email es muy largo"),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(72, "La contraseña es muy larga"),
    confirmPassword: z.string(),
    inviteCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

const ROLE_OPTIONS: Array<{ value: string; label: string; icon: React.ReactNode; description?: string }> = [
  { value: "creator", label: "Creador de Contenido", icon: <Video className="h-4 w-4" />, description: "Creo contenido de video y UGC" },
  { value: "editor", label: "Productor Audio-Visual", icon: <Scissors className="h-4 w-4" />, description: "Edito videos profesionalmente" },
  { value: "strategist", label: "Estratega", icon: <Lightbulb className="h-4 w-4" />, description: "Planifico estrategias de contenido" },
  { value: "trafficker", label: "Trafficker", icon: <Target className="h-4 w-4" />, description: "Gestiono campañas publicitarias" },
  { value: "team_leader", label: "Líder de Equipo", icon: <Users className="h-4 w-4" />, description: "Coordino equipos de trabajo" },
  { value: "client", label: "Cliente / Marca", icon: <Briefcase className="h-4 w-4" />, description: "Soy cliente de la organización" },
];

export default function OrgRegister() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [bio, setBio] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [suggestedRole, setSuggestedRole] = useState<{
    role: string;
    confidence: number;
    reasoning: string;
  } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const fetchRoleSuggestion = async () => {
    if (!fullName.trim() || !email.trim() || !organization?.id) return;
    setLoadingSuggestion(true);
    try {
      const response = await supabase.functions.invoke("suggest-role", {
        body: {
          fullName: fullName.trim(),
          email: email.trim(),
          bio: bio.trim(),
          organizationId: organization.id,
        },
      });
      if (response.data?.suggestedRole) {
        setSuggestedRole({
          role: response.data.suggestedRole,
          confidence: response.data.confidence ?? 0.5,
          reasoning: response.data.reasoning ?? "",
        });
      }
    } catch (err) {
      console.error("Error fetching role suggestion:", err);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  useEffect(() => {
    if (slug) fetchOrganization();
  }, [slug]);

  useEffect(() => {
    if (organization?.default_role && ROLE_OPTIONS.some((r) => r.value === organization.default_role)) {
      setSelectedRole(organization.default_role);
    }
  }, [organization?.default_role]);

  const fetchOrganization = async () => {
    try {
      const { data: edgeData, error: edgeError } =
        await supabase.functions.invoke("org-public-info", {
          body: { slug },
        });

      if (edgeError) {
        const { data, error } = await supabase
          .from("organizations")
          .select(
            "id, name, slug, logo_url, description, is_registration_open, registration_require_invite, default_role, registration_page_config",
          )
          .eq("slug", slug)
          .single();

        if (error || !data) {
          setError("Organización no encontrada");
          return;
        }
        if (!data.is_registration_open) {
          setError("El registro no está habilitado para esta organización");
          return;
        }
        setOrganization(data as Organization);
        if (!data.registration_require_invite) setCodeVerified(true);
        return;
      }

      if (!edgeData || edgeData.error) {
        setError("Organización no encontrada");
        return;
      }
      if (!edgeData.is_registration_open) {
        setError("El registro no está habilitado para esta organización");
        return;
      }
      setOrganization(edgeData as Organization);
      if (!edgeData.registration_require_invite) setCodeVerified(true);
    } catch (err) {
      console.error("Error loading organization:", err);
      setError("Error al cargar la organización");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!inviteCode.trim()) {
      toast.error("Ingresa el código de invitación");
      return;
    }
    setSubmitting(true);
    try {
      const ip = "client-" + Math.random().toString(36).substring(7);
      const { data, error } = await supabase.rpc("validate_registration_code", {
        org_slug: slug,
        code: inviteCode.trim().toUpperCase(),
        ip,
      });
      if (error) throw error;
      const result = data as { valid: boolean; error?: string };
      if (!result.valid) {
        switch (result.error) {
          case "invalid_code":
            toast.error("Código inválido o expirado");
            break;
          case "rate_limited":
            toast.error("Demasiados intentos. Intenta de nuevo en 1 hora.");
            break;
          case "registration_disabled":
            toast.error("El registro está deshabilitado");
            break;
          default:
            toast.error("Error al verificar el código");
        }
        return;
      }
      setCodeVerified(true);
      toast.success("Código verificado correctamente");
    } catch (err) {
      toast.error("Error al verificar el código");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      inviteCode: organization?.registration_require_invite ? inviteCode : undefined,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    if (!selectedRole) {
      setFormErrors((prev) => ({ ...prev, role: "Debes seleccionar un rol" }));
      toast.error("Por favor selecciona cómo te unirás a la plataforma");
      return;
    }

    if (!organization) return;

    setSubmitting(true);
    const roleToAssign = selectedRole as
      | "creator"
      | "editor"
      | "client"
      | "admin"
      | "strategist"
      | "ambassador";

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName.trim() },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast.error("Este email ya está registrado. Intenta iniciar sesión.");
        } else {
          toast.error("Error al crear la cuenta: " + authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error("Error al crear la cuenta");
        return;
      }

      if (!authData.session) {
        toast.success(
          "Cuenta creada. Revisa tu correo para confirmar tu email y luego inicia sesión.",
        );
        navigate("/auth", { replace: true });
        return;
      }

      const userId = authData.user.id;

      let profileExists = false;
      for (let i = 0; i < 5; i++) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .single();
        if (profile) {
          profileExists = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!profileExists) {
        await supabase.from("profiles").upsert(
          {
            id: userId,
            email: email.trim(),
            full_name: fullName.trim(),
          },
          { onConflict: "id" },
        );
      }

      const { error: regError } = await supabase.rpc("register_user_to_organization", {
        p_organization_id: organization.id,
        p_user_id: userId,
        p_role: roleToAssign,
      });

      if (regError) {
        toast.error("Error al asignar tu rol. Por favor contacta soporte.");
        return;
      }

      supabase.functions
        .invoke("notify-new-member", {
          body: {
            user_id: userId,
            organization_id: organization.id,
            role: roleToAssign,
            user_name: fullName,
            user_email: email,
          },
        })
        .catch(() => {});

      toast.success("¡Cuenta creada exitosamente!");
      navigate(`/welcome?role=${roleToAssign}`);
    } catch (err) {
      toast.error("Error durante el registro");
    } finally {
      setSubmitting(false);
    }
  };

  const pageConfig = organization?.registration_page_config ?? {};
  const welcomeTitle = pageConfig.welcome_title ?? organization?.name ?? "";
  const welcomeMessage =
    pageConfig.welcome_message ?? organization?.description ?? "Únete a nuestra organización";
  const primaryColor = pageConfig.primary_color ?? "#7c3aed";

  const leftColumnContent = organization && (
    <div className="relative flex h-full min-h-screen flex-col overflow-hidden">
      {pageConfig.banner_url && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${pageConfig.banner_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0 bg-kreoon-gradient-dark"
        aria-hidden
      />
      <div
        className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full opacity-30"
        style={{
          background: `radial-gradient(circle, ${primaryColor}50 0%, transparent 70%)`,
          filter: "blur(50px)",
        }}
        aria-hidden
      />
      <div className="relative flex flex-1 flex-col p-8 lg:p-10">
        <div className="flex items-center gap-3">
          {organization.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${primaryColor}30` }}
            >
              <Building2 className="h-6 w-6" style={{ color: primaryColor }} />
            </div>
          )}
          <span
            className="text-xl font-bold tracking-tight text-kreoon-text-primary"
            style={{ color: primaryColor }}
          >
            {organization.name}
          </span>
        </div>
        <div className="mt-12 flex flex-1 flex-col justify-center space-y-4">
          <h2 className="text-2xl font-bold text-kreoon-text-primary lg:text-3xl">
            {welcomeTitle}
          </h2>
          <p className="text-kreoon-text-secondary">{welcomeMessage}</p>
          {pageConfig.show_description &&
            organization.description &&
            pageConfig.welcome_message !== organization.description && (
              <p className="text-sm text-kreoon-text-muted">{organization.description}</p>
            )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AuthLayout showBranding leftColumnContent={leftColumnContent}>
        <KreoonCard className="w-full max-w-md p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-kreoon-bg-secondary" />
            <div className="h-6 w-48 animate-pulse rounded bg-kreoon-bg-secondary" />
            <div className="h-4 w-64 animate-pulse rounded bg-kreoon-bg-secondary" />
            <div className="mt-6 w-full space-y-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-kreoon-bg-secondary" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-kreoon-bg-secondary" />
            </div>
          </div>
        </KreoonCard>
      </AuthLayout>
    );
  }

  if (error) {
    return (
      <AuthLayout showBranding>
        <KreoonCard className="w-full max-w-md p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-kreoon-text-primary">No disponible</h2>
            <p className="mt-2 text-sm text-kreoon-text-secondary">{error}</p>
            <KreoonButton
              variant="outline"
              size="lg"
              className="mt-6 gap-2"
              onClick={() => navigate("/auth")}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </KreoonButton>
          </div>
        </KreoonCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout showBranding leftColumnContent={leftColumnContent}>
      <KreoonCard glow className="w-full max-w-md overflow-hidden">
        <div className="p-6">
          <h3 className="text-center text-lg font-semibold text-kreoon-text-primary">
            Unirse a {organization?.name}
          </h3>

          {!codeVerified && organization?.registration_require_invite ? (
            <div className="mt-6 space-y-4">
              <div
                className="rounded-xl border-2 p-4 text-center"
                style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}08` }}
              >
                <Lock className="mx-auto mb-2 h-8 w-8 text-kreoon-text-muted" />
                <p className="text-sm font-medium text-kreoon-text-primary">
                  Registro exclusivo para miembros invitados
                </p>
                <p className="mt-1 text-xs text-kreoon-text-secondary">
                  Solicita el código a tu administrador
                </p>
              </div>
              <KreoonInput
                label="Código de invitación"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ej: ABC12345"
                className="text-center font-mono text-lg tracking-widest uppercase"
                error={formErrors.inviteCode}
              />
              <KreoonButton
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                loading={submitting}
                disabled={submitting || !inviteCode.trim()}
                onClick={handleVerifyCode}
              >
                Verificar código
              </KreoonButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {codeVerified && organization?.registration_require_invite && (
                <KreoonBadge variant="success" className="w-full justify-center py-2">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Código verificado
                </KreoonBadge>
              )}

              <KreoonInput
                label="Nombre completo"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setFormErrors((p) => ({ ...p, fullName: "" }));
                }}
                placeholder="Tu nombre completo"
                error={formErrors.fullName}
                disabled={submitting}
              />

              <KreoonInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormErrors((p) => ({ ...p, email: "" }));
                }}
                placeholder="tu@email.com"
                error={formErrors.email}
                disabled={submitting}
                icon={<Mail className="h-4 w-4" />}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-kreoon-text-secondary">
                  Cuéntanos sobre ti (opcional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="¿Qué haces? ¿Cuál es tu experiencia?"
                  rows={3}
                  disabled={submitting}
                  className={cn(
                    "w-full rounded-xl border bg-kreoon-bg-secondary px-3 py-2 text-sm text-kreoon-text-primary",
                    "border-kreoon-border placeholder:text-kreoon-text-muted/70 resize-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50",
                  )}
                />
                <p className="text-xs text-kreoon-text-muted">
                  Nos ayuda a personalizar tu experiencia
                </p>
              </div>

              <KreoonButton
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={fetchRoleSuggestion}
                disabled={loadingSuggestion || !fullName.trim() || !email.trim()}
                loading={loadingSuggestion}
              >
                <Sparkles className="h-4 w-4" />
                Sugerir rol con IA
              </KreoonButton>

              {(loadingSuggestion || suggestedRole) && (
                <div
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: `${primaryColor}30`,
                    backgroundColor: `${primaryColor}08`,
                  }}
                >
                  {loadingSuggestion ? (
                    <div className="flex items-center gap-2 text-sm text-kreoon-text-secondary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando tu perfil...
                    </div>
                  ) : (
                    suggestedRole && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <KreoonBadge variant="purple" size="sm">
                            {ROLE_OPTIONS.find((r) => r.value === suggestedRole.role)?.label ??
                              suggestedRole.role}
                          </KreoonBadge>
                          <span className="text-xs text-kreoon-text-muted">
                            {Math.round(suggestedRole.confidence * 100)}% confianza
                          </span>
                        </div>
                        <p className="text-xs text-kreoon-text-secondary">
                          {suggestedRole.reasoning}
                        </p>
                        <KreoonButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRole(suggestedRole.role)}
                        >
                          Usar esta sugerencia
                        </KreoonButton>
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-kreoon-text-secondary">
                  ¿Cómo te unirás? <span className="text-destructive">*</span>
                </label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => {
                    setSelectedRole(v);
                    setFormErrors((p) => ({ ...p, role: "" }));
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "rounded-xl border bg-kreoon-bg-secondary text-kreoon-text-primary",
                      formErrors.role && "border-destructive",
                    )}
                  >
                    <SelectValue placeholder="Selecciona tu rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          {r.icon}
                          <div className="flex flex-col">
                            <span>{r.label}</span>
                            {r.description && (
                              <span className="text-xs text-kreoon-text-muted">{r.description}</span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.role && (
                  <p className="text-xs text-destructive">{formErrors.role}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-kreoon-text-secondary">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-kreoon-text-muted">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFormErrors((p) => ({ ...p, password: "" }));
                    }}
                    placeholder="Mínimo 6 caracteres"
                    disabled={submitting}
                    className={cn(
                      "flex h-10 w-full rounded-xl border bg-kreoon-bg-secondary pl-10 pr-10 py-2 text-sm text-kreoon-text-primary",
                      "border-kreoon-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50",
                      "disabled:opacity-50",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-kreoon-text-muted"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-xs text-destructive">{formErrors.password}</p>
                )}
              </div>

              <KreoonInput
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFormErrors((p) => ({ ...p, confirmPassword: "" }));
                }}
                placeholder="Repite tu contraseña"
                error={formErrors.confirmPassword}
                disabled={submitting}
              />

              <KreoonButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={submitting}
                disabled={submitting}
              >
                Crear cuenta
              </KreoonButton>

              <p className="text-center text-xs text-kreoon-text-muted">
                Tu cuenta quedará vinculada a{" "}
                <span className="font-medium text-kreoon-text-primary">{organization?.name}</span>
              </p>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-sm text-kreoon-purple-400 hover:text-kreoon-purple-300"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          </div>
        </div>
      </KreoonCard>
    </AuthLayout>
  );
}
