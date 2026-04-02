import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { KreoonButton } from "@/components/ui/kreoon";

const POPULAR_LINKS = [
  { to: "/", label: "Inicio" },
  { to: "/auth", label: "Iniciar sesión" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/explore", label: "Explorar" },
  { to: "/settings", label: "Configuración" },
];

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <StatusPageLayout
      variant="info"
      icon={<FileQuestion className="h-12 w-12" />}
      title="Página no encontrada"
      subtitle="La página que buscas no existe o fue movida"
      backgroundOrbs
    >
      {/* Ilustración / animación sutil */}
      <motion.div
        className="mb-6 flex justify-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="relative flex h-24 w-24 items-center justify-center rounded-sm border border-kreoon-border bg-kreoon-bg-card/50">
          <span className="text-4xl font-bold text-kreoon-text-muted">404</span>
          <motion.div
            className="absolute -inset-1 -z-10 rounded-sm bg-kreoon-purple-500/10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Sugerencias de páginas populares */}
      <StatusCard variant="glass" className="mb-6" title="Páginas que podrían interesarte">
        <ul className="flex flex-wrap justify-center gap-2">
          {POPULAR_LINKS.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className="rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/50 px-3 py-2 text-sm text-kreoon-text-primary transition-colors hover:border-kreoon-purple-500/50 hover:bg-kreoon-purple-500/10 hover:text-kreoon-purple-400"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </StatusCard>

      {/* Botones */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
        <KreoonButton
          type="button"
          variant="primary"
          size="md"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Ir al inicio
        </KreoonButton>
        <KreoonButton
          type="button"
          variant="secondary"
          size="md"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver atrás
        </KreoonButton>
      </div>
    </StatusPageLayout>
  );
}
