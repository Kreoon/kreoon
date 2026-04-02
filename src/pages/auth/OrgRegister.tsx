import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Building2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Instagram,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { KreoonCard, KreoonButton } from "@/components/ui/kreoon";
import { WizardContainer } from "@/components/registration-v2";

interface RegistrationPageConfig {
  welcome_title?: string;
  welcome_message?: string;
  banner_url?: string;
  primary_color?: string;
  show_description?: boolean;
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

export default function OrgRegister() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isConfirmed = searchParams.get("confirmed") === "true";
  const { refetchUserData } = useAuth();
  useUTMTracking();

  const [loading, setLoading] = useState(true);
  const [completingRegistration, setCompletingRegistration] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) fetchOrganization();
  }, [slug]);

  // Handle completing registration after email confirmation
  useEffect(() => {
    const completeOrgRegistration = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const pendingReg = localStorage.getItem("pendingOrgRegistration");
      const userMeta = session.user.user_metadata;

      const pendingOrgId = pendingReg
        ? JSON.parse(pendingReg).orgId
        : userMeta?.pending_org_id;
      const pendingRole = pendingReg
        ? JSON.parse(pendingReg).role
        : userMeta?.pending_org_role;

      if (!pendingOrgId || !pendingRole) return;

      if (organization && pendingOrgId === organization.id) {
        setCompletingRegistration(true);
        try {
          // Wait for profile to be created by trigger
          let profileExists = false;
          for (let i = 0; i < 5; i++) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", session.user.id)
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
                id: session.user.id,
                email: session.user.email || "",
                full_name: userMeta?.full_name || session.user.email || "",
              },
              { onConflict: "id" }
            );
          }

          const { error: regError } = await supabase.rpc("register_user_to_organization", {
            p_organization_id: pendingOrgId,
            p_user_id: session.user.id,
            p_role: pendingRole,
          });

          if (regError) {
            console.error("Error completing org registration:", regError);
            toast.error("Error al completar el registro en la organización");
          } else {
            localStorage.removeItem("pendingOrgRegistration");
            localStorage.removeItem("kreoon_pending_registration");
            await refetchUserData();

            supabase.functions
              .invoke("notify-new-member", {
                body: {
                  user_id: session.user.id,
                  organization_id: pendingOrgId,
                  role: pendingRole,
                  user_name: userMeta?.full_name || "",
                  user_email: session.user.email || "",
                },
              })
              .catch(() => {});

            toast.success("¡Registro completado exitosamente!");
            navigate(`/welcome?role=${pendingRole}`);
          }
        } catch (err) {
          console.error("Error completing registration:", err);
          toast.error("Error al completar el registro");
        } finally {
          setCompletingRegistration(false);
        }
      }
    };

    if (isConfirmed && organization) {
      completeOrgRegistration();
    }
  }, [isConfirmed, organization, navigate]);

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
            "id, name, slug, logo_url, description, is_registration_open, registration_require_invite, default_role, registration_page_config"
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
    } catch (err) {
      console.error("Error loading organization:", err);
      setError("Error al cargar la organización");
    } finally {
      setLoading(false);
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

  // Left column with organization branding
  const leftColumnContent = organization && (
    <div className="relative flex h-full min-h-screen flex-col overflow-hidden">
      {/* Banner background */}
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

      <div className="relative flex flex-1 flex-col p-8 lg:p-10">
        {/* Header with logo */}
        <div className="flex items-center gap-3">
          {organization.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="h-14 w-14 rounded-sm object-cover ring-2 ring-white/20"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-sm ring-2 ring-white/20"
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

        {/* Main content */}
        <div className="mt-10 flex flex-1 flex-col justify-center space-y-8">
          {/* Welcome section */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white lg:text-4xl">
              {welcomeTitle}
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">{welcomeMessage}</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {pageConfig.stats_members && (
                <div
                  className="rounded-sm p-4 text-center"
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
                  className="rounded-sm p-4 text-center"
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
                  className="rounded-sm p-4 text-center"
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

  // Loading state
  if (loading || completingRegistration) {
    return (
      <AuthLayout showBranding leftColumnContent={leftColumnContent}>
        <KreoonCard className="w-full max-w-md p-6">
          <div className="flex flex-col items-center gap-4">
            {completingRegistration ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h3 className="text-lg font-semibold text-kreoon-text-primary">
                  Completando registro...
                </h3>
                <p className="text-sm text-kreoon-text-secondary text-center">
                  Estamos agregándote a la organización
                </p>
              </>
            ) : (
              <>
                <div className="h-12 w-12 animate-pulse rounded-sm bg-kreoon-bg-secondary" />
                <div className="h-6 w-48 animate-pulse rounded bg-kreoon-bg-secondary" />
                <div className="h-4 w-64 animate-pulse rounded bg-kreoon-bg-secondary" />
              </>
            )}
          </div>
        </KreoonCard>
      </AuthLayout>
    );
  }

  // Error state
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

  // Main registration view
  return (
    <AuthLayout showBranding leftColumnContent={leftColumnContent}>
      <div className="w-full max-w-md py-8">
        <WizardContainer
          flow="org"
          orgSlug={organization?.slug}
          orgId={organization?.id}
          orgName={organization?.name}
          orgLogo={organization?.logo_url}
          requiresInviteCode={organization?.registration_require_invite}
        />
      </div>
    </AuthLayout>
  );
}
