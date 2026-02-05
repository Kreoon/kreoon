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
  Instagram,
  Globe,
  ExternalLink,
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
  // Landing page enhancements
  tagline?: string;
  benefits?: string[];
  cta_text?: string;
  social_instagram?: string;
  social_tiktok?: string;
  social_linkedin?: string;
  social_website?: string;
  stats_members?: number;
  stats_campaigns?: number;
  stats_videos?: number;
  show_stats?: boolean;
  banner_overlay_opacity?: number;
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

  const bannerOpacity = (pageConfig.banner_overlay_opacity ?? 40) / 100;
  const benefits = pageConfig.benefits || [];
  const showStats = pageConfig.show_stats && (pageConfig.stats_members || pageConfig.stats_campaigns || pageConfig.stats_videos);
  const hasSocials = pageConfig.social_instagram || pageConfig.social_tiktok || pageConfig.social_linkedin || pageConfig.social_website;

  const leftColumnContent = organization && (
    <div className="relative flex h-full min-h-screen flex-col overflow-hidden">
      {/* Banner background with configurable opacity */}
      {pageConfig.banner_url && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${pageConfig.banner_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: bannerOpacity,
          }}
          aria-hidden
        />
      )}
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)`,
        }}
        aria-hidden
      />
      {/* Accent glow */}
      <div
        className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
        aria-hidden
      />
      <div
        className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full opacity-15"
        style={{
          background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col p-8 lg:p-10">
        {/* Header with logo */}
        <div className="flex items-center gap-3">
          {organization.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="h-14 w-14 rounded-xl object-cover ring-2 ring-white/20"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl ring-2 ring-white/20"
              style={{ backgroundColor: `${primaryColor}40` }}
            >
              <Building2 className="h-7 w-7" style={{ color: primaryColor }} />
            </div>
          )}
          <div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: primaryColor }}
            >
              {organization.name}
            </span>
            {pageConfig.tagline && (
              <p className="text-sm text-white/60">{pageConfig.tagline}</p>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="mt-10 flex flex-1 flex-col justify-center space-y-8">
          {/* Welcome section */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white lg:text-4xl">
              {welcomeTitle}
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">{welcomeMessage}</p>
            {pageConfig.show_description &&
              organization.description &&
              pageConfig.welcome_message !== organization.description && (
                <p className="text-sm text-white/60">{organization.description}</p>
              )}
          </div>

          {/* Benefits section */}
          {benefits.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
                Beneficios
              </h3>
              <ul className="space-y-3">
                {benefits.slice(0, 6).map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2
                      className="h-5 w-5 shrink-0 mt-0.5"
                      style={{ color: primaryColor }}
                    />
                    <span className="text-white/90">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stats section */}
          {showStats && (
            <div className="grid grid-cols-3 gap-4">
              {pageConfig.stats_members && (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: primaryColor }}
                  >
                    {pageConfig.stats_members}+
                  </div>
                  <div className="text-xs text-white/60 mt-1">Miembros</div>
                </div>
              )}
              {pageConfig.stats_campaigns && (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: primaryColor }}
                  >
                    {pageConfig.stats_campaigns}+
                  </div>
                  <div className="text-xs text-white/60 mt-1">Campañas</div>
                </div>
              )}
              {pageConfig.stats_videos && (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: primaryColor }}
                  >
                    {pageConfig.stats_videos}+
                  </div>
                  <div className="text-xs text-white/60 mt-1">Videos</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with social links */}
        {hasSocials && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-4">
              {pageConfig.social_instagram && (
                <a
                  href={`https://instagram.com/${pageConfig.social_instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Instagram"
                >
                  <Instagram className="h-5 w-5 text-white/80" />
                </a>
              )}
              {pageConfig.social_tiktok && (
                <a
                  href={`https://tiktok.com/${pageConfig.social_tiktok.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="TikTok"
                >
                  <svg className="h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              )}
              {pageConfig.social_linkedin && (
                <a
                  href={pageConfig.social_linkedin.startsWith('http') ? pageConfig.social_linkedin : `https://linkedin.com/company/${pageConfig.social_linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="LinkedIn"
                >
                  <svg className="h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
              {pageConfig.social_website && (
                <a
                  href={pageConfig.social_website.startsWith('http') ? pageConfig.social_website : `https://${pageConfig.social_website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Sitio Web"
                >
                  <Globe className="h-5 w-5 text-white/80" />
                </a>
              )}
            </div>
          </div>
        )}
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
                {pageConfig.cta_text || 'Crear cuenta'}
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
