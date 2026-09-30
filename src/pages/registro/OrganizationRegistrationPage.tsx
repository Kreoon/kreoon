import * as React from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { RegistrationShell } from "@/components/registro/RegistrationShell";
import {
  RegistrationLoading,
  RegistrationStatusCard,
  type RegistrationBlockedReason,
} from "@/components/registro/RegistrationStatusCard";
import { CreatorSignupForm, type CreatorSignupValues } from "@/components/registro/CreatorSignupForm";
import { VerifyEmailPanel } from "@/components/registro/VerifyEmailPanel";
import { ContinueSignup } from "@/components/registro/ContinueSignup";
import { normalizeOrgSlug, registrationContinuePath, registrationPath } from "@/lib/registration/paths";
import { buildCanonicalRegistrationUrl } from "@/lib/registration/legacyRedirect";
import { pickAttribution } from "@/lib/registration/attribution";
import { sanitizeReturnTo } from "@/lib/registration/returnTo";
import {
  getCreatorSignupDocuments,
  getRegistrationOrg,
  rememberSignupIntent,
  RegistrationError,
  resendConfirmation,
  resolveRegistrationSlugForHost,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/registration/service";

type View = { kind: "form" } | { kind: "verify"; email: string } | { kind: "exists"; email: string };

/**
 * ÚNICA página de registro público de creadores, parametrizada por organización:
 *   /registro/:organizationSlug            → crear cuenta
 *   /registro/:organizationSlug/continuar  → paso con sesión (OAuth, enlace de correo)
 * Cada organización solo aporta nombre, logo, textos permitidos y estado de inscripción.
 */
export default function OrganizationRegistrationPage({ mode }: { mode: "register" | "continue" }) {
  const { organizationSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const slug = normalizeOrgSlug(organizationSlug);
  const attribution = React.useMemo(() => pickAttribution(location.search), [location.search]);
  const next = React.useMemo(() => sanitizeReturnTo(new URLSearchParams(location.search).get("next")), [location.search]);

  const orgQuery = useQuery({
    queryKey: ["registration-org", slug],
    queryFn: () => getRegistrationOrg(slug as string),
    enabled: Boolean(slug),
    staleTime: 60_000,
    retry: 1,
  });
  const docsQuery = useQuery({
    queryKey: ["creator-signup-documents"],
    queryFn: getCreatorSignupDocuments,
    enabled: mode === "register" && orgQuery.data?.status === "open",
    staleTime: 5 * 60_000,
  });

  const [view, setView] = React.useState<View>({ kind: "form" });
  const [lastEmail, setLastEmail] = React.useState("");
  const [consented, setConsented] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const org = orgQuery.data?.organization;

  // Alias → slug canónico (mismo ID de organización), conservando la consulta.
  if (mode === "register" && org && slug && org.slug !== slug) {
    return <Navigate to={`${registrationPath(org.slug)}${location.search}`} replace />;
  }
  if (mode === "continue" && org && slug && org.slug !== slug) {
    return <Navigate to={`${registrationContinuePath(org.slug)}${location.search}`} replace />;
  }

  // Sesión activa en la pantalla de alta: el servidor decide en el paso "continuar".
  if (mode === "register" && !authLoading && user && org && slug && orgQuery.data?.status === "open") {
    return <Navigate to={`${registrationContinuePath(org.slug)}${location.search}`} replace />;
  }

  const blockedReason = (): RegistrationBlockedReason | null => {
    if (!slug) return "not_found";
    if (orgQuery.isError) return "error";
    const s = orgQuery.data?.status;
    if (s === "not_found") return "not_found";
    if (s === "inactive") return "inactive";
    // En "continuar" el servidor decide: quien ya es miembro debe poder terminar aunque la inscripción
    // haya cerrado después; ContinueSignup muestra "cerrada" solo si de verdad no es miembro.
    if (s === "closed" && mode === "register") return "closed";
    return null;
  };

  const errorMessage = (e: unknown): string => {
    if (e instanceof RegistrationError) {
      if (e.code === "weak_password") return "Esa contraseña no cumple los requisitos. Prueba con una más larga.";
      if (e.code === "rate_limited") return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
      if (e.code === "network") return "Parece que no hay conexión. Revisa tu internet e inténtalo de nuevo.";
    }
    return "No pudimos crear tu cuenta. Inténtalo de nuevo en un momento.";
  };

  const docs = docsQuery.data ?? [];
  const docIds = docs.map((d) => d.document_id);

  const handleEmailSubmit = async (v: CreatorSignupValues) => {
    if (!org) return;
    setSubmitting(true);
    setError(null);
    try {
      setLastEmail(v.email);
      rememberSignupIntent({ slug: org.slug, documentIds: docIds, attribution, next });
      const res = await signUpWithEmail({ slug: org.slug, ...v, attribution, next });
      if (res.kind === "session") {
        navigate(`${registrationContinuePath(org.slug)}${location.search}`, { replace: true });
      } else if (res.kind === "verify_email") {
        setView({ kind: "verify", email: v.email });
      } else {
        setView({ kind: "exists", email: v.email });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!org) return;
    setGoogleLoading(true);
    setError(null);
    try {
      rememberSignupIntent({ slug: org.slug, documentIds: docIds, attribution, next });
      await signInWithGoogle({ slug: org.slug, attribution, next });
      // El navegador se redirige a Google; no se apaga el loading a propósito.
    } catch (e) {
      setError(errorMessage(e));
      setGoogleLoading(false);
    }
  };

  const title = org ? `Únete a ${org.name} como creador` : "Únete como creador";
  const reason = blockedReason();
  const loading = Boolean(slug) && (orgQuery.isLoading || (mode === "continue" && authLoading));

  let body: React.ReactNode;
  if (loading) {
    body = <RegistrationLoading />;
  } else if (reason) {
    body = <RegistrationStatusCard reason={reason} orgName={org?.name} onRetry={() => orgQuery.refetch()} />;
  } else if (!org) {
    body = <RegistrationLoading />;
  } else if (mode === "continue") {
    body = <ContinueSignup slug={org.slug} orgName={org.name} attribution={attribution} next={next} />;
  } else if (view.kind === "verify") {
    body = (
      <VerifyEmailPanel
        email={view.email}
        onResend={() => resendConfirmation({ slug: org.slug, email: view.email, attribution, next })}
        onWrongEmail={() => setView({ kind: "form" })}
      />
    );
  } else if (view.kind === "exists") {
    body = (
      <div className="space-y-4 text-center" role="status">
        <h1 className="text-xl font-semibold tracking-tight">Ya tienes una cuenta con este correo</h1>
        <p className="text-sm text-muted-foreground">
          Inicia sesión con <span className="font-medium text-foreground">{view.email}</span>. Si quieres sumarte a {org.name}, te lo pediremos al entrar.
        </p>
        <div className="flex flex-col gap-2">
          <a
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            href={`/auth?next=${encodeURIComponent(registrationContinuePath(org.slug))}`}
          >
            Iniciar sesión
          </a>
          <button type="button" onClick={() => setView({ kind: "form" })} className="h-11 rounded-xl text-sm text-muted-foreground hover:text-foreground">
            Usar otro correo
          </button>
        </div>
      </div>
    );
  } else if (docsQuery.isLoading) {
    body = <RegistrationLoading />;
  } else if (docsQuery.isError) {
    body = <RegistrationStatusCard reason="error" onRetry={() => docsQuery.refetch()} />;
  } else {
    body = (
      <CreatorSignupForm
        orgName={org.name}
        documents={docs}
        consented={consented}
        onConsentChange={setConsented}
        initialEmail={lastEmail}
        submitting={submitting}
        googleLoading={googleLoading}
        error={error}
        onSubmit={handleEmailSubmit}
        onGoogle={handleGoogle}
      />
    );
  }

  return (
    <RegistrationShell orgName={org?.name} orgLogoUrl={org?.logo_url}>
      <Helmet>
        <title>{title} | Kreoon</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      {body}
    </RegistrationShell>
  );
}

/**
 * Entradas genéricas (/registro, /register, /auth?tab=register...): resuelven la organización
 * según el host en el SERVIDOR y redirigen al registro canónico. Sin contexto válido → estado claro,
 * nunca un fallback silencioso a otra organización.
 */
export function RegistrationEntryRedirect({ buildTarget }: { buildTarget?: (slug: string, search: string) => string }) {
  const location = useLocation();
  const q = useQuery({
    queryKey: ["registration-default-slug", window.location.hostname],
    queryFn: () => resolveRegistrationSlugForHost(window.location.hostname),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (q.isLoading) {
    return (
      <RegistrationShell>
        <RegistrationLoading />
      </RegistrationShell>
    );
  }
  if (q.isError) {
    return (
      <RegistrationShell>
        <RegistrationStatusCard reason="error" onRetry={() => q.refetch()} />
      </RegistrationShell>
    );
  }
  if (!q.data) {
    return (
      <RegistrationShell>
        <RegistrationStatusCard reason="no_context" />
      </RegistrationShell>
    );
  }
  // Solo atribución y destino interno validados; jamás role/intent/org/plan del enlace heredado.
  const to = buildTarget ? buildTarget(q.data, location.search) : buildCanonicalRegistrationUrl(q.data, location.search);
  return <Navigate to={to} replace />;
}
