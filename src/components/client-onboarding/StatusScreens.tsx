import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KreoonButton } from '@/components/ui/kreoon';

/**
 * Pantallas de estado del onboarding público: cargando, enlace no disponible y
 * éxito. Todas full-screen, mobile-first, sin filtrar información del cliente
 * ni de la organización cuando el enlace es inválido.
 */

function Fondo({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-kreoon-bg-primary px-5 py-10">
      {/* Orbes de gradiente púrpura, decorativos */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-kreoon-purple-500/20 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-kreoon-purple-400/15 blur-[110px]"
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

function Tarjeta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn('glass-card p-6 text-center sm:p-8', className)}
    >
      {children}
    </motion.div>
  );
}

export function PantallaCargando() {
  return (
    <Fondo>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-9 w-9 animate-spin text-kreoon-purple-400" />
        <p className="text-sm text-kreoon-text-secondary">
          Abriendo tu formulario...
        </p>
      </div>
    </Fondo>
  );
}

export function PantallaEnlaceNoDisponible({ mensaje }: { mensaje: string }) {
  return (
    <Fondo>
      <Tarjeta>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-kreoon-text-primary">
          Este enlace no está disponible
        </h1>
        <p className="text-sm leading-relaxed text-kreoon-text-secondary">
          {mensaje}
        </p>
        <p className="mt-5 text-xs text-kreoon-text-muted">
          Si crees que es un error, responde por WhatsApp al mismo chat donde te
          llegó el enlace.
        </p>
      </Tarjeta>
    </Fondo>
  );
}

export function PantallaExito({
  orgName,
  tienePortal = false,
}: {
  orgName?: string | null;
  /**
   * true cuando el cliente reclamó su cuenta en el paso 0: tiene sesión y
   * puede seguir su proceso desde el portal. false = comportamiento anterior
   * (formulario enviado sin cuenta, cierre simple de la pestaña).
   */
  tienePortal?: boolean;
}) {
  return (
    <Fondo>
      <Tarjeta>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15"
        >
          <CheckCircle2 className="h-9 w-9 text-emerald-400" />
        </motion.div>

        {tienePortal ? (
          <>
            <h1 className="mb-3 text-2xl font-semibold text-kreoon-text-primary">
              Recibimos todo 🚀
            </h1>
            <p className="text-base leading-relaxed text-kreoon-text-secondary">
              Ya arrancamos a construir el ADN de tu marca. Desde tu portal vas
              a poder seguir cada paso, aprobar guiones y ver tus videos.
            </p>

            <KreoonButton
              variant="primary"
              size="lg"
              className="mt-6 min-h-[48px] w-full"
              onClick={() => window.location.assign('/client-dashboard')}
            >
              <Rocket className="mr-2 h-4 w-4" />
              Ir a mi portal
            </KreoonButton>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-2xl font-semibold text-kreoon-text-primary">
              Recibimos todo 🚀
            </h1>
            <p className="text-base leading-relaxed text-kreoon-text-secondary">
              Tu estratega te contacta en el grupo.
            </p>

            <div className="mt-6 rounded-sm border border-kreoon-border bg-kreoon-purple-500/5 p-4">
              <p className="text-xs leading-relaxed text-kreoon-text-muted">
                Ya puedes cerrar esta página. Si necesitas cambiar algo,
                escríbenos por WhatsApp
                {orgName ? ` y el equipo de ${orgName} lo ajusta` : ''}.
              </p>
            </div>
          </>
        )}
      </Tarjeta>
    </Fondo>
  );
}
