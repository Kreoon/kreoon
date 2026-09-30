import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { ConsentBlock } from "./ConsentBlock";
import { RegistrationLoading, RegistrationStatusCard } from "./RegistrationStatusCard";
import { VerifyEmailPanel } from "./VerifyEmailPanel";
import {
  clearSignupIntent,
  completeCreatorSignup,
  getMyCreatorSignupState,
  readSignupIntent,
  RegistrationError,
  resendConfirmation,
  type MySignupState,
  type SignupDocument,
} from "@/lib/registration/service";
import type { Attribution } from "@/lib/registration/attribution";
import { registrationContinuePath, registrationPath } from "@/lib/registration/paths";
import { creatorOnboardingPath } from "@/lib/registration/destination";
import { sanitizeReturnTo } from "@/lib/registration/returnTo";

interface ContinueSignupProps {
  slug: string;
  orgName: string;
  attribution: Attribution;
  next: string | null;
}

type Phase =
  | { kind: "loading" }
  | { kind: "link_error" }
  | { kind: "needs_login" }
  | { kind: "confirm"; state: MySignupState }
  | { kind: "joining" }
  | { kind: "blocked"; reason: "closed" | "inactive" | "not_found" }
  | { kind: "error"; message: string };

/** Errores del enlace de Supabase llegan en el hash (#error=access_denied&error_code=otp_expired). */
function hasAuthLinkError(): boolean {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const q = new URLSearchParams(window.location.search);
  return Boolean(h.get("error") || h.get("error_code") || q.get("error_code"));
}

/**
 * Paso que requiere sesión: aquí se crea (o no) la membresía. Toda decisión la toma el servidor.
 *  - Mismo navegador que inició el registro (intención en sessionStorage): continúa solo.
 *  - Otro dispositivo / inicio de sesión ambiguo: pide una confirmación explícita. Nunca se
 *    concede membresía solo por abrir la URL.
 */
