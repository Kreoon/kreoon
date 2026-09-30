import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { uploadAvatar } from "@/lib/bunnyUpload";
import { CONTENT_TYPES } from "@/components/marketplace/types/marketplace";
import { ConsentBlock } from "@/components/registro/ConsentBlock";
import { cn } from "@/lib/utils";
import {
  acceptRegistrationDocuments,
  fetchCreatorOnboardingState,
  fetchPendingRegistrationDocuments,
  finishCreatorOnboarding,
  saveCreatorOnboardingProgress,
} from "@/lib/onboarding/creatorOnboarding.service";
import { getCreatorStartStep, type CreatorStep } from "@/lib/onboarding/track";
import { sanitizeReturnTo } from "@/lib/registration/returnTo";

const ORDER: CreatorStep[] = ["name", "photo", "content", "done"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Asistente ÚNICO de onboarding de creadores (vive dentro de OnboardingGateProvider, sustituyendo
 * al asistente Nova para cuentas de creador).
 *
 * Distingue tres hechos: crear la cuenta (ya ocurrió en /registro), completar el perfil (aquí,
 * breve y omitible) y publicar el portafolio (acto posterior y explícito en el constructor).
 * Guarda cada paso al instante (reanudable) y no publica nada.
 */
export function CreatorOnboardingWizard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const { user, profile, refetchUserData } = useAuth();
  const next = sanitizeReturnTo(params.get("next"));

  const orgId = (profile as { current_organization_id?: string | null } | null)?.current_organization_id ?? null;

  const stateQ = useQuery({
    queryKey: ["creator-onboarding-state", user?.id],
    queryFn: () => fetchCreatorOnboardingState(user!.id, orgId),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  const docsQ = useQuery({
    queryKey: ["creator-onboarding-pending-docs", user?.id],
    queryFn: fetchPendingRegistrationDocuments,
    enabled: Boolean(user?.id),
    staleTime: 0,
  });

  const [step, setStep] = React.useState<CreatorStep | null>(null);
  const [name, setName] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [types, setTypes] = React.useState<string[]>([]);
  const [consented, setConsented] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const hydrated = React.useRef(false);

  // Hidrata una sola vez con lo ya guardado y arranca en el primer paso incompleto.
  React.useEffect(() => {
    const s = stateQ.data;
    if (!s || hydrated.current) return;
    hydrated.current = true;
    const fullName = (profile?.full_name ?? "").trim();
    const current = (s.displayName ?? fullName).trim();
    setName(current === "Creador" ? "" : current);
    setAvatarUrl(s.avatarUrl);
    setTypes(s.contentTypes);
    setStep(
      getCreatorStartStep({
        hasCustomName: current.length >= 2 && current !== "Creador",
        hasAvatar: Boolean(s.avatarUrl),
        contentTypesCount: s.contentTypes.length,
      }),
    );
  }, [stateQ.data, profile?.full_name]);

  const pendingDocs = docsQ.data ?? [];
  const orgName = stateQ.data?.organizationName ?? "tu comunidad";

  const run = async (fn: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
    } catch {
      setError("No pudimos guardar este paso. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const go = (to: CreatorStep) => setStep(to);

  const saveName = () =>
    run(
      () => saveCreatorOnboardingProgress({ displayName: name.trim() }),
      () => go("photo"),
    );

  const onPickFile = async (file: File | undefined) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return setError("Elige una imagen (JPG, PNG o WebP).");
    if (file.size > MAX_AVATAR_BYTES) return setError("La imagen no debe superar los 5 MB.");
    await run(async () => {
      const res = await uploadAvatar(file, user.id);
      await saveCreatorOnboardingProgress({ avatarUrl: res.cdnUrl });
      setAvatarUrl(res.cdnUrl);
    }, () => go("content"));
  };

  const saveTypes = () =>
    run(
      () => saveCreatorOnboardingProgress({ contentTypes: types }),
      () => go("done"),
    );

  const toggleType = (t: string) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= 8 ? prev : [...prev, t]));

  const finish = (destination: "portfolio" | "space") =>
    run(async () => {
      if (pendingDocs.length > 0) {
        if (!consented) throw new Error("consent");
        await acceptRegistrationDocuments(pendingDocs.map((d) => d.document_id));
      }
      await finishCreatorOnboarding();
      await refetchUserData();
      await qc.invalidateQueries({ queryKey: ["profile-completion"] });
    }, () => {
      navigate(destination === "portfolio" ? "/profile-builder" : next ?? "/creator-dashboard", { replace: true });
    });

  const progressIndex = step ? Math.min(ORDER.indexOf(step), 3) : 0;
  const progressValue = ((progressIndex + (step === "done" ? 0 : 1)) / 4) * 100;

  if (!step || stateQ.isLoading || docsQ.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Cargando tu perfil…</span>
      </div>
    );
  }

  const needsConsent = pendingDocs.length > 0;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-lg">
        <header className="space-y-3 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{orgName}</span>
            <span>{step === "done" ? "Listo" : `Paso ${progressIndex + 1} de 3`}</span>
          </div>
          <Progress value={step === "done" ? 100 : progressValue} aria-label="Progreso del perfil" className="h-1.5" />
        </header>

        <main className="flex flex-1 flex-col justify-center">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
            {error ? (
              <Alert variant="destructive" role="alert" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {step === "name" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary">Tu cuenta está creada.</p>
                  <h1 className="text-2xl font-semibold leading-tight tracking-tight">Ahora hagamos tu perfil</h1>
                  <p className="text-sm text-muted-foreground">¿Cómo quieres que te vean las marcas? Puedes cambiarlo cuando quieras.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-name">Nombre público</Label>
                  <Input
                    id="co-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="nickname"
                    maxLength={80}
                    className="h-12 rounded-xl text-base"
                    placeholder="Tu nombre o el de tu marca personal"
                  />
                </div>
                <Button onClick={saveName} disabled={busy || name.trim().length < 2} className="h-12 w-full rounded-xl text-base font-semibold">
                  {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
                  Continuar
                </Button>
              </div>
            )}

            {step === "photo" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold leading-tight tracking-tight">Ponle cara a tu perfil</h1>
                  <p className="text-sm text-muted-foreground">Una foto clara ayuda a que las marcas confíen. Puedes hacerlo después.</p>
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    aria-label="Elegir una foto de perfil"
                    className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8" aria-hidden />}
                    {busy ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                      </span>
                    ) : null}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => onPickFile(e.target.files?.[0])} />
                </div>
                <div className="flex flex-col gap-2">
                  {avatarUrl ? (
                    <Button onClick={() => go("content")} className="h-12 w-full rounded-xl text-base font-semibold">Continuar</Button>
                  ) : (
                    <Button onClick={() => fileRef.current?.click()} disabled={busy} className="h-12 w-full rounded-xl text-base font-semibold">Subir foto</Button>
                  )}
                  <Button variant="ghost" onClick={() => go("content")} disabled={busy} className="h-11 w-full rounded-xl">
                    Omitir por ahora
                  </Button>
                </div>
              </div>
            )}

            {step === "content" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold leading-tight tracking-tight">¿Qué tipo de contenido creas?</h1>
                  <p className="text-sm text-muted-foreground">Elige hasta 8. Nos sirve para mostrarte oportunidades que encajen.</p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Tipos de contenido">
                  {CONTENT_TYPES.map((t) => {
                    const on = types.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        aria-pressed={on}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                          on ? "border-primary bg-primary/10 font-medium text-primary" : "border-border bg-background text-foreground hover:bg-muted",
                        )}
                      >
                        {on ? <Check className="h-4 w-4" aria-hidden /> : null}
                        {t}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={saveTypes} disabled={busy || types.length === 0} className="h-12 w-full rounded-xl text-base font-semibold">
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
                    Continuar
                  </Button>
                  <Button variant="ghost" onClick={() => go("done")} disabled={busy} className="h-11 w-full rounded-xl">
                    Omitir por ahora
                  </Button>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold leading-tight tracking-tight">Tu espacio en {orgName} está listo</h1>
                  <p className="text-sm text-muted-foreground">
                    Tu perfil todavía no es público. Cuando armes tu portafolio y decidas publicarlo, las marcas podrán encontrarte.
                  </p>
                </div>

                <ul className="space-y-2 text-sm" aria-label="Tus próximos pasos">
                  <ChecklistItem done label="Cuenta creada" />
                  <ChecklistItem done={Boolean(name.trim().length >= 2 && (avatarUrl || types.length > 0))} label="Perfil básico" />
                  <ChecklistItem done={false} label="Crear tu portafolio" />
                  <ChecklistItem done={false} label="Publicarlo cuando estés lista o listo" />
                </ul>

                {needsConsent ? (
                  <ConsentBlock documents={pendingDocs} checked={consented} onCheckedChange={setConsented} disabled={busy} id="onboarding-consent" />
                ) : null}

                <div className="flex flex-col gap-2">
                  <Button onClick={() => finish("portfolio")} disabled={busy || (needsConsent && !consented)} className="h-12 w-full rounded-xl text-base font-semibold">
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
                    Crear mi portafolio
                  </Button>
                  <Button variant="ghost" onClick={() => finish("space")} disabled={busy || (needsConsent && !consented)} className="h-11 w-full rounded-xl">
                    Entrar a mi espacio
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
          done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
        )}
        aria-hidden
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className={done ? "text-foreground" : "text-muted-foreground"}>
        {label}
        <span className="sr-only">{done ? " (hecho)" : " (pendiente)"}</span>
      </span>
    </li>
  );
}
