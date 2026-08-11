import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/auth/StepIndicator';
import {
  isWellFormedToken,
  loadOnboarding,
  saveSection,
  submitFinal,
  type OnboardingBranding,
} from './api';
import {
  PantallaCargando,
  PantallaEnlaceNoDisponible,
  PantallaExito,
} from './StatusScreens';
import {
  STEPS,
  type OnboardingFormData,
  type SectionKey,
} from './schemas';
import {
  PasoContenido,
  PasoEquipo,
  PasoLegal,
  PasoLogistica,
  PasoMarca,
  PasoProducto,
} from './steps';

type Fase = 'cargando' | 'formulario' | 'error' | 'exito';

const MENSAJE_GENERICO = 'Pídele un enlace nuevo a la persona que te contactó.';

/**
 * Wizard público de onboarding de clientes.
 *
 * Guardado automático por paso: al pasar la validación de un paso se persiste
 * esa sección con `client-onboarding-submit` antes de avanzar. El cliente puede
 * cerrar la pestaña y volver con el mismo enlace — al montar,
 * `client-onboarding-get` devuelve lo guardado y pre-llena todo.
 */
export function OnboardingWizard({ token }: { token: string | undefined }) {
  const [fase, setFase] = useState<Fase>('cargando');
  const [mensajeError, setMensajeError] = useState(MENSAJE_GENERICO);
  const [branding, setBranding] = useState<OnboardingBranding | null>(null);
  const [formData, setFormData] = useState<OnboardingFormData>({});
  const [pasoActual, setPasoActual] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;

    if (!isWellFormedToken(token)) {
      setMensajeError('Este enlace no es válido. ' + MENSAJE_GENERICO);
      setFase('error');
      return;
    }

    (async () => {
      const resultado = await loadOnboarding(token);
      if (cancelado) return;

      if (!resultado.ok) {
        setMensajeError(resultado.message);
        setFase('error');
        return;
      }

      setBranding(resultado.data.branding);
      setFormData(resultado.data.formData ?? {});

      // Si ya lo había enviado, se muestra la pantalla de éxito en vez del form.
      if (resultado.data.status === 'submitted') {
        setFase('exito');
        return;
      }

      // Retoma en el primer paso obligatorio que aún esté vacío.
      const primerPendiente = STEPS.findIndex(
        (paso) =>
          paso.obligatorio &&
          Object.keys(resultado.data.formData?.[paso.key] ?? {}).length === 0,
      );
      setPasoActual(primerPendiente === -1 ? 0 : primerPendiente);
      setFase('formulario');
    })();

    return () => {
      cancelado = true;
    };
  }, [token]);

  // Al cambiar de paso, subir al inicio (en móvil el form es largo).
  useEffect(() => {
    contenedorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pasoActual]);

  const persistirSeccion = useCallback(
    async (seccion: SectionKey, datos: unknown): Promise<boolean> => {
      if (!isWellFormedToken(token)) return false;

      setGuardando(true);
      const resultado = await saveSection(token, seccion, datos);
      setGuardando(false);

      if (!resultado.ok) {
        toast.error('No pudimos guardar', { description: resultado.message });
        return false;
      }

      setFormData((previo) => ({
        ...previo,
        [seccion]: { ...(previo[seccion] ?? {}), ...(datos as object) },
      }));
      return true;
    },
    [token],
  );

  const avanzar = useCallback(
    async (seccion: SectionKey, datos: unknown) => {
      const guardado = await persistirSeccion(seccion, datos);
      if (!guardado) return;
      setPasoActual((actual) => Math.min(actual + 1, STEPS.length - 1));
    },
    [persistirSeccion],
  );

  const retroceder = useCallback(() => {
    setPasoActual((actual) => Math.max(actual - 1, 0));
  }, []);

  const enviarTodo = useCallback(
    async (datosLogistica: unknown) => {
      if (!isWellFormedToken(token)) return;

      const guardado = await persistirSeccion('logistica', datosLogistica);
      if (!guardado) return;

      setGuardando(true);
      const resultado = await submitFinal(token);
      setGuardando(false);

      if (resultado.ok) {
        setFase('exito');
        return;
      }

      if (resultado.kind === 'missing_fields') {
        // Llevar al cliente al primer paso que le falta completar.
        const secciones = new Set(
          resultado.missingFields.map((campo) => campo.split('.')[0]),
        );
        const indice = STEPS.findIndex((paso) => secciones.has(paso.key));
        toast.error('Te faltan algunos datos', {
          description: 'Te llevamos al paso que falta completar.',
        });
        if (indice !== -1) setPasoActual(indice);
        return;
      }

      toast.error('No pudimos enviar', { description: resultado.message });
    },
    [persistirSeccion, token],
  );

  const pasosIndicador = useMemo(
    () => STEPS.map((paso) => ({ label: paso.titulo })),
    [],
  );

  if (fase === 'cargando') return <PantallaCargando />;
  if (fase === 'error') return <PantallaEnlaceNoDisponible mensaje={mensajeError} />;
  if (fase === 'exito') return <PantallaExito orgName={branding?.orgName} />;

  const paso = STEPS[pasoActual];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-kreoon-bg-primary">
      {/* Orbes de gradiente púrpura, decorativos */}
      <div
        aria-hidden
        className="pointer-events-none fixed -left-32 -top-32 h-80 w-80 rounded-full bg-kreoon-purple-500/20 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-24 h-96 w-96 rounded-full bg-kreoon-purple-400/10 blur-[120px]"
      />

      <div
        ref={contenedorRef}
        className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10"
        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        {/* Encabezado con branding de la organización.
            A diferencia de AuthLayout (que oculta el branding en móvil con
            `hidden lg:block`), acá se muestra SIEMPRE: el enlace llega por
            WhatsApp, así que el móvil es el caso principal y el cliente
            necesita reconocer de quién es el formulario. */}
        <header className="mb-6 flex items-center gap-3">
          {branding?.orgLogoUrl ? (
            <img
              src={branding.orgLogoUrl}
              alt={branding.orgName ?? 'Logo'}
              className="h-11 w-11 rounded-sm object-cover ring-1 ring-kreoon-border"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-kreoon-gradient ring-1 ring-kreoon-border">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-kreoon-text-primary">
              {branding?.orgName ?? 'KREOON'}
            </p>
            {branding?.clientName && (
              <p className="truncate text-xs text-kreoon-text-muted">
                Formulario de {branding.clientName}
              </p>
            )}
          </div>
        </header>

        <div className="mb-6">
          <StepIndicator steps={pasosIndicador} currentStep={pasoActual} />
        </div>

        <div className="glass-card p-4 sm:p-6">
          <div className="mb-5">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-kreoon-text-primary sm:text-xl">
              <span className="text-2xl">{paso.emoji}</span>
              {paso.titulo}
            </h1>
            <p className="mt-1 text-sm text-kreoon-text-secondary">{paso.ayuda}</p>
            {!paso.obligatorio && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-kreoon-bg-secondary px-2.5 py-1 text-[11px] text-kreoon-text-muted">
                Puedes saltarte lo que no sepas
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={paso.key}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {paso.key === 'legal' && (
                <PasoLegal
                  initialData={formData.legal ?? {}}
                  onNext={(datos) => avanzar('legal', datos)}
                  guardando={guardando}
                />
              )}
              {paso.key === 'equipo' && (
                <PasoEquipo
                  initialData={formData.equipo ?? {}}
                  onNext={(datos) => avanzar('equipo', datos)}
                  onBack={retroceder}
                  guardando={guardando}
                />
              )}
              {paso.key === 'marca' && (
                <PasoMarca
                  initialData={formData.marca ?? {}}
                  onNext={(datos) => avanzar('marca', datos)}
                  onBack={retroceder}
                  guardando={guardando}
                />
              )}
              {paso.key === 'producto' && (
                <PasoProducto
                  initialData={formData.producto ?? {}}
                  onNext={(datos) => avanzar('producto', datos)}
                  onBack={retroceder}
                  guardando={guardando}
                />
              )}
              {paso.key === 'contenido' && (
                <PasoContenido
                  initialData={formData.contenido ?? {}}
                  onNext={(datos) => avanzar('contenido', datos)}
                  onBack={retroceder}
                  guardando={guardando}
                />
              )}
              {paso.key === 'logistica' && (
                <PasoLogistica
                  initialData={formData.logistica ?? {}}
                  onNext={enviarTodo}
                  onBack={retroceder}
                  guardando={guardando}
                  resumen={formData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-kreoon-text-muted">
          {guardando ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              Se guarda solo. Puedes cerrar y volver con el mismo enlace.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
