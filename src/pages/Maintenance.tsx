import { motion } from "framer-motion";
import { Construction, Twitter, ExternalLink } from "lucide-react";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { KreoonButton } from "@/components/ui/kreoon";

export default function Maintenance() {
  return (
    <StatusPageLayout
      variant="warning"
      icon={<Construction className="h-12 w-12" />}
      title="En mantenimiento"
      subtitle="Estamos mejorando la plataforma para ti"
      backgroundOrbs
    >
      {/* Ilustración animada */}
      <motion.div
        className="mb-6 flex justify-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="relative flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-amber-500/30 bg-amber-500/10">
          <Construction className="h-16 w-16 text-amber-500" />
          <motion.div
            className="absolute -inset-2 -z-10 rounded-2xl bg-amber-500/20"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Mensaje principal */}
      <StatusCard variant="glass" className="mb-6">
        <div className="space-y-3 text-center">
          <p className="text-kreoon-text-primary">
            Volveremos pronto. Gracias por tu paciencia.
          </p>
          <p className="text-sm text-kreoon-text-secondary">
            Tiempo estimado: <span className="font-semibold text-amber-400">2 horas</span>
          </p>
        </div>

        {/* Barra de progreso indeterminada */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-kreoon-bg-secondary">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </StatusCard>

      {/* Links */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
        <KreoonButton
          type="button"
          variant="secondary"
          size="md"
          asChild
          className="inline-flex items-center gap-2"
        >
          <a
            href="https://twitter.com/KREOON_app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Twitter className="h-4 w-4" />
            Síguenos para actualizaciones
          </a>
        </KreoonButton>
        <KreoonButton
          type="button"
          variant="secondary"
          size="md"
          asChild
          className="inline-flex items-center gap-2"
        >
          <a
            href="https://status.kreoon.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            Estado del sistema
          </a>
        </KreoonButton>
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-kreoon-text-muted">
        ¿Necesitas ayuda?{" "}
        <a
          href="mailto:soporte@kreoon.com"
          className="text-kreoon-purple-400 underline decoration-kreoon-purple-400/30 underline-offset-2 hover:decoration-kreoon-purple-400"
        >
          soporte@kreoon.com
        </a>
      </p>
    </StatusPageLayout>
  );
}
