import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, Check } from "lucide-react";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { KreoonButton, KreoonInput } from "@/components/ui/kreoon";
import { supabase } from "@/integrations/supabase/client";
import { kreoonToast } from "@/lib/toast";

export default function ComingSoon() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const featureName = searchParams.get("feature") ?? "Esta función";
  const featureDescription = searchParams.get("description") ?? "Estamos trabajando en ello.";

  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      kreoonToast.warning("Email requerido", "Por favor ingresa tu email.");
      return;
    }

    setLoading(true);
    try {
      // Guardar en una tabla de lista de espera (ej: waitlist)
      // Si no existe la tabla, se puede usar un servicio externo o solo mostrar confirmación
      const { error } = await supabase.from("waitlist").insert({
        email: email.trim(),
        feature: featureName,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error guardando en waitlist:", error);
        // Aunque falle, mostramos confirmación (o podemos usar servicio externo)
      }

      setSubmitted(true);
      kreoonToast.success("¡Gracias!", "Te notificaremos cuando esté disponible.");
    } catch (err) {
      console.error(err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StatusPageLayout
      variant="info"
      icon={<Rocket className="h-12 w-12" />}
      title="Próximamente"
      subtitle={featureName}
      backgroundOrbs
    >
      {/* Ilustración animada */}
      <motion.div
        className="mb-6 flex justify-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="relative flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-kreoon-purple-500/30 bg-kreoon-purple-500/10">
          <Rocket className="h-16 w-16 text-kreoon-purple-400" />
          <motion.div
            className="absolute -inset-2 -z-10 rounded-2xl bg-kreoon-purple-500/20"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Descripción */}
      <StatusCard variant="glass" className="mb-6">
        <p className="text-center text-kreoon-text-secondary">
          {featureDescription}
        </p>
      </StatusCard>

      {/* Formulario de notificación */}
      {!submitted ? (
        <StatusCard variant="glass" title="Avísame cuando esté disponible" className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <KreoonInput
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <KreoonButton
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full"
            >
              Notificarme
            </KreoonButton>
          </form>
        </StatusCard>
      ) : (
        <StatusCard variant="highlighted" className="mb-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="font-medium text-white">¡Listo!</p>
            <p className="text-sm text-kreoon-text-secondary">
              Te enviaremos un email cuando esta función esté disponible.
            </p>
          </div>
        </StatusCard>
      )}

      {/* Botón volver */}
      <KreoonButton
        type="button"
        variant="secondary"
        size="md"
        onClick={() => navigate("/dashboard")}
      >
        Volver al dashboard
      </KreoonButton>
    </StatusPageLayout>
  );
}