export function ContinueSignup({ slug, orgName, attribution, next }: ContinueSignupProps) {
  const navigate = useNavigate();
  const { user, loading, refetchUserData } = useAuth();
  const [phase, setPhase] = React.useState<Phase>({ kind: "loading" });
  const [consented, setConsented] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const startedRef = React.useRef(false);

  const finish = React.useCallback(async () => {
    clearSignupIntent();
    // Refresca roles/organización en el contexto ANTES de navegar, para no rebotar por gates.
    await refetchUserData();
    navigate(creatorOnboardingPath(next), { replace: true });
  }, [navigate, next, refetchUserData]);

  const handleBlockingError = React.useCallback((e: unknown): Phase => {
    if (e instanceof RegistrationError) {
      if (e.code === "registration_closed") return { kind: "blocked", reason: "closed" };
      if (e.code === "org_inactive") return { kind: "blocked", reason: "inactive" };
      if (e.code === "org_not_found") return { kind: "blocked", reason: "not_found" };
    }
    return { kind: "error", message: "No pudimos completar tu registro. Tu cuenta sigue segura; inténtalo de nuevo." };
  }, []);

  React.useEffect(() => {
    if (loading || startedRef.current) return;
    if (!user) {
      setPhase(hasAuthLinkError() ? { kind: "link_error" } : { kind: "needs_login" });
      return;
    }
    startedRef.current = true;

    (async () => {
      try {
        const state = await getMyCreatorSignupState(slug);
        if (state.status === "not_found" || state.status === "inactive") {
          setPhase({ kind: "blocked", reason: state.status });
          return;
        }
        if (state.is_member) {
          await finish();
          return;
        }
        if (state.status === "closed") {
          setPhase({ kind: "blocked", reason: "closed" });
          return;
        }

        // Mismo navegador, sin membresías en otras organizaciones: continuar solo con lo que el
        // usuario aceptó en el formulario (el servidor verifica y registra versión/fecha/IP).
        const intent = readSignupIntent(slug, user.email);
        const noMissing = (state.missing_documents ?? []).length === 0;
        if (intent && !state.has_other_memberships) {
          setPhase({ kind: "joining" });
          const res = await completeCreatorSignup({ slug, documentIds: intent.documentIds, attribution });
          if (res.status === "joined" || res.status === "already_member") {
            await finish();
            return;
          }
        }
        // Sin intención (otro dispositivo) o con otras membresías: acción explícita del usuario.
        if (noMissing) setConsented(true);
        setPhase({ kind: "confirm", state });
      } catch (e) {
        if (e instanceof RegistrationError && e.code === "consents_required") {
          try {
            setPhase({ kind: "confirm", state: await getMyCreatorSignupState(slug) });
            return;
          } catch {
            /* cae al error genérico */
          }
        }
        setPhase(handleBlockingError(e));
      }
    })();
  }, [loading, user, slug, attribution, finish, handleBlockingError]);

  const confirmJoin = async () => {
    if (phase.kind !== "confirm") return;
    const docs: SignupDocument[] = phase.state.missing_documents ?? [];
    if (docs.length > 0 && !consented) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await completeCreatorSignup({
        slug,
        documentIds: docs.map((d) => d.document_id),
        attribution,
        explicit: true,
      });
      if (res.status === "joined" || res.status === "already_member") {
        await finish();
        return;
      }
      setActionError("Aún no pudimos confirmar tu membresía. Inténtalo de nuevo.");
    } catch (e) {
      const p = handleBlockingError(e);
      if (p.kind === "blocked") setPhase(p);
      else setActionError("No pudimos completar tu registro. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──
  if (phase.kind === "loading" || phase.kind === "joining") {
    return <RegistrationLoading label={phase.kind === "joining" ? `Uniéndote a ${orgName}…` : "Verificando tu cuenta…"} />;
  }

  if (phase.kind === "blocked") return <RegistrationStatusCard reason={phase.reason} orgName={orgName} />;

  if (phase.kind === "error") {
    return (
      <div className="space-y-4 text-center" role="alert">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" aria-hidden />
        <p className="text-sm text-muted-foreground">{phase.message}</p>
        <Button
          className="h-12 w-full rounded-xl"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (phase.kind === "link_error") {
    return <ExpiredLink slug={slug} attribution={attribution} next={next} />;
  }

  if (phase.kind === "needs_login") {
    const back = sanitizeReturnTo(registrationContinuePath(slug));
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Inicia sesión para continuar</h1>
        <p className="text-sm text-muted-foreground">
          Para unirte a {orgName} como creador necesitamos que entres con tu cuenta.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild className="h-12 w-full rounded-xl">
            <Link to={`/auth${back ? `?next=${encodeURIComponent(back)}` : ""}`}>Iniciar sesión</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full rounded-xl">
            <Link to={registrationPath(slug)}>Crear una cuenta</Link>
          </Button>
        </div>
      </div>
    );
  }

  // phase.kind === "confirm"
  const docs = phase.state.missing_documents ?? [];
  const other = phase.state.has_other_memberships;
  return (
    <div className="space-y-5">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">Unirte a {orgName} como creador</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {other
            ? `Tu cuenta ya pertenece a otra organización. Al continuar sumamos tu membresía en ${orgName}; no copiamos información entre organizaciones.`
            : `Tu cuenta está lista. Confirma para activar tu perfil de creador en ${orgName}.`}
        </p>
      </div>

      {actionError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {docs.length > 0 ? <ConsentBlock documents={docs} checked={consented} onCheckedChange={setConsented} disabled={submitting} id="continue-consent" /> : null}

      <Button
        onClick={confirmJoin}
        disabled={submitting || (docs.length > 0 && !consented)}
        className="h-12 w-full rounded-xl text-base font-semibold"
      >
        {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
        Unirme a {orgName}
      </Button>
    </div>
  );
}

/** Enlace vencido o ya usado: pide el correo y reenvía uno nuevo. */
function ExpiredLink({ slug, attribution, next }: { slug: string; attribution: Attribution; next: string | null }) {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (sent) {
    return (
      <VerifyEmailPanel
        email={email}
        onResend={() => resendConfirmation({ slug, email, attribution, next })}
        onWrongEmail={() => setSent(false)}
      />
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await resendConfirmation({ slug, email, attribution, next });
          setSent(true);
        } catch {
          setError("No pudimos enviar el correo. Revisa la dirección o inténtalo en unos minutos.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Este enlace ya no es válido</h1>
        <p className="text-sm text-muted-foreground">Venció o ya se usó. Escribe tu correo y te enviamos uno nuevo.</p>
      </div>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="expired-email">Correo</Label>
        <Input id="expired-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl text-base" />
      </div>
      <Button type="submit" disabled={busy || !email} className="h-12 w-full rounded-xl">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        Enviarme un enlace nuevo
      </Button>
      <Button asChild variant="ghost" className="h-11 w-full rounded-xl">
        <Link to="/auth">Ya confirmé mi correo · Iniciar sesión</Link>
      </Button>
    </form>
  );
}
