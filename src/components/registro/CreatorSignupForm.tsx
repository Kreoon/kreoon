import * as React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConsentBlock } from "./ConsentBlock";
import type { SignupDocument } from "@/lib/registration/service";

export interface CreatorSignupValues {
  name: string;
  email: string;
  password: string;
}

interface CreatorSignupFormProps {
  orgName: string;
  documents: SignupDocument[];
  consented: boolean;
  onConsentChange: (v: boolean) => void;
  initialEmail?: string;
  submitting: boolean;
  googleLoading: boolean;
  error: string | null;
  onSubmit: (v: CreatorSignupValues) => void;
  onGoogle: () => void;
}

/**
 * Google solo se muestra cuando el proveedor está configurado en Supabase Auth. No es verificable
 * desde el cliente: se controla con VITE_GOOGLE_AUTH_ENABLED=false (por defecto visible).
 */
const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_AUTH_ENABLED !== "false";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD_LENGTH = 8;

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.4 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function CreatorSignupForm(props: CreatorSignupFormProps) {
  const { orgName, documents, consented, onConsentChange, submitting, googleLoading, error } = props;
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState(props.initialEmail ?? "");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const busy = submitting || googleLoading;
  const nameOk = name.trim().length >= 2;
  const emailOk = EMAIL_RE.test(email.trim());
  const passwordOk = password.length >= MIN_PASSWORD_LENGTH;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!nameOk || !emailOk || !passwordOk || !consented) return;
    props.onSubmit({ name: name.trim(), email: email.trim(), password });
  };

  const handleGoogle = () => {
    setTouched(true);
    if (!consented) return;
    props.onGoogle();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-primary">Tu talento merece ser visto.</p>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Únete a {orgName} como creador
        </h1>
        <p className="text-sm text-muted-foreground">Crea tu cuenta en un minuto. Tu perfil lo armamos después, a tu ritmo.</p>
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {GOOGLE_ENABLED ? (
        <>
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={busy}
          className="h-12 w-full gap-3 rounded-xl text-base"
        >
          {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <GoogleMark />}
          Continuar con Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          o con tu correo
          <span className="h-px flex-1 bg-border" />
        </div>
        </>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-name">Nombre</Label>
          <Input
            id="reg-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            aria-invalid={touched && !nameOk}
            aria-describedby={touched && !nameOk ? "reg-name-err" : undefined}
            className="h-12 rounded-xl text-base"
            placeholder="Tu nombre"
          />
          {touched && !nameOk ? <p id="reg-name-err" className="text-xs text-destructive">Escribe tu nombre.</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-email">Correo</Label>
          <Input
            id="reg-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            aria-invalid={touched && !emailOk}
            aria-describedby={touched && !emailOk ? "reg-email-err" : undefined}
            className="h-12 rounded-xl text-base"
            placeholder="tu@correo.com"
          />
          {touched && !emailOk ? <p id="reg-email-err" className="text-xs text-destructive">Revisa que el correo esté bien escrito.</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-password">Contraseña</Label>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              aria-invalid={touched && !passwordOk}
              aria-describedby="reg-password-hint"
              className="h-12 rounded-xl pr-12 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
            </button>
          </div>
          <p id="reg-password-hint" className={touched && !passwordOk ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            Mínimo {MIN_PASSWORD_LENGTH} caracteres.
          </p>
        </div>

        <ConsentBlock documents={documents} checked={consented} onCheckedChange={onConsentChange} disabled={busy} />
        {touched && !consented ? (
          <p className="-mt-2 text-xs text-destructive" role="alert">
            Para crear tu cuenta necesitas aceptar las dos casillas.
          </p>
        ) : null}

        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-base font-semibold">
          {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
          Crear mi cuenta
        </Button>
      </form>
    </div>
  );
}
