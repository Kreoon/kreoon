import * as React from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const RESEND_COOLDOWN_SECONDS = 60;

interface VerifyEmailPanelProps {
  email: string;
  onResend: () => Promise<void>;
  onWrongEmail: () => void;
}

/** Correo enviado: reenvío con cooldown real y salida para correo equivocado. No marca nada como verificado. */
export function VerifyEmailPanel({ email, onResend, onWrongEmail }: VerifyEmailPanelProps) {
  const [cooldown, setCooldown] = React.useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setSending(true);
    setMessage(null);
    try {
      await onResend();
      setMessage({ kind: "ok", text: "Listo, te enviamos un nuevo enlace." });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      const limited = (e as { code?: string })?.code === "rate_limited";
      setMessage({
        kind: "error",
        text: limited
          ? "Hiciste muchos intentos seguidos. Espera unos minutos antes de pedir otro correo."
          : "No pudimos reenviar el correo. Inténtalo de nuevo en un momento.",
      });
      if (limited) setCooldown(RESEND_COOLDOWN_SECONDS * 2);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 text-center" aria-live="polite">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Mail className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Revisa tu correo</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Te enviamos un enlace a <span className="font-medium text-foreground">{email}</span>. Ábrelo para confirmar tu cuenta; puedes hacerlo desde este u otro dispositivo.
        </p>
        <p className="text-xs text-muted-foreground">Si no aparece en un par de minutos, mira en spam o promociones.</p>
      </div>

      {message ? (
        <Alert variant={message.kind === "error" ? "destructive" : "default"} role={message.kind === "error" ? "alert" : "status"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button onClick={resend} disabled={cooldown > 0 || sending} variant="outline" className="h-12 w-full rounded-xl">
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {cooldown > 0 ? `Reenviar correo en ${cooldown}s` : "Reenviar correo"}
        </Button>
        <Button onClick={onWrongEmail} variant="ghost" className="h-11 w-full rounded-xl">
          Me equivoqué de correo
        </Button>
      </div>
    </div>
  );
}
